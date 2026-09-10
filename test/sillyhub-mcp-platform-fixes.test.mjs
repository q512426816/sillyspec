// 平台侧 MCP 修复（22cdf89d1）三遗留的 sillyspec 侧落地回归（2026-09-10）：
//   ① dispatchWorker 解析补 id：平台实返 {id, role, status…}，旧解析只认 worker_id →
//      派发成功 workerId=null（平台侧交付遗留①，spike + 远端回归双实证）
//   ② connect mcp 段成对签发：mcp-tokens API 201 带 gateway_url，与 token 成对写 local.yaml
//      （覆盖陈旧/错部署段；签发失败降级旧口径不覆盖手填段）
//   ③ probe daemon 在线层：get_daemon_status 三态——false → unavailable(daemon-offline)；
//      true/null（旧 backend 无工具/缺 read scope）→ 不判不可用（fail-open）
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SillyHubMcpClient } from '../src/sillyhub-mcp/client.js'
import { probeSillyHub, clearProbeCache } from '../src/dispatch/probe.js'
import { SyncManager } from '../src/sync.js'

test('① 端点双形态兼容（origin 拼 /mcp/ vs 完整端点不再叠加——活体实证 /mcp/mcp/ 404）', () => {
  const mk = (url) => new SillyHubMcpClient({ url, token: 't' })._endpoint
  assert.equal(mk('http://x'), 'http://x/mcp/', 'origin 形态（历史 local.yaml）→ 拼 /mcp/')
  assert.equal(mk('http://x/mcp'), 'http://x/mcp/', '完整端点形态（平台 gateway_url / daemon writer）→ 不叠加')
  assert.equal(mk('http://x/mcp/'), 'http://x/mcp/', '带尾斜杠归一')
  assert.equal(mk('https://host/api/mcp'), 'https://host/api/mcp/', '子路径 gateway（未来部署形态）→ 不叠加')
  assert.equal(mk(''), '', '未配置 → 空端点不发网')
})

test('① dispatchWorker 解析平台实返的 id 字段（旧解析恒 null 的缺口）', async () => {
  const cli = new SillyHubMcpClient({ url: 'http://127.0.0.1:9999', token: 'shmcp_x' })
  // monkey-patch _callTool：返回平台实测形态 {id, role, status}（无 worker_id 键）
  cli._callTool = async () => ({
    content: [{ type: 'text', text: JSON.stringify({ id: 'c68fbd10-8d93', role: 'worker', status: 'queued', agent_type: 'pi' }) }],
  })
  const r = await cli.dispatchWorker({ missionId: 'm-1', objective: '读文件', readOnly: true })
  assert.equal(r.workerId, 'c68fbd10-8d93', '平台实返 id → workerId 正确解析（旧解析此处为 null）')
  assert.equal(r.status, 'queued')
  // 兼容历史 worker_id 形态（旧 mock/未来协议）
  cli._callTool = async () => ({ content: [{ type: 'text', text: JSON.stringify({ worker_id: 'w-old', status: 'running' }) }] })
  const r2 = await cli.dispatchWorker({ missionId: 'm-1', objective: 'x' })
  assert.equal(r2.workerId, 'w-old', 'worker_id 形态向后兼容')
})

test('① getDaemonStatus 三态解析（daemon_online 布尔 / isError / 未配置）', async () => {
  const cli = new SillyHubMcpClient({ url: 'http://127.0.0.1:9999', token: 'shmcp_x' })
  cli._callTool = async () => ({ content: [{ type: 'text', text: JSON.stringify({ daemon_online: true, bindings: [] }) }] })
  assert.deepEqual(await cli.getDaemonStatus(), { online: true, raw: { daemon_online: true, bindings: [] } }, 'daemon_online=true 解析')
  cli._callTool = async () => ({ content: [{ type: 'text', text: JSON.stringify({ daemon_online: false }) }] })
  assert.equal((await cli.getDaemonStatus()).online, false, 'daemon_online=false 解析')
  // tool 级错误（scope 不足——spike 实证旧 token 缺 read 的形态）→ online=null fail-open
  cli._callTool = async () => ({ content: [{ type: 'text', text: "Error executing tool: MCP token lacks required scope 'read'." }], isError: true })
  assert.equal((await cli.getDaemonStatus()).online, null, 'isError → null 不判死')
  // 无 daemon_online 字段（返回形态意外）→ null
  cli._callTool = async () => ({ content: [{ type: 'text', text: JSON.stringify({ other: 1 }) }] })
  assert.equal((await cli.getDaemonStatus()).online, null, '无字段 → null')
  // 未配置 client → null 不发网（cwd 喂干净 tmp——仓自身 local.yaml 现为活配置，进程 cwd 会真发网）
  const cleanDir = mkdtempSync(join(tmpdir(), 'mcpc-clean-'))
  const uncfg = new SillyHubMcpClient({ cwd: cleanDir })
  assert.equal((await uncfg.getDaemonStatus()).online, null, '未配置 → null')
  rmSync(cleanDir, { recursive: true, force: true })
})

test('③ probe daemon 在线层：false 拦 / true 与 null 放（fail-open）', async () => {
  clearProbeCache()
  const mk = (online) => ({
    probeDaemon: async () => true,
    listToolsWithMeta: async () => ({ tools: [{ name: 'dispatch_worker', inputSchema: { properties: { worktree_path: {}, worker_prompt: {} } } }] }),
    getDaemonStatus: async () => ({ online }),
  })
  const off = await probeSillyHub({ client: mk(false), worktreePath: null })
  assert.equal(off.available, false, 'daemon_online=false → unavailable')
  assert.equal(off.reason, 'daemon-offline', 'reason 类型化（区别于 daemon-unreachable）')
  clearProbeCache()
  const on = await probeSillyHub({ client: mk(true), worktreePath: null })
  assert.equal(on.available, true, 'daemon_online=true → 可用')
  assert.equal(on.daemonOnline, true, 'daemonOnline 透传（调用方可区分探明在线/未知）')
  clearProbeCache()
  const unknown = await probeSillyHub({
    client: { probeDaemon: async () => true, listToolsWithMeta: async () => ({ tools: [] }) }, // 无 getDaemonStatus 方法 = 旧 backend
    worktreePath: null,
  })
  assert.equal(unknown.available, true, '无工具（旧 backend）→ fail-open 不判不可用')
  assert.equal(unknown.daemonOnline, null, '未知透传 null')
  clearProbeCache()
})

test('② connect mcp 段成对签发：gateway_url+token 覆盖写；失败降级不覆盖手填段', async () => {
  const realFetch = globalThis.fetch
  const calls = []
  // 三段响应：health / resolve-by-root-path（shpsync_ 换发 + workspace_id）/ mcp-tokens（成对）
  const okJson = (body) => ({ ok: true, status: 201, headers: new Map([['content-type', 'application/json']]), json: async () => body, text: async () => JSON.stringify(body) })
  try {
    // A. 签发成功：陈旧手填 mcp 段（错部署 token）被成对值覆盖修复
    {
      const d = mkdtempSync(join(tmpdir(), 'conn-a-'))
      mkdirSync(join(d, '.sillyspec'), { recursive: true })
      writeFileSync(join(d, '.sillyspec', 'local.yaml'),
        '# 手填陈旧段（spike 实证形态：token 属另一部署且缺 read scope）\nmcp:\n  url: "http://127.0.0.1:8001"\n  token: "shmcp_STALE"\n')
      globalThis.fetch = async (url, init) => {
        calls.push(String(url))
        if (String(url).endsWith('/api/health')) return okJson({ status: 'ok' })
        if (String(url).endsWith('/resolve-by-root-path')) return okJson({ workspace_id: 'ws-1', token: 'shpsync_new' })
        if (String(url).endsWith('/mcp-tokens')) return okJson({ token: 'shmcp_FRESH', gateway_url: 'https://crrcdt.ppdmq.top/mcp/' })
        throw new Error('unexpected ' + url)
      }
      await new SyncManager(d).connect('https://crrcdt.ppdmq.top', 'shk_live_USER', undefined)
      const yaml = readFileSync(join(d, '.sillyspec', 'local.yaml'), 'utf8')
      assert.match(yaml, /url: "https:\/\/crrcdt\.ppdmq\.top\/mcp"/, 'mcp.url = 签发响应的 gateway_url（尾斜杠归一）')
      assert.match(yaml, /token: "shmcp_FRESH"/, 'mcp.token = 成对签发的新 token')
      assert.ok(!yaml.includes('shmcp_STALE'), '陈旧错部署段被覆盖修复（旧口径永不愈合的根因）')
      assert.match(yaml, /platform:[\s\S]*shpsync_new/, 'platform 段换发 token 照旧')
      rmSync(d, { recursive: true, force: true })
    }
    // B. 签发失败（旧 backend 无端点 → 404 → fetchJson null）：手填段保留（R-09）
    {
      const d = mkdtempSync(join(tmpdir(), 'conn-b-'))
      mkdirSync(join(d, '.sillyspec'), { recursive: true })
      writeFileSync(join(d, '.sillyspec', 'local.yaml'), 'mcp:\n  url: "http://x"\n  token: "shmcp_HAND"\n')
      globalThis.fetch = async (url) => {
        if (String(url).endsWith('/api/health')) return okJson({ status: 'ok' })
        if (String(url).endsWith('/resolve-by-root-path')) return okJson({ workspace_id: 'ws-1', token: 'shpsync_new' })
        if (String(url).endsWith('/mcp-tokens')) return { ok: false, status: 404, headers: new Map(), text: async () => 'nf' }
        throw new Error('unexpected ' + url)
      }
      await new SyncManager(d).connect('https://p.example', 'shk_live_USER', undefined)
      const yaml = readFileSync(join(d, '.sillyspec', 'local.yaml'), 'utf8')
      assert.match(yaml, /shmcp_HAND/, '签发失败 → 手填段保留不覆盖（降级旧口径）')
      rmSync(d, { recursive: true, force: true })
    }
    // C. 无 workspace 换发（resolved null）→ 不试签发，缺段按 §7.4 补 url+user token
    {
      const d = mkdtempSync(join(tmpdir(), 'conn-c-'))
      mkdirSync(join(d, '.sillyspec'), { recursive: true })
      writeFileSync(join(d, '.sillyspec', 'local.yaml'), '# empty\n')
      globalThis.fetch = async (url) => {
        if (String(url).endsWith('/api/health')) return okJson({ status: 'ok' })
        if (String(url).endsWith('/resolve-by-root-path')) return { ok: false, status: 404, headers: new Map(), text: async () => 'nf' }
        throw new Error('unexpected ' + url)
      }
      await new SyncManager(d).connect('https://p.example', 'shk_live_USER', undefined)
      const yaml = readFileSync(join(d, '.sillyspec', 'local.yaml'), 'utf8')
      assert.match(yaml, /mcp:[\s\S]*url: "https:\/\/p\.example"/, '无签发 → §7.4 同源假设补段（旧行为）')
      assert.match(yaml, /token: "shk_live_USER"/, 'user 级 token 兜底（旧行为）')
      rmSync(d, { recursive: true, force: true })
    }
  } finally {
    globalThis.fetch = realFetch
    clearProbeCache()
  }
})
