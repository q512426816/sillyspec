/**
 * plan-review-focus.test.mjs — 计划盲区清单与比例自检（2026-10-15-plan-review-focus）
 *
 * 对照 obra/superpowers writing-plans 的 Review Focus 节（v6.4.1，eval 实证：
 * 所有实现者都在「规格隐含但从未具名的输入」上交付同一崩溃）与比例自检（v6.4.2，
 * 计划时间 1/4、token 1/3 且质量探针不退化），锁住 plan 阶段四处产物面：
 *   FR-01 light/full 模板含「Review Focus 盲区清单」节（≤5 条/排序/承接落点/「已检查，无」出口）；
 *         none 模板不含（占位不加厚）
 *   FR-02 light/full 约束含比例自检（转录不是计划；签名+测试断言+规格精确值）
 *   FR-03 审查计划步含补充复查三项（Review Focus 承接 / 比例自检复核 / 共享面预扫留表）
 *   FR-04 派生件（docs/prompt/plan.md、_extracted.json）与源一致
 *   FR-05 契约不变面：stage-review-checklist.js 不在本变更触碰范围（快照测试自证）
 *
 * 读法：直接读源文件文本按模板/步骤切段断言——不 import stages/plan.js（其 import 面重，
 * 且文本断言无需运行时）；派生件同法读文本。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = readFileSync(join(REPO_ROOT, 'src', 'stages', 'plan.js'), 'utf8')
const DERIVED_MD = readFileSync(join(REPO_ROOT, 'docs', 'prompt', 'plan.md'), 'utf8')
const DERIVED_JSON = readFileSync(join(REPO_ROOT, 'docs', 'prompt', '_extracted.json'), 'utf8')

/** 按 `#### plan_level = X` 标题切段（生成步模板区）。 */
function levelSeg(level) {
  const start = SRC.indexOf(`#### plan_level = ${level}`)
  assert.ok(start >= 0, `plan_level = ${level} 模板段在场`)
  const markers = { none: '#### plan_level = light', light: '#### plan_level = full', full: '### Spike 前置验证（仅 full）' }
  const nextIdx = SRC.indexOf(markers[level], start + 1)
  return SRC.slice(start, nextIdx === -1 ? SRC.length : nextIdx)
}

/** 按步骤定义起点切段。 */
function stepSeg(stepName) {
  const start = SRC.indexOf(`name: '${stepName}',`)
  assert.ok(start >= 0, `步骤「${stepName}」定义在场`)
  const nextIdx = SRC.indexOf("\n      name: '", start + 1)
  return SRC.slice(start, nextIdx === -1 ? SRC.length : nextIdx)
}

const LIGHT = levelSeg('light')
const FULL = levelSeg('full')
const NONE = levelSeg('none')
const REVIEW = stepSeg('审查计划')

test('FR-01 light/full 模板含 Review Focus 盲区清单节（≤5 条 + 排序 + 承接落点 + 「已检查，无」出口）', () => {
  for (const [label, seg] of [['light', LIGHT], ['full', FULL]]) {
    assert.match(seg, /Review Focus 盲区清单（隐含面）/, `${label}：节名在场`)
    assert.match(seg, /≤5 条/, `${label}：上限在场`)
    assert.match(seg, /按最可能坑到人排序/, `${label}：排序要求在场`)
    assert.match(seg, /没有任何任务测试覆盖/, `${label}：隐含面口径在场`)
    assert.match(seg, /承接落点/, `${label}：承接落点要求在场`)
    assert.match(seg, /已检查，无/, `${label}：空节显式出口在场`)
    assert.match(seg, /不留空、不编造/, `${label}：反占位约束在场`)
  }
  // none 模板不加厚
  assert.ok(!NONE.includes('Review Focus'), 'none 占位模板不含盲区清单节')
})

test('FR-01 隐含面与泛泛风险互斥（行=具体输入+可判定预期）', () => {
  for (const [label, seg] of [['light', LIGHT], ['full', FULL]]) {
    assert.match(seg, /泛泛风险（[^）]*）不算行|泛泛风险分析不算行/, `${label}：与泛泛风险分析互斥的口径在场`)
  }
})

test('FR-02 light/full 约束含比例自检（转录不是计划）且既有约束不冲销', () => {
  for (const [label, seg] of [['light', LIGHT], ['full', FULL]]) {
    assert.match(seg, /比例自检/, `${label}：比例自检条在场`)
    assert.match(seg, /转录不是计划/, `${label}：判据在场`)
    assert.match(seg, /签名、测试断言与规格精确值|签名\+测试断言\+规格精确值/, `${label}：承载口径在场`)
  }
  // 既有约束保留
  assert.match(LIGHT, /禁止.*估时/, 'light：禁止估时保留')
  assert.match(LIGHT, /禁止.*泛泛风险分析/, 'light：禁止泛泛风险分析保留')
  assert.match(LIGHT, /禁止.*放实现细节/, 'light：禁止实现细节保留')
  assert.match(FULL, /禁止.*估时/, 'full：禁止估时保留')
})

test('FR-03 审查计划步补充复查三项在场（承接复查 / 比例复核 / 共享面预扫留表）', () => {
  assert.match(REVIEW, /补充复查（2026-10-15-plan-review-focus）/, '补充复查节在场')
  assert.match(REVIEW, /Review Focus 承接复查/, '项一：承接复查在场')
  assert.match(REVIEW, /已检查，无/, '项一：空节口径在场')
  assert.match(REVIEW, /比例自检复核/, '项二：比例复核在场')
  assert.match(REVIEW, /共享面预扫留表/, '项三：预扫留表在场')
  assert.match(REVIEW, /"scan is clean" 而无表格行 = 没扫过|scan is clean.*没扫过/, '项三：无行不算扫过')
  assert.match(REVIEW, /每张卡自洽/, '项三：单卡自洽面在场')
})

test('FR-04 派生件与源一致：docs/prompt/plan.md 与 _extracted.json 均含新文本', () => {
  for (const key of ['Review Focus 盲区清单（隐含面）', '比例自检', '补充复查（2026-10-15-plan-review-focus）', '共享面预扫留表']) {
    assert.ok(DERIVED_MD.includes(key), `plan.md 派生件含「${key}」`)
    assert.ok(DERIVED_JSON.includes(key), `_extracted.json 含「${key}」`)
  }
})

test('FR-05 契约不变面：stage-review-checklist.js 的 plan 清单未被本变更触碰（单一来源零改动）', () => {
  const checklistSrc = readFileSync(join(REPO_ROOT, 'src', 'stage-review-checklist.js'), 'utf8')
  // 本变更三项走 prompt 侧独立小节，不进清单单一来源（该文件有快照测试与字面引用面）
  assert.ok(!checklistSrc.includes('2026-10-15-plan-review-focus'), '清单单一来源未夹带本变更标记')
  assert.ok(!checklistSrc.includes('共享面预扫留表'), '清单单一来源未新增预扫条目')
  assert.ok(!checklistSrc.includes('比例自检'), '清单单一来源未新增比例自检条目')
})
