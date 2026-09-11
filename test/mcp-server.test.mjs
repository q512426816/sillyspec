/**
 * MCP Phase 2（P2-g，noai-ir-roadmap §5）：`sillyspec mcp` 最小 stdio MCP server。
 * 锁定：initialize 握手（协议版本回显）、tools/list 四件只读 tools、tools/call 走子进程
 * --json（sillyspec_next 在空仓 fixture 上返回 JSON state）、未知方法 JSON-RPC error、
 * notification 无 id 不回包、非 JSON 行静默忽略。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawn } from 'node:child_process'
import { startMcpServer } from '../src/mcp-server.js'

test('server 主循环：握手/tools 列表/tools 调用/error/notification 五协议面', async () => {
  const { PassThrough } = await import('node:stream')
  const input = new PassThrough()
  const output = new PassThrough()
  const done = startMcpServer({ input, output })

  const replies = []
  output.on('data', (d) => { for (const l of String(d).split('\n')) if (l.trim()) replies.push(JSON.parse(l)) })

  const send = (o) => input.write(JSON.stringify(o) + '\n')
  const waitReplies = async (n) => {
    for (let i = 0; i < 100 && replies.length < n; i++) await new Promise(r => setTimeout(r, 20))
    assert.ok(replies.length >= n, `收到 ${n} 条回复（实得 ${replies.length}）`)
  }

  send({ jsonrpc: '2.0', method: 'initialize', id: 1, params: { protocolVersion: '2025-06-18' } })
  send({ jsonrpc: '2.0', method: 'notifications/initialized' }) // notification：无 id 不回包
  input.write('this is not json\n') // 非 JSON 行静默忽略
  send({ jsonrpc: '2.0', method: 'tools/list', id: 2 })
  send({ jsonrpc: '2.0', method: 'no/such/method', id: 3 })
  await waitReplies(3)

  const init = replies.find(r => r.id === 1)
  assert.equal(init.result.protocolVersion, '2025-06-18', '协议版本回显')
  assert.ok(init.result.serverInfo.name === 'sillyspec')
  assert.ok(init.result.capabilities.tools, 'tools 能力声明')

  const list = replies.find(r => r.id === 2)
  const names = list.result.tools.map(t => t.name)
  assert.deepEqual(names.sort(), ['sillyspec_derive', 'sillyspec_gate', 'sillyspec_next', 'sillyspec_progress'].sort(), '四件只读 tools')
  assert.ok(list.result.tools.every(t => t.inputSchema && t.description), 'schema 与描述齐')

  const err = replies.find(r => r.id === 3)
  assert.equal(err.error.code, -32601, '未知方法 → JSON-RPC error')

  // tools/call：sillyspec_next（子进程 --json；空 fixture → 有 state 的 JSON）
  const fixture = mkdtempSync(join(tmpdir(), 'mcp-'))
  try {
    mkdirSync(join(fixture, '.sillyspec'), { recursive: true })
    send({ jsonrpc: '2.0', method: 'tools/call', id: 4, params: { name: 'sillyspec_next', arguments: { spec_dir: join(fixture, '.sillyspec') } } })
    await waitReplies(4)
    const call = replies.find(r => r.id === 4)
    assert.ok(!call.error, `调用无协议错（${JSON.stringify(call.error || null)}）`)
    const payload = JSON.parse(call.result.content[0].text)
    assert.ok(payload.command === 'next' || payload.state !== undefined, '返回 next 的 JSON 输出')
    assert.ok(!call.result.isError, '空仓 next 退出 0 非 error')
    // 未知工具 → isError
    send({ jsonrpc: '2.0', method: 'tools/call', id: 5, params: { name: 'nope_tool', arguments: {} } })
    await waitReplies(5)
    const bad = replies.find(r => r.id === 5)
    assert.equal(bad.result.isError, true, '未知工具 isError')
  } finally {
    try { rmSync(fixture, { recursive: true, force: true }) } catch {}
    input.end()
    await done
  }
})

test('CLI e2e：`sillyspec mcp` 子进程响应 initialize + tools/list', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'mcp-e2e-'))
  try {
    mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
    const p = spawn(process.execPath, [join(process.cwd(), 'src', 'index.js'), 'mcp'], { cwd, stdio: ['pipe', 'pipe', 'inherit'] })
    const out = []
    p.stdout.on('data', d => out.push(String(d)))
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1, params: {} }) + '\n')
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 2 }) + '\n')
    await new Promise(r => setTimeout(r, 800))
    p.kill()
    const lines = out.join('').split('\n').filter(l => l.trim()).map(l => JSON.parse(l))
    const init = lines.find(l => l.id === 1)
    const list = lines.find(l => l.id === 2)
    assert.ok(init && init.result.serverInfo, 'CLI 入口握手成功')
    assert.ok(list && list.result.tools.length === 4, 'CLI 入口 tools/list 四件')
  } finally { try { rmSync(cwd, { recursive: true, force: true }) } catch {} }
})
