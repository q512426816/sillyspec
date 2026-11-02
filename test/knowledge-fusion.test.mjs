/**
 * knowledge-fusion.test.mjs — 检索融合测试（2026-11-02-knowledge-fusion FR-01~FR-06）
 *
 * 核心判据：路由命中 + scopeFiles 在场时，scope 独有 rejected/手工条目/两跳必须出现在
 * scopeDecisionHits/scopeEntries；把 fuseScopeRecall 改成 return base 时本文件必红。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

process.env.SILLYSPEC_KNOWLEDGE_VECTOR = 'off'

const root = join(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '..')
const { buildKnowledgeGraph, scopeRecall, fuseScopeRecall, graphPathCandidates, matchKnowledgeWithScope } = await import(
  pathToFileURL(join(root, 'src', 'knowledge-graph.js')).href
)
const { matchByRouting } = await import(pathToFileURL(join(root, 'src', 'knowledge-match.js')).href)
const { matchKnowledgeHybrid } = await import(pathToFileURL(join(root, 'src', 'knowledge-vector.js')).href)
const { flowKnowledgeDigest } = await import(pathToFileURL(join(root, 'src', 'flow.js')).href)

/** 融合 fixture：路由命中 zebra；scope 文件 src/hot.js 上有 rejected/implemented/手工条目/ghost；
 *  归档变更 2026-03-03-z 交付 src/twohop.js（两跳 rejected）；src/many.js 上 25 条 rejected + 4 手工条目。 */
function buildFusionFixture() {
  const r = mkdtempSync(join(tmpdir(), 'kfu-'))
  const K = (p) => join(r, '.sillyspec', p)
  mkdirSync(K('knowledge/decisions'), { recursive: true })
  mkdirSync(K('knowledge/fr'), { recursive: true })
  mkdirSync(K('docs/proj/modules'), { recursive: true })
  mkdirSync(K('changes/archive/2026-03-03-z'), { recursive: true })
  writeFileSync(K('docs/proj/modules/_module-map.yaml'), 'modules:\n  demo:\n    paths:\n      - src/hot.js\n')
  writeFileSync(K('changes/archive/2026-03-03-z/design.md'), [
    '# 设计', '', '| 操作 | 路径 | 说明 |', '|---|---|---|', '| 新增 | src/twohop.js | 两跳文件 |', '',
  ].join('\n'))

  const index = [
    '# Knowledge Index', '',
    '## Conventions',
    '- zebra → [Zebra](conventions.md#zebra)', '',
    '## Decisions',
    '- hotfile|hottopic → [hot](decisions/hot.md)',
    '- twohopfile → [twohop](decisions/twohop.md)',
    '- manyfile → [many](decisions/many.md)', '',
    '## Gotchas',
    '- hotgotcha → [Hot 坑](gotchas.md#hot-坑)',
    '- manygotcha → [Many 坑](gotchas-many.md#mg)',
  ]
  for (let i = 0; i < 4; i++) index.push(`- manygotcha${i} → [M${i}](gotchas-many.md#m${i})`)
  writeFileSync(K('knowledge/INDEX.md'), index.join('\n') + '\n')
  writeFileSync(K('knowledge/conventions.md'), '# Conventions\n\n## zebra\n\n路由命中内容。\n')
  writeFileSync(K('knowledge/gotchas.md'), '# Gotchas\n\n## hot 坑\n\n引用 src/hot.js 的说明。\n')

  const manyGotchas = ['# Many Gotchas', '']
  for (let i = 0; i < 4; i++) manyGotchas.push(`## m${i}`, '', `第 ${i} 节引用 src/many.js。`, '')
  writeFileSync(K('knowledge/gotchas-many.md'), manyGotchas.join('\n'))

  writeFileSync(K('knowledge/decisions/hot.md'), [
    '## D-900@v1 热文件否决', '状态：rejected', '变更：2026-01-01-x', '锚点：src/hot.js:1', '否决理由：样例', '',
    '## D-901@v1 热文件实现', '状态：implemented', '变更：2026-01-01-x', '锚点：src/hot.js:2', '理由：样例', '',
    '## D-010@v2 版本新版', '状态：implemented', '变更：2026-01-01-x', 'supersedes：D-010@v1', '锚点：src/hot.js:9', '',
  ].join('\n'))
  writeFileSync(K('knowledge/decisions/twohop.md'), [
    '## D-700@v1 两跳否决', '状态：rejected', '变更：2026-03-03-z', '否决理由：样例', '',
  ].join('\n'))
  const many = ['# 决策 — many', '']
  for (let i = 0; i < 25; i++) many.push(`## D-60${i}@v1 批量否决 ${i}`, '状态：rejected', '变更：2026-01-01-many', '锚点：src/many.js:1', '否决理由：样例', '')
  writeFileSync(K('knowledge/decisions/many.md'), many.join('\n'))
  return r
}

function cleanup(r) { rmSync(r, { recursive: true, force: true }) }

test('FR-01/02：路由命中 + scope 独有 rejected/手工条目/两跳 只追加不重排', async () => {
  const r = buildFusionFixture()
  try {
    const kdir = join(r, '.sillyspec', 'knowledge')
    const fused = await matchKnowledgeHybrid(kdir, 'zebra', { cwd: r, scopeFiles: ['src/hot.js'] })
    assert.equal(fused.matched, true)
    assert.ok(fused.entries.some((e) => e.file === 'conventions.md'), '路由 entries 保留（zebra 行）')
    const sd = fused.scopeDecisionHits || []
    assert.ok(sd.some((h) => h.id === 'D-900@v1' && h.via === 'direct' && h.status === 'rejected'), 'scope 独有 rejected 收入（via=direct）')
    assert.ok(sd.every((h) => h.file && h.id), '无 file/id 缺失的畸形 hit（ghost 过滤）')
    assert.ok((fused.scopeEntries || []).some((e) => e.file === 'gotchas.md' && e.anchor === 'hot-坑'), 'scope 独有手工条目收入')
    assert.equal(fused.json.scope, undefined, '不设置 json.scope（保持 routing 语义）')
    // 两跳
    const twoHop = await matchKnowledgeHybrid(kdir, 'zebra', { cwd: r, scopeFiles: ['src/twohop.js'] })
    assert.ok((twoHop.scopeDecisionHits || []).some((h) => h.id === 'D-700@v1' && h.via === 'two-hop' && h.score === 1), '两跳 rejected（via=two-hop/score=1）')
    // 手工条目 cap 3（4 节 → 3）
    const manyE = await matchKnowledgeHybrid(kdir, 'zebra', { cwd: r, scopeFiles: ['src/many.js'] })
    assert.ok((manyE.scopeEntries || []).length <= 3, 'scopeEntries cap 3')
    assert.ok((manyE.scopeDecisionHits || []).length <= 20, 'scopeDecisionHits cap 20（25→20）')
    // 路由 entries 不被截断（conventions 1 条仍在）
    assert.ok(manyE.entries.some((e) => e.file === 'conventions.md'), '路由 entries 不受融合影响')
  } finally { cleanup(r) }
})

test('FR-01：无 scope / 零命中 → 与路由结果 deepEqual', async () => {
  const r = buildFusionFixture()
  try {
    const kdir = join(r, '.sillyspec', 'knowledge')
    const base = matchByRouting(kdir, 'zebra')
    const noScope = await matchKnowledgeHybrid(kdir, 'zebra', { cwd: r })
    assert.deepEqual(noScope, base, '不传 scope → 与路由结果逐字段一致')
    const empty = await matchKnowledgeHybrid(kdir, 'zebra', { cwd: r, scopeFiles: ['src/not-exist.js'] })
    assert.deepEqual(empty, base, 'scope 零命中 → 返回 base 原对象')
    const sync = matchKnowledgeWithScope(kdir, 'zebra', { scopeFiles: ['src/hot.js'] })
    assert.ok((sync.scopeDecisionHits || []).some((h) => h.id === 'D-900@v1'), '同步入口融合生效')
    const syncEmpty = matchKnowledgeWithScope(kdir, 'zebra', { scopeFiles: ['src/**/*.js'] })
    assert.deepEqual(syncEmpty, base, 'glob 键被规整过滤 → 无融合')
  } finally { cleanup(r) }
})

test('FR-02：去重（路由优先）+ 跨变更同号 + 键规整', async () => {
  const r = buildFusionFixture()
  try {
    const kdir = join(r, '.sillyspec', 'knowledge')
    // query 同时命中 hot 路由行 → D-900 走路由通道；scope 再加一次 → 不得重复出现在 scopeDecisionHits
    const fused = await matchKnowledgeHybrid(kdir, 'zebra hotfile', { cwd: r, scopeFiles: ['src/hot.js'] })
    const inRoute = (fused.decisionHits || []).some((h) => h.id === 'D-900@v1')
    const inScope = (fused.scopeDecisionHits || []).some((h) => h.id === 'D-900@v1')
    assert.equal(inRoute, true, '路由通道收入 D-900')
    assert.equal(inScope, false, 'scope 通道去重（路由优先保留）')
    // 键规整
    assert.deepEqual(
      graphPathCandidates(['src/', 'src/**/*.js', 'src/a.js', 'src\\b.js', './src/c.js', 'README']),
      ['src/a.js', 'src/b.js', 'src/c.js'],
      'glob/目录/无扩展名过滤，POSIX 归一，去重'
    )
  } finally { cleanup(r) }
})

test('FR-03：flowKnowledgeDigest 集成——filesOverride 触发 scope 否决小节', async () => {
  const r = buildFusionFixture()
  try {
    const specBase = join(r, '.sillyspec')
    const changeDir = join(specBase, 'changes', 'zebra')
    mkdirSync(changeDir, { recursive: true })
    const out = await flowKnowledgeDigest({ specBase, change: 'zebra', changeDir, input: '', filesOverride: ['src/hot.js'] })
    assert.ok(out.lines.some((l) => l.includes('触达文件关联否决')), 'flow 注入段出现 scope 否决小节')
    assert.ok(out.lines.some((l) => l.includes('触达文件关联手工条目')), 'flow 注入段出现 scope 手工条目指针')
  } finally { cleanup(r) }
})

test('FR-05：fail-soft 与零平台调用', async () => {
  const r = buildFusionFixture()
  const origFetch = globalThis.fetch
  let fetchCalls = 0
  globalThis.fetch = (...args) => { fetchCalls++; return origFetch ? origFetch(...args) : Promise.reject(new Error('no fetch')) }
  try {
    const kdir = join(r, '.sillyspec', 'knowledge')
    const out = await matchKnowledgeHybrid(kdir, 'zebra', { cwd: r, scopeFiles: ['src/hot.js'] })
    assert.equal(fetchCalls, 0, '路由命中 + 融合零平台调用')
    assert.ok(out.matched, '结果有效')
  } finally {
    globalThis.fetch = origFetch
    cleanup(r)
  }
})
