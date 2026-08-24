#!/usr/bin/env node
// SillySpec A/B 评测入口。
// A 臂 = 裸 agent 直接做任务；B 臂 = 同 agent + SillySpec 流程。同任务、同模型、同判分脚本（verify.mjs），
// 差值 Δ 即 SillySpec 的真实增量。详细文档见 eval/README.md。
import { loadConfig } from './lib/config.mjs';
import { runEval } from './lib/runner.mjs';
import { buildReport, printReport, setBaseline } from './lib/report.mjs';
import { spawnCapture, tail } from './lib/util.mjs';

function parseArgs(argv) {
  const opts = {
    dryRun: false, dryMode: 'mixed', taskIds: [], arms: [], sample: 0,
    force: false, onlyFailed: false, report: false, setBaseline: false, preflight: false, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a.startsWith('--dry-run=')) { opts.dryRun = true; opts.dryMode = a.slice('--dry-run='.length); }
    else if (a === '--task') opts.taskIds.push(argv[++i]);
    else if (a === '--arm') opts.arms.push(...(argv[++i] ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
    else if (a === '--sample') opts.sample = Number(argv[++i]);
    else if (a === '--pilot') opts.sample = 20; // pilot = 前 20 个任务双臂
    else if (a === '--force') opts.force = true;
    else if (a === '--rerun-failed') opts.onlyFailed = true;
    else if (a === '--report') opts.report = true;
    else if (a === '--set-baseline') opts.setBaseline = true;
    else if (a === '--preflight') opts.preflight = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else { console.error(`未知参数: ${a}`); opts.help = true; }
  }
  return opts;
}

function help() {
  console.log(`SillySpec A/B 评测（A=裸 agent，B=SillySpec 流程，verify.mjs 客观判分）

用法：node eval/run.mjs <选项>

  --dry-run[=mixed|pass|fail]  零 token 验证管道（假 agent，不调模型不装依赖）
  --preflight                  检查 Node 版本与 agent CLI 可用性（零 token）
  --pilot                      真跑 pilot：前 20 个任务 × 双臂（消耗真实 token）
  --task <id>                  只跑指定任务（可重复）
  --arm A|B|A,B                只跑指定臂
  --sample <N>                 只跑前 N 个任务
  --rerun-failed               只重跑上一轮 fail/timeout/error（省 token 的定向重跑）
  --force                      忽略缓存强制重跑
  --report [--dry-run]         查看报告（Wilson CI / Δ / flaky / 基线对比）
  --set-baseline               把当前成绩固化为回归基线（发版前对比用）`);
}

async function preflight(config) {
  const major = Number(process.versions.node.split('.')[0]);
  console.log(`Node ${process.version} ${major >= 22 ? '✓' : '✗（eval 需 >= 22，node:sqlite）'}`);
  const bin = config.adapter.command[0];
  const r = await spawnCapture({ args: [bin, '--version'], timeoutMs: 20_000 });
  if (r.code === 0) {
    console.log(`${bin} --version ✓ ${tail(r.stdout, 120)}`);
  } else {
    console.log(`${bin} --version ✗ 不可用（${tail(r.stderr || `exit ${r.code}`, 120)}）`);
    console.log('  提示：先安装该 agent CLI 并在终端手动登录一次；认证沿用其登录态，本评测不接管密钥。');
  }
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  help();
  process.exit(0);
}
const config = loadConfig();
if (opts.preflight) {
  await preflight(config);
  process.exit(0);
}
if (opts.report) {
  printReport(config, buildReport(config, opts));
  process.exit(0);
}
if (opts.setBaseline) {
  setBaseline(config, opts);
  process.exit(0);
}
await runEval(config, opts);
printReport(config, buildReport(config, opts)); // 跑完顺手出报告
