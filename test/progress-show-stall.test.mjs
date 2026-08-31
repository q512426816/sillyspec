/**
 * progress show 滞留/疑似完成信号测试（2026-08-30 用户反馈②）
 *
 * 背景：7 个「代码全落地但流程没收口」的变更挂 38 天无人发现——progress 视图缺
 * 「实现疑似完成但卡在中期阶段」的信号。本测试钉 stage-machine._stallSignal 两类提示：
 *   - likely-complete：tasks.md 全勾但 execute 未完成（不限天数，判据对齐 doctor D5）
 *   - stalled：流程未收口 + last_active 超 STALL_WARN_DAYS（7）天无活跃
 *
 * 覆盖矩阵：
 *   老化+未全勾        → 滞留提示（含 change-delete 建议）
 *   新鲜+全勾+execute未完成 → 疑似完成提示（含 run execute 建议、无滞留误报）
 *   新鲜+未全勾        → 零信号（回归保护）
 *   archive 已完成     → 零信号（流程已收口不提示，即使老化+全勾）
 *   多变更汇总         → 逐行透出滞留信号
 */

import { runCapturing, initChange, seedStage, makeRepo, cleanup, report } from './_complete-step-harness.mjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const DAY_MS = 24 * 60 * 60 * 1000
const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== progress show：滞留/疑似完成信号 ===\n')

function setDbState(cwd, changeName, { currentStage, lastActive }) {
  const db = new DatabaseSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'))
  try {
    db.prepare('UPDATE changes SET current_stage = ?, last_active = ? WHERE name = ?')
      .run(currentStage, lastActive, changeName)
  } finally { db.close() }
}

function writeTasks(cwd, changeName, checked, total) {
  const lines = ['# 任务注册表', '']
  for (let i = 1; i <= total; i++) lines.push(`- [${i <= checked ? 'x' : ' '}] task-0${i}: 任务 ${i}`)
  writeFileSync(join(cwd, '.sillyspec', 'changes', changeName, 'tasks.md'), lines.join('\n') + '\n')
}

{
  // Case 1：38 天无活跃 + tasks 未全勾 → 滞留提示（含 change-delete 放弃建议）
  const { cwd } = makeRepo('ps-stall-')
  const changeName = '2026-08-30-stalled-change'
  const pm = await initChange(cwd, join(cwd, '.sillyspec'), changeName)
  await seedStage(pm, cwd, changeName, 'execute', [
    { name: '加载上下文', status: 'completed', output: 'ok' },
    { name: 'Wave 1 执行', status: 'in-progress' },
  ])
  writeTasks(cwd, changeName, 1, 3)
  setDbState(cwd, changeName, { currentStage: 'execute', lastActive: new Date(Date.now() - 38 * DAY_MS).toISOString() })

  const r = await runCapturing(() => pm.show(cwd, changeName))
  assert(r.stdout.includes('⏳ 滞留：已 38 天无活跃，流程停在「⚡ 波次执行」未收口'), '38 天无活跃 → 滞留提示行（含阶段名）')
  assert(r.stdout.includes('sillyspec change-delete --change 2026-08-30-stalled-change'), '滞留提示带 change-delete 放弃建议')
  assert(!r.stdout.includes('实现疑似完成'), 'tasks 1/3 未全勾 → 不误报疑似完成')
}

{
  // Case 2：tasks 3/3 全勾 + execute 未完成 + 新鲜 → 疑似完成提示（无滞留误报）
  const { cwd } = makeRepo('ps-stall-')
  const changeName = '2026-08-30-likely-complete'
  const pm = await initChange(cwd, join(cwd, '.sillyspec'), changeName)
  await seedStage(pm, cwd, changeName, 'execute', [
    { name: '加载上下文', status: 'completed', output: 'ok' },
    { name: 'Wave 1 执行', status: 'in-progress' },
  ])
  writeTasks(cwd, changeName, 3, 3)
  setDbState(cwd, changeName, { currentStage: 'execute', lastActive: new Date().toISOString() })

  const r = await runCapturing(() => pm.show(cwd, changeName))
  assert(r.stdout.includes('实现疑似完成未收口：tasks 3/3 全勾'), 'tasks 全勾 + execute 未完成 → 疑似完成提示')
  assert(r.stdout.includes('但流程停在「⚡ 波次执行」（execute 阶段 in-progress）'), '提示含当前阶段与 execute 状态')
  assert(r.stdout.includes('建议：sillyspec run execute --change'), '疑似完成提示带收口命令建议')
  assert(r.stdout.includes('doctor --align-execute-progress'), '提示含 doctor 对齐备选')
  assert(!r.stdout.includes('滞留：'), '新鲜变更 → 无滞留误报')
}

{
  // Case 3：新鲜 + 未全勾 → 零信号（回归保护：正常推进中的变更不打扰）
  const { cwd } = makeRepo('ps-stall-')
  const changeName = '2026-08-30-active-fresh'
  const pm = await initChange(cwd, join(cwd, '.sillyspec'), changeName)
  await seedStage(pm, cwd, changeName, 'execute', [{ name: '加载上下文', status: 'completed', output: 'ok' }])
  writeTasks(cwd, changeName, 0, 2)
  setDbState(cwd, changeName, { currentStage: 'execute', lastActive: new Date().toISOString() })

  const r = await runCapturing(() => pm.show(cwd, changeName))
  assert(!r.stdout.includes('⏳'), '新鲜 + 未全勾 → 零滞留信号')
}

{
  // Case 4：archive 已完成（流程收口）→ 零信号，即使老化 + tasks 全勾
  const { cwd } = makeRepo('ps-stall-')
  const changeName = '2026-08-30-flow-done'
  const pm = await initChange(cwd, join(cwd, '.sillyspec'), changeName)
  await seedStage(pm, cwd, changeName, 'archive', [{ name: '确认归档', status: 'completed' }], 'completed')
  writeTasks(cwd, changeName, 2, 2)
  setDbState(cwd, changeName, { currentStage: 'archive', lastActive: new Date(Date.now() - 30 * DAY_MS).toISOString() })

  const r = await runCapturing(() => pm.show(cwd, changeName))
  assert(!r.stdout.includes('⏳'), 'archive 已完成 → 零滞留信号（流程已收口）')
}

{
  // Case 5：多变更汇总视图逐行透出滞留信号（无需逐个 --change 看详情）
  const { cwd } = makeRepo('ps-stall-')
  const pm = await initChange(cwd, join(cwd, '.sillyspec'), 'stalled-old')
  await initChange(cwd, join(cwd, '.sillyspec'), 'fresh-young')
  setDbState(cwd, 'stalled-old', { currentStage: 'brainstorm', lastActive: new Date(Date.now() - 10 * DAY_MS).toISOString() })

  const r = await runCapturing(() => pm.show(cwd))
  assert(r.stdout.includes('⏳ 滞留：已 10 天无活跃'), '多变更汇总：滞留变更透出信号行')
  assert(r.stdout.includes('change-delete --change stalled-old'), '汇总滞留行带放弃建议')
}

cleanup()
report(count.passed, count.failed, count.failures)
