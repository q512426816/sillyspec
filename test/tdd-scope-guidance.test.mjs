/**
 * TDD 分层适用引导（2026-10-14-tdd-scope-guidance）
 *
 * 背景：TDD 声明面（规则 3 执行顺序 / execute / dispatch 提示词）无差别要求先写测试，
 * agent 会把 test-first 执行到视觉样式层与纯配置面，产出断言 className 式负资产测试。
 * 用户原话：「前端 TDD 很多地方做测试是多余的，TDD 范围我们还得再引导下」。
 * 修法：templates/prompts/testcase-design.md 单一源头部加「按层适用」块（{{include: testcase-design}}
 * 机制自动流进 execute 三条派发路径与 dispatch 双后端），规则 3 三实例（模板/AGENTS.md/CLAUDE.md）
 * 加分层尾注，execute.js / dispatch 双后端 / flow 命令卡措辞带「按层适用」限定。
 * 本测试钉各面措辞在场 + 既有断言面（标题/7 条检查）不被破坏 + docs/prompt 提取副本同步。
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== TDD 分层适用引导（2026-10-14-tdd-scope-guidance）===\n')

// ① 单一源：按层适用块在场，标题与 7 条检查不被破坏
const tcd = read('templates/prompts/testcase-design.md')
assertTrue(tcd.startsWith('### 测试用例设计（写测试时按此检查）'),
  '单一源标题逐字保留（既有注入测试断言面）')
assertTrue(tcd.includes('按层适用'), '单一源含「按层适用」块')
assertTrue(tcd.includes('先写测试再实现'), '纯逻辑层：严格 test-first 措辞在场')
assertTrue(tcd.includes('用户可见行为'), '行为契约层：断言用户可见行为措辞在场')
assertTrue(tcd.includes('视觉样式') && tcd.includes('不写测试'), '视觉样式与纯配置层：不写测试措辞在场')
assertTrue(tcd.includes('当 X 发生时，用户应看到/发生 Y'), '一句话判据在场')
assertTrue(tcd.includes('不适用：'), '与 FR 测试绑定「不适用：理由」口径衔接')
for (const n of ['1. **覆盖**', '2. **断言**', '3. **行为 vs 实现**', '4. **契约与回归**',
  '5. **时间敏感分支**', '6. **隔离确定性**', '7. **覆盖对账**']) {
  assertTrue(tcd.includes(n), `既有检查逐字保留：${n}`)
}

// ② 规则 3 三实例：分层尾注
for (const p of ['templates/agents-instruction.md', 'AGENTS.md', 'CLAUDE.md']) {
  assertTrue(read(p).includes('测试按层适用'), `${p} 规则含「测试按层适用」尾注`)
}

// ③ 提示词与命令卡：TDD 措辞带按层限定
assertTrue(read('src/stages/execute.js').includes('TDD 按层适用'), 'execute.js 任务闭环行带按层限定')
assertTrue(read('src/dispatch/backends/local-agent.js').includes('按层适用'), 'local-agent.js 写模式行带按层限定')
assertTrue(read('src/dispatch/backends/sillyhub-mcp.js').includes('按层适用'), 'sillyhub-mcp.js 实现行带按层限定')
assertTrue(read('assets/command-cards/flow.md').includes('按层适用'), 'flow 命令卡「直接干活」行带按层限定')

// ④ docs/prompt 提取副本同步（_extract.mjs 重提取后 execute/quick 正文含按层适用块）
assertTrue(read('docs/prompt/execute.md').includes('按层适用'), 'docs/prompt/execute.md 提取副本同步')
assertTrue(read('docs/prompt/quick.md').includes('按层适用'), 'docs/prompt/quick.md 提取副本同步')

console.log('')
if (failed > 0) {
  console.error(`❌ ${failed} 项失败：${failures.join('；')}`)
  process.exit(1)
}
console.log('✅ 全部通过')
