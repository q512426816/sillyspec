/**
 * aborted 异常治理回归（坑 spec-sync-aborted-looks-exception，2026-09-07 平台执行环境实证）：
 *
 * 现象：平台执行时 spec-sync 间歇打出「[spec-sync] 拉取清单异常 …: This operation was
 * aborted」——是 run/shared.js raceWithAbort 的同步总熔断（HUB-09）外部 abort 了在飞
 * fetch，undici AbortError 的英文原始 message 被原样拼进 warn，看起来像未知异常。
 *
 * 两层修复的回归：
 *   A. describeSyncError 分类文案——AbortError 译「总预算熔断让路」、TimeoutError 译
 *      「单请求超时」、其余错误维持原样；spec-sync 两处 catch 均走它（集成断言）。
 *   B. 熔断总预算 env 可调——resolveSyncTotalTimeoutMs 读 SILLYSPEC_SYNC_TIMEOUT_MS
 *      （整数 ms，[1000,120000]，非法/越界回退 8000）；env 在 raceWithAbort 调用时生效
 *      （默认参数逐次求值，进程内改 env 立即可见——集成断言）。
 *
 * 服务器形态沿用 hub09-sync-circuit-abort：应答挂 8s，只有客户端 abort 能提前结束。
 */
import http from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { syncSpecTree, describeSyncError } from '../src/spec-sync.js'
import { triggerSync, resolveSyncTotalTimeoutMs } from '../src/run/shared.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++; }
}

const tmpRoot = mkdtempSync(join(tmpdir(), `spec-sync-abort-${process.pid}-`))

// 延迟应答服务器：manifest GET 挂 8s——外部 abort / 熔断触发是唯一提前出口
const server = http.createServer((req, res) => {
  if (req.url.includes('/api/changes/-/spec-manifest')) {
    setTimeout(() => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}') }, 8000).unref?.()
    return
  }
  res.writeHead(404); res.end()
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const mockUrl = `http://127.0.0.1:${server.address().port}`

const makeCwd = (sub) => {
  const cwd = join(tmpRoot, sub)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8')
  return cwd
}

// console.warn 捕获（仓库既有模式：临时替换 + finally 还原）
const captureWarns = async (fn) => {
  const origWarn = console.warn
  const warns = []
  console.warn = (...a) => { warns.push(a.join(' ')) }
  try { return { result: await fn(), warns } } finally { console.warn = origWarn }
}

// ── A1. describeSyncError 单元：三类错误翻译 ──
console.log('\n--- A1. describeSyncError 分类文案 ---')
{
  const abort = describeSyncError({ name: 'AbortError', message: 'This operation was aborted' })
  assert(abort.includes('熔断') && !abort.includes('This operation was aborted'),
    `AbortError 译总预算熔断文案（实得「${abort}」）`)
  const timeout = describeSyncError({ name: 'TimeoutError', message: 'The operation was aborted due to timeout' })
  assert(timeout.includes('超时') && !timeout.includes('aborted'),
    `TimeoutError 译单请求超时文案（实得「${timeout}」）`)
  const other = describeSyncError(new Error('fetch failed'))
  assert(other === 'fetch failed', `其余错误维持原样（实得「${other}」）`)
}

// ── A2. syncSpecTree 集成：外部 abort → warn 走分类文案（不再露英文原始串）──
console.log('\n--- A2. syncSpecTree 外部 abort → 分类 warn ---')
{
  const cwd = makeCwd('cls')
  writeFileSync(join(cwd, '.sillyspec', 'a.md'), 'local content\n')
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 400)
  const { result, warns } = await captureWarns(() =>
    syncSpecTree(join(cwd, '.sillyspec'), { url: mockUrl, token: 'tok' }, 'cls-chg', { signal: controller.signal }))
  assert(result && result.synced === 0, `abort 后返回 {synced:0}（实得 ${JSON.stringify(result && result.synced)}）`)
  const line = warns.find((w) => w.includes('[spec-sync] 拉取清单异常'))
  assert(Boolean(line), '拉取清单异常 warn 存在')
  assert(Boolean(line) && line.includes('熔断'), `warn 含「熔断」分类文案（实得「${line}」）`)
  assert(Boolean(line) && !line.includes('This operation was aborted'), 'warn 不再露英文原始 aborted 串')
}

// ── B1. resolveSyncTotalTimeoutMs 单元：env 合法性口径 ──
console.log('\n--- B1. resolveSyncTotalTimeoutMs env 口径 ---')
{
  const cases = [
    [undefined, 8_000, '未设置 → 默认 8s'],
    ['30000', 30_000, '合法整数 → 采纳'],
    ['120000', 120_000, '上界 120s → 采纳'],
    ['1000', 1_000, '下界 1s → 采纳'],
    ['999', 8_000, '低于下界 → 回退 8s'],
    ['120001', 8_000, '超上界 → 回退 8s'],
    ['8000.5', 8_000, '非整数 → 回退 8s'],
    ['abc', 8_000, '非数字 → 回退 8s'],
    ['', 8_000, '空串 → 回退 8s'],
  ]
  const saved = process.env.SILLYSPEC_SYNC_TIMEOUT_MS
  try {
    for (const [raw, want, label] of cases) {
      if (raw === undefined) delete process.env.SILLYSPEC_SYNC_TIMEOUT_MS
      else process.env.SILLYSPEC_SYNC_TIMEOUT_MS = raw
      const got = resolveSyncTotalTimeoutMs()
      assert(got === want, `${label}（env=${JSON.stringify(raw)} 实得 ${got}）`)
    }
  } finally {
    if (saved === undefined) delete process.env.SILLYSPEC_SYNC_TIMEOUT_MS
    else process.env.SILLYSPEC_SYNC_TIMEOUT_MS = saved
  }
}

// ── B2. triggerSync 集成：env 调小总预算 → 熔断按 env 生效（默认参数逐次求值）──
console.log('\n--- B2. triggerSync env=SILLYSPEC_SYNC_TIMEOUT_MS=1000 → 1s 熔断 ---')
{
  const cwd = makeCwd('env')
  // quick-<hex8> 且无实体目录 → triggerSync 降级 syncSpecTreeOnly（挂住的 manifest GET）
  const SID = 'quick-0000c0de'
  const saved = process.env.SILLYSPEC_SYNC_TIMEOUT_MS
  process.env.SILLYSPEC_SYNC_TIMEOUT_MS = '1000'
  let elapsed
  try {
    const t0 = Date.now()
    await triggerSync(cwd, SID)
    elapsed = Date.now() - t0
  } finally {
    if (saved === undefined) delete process.env.SILLYSPEC_SYNC_TIMEOUT_MS
    else process.env.SILLYSPEC_SYNC_TIMEOUT_MS = saved
  }
  assert(elapsed >= 900 && elapsed < 3000,
    `熔断按 env 1s 生效而非默认 8s（实得 ${elapsed}ms ∈ [900,3000)）`)
}

server.closeAllConnections?.()
await new Promise((r) => server.close(r))
console.log(`\n${failures === 0 ? '✅ spec-sync-abort-classification 全部通过' : '❌ 存在失败'}（失败 ${failures}）`)
process.exitCode = failures === 0 ? 0 : 1
