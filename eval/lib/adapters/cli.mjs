// CLI 适配器：以子进程调起本机 headless agent CLI（claude -p / zcode / codex 等，见 eval.config.json）。
// 认证沿用该 CLI 自身的登录态或其读取的环境变量——本评测不接管、不存储任何密钥。
// prompt 默认经 stdin 注入（{prompt} 占位符是备选），规避跨平台引号转义。
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnCapture } from '../util.mjs';

export async function run({ adapter, prompt, workdir, logDir }) {
  const timeoutMs = adapter.timeoutMs ?? 900_000;
  const replacements = {
    '{workdir}': workdir,
    '{maxTurns}': String(adapter.maxTurns ?? 0),
    '{tool}': adapter.tool ?? '',
  };
  let args = adapter.command.map((a) => {
    let s = String(a);
    for (const [k, v] of Object.entries(replacements)) s = s.replaceAll(k, v);
    return s;
  });
  const viaStdin = (adapter.stdin ?? 'prompt') === 'prompt' && !args.some((a) => a.includes('{prompt}'));
  args = args.map((a) => a.replaceAll('{prompt}', prompt));

  mkdirSync(logDir, { recursive: true });
  writeFileSync(join(logDir, 'prompt.txt'), prompt, 'utf8');
  const res = await spawnCapture({ args, cwd: workdir, timeoutMs, input: viaStdin ? prompt : null });
  try {
    writeFileSync(join(logDir, 'stdout.txt'), res.stdout, 'utf8');
    writeFileSync(join(logDir, 'stderr.txt'), res.stderr, 'utf8');
  } catch { /* 日志落盘失败不影响评测本身 */ }

  const usage = adapter.parseStdoutJson ? extractUsage(res.stdout) : {};
  return {
    code: res.code,
    timedOut: res.timedOut,
    stdout: res.stdout,
    stderr: res.stderr,
    tokensIn: usage.tokensIn ?? null,
    tokensOut: usage.tokensOut ?? null,
    costUsd: usage.costUsd ?? null,
    logDir,
  };
}

// 宽松提取 token/费用字段：兼容 claude -p --output-format json 等常见 stdout 形状，
// 提不到就留空（null），报告里显示为缺测而非 0。
function extractUsage(stdout) {
  const trimmed = (stdout ?? '').trim();
  if (!trimmed.startsWith('{')) return {};
  let obj = null;
  for (const candidate of [trimmed, trimmed.split('\n').pop()]) {
    try { obj = JSON.parse(candidate); break; } catch { /* 试下一候选 */ }
  }
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  const scan = (o) => {
    if (!o || typeof o !== 'object') return;
    if (typeof o.input_tokens === 'number') out.tokensIn ??= o.input_tokens;
    if (typeof o.output_tokens === 'number') out.tokensOut ??= o.output_tokens;
    if (typeof o.total_cost_usd === 'number') out.costUsd ??= o.total_cost_usd;
  };
  scan(obj); scan(obj.usage); scan(obj.cost); scan(obj.message?.usage);
  return out;
}
