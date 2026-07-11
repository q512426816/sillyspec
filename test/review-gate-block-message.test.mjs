/**
 * review gate 阻断文案测试（建议 3）
 *
 * 验证 validateTaskReviews 在 review.json 缺失时，错误文案含期望 review.json 绝对路径
 * + execute run ID（D-005）。让 agent 知道往哪写，而非只看到「缺少 review.json」。
 */
import { validateTaskReviews } from '../src/task-review.js'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== review gate 阻断文案含期望路径 + runId（建议 3）===\n')

const runtimeRoot = mkdtempSync(join(tmpdir(), 'review-gate-'))
const executeRunId = 'test-run-abc-123'
const planContent = `## Wave 1\n- [ ] task-01: 占位符化\n- [ ] task-02: 文案\n`

const result = validateTaskReviews({ planContent, runtimeRoot, executeRunId })

console.log('--- Case 1: review.json 缺失，阻断文案含期望路径 + runId ---')
{
  assertTrue(!result.ok, 'review.json 缺失 → result.ok = false')
  const t1Error = result.errors.find(e => e.includes('task-01'))
  assertTrue(!!t1Error, 'errors 含 task-01 条目')
  assertTrue(t1Error && t1Error.includes('期望路径'), 'task-01 错误含「期望路径」')
  assertTrue(t1Error && t1Error.includes(runtimeRoot), 'task-01 错误含 runtimeRoot 绝对路径')
  assertTrue(t1Error && t1Error.includes(executeRunId), 'task-01 错误含 execute run ID')
  assertTrue(t1Error && t1Error.includes('review.json'), 'task-01 错误含 review.json 文件名')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${6 - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
