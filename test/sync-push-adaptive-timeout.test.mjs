/**
 * 2026-11-28-spec-sync-push-adaptive-timeout 回归。
 *
 * 生产实证（multi-agent-platform，连续 13 轮文件树推送失败）：块上限 2MB 与
 * 固定 30s 超时无关联计算——上行 512Kbps 下行 2MB 块需 32s，结构性必超；
 * 且一块超时整轮失败，断点续传推进速度输给新写入速度，永不收敛。
 *
 * 四层断言：
 *   A. FR-01 自适应超时（2MB ≥75s、无参=30s、env 优先）；
 *   B. FR-02 二分降级（多 op 块超时拆半成功、单 op 不无限拆、HTTP 500 不降级）；
 *   C. FR-03 缺省块 1MB（>2MB 总量必切 ≥3 块）；
 *   D. FR-04 失败计数分键（timeout/http 不合并；成功清全类别含历史单键）。
 */
import http from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { syncSpecTree, chunkOpsForPush, resolvePushTimeoutMs, readFailStreak, bumpFailStreak, clearFailStreakPrefix } from '../src/spec-sync.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}

const tmpRoot = mkdtempSync(join(tmpdir(), `sync-adapt-${process.pid}-`))
const mkOp = (path, contentLen = 0) => ({ op: 'add', path, base_version: 0, content: 'x'.repeat(contentLen) })

function makeSpecRoot(label) {
  const root = join(tmpRoot, label)
  mkdirSync(join(root, 'changes', 'demo'), { recursive: true })
  // 4 个文件 → 服务器清单空时产出 4 个 add op（供二分降级用例拆分）
  for (let i = 0; i < 4; i++) {
    writeFileSync(join(root, 'changes', 'demo', `f${i}.md`), `hello ${i}\n`)
  }
  writeFileSync(join(root, '.platform-sync-test-marker'), label)
  return root
}

// ── A. FR-01 自适应超时 ──
console.log('\n--- A. FR-01 自适应超时 ---')
{
  const saved = process.env.SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS
  process.env.SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS = ''
  delete process.env.SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS
  const twoMB = resolvePushTimeoutMs(2 * 1024 * 1024)
  const halfMB = resolvePushTimeoutMs(512 * 1024)
  const none = resolvePushTimeoutMs()
  assert(twoMB >= 75_000, `2MB 块超时 ≥75s（实得 ${twoMB}ms）`)
  assert(halfMB >= 30_000 && halfMB < twoMB, `512KB 块超时介于 30s 与 2MB 之间（实得 ${halfMB}ms）`)
  assert(none === 30_000, `无参调用维持 30s 缺省（实得 ${none}ms）`)

  process.env.SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS = '90000'
  assert(resolvePushTimeoutMs(2 * 1024 * 1024) === 90_000, 'env 显式配置优先，覆盖自适应值')
  if (saved === undefined) delete process.env.SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS
  else process.env.SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS = saved
}

// ── C. FR-03 缺省 1MB 切块 ──
console.log('\n--- C. FR-03 缺省块 1MB ---')
{
  const savedBytes = process.env.SILLYSPEC_SPEC_SYNC_CHUNK_BYTES
  const savedOps = process.env.SILLYSPEC_SPEC_SYNC_CHUNK_OPS
  delete process.env.SILLYSPEC_SPEC_SYNC_CHUNK_BYTES
  delete process.env.SILLYSPEC_SPEC_SYNC_CHUNK_OPS
  // 每 op 估算 ≈ content(400KB) + path×2 + 96；9 个 op ≈ 3.6MB → 1MB 上限应切 ≥4 块
  const ops = Array.from({ length: 9 }, (_, i) => mkOp(`f${i}.md`, 400 * 1024))
  const chunks = chunkOpsForPush(ops)
  assert(chunks.length >= 3, `约 3.6MB 总量切 ≥3 块（实得 ${chunks.length} 块，1MB 上限）`)
  assert(chunks.flat().length === ops.length, '切块不丢 op、保序合并等于原集')
  if (savedBytes !== undefined) process.env.SILLYSPEC_SPEC_SYNC_CHUNK_BYTES = savedBytes
  if (savedOps !== undefined) process.env.SILLYSPEC_SPEC_SYNC_CHUNK_OPS = savedOps
}

// ── HTTP 桩：可配置每请求延迟与失败策略 ──
function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler)
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }))
  })
}
const manifestOk = (files = {}) => (req, res) => {
  if (req.url.startsWith('/api/changes/-/spec-manifest')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ spec_version: 1, files }))
    return
  }
  res.writeHead(404); res.end()
}

// ── B. FR-02 二分降级 ──
console.log('\n--- B. FR-02 二分降级 ---')
{
  const specRoot = makeSpecRoot('b1')
  // 服务器：清单空；spec-sync 对「含 >2 ops 的块」超时（挂起不响应），≤2 ops 成功。
  const posted = []
  const { server, url } = await startServer((req, res) => {
    if (req.url.startsWith('/api/changes/-/spec-manifest')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ spec_version: 1, files: {} }))
      return
    }
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      const ops = JSON.parse(body || '{}').ops || []
      posted.push(ops.length)
      if (ops.length > 2) return // 挂起 → 客户端超时
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ conflict: false, server_versions: {}, platform_deleted: [] }))
    })
  })
  try {
    process.env.SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS = '600' // 缩短超时让用例快跑
    process.env.SILLYSPEC_SPEC_SYNC_CHUNK_OPS = '4' // 强制多 op 块
    process.env.SILLYSPEC_SPEC_SYNC_CHUNK_BYTES = '1048576'
    const platform = { url, token: 't' }
    const result = await syncSpecTree(specRoot, platform, 'demo')
    assert(result.ok === true, '多 op 块超时经二分降级后整轮成功（ok:true）')
    assert(posted.some((n) => n > 2), `首轮确实发过多 op 块并超时（实得块序列 ${posted.join(',')}）`)
    assert(posted.filter((n) => n <= 2).length >= 2, '降级后产生多个小块的独立 POST')
  } finally {
    server.close()
    delete process.env.SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS
    delete process.env.SILLYSPEC_SPEC_SYNC_CHUNK_OPS
    delete process.env.SILLYSPEC_SPEC_SYNC_CHUNK_BYTES
  }
}
{
  // 单 op 块也超时 → 本轮失败，不无限拆（POST 次数有界）
  const specRoot = makeSpecRoot('b2')
  let posts = 0
  const { server, url } = await startServer((req, res) => {
    if (req.url.startsWith('/api/changes/-/spec-manifest')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ spec_version: 1, files: {} }))
      return
    }
    posts++
    // 全部挂起 → 恒超时
  })
  try {
    process.env.SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS = '300'
    process.env.SILLYSPEC_SPEC_SYNC_CHUNK_OPS = '4'
    const result = await syncSpecTree(specRoot, { url, token: 't' }, 'demo')
    assert(result.ok === false, '单 op 仍超时 → 本轮失败（ok:false）')
    // 深度上限 4：4 ops 块最坏拆到 1 op，POST 次数应为有限小集合（首块+左递归+右递归）
    assert(posts <= 16, `POST 次数有界（实得 ${posts} 次，≤16）`)
  } finally {
    server.close()
    delete process.env.SILLYSPEC_SPEC_SYNC_PUSH_TIMEOUT_MS
    delete process.env.SILLYSPEC_SPEC_SYNC_CHUNK_OPS
  }
}
{
  // HTTP 500 → 不降级，直接失败本轮
  const specRoot = makeSpecRoot('b3')
  let posts = 0
  const { server, url } = await startServer((req, res) => {
    if (req.url.startsWith('/api/changes/-/spec-manifest')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ spec_version: 1, files: {} }))
      return
    }
    posts++
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ code: 'ERR', message: 'boom' }))
  })
  try {
    process.env.SILLYSPEC_SPEC_SYNC_CHUNK_OPS = '4'
    const result = await syncSpecTree(specRoot, { url, token: 't' }, 'demo')
    assert(result.ok === false, 'HTTP 500 → 本轮失败')
    assert(posts === 1, `HTTP 500 不触发二分降级（POST 次数=1，实得 ${posts}）`)
  } finally {
    server.close()
    delete process.env.SILLYSPEC_SPEC_SYNC_CHUNK_OPS
  }
}

// ── D. FR-04 失败计数分键 ──
console.log('\n--- D. FR-04 失败计数分键 ---')
{
  const specRoot = makeSpecRoot('d1')
  // 清掉可能的历史计数
  const streakFile = join(specRoot, '.runtime', 'state', 'spec-sync-fail-streak.json')
  if (existsSync(streakFile)) writeFileSync(streakFile, '{}\n')
  bumpFailStreak(specRoot, 'demo:timeout', 't1')
  bumpFailStreak(specRoot, 'demo:timeout', 't2')
  bumpFailStreak(specRoot, 'demo:http', 'h1')
  const all = readFailStreak(specRoot)
  assert(all['demo:timeout']?.count === 2, `timeout 键计数=2（实得 ${all['demo:timeout']?.count}）`)
  assert(all['demo:http']?.count === 1, `http 键计数=1（实得 ${all['demo:http']?.count}）`)

  // 历史遗留无类别单键也应被前缀清除
  bumpFailStreak(specRoot, 'demo', 'legacy')
  clearFailStreakPrefix(specRoot, 'demo')
  const after = readFailStreak(specRoot)
  assert(Object.keys(after).filter((k) => k === 'demo' || k.startsWith('demo:')).length === 0,
    '成功清除该标签下全部类别（含历史单键形态）')
  assert(Object.keys(after).every((k) => !k.startsWith('demo')), '不误清其他标签')
}

console.log(`\n${failures === 0 ? '✅ 全部通过' : `❌ ${failures} 项失败`}`)
process.exit(failures === 0 ? 0 : 1)
