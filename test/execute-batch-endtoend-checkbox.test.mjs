/**
 * execute 批量完成「端到端 task cannot_verify 不算 checked」测试
 * （坑 execute-batch-complete-endtoend-checkbox）
 *
 * autoCheckPlanFromReviews 原把 cannot_verify 当 checked（只拦 fail），端到端 task
 * 未真验就被批量放行。修法：端到端/deployment-critical task（isEndToEndTaskText）
 * 要求 review 双 pass（shouldAutoCheckTask endToEnd=true 时不收 cannot_verify）；
 * 普通 task 维持非-fail 即可（保主 agent 直接实现模式体验）。
 */
import { isEndToEndTaskText } from '../src/change-risk-profile.js'
import { shouldAutoCheckTask } from '../src/run/complete.js'

let failed = 0
const failures = []
function eq(actual, expected, msg) {
  if (actual !== expected) { failed++; failures.push(`${msg} (got ${actual}, want ${expected})`); console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== isEndToEndTaskText：task 级端到端/deployment-critical 判定 ===\n')

// ── 命中端到端集成语义 → true ──
console.log('--- 命中端到端集成语义 ---')
eq(isEndToEndTaskText('task-08 daemon↔backend 端到端集成验证'), true, '端到端 + daemon↔backend → true')
eq(isEndToEndTaskText('真实集成验证已附 runtime evidence'), true, '真实集成 / runtime evidence → true')
eq(isEndToEndTaskText('跑 e2e test 全绿'), true, 'e2e test → true')
eq(isEndToEndTaskText('integration test 跨进程对齐'), true, 'integration test → true')

// ── 命中部署/启动入口 → true ──
console.log('--- 命中部署/启动入口 ---')
eq(isEndToEndTaskText('真实启动 cli.ts 入口验证'), true, '启动 + cli.ts → true')
eq(isEndToEndTaskText('改 main.ts entrypoint 启动逻辑'), true, 'main.ts / entrypoint → true')
eq(isEndToEndTaskText('docker-compose up 验证 server.ts'), true, 'docker-compose / server.ts → true')

// ── 普通 task 不误伤（关键：backend/session/lifecycle 单独不判端到端）──
console.log('--- 普通 task 不误伤（change 级泛词 task 级不用）---')
eq(isEndToEndTaskText('backend 加 CRUD 接口'), false, '单独 backend → false（不误伤普通后端 task）')
eq(isEndToEndTaskText('session manager 状态机重构'), false, 'session/lifecycle → false（change 级泛词，task 级不判）')
eq(isEndToEndTaskText('refactor utils 工具函数'), false, '普通重构 → false')
eq(isEndToEndTaskText(''), false, '空串 → false')
eq(isEndToEndTaskText('backend 调 lease 续约'), false, 'backend+lease 但无端到端/启动语义 → false')

console.log('\n=== shouldAutoCheckTask：自动勾选决策（坑2 核心）===\n')

const pass = { ok: true, review: { specVerdict: 'pass', qualityVerdict: 'pass' } }
const cv = { ok: true, review: { specVerdict: 'cannot_verify', qualityVerdict: 'cannot_verify' } }
const specFail = { ok: true, review: { specVerdict: 'fail', qualityVerdict: 'pass' } }
const qualFail = { ok: true, review: { specVerdict: 'pass', qualityVerdict: 'fail' } }
const passCv = { ok: true, review: { specVerdict: 'pass', qualityVerdict: 'cannot_verify' } }
const noReview = { ok: false }
const nullReview = null

// ── 普通 task（endToEnd=false）：非 fail 即可，cannot_verify 算（保主 agent 模式）──
console.log('--- 普通 task（endToEnd=false）：cannot_verify 仍算 checked ---')
eq(shouldAutoCheckTask(pass, false), true, '普通 pass → 勾')
eq(shouldAutoCheckTask(cv, false), true, '普通 cannot_verify → 勾（主 agent 直接实现模式兜底）')
eq(shouldAutoCheckTask(specFail, false), false, '普通 spec=fail → 不勾')
eq(shouldAutoCheckTask(qualFail, false), false, '普通 quality=fail → 不勾')
eq(shouldAutoCheckTask(noReview, false), false, '普通 无 review → 不勾')
eq(shouldAutoCheckTask(nullReview, false), false, 'null review → 不勾')

// ── 端到端 task（endToEnd=true）：必须双 pass，cannot_verify 不算（坑2 核心）──
console.log('--- 端到端 task（endToEnd=true）：cannot_verify 不算 checked（坑2 核心）---')
eq(shouldAutoCheckTask(pass, true), true, '端到端 双 pass → 勾')
eq(shouldAutoCheckTask(cv, true), false, '端到端 cannot_verify → 不勾（防未真验就批量放行）')
eq(shouldAutoCheckTask(passCv, true), false, '端到端 quality=cannot_verify → 不勾（必须双 pass）')
eq(shouldAutoCheckTask(specFail, true), false, '端到端 spec=fail → 不勾')
eq(shouldAutoCheckTask(qualFail, true), false, '端到端 quality=fail → 不勾')

console.log('\n=== 端到端现场组合（task 文本 × review verdict）===\n')
// task-08 端到端 + cannot_verify（issue 现场）→ endToEnd=true → 不勾 → 阻断批量
eq(shouldAutoCheckTask(cv, isEndToEndTaskText('task-08 daemon↔backend 端到端集成')), false,
  '现场：端到端 task + cannot_verify → 不勾（阻断批量，issue 诉求）')
// 普通 task + cannot_verify → 勾（不影响主 agent 模式批量收尾）
eq(shouldAutoCheckTask(cv, isEndToEndTaskText('backend 加 CRUD 接口')), true,
  '对照：普通 task + cannot_verify → 勾（主 agent 模式仍可批量收尾）')
// 端到端 task + 真 pass → 勾（真验过的端到端 task 可批量）
eq(shouldAutoCheckTask(pass, isEndToEndTaskText('真实启动 cli.ts 入口')), true,
  '端到端 task + 双 pass → 勾（真验过可批量）')

const total = 28
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
