// eval 通用工具：稳定哈希、跨平台 shell 执行、统计区间。
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

// 键排序的稳定序列化：同一配置内容（键序无关）必须得到同一哈希，缓存/报告分组才可靠
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// 平台感知参数引用：Windows(cmd) 双引号、POSIX 单引号。
// 评测命令/路径不含引号；prompt 一律走 stdin 注入，绕开跨平台转义深坑。
export function shQuote(arg) {
  const s = String(arg);
  if (process.platform === 'win32') return `"${s.replace(/"/g, '""')}"`;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/**
 * 执行命令并捕获输出（shell 模式，Windows 下解析 .cmd 入口如 npx/claude 需要）。
 * 输出超过 maxOutputChars 停止累积（防 agent 刷屏撑爆内存），标记 truncated。
 * timeoutMs 到点杀进程树（win32 用 taskkill /T，POSIX kill 进程组语义下杀子进程）。
 */
export function spawnCapture({ args, cwd, timeoutMs = 0, input = null, maxOutputChars = 2_000_000 }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const command = args.map(shQuote).join(' ');
    let child;
    try {
      child = spawn(command, { cwd, shell: true, windowsHide: true });
    } catch (err) {
      resolve({ code: -1, stdout: '', stderr: String(err), timedOut: false, truncated: false, durationMs: 0 });
      return;
    }
    const state = { stdout: '', stderr: '' };
    let truncated = false;
    let timedOut = false;
    let settled = false;
    const onChunk = (key) => (buf) => {
      if (state[key].length >= maxOutputChars) { truncated = true; return; }
      state[key] += buf.toString('utf8');
    };
    child.stdout?.on('data', onChunk('stdout'));
    child.stderr?.on('data', onChunk('stderr'));
    let timer = null;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        if (process.platform === 'win32' && child.pid) {
          try { spawn('taskkill /pid ' + child.pid + ' /T /F', { shell: true, windowsHide: true }); } catch { /* 尽力杀 */ }
        }
        child.kill('SIGKILL');
      }, timeoutMs);
    }
    if (input != null) {
      child.stdin?.on('error', () => { /* stdin 中途关闭（进程先退出）不视为致命 */ });
      child.stdin?.end(input);
    }
    const settle = (patch) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({ durationMs: Date.now() - started, truncated, timedOut, ...state, ...patch });
    };
    child.on('error', (err) => settle({ code: -1, stderr: state.stderr + String(err) }));
    child.on('close', (code) => settle({ code: code === null ? -1 : code }));
  });
}

/** Wilson 95% 置信区间（小样本比正态近似稳） */
export function wilsonCI(pass, n, z = 1.96) {
  if (!n) return [null, null];
  const p = pass / n;
  const den = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

/** 两比例之差（B−A）的正态近似区间 */
export function deltaCI(pA, nA, pB, nB, z = 1.96) {
  if (!nA || !nB) return [null, null];
  const se = Math.sqrt((pA * (1 - pA)) / nA + (pB * (1 - pB)) / nB);
  const d = pB - pA;
  return [d - z * se, d + z * se];
}

export function fmtPct(x) {
  return x == null ? '—' : `${(x * 100).toFixed(1)}%`;
}

export function fmtPp(x) {
  return x == null ? '—' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}pp`;
}

export function tail(text, n = 600) {
  const s = (text ?? '').trim();
  return s.length <= n ? s : `…${s.slice(-n)}`;
}
