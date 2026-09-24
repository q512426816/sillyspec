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
  // 承诺词一票（requirements 命中「幂等」）
  let { root, changeDir } = makeChangeDir(DESIGN_SLOTS.replace('__ANSWER__', '不适用：无'), '# 需求\n写入收敛幂等\n')
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

test('② 评审任务书：材料/预算帽/只读/schema 四要素', () => {
  const book = renderReviewerTaskbook({ change: 'c1', changeDir: '/x/c1' })
  assert.match(book, /请求预算硬帽 12/)
  assert.match(book, /只读——禁止修改任何文件/)
  assert.match(book, /review\.json/)
  assert.match(book, /requirements\.md/)
  assert.match(book, /change\.patch/)
  assert.match(book, /"verdict": "PASS" \| "FAIL"/)
  assert.match(book, /盲维四问真实性/)
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
