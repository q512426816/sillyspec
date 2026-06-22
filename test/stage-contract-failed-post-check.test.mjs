/**
 * task-07: checkTransition failed_post_check 门控
 *
 * 覆盖：
 * - AC-1: scan → brainstorm (failed_post_check) → allowed=false, reason 含"scan post-check 未通过"
 * - AC-2: scan → scan (重跑修复) → allowed=true
 * - AC-3: scan → doctor/status (辅助阶段) → allowed=true
 * - AC-4: 旧数据无 status 字段 → 行为同旧版（按 allowedFrom）
 * - AC-5: status='completed' 不被拦
 */
import { checkTransition } from '../src/stage-contract.js'

let passed = 0
let failed = 0
function assertEqual (actual, expected, msg) {
  const ok = actual === expected
  if (ok) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`); failed++ }
}
function assertMatch (actual, regex, msg) {
  if (regex.test(actual)) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}\n   actual: ${JSON.stringify(actual)} 不匹配 ${regex}`); failed++ }
}
function assert (cond, msg) {
  if (cond) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}`); failed++ }
}

console.log('=== AC-1: failed_post_check 状态下进 brainstorm/plan/execute 被拦 ===')

// scan → brainstorm, failed_post_check
{
  const r = checkTransition('scan', 'brainstorm', { fromStageData: { status: 'failed_post_check' } })
  assertEqual(r.allowed, false, "scan→brainstorm failed_post_check: allowed=false")
  assertMatch(r.reason || '', /scan post-check 未通过/, 'reason 含 "scan post-check 未通过"')
  assertMatch(r.reason || '', /重跑\s*scan|重跑\s*scan/, 'reason 含 "重跑 scan" 提示')
}

// scan → plan / execute 同样被拦
{
  const r1 = checkTransition('scan', 'plan', { fromStageData: { status: 'failed_post_check' } })
  assertEqual(r1.allowed, false, "scan→plan failed_post_check: allowed=false")
  const r2 = checkTransition('scan', 'execute', { fromStageData: { status: 'failed_post_check' } })
  assertEqual(r2.allowed, false, "scan→execute failed_post_check: allowed=false")
}

console.log('\n=== AC-2: 允许 scan → scan 重跑修复（fromStage===toStage） ===')
{
  const r = checkTransition('scan', 'scan', { fromStageData: { status: 'failed_post_check' } })
  assertEqual(r.allowed, true, "scan→scan failed_post_check: allowed=true（允许重跑修复）")
}

console.log('\n=== AC-3: failed_post_check 下辅助阶段（doctor/status）仍可执行 ===')
{
  const r1 = checkTransition('scan', 'doctor', { fromStageData: { status: 'failed_post_check' } })
  assertEqual(r1.allowed, true, "scan→doctor failed_post_check: allowed=true（辅助阶段）")
  const r2 = checkTransition('scan', 'status', { fromStageData: { status: 'failed_post_check' } })
  assertEqual(r2.allowed, true, "scan→status failed_post_check: allowed=true（辅助阶段）")
  const r3 = checkTransition('scan', 'quick', { fromStageData: { status: 'failed_post_check' } })
  assertEqual(r3.allowed, true, "scan→quick failed_post_check: allowed=true（辅助阶段）")
  const r4 = checkTransition('scan', 'explore', { fromStageData: { status: 'failed_post_check' } })
  assertEqual(r4.allowed, true, "scan→explore failed_post_check: allowed=true（辅助阶段）")
}

console.log('\n=== AC-4: 旧数据兼容（无 options 或 status 缺失，行为同旧版） ===')
{
  // 无 options（旧调用）— scan→brainstorm 按 allowedFrom 规则允许（scan 是辅助阶段，可进主流程）
  const r1 = checkTransition('scan', 'brainstorm')
  assertEqual(r1.allowed, true, "scan→brainstorm 无 options: 行为同旧版（allowed=true）")

  // options 提供 fromStageData 但 status 为 undefined
  const r2 = checkTransition('scan', 'brainstorm', { fromStageData: { /* 无 status */ } })
  assertEqual(r2.allowed, true, "scan→brainstorm status=undefined: 行为同旧版（allowed=true）")

  // options 为空对象
  const r3 = checkTransition('scan', 'brainstorm', {})
  assertEqual(r3.allowed, true, "scan→brainstorm options={}: 行为同旧版（allowed=true）")
}

console.log('\n=== AC-5: status="completed" 不被门控拦截 ===')
{
  const r = checkTransition('scan', 'brainstorm', { fromStageData: { status: 'completed' } })
  assertEqual(r.allowed, true, "scan→brainstorm status=completed: allowed=true")
}

console.log('\n=== AC-6: fromStage 非 scan 时门控不触发（门控只针对 scan 源） ===')
{
  const r = checkTransition('brainstorm', 'plan', { fromStageData: { status: 'failed_post_check' } })
  assertEqual(r.allowed, true, "brainstorm→plan failed_post_check: 门控不触发（非 scan 源）")
}

console.log('\n=== 接口向后兼容：options 第 3 位可选 ===')
{
  // 仅 2 参调用（最常见旧用法）
  const r = checkTransition('brainstorm', 'plan')
  assert(r && typeof r.allowed === 'boolean', '2 参调用返回 { allowed: boolean }')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
