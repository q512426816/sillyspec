/**
 * 坑 execute-step-table-drift 回归：plan.md Wave 数中途修改后的步骤表漂移治理
 *
 * 背景（2026-08-20 实证）：execute 步骤由 plan.md 动态构建，DB 快照在启动时播种；plan 中途改
 * Wave 数后 DB 与重算定义错位（17/12 交替报错但仍在推进——门控/prompt 施加到错误步骤）。
 *
 * 锁定语义：
 *   1. ensureStageSteps：DB 与定义步数不一致 → 按名保留完成态重播种 + 显式 ⚠️ 漂移告警（不再静默）
 *   2. completeStep：def 与 DB 步数错位（同命令进程内 plan 再变等 TOCTOU）→ fail-closed 中止
 *      --done（exit 1 + 漂移说明 + 重跑指引），不再错位推进
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { completeStep } from '../src/run/complete.js'
import { ensureStageSteps } from '../src/run/command.js'
import { getStageSteps } from '../src/run/shared.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== execute 步骤表漂移治理（坑 execute-step-table-drift）===\n')

console.log('--- ① ensureStageSteps 漂移重播种：显式告警 + 按名保留完成态 ---')
{
  const { cwd, specBase } = makeRepo('drift-seed-')
  const cn = '2026-08-20-drift-seed'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: 甲\n- [ ] task-02: 乙\n')
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- task-01\n\n## Wave 2\n\n- task-02\n')

  const progress = await pm.read(cwd, cn)
  const def = await getStageSteps('execute', cwd, progress, null)
  assert(Array.isArray(def) && def.length > 0, `execute 定义可构建（${def.length} 步）`)

  // 模拟漂移：DB 种入 def.length + 2 步（首步 completed，当前步 pending）
  const dbSteps = [
    ...def.slice(0, 2).map(s => ({ name: s.name, status: 'completed' })),
    { name: '漂移多余步骤', status: 'pending' },
    { name: '另一多余步骤', status: 'pending' },
  ]
  await seedStage(pm, cwd, cn, 'execute', dbSteps)

  const fresh = await pm.read(cwd, cn)
  const r = await runCapturing(() => ensureStageSteps(fresh, 'execute', cwd, null))
  assert(r.result === true, '返回 true（需重播种落盘）')
  assert(r.stdout.includes('漂移'), '输出含 ⚠️ 漂移告警（不再静默）')
  assert(r.stdout.includes(`${dbSteps.length} 步 → 定义 ${def.length} 步`), '告警含 旧→新 步数')
  assert(fresh.stages.execute.steps.length === def.length, `重播种后 DB 步数对齐定义（${fresh.stages.execute.steps.length}）`)
  const kept = fresh.stages.execute.steps.find(s => s.name === def[0].name)
  assert(kept && kept.status === 'completed', '同名步骤完成态被保留')
  assert(!fresh.stages.execute.steps.some(s => s.name === '漂移多余步骤'), '定义中不存在的步骤被移除')
  cleanup()
}

console.log('--- ② completeStep 漂移守卫：def 与 DB 错位 → fail-closed 中止 ---')
{
  const { cwd, specBase } = makeRepo('drift-guard-')
  const cn = '2026-08-20-drift-guard'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: 甲\n')
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- task-01\n')
  const progress = await pm.read(cwd, cn)
  const def = await getStageSteps('execute', cwd, progress, null)

  // DB 只种 2 步（与 def.length 错位），当前步 pending —— 模拟同命令进程内 plan 又变 / 绕过入口重播种的直调
  await seedStage(pm, cwd, cn, 'execute', [
    { name: '加载上下文', status: 'completed' },
    { name: 'Wave 1 执行', status: 'pending' },
  ])
  const fresh = await pm.read(cwd, cn)
  assert(fresh.stages.execute.steps.length !== def.length, `前置：DB ${fresh.stages.execute.steps.length} ≠ def ${def.length}（错位成立）`)

  const r = await runCapturing(() => completeStep(pm, fresh, 'execute', cwd, 'Wave 1 完成', '', {
    changeName: cn, platformOpts: {},
  }))
  assert(r.exitCode === 1, `中止 exit(1)（实得 ${r.exitCode}）`)
  assert(r.stdout.includes('漂移'), '报错点名漂移')
  assert(r.stdout.includes('重跑'), '给出重跑自愈指引')
  const after = await pm.read(cwd, cn)
  assert(after.stages.execute.steps[1].status === 'pending', 'DB 未被错位推进（Wave 1 执行仍 pending）')
  cleanup()
}

console.log('--- ③ 无漂移时零回归：步数一致 → completeStep 正常路径（不触发守卫报错） ---')
{
  const { cwd, specBase } = makeRepo('drift-clean-')
  const cn = '2026-08-20-drift-clean'
  const pm = await initChange(cwd, specBase, cn)
  const progress0 = await pm.read(cwd, cn)
  const def = await getStageSteps('execute', cwd, progress0, null)
  // DB 与 def 完全一致（名+数），首步 pending
  await seedStage(pm, cwd, cn, 'execute', def.map(s => ({ name: s.name, status: 'pending' })))
  const fresh = await pm.read(cwd, cn)
  const r = await runCapturing(() => completeStep(pm, fresh, 'execute', cwd, '首步完成', '', {
    changeName: cn, platformOpts: {},
  }))
  assert(!r.stdout.includes('步骤表与当前阶段定义漂移'), '无漂移不触发守卫（守卫零误报）')
  // exit 可能来自其它正常门控（fixture 无 worktree meta 等），只锁「不是漂移守卫拦的」
  assert(!r.stdout.includes('防止错位门控'), '中止原因不是漂移守卫（其余门控行为不在此锁）')
  cleanup()
}

report(count.passed, count.failed, count.failures)
