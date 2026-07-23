/**
 * buildCoordinatorStep 保 plan.md 原始编号（bug#3）
 *
 * 修复前：buildCoordinatorStep 按 checkbox 出现顺序 i+1 重编号（task-01/02），
 * 与 execute 按原始编号定位 tasks/task-XX.md 错位（文件名 ≠ Wave 引用）。
 * 修复后：用 parseTaskNames 返回的原始编号（task-05/task-04），plan/execute 贯穿一致。
 */
import { buildCoordinatorStep } from '../src/stages/plan.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== buildCoordinatorStep 保原始编号（bug#3）===\n')

{
  // 非顺序编号（模拟 plan.md W1 task-05、W2 task-04）
  const taskNames = [
    { num: '05', name: '外壳' },
    { num: '04', name: 'layout' },
  ]
  const step = buildCoordinatorStep('/tmp/change', taskNames)
  const prompt = step.prompt
  assertTrue(prompt.includes('task-05: 外壳'), 'prompt 含 task-05: 外壳（原始编号）')
  assertTrue(prompt.includes('task-04: layout'), 'prompt 含 task-04: layout（原始编号）')
  assertTrue(prompt.includes('tasks/task-05.md'), '文件路径 task-05.md（与 execute 标号一致）')
  assertTrue(prompt.includes('tasks/task-04.md'), '文件路径 task-04.md')
}

console.log(`\n${'='.repeat(50)}`)
const total = 4
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
