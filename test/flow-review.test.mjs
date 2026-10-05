/**
 * flow-review.test.mjs — 轻量变更独立评审（2026-09-25-thin-review-slice）
 *
 * 覆盖验收面：
 *   ① 危险证据定档矩阵：承诺词一票/盲维实质作答/diff 原语/决策密度/声明一票/全静豁免/采样桶；
 *   ② 评审任务书渲染：材料路径/预算帽/只读纪律/schema 契约；
 *   ③ review.json 校验三态：合法 PASS / 字段错误清单 / FAIL+P1 形状。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  classifyReviewNeed, renderReviewerTaskbook, validateReviewJson, sampleBucket,
} from '../src/flow-review.js'

function makeChangeDir(designText, requirementsText) {
  const root = mkdtempSync(join(tmpdir(), 'frv-'))
  const changeDir = join(root, 'changes', 'c-x')
  mkdirSync(changeDir, { recursive: true })
  if (designText) writeFileSync(join(changeDir, 'design.md'), designText)
  if (requirementsText) writeFileSync(join(changeDir, 'requirements.md'), requirementsText)
  return { root, changeDir }
}

const DESIGN_SLOTS = [
  '# 设计记录',
  '<!-- MACHINE-DRAFT:design-boundaries:0000000000000000000000000000000000000000000000000000000000000000:begin x -->',
  '1. 乱序……',
  '<!-- MACHINE-DRAFT:design-boundaries:end -->',
  '<!--AGENT:槽3 盲维四问作答 -->',
  '__ANSWER__',
  '',
].join('\n')

test('① 定档矩阵：五路信号与豁免举证', () => {
  // 承诺词一票（requirements 命中「不丢失」——D 收敛后幂等已移除，用交付语义词）
  let { root, changeDir } = makeChangeDir(DESIGN_SLOTS.replace('__ANSWER__', '不适用：无'), '# 需求\n写入不丢失\n')
  let t = classifyReviewNeed({ changeDir, patchText: '', change: 'q1' })
  assert.equal(t.required, true)
  assert.ok(t.reasons.some((r) => /承诺词/.test(r)), `承诺词一票: ${t.reasons}`)
  rmSync(root, { recursive: true, force: true })

  // 盲维实质作答（非「不适用」开头）
  ;({ root, changeDir } = makeChangeDir(DESIGN_SLOTS.replace('__ANSWER__', '1. 乱序：用队列缓冲晚到事件'), '# 需求\n普通\n'))
  t = classifyReviewNeed({ changeDir, patchText: '', change: 'q2' })
  assert.ok(t.reasons.some((r) => /盲维四问有实质作答/.test(r)), `盲维信号: ${t.reasons}`)
  rmSync(root, { recursive: true, force: true })

  // diff 危险原语（物证）
  t = classifyReviewNeed({ changeDir: mkdtempSync(join(tmpdir(), 'frv-')), patchText: '+++ x\n+asyncio.Lock()', change: 'q3' })
  assert.ok(t.reasons.some((r) => /原语/.test(r)), `原语信号: ${t.reasons}`)

  // 决策密度
  t = classifyReviewNeed({ changeDir: mkdtempSync(join(tmpdir(), 'frv-')), patchText: '', editRatio: 0.75, change: 'q4' })
  assert.ok(t.reasons.some((r) => /决策密度/.test(r)), `密度信号: ${t.reasons}`)

  // 声明一票（双向）
  t = classifyReviewNeed({ changeDir: mkdtempSync(join(tmpdir(), 'frv-')), patchText: 'x', reviewForce: true, change: 'q5' })
  assert.equal(t.required, true)
  t = classifyReviewNeed({ changeDir: mkdtempSync(join(tmpdir(), 'frv-')), patchText: '+++ a\n+asyncio.Lock()', reviewForce: false, change: 'q6' })
  assert.equal(t.required, false, '--no-review 压过原语命中')

  // 全静 + 非采样桶名 → 豁免且证据可列
  const quiet = makeChangeDir(DESIGN_SLOTS.replace('__ANSWER__', '不适用：无风险面'), '# 需求\n普通\n')
  const offBucket = 'name-off-bucket'
  assert.equal(sampleBucket(offBucket), false, '夹具名确在桶外（若改 SALT 请重选）')
  t = classifyReviewNeed({ changeDir: quiet.changeDir, patchText: '+++ a\n+let x = 1', change: offBucket })
  assert.equal(t.required, false)
  assert.ok(t.exemptEvidence.length >= 3, `豁免证据齐全: ${t.exemptEvidence}`)
  rmSync(quiet.root, { recursive: true, force: true })

  // 全静 + 采样桶名 → 抽查必评
  let bucket0 = 'b0'
  for (let i = 0; !sampleBucket(bucket0); i++) bucket0 = `b0-${i}`
  t = classifyReviewNeed({ changeDir: mkdtempSync(join(tmpdir(), 'frv-')), patchText: '', change: bucket0 })
  assert.equal(t.required, true)
  assert.equal(t.sampled, true)
  assert.ok(t.reasons.some((r) => /抽查采样/.test(r)))
})

// ── 否定语境消解（2026-10-05-review-promise-negation）：盲维第4问作答的否定式「串台」
// 不再一票升级；用户原话与非否定语境口径不变。v2 纯 markdown 夹具（四问原文行逐字同源，
// stripV2QuestionLines 才能剥掉——夹具自污染防护）。──
const DESIGN_V2_BND = [
  '# 设计记录',
  '## 做法概述',
  '纯文本变换。',
  '## 边界与并发（盲维四问——每问必答，答不了即设计缺口）',
  '1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？',
  '2. 并发写：两个执行体同时操作同一数据/文件会发生什么？',
  '3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？',
  '4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？',
  '__ANSWER__',
  '## 风险与死路',
  '见上。',
].join('\n')

test('④ 否定语境消解：design 作答否定式「串台」不再一票升级', () => {
  // 桶外名先钉（在桶内就换名直到桶外；若改 SALT 夹具自适应——同既有采样纪律）
  let quietName = 'neg-off-bucket'
  for (let i = 0; sampleBucket(quietName); i++) quietName = `neg-off-${i}`
  assert.equal(sampleBucket(quietName), false)

  // 三种否定形态逐一：不适用开头（避盲维信号）+ 否定串台短语
  for (const [label, answer] of [
    ['无串台面', '不适用：纯输出层追加，无串台面。'],
    ['不会串台', '不适用：单进程同步变换，不会串台。'],
    ['杜绝串台', '不适用：零共享状态，杜绝串台与误伤。'],
  ]) {
    const { root, changeDir } = makeChangeDir(DESIGN_V2_BND.replace('__ANSWER__', answer), '# 需求\n普通需求文本\n')
    const t = classifyReviewNeed({ changeDir, patchText: '+++ a\n+let x = 1', change: quietName })
    assert.equal(t.required, false, `${label}：不再升级（reasons=${t.reasons}）`)
    assert.ok(!t.reasons.some((r) => /承诺词/.test(r)), `${label}：承诺词条不在 reasons`)
    assert.ok(t.exemptEvidence.some((e) => /无高危承诺词/.test(e)), `${label}：豁免证据含无承诺词`)
    rmSync(root, { recursive: true, force: true })
  }
})

test('⑤ 用户原话口径：requirements 非否定「串台」仍一票升级', () => {
  const { root, changeDir } = makeChangeDir(
    DESIGN_V2_BND.replace('__ANSWER__', '不适用：无。'),
    '# 需求\n修复跨实例数据串台问题\n',
  )
  const t = classifyReviewNeed({ changeDir, patchText: '+++ a\n+let x = 1', change: 'neg-req-hit' })
  assert.equal(t.required, true, 'requirements 非否定串台升级')
  assert.ok(t.reasons.some((r) => /承诺词命中「串台」/.test(r)), `承诺词条在场: ${t.reasons}`)
  rmSync(root, { recursive: true, force: true })
})

test('⑥ 非否定语境保留：design 作答「解决串台」照常升级', () => {
  for (const [label, answer] of [
    ['解决串台', '本设计的核心是解决多实例间的串台与误归属。'],
    ['仍存在串台', '切换中途中断时仍存在串台风险，需评审重点看。'],
    ['无法杜绝串台（风险自认）', '多实例并发下无法杜绝串台，属已知残留。'],
    ['难免串台（风险自认）', '跨仓场景难免串台，接受该边界。'],
    ['避免不了串台（风险自认）', '晚到事件下避免不了串台，文档已声明。'],
  ]) {
    const { root, changeDir } = makeChangeDir(
      DESIGN_V2_BND.replace('__ANSWER__', answer),
      '# 需求\n普通需求文本\n',
    )
    const t = classifyReviewNeed({ changeDir, patchText: '+++ a\n+let x = 1', change: 'neg-keep-hit' })
    assert.ok(t.reasons.some((r) => /承诺词命中「串台」/.test(r)), `${label}：保留升级（reasons=${t.reasons}）`)
    rmSync(root, { recursive: true, force: true })
  }
})

test('② 评审任务书：材料/预算帽/只读/schema 四要素', () => {
  const book = renderReviewerTaskbook({ change: 'c1', changeDir: '/x/c1' })
  assert.match(book, /请求预算硬帽 12/)
  assert.match(book, /只读——禁止修改任何文件/)
  assert.match(book, /review\.json/)
  assert.match(book, /requirements\.md/)
  assert.match(book, /change\.patch/)
  assert.match(book, /"verdict": "PASS" \| "FAIL"/)
  assert.match(book, /盲维四问真实性/)
  assert.match(book, /披露边界显式裁决（必答，不许默认放行/, '边界裁决条款在场')
  assert.match(book, /未裁决=未审/);
})

test('③ review.json 校验三态', () => {
  const root = mkdtempSync(join(tmpdir(), 'frv-'))
  const p = join(root, 'review.json')
  writeFileSync(p, JSON.stringify({ schemaVersion: 1, change: 'c', reviewer: 'subagent', verdict: 'PASS', findings: [], dimensionNotes: {}, reviewedAt: '2026' }))
  assert.equal(validateReviewJson(p).ok, true, '合法 PASS')
  const fail = { schemaVersion: 1, change: 'c', reviewer: 'subagent', verdict: 'FAIL', findings: [{ severity: 'P1', title: '承诺违反', evidence: 'x', location: 'a.py:1' }], dimensionNotes: {}, reviewedAt: '2026' }
  writeFileSync(p, JSON.stringify(fail))
  const v = validateReviewJson(p)
  assert.equal(v.ok, true, 'FAIL+P1 形状合法（拦截语义由调用方判）')
  assert.equal(v.review.findings.length, 1)
  writeFileSync(p, JSON.stringify({ schemaVersion: 2, verdict: 'MAYBE', findings: 'x', reviewer: '' }))
  const bad = validateReviewJson(p)
  assert.equal(bad.ok, false)
  assert.ok(bad.errors.length >= 4, `字段错误逐条列出: ${bad.errors}`)
  rmSync(root, { recursive: true, force: true })
})
