/**
 * quick 档位测试用例设计引导注入（quick ql-20260812-010-a950）
 *
 * 背景：execute/verify 已闭环（execute 按 testcase-design 6 条写、verify 探针3 抽查断言），
 * 但 quick 档位（≤3 文件小改动）step2「实现并验证」只写"建议写单元测试验证"，无测试设计引导——
 * 小改动照样可能写出只符合业务正例的测试。修法：quick.js step2 操作 3 加"写测试时按下方
 * 「测试用例设计」检查" + 注入 {{include: testcase-design}}（复用单一源，模板自带标题）。
 * quick 是静态 stage（definition.steps 直接定义），无子代理派发，include 直接在 step prompt 解析。
 */
import { definition } from '../src/stages/quick.js'
import { resolvePromptIncludes } from '../src/run/shared.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== quick step2 测试用例设计引导注入（ql-20260812-010）===\n')

const implStep = definition.steps[1]
assertTrue(implStep.name === '实现并验证', '定位 step2「实现并验证」')

const prompt = implStep.prompt
assertTrue(prompt.includes('写测试时按下方「测试用例设计」检查'),
  '操作 3 加"写测试时按下方测试用例设计检查"（与 execute 同口径）')
assertTrue(prompt.includes('{{include: testcase-design}}'),
  'step2 prompt 含 include 占位符（resolvePromptIncludes 运行时解析）')

// 注入解析：模板自带标题 + 6 条检查 + 无残留占位符
const resolved = resolvePromptIncludes(prompt)
assertTrue(resolved.includes('### 测试用例设计（写测试时按此检查）'), '解析后含模板标题')
assertTrue(resolved.includes('时间敏感分支') && resolved.includes('隔离确定性'),
  '解析后含 testcase-design 6 条（时间敏感/隔离为代表）')
assertTrue(!resolved.includes('{{include:'), '解析后无残留占位符')

// 作用域：只注入 step2，其他 quick 步不重复
assertTrue(!definition.steps[0].prompt.includes('testcase-design'), 'step1 理解任务不含（作用域干净）')
assertTrue(!definition.steps[2].prompt.includes('testcase-design'), 'step3 暂存不含（作用域干净）')

console.log(`\n${'='.repeat(50)}`)
const total = 8
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)