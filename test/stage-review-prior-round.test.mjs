/**
 * 同阶段上一轮审查结论采集与回灌渲染单测（ql-20260916-021，Superpowers scoped re-review 采纳①）
 *
 * 背景：复审派发 prompt 原本只有跨阶段 pass 结论注入（{PRIOR_REVIEW_FACTS} 的前序阶段段），
 * 同 stage 上一轮 FAIL 的 findings 与已实证 pass 面不回灌——独立复审子代理全量重读并重复
 * 报告已修问题（obra/superpowers v6.2 scoped re-review 同款痛点）。
 *
 * 锁死契约：
 * - collectSameStagePriorReview(runtimeRoot, stage, changeName)
 *   - 取该 stage 本变更**最近一轮**有效 review（runId 字典序 = 时间序；含当前 marker 指向
 *     run 的已写 review——同目录覆盖式复审路径下它就是最新轮）
 *   - 跨变更过滤（reviewedFiles[0] 不含 changes/<changeName>/ 的轮不采）
 *   - 骨架轮跳过（register-stage-review 生成的双 cannot_verify 待审骨架）
 *   - 坏 JSON 轮跳过不抛
 *   - checklist fail/gap → openFindings；pass → passItems；verdict=fail 但 checklist 无明细 →
 *     reviewerNotes 合成一条；两者皆空 → null
 * - renderPriorRoundFindingsMd(collected)
 *   - 头行含 runId + verdicts + 增量复审指引
 *   - openFindings 段（核验修复语义）与 passItems 段（勿重复报告语义）按存在渲染
 *   - cap 截断展示「N/M 条」
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectSameStagePriorReview, renderPriorRoundFindingsMd } from '../src/stage-review.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`✅ ${msg}`); passed++ }
  else { console.error(`❌ ${msg}`); failed++ }
}

const CHANGE = 'demo-change'
const STAGE = 'plan'

/** 写一轮 stage review 到 runtimeRoot/stage-reviews/<stage>-<runId>/review.json */
function writeRound(runtimeRoot, stage, runId, changeName, review) {
  const dir = join(runtimeRoot, 'stage-reviews', `${stage}-${runId}`)
  mkdirSync(dir, { recursive: true })
  const base = { reviewedFiles: [`changes/${changeName}/plan.md`], ...review }
  writeFileSync(join(dir, 'review.json'), JSON.stringify(base, null, 2))
  return dir
}

// ── 场景 1：fail/gap/pass 拆分提取 + verdict 汇总 ─────────────────────────────
{
  const rt = mkdtempSync(join(tmpdir(), 'sr-prior-round-1-'))
  writeRound(rt, STAGE, 'review-2026-09-16-100000', CHANGE, {
    specVerdict: 'fail', qualityVerdict: 'pass',
    checklist: [
      { item: 'Wave 依赖成环：task-3 depends_on task-1', result: 'fail', note: '拓扑断裂' },
      { item: 'plan_level 档位与复杂度不匹配', result: 'gap' },
      { item: 'task 编号格式正确', result: 'pass' },
    ],
    reviewerNotes: 'fail：Wave 依赖成环需修复',
  })
  const got = await collectSameStagePriorReview(rt, STAGE, CHANGE)
  assert(got !== null, '场景1：采到上一轮')
  assert(got.priorRunId === 'review-2026-09-16-100000', '场景1：priorRunId 正确')
  assert(got.verdicts === 'spec=fail, quality=pass', '场景1：verdicts 汇总正确')
  assert(got.openFindings.length === 2, '场景1：openFindings=2（fail+gap）')
  assert(got.openFindings[0].includes('[fail] Wave 依赖成环'), '场景1：fail 项带 [fail] 前缀')
  assert(got.openFindings[1].includes('[gap] plan_level'), '场景1：gap 项带 [gap] 前缀')
  assert(got.passItems.length === 1 && got.passItems[0].includes('task 编号格式'), '场景1：pass 面提取正确')
  rmSync(rt, { recursive: true, force: true })
}

// ── 场景 2：多轮取最新 ────────────────────────────────────────────────────────
{
  const rt = mkdtempSync(join(tmpdir(), 'sr-prior-round-2-'))
  writeRound(rt, STAGE, 'review-2026-09-16-100000', CHANGE, {
    specVerdict: 'fail', qualityVerdict: 'fail',
    checklist: [{ item: '旧问题A', result: 'fail' }],
    reviewerNotes: '第一轮',
  })
  writeRound(rt, STAGE, 'review-2026-09-16-110000', CHANGE, {
    specVerdict: 'fail', qualityVerdict: 'pass',
    checklist: [{ item: '新问题B', result: 'gap' }, { item: '旧问题A 已修', result: 'pass' }],
    reviewerNotes: '第二轮：A 已修，B 新发现',
  })
  const got = await collectSameStagePriorReview(rt, STAGE, CHANGE)
  assert(got.priorRunId === 'review-2026-09-16-110000', '场景2：多轮取最新（110000）')
  assert(got.openFindings.length === 1 && got.openFindings[0].includes('新问题B'), '场景2：openFindings 取最新轮的')
  rmSync(rt, { recursive: true, force: true })
}

// ── 场景 3：跨变更过滤 ────────────────────────────────────────────────────────
{
  const rt = mkdtempSync(join(tmpdir(), 'sr-prior-round-3-'))
  writeRound(rt, STAGE, 'review-2026-09-16-100000', CHANGE, {
    specVerdict: 'fail', qualityVerdict: 'fail',
    checklist: [{ item: '本变更问题', result: 'fail' }],
    reviewerNotes: '本变更第一轮',
  })
  // 他变更的更新一轮（reviewedFiles 指向别的 change）——不得被采
  writeRound(rt, STAGE, 'review-2026-09-16-120000', 'other-change', {
    specVerdict: 'fail', qualityVerdict: 'fail',
    checklist: [{ item: '他变更问题', result: 'fail' }],
    reviewerNotes: '他变更',
  })
  const got = await collectSameStagePriorReview(rt, STAGE, CHANGE)
  assert(got.priorRunId === 'review-2026-09-16-100000', '场景3：他变更的更新轮被过滤')
  assert(got.openFindings[0].includes('本变更问题'), '场景3：采的是本变更轮')
  rmSync(rt, { recursive: true, force: true })
}

// ── 场景 4：骨架轮跳过（取更早的真实轮） ─────────────────────────────────────
{
  const rt = mkdtempSync(join(tmpdir(), 'sr-prior-round-4-'))
  writeRound(rt, STAGE, 'review-2026-09-16-100000', CHANGE, {
    specVerdict: 'fail', qualityVerdict: 'fail',
    checklist: [{ item: '骨架前真实问题', result: 'fail' }],
    reviewerNotes: '真实第一轮',
  })
  // register-stage-review 生成的骨架（新 runId、双 cannot_verify、骨架 notes）
  writeRound(rt, STAGE, 'review-2026-09-16-130000', CHANGE, {
    specVerdict: 'cannot_verify', qualityVerdict: 'cannot_verify',
    requiredEvidence: ['待独立审查子代理对照 plan.md 逐节核验（骨架由 register-stage-review 生成）'],
    reviewerNotes: '骨架由 register-stage-review 生成，verdict 待独立审查子代理填写',
  })
  const got = await collectSameStagePriorReview(rt, STAGE, CHANGE)
  assert(got.priorRunId === 'review-2026-09-16-100000', '场景4：骨架轮跳过，取更早真实轮')
  rmSync(rt, { recursive: true, force: true })
}

// ── 场景 5：无效态 → null（无目录 / 全骨架 / 全他变更 / 坏 JSON） ────────────
{
  const rtEmpty = mkdtempSync(join(tmpdir(), 'sr-prior-round-5a-'))
  assert((await collectSameStagePriorReview(rtEmpty, STAGE, CHANGE)) === null, '场景5a：无 stage-reviews 目录 → null')
  rmSync(rtEmpty, { recursive: true, force: true })

  const rtSkeleton = mkdtempSync(join(tmpdir(), 'sr-prior-round-5b-'))
  writeRound(rtSkeleton, STAGE, 'review-2026-09-16-100000', CHANGE, {
    specVerdict: 'cannot_verify', qualityVerdict: 'cannot_verify',
    reviewerNotes: '骨架由 register-stage-review 生成，verdict 待独立审查子代理填写',
  })
  assert((await collectSameStagePriorReview(rtSkeleton, STAGE, CHANGE)) === null, '场景5b：仅骨架轮 → null')
  rmSync(rtSkeleton, { recursive: true, force: true })

  const rtBad = mkdtempSync(join(tmpdir(), 'sr-prior-round-5c-'))
  const badDir = join(rtBad, 'stage-reviews', `${STAGE}-review-2026-09-16-100000`)
  mkdirSync(badDir, { recursive: true })
  writeFileSync(join(badDir, 'review.json'), '{not valid json')
  assert((await collectSameStagePriorReview(rtBad, STAGE, CHANGE)) === null, '场景5c：坏 JSON 轮跳过 → null（不抛）')
  rmSync(rtBad, { recursive: true, force: true })
}

// ── 场景 6：marker 同 run 已写 review（同目录覆盖式复审）→ 它就是最新轮 ──────
{
  const rt = mkdtempSync(join(tmpdir(), 'sr-prior-round-6-'))
  writeRound(rt, STAGE, 'review-2026-09-16-090000', CHANGE, {
    specVerdict: 'fail', qualityVerdict: 'fail',
    checklist: [{ item: '第一轮问题', result: 'fail' }],
    reviewerNotes: '第一轮',
  })
  // 复审覆盖写同一 runId（prompt marker 复用 → 子代理再写同目录）
  writeRound(rt, STAGE, 'review-2026-09-16-090000', CHANGE, {
    specVerdict: 'fail', qualityVerdict: 'pass',
    checklist: [{ item: '第二轮新问题', result: 'fail' }],
    reviewerNotes: '同 run 覆盖复审',
  })
  const got = await collectSameStagePriorReview(rt, STAGE, CHANGE)
  assert(got !== null && got.openFindings[0].includes('第二轮新问题'), '场景6：同 run 覆盖后采到的是最新内容')
  rmSync(rt, { recursive: true, force: true })
}

// ── 场景 7：verdict=fail 但 checklist 无明细 → notes 合成 openFinding ─────────
{
  const rt = mkdtempSync(join(tmpdir(), 'sr-prior-round-7-'))
  writeRound(rt, STAGE, 'review-2026-09-16-100000', CHANGE, {
    specVerdict: 'fail', qualityVerdict: 'fail',
    reviewerNotes: 'fail：整体状态机与 design 冲突，需重写流转段',
  })
  const got = await collectSameStagePriorReview(rt, STAGE, CHANGE)
  assert(got !== null && got.openFindings.length === 1, '场景7：无 checklist 时合成 1 条')
  assert(got.openFindings[0].includes('状态机与 design 冲突'), '场景7：合成条目含 notes 内容')
  assert(got.openFindings[0].includes('verdict-fail'), '场景7：合成条目带 [verdict-fail] 标记')
  rmSync(rt, { recursive: true, force: true })
}

// ── 场景 8：全 pass 无未决（重开复审场景）→ pass 面仍回灌 ─────────────────────
{
  const rt = mkdtempSync(join(tmpdir(), 'sr-prior-round-8-'))
  writeRound(rt, STAGE, 'review-2026-09-16-100000', CHANGE, {
    specVerdict: 'pass', qualityVerdict: 'pass',
    checklist: [{ item: '已实证结论X', result: 'pass' }],
    reviewerNotes: '上一轮全过（变更重开后复审）',
  })
  const got = await collectSameStagePriorReview(rt, STAGE, CHANGE)
  assert(got !== null && got.openFindings.length === 0 && got.passItems.length === 1, '场景8：纯 pass 轮仍返回 pass 面')
  rmSync(rt, { recursive: true, force: true })
}

// ── 场景 9：renderPriorRoundFindingsMd 渲染契约 ───────────────────────────────
{
  const md = renderPriorRoundFindingsMd({
    priorRunId: 'review-2026-09-16-110000',
    verdicts: 'spec=fail, quality=pass',
    openFindings: ['[fail] Wave 依赖成环', '[gap] plan_level 档位'],
    passItems: ['task 编号格式正确'],
    notesPreview: '第二轮',
  })
  assert(md.includes('review-2026-09-16-110000'), '场景9：头行含 runId')
  assert(md.includes('spec=fail, quality=pass'), '场景9：头行含 verdicts')
  assert(md.includes('唯一基准面'), '场景9：含唯一基准面排他语（原增量为主，task-02 翻新）')
  assert(md.includes('未决问题') && md.includes('[fail] Wave 依赖成环'), '场景9：未决段渲染')
  assert(md.includes('勿重复报告') && md.includes('task 编号格式正确'), '场景9：pass 段渲染（勿重复报告语义）')
  assert(md.includes('未解决必须如实再次 fail'), '场景9：未决项核验语义（漏放行=假通过防线）')

  const mdPassOnly = renderPriorRoundFindingsMd({
    priorRunId: 'review-2026-09-16-100000', verdicts: 'spec=pass, quality=pass',
    openFindings: [], passItems: ['已实证结论X'], notesPreview: '',
  })
  assert(!mdPassOnly.includes('未决问题'), '场景9b：无未决不渲染未决段')
  assert(mdPassOnly.includes('已实证结论X'), '场景9b：pass 段仍渲染')

  assert(renderPriorRoundFindingsMd(null) === '', '场景9c：null → 空串')
}

// ── 场景 10：cap 截断（>15 条显示 15/N） ──────────────────────────────────────
{
  const many = Array.from({ length: 20 }, (_, i) => `[fail] 问题${i + 1}`)
  const md = renderPriorRoundFindingsMd({
    priorRunId: 'review-2026-09-16-100000', verdicts: 'spec=fail, quality=fail',
    openFindings: many, passItems: [], notesPreview: '',
  })
  assert(md.includes('15/20 条'), '场景10：截断显示 15/20 条')
  assert(!md.includes('问题20'), '场景10：第 20 条不进渲染')
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
