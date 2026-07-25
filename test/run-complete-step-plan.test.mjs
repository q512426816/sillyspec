/**
 * completeStep characterization — plan 阶段 generate_plan 动态插入步骤
 *
 * 锁住 completeStep 内 plan 分支（run.js:3019-3059）的现有行为：
 * generate_plan 步骤完成时，若 plan.md 已含任务，按 buildPlanSteps 在当前步后动态
 * 插入 coordinator（生成 TaskCard）+ postcheck（Wave 重排与可行性校验）步骤。
 *
 * 场景：plan steps=[classify✓, generate_plan pending, review_plan pending]（无任务时的
 * 3 步形态），plan.md 含 1 个 task → 完成 generate_plan 后插入 2 步，progress 变 5 步。
 *
 * 断言：stdout「已动态插入 2 个步骤」+ DB（steps 含 TaskCard / Wave 重排）+ 返回 nextPendingIdx=2。
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { _completeStepForTest } from '../src/run.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== completeStep characterization: plan generate_plan 动态插入 ===\n')

console.log('--- 完成 generate_plan + plan.md 含 task → 插入 coordinator+postcheck ---')
{
  const { cwd, specBase } = makeRepo('cs-plan-')
  const cn = '2026-07-25-plan-insert'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [ ] task-01: 做 foo\n')
  // 无任务时 buildPlanSteps 返回 3 步（fixedPrefix），与初始 progress 一致
  const steps = [
    { name: '复杂度分类与上下文加载', status: 'completed' },
    { name: '生成分级计划', status: 'pending' },           // generate_plan（按名匹配前的占位）
    { name: '审查计划', status: 'pending' },
  ]
  const progress = await seedStage(pm, cwd, cn, 'plan', steps)

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'plan', cwd, '计划已生成', null,
      { changeName: cn, printNext: false, doneAnswer: '确认' }))

  assert(!r.error, 'generate_plan 完成不应 process.exit')
  assert(r.stdout.includes('已动态插入 2 个步骤'), 'stdout 含「已动态插入 2 个步骤」')
  assert(r.result && r.result.stageCompleted === false, '非末步 → stageCompleted:false')
  assert(r.result && r.result.currentIdx === 1, 'currentIdx=1（generate_plan）')
  assert(r.result && r.result.nextPendingIdx === 2, 'nextPendingIdx=2（首个插入步）')

  const after = await pm.read(cwd, cn)
  const names = after.stages.plan.steps.map(s => s.name)
  assert(names.length === 5, `DB: plan steps 扩到 5 步（实际 ${names.length}）`)
  assert(names[2].includes('TaskCard'), `DB: steps[2] 为 coordinator（实际 ${names[2]}）`)
  assert(names[3] === 'Wave 重排与可行性校验', `DB: steps[3] 为 postcheck（实际 ${names[3]}）`)
  assert(names[4] === '审查计划', 'DB: 原 review_plan 被推到末尾（idx4）')
}

cleanup()
report(count.passed, count.failed, count.failures)
