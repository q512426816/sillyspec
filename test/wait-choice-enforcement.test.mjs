/**
 * wait 步骤 --answer 行为测试（坑 wait-choice-enforcement 移除，2026-08-16）。
 *
 * 历史：43d4531 曾加 enforceWaitChoice（--answer 必须命中 waitOptions 全等匹配，防 AI
 * 代答）。实证误伤人工选择：AskUserQuestion 回传的标签是「方案 A 读侧扩展（推荐）」
 * 形态（选项词 + 附注），全等必失配；且人工 Other 自由填值也被拦。字符串匹配在原理上
 * 区分不了谁答的，防不了故意代答（读报错抄选项即过）只伤真人——经用户拍板整道移除。
 *
 * 现在锁住的契约：
 * 1. requiresWait 步骤 --done --answer 带自由文本（人工转述/Other 填值）→ 放行完成，
 *    waitAnswer 落原始回答。
 * 2. --continue --answer 自由文本解 waiting → 放行，waitAnswer 落原始回答。
 * 3. requiresWait 门本身保留：--done 不带 --answer → 仍拦截（fail-loud）。
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, runCLI, runStage, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

async function seedBrainstorm(specBase, cwd, cn, steps) {
  const { ProgressManager } = await import('../src/progress.js')
  const p = new ProgressManager({ specDir: specBase })
  const pr = await p.read(cwd, cn)
  pr.currentChange = cn
  pr.stages.brainstorm = { status: 'in-progress', startedAt: '2026/8/16 00:00:00', completedAt: null, steps }
  await p._write(cwd, pr, cn)
}

async function locateProposeStep(pm, cwd, specBase, cn) {
  const all = (await pm.read(cwd, cn)).stages.brainstorm.steps
  const idx = all.findIndex(s => s.name === '提出 2-3 种方案')
  assert(idx > 0, `定位「提出 2-3 种方案」步骤（idx=${idx}）`)
  return { all, idx }
}

console.log('=== wait --answer 自由文本放行（单选强制已移除）===\n')

console.log('--- 用例1: 封闭选项步 --done --answer 带人工转述文本 → 放行，waitAnswer 落原文 ---')
{
  const { cwd, specBase } = makeRepo('cli-wa-free-')
  const cn = '2026-08-16-wait-freeform-done'
  const pm = await initChange(cwd, specBase, cn)
  writeFileSync(join(specBase, 'changes', cn, 'design.md'), '# D\n背景\n目标\n方案\n')
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const { all, idx } = await locateProposeStep(pm, cwd, specBase, cn)
  const seeded = all.map((s, i) => ({ name: s.name, status: i < idx ? 'completed' : 'pending' }))
  await seedBrainstorm(specBase, cwd, cn, seeded)

  const r = runStage('brainstorm', cn, cwd, { done: true, answer: '方案 A 读侧扩展（推荐）' })
  assert(r.status === 0, `转述文本 --answer → exit 0（实际 ${r.status}；尾：${r.combined.slice(-100)}）`)
  const after = await pm.read(cwd, cn)
  const s = after.stages.brainstorm.steps[idx]
  assert(s.status === 'completed', `步骤 completed（实际 ${s.status}）`)
  assert(s.waitAnswer === '方案 A 读侧扩展（推荐）', `waitAnswer 落原始回答（实际 ${JSON.stringify(s.waitAnswer)}）`)
}

console.log('\n--- 用例2: --continue --answer 自由文本解 waiting → 放行，waitAnswer 落原文 ---')
{
  const { cwd, specBase } = makeRepo('cli-wa-cont-')
  const cn = '2026-08-16-wait-freeform-continue'
  const pm = await initChange(cwd, specBase, cn)
  writeFileSync(join(specBase, 'changes', cn, 'design.md'), '# D\n背景\n目标\n方案\n')
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const { all, idx } = await locateProposeStep(pm, cwd, specBase, cn)
  const seeded = all.map((s, i) => ({ name: s.name, status: i === idx ? 'waiting' : (i < idx ? 'completed' : 'pending') }))
  await seedBrainstorm(specBase, cwd, cn, seeded)

  const r = runStage('brainstorm', cn, cwd, { continue: true, answer: 'A 和 B 混合做，先 A 后 B' })
  assert(r.status === 0, `自由文本 --continue → exit 0（实际 ${r.status}；尾：${r.combined.slice(-100)}）`)
  const after = await pm.read(cwd, cn)
  const s = after.stages.brainstorm.steps[idx]
  assert(s.status === 'pending', `waiting 解回 pending（实际 ${s.status}）`)
  assert(s.waitAnswer === 'A 和 B 混合做，先 A 后 B', `waitAnswer 落原始回答（实际 ${JSON.stringify(s.waitAnswer)}）`)
}

console.log('\n--- 用例3: requiresWait 门保留：--done 不带 --answer → 仍拦截 ---')
{
  const { cwd, specBase } = makeRepo('cli-wa-gate-')
  const cn = '2026-08-16-wait-gate-intact'
  const pm = await initChange(cwd, specBase, cn)
  writeFileSync(join(specBase, 'changes', cn, 'design.md'), '# D\n背景\n目标\n方案\n')
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const { all, idx } = await locateProposeStep(pm, cwd, specBase, cn)
  const seeded = all.map((s, i) => ({ name: s.name, status: i < idx ? 'completed' : 'pending' }))
  await seedBrainstorm(specBase, cwd, cn, seeded)

  const r = runStage('brainstorm', cn, cwd, { done: true })
  assert(r.status !== 0, `无 --answer --done → exit 非 0（实际 ${r.status}）`)
  assert(r.combined.includes('必须先等待用户输入'), `含 requiresWait 拦截信息（尾：${r.combined.slice(-100)}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
