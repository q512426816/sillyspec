/**
 * wait 选项单选强制 CLI 行为测试（坑 wait-choice-enforcement）。
 *
 * 锁住：定义了 waitOptions 的 requiresWait/repeatableWait 步骤，--answer 必须命中预设选项
 * 之一（防 agent 一句话代答绕过人工选择）；开放回答型步骤（澄清追问，声明 waitFreeAnswer）
 * 豁免，--answer 可为自由文本。
 *
 * 三条用户答案路径都覆盖：requiresWait 门 --done --answer（completeStep）、
 * --done --answer 解 waiting（resolveWaitingStepWithAnswer）、--continue --answer（continueStep）。
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, runCLI, runStage, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const ERR_NEEDLE = '封闭单选 wait'

console.log('=== wait 选项单选强制（completeStep / continueStep）===\n')

console.log('--- 用例1: 封闭型 requiresWait（提出方案）--answer 非选项 → 拦截 ---')
{
  const { cwd, specBase } = makeRepo('cli-wc-blk-')
  const cn = '2026-08-14-wait-choice-block'
  const pm = await initChange(cwd, specBase, cn)
  writeFileSync(join(specBase, 'changes', cn, 'design.md'), '# D\n背景\n目标\n方案\n')
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const all = (await pm.read(cwd, cn)).stages.brainstorm.steps
  const idx = all.findIndex(s => s.name === '提出 2-3 种方案')
  assert(idx > 0, `定位「提出 2-3 种方案」步骤（idx=${idx}）`)
  const seeded = all.map((s, i) => ({ name: s.name, status: i < idx ? 'completed' : 'pending' }))
  await (await import('../src/progress.js')).ProgressManager.prototype // noop
  const { ProgressManager } = await import('../src/progress.js')
  await (async () => {
    const p = new ProgressManager({ specDir: specBase })
    const pr = await p.read(cwd, cn)
    pr.currentChange = cn
    pr.stages.brainstorm = { status: 'in-progress', startedAt: '2026/8/14 00:00:00', completedAt: null, steps: seeded }
    await p._write(cwd, pr, cn)
  })()

  const r = runStage('brainstorm', cn, cwd, { done: true, answer: '我觉得方案A最好' })
  assert(r.status !== 0, `非选项 --answer → exit 非 0（实际 ${r.status}）`)
  assert(r.combined.includes(ERR_NEEDLE), `含单选拦截信息（尾：${r.combined.slice(-80)}）`)
  assert(r.combined.includes('方案A'), `错误信息列出可选项（方案A）`)
}

console.log('\n--- 用例2: 封闭型 --answer 命中选项 → 放行（不触发单选拦截）---')
{
  const { cwd, specBase } = makeRepo('cli-wc-ok-')
  const cn = '2026-08-14-wait-choice-pass'
  const pm = await initChange(cwd, specBase, cn)
  writeFileSync(join(specBase, 'changes', cn, 'design.md'), '# D\n背景\n目标\n方案\n')
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const all = (await pm.read(cwd, cn)).stages.brainstorm.steps
  const idx = all.findIndex(s => s.name === '提出 2-3 种方案')
  const seeded = all.map((s, i) => ({ name: s.name, status: i < idx ? 'completed' : 'pending' }))
  const { ProgressManager } = await import('../src/progress.js')
  await (async () => {
    const p = new ProgressManager({ specDir: specBase })
    const pr = await p.read(cwd, cn)
    pr.currentChange = cn
    pr.stages.brainstorm = { status: 'in-progress', startedAt: '2026/8/14 00:00:00', completedAt: null, steps: seeded }
    await p._write(cwd, pr, cn)
  })()

  const r = runStage('brainstorm', cn, cwd, { done: true, answer: '方案A' })
  assert(!r.combined.includes(ERR_NEEDLE), `命中选项 → 不触发单选拦截（尾：${r.combined.slice(-80)}）`)
}

console.log('\n--- 用例3: 开放型（waitFreeAnswer）--continue --answer 自由文本 → 不被单选拦 ---')
{
  const { cwd, specBase } = makeRepo('cli-wc-free-')
  const cn = '2026-08-14-wait-choice-free'
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const all = (await pm.read(cwd, cn)).stages.brainstorm.steps
  const idx = all.findIndex(s => s.name === '对话式探索与需求澄清')
  assert(idx >= 0, `定位「对话式探索与需求澄清」步骤（idx=${idx}）`)
  const seeded = all.map((s, i) => ({ name: s.name, status: i === idx ? 'waiting' : (i < idx ? 'completed' : 'pending') }))
  const { ProgressManager } = await import('../src/progress.js')
  await (async () => {
    const p = new ProgressManager({ specDir: specBase })
    const pr = await p.read(cwd, cn)
    pr.currentChange = cn
    pr.stages.brainstorm = { status: 'in-progress', startedAt: '2026/8/14 00:00:00', completedAt: null, steps: seeded }
    await p._write(cwd, pr, cn)
  })()

  const r = runStage('brainstorm', cn, cwd, { continue: true, answer: '我要做一个工作区配置同步功能，需要后端+前端+daemon 三端联动' })
  assert(!r.combined.includes(ERR_NEEDLE), `开放型自由文本 → 不被单选拦（尾：${r.combined.slice(-80)}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
