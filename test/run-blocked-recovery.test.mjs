/**
 * blocked 步骤死锁恢复测试（坑 deps-gate-blocked-invisible，2026-08-27 实证）。
 *
 * 实证链：enforceDepsGate/enforceReviewJsonGate 阻断时把当前步置 blocked（持久化），但
 * completeStep 的 currentIdx 谓词只查 pending/in-progress → 被阻断步骤永久隐身：
 *   - 重试 --done 落到其后第一个 pending 步骤（错步记账，DB 与事实脱节）
 *   - 裸 run execute（指引路径①「stale 会被转为 pending」）只转 stale 不转 blocked → 指引失效
 *   - 状态机卡死，只能 --reset 丢进度
 *
 * 修复锁行为：
 *   1. --done 谓词含 blocked：首个 blocked 步骤被选中并完成（不再跳步记账），stdout 提示
 *   2. 裸 run <stage>：首个非完成步骤是 blocked 时拉回 pending（与 stale 同款转换）
 *
 * 用 brainstorm（固定步骤、无 worktree 依赖）作阶段载体，避开 execute 的 deps 供给副作用。
 */
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== blocked 步骤死锁恢复（deps-gate-blocked-invisible）===\n')

console.log('--- ① --done 谓词含 blocked：完成首个 blocked 步骤而非跳到后面的 pending ---')
{
  const { cwd, specBase } = makeRepo('cli-blocked-done-')
  const cn = '2026-08-27-blocked-done'
  const pm = await initChange(cwd, specBase, cn)
  // 先跑一次拿真实步骤名（ensureStageSteps 按 def 建），再改状态：步 0 blocked、步 1 pending、其余 completed
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const real = (await pm.read(cwd, cn)).stages.brainstorm.steps
  assert(real && real.length >= 2, `brainstorm 步骤已初始化（${real ? real.length : 0} 步）`)
  const seeded = real.map((s, i) => ({
    name: s.name,
    status: i === 0 ? 'blocked' : i === 1 ? 'pending' : 'completed',
  }))
  await seedStage(pm, cwd, cn, 'brainstorm', seeded)

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '重试完成被阻断的步骤' })

  assert(r.combined.includes('此前被门控阻断'), 'stdout 提示选中了 blocked 步骤')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const steps = after.stages.brainstorm.steps
  assert(steps[0].status === 'completed', `步 0（原 blocked）被本次 --done 完成（实际 ${steps[0].status}）`)
  assert(steps[1].status === 'pending', `步 1 未被错步记账（实际 ${steps[1].status}）`)
}

console.log('\n--- ② 裸 run <stage>：首个非完成步骤是 blocked → 拉回 pending（路径①修复）---')
{
  const { cwd, specBase } = makeRepo('cli-blocked-run-')
  const cn = '2026-08-27-blocked-run'
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const real = (await pm.read(cwd, cn)).stages.brainstorm.steps
  const seeded = real.map((s, i) => ({
    name: s.name,
    status: i === 0 ? 'blocked' : 'pending',
  }))
  await seedStage(pm, cwd, cn, 'brainstorm', seeded)

  const r = runStage('brainstorm', cn, cwd, {})

  assert(r.combined.includes('拉回待执行'), 'stdout 提示 blocked → pending 转换')
  assert(r.status === 0, `裸 run 正常输出 prompt（exit ${r.status}）`)
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.brainstorm.steps[0].status === 'pending',
    `DB：blocked 已转 pending（实际 ${after.stages.brainstorm.steps[0].status}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
