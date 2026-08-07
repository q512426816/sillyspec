/**
 * dispatch 派发策略单测（task-08）
 *
 * 覆盖（对照 task-08 acceptance + design.md §Phase4）：
 * 1. probeSillyHub 三分支：no-config（不发网络）/ daemon-up（available=true）/ daemon-down（daemon-unreachable）
 * 2. 负面缓存命中（daemon-unreachable TTL 缓存）：clearProbeCache 前计数不增，之后重探
 * 3. renderDispatchInstruction 两分支：probe.available 驱动 backend=sillyhub|local
 * 4. 路径 A stub 降级：isPathASupported() 恒 false → sillyhub 指令含降级提示 + Local 兜底全文
 * 5. kill lease 防双写约定
 *
 * 依赖注入 mock（铁律：不命中真实 daemon/网络/fetch）：
 * - probeSillyHub({client: <mock>})：传含 probeDaemon 方法的 mock client，计数验证调用次数
 * - no-config 分支 probeDaemon 调用次数=0（同步快速路径不发网络）
 * - 不实例化真实 SillyHubMcpClient（probe.js 仅在 env 齐全 + 缺 client 时 new，本测试都传 mock）
 * - renderDispatchInstruction(contract, mockProbe)：直接传 mock probe {available:true/false}
 *
 * 用例间清理：clearProbeCache()（模块级 Map 跨用例残留会污染）+ 恢复 env
 *
 * 风格：自定义 runner（console.log + assertTrue），失败 process.exit(1)，末尾汇总。
 * 被 run-tests.mjs 递归发现（test/dispatch/ 子目录）。
 */
import { probeSillyHub, clearProbeCache, DEFAULT_PROBE_TTL_MS } from '../../src/dispatch/probe.js'
import { renderDispatchInstruction } from '../../src/dispatch/strategy.js'
import {
  isPathASupported,
  PATH_A_DOWNGRADE_REASON,
} from '../../src/dispatch/backends/sillyhub-mcp.js'
import { renderLocalInstruction } from '../../src/dispatch/backends/local-agent.js'

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

// 派发契约样例（task-08 提供）
const contract = {
  brief: 'test task',
  worktreePath: 'C:/wt',
  branch: 'sillyspec/x',
  allowedPaths: ['src/x.js'],
  readOnly: false,
  runId: 'run-test-1',
}

// ── env 管理：子进程独立，但用例间需显式状态；末尾恢复 ORIG（避免污染同进程后续逻辑）──
const ORIG_URL = process.env.SILLYHUB_MCP_URL
const ORIG_TOKEN = process.env.SILLYHUB_MCP_TOKEN
function setEnv(url, token) {
  if (url === undefined) delete process.env.SILLYHUB_MCP_URL
  else process.env.SILLYHUB_MCP_URL = url
  if (token === undefined) delete process.env.SILLYHUB_MCP_TOKEN
  else process.env.SILLYHUB_MCP_TOKEN = token
}
function restoreEnv() {
  setEnv(ORIG_URL, ORIG_TOKEN)
}

// ── mock client 工厂：probeDaemon 计数 + 可控返回值（依赖注入，不发网络）──
function makeMockClient(returns) {
  const state = { calls: 0 }
  return {
    probeDaemon: async () => {
      state.calls++
      return returns
    },
    getCalls: () => state.calls,
  }
}

try {
  // ===== 用例 1：probe 三分支 =====
  console.log('=== 1. probe 三分支（no-config / daemon-up / daemon-down）===\n')

  // 1a 无 env → no-config，不发网络（probeDaemon 计数=0）
  console.log('--- 1a. 无 env → no-config，不发网络 ---')
  clearProbeCache()
  setEnv(undefined, undefined)
  {
    const c = makeMockClient(true) // 即便 mock 返回 true，no-config 路径也不该调到
    const r = await probeSillyHub({ client: c })
    assertTrue(r.available === false, `no-config: available=false（实际 ${r.available}）`)
    assertTrue(r.reason === 'no-config', `no-config: reason='no-config'（实际 ${r.reason}）`)
    assertTrue(
      c.getCalls() === 0,
      `no-config: probeDaemon 调用 0 次（实际 ${c.getCalls()}，确认不发网络）`
    )
  }

  // 1b env 齐全 + daemon 可达 → available=true（不缓存正面结果）
  console.log('\n--- 1b. env 齐全 + daemon 可达 → available=true ---')
  clearProbeCache()
  setEnv('http://hub.test', 'tok')
  {
    const c = makeMockClient(true)
    const r = await probeSillyHub({ client: c })
    assertTrue(r.available === true, `daemon-up: available=true（实际 ${r.available}）`)
    assertTrue(r.reason === undefined, `daemon-up: 无 reason 字段（实际 ${r.reason}）`)
    assertTrue(c.getCalls() === 1, `daemon-up: probeDaemon 调用 1 次（实际 ${c.getCalls()}）`)
  }

  // 1c env 齐全 + daemon 不可达 → daemon-unreachable
  console.log('\n--- 1c. env 齐全 + daemon 不可达 → daemon-unreachable ---')
  clearProbeCache()
  setEnv('http://hub.test', 'tok')
  {
    const c = makeMockClient(false)
    const r = await probeSillyHub({ client: c })
    assertTrue(r.available === false, `daemon-down: available=false（实际 ${r.available}）`)
    assertTrue(
      r.reason === 'daemon-unreachable',
      `daemon-down: reason='daemon-unreachable'（实际 ${r.reason}）`
    )
  }

  // ===== 用例 2：负面缓存命中 =====
  console.log('\n=== 2. 负面缓存命中（daemon-unreachable TTL 缓存，R-06）===\n')
  clearProbeCache()
  setEnv('http://hub.test', 'tok')
  {
    const c = makeMockClient(false)

    const r1 = await probeSillyHub({ client: c })
    assertTrue(c.getCalls() === 1, `首次探测 probeDaemon 调用 1 次（实际 ${c.getCalls()}）`)
    assertTrue(
      r1.reason === 'daemon-unreachable',
      `首次结果 daemon-unreachable（实际 ${r1.reason}）`
    )

    // 同 fp（URL）下再调，命中缓存 → probeDaemon 计数不增
    const r2 = await probeSillyHub({ client: c })
    assertTrue(
      c.getCalls() === 1,
      `命中缓存 probeDaemon 计数不增仍 1（实际 ${c.getCalls()}）`
    )
    assertTrue(
      r2.reason === 'daemon-unreachable',
      `缓存命中返回 daemon-unreachable（实际 ${r2.reason}）`
    )

    // clearProbeCache 后再调 → 重探，计数 +1
    clearProbeCache()
    const r3 = await probeSillyHub({ client: c })
    assertTrue(
      c.getCalls() === 2,
      `clearProbeCache 后重探计数 +1=2（实际 ${c.getCalls()}）`
    )
    assertTrue(
      r3.reason === 'daemon-unreachable',
      `重探仍 daemon-unreachable（实际 ${r3.reason}）`
    )
  }

  // ===== 用例 3：strategy 两分支（backend 由 probe.available 驱动）=====
  console.log('\n=== 3. renderDispatchInstruction 两分支（backend 由 probe.available 驱动）===\n')

  // 3a available=true → backend=sillyhub，指令含 MCP tool 关键词
  console.log('--- 3a. probe.available=true → backend=sillyhub ---')
  {
    const { instruction, backend } = renderDispatchInstruction(contract, { available: true })
    assertTrue(backend === 'sillyhub', `backend=sillyhub（实际 ${backend}）`)
    assertTrue(instruction.includes('create_mission'), 'sillyhub 指令含 create_mission（一 Wave 一 mission）')
    assertTrue(instruction.includes('dispatch_worker'), 'sillyhub 指令含 dispatch_worker（派 worker）')
    assertTrue(instruction.includes('list_workers'), 'sillyhub 指令含 list_workers（终态轮询）')
    assertTrue(instruction.includes('mission_id'), 'sillyhub 指令含 mission_id（关联 mission）')
    assertTrue(instruction.includes('kill lease'), 'sillyhub 指令含 kill lease（超时回收）')
    assertTrue(
      instruction.includes('test task') || instruction.includes('sillyspec/x'),
      'sillyhub 指令含 contract 字段（brief/branch 注入）'
    )
  }

  // 3b available=false → backend=local，逐字相等 renderLocalInstruction（零回归核心断言）
  console.log('\n--- 3b. probe.available=false → backend=local，逐字相等 renderLocalInstruction ---')
  {
    const { instruction, backend } = renderDispatchInstruction(contract, { available: false })
    const expected = renderLocalInstruction(contract)
    assertTrue(backend === 'local', `backend=local（实际 ${backend}）`)
    assertTrue(
      instruction === expected,
      'local 分支 instruction === renderLocalInstruction（逐字相等，零回归核心断言）'
    )
  }

  // 3c probe=null/undefined/{} → local（零回归兜底）
  console.log('\n--- 3c. probe=null/undefined/{} → local（零回归兜底）---')
  {
    assertTrue(
      renderDispatchInstruction(contract, null).backend === 'local',
      'probe=null → backend=local'
    )
    assertTrue(
      renderDispatchInstruction(contract, undefined).backend === 'local',
      'probe=undefined → backend=local'
    )
    assertTrue(
      renderDispatchInstruction(contract, {}).backend === 'local',
      'probe={}（缺 available）→ backend=local'
    )
  }

  // ===== 用例 4：路径 A stub 降级 =====
  console.log('\n=== 4. 路径 A stub 降级（isPathASupported 恒 false，D-003@v2）===\n')
  {
    assertTrue(isPathASupported() === false, 'isPathASupported() stub 当前恒 false')
    const { instruction, backend } = renderDispatchInstruction(contract, { available: true })
    assertTrue(
      backend === 'sillyhub',
      'pathA 降级不改 backend 标签（仍 sillyhub，由 probe 驱动）'
    )
    assertTrue(
      instruction.includes(PATH_A_DOWNGRADE_REASON),
      'sillyhub 指令含 PATH_A_DOWNGRADE_REASON 降级提示文本'
    )
    assertTrue(
      instruction.includes(renderLocalInstruction(contract)),
      'sillyhub 指令含 Local 兜底指令全文（per-worker 回退 Local）'
    )
    assertTrue(
      instruction.includes('per-worker'),
      'sillyhub 指令含 per-worker 回退引导（不硬试 MCP）'
    )
  }

  // ===== 用例 5：kill lease 防双写约定 =====
  console.log('\n=== 5. kill lease 防双写约定（UB-6）===\n')
  {
    const { instruction } = renderDispatchInstruction(contract, { available: true })
    assertTrue(instruction.includes('kill lease'), '含 kill lease 约定')
    assertTrue(instruction.includes('防双写'), '含 防双写 约定')
    assertTrue(
      instruction.includes('kill: true'),
      '含 kill: true marker（report_progress 终止 lease 防双写）'
    )
    assertTrue(
      instruction.includes('fallback Local'),
      '含 fallback Local 重派约定（超时 kill 后回退本机 Agent tool）'
    )
  }

  // ===== 用例 6：常量导出冒烟（防导出名漂移）=====
  console.log('\n=== 6. 常量导出冒烟（防导出名漂移）===\n')
  {
    assertTrue(
      typeof DEFAULT_PROBE_TTL_MS === 'number' && DEFAULT_PROBE_TTL_MS > 0,
      `DEFAULT_PROBE_TTL_MS 为正数（实际 ${DEFAULT_PROBE_TTL_MS}）`
    )
    assertTrue(
      typeof PATH_A_DOWNGRADE_REASON === 'string' && PATH_A_DOWNGRADE_REASON.length > 0,
      'PATH_A_DOWNGRADE_REASON 非空字符串（可被 includes 检测）'
    )
    assertTrue(
      typeof clearProbeCache === 'function',
      'clearProbeCache 为函数（测试隔离用）'
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
