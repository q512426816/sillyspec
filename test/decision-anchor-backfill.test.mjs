/**
 * 决策锚点自动回填（2026-10-15-decision-anchor-backfill）
 *
 * 背景：决策↔代码的图谱边唯一来源是「锚点：」字段，而锚点覆盖率两仓塌方
 * （8 月 25% → 10 月 2-4%；存量 85% 未记录）——模板可选+槽4 收割不填+蒸馏渲染占位。
 * 修法双端（单一源 anchorBackfillCandidate，恰一路径 token 即高置信）：
 *   ① 单元：恰一路径（含 :行号）/多路径→null/仅裸名→null/自引用排除/空→null
 *   ② 收割端：harvestSlot4Decision——风险段恰一路径 → 产出 - 锚点：行；无路径 → 无该行
 *   ③ 蒸馏端：distillIntoKnowledge——条目无锚点正文含单一路径 → 蒸馏段锚点=该路径；
 *      多路径 → 未记录；既有锚点不覆盖
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { anchorBackfillCandidate, distillIntoKnowledge } from '../src/decision-distill.js'
import { harvestSlot4Decision } from '../src/flow-parity.js'

// ── ① 单元 ───────────────────────────────────────────────────────────────────

test('① anchorBackfillCandidate 全形态', () => {
  assert.equal(anchorBackfillCandidate('改了 src/flow.js 的注入导线'), 'src/flow.js', '恰一路径')
  assert.equal(anchorBackfillCandidate('落点 src/flow.js:324 渲染行'), 'src/flow.js:324', ':行号形态原生支持')
  assert.equal(anchorBackfillCandidate('动了 src/a.js 与 lib/b.ts 两处'), null, '多路径 → null')
  assert.equal(anchorBackfillCandidate('只提 execute.js 裸名不构成锚'), null, '仅裸名 → null')
  assert.equal(anchorBackfillCandidate('治理面 .sillyspec/knowledge/decisions/x.md 与 src/flow.js'), 'src/flow.js', '自引用排除后恰一')
  assert.equal(anchorBackfillCandidate('只在 .sillyspec/knowledge/x.md 打转'), null, '纯自引用 → null')
  assert.equal(anchorBackfillCandidate('归档溯源 changes/archive/2026-10-15-x/requirements.md 之外无路径'), null, '归档路径排除')
  assert.equal(anchorBackfillCandidate(''), null, '空 → null')
  assert.equal(anchorBackfillCandidate('反斜杠形态 src\\flow.js 单一路径'), 'src/flow.js', '反斜杠归一')
})

// ── ② 收割端 ─────────────────────────────────────────────────────────────────

function fixtureChange(root, riskAnswer) {
  const changeDir = join(root, 'changes', '2026-10-15-anchor-fixture')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), [
    '# 设计', '', '## 风险与死路', '',
    '本方案最大的风险是什么？试过但放弃的方案及放弃理由？', '',
    riskAnswer, '',
  ].join('\n'))
  return changeDir
}

test('② 收割端：恰一路径 → - 锚点：行；无路径 → 无该行', () => {
  const root = mkdtempSync(join(tmpdir(), 'anc-hv-'))
  try {
    const d1 = fixtureChange(root, '最大风险：注入遥测写失败——落点 src/flow.js 遥测块 fail-soft 兜底')
    const r1 = harvestSlot4Decision({ changeDir: d1, change: '2026-10-15-anchor-fixture' })
    assert.equal(r1.harvested, true)
    const md1 = readFileSync(join(d1, 'decisions.md'), 'utf8')
    assert.ok(md1.includes('- 锚点：src/flow.js'), '恰一路径 → 锚点行在场')
    assert.ok(md1.includes('- 答案：'), '答案行照旧')

    const root2 = mkdtempSync(join(tmpdir(), 'anc-hv2-'))
    try {
      const d2 = fixtureChange(root2, '风险在流程语义层面：契约理解偏差，无具体文件落点')
      harvestSlot4Decision({ changeDir: d2, change: '2026-10-15-anchor-fixture' })
      const md2 = readFileSync(join(d2, 'decisions.md'), 'utf8')
      assert.ok(!md2.includes('锚点：'), '无路径 → 无锚点行（不编造）')
    } finally { rmSync(root2, { recursive: true, force: true }) }
  } finally { rmSync(root, { recursive: true, force: true }) }
})

// ── ③ 蒸馏端 ─────────────────────────────────────────────────────────────────

function seedAndDistill(root, entryBody) {
  const spec = join(root, '.sillyspec')
  mkdirSync(join(spec, 'knowledge'), { recursive: true })
  mkdirSync(join(spec, 'docs', 'p', 'modules'), { recursive: true })
  writeFileSync(join(spec, 'knowledge', 'INDEX.md'), '# x\n')
  const changeDir = join(spec, 'changes', '2026-10-15-anchor-distill')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'), [
    '---', 'author: t', '---', '',
    '# 决策记录（Decisions）— 2026-10-15-anchor-distill', '',
    entryBody, '',
  ].join('\n'))
  return distillIntoKnowledge(changeDir, join(spec, 'knowledge'), 'abc123de', null)
}

test('③ 蒸馏端：无锚点正文单一路径 → 回填；多路径 → 未记录；既有锚点不覆盖', () => {
  const root = mkdtempSync(join(tmpdir(), 'anc-ds-'))
  try {
    const r1 = seedAndDistill(root, [
      '## D-001@v1 遥测导线设计', '- 类型：process', '- 状态：confirmed', '',
      '- 答案：落点选 src/flow.js 遥测块，fail-soft 吞异常', '',
    ].join('\n'))
    assert.equal(r1.written.length, 1, '条目入选')
    const f1 = join(root, '.sillyspec', 'knowledge', 'decisions', 'unmapped.md')
    assert.ok(existsSync(f1), 'unmapped 域文件落盘（fixture 无 map）')
    const txt1 = readFileSync(f1, 'utf8')
    assert.ok(/锚点：src\/flow\.js/.test(txt1), `蒸馏段锚点=正文单一路径（实际：${(txt1.match(/锚点：.*/)||[''])[0]})`)

    // 多路径 → 未记录
    const r2 = seedAndDistill(root, [
      '## D-002@v1 双文件取舍', '- 类型：process', '- 状态：confirmed', '',
      '- 答案：在 src/a.js 与 lib/b.ts 之间选了前者', '',
    ].join('\n'))
    assert.equal(r2.written.length, 1)
    const txt2 = readFileSync(join(root, '.sillyspec', 'knowledge', 'decisions', 'unmapped.md'), 'utf8')
    assert.ok(/锚点：未记录/.test(txt2.split('## D-002')[0]) || /锚点：未记录/.test(txt2), '多候选保持未记录')

    // 既有锚点不覆盖
    const r3 = seedAndDistill(root, [
      '## D-003@v1 人工锚点条目', '- 类型：process', '- 状态：confirmed', '- 锚点：src/hand-written.js', '',
      '- 答案：正文还提到 src/another.js 不应覆盖人工值', '',
    ].join('\n'))
    assert.equal(r3.written.length, 1)
    const txt3 = readFileSync(join(root, '.sillyspec', 'knowledge', 'decisions', 'unmapped.md'), 'utf8')
    assert.ok(/锚点：src\/hand-written\.js/.test(txt3), '既有锚点不被正文回填覆盖（落盘段头为发号器全局号，全文件断言）')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
