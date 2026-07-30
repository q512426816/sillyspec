/**
 * completeStep characterization — 阶段完成校验失败的统一回滚（重构 keystone）
 *
 * 重构核心动作之一：把 completeStep 里手写重复 ~6 次的
 *   rollbackStageCompletion + lastActive + pm._write + triggerSync + return {stageCompleted:false}
 * 统一进共享骨架。本测试锁住「runValidators 失败 → 回滚」的现有行为，确保统一后不变。
 *
 * 场景：brainstorm 末步（生成规范文件）完成时 design.md 缺失 →
 *   validateBrainstormOutputs 报错 → runValidators 失败 → rollbackStageCompletion 把
 *   stageData.status 从 completed 回滚为 in-progress、末步回退 pending，返回 nextPendingIdx=7。
 *
 * 断言三件套：DB 状态（status 回滚、step 回退）+ stdout（校验失败 + design.md 缺失）+ 返回值。
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { _completeStepForTest } from '../src/run.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

// brainstorm 8 步种子名（刻意用老名，走 migratedFrom 迁移路径映射到当前定义）
const BRAINSTORM_STEPS = [
  '状态检查', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
  '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '用户确认并生成规范文件',
]
function brainstormStepsWithLastPending() {
  return BRAINSTORM_STEPS.map((name, i) => ({
    name, status: i < BRAINSTORM_STEPS.length - 1 ? 'completed' : 'pending',
  }))
}

console.log('=== completeStep characterization: runValidators 失败统一回滚 ===\n')

console.log('--- brainstorm 末步 + design.md 缺失 → 回滚 ---')
{
  const { cwd, specBase } = makeRepo('cs-rollback-')
  const cn = '2026-07-25-brainstorm-rollback'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  // 故意只写 proposal/requirements/tasks，缺 design.md → validateBrainstormOutputs 必失败
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n无\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n\n- FR-001: 需求\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 做 a\n')
  const progress = await seedStage(pm, cwd, cn, 'brainstorm', brainstormStepsWithLastPending())

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'brainstorm', cwd, '生成规范完成', null,
      { changeName: cn, printNext: false, doneAnswer: '确认' }))

  assert(!r.error, '校验失败回滚不应 process.exit（优雅 return）')
  assert(r.result && r.result.stageCompleted === false, 'stageCompleted:false（被回滚）')
  assert(r.result && r.result.currentIdx === 7, 'currentIdx=7（末步）')
  assert(r.result && r.result.nextPendingIdx === 7, 'nextPendingIdx=7（回退到末步重做）')
  assert(r.stdout.includes('阶段 brainstorm 校验失败'), 'stdout 含「阶段 brainstorm 校验失败」')
  assert(r.stdout.includes('design.md'), 'stdout 点名缺失的 design.md')

  const after = await pm.read(cwd, cn)
  assert(after.stages.brainstorm.status !== 'completed',
    `DB: stage.status 已回滚（实际 ${after.stages.brainstorm.status}，不应是 completed）`)
  assert(after.stages.brainstorm.status === 'in-progress', 'DB: stage.status 回滚为 in-progress')
  const lastStep = after.stages.brainstorm.steps[7]
  assert(lastStep && lastStep.status === 'pending', 'DB: 末步回退为 pending（可重新 --done）')
}

// ── plan gate 失败：runValidators(plan) 通过 + validatePlanForExecute 失败 → 回滚 ──
// plan 完成路径 runStageCompletionGates：runValidators(plan) 先跑（validatePlanOutputs 只查
// plan.md 存在 + decisions 阻塞，不查 task 连续性），通过后进 plan 分支 validatePlanForExecute
// （execute 契约：task id 唯一+连续+name 非空）。task-01→task-03 缺 task-02 → 不连续 → 回滚。
console.log('\n--- plan 末步 + plan.md task id 不连续 → Plan→Execute Contract 回滚 ---')
{
  const { cwd, specBase } = makeRepo('cs-rollback-plan-')
  const cn = '2026-07-25-plan-rollback'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  // plan.md 有 task 但 id 不连续（task-01 → task-03，缺 task-02）→ validatePlanForExecute 失败
  // 不写 decisions.md（避免 P0/P1 阻塞 error 让 runValidators 先失败）
  writeFileSync(join(changeDir, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [ ] task-01: a\n- [ ] task-03: c\n')
  const PLAN_STEPS = ['复杂度分类与上下文加载', '生成分级计划', '审查计划']
  const progress = await seedStage(pm, cwd, cn, 'plan',
    PLAN_STEPS.map((name, i) => ({ name, status: i < PLAN_STEPS.length - 1 ? 'completed' : 'pending' })))

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'plan', cwd, '计划审查完成', null,
      { changeName: cn, printNext: false, doneAnswer: '确认' }))

  assert(!r.error, 'plan gate 失败回滚不应 process.exit（优雅 return）')
  assert(r.result && r.result.stageCompleted === false, 'stageCompleted:false（被回滚）')
  assert(r.result && r.result.nextPendingIdx === 2, 'nextPendingIdx=2（回退末步重做）')
  assert(r.stdout.includes('Plan → Execute Contract 校验失败'), 'stdout 含「Plan → Execute Contract 校验失败」')
  assert(r.stdout.includes('task id 不连续'), 'stdout 点名 task id 不连续')
  assert(!r.stdout.includes('阶段 plan 校验失败'), 'stdout 不含 runValidators 失败（plan.md 产物本身齐全）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.plan.status !== 'completed', 'DB: plan status 已回滚（非 completed）')
  assert(after.stages.plan.steps[2].status === 'pending', 'DB: plan 末步回退 pending')
}

// ── execute enforceDepsGate：execute 完成路径第一道门（run.js:3446，在 runStageCompletionGates 之前）──
// execute --done 时若无 worktree meta → enforceDepsGate exit(1) + doctor 修复提示。
// 这是 execute 完成路径最先触发的 gate（先于 runValidators/Stage Review/Task Review）。
// 完整 Task Review gate 失败（3303）需先过此门 + worktree fixture + evidence + Stage Review，
// 构造复杂（要真实 git worktree + review.json），留后续 execute 完成路径集成测试。
console.log('\n--- execute 无 worktree → enforceDepsGate 阻断 exit(1) ---')
{
  const { cwd, specBase } = makeRepo('cs-exec-deps-')
  const cn = '2026-07-25-execute-deps'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [ ] task-01: do X\n')
  const progress = await seedStage(pm, cwd, cn, 'execute',
    [{ name: 'Wave 1 执行', status: 'pending' }])

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'execute', cwd, '执行完成', null,
      { changeName: cn, printNext: false }))

  assert(r.exitCode === 1, 'enforceDepsGate 阻断 → exit(1)')
  assert(r.stdout.includes('deps 门控阻断'), 'stdout 含「deps 门控阻断」')
  assert(r.stdout.includes('worktree 不可用'), 'stdout 点名 worktree 不可用')
  assert(r.stdout.includes('doctor --align-execute-progress'), 'stdout 含 doctor 修复提示')

  const after = await pm.read(cwd, cn)
  assert(after.stages.execute.status !== 'completed', 'DB: execute 未推进（enforceDepsGate 在完成前阻断）')
}

cleanup()
report(count.passed, count.failed, count.failures)

