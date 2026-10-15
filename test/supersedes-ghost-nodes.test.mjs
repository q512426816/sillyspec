/**
 * supersedes 幽灵版本节点（2026-10-15-supersedes-ghost-nodes）
 *
 * 根因：同号版本取代是蒸馏就地替换（applyEntryToSections 同变更同段旧版清除），supersedes
 * 引用的目标版本从不在场——真实库实证 39 条引用 0 条可解析、703 决策节点全图仅 1 条边。
 * 修法：图构建时目标缺失 → 合成 superseded 幽灵节点承接 supersedes 边。
 *
 * 锁四面：
 *   ① 幽灵节点在场：id=decision:<file>#<sid>@<change>、status=superseded、ghost=true、
 *      label 带「已被 … 取代」
 *   ② supersedes 边在场：现行版本 → 幽灵
 *   ③ summary byEdge.supersedes 计数与幽灵非孤儿（有入边）
 *   ④ 目标在场（同文件同变更真实条目）时不合成幽灵——既有可解析路径零回归
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildKnowledgeGraph, graphSummary, graphOrphans } from '../src/knowledge-graph.js'

function seedRepo() {
  const root = mkdtempSync(join(tmpdir(), 'ss-ghost-'))
  const kb = join(root, '.sillyspec', 'knowledge')
  mkdirSync(join(kb, 'decisions'), { recursive: true })
  writeFileSync(join(kb, 'INDEX.md'), [
    '# Knowledge Index', '', '## Decisions',
    '- demo|decision|决策 → [decisions/demo.md](decisions/demo.md)', '',
  ].join('\n'))
  // 四条目：D-001@v2（supersedes 引 D-001@v1——v1 已被就地替换不在场→同号自链→幽灵）；
  // D-002@v1（在场真实条目）；D-003@v2（supersedes 引 D-002@v1——目标在场→真实边不合成幽灵）；
  // D-004@v1（supersedes 引 D-009@v1——跨号且不存在→不合成，误连防护不因幽灵复活）
  writeFileSync(join(kb, 'decisions', 'demo.md'), [
    '# 决策知识 — demo', '',
    '## D-001@v2 用方案 B 重做缓存',
    '变更：2026-10-15-ghost-fixture',
    '状态：implemented',
    'supersedes：D-001@v1',
    '理由：v1 方案慢。', '',
    '## D-002@v1 直连表查询',
    '变更：2026-10-15-ghost-fixture',
    '状态：implemented',
    '理由：初始方案。', '',
    '## D-003@v2 加索引加速',
    '变更：2026-10-15-ghost-fixture',
    '状态：implemented',
    'supersedes：D-002@v1',
    '理由：索引替代重写。', '',
    '## D-004@v1 跨号缺失引用者',
    '变更：2026-10-15-ghost-fixture',
    '状态：implemented',
    'supersedes：D-009@v1',
    '理由：引用不存在决策——不得铸造幽灵。', '',
  ].join('\n'))
  return root
}

test('①② 幽灵节点+supersedes 边：同号自链缺失合成、在场真边、跨号缺失不合成', () => {
  const root = seedRepo()
  try {
    const g = buildKnowledgeGraph(join(root, '.sillyspec'))
    const ghostId = 'decision:decisions/demo.md#D-001@v1@2026-10-15-ghost-fixture'
    const ghost = g.nodes.get(ghostId)
    assert.ok(ghost, '① 幽灵节点在场')
    assert.equal(ghost.attrs.ghost, true, '① ghost 标记')
    assert.equal(ghost.attrs.status, 'superseded', '① status=superseded')
    assert.equal(ghost.attrs.supersededBy, 'D-001@v2', '① supersededBy 回指现行版本')
    assert.ok(/已被 D-001@v2 取代/.test(ghost.label), '① label 带取代注记')
    const hasEdge = g.edges.some((e) => e.type === 'supersedes' && e.s === 'decision:decisions/demo.md#D-001@v2@2026-10-15-ghost-fixture' && e.t === ghostId)
    assert.ok(hasEdge, '② 现行版本 → 幽灵 supersedes 边在场')
    // ④ 目标在场（D-002@v1）→ 不合成幽灵，真实边直连
    const ghostFor002 = [...g.nodes.values()].filter((n) => n.attrs.ghost && n.id.includes('D-002@v1'))
    assert.equal(ghostFor002.length, 0, '④ 目标在场不合成幽灵')
    const realEdge = g.edges.some((e) => e.type === 'supersedes' && e.t === 'decision:decisions/demo.md#D-002@v1@2026-10-15-ghost-fixture')
    assert.ok(realEdge, '④ 在场目标走真实边')
    // ⑤ 跨号缺失引用（D-004 引 D-009）→ 不铸造幽灵（2026-10-14 误连防护不因幽灵形态复活）
    const ghostFor009 = [...g.nodes.values()].filter((n) => n.attrs.ghost && n.id.includes('D-009'))
    assert.equal(ghostFor009.length, 0, '⑤ 跨号缺失引用不铸造幽灵')
    const edge009 = g.edges.some((e) => e.type === 'supersedes' && e.s.includes('D-004@v1'))
    assert.ok(!edge009, '⑤ 跨号缺失引用零 supersedes 边')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('③ summary 计数与孤儿面：幽灵非孤儿、supersedes 计数正确', () => {
  const root = seedRepo()
  try {
    const g = buildKnowledgeGraph(join(root, '.sillyspec'))
    const s = graphSummary(g)
    assert.equal(s.byEdge.supersedes, 2, 'supersedes 边 = 幽灵边1 + 真实边1')
    const orphanIds = graphOrphans(g).map((o) => o.node.id)
    assert.ok(!orphanIds.includes('decision:decisions/demo.md#D-001@v1@2026-10-15-ghost-fixture'), '幽灵有入边非孤儿')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
