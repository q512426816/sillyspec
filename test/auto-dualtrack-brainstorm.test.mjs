/**
 * auto 模式 brainstorm 双轨步骤表修复测试（2026-09-08 E2E 实证 bug）。
 *
 * 锁住：auto 表（4 步）已种入时，`run auto --done` 推进的是 auto 表（非主模式 8 步表）——
 * 修复前 completeStep 用 getStageSteps 主模式表，ensureAutoStage 下一轮判非 auto 表重种清零
 * （进度永远回 step1）；修复后 complete 路径 auto 感知（getStageStepsAutoAware）。
 */
import { makeRepo, initChange, runCLI, runStage, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'
import { join } from 'node:path'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== auto 双轨 brainstorm 步骤表（E2E 实证 bug 修复）===\n')
{
  const { cwd, specBase } = makeRepo('adt-')
  const cn = '2026-09-08-adt'
  const pm = await initChange(cwd, specBase, cn)
  // 种 auto 形态表（runAutoMode ensureAutoStage 同款）
  const p = await pm.read(cwd, cn)
  p.currentChange = cn; p.currentStage = 'brainstorm'
  p.stages.brainstorm = { status: 'in-progress', startedAt: '2026/9/8', completedAt: null, steps: [
    { name: '进度确认与上下文加载', status: 'pending' },
    { name: '需求分析与方案设计', status: 'pending' },
    { name: '生成设计产物', status: 'pending' },
    { name: '生成规范文件', status: 'pending' }] }
  await pm._write(cwd, p, cn)

  runStage('auto', cn, cwd, { done: true, output: '上下文加载完成' })
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const steps = after.stages.brainstorm.steps
  assert(steps.length === 4, `表保持 4 步 auto 形态（实际 ${steps.length}——修复前会被主模式表污染成 8）`)
  assert(steps[0].status === 'completed', `step1 completed（实际 ${steps[0].status}——修复前推进落在主模式表，auto 表纹丝不动）`)
  assert(steps[1].status === 'pending', 'step2 仍 pending')
}
cleanup()
report(count.passed, count.failed, count.failures)
