/**
 * execute 派发集成测试 — task-09（依赖 task-07 已落地）
 *
 * 覆盖 buildWavePrompt 三条派发路径（Local 零回归 / SillyHub / local-fallback），
 * 验证 D-005（零回归）/ D-006（路径A stub）/ D-007（dispatcher 抽象层）/ D-008（一 Wave 一 mission）
 * 接入。纯 buildWavePrompt 字符串断言，不调真实 daemon / MCP / 网络。
 *
 * 派发模板链架构（零网络保证）：execute.js → strategy.js → backends/{local-agent,sillyhub-mcp}.js
 * 全是模板生成器，**不 import sillyhub-mcp/client.js**（client 才连 daemon/HTTP）。本测试也不
 * 调 fetch / MCP tool，只断言 prompt 文本。
 *
 * env 策略：用 options.dispatchMode 覆盖测 SillyHub / local-fallback（避免设/清 env 污染套件）；
 * Local 零回归用例前 delete SILLYHUB_MCP_URL/TOKEN + 用例后恢复，验证 getDispatchMode() 同步判定
 * （无 env → 'local'，零回归关键）。
 */
import { buildWavePrompt, getDispatchMode } from '../../src/stages/execute.js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

let failed = 0
let passed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function assertContains(haystack, needle, msg) {
  assertTrue(typeof haystack === 'string' && haystack.includes(needle), msg)
}
function assertNotContains(haystack, needle, msg) {
  assertTrue(typeof haystack === 'string' && !haystack.includes(needle), msg)
}

// wave 样例（单 task 单 Wave，够触发 buildWavePrompt 全分支）
const wave = { index: 1, tasks: [{ index: 1, name: 'task-01: 示例', file: 'src/x.js' }] }
const worktreePath = 'C:/wt/dispatch-test'

// env 隔离工具：进入前清 SILLYHUB_MCP_URL/TOKEN，返回恢复函数（保留原值或还原为 absent）
function withoutSillyHubEnv() {
  const saved = {
    url: process.env.SILLYHUB_MCP_URL,
    token: process.env.SILLYHUB_MCP_TOKEN,
  }
  delete process.env.SILLYHUB_MCP_URL
  delete process.env.SILLYHUB_MCP_TOKEN
  return () => {
    if (saved.url === undefined) delete process.env.SILLYHUB_MCP_URL
    else process.env.SILLYHUB_MCP_URL = saved.url
    if (saved.token === undefined) delete process.env.SILLYHUB_MCP_TOKEN
    else process.env.SILLYHUB_MCP_TOKEN = saved.token
  }
}

console.log('=== execute 派发集成测试（task-09）===\n')

// ── 1. Local 零回归（无 env，不传 dispatchMode）──
// 验证 D-005：无 MCP 配置时 buildWavePrompt 输出与改前一致，dispatchSection 为空
console.log('--- 1. Local 零回归（无 MCP 配置，getDispatchMode 同步判定）---')
{
  const restore = withoutSillyHubEnv()
  assertTrue(getDispatchMode() === 'local', "getDispatchMode() 无 env 同步返回 'local'")
  const out = buildWavePrompt(wave, 1, null, worktreePath)
  // 含现有结构关键词（先读源确认确切字符串）
  assertContains(out, '## 执行方式（必须严格遵守）', 'Local 输出含现有「执行方式」段')
  assertContains(out, '### 工作目录（必须严格遵守）', 'Local 输出含「工作目录」段（worktreePath 非空）')
  assertContains(out, '### Task Review Gate（必须执行，不可跳过）', 'Local 输出含 Task Review Gate')
  assertContains(out, '## Wave 1: 执行以下任务', 'Local 输出含 Wave 标题')
  // 零回归核心：dispatchSection=''，不含任何派发段
  assertNotContains(out, '派发后端：SillyHub', 'Local 输出不含 SillyHub 派发段（零回归核心）')
  assertNotContains(out, '派发后端提示：SillyHub', 'Local 输出不含 local-fallback 提示段（零回归核心）')
  assertNotContains(out, 'create_mission', 'Local 输出不含 create_mission 指令')
  assertNotContains(out, 'dispatch_worker', 'Local 输出不含 dispatch_worker 指令')
  assertNotContains(out, 'list_workers', 'Local 输出不含 list_workers 指令')
  restore()
}

// ── 2. SillyHub 路径（options.dispatchMode='sillyhub'，覆盖 getDispatchMode）──
// 验证 D-006/D-007：路径A 探测可用时注入完整 SillyHub 派发指令
console.log('\n--- 2. SillyHub 路径（dispatchMode=sillyhub，options 覆盖）---')
{
  const restore = withoutSillyHubEnv()
  const out = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'sillyhub' })
  // execute.js 外层拼的段标题
  assertContains(out, '### 派发后端：SillyHub MCP（探测可用，一 Wave 一 mission）',
    'SillyHub 输出含外层派发段标题')
  // renderSillyHubInstruction 注入的 MCP tool 指令
  assertContains(out, 'create_mission', 'SillyHub 输出含 create_mission 指令')
  assertContains(out, 'dispatch_worker', 'SillyHub 输出含 dispatch_worker 指令')
  assertContains(out, 'list_workers', 'SillyHub 输出含 list_workers 轮询指令')
  assertContains(out, 'kill lease', 'SillyHub 输出含 kill lease 防双写（UB-6）')
  assertContains(out, 'worktree_path', 'SillyHub 输出含 dispatch_worker 的 worktree_path 参数（路径A）')
  assertContains(out, worktreePath, 'SillyHub 输出把 contract.worktreePath 注入派发指令（非占位符）')
  // worktreePath 守卫：为空时即使 dispatchMode=sillyhub 也不注入（无 worktree 无谓派发）
  const noWt = buildWavePrompt(wave, 1, null, null, { dispatchMode: 'sillyhub' })
  assertNotContains(noWt, '派发后端：SillyHub', 'worktreePath 为空时 sillyhub 也不注入派发段（守卫生效）')
  restore()
}

// ── 3. local-fallback 路径（options.dispatchMode='local-fallback'）──
// 验证 D-006 stub：有 MCP 配置但路径A 未落地（isPathASupported()=false）→ 短提示，派发仍走 Local
console.log('\n--- 3. local-fallback 路径（dispatchMode=local-fallback，短提示）---')
{
  const restore = withoutSillyHubEnv()
  const out = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'local-fallback' })
  // 短提示文案
  assertContains(out, '路径A 未落地', 'local-fallback 输出含「路径A 未落地」短提示')
  assertContains(out, '派发后端提示', 'local-fallback 输出含「派发后端提示」段（区分完整 SillyHub 指令）')
  assertContains(out, '本次派发走 Local', 'local-fallback 输出声明派发走 Local（与默认一致）')
  // 只短提示，非完整 SillyHub 指令
  assertNotContains(out, 'create_mission', 'local-fallback 输出不含 create_mission（非完整 SillyHub 指令）')
  assertNotContains(out, '### 派发后端：SillyHub MCP（探测可用',
    'local-fallback 输出不含完整 SillyHub 派发段标题')
  restore()
}

// ── 4. 一 Wave 一 mission（D-008）语义 ──
// SillyHub 输出含 mission 创建 + Wave 内并行 / Wave 间串行
console.log('\n--- 4. 一 Wave 一 mission（D-008）---')
{
  const restore = withoutSillyHubEnv()
  const out = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'sillyhub' })
  assertContains(out, '一 Wave 一 mission', 'SillyHub 输出含「一 Wave 一 mission」语义')
  assertContains(out, 'create_mission', 'mission 创建走 create_mission tool（每 Wave 一个）')
  assertContains(out, '并行 dispatch', 'SillyHub 输出声明 Wave 内 task→worker 并行 dispatch')
  assertContains(out, 'Wave 间 mission 串行', 'SillyHub 输出声明 Wave 间 mission 串行')
  restore()
}

// ── 5. 不依赖真实 daemon / 网络（元断言）──
// 纯函数字符串生成，无 fetch / MCP tool 调用；派发模板链不 import client.js
console.log('\n--- 5. 不依赖真实 daemon / 网络 ---')
{
  const restore = withoutSillyHubEnv()
  // 同步纯函数：快速返回，无网络阻塞
  const before = Date.now()
  const out = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'sillyhub' })
  const elapsed = Date.now() - before
  assertTrue(typeof out === 'string' && out.length > 0, 'buildWavePrompt 同步返回非空字符串（纯函数）')
  assertTrue(elapsed < 1000, `buildWavePrompt 同步快速返回（${elapsed}ms < 1s，无 daemon/网络阻塞）`)
  // 架构断言：派发模板链不 import client.js（client 才连 daemon/HTTP），证明零网络
  const strategySrc = readFileSync(join(here, '..', '..', 'src', 'dispatch', 'strategy.js'), 'utf8')
  assertTrue(!/from\s+['"][^'"]*client['"]/.test(strategySrc),
    'strategy.js 不 import client（派发策略纯模板生成，零网络）')
  restore()
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
