/**
 * plan 阶段 generate_plan 动态插入步骤 CLI 行为测试。
 *
 * 从 _completeStepForTest 内部函数迁移为 CLI 子进程测试。锁住：完成 generate_plan 且 plan.md
 * 含 task 时，TaskCard + postcheck 步骤出现在 plan 进度中（动态插入或 ensureStageSteps 重建，
 * 两者在 CLI 流程中协同产出 5 步）。
 *
 * 注：内部插入处理器与 ensureStageSteps 对 review_plan 的位置有不同处理（插入序把 review 推到
 * 末尾；buildPlanSteps 序把 review 放在 TaskCard 前）。CLI 流程走 buildPlanSteps 序，故只断言
 * TaskCard/postcheck 步骤存在 + 总数 5，不断言 review 的具体位置（那是内部插入序的细节）。
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== plan generate_plan 动态插入 CLI 行为 ===\n')

console.log('--- 完成 generate_plan + plan.md 含 task → TaskCard/postcheck 步骤出现 ---')
{
  const { cwd, specBase } = makeRepo('cli-plan-')
  const cn = '2026-07-25-plan-insert'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  // 先写无 task plan.md → init 得到无任务步骤形态
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n（暂无任务）\n')
  runCLI(['--dir', cwd, 'run', 'plan', '--change', cn], { cwd })
  // seed：classify completed，generate_plan pending（让 --done 完成它触发动态插入）
  const seeded = (await pm.read(cwd, cn)).stages.plan.steps
    .map(s => ({ name: s.name, status: s.name === '复杂度分类与上下文加载' ? 'completed' : 'pending' }))
  await seedStage(pm, cwd, cn, 'plan', seeded)
  // 现在 plan.md 加 task（generate_plan 完成时按 task 数动态插入/重建步骤）
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [ ] task-01: 做 foo\n')

  const r = runStage('plan', cn, cwd, { done: true, output: '计划已生成', answer: '确认' })

  assert(r.status === 0, `exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-100)}）`)
  assert(r.combined.includes('已动态插入') || r.combined.includes('TaskCard'), 'stdout 含动态插入/TaskCard 提示')

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const names = after.stages.plan.steps.map(s => s.name)
  assert(names.length === 5, `DB: plan steps 扩到 5 步（实际 ${names.length}：${JSON.stringify(names)}）`)
  assert(names.some(n => n.includes('TaskCard')), 'DB: 含 coordinator 步骤（生成 TaskCard）')
  assert(names.some(n => n.includes('Wave 重排与可行性校验')), 'DB: 含 postcheck 步骤')
  // generate_plan（生成分级计划）已 completed
  const gp = after.stages.plan.steps.find(s => s.name === '生成分级计划')
  assert(gp && gp.status === 'completed', 'DB: generate_plan 已 completed')
}

cleanup()
report(count.passed, count.failed, count.failures)
