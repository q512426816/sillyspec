/**
 * step-guide-fingerprint.test.mjs — M1 指令指纹增量（2026-09-21-r5-efficiency-batch2 task-01 / FR-01 / D-001@v1）
 *
 * P8 实证：73 次 CLI 调用注入 252KB 指令文本、同步骤复入全量重印（单次最大 24KB）——「轮数×上下文」
 * 基数浪费。契约：静态段按渲染指纹落盘 .runtime/step-guides/；同指纹复入静态部分 ≤10 行（指纹+路径+
 * 提示），动态注入段每次渲染永不缓存（附录照常输出）；--json（console.log 劫持）与
 * SILLYSPEC_STEP_GUIDE=0 走全量。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { outputStep, computeStepGuideFingerprint } from '../src/run/prompt.js'

async function capture(fn) {
  const lines = []
  const orig = console.log
  console.log = (...a) => lines.push(a.map(String).join(' '))
  try { return { r: await fn(), lines } } finally { console.log = orig }
}

let envPrev = undefined
function makeCwd() {
  const cwd = mkdtempSync(join(tmpdir(), 'stepguide-'))
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  envPrev = process.env.SILLYSPEC_STEP_GUIDE
  process.env.SILLYSPEC_STEP_GUIDE = '1' // v1 默认关闭：特性测试显式开启
  return cwd
}
function restoreEnv() {
  if (envPrev === undefined) delete process.env.SILLYSPEC_STEP_GUIDE
  else process.env.SILLYSPEC_STEP_GUIDE = envPrev
}

const STEP = { name: '调研', prompt: '调研 <project> 的模块结构，当前时间 <now-datetime>，产出报告。' }
const runExplore = (cwd, step = STEP) => outputStep('explore', 0, [step], cwd, null, null, {}, null, null, null)

test('指纹确定性：对易变占位符不敏感、对模板变更敏感（纯函数）', () => {
  const a = computeStepGuideFingerprint('调研 X 于 <now-datetime> 与 <now-iso-datetime>，材料 {DOCS_DEBT} {KNOWLEDGE_HIT_REPORT}，run {EXECUTE_RUN_ID}')
  const b = computeStepGuideFingerprint('调研 X 于 <now-datetime> 与 <now-iso-datetime>，材料 {DOCS_DEBT} {KNOWLEDGE_HIT_REPORT}，run {EXECUTE_RUN_ID}')
  const c = computeStepGuideFingerprint('调研 X 于 <now-datetime>，模板变了')
  assert.equal(a, b, '同模板（易变占位符位置一致）→ 同指纹')
  assert.notEqual(a, c, '模板文本变更 → 指纹变化')
})

test('首见全量渲染 + guide 落盘；复入静态部分 ≤10 行且动态段照常渲染', async () => {
  const cwd = makeCwd()
  try {
    const s1 = await capture(() => runExplore(cwd))
    assert.ok(s1.lines.some(l => l.includes('的模块结构')), '首见渲染含步骤正文')
    const guideDir = join(cwd, '.sillyspec', '.runtime', 'step-guides')
    assert.ok(existsSync(guideDir) && readdirSync(guideDir).length >= 1, 'guide 文件已落盘')

    const s2 = await capture(() => runExplore(cwd))
    const joined = s2.lines.join('\n')
    assert.ok(!joined.includes('的模块结构'), '复入不再重印静态正文')
    assert.ok(joined.includes('fingerprint='), '复入含指纹行')
    assert.ok(joined.includes('step-guides'), '复入含 guide 路径')
    assert.ok(/\d{4}-\d{2}-\d{2}/.test(joined), '动态段（本次时间）照常渲染')
    // 静态部分判据：'## Step' 结构标题与附录标记之间的短输出块 ≤10 行（stage/step 头部为身份信息不计）
    const cut = s2.lines.findIndex(l => l.includes('动态注入段'))
    const head = s2.lines.findIndex(l => /^## Step /.test(l))
    assert.ok(cut > head && head >= 0, '复入输出含 Step 标题与动态注入段标记')
    assert.ok(cut - head <= 10, `短输出块 ≤10 行（实际 ${cut - head}））`)
  } finally { restoreEnv(); rmSync(cwd, { recursive: true, force: true }) }
})

test('指纹变更（模板变）→ 复入全量重印', async () => {
  const cwd = makeCwd()
  try {
    await capture(() => runExplore(cwd))
    const s2 = await capture(() => runExplore(cwd, { ...STEP, prompt: STEP.prompt + ' 补充要求。' }))
    assert.ok(s2.lines.some(l => l.includes('补充要求')), '模板变更 → 全量重印')
  } finally { restoreEnv(); rmSync(cwd, { recursive: true, force: true }) }
})

test('kill-switch SILLYSPEC_STEP_GUIDE=0 → 复入仍全量', async () => {
  const cwd = makeCwd()
  const prev = process.env.SILLYSPEC_STEP_GUIDE
  process.env.SILLYSPEC_STEP_GUIDE = '0'
  try {
    await capture(() => runExplore(cwd))
    const s2 = await capture(() => runExplore(cwd))
    assert.ok(s2.lines.some(l => l.includes('的模块结构')), '禁用时复入全量输出')
  } finally {
    if (prev === undefined) delete process.env.SILLYSPEC_STEP_GUIDE; else process.env.SILLYSPEC_STEP_GUIDE = prev
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('--json 劫持（console.log→stderr 形态）→ 不短输出，全量照出', async () => {
  const cwd = makeCwd()
  const orig = console.log
  console.log = (...a) => process.stderr.write(a.map(String).join(' ') + '\n') // 与 src/index.js withJsonOutput 同形态
  try {
    await runExplore(cwd)
    const lines2 = []
    // 保持劫持形态（函数体含 stderr.write 即探测目标）同时记录，验证 json 模式下不走短输出
    console.log = (...a) => { process.stderr.write(a.map(String).join(' ') + '\n'); lines2.push(a.map(String).join(' ')) }
    await runExplore(cwd)
    assert.ok(lines2.some(l => l.includes('的模块结构')), 'json 劫持下复入仍全量（机器消费方不读盘）')
  } finally {
    console.log = orig
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('v1 默认关闭：未显式 SILLYSPEC_STEP_GUIDE=1 时复入仍全量（stdout 确定性）', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'stepguide-off-'))
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  const prev = process.env.SILLYSPEC_STEP_GUIDE
  delete process.env.SILLYSPEC_STEP_GUIDE
  try {
    await capture(() => runExplore(cwd))
    const s2 = await capture(() => runExplore(cwd))
    assert.ok(s2.lines.some(l => l.includes('的模块结构')), '默认关：复入全量（别名路由奇偶校验类 stdout 字节一致测试依赖此默认）')
  } finally {
    if (prev !== undefined) process.env.SILLYSPEC_STEP_GUIDE = prev
    rmSync(cwd, { recursive: true, force: true })
  }
})
