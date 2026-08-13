/**
 * stage-review gate echo 路径测试 —— gate FAILED 时 printStageReviewResult echo 完整 review.json
 * 路径（含 CLI 生成的 runId）+ 勿手算提示，实现"CLI 自动填 runId、agent 不算"。
 *
 * 背景：agent 撞 gate 报"缺 review.json"后曾自己算 runId，猜错 review- 前缀（填 exec-/裸 ts 被
 * CLI 忽略）。改后 printStageReviewResult 接 context.reviewRunId/runtimeRoot，FAILED 时 echo
 * 完整路径，agent 直接用。runId/marker 本就由 CLI 自动生成写入（prompt.js review step 渲染 +
 * gates.js gate 触发），agent 无需手算。
 */
import { printStageReviewResult } from '../src/stage-review.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => {
  cond ? (count.passed++, console.log(`  ✅ ${msg}`))
    : (count.failed++, count.failures.push(msg), console.log(`  ❌ ${msg}`))
}

function captureError(fn) {
  const orig = console.error
  let buf = ''
  console.error = (...a) => { buf += a.join(' ') + '\n' }
  try { fn() } finally { console.error = orig }
  return buf
}

console.log('stage-review gate echo 路径测试\n')

// ── Case 1：FAILED + 完整 context → echo 完整路径 + 勿手算 + runId + register 命令 ──
{
  const buf = captureError(() => printStageReviewResult(
    { ok: false, errors: ['缺少 execute 阶段 stage review.json'], warnings: [] },
    { stage: 'execute', reviewRunId: 'review-2026-08-13-094812', runtimeRoot: '/tmp/.runtime' }
  ))
  assert(
    buf.includes('/tmp/.runtime/stage-reviews/execute-review-2026-08-13-094812/review.json'),
    'FAILED echo 含完整 review.json 路径（runtimeRoot/stage/runId 拼接）'
  )
  assert(buf.includes('勿手算'), 'FAILED echo 含「勿手算」提示')
  assert(buf.includes('review-2026-08-13-094812'), 'FAILED echo 含 runId（review- 前缀，CLI 生成）')
  assert(buf.includes('register-stage-review'), 'FAILED 保留 register-stage-review 命令提示')
}

// ── Case 2：FAILED 但未传 reviewRunId（向后兼容，旧调用方）→ 不 echo 路径块 ──
{
  const buf = captureError(() => printStageReviewResult(
    { ok: false, errors: ['缺 review.json'], warnings: [] },
    { stage: 'execute' }
  ))
  assert(!buf.includes('review.json 直接写此路径'), '无 reviewRunId 时不 echo 路径块（向后兼容）')
  assert(buf.includes('FAILED'), '仍报 FAILED 主体')
}

// ── Case 3：runtimeRoot 缺失 → 用 .sillyspec/.runtime/... 相对路径兜底 ──
{
  const buf = captureError(() => printStageReviewResult(
    { ok: false, errors: ['缺 review.json'], warnings: [] },
    { stage: 'plan', reviewRunId: 'review-2026-08-13-094812' }
  ))
  assert(
    buf.includes('.sillyspec/.runtime/stage-reviews/plan-review-2026-08-13-094812/review.json'),
    '无 runtimeRoot 时用相对路径兜底'
  )
}

// ── Case 4：OK → 不 echo 路径（console.log 通过，error 静默）──
{
  const buf = captureError(() => printStageReviewResult(
    { ok: true, errors: [], warnings: [] },
    { stage: 'execute', reviewRunId: 'review-2026-08-13-094812', runtimeRoot: '/tmp/.runtime' }
  ))
  assert(!buf.includes('review.json 直接写此路径'), 'OK 不 echo 路径')
  assert(!buf.includes('FAILED'), 'OK 不报 FAILED')
}

// ── Case 5：WARNING（ok=true + warnings）→ 不 echo 路径（路径块只在 errors>0）──
{
  const buf = captureError(() => printStageReviewResult(
    { ok: true, errors: [], warnings: ['spec=cannot_verify'] },
    { stage: 'execute', reviewRunId: 'review-2026-08-13-094812', runtimeRoot: '/tmp/.runtime' }
  ))
  assert(!buf.includes('review.json 直接写此路径'), 'WARNING（无 errors）不 echo 路径块')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}`)
if (count.failures.length) console.log(`失败项: ${count.failures.join('; ')}`)
console.log(`${'='.repeat(50)}`)
if (count.failed > 0) process.exit(1)
