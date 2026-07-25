/**
 * Machine Interface v1 — 机器接口层（SillyHub driver 模式地基）
 *
 * 把 SillySpec 既有的门控与事实核验从「埋在 run <stage> --done 人类可读输出流里」
 * 抽象成可被程序化消费的统一 JSON envelope + 退出码契约。
 *
 * 设计原则（见 change 2026-07-09-machine-interface-v1 design.md §2/§3）：
 *   - 方案 B：独立模块单点封装，不污染既有 run/progress 输出
 *   - 只聚合不新增校验：复用 stage-contract / task-review / verify-postcheck 既有策略引擎
 *   - 只读语义边界（D-002@v1）：只调 ProgressManager 读路径，不写 sillyspec.db / gate-status.json
 *   - stdout 纯 JSON（D-005@v1）：--json 模式下由 CLI 层（src/index.js 的 withJsonOutput）
 *     在调用 runGate/runDerive 期间劫持 console.log 到 stderr，防被调模块污染机器输出
 *   - 退出码 0/1/2 三段语义（D-004@v1）：0=通过，1=事实阻断，2=无法核验
 *
 * 仅依赖 Node 18+ 原生 API，零新增外部依赖。
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ProgressManager, resolveSpecDir } from './progress.js';
import { runValidators, checkTransition, checkExecuteCodeEvidence } from './stage-contract.js';
import { validateTaskReviews } from './task-review.js';
import { runVerifyTestCheck } from './verify-postcheck.js';

// ============ 退出码常量（D-004@v1）============

export const EXIT_OK = 0;          // 核验通过（可含 warnings）
export const EXIT_BLOCKED = 1;     // 事实性阻断（JSON 含 errors）
export const EXIT_UNKNOWN = 2;     // 无法核验（用法错/变更不存在/环境错/内部异常）

// ============ envelope schema 版本（D-005@v1）============

export const SCHEMA_VERSION = 1;

// ============ envelope 组装 ============

/**
 * 组装统一的 JSON envelope。
 *
 * 顶层固定字段：schema_version / command / change / ok / errors / warnings / generated_at。
 * stage / facet / checks / data 仅在显式传参（!== undefined）时出现——保持 envelope 紧凑，
 * daemon 可只看顶层 ok/errors/warnings。
 *
 * @param {object} fields
 * @param {string|undefined} [fields.command]
 * @param {string|undefined} [fields.stage]
 * @param {string|undefined} [fields.facet]
 * @param {string|undefined} [fields.change]
 * @param {boolean} fields.ok
 * @param {string[]} [fields.errors=[]]
 * @param {string[]} [fields.warnings=[]]
 * @param {Array<object>|undefined} [fields.checks]
 * @param {object|undefined} [fields.data]
 * @returns {object} 可直接 JSON.stringify 的 envelope 对象
 */
export function buildEnvelope({
  command,
  stage,
  facet,
  change,
  ok,
  errors = [],
  warnings = [],
  checks,
  data,
}) {
  const envelope = {
    schema_version: SCHEMA_VERSION,
    command,
    change,
    ok,
    errors,
    warnings,
    generated_at: new Date().toISOString(),
  };

  // 按需字段：仅当显式传参时挂上，避免空 null 污染
  if (stage !== undefined) envelope.stage = stage;
  if (facet !== undefined) envelope.facet = facet;
  if (checks !== undefined) envelope.checks = checks;
  if (data !== undefined) envelope.data = data;

  return envelope;
}

// ============ 输出纪律（design §8）============
// --json 模式的 stdout 劫持（console.log/info → stderr）由 CLI 层 src/index.js 的
// withJsonOutput 在调用 runGate/runDerive 期间统一处理（覆盖整个调用期，非仅输出瞬间）。
// 本模块只返回 { envelope, exitCode }，不直接写 stdout。

// ============ gate 聚合门控 ============

/**
 * 聚合「变更 <changeName> 的 <stage> 阶段此刻能否被标记完成」的综合结论。
 *
 * 只读：仅调 ProgressManager.read，不写状态（D-002@v1）。
 * 只聚合：每个 check 复用既有策略引擎，不在本模块重写校验逻辑（design §2）。
 *
 * @param {string} stage - 目标阶段（brainstorm/plan/execute/verify/...）
 * @param {string} changeName - 变更名
 * @param {object} opts
 * @param {string} opts.cwd - 项目根目录
 * @param {string} [opts.specBase] - .sillyspec（或平台 specRoot）目录；默认 resolveSpecDir(cwd)
 * @param {string} [opts.runtimeRoot] - .runtime 目录；默认 join(specBase, '.runtime')
 * @returns {Promise<{ envelope: object, exitCode: number }>}
 */
export async function runGate(stage, changeName, { cwd, specBase, runtimeRoot } = {}) {
  const specRoot = specBase || resolveSpecDir(cwd);
  const pm = new ProgressManager();

  try {
    // ── 读进度：变更不存在 → exit 2（D-004@v1）──
    const progress = await pm.read(cwd, changeName);
    if (!progress) {
      const envelope = buildEnvelope({
        command: 'gate',
        stage,
        change: changeName,
        ok: false,
        errors: [`变更不存在: ${changeName}`],
      });
      return { envelope, exitCode: EXIT_UNKNOWN };
    }

    const currentStage = progress.currentStage || '';
    const checks = [];

    // W4-G (D-008)：execute 阶段预计算 code evidence 一次，供 artifacts check（经 runValidators
    // → validateExecuteOutputs）与下方 execute-evidence check 共享——避免各调一次 checkExecuteCodeEvidence
    // 各 spawn 2 个 git 进程（gate execute 一次省 ≈ 60-200ms on Windows）。
    const sharedEvidence = stage === 'execute' ? checkExecuteCodeEvidence(cwd, changeName) : undefined;

    // ── a. artifacts：阶段产物校验（全部阶段）──
    const r = runValidators(stage, cwd, changeName, {
      projectName: progress.project,
      specRoot,
      ...(sharedEvidence ? { evidence: sharedEvidence } : {}),
    });
    checks.push({
      id: 'artifacts',
      ok: r.ok,
      errors: r.errors || [],
      warnings: r.warnings || [],
    });

    // ── b. transition：状态转换合法性（参与综合 ok，与 completeStep 硬阻断一致）──
    // 与 run.js runStage 同源：传 fromStageData 触发 failed_post_check 门控。
    // transition 必须参与 ok：否则 gate 返回 ok=true、exit 0，Agent 据此 --done 却被
    // runStage 的 checkTransition 硬阻断（exit 1），gate/run 判定分裂（design §8 漂移）。
    const fromStageData = (progress.stages && currentStage && progress.stages[currentStage]) || undefined;
    const t = checkTransition(currentStage, stage, fromStageData ? { fromStageData } : {});
    checks.push({
      id: 'transition',
      ok: t.allowed,
      errors: t.allowed ? [] : [t.reason].filter(Boolean),
      warnings: [],
    });

    // ── c. execute 阶段追加 execute-evidence + task-reviews ──
    // D-008 + W4-G：checkExecuteCodeEvidence 整个 runGate 只调一次（顶部 sharedEvidence 预计算），
    // 这里复用——真正落实去重（原注释声称"只调一次"但实现里 execute-evidence check 仍重复调了第二次）。
    if (stage === 'execute') {
      const ev = sharedEvidence;
      checks.push({
        id: 'execute-evidence',
        ok: ev.status !== 'unchanged',
        errors: ev.status === 'unchanged' ? [`base..head 无代码变更: ${ev.detail}`] : [],
        warnings: ev.status === 'unknown' ? [`无法判定代码变更: ${ev.detail}`] : [],
        data: { status: ev.status, detail: ev.detail },
      });

      // task-reviews：参数组装照抄 run.js:3223-3249 现成范式
      const planDir = join(specRoot, 'changes', changeName);
      const planPath = join(planDir, 'plan.md');
      let planContent = '';
      if (existsSync(planPath)) {
        try {
          planContent = readFileSync(planPath, 'utf8');
        } catch {
          planContent = '';
        }
      }

      const rtRoot = runtimeRoot || join(specRoot, '.runtime');
      const runIdFile = join(rtRoot, `current-execute-run-id-${changeName}`);
      let executeRunId = '';
      try {
        if (existsSync(runIdFile)) {
          executeRunId = readFileSync(runIdFile, 'utf8').trim();
        }
      } catch {
        executeRunId = '';
      }

      // git 真实性交叉校验目录：worktree 存在用 worktreePath，否则 null（交由 task-review 降级 warning）
      let gitDir = null;
      try {
        const { WorktreeManager } = await import('./worktree.js');
        const wm = new WorktreeManager({ cwd });
        const meta = wm.getMeta(changeName);
        if (meta?.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath)) {
          gitDir = meta.worktreePath;
        }
      } catch {
        gitDir = null;
      }

      const tr = validateTaskReviews({
        planContent,
        runtimeRoot: rtRoot,
        executeRunId,
        changeDir: planDir,
        gitDir,
      });
      checks.push({
        id: 'task-reviews',
        ok: tr.ok,
        errors: tr.errors || [],
        warnings: tr.warnings || [],
      });
    }

    // ── d. verify 阶段追加 verify-test（CLI 实测 local.yaml commands.test）──
    if (stage === 'verify') {
      const vt = runVerifyTestCheck({ cwd, specBase: specRoot, changeName });
      const vtWarnings = [];
      if (vt.status === 'skipped') {
        vtWarnings.push('⚠️ verify-test SKIPPED — gate 未核验测试（local.yaml 未配置 commands.test 或显式无测试）。本次 gate 结论不含测试客观核验，driver 不应据 exit 0 判定测试通过；integration-critical 变更应在 verify 阶段降级 FAIL');
      }
      // 全量 fallback 明示：跑了全量 commands.test 但非变更范围子集，失败可能含未变更
      // 模块的预存错误——driver 不应据 exit 0 判定本次变更范围已客观测试（见 3.24 verify 坑1）。
      if (vt.status !== 'skipped' && vt.mode === 'full' && vt.fallbackReason) {
        vtWarnings.push(`⚠️ verify-test 跑的是全量 commands.test（${vt.fallbackReason}）；失败可能含未变更模块的预存错误，driver 不应据 exit 0 判定本次变更范围已测`);
      }
      checks.push({
        id: 'verify-test',
        ok: vt.status !== 'failed',
        errors: vt.status === 'failed' ? [`测试失败: ${vt.reason || ''}`] : [],
        warnings: vtWarnings,
        data: {
          status: vt.status,
          exitCode: vt.exitCode,
          durationMs: vt.durationMs,
          resultPath: vt.resultPath,
          mode: vt.mode ?? null,
          fallbackReason: vt.fallbackReason ?? null,
        },
      });
    }

    // ── 综合结论：所有非 informational check 均 ok ──
    const ok = checks.filter((c) => !c.informational).every((c) => c.ok);
    const exitCode = ok ? EXIT_OK : EXIT_BLOCKED;

    const errors = [];
    const warnings = [];
    for (const c of checks) {
      if (c.errors && c.errors.length) errors.push(...c.errors);
      if (c.warnings && c.warnings.length) warnings.push(...c.warnings);
    }

    const envelope = buildEnvelope({
      command: 'gate',
      stage,
      change: changeName,
      ok,
      errors,
      warnings,
      checks,
    });

    return { envelope, exitCode };
  } catch (e) {
    // 内部异常兜底（D-004@v1 / design §3.5）：保证 stdout 永远是合法 JSON 结构，exit 2
    const envelope = buildEnvelope({
      command: 'gate',
      stage,
      change: changeName,
      ok: false,
      errors: [`internal: ${e.message}`],
    });
    return { envelope, exitCode: EXIT_UNKNOWN };
  }
}

// ============ derive 单项事实核验 ============

/**
 * facet 枚举（D-003@v1）。machine 接口对外只接受这四个值。
 */
export const FACETS = ['execute-evidence', 'verify-test', 'task-reviews', 'artifacts'];

/**
 * 单项事实核验：针对变更 <changeName> 查询某一 facet 的真实状态（design §3.2）。
 *
 * 与 gate 的差异：gate 聚合某阶段所有 check 的综合结论；derive 只返回单一 facet 的结构化 data，
 * daemon 用来做细粒度事实采集（如轮询 execute-evidence 判断代码是否变更）。
 *
 * 只读语义边界同 gate（D-002@v1）：仅调 ProgressManager.read，不写 sillyspec.db / gate-status.json。
 * 唯一例外是 verify-test 会真实执行测试并落盘 test-result.json（产物取证，非状态写入，design §3.3）。
 *
 * 退出码语义（D-004@v1）：0=事实通过，1=事实性阻断，2=无法核验（用法错/变更不存在/内部异常）。
 *
 * @param {string} facet - 必须 ∈ FACETS
 * @param {string} changeName - 变更名
 * @param {object} opts
 * @param {string} opts.cwd - 项目根目录
 * @param {string} [opts.specBase] - .sillyspec（或平台 specRoot）目录；默认 resolveSpecDir(cwd)
 * @param {string} [opts.runtimeRoot] - .runtime 目录；默认 join(specBase, '.runtime')
 * @returns {Promise<{ envelope: object, exitCode: number }>}
 */
export async function runDerive(facet, changeName, { cwd, specBase, runtimeRoot } = {}) {
  // ── 非法 facet：用法错 → exit 2（D-004@v1）──
  if (!FACETS.includes(facet)) {
    const envelope = buildEnvelope({
      command: 'derive',
      facet,
      change: changeName,
      ok: false,
      errors: [`非法 facet: ${facet}，合法值: ${FACETS.join(', ')}`],
    });
    return { envelope, exitCode: EXIT_UNKNOWN };
  }

  const specRoot = specBase || resolveSpecDir(cwd);
  const pm = new ProgressManager();

  try {
    // ── 读进度：变更不存在 → exit 2 ──
    const progress = await pm.read(cwd, changeName);
    if (!progress) {
      const envelope = buildEnvelope({
        command: 'derive',
        facet,
        change: changeName,
        ok: false,
        errors: [`变更不存在: ${changeName}`],
      });
      return { envelope, exitCode: EXIT_UNKNOWN };
    }

    const currentStage = progress.currentStage || '';

    let data;
    let ok;
    let errors = [];
    let warnings = [];
    let exitCode;

    switch (facet) {
      // ── a. execute-evidence：base..head 代码变更判定 ──
      // 语义与 validateExecuteOutputs 一致：unknown 不等于失败（无法判定不应阻断）。
      case 'execute-evidence': {
        const ev = checkExecuteCodeEvidence(cwd, changeName);
        data = { status: ev.status, detail: ev.detail };
        ok = ev.status !== 'unchanged';
        errors = ev.status === 'unchanged' ? [`base..head 无代码变更: ${ev.detail}`] : [];
        warnings = ev.status === 'unknown' ? [`无法判定代码变更: ${ev.detail}`] : [];
        exitCode = ok ? EXIT_OK : EXIT_BLOCKED;
        break;
      }

      // ── b. verify-test：真实执行测试命令并取证 ──
      case 'verify-test': {
        const vt = runVerifyTestCheck({ cwd, specBase: specRoot, changeName });
        data = {
          status: vt.status,
          exitCode: vt.exitCode,
          durationMs: vt.durationMs,
          resultPath: vt.resultPath,
          mode: vt.mode ?? null,
          fallbackReason: vt.fallbackReason ?? null,
        };
        ok = vt.status !== 'failed';
        errors = vt.status === 'failed' ? [`测试失败: ${vt.reason || ''}`] : [];
        warnings = vt.status === 'skipped'
          ? ['测试被跳过']
          : (vt.mode === 'full' && vt.fallbackReason)
            ? [`⚠️ verify-test 跑的是全量 commands.test（${vt.fallbackReason}）；失败可能含未变更模块的预存错误`]
            : [];
        exitCode = ok ? EXIT_OK : EXIT_BLOCKED;
        break;
      }

      // ── c. task-reviews：plan 任务评审核验（参数组装照抄 runGate execute 段）──
      case 'task-reviews': {
        const changeDir = join(specRoot, 'changes', changeName);
        const planPath = join(changeDir, 'plan.md');
        let planContent = '';
        if (existsSync(planPath)) {
          try {
            planContent = readFileSync(planPath, 'utf8');
          } catch {
            planContent = '';
          }
        }

        const rtRoot = runtimeRoot || join(specRoot, '.runtime');
        const runIdFile = join(rtRoot, `current-execute-run-id-${changeName}`);
        let executeRunId = '';
        try {
          if (existsSync(runIdFile)) {
            executeRunId = readFileSync(runIdFile, 'utf8').trim();
          }
        } catch {
          executeRunId = '';
        }

        // git 真实性交叉校验目录：worktree 存在用 worktreePath，否则 null（交由 task-review 降级 warning）
        let gitDir = null;
        try {
          const { WorktreeManager } = await import('./worktree.js');
          const wm = new WorktreeManager({ cwd });
          const meta = wm.getMeta(changeName);
          if (meta?.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath)) {
            gitDir = meta.worktreePath;
          }
        } catch {
          gitDir = null;
        }

        const tr = validateTaskReviews({
          planContent,
          runtimeRoot: rtRoot,
          executeRunId,
          changeDir,
          gitDir,
        });
        data = {
          ok: tr.ok,
          errors: tr.errors,
          warnings: tr.warnings,
          requiredEvidence: tr.requiredEvidence,
        };
        ok = tr.ok;
        errors = tr.errors || [];
        warnings = tr.warnings || [];
        exitCode = ok ? EXIT_OK : EXIT_BLOCKED;
        break;
      }

      // ── d. artifacts：当前阶段产物校验 ──
      // runValidators 需要 stage：用 progress.currentStage（若为空串则校验器内部处理）。
      case 'artifacts': {
        const r = runValidators(currentStage, cwd, changeName, {
          projectName: progress.project,
          specRoot,
        });
        data = { ok: r.ok, errors: r.errors, warnings: r.warnings };
        ok = r.ok;
        errors = r.errors || [];
        warnings = r.warnings || [];
        exitCode = ok ? EXIT_OK : EXIT_BLOCKED;
        break;
      }

      // 不可达：facet 已在入口白名单校验
      default: {
        const envelope = buildEnvelope({
          command: 'derive',
          facet,
          change: changeName,
          ok: false,
          errors: [`非法 facet: ${facet}，合法值: ${FACETS.join(', ')}`],
        });
        return { envelope, exitCode: EXIT_UNKNOWN };
      }
    }

    // stage 仅 artifacts 时出现（产物校验绑定阶段语义）；其余 facet 不传 stage。
    const envelope = buildEnvelope({
      command: 'derive',
      facet,
      change: changeName,
      ok,
      errors,
      warnings,
      data,
      stage: facet === 'artifacts' ? currentStage : undefined,
    });

    return { envelope, exitCode };
  } catch (e) {
    // 内部异常兜底（D-004@v1 / design §3.5）：保证 stdout 永远是合法 JSON 结构，exit 2
    const envelope = buildEnvelope({
      command: 'derive',
      facet,
      change: changeName,
      ok: false,
      errors: [`internal: ${e.message}`],
    });
    return { envelope, exitCode: EXIT_UNKNOWN };
  }
}
