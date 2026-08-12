/**
 * execute 测试用例设计引导注入（quick ql-20260812-006-d70c）
 *
 * 背景：execute 的 TDD 铁律只有"先读后写 → 写测试 → 写实现"关键字，无测试用例设计引导，
 * agent 只按业务正例写测试、对整体把控（边界/异常/断言质量/契约回归/时间敏感分支/隔离）不行。
 * 修法：新增 templates/prompts/testcase-design.md 单一源（6 条检查 + 基础习惯一条线带过），
 * 经 {{include: testcase-design}} 注入 execute 三条派发路径：
 *   1) execute.js buildWavePrompt「子代理 prompt 要点」第 5 项后（base，所有模式都带）
 *   2) local-agent.js renderLocalInstruction「子代理 prompt 要点」（dispatch hint / SillyHub 兜底路径）
 *   3) sillyhub-mcp.js worker_prompt 覆写（SillyHub worker 唯一指令源，必须自包含）
 * 复用 P2.2.3 / B4 include 机制（resolvePromptIncludes 运行时解析），单一源防三处手抄漂移。
 */
import { buildWavePrompt } from '../src/stages/execute.js'
import { renderLocalInstruction } from '../src/dispatch/backends/local-agent.js'
import { renderSillyHubInstruction } from '../src/dispatch/backends/sillyhub-mcp.js'
import { resolvePromptIncludes } from '../src/run/shared.js'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tplPath = join(__dirname, '..', 'templates', 'prompts', 'testcase-design.md')

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

// env 隔离：buildWavePrompt 默认模式依赖 getDispatchMode() 无 env → 'local'
function withoutSillyHubEnv() {
  const saved = { url: process.env.SILLYHUB_MCP_URL, token: process.env.SILLYHUB_MCP_TOKEN }
  delete process.env.SILLYHUB_MCP_URL
  delete process.env.SILLYHUB_MCP_TOKEN
  return () => {
    if (saved.url === undefined) delete process.env.SILLYHUB_MCP_URL
    else process.env.SILLYHUB_MCP_URL = saved.url
    if (saved.token === undefined) delete process.env.SILLYHUB_MCP_TOKEN
    else process.env.SILLYHUB_MCP_TOKEN = saved.token
  }
}

const wave = { index: 1, tasks: [{ index: 1, name: 'task-01: 示例', file: 'src/x.js' }] }
const worktreePath = 'C:/wt/testcase'
const contract = {
  brief: '示例任务', worktreePath, branch: 'main',
  allowedPaths: ['src/x.js'], readOnly: false, runId: 'r1',
}

console.log('=== execute 测试用例设计引导注入（ql-20260812-006）===\n')

// ── 1. 模板单一源存在 + resolvePromptIncludes 解析 ──
console.log('--- 1. 模板文件 + include 解析 ---')
{
  assertTrue(existsSync(tplPath), 'templates/prompts/testcase-design.md 存在')
  const injected = resolvePromptIncludes('{{include: testcase-design}}')
  assertTrue(injected.includes('写测试是为了拦住回归'), '注入内容含 lead（拦回归定位）')
  assertTrue(injected.includes('边界') && injected.includes('断言'), '注入内容含第 1/2 条（覆盖/断言）')
  assertTrue(injected.includes('行为 vs 实现'), '注入内容含第 3 条（测行为不测实现）')
  assertTrue(injected.includes('契约与回归'), '注入内容含第 4 条（契约回归）')
  assertTrue(injected.includes('时间敏感分支'), '注入内容含第 5 条（超时/重试别真等）')
  assertTrue(injected.includes('隔离确定性'), '注入内容含第 6 条（隔离确定性）')
  assertTrue(injected.includes('FIRST') && injected.includes('AAA'), '注入内容含基础习惯一行带过（FIRST/AAA）')
  assertTrue(!injected.includes('{{include:'), '注入后无残留占位符')
}

// ── 2. base 路径：buildWavePrompt「子代理 prompt 要点」第 5 项后（默认 local 模式）──
console.log('\n--- 2. execute.js base 子代理 prompt 要点（默认 Local 模式）---')
{
  const restore = withoutSillyHubEnv()
  const out = buildWavePrompt(wave, 1, null, worktreePath)
  const n = (out.match(/\{\{include: testcase-design\}\}/g) || []).length
  assertTrue(n === 1, `默认模式 buildWavePrompt 含 1 个 include（base 要点，实际 ${n}）`)
  assertTrue(out.includes('5. 任务含测试代码时，把下方「测试用例设计」整段复制进子代理 prompt'),
    '子代理 prompt 要点新增第 5 项（复制引导）')
  assertTrue(out.includes('{{include: testcase-design}}'), 'include 占位符紧跟第 5 项后（resolvePromptIncludes 运行时解析）')
  restore()
}

// ── 3. Local 后端模板：renderLocalInstruction（dispatch hint / SillyHub 兜底路径）──
console.log('\n--- 3. local-agent.js renderLocalInstruction ---')
{
  const instr = renderLocalInstruction(contract)
  assertTrue(instr.includes('{{include: testcase-design}}'),
    'Local 派发指令「子代理 prompt 要点」含 include（SillyHub 路径 fallback 时也带测试设计引导）')
}

// ── 4. SillyHub worker_prompt 覆写：worker 唯一指令源必须自包含 ──
console.log('\n--- 4. sillyhub-mcp.js worker_prompt 覆写 ---')
{
  const instr = renderSillyHubInstruction(contract)
  const inWorkerPrompt = instr.includes('5. 写测试时遵循下方「测试用例设计」规则：\n\n{{include: testcase-design}}')
  assertTrue(inWorkerPrompt, 'SillyHub worker_prompt 覆写含第 5 项 + include（worker 不见 wave prompt，必须自包含）')
}

// ── 5. SillyHub 模式 buildWavePrompt：base + sillyhub + Local 兜底 ──
console.log('\n--- 5. SillyHub 模式（三条注入全带）---')
{
  const restore = withoutSillyHubEnv()
  const out = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'sillyhub' })
  const n = (out.match(/\{\{include: testcase-design\}\}/g) || []).length
  assertTrue(n >= 3, `SillyHub 模式含 ≥3 个 include（base + worker_prompt + Local 兜底，实际 ${n}）`)
  // local-fallback：只有 base（短提示不带 renderLocalInstruction）
  const fb = buildWavePrompt(wave, 1, null, worktreePath, { dispatchMode: 'local-fallback' })
  const nFb = (fb.match(/\{\{include: testcase-design\}\}/g) || []).length
  assertTrue(nFb === 1, `local-fallback 模式仍含 1 个 include（base，短提示不重复，实际 ${nFb}）`)
  restore()
}

// ── 6. 不 mock 被测方法 / 单测全绿 ≠ 集成正确等关键措辞锁定（防后续编辑丢语义）──
console.log('\n--- 6. 关键措辞锁定 ---')
{
  const injected = resolvePromptIncludes('{{include: testcase-design}}')
  assertTrue(injected.includes('不 mock 被测方法自身'), '断言条锁定"不 mock 被测方法自身"')
  assertTrue(injected.includes('单测全绿 ≠ 集成正确'), '覆盖条锁定"单测全绿 ≠ 集成正确"')
  assertTrue(injected.includes('禁止删断言凑绿'), '回归条锁定"禁止删断言凑绿"')
}

console.log(`\n${'='.repeat(50)}`)
const total = 19
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)