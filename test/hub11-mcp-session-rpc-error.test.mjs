/**
 * HUB-11 回归：MCP session 过期识别须覆盖 **200 + JSON-RPC error -32600「Missing session」**
 * 形态（api-reference 记载的错误形态），而非只认 HTTP 400。此前该形态落 rpc.error 分支
 * warn+null，不重置 session 不重试——server 换形态即全部 tool 调用静默失败。
 *
 * 场景：initialize 成功 → tools/call 返回 200 + {error:{code:-32600,message:'Missing session ID'}}
 * → client 应识别为 session 过期：重连（第二次 initialize）重试成功。
 */
import http from 'node:http'
import { SillyHubMcpClient } from '../src/sillyhub-mcp/client.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++; }
}

let initializeCalls = 0
let sessionIdCounter = 0
let expireNextCall = true // 首次 tools/call 回 -32600，重连后的调用成功
const server = http.createServer((req, res) => {
  const sid = req.headers['mcp-session-id']
  if (req.method === 'POST') {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      let rpc = null
      try { rpc = JSON.parse(body) } catch { /* ignore */ }
      if (rpc && rpc.method === 'initialize') {
        initializeCalls++
        sessionIdCounter++
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'mcp-session-id': `sess-${sessionIdCounter}`,
        })
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: { protocolVersion: '2025-11-25', capabilities: {}, serverInfo: { name: 'mock', version: '1' } } }))
        return
      }
      if (rpc && rpc.method === 'tools/call') {
        if (expireNextCall && sid === 'sess-1') {
          // HUB-11 目标形态：HTTP 200 + JSON-RPC error -32600
          expireNextCall = false
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32600, message: 'Missing session ID' } }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: { content: [{ type: 'text', text: JSON.stringify([{ id: 'w1' }]) }] } }))
        return
      }
      // notifications/initialized 等通知
      res.writeHead(202); res.end()
    })
    return
  }
  res.writeHead(404); res.end()
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}`

console.log('\n--- 200 + rpc.error -32600 → 重连重试成功 ---')
{
  const client = new SillyHubMcpClient({ url, token: 'tok' })
  const workers = await client.listWorkers('m-1')
  assert(Array.isArray(workers) && workers.length === 1, `tool 调用经重连重试成功（实得 ${JSON.stringify(workers)}）`)
  assert(initializeCalls === 2, `恰好两次 initialize（首建 + 过期重连；实得 ${initializeCalls}）`)
}

// 无关 error 不触发重连：-32602 只应失败一次
{
  initializeCalls = 0
  let sawOther = false
  server.removeAllListeners('request')
  server.on('request', (req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      let rpc = null
      try { rpc = JSON.parse(body) } catch { /* ignore */ }
      if (rpc && rpc.method === 'initialize') {
        initializeCalls++
        res.writeHead(200, { 'Content-Type': 'application/json', 'mcp-session-id': `sess-n${initializeCalls}` })
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: { protocolVersion: '2025-11-25', capabilities: {}, serverInfo: { name: 'm', version: '1' } } }))
        return
      }
      if (rpc && rpc.method === 'tools/call') {
        sawOther = true
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32602, message: 'Invalid params' } }))
        return
      }
      res.writeHead(202); res.end()
    })
  })
  const client = new SillyHubMcpClient({ url, token: 'tok' })
  const workers = await client.listWorkers('m-2')
  assert(Array.isArray(workers) && workers.length === 0, '-32602 普通错误返回 []（不误判 session 过期）')
  assert(initializeCalls === 1 && sawOther, `-32602 不触发重连（initialize=${initializeCalls}）`)
}

server.closeAllConnections?.()
await new Promise((r) => server.close(r))
console.log(`\n${failures === 0 ? '✅ hub11-mcp-session-rpc-error 全部通过' : '❌ 存在失败'}（失败 ${failures}）`)
process.exitCode = failures === 0 ? 0 : 1
