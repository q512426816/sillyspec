/**
 * decision-id-p2-hardening.test.mjs — 决策 ID 体系 P2 收尾（2026-10-14-decision-id-p2-hardening）
 *
 * 覆盖：① 「来源：」legacy 兜底读（knowledge-match/docs-check 两解析器 + decision-distill
 *          splitKnowledgeSections 来源回退与重蒸馏在位更新收敛 + 变更优先）
 *      ② 折叠修复（双 legacy 同号共存 + 路由行重复单解析）
 *      ③ 豁免键域限定（decisions.<域>/<id>[.<kind>] 命中 / 裸键兼容 / 他域同号不豁免）
 *      ⑤ 引用契约接线钉（两处防复潮段头含 变更名#D-xxx@vN）
 * ④（已回应行级收紧）在 test/knowledge-gate-denoise.test.mjs。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { parseDecisionEntries } = await import(pathToFileURL(join(ROOT, 'src', 'knowledge-match.js')).href)
const { parseDecisionEntries: parseDocsCheck, isDecisionExempt } = await import(pathToFileURL(join(ROOT, 'src', 'docs-check.js')).href)
const { splitKnowledgeSections, distillIntoKnowledge } = await import(pathToFileURL(join(ROOT, 'src', 'decision-distill.js')).href)

/** 最小知识库夹具：INDEX 路由行（可多条）+ decisions/core.md */
function mkKnowledge(entries, { routes = 1 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dip2-'))
  const k = join(dir, 'knowledge')
  mkdirSync(join(k, 'decisions'), { recursive: true })
  const route = '- core|decision|决策 → [decisions/core.md](decisions/core.md)'
  writeFileSync(join(k, 'INDEX.md'), ['# Knowledge Index', '', '## Decisions', ...(Array.from({ length: routes }, () => route)), ''].join('\n'))
  writeFileSync(join(k, 'decisions', 'core.md'), ['# 决策知识 — core', '', ...entries].join('\n'))
  return { dir, k }
}

test('① 来源兜底：三解析器读出来源行、变更优先、distill 在位更新收敛', () => {
  // knowledge-match：仅来源行 → change 可见；变更行在前仍覆盖来源
  {
    const { dir, k } = mkKnowledge([
      '## D-001@v1 只有来源', '状态：implemented', '来源：2026-01-01-alpha', '',
      '## D-002@v1 双行', '状态：implemented', '来源：2026-01-02-beta', '变更：2026-01-03-gamma', '',
    ])
    try {
      const hits = parseDecisionEntries(k)
      assert.equal(hits.find(h => h.id === 'D-001@v1').change, '2026-01-01-alpha', '来源兜底读入（机器可见）')
      assert.equal(hits.find(h => h.id === 'D-002@v1').change, '2026-01-03-gamma', '变更优先（来源行在前仍被变更覆盖）')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }
  // docs-check 解析器同口径兜底
  {
    const entries = parseDocsCheck(['## D-001@v1 t', '状态：implemented', '来源：2026-01-01-alpha', ''].join('\n'))
    assert.equal(entries[0].change, '2026-01-01-alpha', 'docs-check parseDecisionEntries 来源兜底')
  }
  // decision-distill：splitKnowledgeSections 来源回退 + 重蒸馏在位更新（同号只留一段、收敛为「变更：」形态）
  {
    const dir = mkdtempSync(join(tmpdir(), 'dip2d-'))
    try {
      const knowledgeRoot = join(dir, 'knowledge')
      const decisionsDir = join(knowledgeRoot, 'decisions')
      mkdirSync(decisionsDir, { recursive: true })
      // legacy 段落 unmapped 域（无模块图 fixture 的域路由终点）
      writeFileSync(join(decisionsDir, 'unmapped.md'), [
        '# 决策知识 — unmapped', '',
        '## D-001@v1 legacy 带来源', '状态：implemented', '来源：2026-01-01-alpha', '锚点：src/a.js', '',
      ].join('\n'))
      const { sections } = splitKnowledgeSections(readFileSync(join(decisionsDir, 'unmapped.md'), 'utf8'))
      assert.equal(sections[0].change, '2026-01-01-alpha', 'splitKnowledgeSections 来源回退（legacy 参与同变更匹配）')
      const changeDir = join(dir, 'changes', '2026-01-01-alpha')
      mkdirSync(changeDir, { recursive: true })
      writeFileSync(join(changeDir, 'decisions.md'), [
        '# 决策记录', '',
        '## D-001@v2 升级版', '- 类型：architecture', '- 状态：accepted', '',
      ].join('\n'))
      const r = distillIntoKnowledge(changeDir, knowledgeRoot, 'deadbeef')
      assert.ok(r.written.some(w => w.action === 'update' || w.action === 'supersede'), `在位更新（非 append 重复）：${JSON.stringify(r.written)}`)
      const after = readFileSync(join(decisionsDir, 'unmapped.md'), 'utf8')
      assert.equal((after.match(/^## D-001@v\d+/gm) || []).length, 1, '同号只留一段')
      assert.match(after, /变更：2026-01-01-alpha/, '更新段写「变更：」形态')
      assert.doesNotMatch(after, /来源：2026-01-01-alpha/, 'legacy 来源行被收敛替换')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }
})

test('② 折叠修复：双 legacy 同号共存 + 路由行重复单解析', () => {
  // 双 legacy 同号（无任何限定行）不再互折叠
  {
    const { dir, k } = mkKnowledge([
      '## D-001@v1 甲', '状态：implemented', '',
      '## D-001@v1 乙', '状态：rejected', '否决理由：x', '复潮条件：y', '',
    ])
    try {
      const hits = parseDecisionEntries(k)
      assert.equal(hits.filter(h => h.id === 'D-001@v1').length, 2, '双 legacy 同号共存（不再先到遮蔽）')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }
  // 路由行重复（两条）+ 双 legacy：单解析 + 不折叠 → 2 条（旧形态会折叠为 1）
  {
    const { dir, k } = mkKnowledge([
      '## D-001@v1 甲', '状态：implemented', '',
      '## D-001@v1 乙', '状态：implemented', '',
    ], { routes: 2 })
    try {
      const hits = parseDecisionEntries(k)
      assert.equal(hits.length, 2, `路由重复单解析 + legacy 不折叠（实际 ${hits.length}）`)
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }
  // 带 change 条目跨路由重复仍折叠（file+id+change 键）
  {
    const { dir, k } = mkKnowledge([
      '## D-001@v1 甲', '状态：implemented', '变更：c1', '',
    ], { routes: 3 })
    try {
      assert.equal(parseDecisionEntries(k).length, 1, '带 change 条目沿用键去重（路由重复不放大）')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }
})

test('③ 豁免键域限定：decisions.<域>/<id>[.<kind>] 命中、裸键兼容、他域同号不豁免', () => {
  assert.ok(isDecisionExempt(['decisions.core-engine/D-001@v1.anchor'], 'D-001@v1', 'anchor', 'core-engine'), '域限定规则级命中')
  assert.ok(isDecisionExempt(['decisions.core-engine/D-001@v1'], 'D-001@v1', 'behind', 'core-engine'), '域限定条目级伞形')
  assert.ok(!isDecisionExempt(['decisions.core-engine/D-001@v1.anchor'], 'D-001@v1', 'anchor', 'backend'), '他域同号不豁免（收窄命中面）')
  assert.ok(!isDecisionExempt(['decisions.core-engine/D-001@v1.anchor'], 'D-001@v1', 'behind', 'core-engine'), '域限定规则级 kind 不匹配不豁免')
  assert.ok(isDecisionExempt(['decisions.D-001@v1.anchor'], 'D-001@v1', 'anchor', 'backend'), '裸键兼容（规则级）')
  assert.ok(isDecisionExempt(['decisions.D-001@v1'], 'D-001@v1', 'behind', 'backend'), '裸键兼容（条目级）')
})

test('⑤ 引用契约接线钉：两处段头含 变更名#D-xxx@vN', () => {
  const prompt = readFileSync(join(ROOT, 'src', 'run', 'prompt.js'), 'utf8')
  const flow = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.ok(prompt.includes('变更名#D-xxx@vN'), '{DECISION_HITS} 段头引用契约指引')
  assert.ok(flow.includes('变更名#D-xxx@vN'), '轻量道防复潮段头引用契约指引')
})
