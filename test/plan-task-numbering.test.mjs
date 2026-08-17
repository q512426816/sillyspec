/**
 * buildCoordinatorStep 保 plan.md 原始编号（bug#3）
 *
 * 修复前：buildCoordinatorStep 按 checkbox 出现顺序 i+1 重编号（task-01/02），
 * 与 execute 按原始编号定位 tasks/task-XX.md 错位（文件名 ≠ Wave 引用）。
 * 修复后：用 parseTaskNames 返回的原始编号（task-05/task-04），plan/execute 贯穿一致。
 *
 * 2026-08-17 更新：TaskCard 生成改为 batch 模式，文件路径不再在协调器 prompt 里逐 task 列出，
 * 而是在 batch 子代理 prompt 模板中统一说明按实际 task id 生成 task-N.md。
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
  const changeDir = '/tmp/change'
  const step = buildCoordinatorStep(changeDir, taskNames)
  const prompt = step.prompt
  assertTrue(prompt.includes('task-05: 外壳'), 'prompt 含 task-05: 外壳（原始编号）')
  assertTrue(prompt.includes('task-04: layout'), 'prompt 含 task-04: layout（原始编号）')
  assertTrue(prompt.includes(`${changeDir}/tasks/`),
    'batch 子代理 prompt 模板含任务文件输出目录（由子代理按实际 task id 生成 task-N.md）')
  assertTrue(prompt.includes('task-N.md') || prompt.includes('<task-id>'),
    'batch 子代理 prompt 模板说明按实际 task id 生成对应文件')
}

console.log(`\n${'='.repeat(50)}`)
const total = 4
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
