/**
 * validateCheckedTaskReviews 单元测试（坑 review-json-field-gap）。
 *
 * 已勾 [x] task 的 review.json 必须 schema 完整；未勾 [ ] task 不校验。
 * Task Review Gate 只在整阶段完成时跑，本函数补"每次 execute --done 提前校验"的纯逻辑，
 * 让漏写/漏字段 review.json 在单 task --done 时就暴露，而非等到收尾。
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validateCheckedTaskReviews } from '../src/task-review.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== validateCheckedTaskReviews 已勾 task review.json 字段校验 ===\n')

const runtimeRoot = mkdtempSync(join(tmpdir(), 'rjfg-'))
const executeRunId = 'run-test-001'
const tasksDir = join(runtimeRoot, 'execute-runs', executeRunId, 'tasks')
mkdirSync(join(tasksDir, 'task-01'), { recursive: true })
mkdirSync(join(tasksDir, 'task-02'), { recursive: true })
mkdirSync(join(tasksDir, 'task-03'), { recursive: true })

// task-01: 完整 review.json（schema 通过）
writeFileSync(join(tasksDir, 'task-01', 'review.json'), JSON.stringify({
  schemaVersion: 1, task: 'task-01', specVerdict: 'pass', qualityVerdict: 'pass',
  base: 'aaa111', head: 'bbb222',
}))
// task-02: review.json 存在但缺 base/head（schemaError）
writeFileSync(join(tasksDir, 'task-02', 'review.json'), JSON.stringify({
  schemaVersion: 1, task: 'task-02', specVerdict: 'pass', qualityVerdict: 'pass',
}))
// task-03: 不写 review.json（missing）

const planContent = [
  '## Wave 1',
  '- [x] task-01: 完整 review',
  '- [x] task-02: 缺字段 review',
  '- [x] task-03: 无 review 文件',
  '- [ ] task-04: 未完成（不校验）',
].join('\n')

const result = validateCheckedTaskReviews({ planContent, runtimeRoot, executeRunId })

assert(result.ok === false, '有已勾 task 的 review 不完整 → ok=false')
assert(result.failures.length === 2, `仅 task-02/task-03 失败(未勾 task-04 不算),actual=${result.failures.length}`)
const t02 = result.failures.find(f => f.taskId === 'task-02')
const t03 = result.failures.find(f => f.taskId === 'task-03')
assert(t02 && t02.kind === 'schemaError', 'task-02 存在但缺字段 → schemaError')
assert(t02 && t02.errors.some(e => e.includes('base')), 'task-02 errors 含 base 字段提示')
assert(t03 && t03.kind === 'missing', 'task-03 无 review.json → missing')
assert(!result.failures.find(f => f.taskId === 'task-01'), 'task-01 schema 通过 → 不在 failures')
assert(!result.failures.find(f => f.taskId === 'task-04'), '未勾 task-04 → 不校验,不在 failures')

// 全部完整 → ok=true
const okPlan = '## Wave 1\n- [x] task-01: ok'
const okResult = validateCheckedTaskReviews({ planContent: okPlan, runtimeRoot, executeRunId })
assert(okResult.ok === true && okResult.failures.length === 0, '所有已勾 task review 完整 → ok=true')

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
