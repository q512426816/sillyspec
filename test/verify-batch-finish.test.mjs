/**
 * verify 批量完成检测测试（P0-1 verify 尾巴瘦身，2026-09-20 对撞实验驱动）
 *
 * 覆盖 detectVerifyBatchFinish 五态：
 *   1. 报告缺席 → 不批量
 *   2. 结论枚举未填（待填占位）→ 不批量
 *   3. verify-facts.json 缺席 → 不批量
 *   4. 锚定步（step 1-2）未过 → 不批量
 *   5. 全条件满足 → 批量标 completed（含乐观预标戳 _batchAligned）
 *
 * 风格：自研 assert + tmp fixture（同 quick-test-gate.test.mjs）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { detectVerifyBatchFinish } from '../src/run/complete.js'

let failed = 0
let total = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

const tmpRoots = []
function makeRepo({ report, facts } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'vbatch-'))
  tmpRoots.push(root)
  const changeDir = join(root, '.sillyspec', 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  if (report !== undefined) writeFileSync(join(changeDir, 'verify-result.md'), report)
  if (facts !== undefined) writeFileSync(join(changeDir, 'verify-facts.json'), facts)
  return root
}

const REPORT_FILLED = '# 验证报告\n\n结论枚举：`PASS`——全过。\n'
const REPORT_PENDING = '# 验证报告\n\n结论枚举：`<待填：三选一>`\n'
const FACTS = '{"schemaVersion":2}'

const mkSteps = (doneCount) => Array.from({ length: 7 }, (_, i) => ({
  name: `step${i + 1}`,
  status: i < doneCount ? 'completed' : 'pending',
}))

// ── 1. 报告缺席 ──
{
  const root = makeRepo({ facts: FACTS })
  const r = detectVerifyBatchFinish({ changeName: 'c1', specBase: join(root, '.sillyspec'), steps: mkSteps(2) })
  assert(r.batched === false && r.reason.includes('verify-result'), '1 报告缺席 → 不批量')
}
// ── 2. 结论未填 ──
{
  const root = makeRepo({ report: REPORT_PENDING, facts: FACTS })
  const r = detectVerifyBatchFinish({ changeName: 'c1', specBase: join(root, '.sillyspec'), steps: mkSteps(2) })
  assert(r.batched === false && r.reason.includes('结论枚举'), '2 结论待填 → 不批量')
}
// ── 3. facts 缺席 ──
{
  const root = makeRepo({ report: REPORT_FILLED })
  const r = detectVerifyBatchFinish({ changeName: 'c1', specBase: join(root, '.sillyspec'), steps: mkSteps(2) })
  assert(r.batched === false && r.reason.includes('facts'), '3 facts 缺席 → 不批量')
}
// ── 4. 锚定步未过 ──
{
  const root = makeRepo({ report: REPORT_FILLED, facts: FACTS })
  const r = detectVerifyBatchFinish({ changeName: 'c1', specBase: join(root, '.sillyspec'), steps: mkSteps(1) })
  assert(r.batched === false && r.reason.includes('锚定'), '4 step1-2 未过 → 不批量（语义锚定不批量）')
}
// ── 5. 全条件满足 → 批量 ──
{
  const root = makeRepo({ report: REPORT_FILLED, facts: FACTS })
  const steps = mkSteps(2)
  const r = detectVerifyBatchFinish({ changeName: 'c1', specBase: join(root, '.sillyspec'), steps })
  assert(r.batched === true && r.aligned === 5, `5 全条件 → 批量 5 步（实际 ${r.aligned}）`)
  assert(steps.slice(2).every(s => s.status === 'completed' && s._batchAligned === true), '5b 剩余步标 completed + 乐观预标戳（gate 失败回滚锚）')
  assert(steps[0].status === 'completed' && !steps[0]._batchAligned, '5c 已完成步不被重标')
}
// ── 6. PASS WITH NOTES / FAIL 枚举也认 ──
{
  const root = makeRepo({ report: '# 报告\n\n结论枚举：`PASS WITH NOTES`——note。\n', facts: FACTS })
  const r = detectVerifyBatchFinish({ changeName: 'c1', specBase: join(root, '.sillyspec'), steps: mkSteps(3) })
  assert(r.batched === true, '6 NOTES 枚举也批量（FAIL 同族枚举面）')
}

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄延迟 */ }
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
