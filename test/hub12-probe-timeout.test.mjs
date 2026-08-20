/**
 * HUB-12 回归（probe + client 杂项）：
 *   a. probe 总超时：慢/挂 daemon 下 probeSillyHub 按 totalTimeoutMs 截断（此前无总超时，
 *      最坏 5 个串行 10s 请求 ~50s 才降级，阻塞 execute）；
 *   b. tools/list 复用：预热路径A schema 与 root_path 越界校验共用一次 tools/list
 *      （此前 listTools + getRootPath 各发一次同 method 请求）；
 *   c. client.close()：MCP streamable HTTP DELETE 收尾（此前 session 留给 server TTL）。
 */
import http from 'node:http'
import { probeSillyHub, clearProbeCache, detectPathAFromTools } from '../src/dispatch/probe.js'
import { SillyHubMcpClient } from '../src/sillyhub-mcp/client.js'
import { isPathASupported } from '../src/dispatch/backends/sillyhub-mcp.js'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++; }
}

// 钉死 env 配置：probe 的 no-config 快速路径读 process.cwd() 的 local.yaml/env——
// 套件 runner 的 cwd 与单跑不同（单跑恰好落在含 mcp 段的 dogfood local.yaml 上），
// 不钉 env 会随运行环境在 no-config 提前返回
const SAVED_ENV = {}
for (const k of ['SILLYHUB_MCP_URL', 'SILLYHUB_MCP_TOKEN']) {
  SAVED_ENV[k] = process.env[k]
  process.env[k] = k === 'SILLYHUB_MCP_URL' ? 'http://127.0.0.1:9-mock' : 'mock-token'
}
process.on('exit', () => {
  for (const [k, v] of Object.entries(SAVED_ENV)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

// ── a. probe 总超时 ──
console.log('\n--- a. probeSillyHub 总超时截断 ---')
{
  clearProbeCache()
  const hangingClient = { probeDaemon: () => new Promise(() => {}) } // 永不 resolve
  const t0 = Date.now()
  const r = await probeSillyHub({ client: hangingClient, ttlMs: 60_000, totalTimeoutMs: 400 })
  const elapsed = Date.now() - t0
  assert(r.available === false && r.reason === 'probe-timeout', `超时返回 probe-timeout（实得 ${JSON.stringify(r)}）`)
  assert(elapsed < 2500, `按 totalTimeoutMs 截断（${elapsed}ms < 2500ms）`)
  // 超时进负面缓存（TTL 内不重探）
  const r2 = await probeSillyHub({ client: hangingClient, ttlMs: 60_000, totalTimeoutMs: 400 })
  assert(r2.reason === 'daemon-unreachable' || r2.reason === 'probe-timeout', `超时结果被负面缓存（实得 ${r2.reason}）`)
  clearProbeCache()
}

// ── b. tools/list 一次复用（mock client 计数）──
console.log('\n--- b. probe 链路 tools/list 只发一次 ---')
{
  clearProbeCache()
  const mkRoot = () => mkdtempSync(`${tmpdir}/hub12-root-`)
  const root = mkRoot()
  const calls = { probeDaemon: 0, listToolsWithMeta: 0, getRootPath: 0 }
  const mockClient = {
    probeDaemon: async () => { calls.probeDaemon++; return true },
    listToolsWithMeta: async () => {
      calls.listToolsWithMeta++
      return { tools: [{ name: 'dispatch_worker', inputSchema: { properties: { worktree_path: {}, worker_prompt: {} } } }], root_path: root }
    },
    getRootPath: async () => { calls.getRootPath++; return root },
  }
  const wtInside = `${root}${process.platform === 'win32' ? '\\' : '/'}wt-a`
  const r = await probeSillyHub({ client: mockClient, worktreePath: wtInside, ttlMs: 60_000 })
  assert(r.available === true, `worktree 在 root 内 → available（实得 ${JSON.stringify(r)}）`)
  assert(calls.listToolsWithMeta === 1, `listToolsWithMeta 恰好一次（实得 ${calls.listToolsWithMeta}）`)
  assert(calls.getRootPath === 0, `getRootPath 未被调用（复用同次结果；实得 ${calls.getRootPath}）`)
  assert(isPathASupported() === true, '路径A 探测缓存已从同次结果预热')
  clearProbeCache()

  // 越界：worktree 在 root 外 → unavailable（同样只发一次 tools/list）
  const wtOutside = `${root}-elsewhere/wt-b`
  const r2 = await probeSillyHub({ client: mockClient, worktreePath: wtOutside, ttlMs: 60_000 })
  assert(r2.available === false && r2.reason === 'worktree-outside-root', `越界判定（实得 ${JSON.stringify(r2)}）`)
  assert(calls.listToolsWithMeta === 2, `两轮探测共两次 tools/list（实得 ${calls.listToolsWithMeta}）`)
  clearProbeCache()
}

// ── c. client.close() DELETE 收尾 ──
console.log('\n--- c. client.close() 发 DELETE 收尾 ---')
{
  let initializeCalls = 0
  const deletes = []
  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = ''
      req.on('data', (c) => { body += c })
      req.on('end', () => {
        let rpc = null
        try { rpc = JSON.parse(body) } catch { /* ignore */ }
        if (rpc && rpc.method === 'initialize') {
          initializeCalls++
          res.writeHead(200, { 'Content-Type': 'application/json', 'mcp-session-id': `close-sess-${initializeCalls}` })
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: { protocolVersion: '2025-11-25', capabilities: {}, serverInfo: { name: 'm', version: '1' } } }))
          return
        }
        if (rpc && rpc.method === 'tools/call') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: { content: [{ type: 'text', text: '[]' }] } }))
          return
        }
        res.writeHead(202); res.end()
      })
      return
    }
    if (req.method === 'DELETE') {
      deletes.push(String(req.headers['mcp-session-id'] || ''))
      res.writeHead(200); res.end()
      return
    }
    res.writeHead(404); res.end()
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const url = `http://127.0.0.1:${server.address().port}`

  const client = new SillyHubMcpClient({ url, token: 'tok' })
  await client.probeDaemon() // 建 session
  const ok = await client.close()
  assert(ok === true, 'close() 返回 true')
  assert(deletes.length === 1 && deletes[0] === 'close-sess-1', `DELETE 带原 session id（实得 ${JSON.stringify(deletes)}）`)
  const ok2 = await client.close()
  assert(ok2 === false && deletes.length === 1, '无 session 的重复 close 幂等 no-op')
  // close 后再调 tool → 重新 initialize（session 已清）
  const alive = await client.probeDaemon()
  assert(alive === true && initializeCalls === 2, `close 后调用重新建 session（initialize=${initializeCalls}）`)

  server.closeAllConnections?.()
  await new Promise((r) => server.close(r))
}

console.log(`\n${failures === 0 ? '✅ hub12-probe-timeout 全部通过' : '❌ 存在失败'}（失败 ${failures}）`)
process.exitCode = failures === 0 ? 0 : 1
