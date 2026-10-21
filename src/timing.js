/**
 * 分段计时记录器（2026-10-21-protocol-tax FR-01）。
 *
 * 背景：会话考古（2026-10-20-session-page-dsh-alignment z1/z2）发现 CLI 单命令耗时无从归因
 * ——verify --done 挂 300s 靠会话死亡才暴露，status 6.3s 靠 CPU profile 考古才定位到平台同步。
 * 本模块给命令提供四段计时（sync / gates / render / state-write），env DEBUG_SILLYSPEC_TIMING=1
 * 时在进程退出前输出 `[timing] sync=…ms gates=…ms render=…ms state-write=…ms`。
 *
 * 契约（FR-01）：
 * - 未设 env：timedSync/timedAsync 原样透传、退出钩子不输出——命令输出与现状逐字节等价。
 * - 设 env：未触达段输出 `n/a` 不省略段名；同名段多次进入累加；走 stderr（不污染 --json
 *   的 stdout envelope）。
 * - 观测不改变行为：fn 抛错照抛，耗时只记到抛错前；模块注册的 exit 钩子只写一行 stderr。
 * - 覆盖面：exit 钩子挂 process 'exit' 事件（含 process.exit 硬退出路径），无需各命令埋发射点。
 */
const SEGMENTS = ['sync', 'gates', 'render', 'state-write']
const enabled = process.env.DEBUG_SILLYSPEC_TIMING === '1'
const acc = new Map()

export function timingEnabled() {
  return enabled
}

function record(segment, ms) {
  acc.set(segment, (acc.get(segment) || 0) + ms)
}

export function timedSync(segment, fn) {
  if (!enabled) return fn()
  const t0 = performance.now()
  try {
    return fn()
  } finally {
    record(segment, performance.now() - t0)
  }
}

export async function timedAsync(segment, fn) {
  if (!enabled) return fn()
  const t0 = performance.now()
  try {
    return await fn()
  } finally {
    record(segment, performance.now() - t0)
  }
}

export function emitTimingIfEnabled(stream = process.stderr) {
  if (!enabled) return
  const parts = SEGMENTS.map((s) => {
    const ms = acc.get(s)
    return `${s}=${ms === undefined ? 'n/a' : `${Math.round(ms)}ms`}`
  })
  stream.write(`[timing] ${parts.join(' ')}\n`)
}

if (enabled) {
  process.on('exit', () => emitTimingIfEnabled())
}
