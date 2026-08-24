// 编排：任务 × 臂 → (环境准备 → agent → verify) → SQLite 落库。
// 缓存：同 (config_hash, task, arm) 已有 pass/fail 终态则跳过（--force 旁路）——
// 调提示词/流程后只重跑受影响的臂，是控制 token 成本的主要手段。
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { computeConfigHash } from './config.mjs';
import { EvalDB } from './db.mjs';
import { loadTasks, tasksFingerprint } from './tasks.mjs';
import { prepareWorkdir } from './workdir.mjs';
import { spawnCapture, tail } from './util.mjs';
import { run as dryRunAdapter } from './adapters/dryrun.mjs';
import { run as cliAdapter } from './adapters/cli.mjs';

const FAILED_STATUSES = new Set(['fail', 'timeout', 'error']);

export async function runEval(config, opts) {
  const allTasks = loadTasks(config.tasksDir);
  if (allTasks.length === 0) {
    console.error(`任务目录为空: ${config.tasksDir}（先在 eval/tasks/ 下添加任务）`);
    return { ran: 0, skipped: 0 };
  }
  const fingerprint = tasksFingerprint(allTasks);

  let tasks = allTasks;
  if (opts.taskIds?.length) tasks = tasks.filter((t) => opts.taskIds.includes(t.id));
  if (opts.sample) tasks = tasks.slice(0, opts.sample);
  if (tasks.length === 0) {
    console.error('没有匹配的任务');
    return { ran: 0, skipped: 0 };
  }

  const adapterType = opts.dryRun ? 'dryrun' : config.adapter.type;
  const configHash = computeConfigHash(config, adapterType, fingerprint);
  const db = new EvalDB(join(config.resultsDir, 'eval.db')).init();

  const arms = opts.arms?.length ? opts.arms : ['A', 'B'];
  let plan = [];
  for (const arm of arms) {
    for (const task of tasks) plan.push({ arm, task });
  }
  if (opts.onlyFailed) {
    const latest = latestByTaskArm(db.runsInGroup(configHash, adapterType));
    plan = plan.filter(({ arm, task }) => {
      const prev = latest.get(`${arm}|${task.id}`);
      return prev ? FAILED_STATUSES.has(prev.status) : true; // 无记录的新任务也跑
    });
  }

  const workdirRoot = join(config.resultsDir, 'workdirs');
  mkdirSync(workdirRoot, { recursive: true });

  let ran = 0;
  let skipped = 0;
  // --rerun-failed 语义就是「重跑失败者」，必须旁路缓存（否则 fail 终态被缓存拦下，一次都跑不了）
  const useCache = !opts.force && !opts.onlyFailed;
  for (const { arm, task } of plan) {
    const cached = useCache ? db.cachedRun(configHash, task.id, arm) : null;
    if (cached) {
      skipped++;
      console.log(`[cache] ${task.id} 臂${arm} → ${cached.status}（--force 可重跑）`);
      continue;
    }
    const result = await executeRun({ config, opts, adapterType, configHash, db, task, arm, workdirRoot });
    ran++;
    const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '!';
    console.log(`[${icon}] ${task.id} 臂${arm} ${result.status} ${result.durationMs}ms${result.note ? `（${result.note}）` : ''}`);
  }
  console.log(`完成：新跑 ${ran}，缓存跳过 ${skipped}（hash=${configHash}）`);
  return { ran, skipped, configHash, adapterType };
}

function latestByTaskArm(rows) {
  const m = new Map(); // rows 按 id 升序，后写覆盖即最新
  for (const r of rows) m.set(`${r.arm}|${r.task_id}`, r);
  return m;
}

async function executeRun({ config, opts, adapterType, configHash, db, task, arm, workdirRoot }) {
  const t0 = Date.now();
  const armCfg = config.arms[arm] ?? {};
  const workdir = prepareWorkdir(workdirRoot, task.id, arm, task.filesDir);
  const row = {
    task_id: task.id,
    arm,
    adapter: adapterType,
    model_label: opts.dryRun ? 'dry-run' : (config.adapter.tool ?? adapterType),
    config_hash: configHash,
    tool_version: null,
    started_at: new Date().toISOString(),
    duration_ms: 0,
    exit_code: null,
    status: 'error',
    verify_output: null,
    agent_log_path: null,
    notes: null,
    tokens_in: null,
    tokens_out: null,
    cost_usd: null,
  };

  // 臂环境准备：B 臂执行 sillyspec init 等（dry-run 跳过，保持零副作用）
  if (!opts.dryRun) {
    for (const cmd of armCfg.setup ?? []) {
      const args = render(cmd, { workdir, tool: config.adapter.tool ?? '' }).split(/\s+/).filter(Boolean);
      const r = await spawnCapture({ args, cwd: workdir, timeoutMs: 120_000 });
      if (r.code !== 0) {
        row.status = 'error';
        row.notes = `臂 setup 失败: ${cmd}`;
        row.verify_output = tail(`${r.stdout}\n${r.stderr}`);
        row.exit_code = r.code;
        row.duration_ms = Date.now() - t0;
        db.insertRun(row);
        return { status: 'error', durationMs: row.duration_ms, note: row.notes };
      }
    }
  }

  const prompt = (armCfg.promptTemplate ?? '{instruction}').replaceAll('{instruction}', task.instruction);
  const logDir = join(config.resultsDir, 'logs', `${stamp()}-${task.id}-arm${arm}`);
  let res;
  if (opts.dryRun) {
    res = dryRunAdapter({ task, arm, workdir, solutionDir: task.solutionDir, mode: opts.dryMode ?? 'mixed' });
  } else {
    res = await cliAdapter({ adapter: config.adapter, prompt, workdir, logDir });
  }
  row.agent_log_path = res.logDir ?? null;
  row.exit_code = res.code ?? null;
  row.tokens_in = res.tokensIn ?? null;
  row.tokens_out = res.tokensOut ?? null;
  row.cost_usd = res.costUsd ?? null;

  if (res.timedOut) {
    row.status = 'timeout';
  } else if ((res.code ?? -1) !== 0) {
    row.status = 'error';
    row.verify_output = tail(res.stderr || res.stdout);
  } else {
    // 判分：verify.mjs 以 workdir 为 cwd 执行，退出码 0 = pass
    const v = await spawnCapture({ args: ['node', task.verifyPath], cwd: workdir, timeoutMs: config.verifyTimeoutMs ?? 120_000 });
    row.status = v.code === 0 ? 'pass' : 'fail';
    row.verify_output = tail(`${v.stderr}\n${v.stdout}`);
  }

  row.duration_ms = Date.now() - t0;
  db.insertRun(row);
  return { status: row.status, durationMs: row.duration_ms, note: null };
}

function render(cmd, vars) {
  let s = cmd;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
