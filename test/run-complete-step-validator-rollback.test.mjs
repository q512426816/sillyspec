/**
 * completeStep characterization — 阶段完成校验失败的统一回滚（重构 keystone）
 *
 * 重构核心动作之一：把 completeStep 里手写重复 ~6 次的
 *   rollbackStageCompletion + lastActive + pm._write + triggerSync + return {stageCompleted:false}
 * 统一进共享骨架。本测试锁住「runValidators 失败 → 回滚」的现有行为，确保统一后不变。
 *
 * 场景：brainstorm 末步（用户确认并生成规范文件，requiresWait）完成时 design.md 缺失 →
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

// brainstorm 8 步定义名（与 src/stages/brainstorm.js 一致）
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

cleanup()
report(count.passed, count.failed, count.failures)

