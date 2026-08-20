/**
 * HUB-09 回归：自动同步熔断（8s race）必须在超时时**中断在飞请求**（传 AbortSignal），
 * 而非任由底层请求（progress POST 10s / spec-sync POST 30s 超时）在熔断后自行完成——
 * 那会造成「CLI 认为超时放弃、平台实际已接受」的不确定结果（spec 树推送无 base_ts 自愈兜底）。
 *
 * 两层断言：
 *   A. syncSpecTree 掯 opts.signal——外部 abort 使在飞 GET 被取消（服务器观察到连接关闭）；
 *   B. triggerSync 掯 opts.timeoutMs（测试专用覆盖）——熔断触发时 controller.abort() 传到底层 POST。
 */
import http from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { syncSpecTree } from '../src/spec-sync.js'
import { triggerSync } from '../src/run/shared.js'
import { ProgressManager } from '../src/progress.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++; }
}

const tmpRoot = mkdtempSync(join(tmpdir(), `hub09-abort-${process.pid}-`))

// 延迟应答服务器：spec-manifest GET 与 progress POST 都挂 8s 才回——只有客户端 abort 能提前结束
let serverClosedEarly = 0 // 服务器侧观察到「请求在响应前被客户端关闭」的次数
const server = http.createServer((req, res) => {
  req.on('close', () => { if (!res.writableEnded) serverClosedEarly++ })
  if (req.url.includes('/api/changes/-/spec-manifest')) {
    setTimeout(() => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}') }, 8000).unref?.()
    return
  }
  if (/\/api\/changes\/[^/]+\/progress$/.test(req.url) && req.method === 'POST') {
    setTimeout(() => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true })) }, 8000).unref?.()
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

// ── A. syncSpecTree 外部 signal ──
console.log('\n--- A. syncSpecTree opts.signal 中断在飞 GET ---')
{
  const cwd = makeCwd('spec')
  writeFileSync(join(cwd, '.sillyspec', 'a.md'), 'local content\n')
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 400)
  const t0 = Date.now()
  const r = await syncSpecTree(join(cwd, '.sillyspec'), { url: mockUrl, token: 'tok' }, 'hub09-chg', { signal: controller.signal })
  const elapsed = Date.now() - t0
  assert(r && r.synced === 0, `abort 后返回 {synced:0}（实得 ${JSON.stringify(r && r.synced)}）`)
  assert(elapsed < 3000, `abort 后快速返回（${elapsed}ms < 3000ms，不陪跑 8s 服务器延迟）`)
  await new Promise((r) => setTimeout(r, 300))
  assert(serverClosedEarly >= 1, `服务器观察到连接被客户端中断（实得 ${serverClosedEarly} 次）`)
}

// ── B. triggerSync 熔断中断底层 POST ──
console.log('\n--- B. triggerSync timeoutMs 熔断 → abort 传到底层 POST ---')
{
  const before = serverClosedEarly
  const cwd = makeCwd('push')
  const CN = 'hub09-push'
  mkdirSync(join(cwd, '.sillyspec', 'changes', CN), { recursive: true })
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  pm.init(cwd)
  pm.initChange(cwd, CN)
  const t0 = Date.now()
  await triggerSync(cwd, CN, {}, { timeoutMs: 600 })
  const elapsed = Date.now() - t0
  assert(elapsed < 3000, `熔断按 timeoutMs 生效（${elapsed}ms < 3000ms）`)
  await new Promise((r) => setTimeout(r, 300))
  assert(serverClosedEarly > before, `底层 POST 被中断而非自然完成（before=${before} after=${serverClosedEarly}）`)
}

server.closeAllConnections?.()
await new Promise((r) => server.close(r))
console.log(`\n${failures === 0 ? '✅ hub09-sync-circuit-abort 全部通过' : '❌ 存在失败'}（失败 ${failures}）`)
process.exitCode = failures === 0 ? 0 : 1
