/**
 * verify 探针3 断言有效性抽查（quick ql-20260812-009-dcb9）
 *
 * 背景：verify 探针 3 只查"有没有测试文件"（递归找 test/spec 命名测试文件），不查断言质量——
 * agent 可以写一堆只"不抛错"的空断言、只测 getter/setter、只覆盖业务正例的测试交差。
 * 修法（advisory persuasion，非硬门，同 full-a 集成盲区提示先例）：verify-probes.md 探针 3
 * 加第 5 点「断言有效性抽查」，与 execute 的 testcase-design.md 6 条检查闭环——execute 让
 * worker 按 6 条写，verify 抽查核验是否真写了有效断言。
 */
import { resolvePromptIncludes } from '../src/run/shared.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== verify 探针3 断言有效性抽查（ql-20260812-009）===\n')

const injected = resolvePromptIncludes('{{include: verify-probes}}')

assertTrue(injected.includes('断言有效性抽查'), '探针 3 含「断言有效性抽查」点')
assertTrue(injected.includes('与 execute「测试用例设计」闭环'), '明确与 execute testcase-design 闭环定位')
assertTrue(injected.includes('不是只"不抛错"的空断言、只测 getter/setter'), '抽查①：拒绝空断言/只测 getter setter')
assertTrue(injected.includes('覆盖边界/异常分支，不只业务正例'), '抽查②：边界/异常覆盖')
assertTrue(injected.includes('走公开 API 测行为，不测实现细节'), '抽查③：测行为不测实现')
assertTrue(injected.includes('advisory：CLI 不阻断'), '明确 advisory 不硬阻断（persuasion 非加门）')
assertTrue(!injected.includes('{{include:'), '注入后无残留占位符')

// 回归：原有探针 3 集成盲区提示未被覆盖破坏（full-a 先例仍在）
assertTrue(injected.includes('集成盲区提示'), '探针 3 原有集成盲区提示保留（full-a 先例未损）')

console.log(`\n${'='.repeat(50)}`)
const total = 8
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)