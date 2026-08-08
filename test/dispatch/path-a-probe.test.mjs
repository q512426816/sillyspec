/**
 * task-11 + task-12 跨仓接通单测（sillyspec 仓侧）
 *
 * 覆盖（对照 task-11 / task-12 acceptance + design.md §7.1 / §7.3 / §10 R-04 / §11 D-005/D-006/D-009）：
 *
 * 1. detectPathAFromTools 三分支（task-11）：
 *    - dispatch_worker schema 含 worktree_path + worker_prompt → true
 *    - 缺 worker_prompt / 缺 dispatch_worker / 非 array / null → false（保守 R-04）
 * 2. isPathASupported 缓存 + env fallback（task-11）：
 *    - 默认（未预热 + 无 env）→ false
 *    - setPathAProbeResult(true) → true；clearPathAProbeCache → false
 *    - env SILLYHUB_PATH_A=1 → true（spike-01 备选，优先级高于缓存）
 * 3. probeSillyHub 预热路径A（task-11 集成）：mock client.listTools 三分支驱使 isPathASupported
 * 4. createMission orchestrationMode（task-12）：传 external → args.orchestration_mode；不传 → 无字段（零回归）
 * 5. dispatchWorker branch 透传（task-12，D-009 字段名对齐）
 * 6. probe rootPath best-effort（task-12 #5）：daemon 拿到 + 越界 → worktree-outside-root；拿不到 → 跳过
 *
 * 依赖注入 mock（铁律：不命中真实 daemon/网络/fetch）：
 * - probeSillyHub({client:<mock>})：mock 含 probeDaemon/listTools/getRootPath，计数 + 可控返回
 * - client.js 单测：实例化 SillyHubMcpClient（构造传 url/token 走 _configured=true），monkey-patch
 *   _sendRpc 捕获 method/params 并返 canned result（不经真实 fetch）
 *
 * 用例间清理：clearProbeCache() + clearPathAProbeCache() + 恢复 env（模块级缓存跨用例残留会污染）
 *
 * 风格：自定义 runner（console.log + assertTrue），失败 process.exit(1)，末尾汇总。
 * 被 run-tests.mjs 递归发现（test/dispatch/ 子目录）。
 */
import { probeSillyHub, clearProbeCache, detectPathAFromTools } from '../../src/dispatch/probe.js'
import { SillyHubMcpClient } from '../../src/sillyhub-mcp/client.js'
import {
  isPathASupported,
  setPathAProbeResult,
  clearPathAProbeCache,
} from '../../src/dispatch/backends/sillyhub-mcp.js'

let passed = 0
let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) {
    passed++
    console.log(`  ✅ PASS: ${msg}`)
    return
  }
  failed++
  failures.push(msg)
  console.log(`  ❌ FAIL: ${msg}`)
}

// ── env 管理 ──
const ORIG_URL = process.env.SILLYHUB_MCP_URL
const ORIG_TOKEN = process.env.SILLYHUB_MCP_TOKEN
const ORIG_PATH_A = process.env.SILLYHUB_PATH_A
function setEnv(url, token, pathA) {
  if (url === undefined) delete process.env.SILLYHUB_MCP_URL
  else process.env.SILLYHUB_MCP_URL = url
  if (token === undefined) delete process.env.SILLYHUB_MCP_TOKEN
  else process.env.SILLYHUB_MCP_TOKEN = token
  if (pathA === undefined) delete process.env.SILLYHUB_PATH_A
  else process.env.SILLYHUB_PATH_A = pathA
}
function restoreEnv() {
  setEnv(ORIG_URL, ORIG_TOKEN, ORIG_PATH_A)
}

// ── mock client 工厂（probe.js 注入用）：probeDaemon + listTools + 可选 getRootPath，全计数 ──
function makeMockClient({ reachable = true, tools = null, rootPath = null, listToolsThrows = false } = {}) {
  const state = { probeCalls: 0, listToolsCalls: 0, getRootPathCalls: 0 }
  return {
    probeDaemon: async () => {
      state.probeCalls++
      return reachable
    },
    listTools: listToolsThrows
      ? async () => { state.listToolsCalls++; throw new Error('mock tools/list 网络故障') }
      : async () => { state.listToolsCalls++; return tools },
    getRootPath: async () => { state.getRootPathCalls++; return rootPath },
    getCalls: () => state,
  }
}

try {
  // ===== 用例 1：detectPathAFromTools 三分支（task-11 纯函数）=====
  console.log('=== 1. detectPathAFromTools 三分支（task-11，R-04 保守）===\n')

  // 1a 含 worktree_path + worker_prompt → true
  console.log('--- 1a. dispatch_worker schema 全命中 → true ---')
  {
    const tools = [
      { name: 'list_agent_profiles', inputSchema: { properties: {} } },
      {
        name: 'dispatch_worker',
        inputSchema: {
          properties: {
            mission_id: { type: 'string' },
            worktree_path: { type: 'string' },   // 路径A 标志 ①
            branch: { type: 'string' },
            worker_prompt: { type: 'string' },    // 路径A 标志 ②
          },
        },
      },
    ]
    assertTrue(detectPathAFromTools(tools) === true, 'schema 含 worktree_path + worker_prompt → true')
  }

  // 1b 缺 worker_prompt → false
  console.log('\n--- 1b. 缺 worker_prompt → false ---')
  {
    const tools = [
      {
        name: 'dispatch_worker',
        inputSchema: {
          properties: { mission_id: {}, worktree_path: {}, branch: {} }, // 无 worker_prompt
        },
      },
    ]
    assertTrue(detectPathAFromTools(tools) === false, '缺 worker_prompt → false（任一缺失即 false）')
  }

  // 1c 缺 worktree_path → false
  console.log('\n--- 1c. 缺 worktree_path → false ---')
  {
    const tools = [
      {
        name: 'dispatch_worker',
        inputSchema: { properties: { mission_id: {}, worker_prompt: {} } },
      },
    ]
    assertTrue(detectPathAFromTools(tools) === false, '缺 worktree_path → false')
  }

  // 1d 无 dispatch_worker → false
  console.log('\n--- 1d. 无 dispatch_worker tool → false ---')
  {
    const tools = [{ name: 'list_agent_profiles' }, { name: 'create_mission' }]
    assertTrue(detectPathAFromTools(tools) === false, '无 dispatch_worker → false')
  }

  // 1e dispatch_worker 无 inputSchema / 无 properties → false
  console.log('\n--- 1e. dispatch_worker 无 inputSchema.properties → false ---')
  assertTrue(detectPathAFromTools([{ name: 'dispatch_worker' }]) === false, '无 inputSchema → false')
  assertTrue(
    detectPathAFromTools([{ name: 'dispatch_worker', inputSchema: {} }]) === false,
    'inputSchema 无 properties → false'
  )

  // 1f 非数组 / null / undefined → false（异常输入保守）
  console.log('\n--- 1f. 非数组 / null / undefined → false（异常输入保守）---')
  assertTrue(detectPathAFromTools(null) === false, 'null → false')
  assertTrue(detectPathAFromTools(undefined) === false, 'undefined → false')
  assertTrue(detectPathAFromTools('not array') === false, '字符串 → false')
  assertTrue(detectPathAFromTools([]) === false, '空数组 → false（无 dispatch_worker）')

  // ===== 用例 2：isPathASupported 缓存 + env fallback（task-11）=====
  console.log('\n=== 2. isPathASupported 缓存 + env fallback（task-11，spike-01 二选一）===\n')

  // 2a 默认（未预热 + 无 env）→ false
  console.log('--- 2a. 默认未预热 + 无 env → false ---')
  clearPathAProbeCache()
  setEnv(undefined, undefined, undefined)
  assertTrue(isPathASupported() === false, '默认（未预热）→ false（保守 R-04）')

  // 2b setPathAProbeResult(true) → true；clearPathAProbeCache → false
  console.log('\n--- 2b. setPathAProbeResult(true) → true；clear → false ---')
  clearPathAProbeCache()
  setPathAProbeResult(true)
  assertTrue(isPathASupported() === true, '预热 true → isPathASupported true')
  clearPathAProbeCache()
  assertTrue(isPathASupported() === false, 'clearPathAProbeCache 后 → false')

  // 2c setPathAProbeResult(false) 显式 → false
  console.log('\n--- 2c. setPathAProbeResult(false) 显式 → false ---')
  clearPathAProbeCache()
  setPathAProbeResult(false)
  assertTrue(isPathASupported() === false, '预热 false → false（schema 缺字段保守）')

  // 2d env SILLYHUB_PATH_A=1 → true（spike-01 备选，缓存 false 也覆盖）
  console.log('\n--- 2d. env SILLYHUB_PATH_A=1 → true（spike-01 备选，优先级高于缓存）---')
  clearPathAProbeCache()
  setPathAProbeResult(false) // 探测说 false
  setEnv(undefined, undefined, '1') // env 强制开
  assertTrue(
    isPathASupported() === true,
    'env SILLYHUB_PATH_A=1 覆盖缓存 false → true（spike-01 备选）'
  )

  // 2e env 非 '1'（如 '0' / ''）→ 不触发，读缓存
  console.log('\n--- 2e. env SILLYHUB_PATH_A 非 "1" → 不触发 env 分支，读缓存 ---')
  clearPathAProbeCache()
  setPathAProbeResult(false)
  setEnv(undefined, undefined, '0')
  assertTrue(isPathASupported() === false, 'env="0" 不触发 → 读缓存 false')
  clearPathAProbeCache()
  setPathAProbeResult(true)
  setEnv(undefined, undefined, '')
  assertTrue(isPathASupported() === true, 'env="" 不触发 → 读缓存 true')
  setEnv(undefined, undefined, undefined) // 清 env

  // ===== 用例 3：probeSillyHub 预热路径A（task-11 集成）=====
  console.log('\n=== 3. probeSillyHub 预热路径A（task-11，daemon 可达后 best-effort 探测）===\n')

  // 3a listTools 返回含字段 schema → available=true + isPathASupported()=true
  console.log('--- 3a. listTools 返回含字段 schema → available=true + isPathASupported true ---')
  clearProbeCache()
  clearPathAProbeCache()
  setEnv('http://hub.test', 'tok', undefined)
  {
    const tools = [
      {
        name: 'dispatch_worker',
        inputSchema: { properties: { worktree_path: {}, worker_prompt: {} } },
      },
    ]
    const c = makeMockClient({ reachable: true, tools })
    const r = await probeSillyHub({ client: c })
    assertTrue(r.available === true, `available=true（实际 ${r.available}）`)
    assertTrue(
      isPathASupported() === true,
      '预热后 isPathASupported=true（dispatch_worker schema 全命中）'
    )
    assertTrue(c.getCalls().listToolsCalls === 1, `listTools 调用 1 次（实际 ${c.getCalls().listToolsCalls}）`)
  }

  // 3b listTools 返回缺字段 schema → available=true + isPathASupported()=false
  console.log('\n--- 3b. listTools 返回缺字段 schema → available=true + isPathASupported false ---')
  clearProbeCache()
  clearPathAProbeCache()
  {
    const tools = [
      { name: 'dispatch_worker', inputSchema: { properties: { worktree_path: {} } } }, // 缺 worker_prompt
    ]
    const c = makeMockClient({ reachable: true, tools })
    const r = await probeSillyHub({ client: c })
    assertTrue(r.available === true, `available=true（探测不影响 availability，实际 ${r.available}）`)
    assertTrue(
      isPathASupported() === false,
      '预热后 isPathASupported=false（schema 缺 worker_prompt，R-04 保守）'
    )
  }

  // 3c listTools 抛异常 → available=true + isPathASupported()=false（best-effort 不阻断）
  console.log('\n--- 3c. listTools 抛异常 → available=true + isPathASupported false（best-effort）---')
  clearProbeCache()
  clearPathAProbeCache()
  {
    const c = makeMockClient({ reachable: true, listToolsThrows: true })
    const r = await probeSillyHub({ client: c })
    assertTrue(r.available === true, `listTools 异常不影响 available（仍 true，实际 ${r.available}）`)
    assertTrue(
      isPathASupported() === false,
      'listTools 异常 → isPathASupported false（保守，不抛穿 probe）'
    )
  }

  // 3d 旧 mock（无 listTools 方法）→ 预热跳过，isPathASupported 保持调用前状态（向后兼容）
  console.log('\n--- 3d. mock 无 listTools → 预热跳过（向后兼容 strategy.test.mjs 旧 mock）---')
  clearProbeCache()
  clearPathAProbeCache()
  {
    const c = {
      probeDaemon: async () => true, // 旧 mock 只有 probeDaemon
    }
    const r = await probeSillyHub({ client: c })
    assertTrue(r.available === true, `旧 mock available=true（实际 ${r.available}）`)
    assertTrue(isPathASupported() === false, '无 listTools → 不预热 → 默认 false')
  }

  // ===== 用例 4：createMission orchestrationMode（task-12，FR-08 / D-007）=====
  console.log('\n=== 4. createMission orchestrationMode（task-12，external 跳 orchestrator spawn）===\n')

  // 4a 传 orchestrationMode='external' → args.orchestration_mode='external'
  console.log('--- 4a. 传 orchestrationMode="external" → args.orchestration_mode=external ---')
  {
    const cli = new SillyHubMcpClient({ url: 'http://hub.test', token: 'tok' })
    const calls = []
    cli._sendRpc = async (method, params) => { calls.push({ method, params }); return null }
    await cli.createMission({ objective: 'obj', changeId: 'chg-1', orchestrationMode: 'external' })
    assertTrue(calls.length === 1, `createMission 调 _sendRpc 1 次（实际 ${calls.length}）`)
    assertTrue(calls[0].method === 'tools/call', `method=tools/call（实际 ${calls[0].method}）`)
    assertTrue(calls[0].params.name === 'create_mission', `tool name=create_mission`)
    const args = calls[0].params.arguments
    assertTrue(args.orchestration_mode === 'external', `args.orchestration_mode='external'（实际 ${args.orchestration_mode}）`)
    assertTrue(args.change_id === 'chg-1', 'args.change_id 透传')
    assertTrue(args.objective === 'obj', 'args.objective 透传')
  }

  // 4b 不传 orchestrationMode → 无 orchestration_mode 字段（team 零回归，FR-05）
  console.log('\n--- 4b. 不传 orchestrationMode → 无 orchestration_mode 字段（team 零回归）---')
  {
    const cli = new SillyHubMcpClient({ url: 'http://hub.test', token: 'tok' })
    const calls = []
    cli._sendRpc = async (method, params) => { calls.push({ method, params }); return null }
    await cli.createMission({ objective: 'obj', changeId: 'chg-2' })
    const args = calls[0].params.arguments
    assertTrue(
      args.orchestration_mode === undefined,
      '不传 orchestrationMode → 无 orchestration_mode 字段（team 默认零回归）'
    )
    assertTrue(!('orchestration_mode' in args), 'args 中不存在 orchestration_mode 键')
  }

  // 4c orchestrationMode=null → 不加字段（与 undefined 同效，零回归）
  console.log('\n--- 4c. orchestrationMode=null → 不加字段（与 undefined 同效）---')
  {
    const cli = new SillyHubMcpClient({ url: 'http://hub.test', token: 'tok' })
    const calls = []
    cli._sendRpc = async (method, params) => { calls.push({ method, params }); return null }
    await cli.createMission({ objective: 'obj', changeId: 'chg-3', orchestrationMode: null })
    const args = calls[0].params.arguments
    assertTrue(!('orchestration_mode' in args), 'orchestrationMode=null → 不加字段')
  }

  // ===== 用例 5：dispatchWorker branch 透传（task-12，D-009 字段名对齐）=====
  console.log('\n=== 5. dispatchWorker branch 透传（task-12，D-009 字段名 branch）===\n')

  // 5a 传 branch + worktreePath + workerPrompt → args 全透传（snake_case，字段名 branch 非 worktree_branch）
  console.log('--- 5a. 传 branch + worktreePath + workerPrompt → args 全 snake_case 透传 ---')
  {
    const cli = new SillyHubMcpClient({ url: 'http://hub.test', token: 'tok' })
    const calls = []
    cli._sendRpc = async (method, params) => { calls.push({ method, params }); return null }
    await cli.dispatchWorker({
      missionId: 'm1',
      objective: 'do work',
      worktreePath: 'C:/wt/x',
      branch: 'sillyspec/chg',
      workerPrompt: '不许 commit',
    })
    assertTrue(calls[0].params.name === 'dispatch_worker', 'tool name=dispatch_worker')
    const args = calls[0].params.arguments
    assertTrue(args.branch === 'sillyspec/chg', `args.branch 透传（D-009，实际 ${args.branch}）`)
    assertTrue(!('worktree_branch' in args), '字段名是 branch（非 round-1 漂移的 worktree_branch）')
    assertTrue(args.worktree_path === 'C:/wt/x', 'args.worktree_path 透传')
    assertTrue(args.worker_prompt === '不许 commit', 'args.worker_prompt 透传')
    assertTrue(args.mission_id === 'm1', 'args.mission_id 透传')
  }

  // 5b 不传 branch → 无 branch 字段（默认 None，daemon 走原自建逻辑零回归）
  console.log('\n--- 5b. 不传 branch → 无 branch 字段（零回归）---')
  {
    const cli = new SillyHubMcpClient({ url: 'http://hub.test', token: 'tok' })
    const calls = []
    cli._sendRpc = async (method, params) => { calls.push({ method, params }); return null }
    await cli.dispatchWorker({ missionId: 'm1', objective: 'do work' })
    const args = calls[0].params.arguments
    assertTrue(!('branch' in args), '不传 branch → 无 branch 字段（默认 None 走原逻辑）')
    assertTrue(!('worktree_path' in args), '不传 worktreePath → 无 worktree_path 字段')
  }

  // ===== 用例 6：probe rootPath best-effort（task-12 #5）=====
  console.log('\n=== 6. probe rootPath best-effort（task-12 #5，越界校验生效）===\n')

  // 6a daemon 拿到 rootPath（getRootPath）+ worktree 越界 → worktree-outside-root
  console.log('--- 6a. daemon getRootPath 返回 + worktree 越界 → worktree-outside-root ---')
  clearProbeCache()
  clearPathAProbeCache()
  setEnv('http://hub.test', 'tok', undefined)
  {
    const c = makeMockClient({
      reachable: true,
      tools: [],
      rootPath: 'C:/repo', // daemon 暴露的 root
    })
    const r = await probeSillyHub({ client: c, worktreePath: 'D:/elsewhere/wt' }) // 跨盘越界
    assertTrue(r.available === false, `越界 available=false（实际 ${r.available}）`)
    assertTrue(
      r.reason === 'worktree-outside-root',
      `reason=worktree-outside-root（实际 ${r.reason}）`
    )
    assertTrue(c.getCalls().getRootPathCalls === 1, `getRootPath 调用 1 次（实际 ${c.getCalls().getRootPathCalls}）`)
  }

  // 6b daemon getRootPath 返回 rootPath + worktree 在内 → available=true
  console.log('\n--- 6b. worktree 在 root 内 → available=true ---')
  clearProbeCache()
  {
    const c = makeMockClient({ reachable: true, tools: [], rootPath: 'C:/repo' })
    const r = await probeSillyHub({ client: c, worktreePath: 'C:/repo/sub/wt' })
    assertTrue(r.available === true, `worktree 在内 available=true（实际 ${r.available}）`)
  }

  // 6c daemon 未暴露 rootPath（getRootPath=null）→ 跳过越界校验，available=true（best-effort）
  console.log('\n--- 6c. daemon 未暴露 rootPath（null）→ 跳过越界校验不阻断（best-effort）---')
  clearProbeCache()
  {
    const c = makeMockClient({ reachable: true, tools: [], rootPath: null })
    const r = await probeSillyHub({ client: c, worktreePath: 'D:/elsewhere/wt' })
    assertTrue(
      r.available === true,
      `rootPath 拿不到 → 不判 unavailable 仍 available=true（实际 ${r.available}，best-effort）`
    )
    assertTrue(c.getCalls().getRootPathCalls === 1, 'getRootPath 仍 best-effort 调用 1 次')
  }

  // 6d 调用方显式传 rootPath → 不调 getRootPath，用传入值校验
  console.log('\n--- 6d. 显式传 rootPath → 不调 getRootPath，用传入值校验 ---')
  clearProbeCache()
  {
    const c = makeMockClient({ reachable: true, tools: [], rootPath: 'C:/should-not-use' })
    const r = await probeSillyHub({
      client: c,
      worktreePath: 'D:/elsewhere/wt',
      rootPath: 'C:/explicit-root',
    })
    assertTrue(r.available === false, `显式 rootPath 越界 available=false（实际 ${r.available}）`)
    assertTrue(r.reason === 'worktree-outside-root', `reason=worktree-outside-root（实际 ${r.reason}）`)
    assertTrue(
      c.getCalls().getRootPathCalls === 0,
      `显式传 rootPath → 不调 getRootPath（实际 ${c.getCalls().getRootPathCalls} 次）`
    )
  }

  // 6e 无 worktreePath → 不调 getRootPath（无谓越界判定）
  console.log('\n--- 6e. 无 worktreePath → 不调 getRootPath（无谓越界判定）---')
  clearProbeCache()
  {
    const c = makeMockClient({ reachable: true, tools: [], rootPath: 'C:/repo' })
    const r = await probeSillyHub({ client: c }) // 无 worktreePath
    assertTrue(r.available === true, `无 worktreePath available=true（实际 ${r.available}）`)
    assertTrue(
      c.getCalls().getRootPathCalls === 0,
      `无 worktreePath → 不调 getRootPath（实际 ${c.getCalls().getRootPathCalls}）`
    )
  }
} finally {
  restoreEnv()
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) {
  console.log('失败项:')
  failures.forEach((f) => console.log(`  - ${f}`))
}
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
