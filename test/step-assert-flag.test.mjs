// --step 意图断言（坑 execute-concurrent-done-skips-next-wave 终解，2026-09-08 实证）
//
// 并发 --done 主形态：会话 B 先推进 Wave N，会话 A 随后的 --done 落到 Wave N+1 且用
// Wave N 的旧摘要静默完成未实现步骤。双写硬拦 + 邻步警告只覆盖半场景——CLI 短进程
// 无法读心，只有显式声明（--step <名|序号>）能硬拦主形态。
//
// 进程内 characterization（runCapturing 桩 process.exit）+ outputStep 渲染层模板注入。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ProgressManager } from '../src/progress.js'
import { completeStep } from '../src/run/complete.js'
import { makeRepo, runCapturing, seedStage } from './_complete-step-harness.mjs'

const passed = [], failed = []
const assert2 = (cond, msg) => {
  cond ? (passed.push(msg), console.log(`  ✅ ${msg}`))
    : (failed.push(msg), console.log(`  ❌ ${msg}`))
}

const CN = 'step-assert-demo'
// 全 8 步静态表（少种触发 def↔DB 漂移守卫中止，到不了被测点；断言语义与阶段无关，
// 用 brainstorm 全表最小化 fixture，步骤名换成 Wave 形态贴近事故语境）
const STEPS = [
  'Wave 1 — 骨架', 'Wave 2 — 调用方迁移', 'Wave 3 — 样式',
  '提出 2-3 种方案', '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件',
]
function seed(pm, cwd, currentIdx) {
  return seedStage(pm, cwd, CN, 'brainstorm',
    STEPS.map((name, i) => i < currentIdx
      ? { name, status: 'completed', completedAt: '2026/09/08 10:00:00' }
      : { name, status: 'pending' }))
}

console.log('--- 1. 声明与当前步一致（名称精确/前缀）→ 放行并完成 ---')
{
  const { cwd, specBase } = makeRepo('sa-match-')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd); await pm.initChange(cwd, CN)
  await seed(pm, cwd, 1) // 当前 = Wave 2
  let progress = await pm.read(cwd, CN)
  let r = await runCapturing(() =>
    completeStep(pm, progress, 'brainstorm', cwd, 'Wave 2 完成', null, { changeName: CN, stepAssert: 'Wave 2 — 调用方迁移' }))
  assert2(r.exitCode === null, `精确名匹配放行（实际 exit ${r.exitCode}；${(r.stdout.match(/❌[^\n]*/) || [''])[0]}）`)
  let after = await pm.read(cwd, CN)
  assert2(after.stages.brainstorm.steps[1].status === 'completed', '精确名匹配后步骤完成')

  await seed(pm, cwd, 2) // 当前 = Wave 3
  progress = await pm.read(cwd, CN)
  r = await runCapturing(() =>
    completeStep(pm, progress, 'brainstorm', cwd, 'Wave 3 完成', null, { changeName: CN, stepAssert: 'Wave 3' }))
  assert2(r.exitCode === null, `前缀匹配放行（Wave 3 前缀命中「Wave 3 — 样式」）`)
  after = await pm.read(cwd, CN)
  assert2(after.stages.brainstorm.steps[2].status === 'completed', '前缀匹配后步骤完成')
}

console.log('\n--- 2. 事故主形态：声明旧 Wave，当前步已被并行推进 → 硬拦 ---')
{
  const { cwd, specBase } = makeRepo('sa-stale-')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd); await pm.initChange(cwd, CN)
  await seed(pm, cwd, 1) // B 已完成 Wave 1，当前 = Wave 2；A 以为自己还在 Wave 1
  const progress = await pm.read(cwd, CN)
  const r = await runCapturing(() =>
    completeStep(pm, progress, 'brainstorm', cwd, 'Wave 1 的旧摘要', null, { changeName: CN, stepAssert: 'Wave 1' }))
  assert2(r.exitCode === 1, `硬拦 exit 1（实际 ${r.exitCode}）`)
  assert2(r.stdout.includes('意图断言不匹配'), '报错明示断言不匹配')
  assert2(r.stdout.includes('Wave 2'), '报错点名当前真实步骤')
  const after = await pm.read(cwd, CN)
  assert2(after.stages.brainstorm.steps[1].status === 'pending', '被拦后步骤未推进（无静默完成）')
}

console.log('\n--- 3. 序号形态（1-based）+ 不带 --step 行为不变 ---')
{
  const { cwd, specBase } = makeRepo('sa-ordinal-')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd); await pm.initChange(cwd, CN)
  await seed(pm, cwd, 0) // 当前 = 第 1 步
  let progress = await pm.read(cwd, CN)
  let r = await runCapturing(() =>
    completeStep(pm, progress, 'brainstorm', cwd, 'x', null, { changeName: CN, stepAssert: '1' }))
  assert2(r.exitCode === null, `序号 1 命中第 1 步放行（实际 ${r.exitCode}；${(r.stdout.match(/❌[^\n]*/) || [''])[0]}）`)

  await seed(pm, cwd, 2) // 当前 idx 2（第 3 步）
  progress = await pm.read(cwd, CN)
  r = await runCapturing(() =>
    completeStep(pm, progress, 'brainstorm', cwd, 'x', null, { changeName: CN, stepAssert: '2' }))
  assert2(r.exitCode === 1, `序号 2 与当前第 3 步不匹配硬拦（实际 ${r.exitCode}）`)

  r = await runCapturing(() =>
    completeStep(pm, progress, 'brainstorm', cwd, '不带断言照常完成', null, { changeName: CN }))
  assert2(r.exitCode === null, `不带 --step 行为不变（实际 ${r.exitCode}）`)
}

console.log('\n--- 4. outputStep 渲染层：execute Wave 提示词模板带 --step（照抄即得防护） ---')
{
  const { outputStep } = await import('../src/run/prompt.js')
  const steps = [{ name: 'Wave 3 — 样式', prompt: 'PROMPT' }]
  const buf = []
  const origLog = console.log
  console.log = (...a) => { buf.push(a.join(' ')) }
  try {
    await outputStep('execute', 0, steps, process.cwd(), 'wave-demo', null, {}, null)
  } finally { console.log = origLog }
  const hint = buf.find(l => l.includes('run execute --done'))
  assert2(!!hint && hint.includes('--step "Wave 3 — 样式"'), `execute 完成命令模板带 --step（实际：${hint || '(无)'}）`)

  const buf2 = []
  console.log = (...a) => { buf2.push(a.join(' ')) }
  try {
    await outputStep('brainstorm', 0, steps, process.cwd(), 'other', null, {}, null)
  } finally { console.log = origLog }
  const hint2 = buf2.find(l => l.includes('run brainstorm --done'))
  assert2(!!hint2 && !hint2.includes('--step'), `非 execute 阶段不注入（存量测试断言兼容，实际：${hint2 || '(无)'}）`)
}

console.log(`\n${failed.length === 0 ? '✅' : '❌'} step-assert-flag：通过 ${passed.length} / 失败 ${failed.length}`)
if (failed.length > 0) process.exitCode = 1

// node:test 包装：失败时让 --test 报红
test('step-assert-flag 汇总', () => { assert.equal(failed.length, 0, failed.join('；')) })
