/**
 * 阶段完成校验失败的统一回滚 CLI 行为测试。
 *
 * 从 _completeStepForTest 内部函数迁移为 CLI 子进程测试。锁住 runValidators / Plan→Execute
 * Contract 失败 → 统一回滚（graceful return，CLI exit 0，靠 DB + stdout 判定），以及
 * execute enforceDepsGate 失败 → exit(1) 的行为。
 *
 *   - brainstorm 末步 + design.md 缺失 → validateBrainstormOutputs 失败 → 回滚（status→in-progress，末步 pending）
 *   - plan 末步 + plan.md task id 不连续 → Plan→Execute Contract 失败 → 回滚
 *   - execute --done 无 worktree meta → enforceDepsGate 阻断 exit(1)
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const BRAINSTORM_STEPS = [
  '进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
  '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件',
]
function brainstormStepsWithLastPending() {
  return BRAINSTORM_STEPS.map((name, i) => ({
    name, status: i < BRAINSTORM_STEPS.length - 1 ? 'completed' : 'pending',
  }))
}

console.log('=== runValidators / Contract 失败统一回滚 CLI 行为 ===\n')

console.log('--- brainstorm 末步 + design.md 缺失 → 回滚（exit 0，靠 DB + stdout 判定）---')
{
  const { cwd, specBase } = makeRepo('cli-rollback-')
  const cn = '2026-07-25-brainstorm-rollback'
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  await seedStage(pm, cwd, cn, 'brainstorm', brainstormStepsWithLastPending())
  const changeDir = join(specBase, 'changes', cn)
  // 故意只写 proposal/requirements/tasks，缺 design.md → validateBrainstormOutputs 必失败
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n无\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n\n- FR-001: 需求\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 做 a\n')

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '生成规范完成', answer: '确认' })

  // 回滚走优雅 return（不 process.exit），CLI 退出码 0
  assert(r.combined.includes('阶段 brainstorm 校验失败') || r.combined.includes('校验失败'), 'stdout 含「阶段 brainstorm 校验失败」')
  assert(r.combined.includes('design.md'), 'stdout 点名缺失的 design.md')

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.brainstorm.status !== 'completed',
    `DB: stage.status 已回滚（实际 ${after.stages.brainstorm.status}，不应是 completed）`)
  assert(after.stages.brainstorm.status === 'in-progress', 'DB: stage.status 回滚为 in-progress')
  const lastStep = after.stages.brainstorm.steps[after.stages.brainstorm.steps.length - 1]
  assert(lastStep && lastStep.status === 'pending', 'DB: 末步回退为 pending（可重新 --done）')
}

// ── plan gate 失败：runValidators(plan) 通过 + validatePlanForExecute 失败 → 回滚 ──
// plan.md 有 task 但 id 不连续（task-01 → task-03，缺 task-02）→ validatePlanForExecute 失败。
// plan 步骤是动态的（buildPlanSteps 按 plan.md 任务数生成），先 run plan init 拿真实步骤名，
// 再 seedStage 把前 N-1 步标 completed、末步（Wave 重排/postcheck）pending，--done 触发阶段完成
// → Plan→Execute Contract 校验 → 不连续 → 回滚。
console.log('\n--- plan 末步 + plan.md task id 不连续 → Plan→Execute Contract 回滚 ---')
{
  const { cwd, specBase } = makeRepo('cli-rollback-plan-')
  const cn = '2026-07-25-plan-rollback'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  // plan.md 有 task 但 id 不连续（task-01 → task-03，缺 task-02）→ validatePlanForExecute 失败
  // 不写 decisions.md（避免 P0/P1 阻塞 error 让 runValidators 先失败）
  writeFileSync(join(changeDir, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [ ] task-01: a\n- [ ] task-03: c\n')
  // plan.module-impact.exists(large) 要求——补上让校验过，聚焦 Contract 不连续
  writeFileSync(join(changeDir, 'module-impact.md'), '# 模块影响分析（Module Impact）— plan-rollback\n\n测试占位\n')
  // noAI 硬门（ql-20260814-005 noai-done-bypass）：--done 落到 postcheck step 时 completeStep
  // 先执行 executePlanPostcheck（校验 tasks/ 卡片），须卡片连续齐全通过后才能到达
  // Plan→Execute Contract（校验 plan.md checkbox）。卡片故意连续（01/02/03）而 plan.md
  // checkbox 不连续（缺 task-02）→ 两层校验对象不同，聚焦 Contract 的不连续拦截。
  mkdirSync(join(changeDir, 'tasks'))
  for (const n of ['01', '02', '03']) {
    writeFileSync(join(changeDir, 'tasks', `task-${n}.md`), [
      '---',
      `id: task-${n}`,
      `title: t${n}`,
      `title_zh: t${n}`,
      'author: test',
      'created_at: 2026-08-14 00:00:00',
      'priority: P0',
      'depends_on: []',
      'blocks: []',
      'allowed_paths:',
      `  - file${n}.md`,
      'goal: >',
      '  测试占位卡。',
      'implementation:',
      '  - 占位',
      'acceptance:',
      '  - 占位',
      'verify:',
      '  - echo ok',
      'constraints:',
      '  - 无',
      '---',
      ''
    ].join('\n'))
  }
  runCLI(['--dir', cwd, 'run', 'plan', '--change', cn], { cwd })
  // 读真实 plan 步骤（动态生成），seed 为「除末步外 completed」
  const seeded = (await pm.read(cwd, cn)).stages.plan.steps
    .map((s, i, arr) => ({ name: s.name, status: i < arr.length - 1 ? 'completed' : 'pending' }))
  await seedStage(pm, cwd, cn, 'plan', seeded)

  const r = runStage('plan', cn, cwd, { done: true, output: '计划审查完成', answer: '确认' })

  assert(r.combined.includes('Plan → Execute Contract 校验失败') || r.combined.includes('Contract 校验失败'), 'stdout 含「Plan → Execute Contract 校验失败」')
  assert(r.combined.includes('task id 不连续') || r.combined.includes('不连续'), 'stdout 点名 task id 不连续')
  assert(!r.combined.includes('阶段 plan 校验失败'), 'stdout 不含 runValidators 失败（plan.md 产物本身齐全）')

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.plan.status !== 'completed', 'DB: plan status 已回滚（非 completed）')
  assert(after.stages.plan.steps[after.stages.plan.steps.length - 1].status === 'pending', 'DB: plan 末步回退 pending')
}

// ── execute enforceDepsGate：execute 完成路径第一道门（在 runStageCompletionGates 之前）──
// execute --done 时若无 worktree meta → enforceDepsGate exit(1) + doctor 修复提示。
// 关键：不跑 `run execute` init（那会创建 worktree + meta 让 gate 放行）；直接 seed 步骤，
// ensureStageSteps 在 --done 时按 plan.md 重建步骤（全 pending），enforceDepsGate 在完成首步前
// 因无 worktree meta 阻断。
console.log('\n--- execute 无 worktree → enforceDepsGate 阻断 exit(1) ---')
{
  const { cwd, specBase } = makeRepo('cli-exec-deps-')
  const cn = '2026-07-25-execute-deps'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [ ] task-01: do X\n')
  // 不跑 run execute（避免建 worktree meta）；seed 单步让 ensureStageSteps 在 --done 时重建
  await seedStage(pm, cwd, cn, 'execute', [{ name: 'Wave 1 执行', status: 'pending' }])
  const r = runStage('execute', cn, cwd, { done: true, output: '执行完成' })

  assert(r.status === 1, `enforceDepsGate 阻断 → exit(1)（实际 ${r.status}，输出尾：${r.combined.slice(-120)}）`)
  assert(r.combined.includes('deps 门控阻断'), 'stdout 含「deps 门控阻断」')
  assert(r.combined.includes('worktree 不可用'), 'stdout 点名 worktree 不可用')
  assert(r.combined.includes('doctor --align-execute-progress'), 'stdout 含 doctor 修复提示')

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.execute.status !== 'completed', 'DB: execute 未推进（enforceDepsGate 在完成前阻断）')
}

cleanup()
report(count.passed, count.failed, count.failures)
