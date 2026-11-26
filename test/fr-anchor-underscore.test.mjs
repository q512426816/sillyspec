/**
 * 2026-11-26-fr-anchor-underscore-domain-align：FR 域词表两侧对齐（补下划线）。
 *
 * 病根（docs/sillyspec/2026-11-25-flow-done-test-binding-underscore-domain-rejected.md）：
 * 发号侧域取自模块 id（tool_gateway 等目录名形态，下划线合法；决策域默认正则同含 _），
 * 而绑定校验（ANCHOR_RE）与提炼/图解析正则的域字符类均不含 _——FR-tool_gateway-001
 * 被拒「anchor 非法」（fail-open：归档提升静默失败）、FR_SECTION_RE 重读知识文件时
 * 静默跳过带下划线节头。本文件按 FR-01/02/03 三组锁定对齐后行为；实现未动时全红。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { ANCHOR_RE, normalizeRow, upsertFrBindings, queryByChange, resolveTestFileOwners } from '../src/test-bindings.js'
import { FR_SECTION_RE } from '../src/fr-index.js'
import * as frIndex from '../src/fr-index.js'
import { splitKnowledgeSections } from '../src/decision-distill.js'
import { buildKnowledgeGraph } from '../src/knowledge-graph.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const UNDERSCORE_ID = 'FR-tool_gateway-001'

function mkKnowledgeFile(root, frId, domainFile = 'tool_gateway') {
  const knowledgeRoot = join(root, 'knowledge')
  mkdirSync(join(knowledgeRoot, 'fr'), { recursive: true })
  writeFileSync(join(knowledgeRoot, 'fr', `${domainFile}.md`), [
    '# FR 需求索引',
    '',
    `## ${frId} 测试域词表行为`,
    '',
    '正文行',
    '',
  ].join('\n'))
  return knowledgeRoot
}

/* ── FR-01：绑定行归档提升接受含下划线域锚 ──────────────────────────── */

test('FR-01: ANCHOR_RE 接受含下划线域锚，normalizeRow 不再拒收', () => {
  assert.equal(ANCHOR_RE.test(UNDERSCORE_ID), true)
  assert.equal(ANCHOR_RE.test('FR-frontend_components-012'), true)
  const row = normalizeRow({
    anchor: UNDERSCORE_ID,
    row_id: '2026-11-26-x:task-01:acc-1',
    tests: ['test/foo.test.mjs'],
    reason: 'spec',
    state: 'candidate',
  })
  assert.equal(row.anchor, UNDERSCORE_ID)
})

test('FR-01: upsertFrBindings 以含下划线域锚成功写入知识文件机器子块', () => {
  const root = mk('fr-anchor-us-')
  const knowledgeRoot = mkKnowledgeFile(root, UNDERSCORE_ID)
  const res = upsertFrBindings({
    knowledgeRoot,
    frId: UNDERSCORE_ID,
    rows: [{
      row_id: '2026-11-26-x:task-01:acc-1',
      tests: ['test/foo.test.mjs'],
      reason: 'spec',
      state: 'candidate',
      source_change: '2026-11-26-x',
    }],
  })
  assert.equal(res.ok, true)
  const after = readFileSync(join(knowledgeRoot, 'fr', 'tool_gateway.md'), 'utf8')
  assert.ok(after.includes('2026-11-26-x:task-01:acc-1'), '绑定行应写入机器子块')
})

/* ── FR-02：提炼与消费两侧词表同源（重读/扫描/图解析不丢带下划线节） ── */

test('FR-02: FR_SECTION_RE / FR_GLOBAL_ID_RE 接受含下划线域', () => {
  const m = '## FR-tool_gateway-001 测试域词表行为'.match(FR_SECTION_RE)
  assert.ok(m, 'FR_SECTION_RE 应命中带下划线域节头')
  assert.equal(m[1], UNDERSCORE_ID)
  assert.ok(frIndex.FR_GLOBAL_ID_RE, 'FR_GLOBAL_ID_RE 应导出（词表单源可测）')
  assert.equal(frIndex.FR_GLOBAL_ID_RE.test(UNDERSCORE_ID), true)
})

test('FR-02: 知识文件重读不丢带下划线的 FR 节（splitKnowledgeSections 对齐消费口径）', () => {
  const root = mk('fr-anchor-us-rd-')
  const knowledgeRoot = mkKnowledgeFile(root, UNDERSCORE_ID)
  const text = readFileSync(join(knowledgeRoot, 'fr', 'tool_gateway.md'), 'utf8')
  const { sections } = splitKnowledgeSections(text, { sectionRegex: FR_SECTION_RE, buildId: (n) => n })
  assert.ok(sections.some((s) => s.number === UNDERSCORE_ID), '带下划线节应被解析（此前静默丢节）')
})

test('FR-02: queryByChange / resolveTestFileOwners 扫描含下划线域节头', () => {
  const root = mk('fr-anchor-us-scan-')
  const knowledgeRoot = mkKnowledgeFile(root, UNDERSCORE_ID)
  const row = {
    row_id: '2026-11-26-x:task-02:acc-2',
    tests: ['test/foo.test.mjs'],
    reason: 'spec',
    state: 'active',
    confirmed_by: 'agent',
    source_change: '2026-11-26-x',
  }
  const up = upsertFrBindings({ knowledgeRoot, frId: UNDERSCORE_ID, rows: [row] })
  assert.equal(up.ok, true)

  const byChange = queryByChange({ specBase: root, knowledgeRoot, sourceChange: '2026-11-26-x' })
  assert.ok(byChange.some((r) => r.row_id === '2026-11-26-x:task-02:acc-2'), '按变更查询应命中带下划线域条目下的行')

  const owners = resolveTestFileOwners({ specBase: root, files: ['test/foo.test.mjs'] })
  const hit = [...(owners.get('test/foo.test.mjs') || [])]
  assert.ok(hit.some((e) => e.anchor === UNDERSCORE_ID), '文件归属面应命中带下划线域锚')
})

test('FR-02: buildKnowledgeGraph 解析含下划线域 FR 节', () => {
  const root = mk('fr-anchor-us-graph-')
  mkKnowledgeFile(root, UNDERSCORE_ID)
  const graph = buildKnowledgeGraph(root)
  assert.ok(JSON.stringify(graph).includes(UNDERSCORE_ID), '图应包含带下划线域的 FR 节点')
})

/* ── FR-03：既有形态零回归 ──────────────────────────────────────────── */

test('FR-03: 既有合法锚形态照常通过，既有非法形态照常拒收', () => {
  // 既有合法形态
  for (const ok of ['FR-auth-001', 'FR-01', 'FR-cli-entry-core-003', 'ql-20260821-001-abcd', 'null']) {
    assert.equal(ANCHOR_RE.test(ok), true, `应继续接受：${ok}`)
  }
  assert.equal(normalizeRow({
    anchor: 'FR-auth-001',
    row_id: 'c:t:a',
    tests: ['test/a.test.mjs'],
    reason: 'spec',
    state: 'candidate',
  }).anchor, 'FR-auth-001')
  // 既有非法形态（禁 CAP 第四空间等）
  for (const bad of ['CAP-001', 'FR-tool_gateway', 'FR-001-x', 'random']) {
    assert.equal(ANCHOR_RE.test(bad), false, `应继续拒绝：${bad}`)
  }
})
