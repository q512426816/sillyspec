/**
 * 主流程 Step1「进度确认」noAI 化（progressConfirm 动作）CLI 行为测试。
 *
 * 锁住：
 *  1. run 路径：`run brainstorm` 首步自动执行（CLI 自动执行 + 快照输出），step1 落库
 *     completed，渲染直接推进到 step2（加载项目上下文）——省一轮 agent 复述往返；
 *  2. 自动生成变更名（YYYY-MM-DD-new-change-<hex>）→ 打印 change-rename 建议（不阻塞推进）；
 *     语义化名不打印；
 *  3. --done 路径（坑 noai-done-bypass 同族）：对 step1 直接 --done 同样执行动作并推进；
 *  4. verify 档：CLI 在 --done 统一跑测试的提示随快照输出；
 *  5. execute 档：tasks 勾选计数注入（readPlanCheckboxStatus 同源）。
 */
import { makeRepo, initChange, seedStage, runStage, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'
import { executeProgressConfirm } from '../src/run/progress-confirm.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

// seedStage 产物不带 currentStage——同阶段重复运行放行（checkTransition fromStage===toStage）
async function seedAtStage(pm, cwd, cn, stageName, steps) {
  const progress = await seedStage(pm, cwd, cn, stageName, steps)
  progress.currentStage = stageName
  await pm._write(cwd, progress, cn)
  return progress
}

console.log('=== Step1「进度确认」noAI（progressConfirm）===\n')

console.log('--- 用例1: run brainstorm → step1 自动执行 + 推进渲染 step2 + 自动名 rename 建议 ---')
{
  const { cwd, specBase } = makeRepo('cli-pc-auto-')
  const cn = '2026-09-07-new-change-deadbeef'
  const pm = await initChange(cwd, specBase, cn)
  // 首跑让 CLI 建步骤 schema，随后重置 step1 为 pending 模拟新会话首进
  const first = runStage('brainstorm', cn, cwd)
  const p1 = await pm.read(cwd, cn)
  const steps1 = p1.stages.brainstorm.steps.map(s => ({ name: s.name, status: s.name === '进度确认' ? 'pending' : s.status }))
  await seedAtStage(pm, cwd, cn, 'brainstorm', steps1)

  const r = runStage('brainstorm', cn, cwd)

  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(r.combined.includes('CLI 自动执行'), 'stdout 含「CLI 自动执行」标识')
  assert(r.combined.includes('进度快照'), 'stdout 含进度快照输出')
  assert(r.combined.includes('疑似自动生成') && r.combined.includes('change-rename'), '自动生成变更名 → 打印 change-rename 建议')
  assert(r.combined.includes('加载项目上下文'), '自动推进渲染 step2「加载项目上下文」prompt')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const s1 = after.stages.brainstorm.steps.find(s => s.name === '进度确认')
  assert(s1 && s1.status === 'completed', `DB: step1 已 completed（实际 ${s1?.status}）`)
}

console.log('\n--- 用例2: 语义化变更名 → 无 rename 建议；--done 路径同样执行动作 ---')
{
  const { cwd, specBase } = makeRepo('cli-pc-named-')
  const cn = '2026-09-07-fix-login-flow'
  const pm = await initChange(cwd, specBase, cn)
  runStage('brainstorm', cn, cwd) // 建 schema
  const p1 = await pm.read(cwd, cn)
  const steps1 = p1.stages.brainstorm.steps.map(s => ({ name: s.name, status: s.name === '进度确认' ? 'pending' : s.status }))
  await seedAtStage(pm, cwd, cn, 'brainstorm', steps1)

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '' })

  assert(!r.combined.includes('疑似自动生成'), '语义化名 → 无 rename 建议')
  assert(r.combined.includes('CLI 自动执行') || r.combined.includes('noAI'), '--done 路径执行 noAI 动作')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const s1 = after.stages.brainstorm.steps.find(s => s.name === '进度确认')
  assert(s1 && s1.status === 'completed', `DB: --done 路径 step1 completed（实际 ${s1?.status}）`)
}

console.log('\n--- 用例3: run verify → 测试统一执行提示随快照输出 ---')
{
  const { cwd, specBase } = makeRepo('cli-pc-verify-')
  const cn = '2026-09-07-verify-notice'
  const pm = await initChange(cwd, specBase, cn)
  // verify 步骤 schema：首跑建立（step1 noAI 会自动执行——正好锁 run 路径行为）
  const r = runStage('verify', cn, cwd)

  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(r.combined.includes('统一执行') || r.combined.includes('统一跑测试'), 'verify 档输出「CLI 在 --done 统一执行测试」提示')
  assert(r.combined.includes('CLI 自动执行'), 'verify step1 noAI 自动执行')
}

console.log('\n--- 用例4（单元）: execute 档 tasks 勾选计数 + fail-soft ---')
{
  const lines = []
  const origLog = console.log
  console.log = (...a) => lines.push(a.join(' '))
  try {
    // 正常计数：stub pm.readPlanCheckboxStatus
    executeProgressConfirm({
      stageName: 'execute', cwd: '/tmp/x', changeName: '2026-09-07-cnt',
      stageData: { steps: [{ status: 'completed' }, { status: 'pending' }] },
      pm: { _getSpecDir: () => '/tmp/x/.sillyspec', readPlanCheckboxStatus: () => ({ total: 3, checked: 1 }) },
    })
    // fail-soft：readPlanCheckboxStatus throw 不炸
    executeProgressConfirm({
      stageName: 'execute', cwd: '/tmp/x', changeName: '2026-09-07-cnt',
      stageData: { steps: [{ status: 'completed' }] },
      pm: { _getSpecDir: () => '/tmp/x/.sillyspec', readPlanCheckboxStatus: () => { throw new Error('no plan') } },
    })
    // 无 pm：跳过计数段
    executeProgressConfirm({
      stageName: 'verify', cwd: '/tmp/x', changeName: 'c',
      stageData: { steps: [{ status: 'completed' }] },
    })
  } finally {
    console.log = origLog
  }
  const out = lines.join('\n')
  assert(out.includes('任务勾选：tasks 1/3'), 'execute 档注入 tasks 勾选计数（1/3）')
  assert(out.includes('2/2 已完成') || out.includes('1/1 已完成'), '快照含步骤计数')
  assert(out.includes('统一执行'), 'verify 档含测试提示')
  assert(out.split('任务勾选').length - 1 === 1, 'throw/无 pm 场景不重复打印计数（fail-soft）')
}

cleanup()
report(count.passed, count.failed, count.failures)
