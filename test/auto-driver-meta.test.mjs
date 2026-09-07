/**
 * auto driver 元数据测试（change: 2026-09-08-auto-driver，FR-01/02/04，D-002/003/005@v1）。
 *
 * 锁住：
 *  1. requiresUser 四源（三键各一例 + WAIT_MARKER_RE 正文）+ execute 全缺步 = false
 *  2. SS-META 块：auto 模式（autoMeta）每步尾部单行可正则提取；doneCommand 为 run auto 形态且内嵌 changeName
 *  3. 单阶段 run（autoMeta=null）输出与无块（零显形）
 *  4. 三态 --change：单活跃回显 / 多活跃 exit 2 / 零活跃建变更
 *  5. 收尾总结：全完成打印（含分隔线与勾选行）；未完成不打印
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { outputStep, requiresUser } from '../src/run/prompt.js'
import { makeRepo, initChange, runCLI, runStage, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const binCLI = join(fileURLToPath(new URL('..', import.meta.url)), 'bin', 'sillyspec.js')
const capture = async (fn) => {
  const logs = []; const ol = console.log; console.log = (...a) => logs.push(a.join(' '))
  try { await fn() } finally { console.log = ol }
  return logs.join('\n')
}

console.log('=== auto driver 元数据（requiresUser / SS-META / 三态 --change / 收尾总结）===\n')

console.log('--- ① requiresUser 四源 + 兜底 false ---')
{
  assert(requiresUser({ requiresWait: true }, '') === true, 'requiresWait 源')
  assert(requiresUser({ conditionalWait: true }, '') === true, 'conditionalWait 源')
  assert(requiresUser({ requiresConfirm: true }, '') === true, 'requiresConfirm 源')
  assert(requiresUser({}, '前文' + String.fromCharCode(10) + '[WAIT_FOR_USER]' + String.fromCharCode(10) + '后文') === true, 'WAIT_MARKER_RE 正文源（[WAIT_FOR_USER] 标记）')
  assert(requiresUser({}, '普通执行步骤无任何 wait 标记') === false, '全缺 → false（Grill P1-①：execute Wave 步形态）')
  assert(requiresUser(null, '') === false, 'step 缺省 → false')
}

console.log('\n--- ② SS-META 块渲染（auto）与单阶段零显形 ---')
{
  const { cwd } = makeRepo('adm-meta-')
  const steps = [{ name: '执行任务', prompt: '做点事', requiresWait: false }]
  // auto 模式（autoMeta 传参）
  const outAuto = await capture(() => outputStep('plan', 0, steps, cwd, 'c1', null, {}, null, null, { changeName: 'c1' }))
  const m = outAuto.match(/<!--SS-META:(\{.*\})-->/)
  assert(!!m, 'auto 模式尾部 SS-META 块可正则提取')
  if (m) {
    const meta = JSON.parse(m[1])
    assert(meta.stage === 'plan' && meta.stepName === '执行任务' && meta.stepIndex === 1, '块字段 stage/stepName/stepIndex')
    assert(meta.doneCommand.includes('run auto --done') && meta.doneCommand.includes('--change c1'), 'doneCommand 为 run auto 形态且内嵌 changeName')
    assert(meta.requiresUser === false, '普通步 requiresUser=false')
  }
  assert(outAuto.includes('sillyspec run auto --done'), '正文完成后执行段同源为 run auto 形态（双命令消除）')
  assert(!outAuto.includes('--input "用户原始需求/反馈"'), 'auto 模式 done 命令不带 --input 噪音')
  // 单阶段 run（autoMeta 缺省）
  const outPlain = await capture(() => outputStep('plan', 0, steps, cwd, 'c1', null, {}, null, null))
  assert(!outPlain.includes('SS-META'), '单阶段 run 零 SS-META 显形')
  assert(outPlain.includes('sillyspec run plan --done'), '单阶段正文模板维持 run <stage> 形态')
}

console.log('\n--- ③ 三态 --change（CLI 级） ---')
{
  // 零活跃：run auto --input 建变更（不再 exit 2 断头路）
  const r0 = makeRepo('adm-zero-')
  const out0 = runCLI(['--dir', r0.cwd, 'run', 'auto', '--input', '测试需求'], { cwd: r0.cwd })
  assert(out0.status === 0 && out0.combined.includes('auto 模式自动创建变更'), `零活跃 → 建变更（exit ${out0.status}；尾：${out0.combined.slice(-80)}）`)
  // 单活跃：自动选中回显
  const r1 = makeRepo('adm-one-')
  await initChange(r1.cwd, r1.specBase, '2026-09-08-only-one')
  const out1 = runCLI(['--dir', r1.cwd, 'run', 'auto', '--input', 'x'], { cwd: r1.cwd })
  assert(out1.combined.includes('单活跃自动选中') && out1.combined.includes('2026-09-08-only-one'), '单活跃 → 自动选中回显')
  // 多活跃：exit 2 列候选
  const r2 = makeRepo('adm-two-')
  await initChange(r2.cwd, r2.specBase, '2026-09-08-a1')
  await initChange(r2.cwd, r2.specBase, '2026-09-08-a2')
  const out2 = runCLI(['--dir', r2.cwd, 'run', 'auto', '--input', 'x'], { cwd: r2.cwd })
  assert(out2.status !== 0 && out2.combined.includes('2026-09-08-a1') && out2.combined.includes('2026-09-08-a2'), `多活跃 → 报错列候选（exit ${out2.status}）`)
}

console.log('\n--- ④ 收尾总结触发 ---')
{
  // 全完成：seed 四阶段 completed → run auto 打印收尾总结
  const { cwd, specBase } = makeRepo('adm-done-')
  const cn = '2026-09-08-all-done'
  const pm = await initChange(cwd, specBase, cn)
  const p = await pm.read(cwd, cn)
  p.currentChange = cn; p.currentStage = 'verify'
  for (const s of ['brainstorm', 'plan', 'execute', 'verify', 'archive']) {
    p.stages[s] = { status: 'completed', startedAt: '2026/9/8 00:00:00', completedAt: '2026/9/8 01:00:00', steps: [{ name: 'x', status: 'completed' }] }
  }
  await pm._write(cwd, p, cn)
  const out = runCLI(['--dir', cwd, 'run', 'auto', '--change', cn], { cwd })
  assert(out.combined.includes('auto 流程收尾总结'), '全完成 → 收尾总结打印')
  assert(out.combined.includes('🏁') && out.combined.includes('brainstorm'), '总结含变更与阶段态')
  // 未完成：不打印
  const { cwd: cw2, specBase: sb2 } = makeRepo('adm-undone-')
  const cn2 = '2026-09-08-not-done'
  const pm2 = await initChange(cw2, sb2, cn2)
  const p2 = await pm2.read(cw2, cn2)
  p2.currentChange = cn2
  p2.stages.brainstorm = { status: 'in-progress', startedAt: '2026/9/8 00:00:00', completedAt: null, steps: [{ name: 'x', status: 'pending' }] }
  await pm2._write(cw2, p2, cn2)
  const out2 = runCLI(['--dir', cw2, 'run', 'auto', '--change', cn2], { cwd: cw2 })
  assert(!out2.combined.includes('auto 流程收尾总结'), '未完成 → 不打印收尾总结')
}

cleanup()
report(count.passed, count.failed, count.failures)
