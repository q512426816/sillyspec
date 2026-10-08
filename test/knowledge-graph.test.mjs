/**
 * knowledge-graph.test.mjs — 2026-10-08-knowledge-graph 测试面
 * 绑定槽对应 requirements.md FR-01~FR-04（①解析 ②坏行 ③查询 ④CLI ⑤doctor ⑥接线 ⑦消费方）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildKnowledgeGraph, parseChangelogEntries, graphNeighbors, graphPath, graphImpact, graphOrphans, graphDangling, graphSummary, graphNodesSearch, graphModuleDocGaps, graphChangelogDanglings, resolveGraphNode, scopeRecall, buildScopeRecallResult, scopeFromDecisionsMd, EDGE_STRENGTH, TRANSMISSIVE_EDGES } from '../src/knowledge-graph.js'
import { matchKnowledgeHybrid } from '../src/knowledge-vector.js'
import { flowKnowledgeDigest } from '../src/flow.js'

/** 构建全形态 fixture specRoot（九面各一格，覆盖本体表全部已实现边型）。 */
function buildFixture() {
  const root = mkdtempSync(join(tmpdir(), 'kg-'))
  const K = (p) => join(root, '.sillyspec', p)
  mkdirSync(K('knowledge/decisions'), { recursive: true })
  mkdirSync(K('knowledge/fr'), { recursive: true })
  mkdirSync(K('docs/proj/modules'), { recursive: true })
  mkdirSync(K('docs/proj/scan'), { recursive: true })
  mkdirSync(K('changes/archive/2026-01-01-alpha'), { recursive: true })
  mkdirSync(K('changes/archive/2026-01-02-beta'), { recursive: true })
  writeFileSync(K('changes/archive/2026-01-02-beta/design.md'), '# 设计\n')
  mkdirSync(K('quicklog'), { recursive: true })

  writeFileSync(K('knowledge/INDEX.md'), [
    '# Knowledge Index', '',
    '## Conventions',
    '- foo|bar → [Foo 条目](conventions.md#foo-条目)', '',
    '## Decisions',
    '- core-engine|decision|决策 → [decisions/core-engine.md](decisions/core-engine.md)', '',
    '## FR 需求索引',
    '- core-engine|FR|需求|承接 → [fr/core-engine.md](fr/core-engine.md)', '',
  ].join('\n'))

  writeFileSync(K('knowledge/decisions/core-engine.md'), [
    '# 决策知识 — core-engine', '',
    '## D-001@v1 已否决的方案',
    '状态：rejected',
    '锚点：src/foo.js:10',
    '变更：2026-01-01-alpha',
    '否决理由：死路：此路不通', '',
    '## D-002@v1 方案A',
    '状态：implemented',
    '锚点：src/foo.js:20',
    '变更：2026-01-02-beta',
    'supersedes：D-001@v1', '',
    '## D-001@v1 同号跨变更',
    '状态：implemented',
    '锚点：未记录',
    '变更：2026-01-03-gamma', '',
  ].join('\n'))

  writeFileSync(K('knowledge/fr/core-engine.md'), [
    '# FR 索引 — core-engine', '',
    '## FR-core-engine-001 第一个需求',
    '变更：2026-01-01-alpha',
    '状态：active',
    '测试绑定：',
    '<!-- test-bindings: 机器字段 -->',
    '- row: 2026-01-01-alpha:flow:FR-01',
    '  tests: test/foo.test.mjs「某用例」',
    '  status: active', '',
    '## FR-core-engine-002 取代者',
    '变更：2026-01-02-beta',
    '状态：active',
    '取代链：FR-core-engine-001 ← 本条目（2026-01-02-beta 承接）', '',
    '## FR-core-engine-003 旧条目',
    '变更：2026-01-01-alpha',
    '状态：superseded',
    'superseded_by：FR-core-engine-002', '',
  ].join('\n'))

  writeFileSync(K('docs/proj/modules/_module-map.yaml'), [
    'schema_version: 2',
    'modules:',
    '  core:',
    '    status: active',
    '    doc: modules/core.md',
    '    paths:',
    '      - src/',
    '    depends_on: []', '',
  ].join('\n'))

  writeFileSync(K('docs/proj/modules/core.md'), '# core\n\n契约摘引：见 src/foo.js 与 src/bar.js:5\n')
  writeFileSync(K('docs/proj/modules/core.changelog.md'), [
    '# core 变更索引', '',
    '| 日期 | 变更名 | 摘要 |',
    '|------|--------|------|',
    '| 2026-01-01 | 2026-01-01-alpha | 表格行 |',
    '- ql-20260101-001-abcd | 列表行',
    '## 2026-01-02 — 标题态（2026-01-02-beta task-01）', '',
  ].join('\n'))
  writeFileSync(K('docs/proj/scan/CONVENTIONS.md'), '正文引用 src/deep.js:5 与 src/foo.js\n')

  writeFileSync(K('changes/archive/2026-01-01-alpha/design.md'), [
    '# 设计', '',
    '| 操作 | 路径 | 说明 |',
    '|---|---|---|',
    '| 新增 | NEW:src/foo.js | x |', '',
  ].join('\n'))
  writeFileSync(K('changes/archive/2026-01-01-alpha/change-patch.json'), JSON.stringify({ files: ['src/extra.js'], totals: {} }))
  writeFileSync(K('quicklog/test-bindings.json'), JSON.stringify({
    schemaVersion: 1,
    rows: { 'ql-20260101-001-abcd': [{ anchor: 'ql-20260101-001-abcd', tests: ['test/ql-side.test.mjs'], status: 'active' }] },
  }))
  return root
}

const walkFiles = (dir, base = dir) => {
  let out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out = out.concat(walkFiles(join(dir, e.name), base))
    else out.push(join(dir, e.name).slice(base.length))
  }
  return out.sort()
}

test('①解析全形态：节点边数与本体落位（含同号跨变更不折叠/不落盘）', () => {
  const root = buildFixture()
  try {
    const before = walkFiles(root)
    const g = buildKnowledgeGraph(join(root, '.sillyspec'))
    // 不落盘：构建后文件集逐字节不变（D-003 墓碑切割——无缓存文件）
    assert.deepEqual(walkFiles(root), before)

    const s = g.stats
    // 决策 3 节点：D-001@v1(alpha) / D-002@v1(beta) / D-001@v1(gamma)——同号跨变更不折叠
    assert.equal(s.byNodeType.decision, 3)
    assert.ok(g.nodes.has('decision:decisions/core-engine.md#D-001@v1@2026-01-01-alpha'))
    assert.ok(g.nodes.has('decision:decisions/core-engine.md#D-001@v1@2026-01-03-gamma'))
    // FR 3 节点；supersedes：取代链 1（002→001）+ superseded_by 反向补链 1（002→003）+ 决策 1（D-002→D-001alpha）
    assert.equal(s.byNodeType.fr, 3)
    assert.equal(s.byEdgeType.supersedes, 3)
    // anchors：两条锚点边命中 src/foo.js（「文件：」字段面为空）
    assert.equal(s.byEdgeType.anchors, 2)
    // 手册条目 1 + route 1（decisions/fr 路由行不建条目节点）
    assert.equal(s.byNodeType.entry, 1)
    assert.equal(s.byEdgeType.route, 1)
    // test-binding：FR 子块 1 + ql 侧车 1
    assert.equal(s.byEdgeType['test-binding'], 2)
    // changelog 三态：表格行 + 列表行 + 标题态
    assert.equal(s.byEdgeType['changelog-entry'], 3)
    // deliverables 双源：design 表 1 + change-patch.json 1；change-modules 派生 1（src/ 前缀→module:core）
    assert.equal(s.byEdgeType.deliverables, 2)
    assert.equal(s.byEdgeType['change-modules'], 1)
    // doc 面：INDEX + card + chlog + scan = 4；doc-refs 2（card 正文）；scan-refs 2
    assert.equal(s.byNodeType.doc, 4)
    assert.equal(s.byEdgeType['doc-refs'], 2)
    assert.equal(s.byEdgeType['scan-refs'], 2)
    // 决策 attrs 保留 parseDecisionEntries 全量（rejected + 死路语义可查）
    const rej = g.nodes.get('decision:decisions/core-engine.md#D-001@v1@2026-01-01-alpha')
    assert.equal(rej.attrs.status, 'rejected')
    assert.match(rej.attrs.hit.reason, /死路/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('③查询面：impact 强边闭包深度与不可达判定 + 边型筛选', () => {
  // 本体契约钉子（design §1）：16 边型三档分型 + 可传递边仅两类
  assert.equal(Object.keys(EDGE_STRENGTH).length, 16)
  assert.equal(Object.values(EDGE_STRENGTH).filter((s) => s === 'strong').length, 12)
  assert.equal(Object.values(EDGE_STRENGTH).filter((s) => s === 'medium').length, 2)
  assert.equal(Object.values(EDGE_STRENGTH).filter((s) => s === 'weak').length, 2)
  assert.deepEqual([...TRANSMISSIVE_EDGES].sort(), ['module-dep', 'supersedes'])
  const root = buildFixture()
  try {
    const g = buildKnowledgeGraph(join(root, '.sillyspec'))
    // impact(change)：alpha → deliverables(src/foo.js, src/extra.js) → anchors 反查命中两条决策（深度2）
    const imp = graphImpact(g, '2026-01-01-alpha')
    assert.ok(imp.found)
    assert.ok(imp.closure.includes('src/foo.js'))
    assert.ok(imp.closure.includes('decision:decisions/core-engine.md#D-001@v1@2026-01-01-alpha'))
    // 防复潮可达：rejected D-001@v1(alpha) 在闭包内
    assert.equal(imp.rejectedReachable.length, 1)
    assert.match(imp.rejectedReachable[0].id, /D-001@v1/)
    // 深度契约：gamma 变更（无 deliverables）闭包不含 file 层（其决策锚点=未记录）
    const impG = graphImpact(g, '2026-01-03-gamma')
    assert.ok(impG.found)
    assert.equal(impG.closure.filter((id) => g.nodes.get(id)?.type === 'file').length, 0)

    // path：D-001@v1(alpha) → src/foo.js 一跳；不可达显式 found:false
    const p1 = graphPath(g, 'D-001@v1@2026-01-01-alpha', 'src/foo.js')
    assert.ok(p1.found)
    assert.equal(p1.hops.length, 1)
    assert.equal(p1.hops[0].type, 'anchors')
    // entry 节点只挂弱边 route → 强边寻路不可达（推理规则：弱边不参与）
    const p2 = graphPath(g, 'entry:conventions.md#foo-条目', 'src/foo.js')
    assert.equal(p2.found, false)
    assert.match(p2.reason, /不可达/)
    // 起点未命中
    assert.equal(graphPath(g, '不存在的节点', 'src/foo.js').found, false)

    // 边型筛选：module:core 的 neighbors 限 module-files 只出 src
    const nb = graphNeighbors(g, 'module:core', { edgeType: 'module-files' })
    assert.ok(nb.found)
    assert.deepEqual(nb.nodes.map((n) => n.id).sort(), ['module:core', 'src'])
    // 边型筛选：belongs-module 只出 FR→module
    const nbB = graphNeighbors(g, 'FR-core-engine-001', { edgeType: 'belongs-module' })
    assert.deepEqual(nbB.nodes.map((n) => n.id).sort(), ['FR-core-engine-001', 'core-engine'])

    // orphans：fixture 无孤儿（所有节点有边）
    assert.equal(graphOrphans(g).length, 0)
    // dangling（existsFn 注入全 false）：file 边悬空可见且带强度
    const dg = graphDangling(g, { existsFn: () => false })
    assert.ok(dg.length > 0)
    assert.ok(dg.every((d) => ['route', 'doc-refs', 'scan-refs', 'anchors', 'deliverables', 'test-binding', 'module-files'].includes(d.edge.type)))
    // resolveGraphNode：裸号 / 尾段 / 精确 id 三形态
    assert.equal(resolveGraphNode(g, 'D-002@v1@2026-01-02-beta')?.type, 'decision')
    assert.equal(resolveGraphNode(g, 'foo.js')?.id, 'src/foo.js')
    assert.equal(resolveGraphNode(g, 'FR-core-engine-002')?.type, 'fr')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('④CLI 分发：knowledge graph 子命令 --json/--edges 热测', async () => {
  const root = buildFixture()
  try {
    const { cmdKnowledgeGraph } = await import('../src/knowledge-graph.js')
    // cmdKnowledgeGraph 契约：dir=仓根 cwd（resolveKnowledgeDir 同款：<dir>/.sillyspec）
    const cap = []
    const origLog = console.log
    console.log = (...a) => cap.push(a.join(' '))
    try {
      await cmdKnowledgeGraph(root, ['impact', '2026-01-01-alpha'], {})
      await cmdKnowledgeGraph(root, ['neighbors', 'FR-core-engine-001', '--edges', 'belongs-module'], {})
      await cmdKnowledgeGraph(root, ['bogus-sub'], {})
    } finally { console.log = origLog }
    const j1 = JSON.parse(cap[0])
    assert.equal(j1.ok, true)
    assert.ok(j1.closure.includes('src/foo.js'))
    assert.equal(j1.rejected_reachable.length, 1)
    const j2 = JSON.parse(cap[1])
    assert.equal(j2.ok, true)
    assert.deepEqual(j2.nodes.map((n) => n.id).sort(), ['FR-core-engine-001', 'core-engine'])
    const j3 = JSON.parse(cap[2])
    assert.equal(j3.ok, false)
    assert.equal(j3.error.code, 'graph_usage')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('⑥召回接线：层序四层 + 无 scope 逐字节等价 + 保底命中 + 20/3 封顶', async () => {
  const root = buildFixture()
  try {
    const specRoot = join(root, '.sillyspec')
    const kdir = join(specRoot, 'knowledge')

    // 层序①：路由命中优先——scope 在场也不改变路由层结果（词面 'foo' 命中 INDEX 手册路由）
    const rRoute = await matchKnowledgeHybrid(kdir, '方案涉及 foo 主题', { cwd: root, scopeFiles: ['src/foo.js'] })
    assert.equal(rRoute.matched, true)
    assert.equal(rRoute.entries[0].category, 'Conventions')

    // 无 scope 逐字节等价：词面零命中查询（不触发路由/词片——用无 CJK 词片的纯 ASCII 串避开回退）
    const q = 'zzzqqqxxx'
    const rNoScope = await matchKnowledgeHybrid(kdir, q, { cwd: root })
    const rEmptyScope = await matchKnowledgeHybrid(kdir, q, { cwd: root, scopeFiles: [] })
    assert.equal(rNoScope.matched, false)
    assert.deepEqual(rEmptyScope, rNoScope)

    // 保底命中：词面三层全零命中（fixture 无该词片语料）+ scope 文件上有 rejected 决策锚定 → 仍进 decisionHits
    const rScope = await matchKnowledgeHybrid(kdir, q, { cwd: root, scopeFiles: ['src/foo.js'] })
    assert.equal(rScope.matched, true)
    assert.ok(rScope.json.scope === true)
    const rejHits = rScope.decisionHits.filter((h) => h.status === 'rejected')
    assert.equal(rejHits.length, 1)
    assert.match(rejHits[0].reason, /死路/)
    assert.ok(rScope.entries.length <= 3)

    // 单元面：scopeRecall 封顶与排序（rejected/死路优先）
    const g = buildKnowledgeGraph(specRoot)
    const rec = scopeRecall(g, ['src/foo.js'])
    assert.ok(rec.decisionHits.length >= 2)
    assert.equal(rec.decisionHits[0].status, 'rejected') // rejected 排前
    // buildScopeRecallResult：零决策可达 → null（层降级）
    assert.equal(buildScopeRecallResult({ decisionHits: [], entries: [], frCount: 0, scopeSize: 1 }), null)
    // scope 空 → null（整层跳过语义）
    assert.equal(scopeRecall(g, []), null)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('⑦消费方透传：flow touched 传递与 complete 锚点提取', async () => {
  // ⑦a scopeFromDecisionsMd：九字段列表行 + 裸行双形态、坏值容忍
  const dm = [
    '# 决策记录', '',
    '## D-001@v1: x',
    '- type: architecture',
    '- 锚点：src/fr-index.js:frCoverageFiles',
    '- 锚点: src/knowledge-vector.js:130',
    '锚点：src/bare.js',
    '- 锚点：未记录',
    '- 锚点：无路径形态',
  ].join('\n')
  assert.deepEqual(scopeFromDecisionsMd(dm).sort(), ['src/bare.js', 'src/fr-index.js', 'src/knowledge-vector.js'])

  // ⑦b flow 注入段透传：design 交付表文件上有 rejected 决策锚定 → 词面零命中仍注入防复潮段
  const root = buildFixture()
  try {
    const specRoot = join(root, '.sillyspec')
    const digest = await flowKnowledgeDigest({
      specBase: specRoot,
      change: 'zzzqqqxxx', // 词面零命中变更名（无 INDEX 路由/词片语料碰撞）
      changeDir: join(specRoot, 'changes', 'archive', '2026-01-01-alpha'), // design.md 交付表 → touched=[src/foo.js]
      input: '',
    })
    const text = digest.lines.join('\n')
    assert.match(text, /否决决策\/死路注记/, 'scope 保底：防复潮段进场')
    assert.match(text, /D-001@v1/, 'rejected 决策可见')
    // 摘要计数同步（summary.rejectedDecisions ≥1）
    assert.ok(digest.summary.rejectedDecisions >= 1)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('⑤doctor 六检查：断链命中与干净面零告警', async () => {
  const { detectKnowledgeGraphIntegrity } = await import('../src/doctor-diagnostics.js')
  const root = buildFixture()
  const prevCwd = process.cwd()
  try {
    // 被引用文件落盘（doctor 的存在性检查以仓根 CWD 相对路径解析）
    process.chdir(root)
    for (const f of ['src/foo.js', 'src/bar.js', 'src/deep.js', 'src/extra.js', 'test/foo.test.mjs', 'test/ql-side.test.mjs']) {
      mkdirSync(join(root, f.replace(/\/[^/]+$/, '')), { recursive: true })
      writeFileSync(join(root, f), '// x\n')
    }
    writeFileSync(join(root, '.sillyspec', 'knowledge', 'conventions.md'), '# 约定\n\n## Foo 条目\n\n正文\n')

    // 干净面：六检查零 finding（pass=true、无 warning）
    const clean = detectKnowledgeGraphIntegrity(root, join(root, '.sillyspec'))
    assert.equal(clean.pass, true, `干净面 findings：${JSON.stringify(clean.findings)}`)
    assert.equal(clean.severity, null)
    assert.equal(clean.findings.length, 1)
    assert.match(clean.findings[0], /六检查通过/)

    // 断链命中：删掉锚点目标文件 → graph-dangling-anchor；INDEX 路由目标删掉 → graph-dangling-route
    rmSync(join(root, 'src/foo.js'))
    rmSync(join(root, '.sillyspec', 'knowledge', 'conventions.md'))
    const dirty = detectKnowledgeGraphIntegrity(root, join(root, '.sillyspec'))
    assert.equal(dirty.pass, false)
    assert.equal(dirty.severity, 'warning')
    assert.ok(dirty.findings.some((f) => f.startsWith('graph-dangling-anchor')), '强边锚点悬空命中')
    assert.ok(dirty.findings.some((f) => f.startsWith('graph-dangling-route')), '路由悬空命中')
  } finally {
    process.chdir(prevCwd)
    rmSync(root, { recursive: true, force: true })
  }
})

test('②坏行容忍：changelog 三态坏行与侧车缺省 fail-soft', () => {
  // parseChangelogEntries 单元面：坏行/非变更行不进、三态正常进
  const names = parseChangelogEntries([
    '| 2026-01-01 | 2026-01-01-alpha | ok |',
    '| garbage |',
    '- ql-20260101-001-abcd | ok',
    '## 2026-01-02 — 标题（2026-01-02-beta task-01）',
    '## 2026-01-03 — 无变更名标题',
    '- 不是变更名的列表行',
  ].join('\n'))
  assert.deepEqual(names, ['2026-01-01-alpha', 'ql-20260101-001-abcd', '2026-01-02-beta'])

  // 无 quicklog 侧车 / 无 docs 目录的最小 fixture：构建不抛
  const root = mkdtempSync(join(tmpdir(), 'kg-min-'))
  try {
    mkdirSync(join(root, '.sillyspec', 'knowledge'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'knowledge', 'INDEX.md'), '# 空索引\n')
    const g = buildKnowledgeGraph(join(root, '.sillyspec'))
    assert.equal(g.stats.nodeCount, 1) // 仅 INDEX 文档节点
    assert.equal(g.stats.edgeCount, 0)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

// ══ 2026-10-08-graph-summary-nodes（平台仓阶段三依赖契约）：summary 聚合 + nodes 搜索 ══

test('⑧summary 聚合：规模/分布/doctor 同源计数/clusters 域映射/代表与截断', () => {
  const root = buildFixture()
  try {
    const g = buildKnowledgeGraph(join(root, '.sillyspec'))
    const s = graphSummary(g, { existsFn: () => true })
    assert.equal(s.nodes, g.stats.nodeCount)
    assert.equal(s.edges, g.stats.edgeCount)
    assert.deepEqual(s.byType, g.stats.byNodeType)
    assert.deepEqual(s.byEdge, g.stats.byEdgeType)
    // doctor 同源四计数：孤儿/悬空与图函数逐值一致（helper 单一源消费面）
    assert.equal(s.orphans, graphOrphans(g).length)
    assert.equal(s.dangling_refs, graphDangling(g, { existsFn: () => true }).length)
    // module_doc_gaps/changelog_danglings：helper 单一源 + 双 existsFn 态（2026-10-08-graph-summary-consistency）
    assert.equal(s.module_doc_gaps, graphModuleDocGaps(g).length)
    assert.deepEqual(graphChangelogDanglings(g, { existsFn: () => true }), [])
    const sFalse = graphSummary(g, { existsFn: () => false })
    // fixture changelog 目标：alpha（archive 在）+ beta（archive 在）+ ql（豁免）→ 全假存在性下日期名悬空=2
    assert.equal(sFalse.changelog_danglings, graphChangelogDanglings(g, { existsFn: () => false }).length)
    assert.equal(sFalse.changelog_danglings, 2)
    // breakdown 与总数守恒：dangling_refs = strong_anchors + medium_doc_refs（doctor 两类之和口径）
    assert.equal(sFalse.dangling_refs, sFalse.dangling_refs_breakdown.strong_anchors + sFalse.dangling_refs_breakdown.medium_doc_refs)
    assert.ok(sFalse.dangling_refs_breakdown.medium_doc_refs >= 2, 'fixture doc-refs/scan-refs 悬空计入中边桶')
    // module_doc_gaps 正值面（mini-fixture：有 map 无卡无 changelog 的模块 → 1）
    const gapRoot = mkdtempSync(join(tmpdir(), 'kggap-'))
    try {
      mkdirSync(join(gapRoot, '.sillyspec/knowledge'), { recursive: true })
      writeFileSync(join(gapRoot, '.sillyspec/knowledge/INDEX.md'), '# x\n')
      mkdirSync(join(gapRoot, '.sillyspec/docs/p/modules'), { recursive: true })
      writeFileSync(join(gapRoot, '.sillyspec/docs/p/modules/_module-map.yaml'), 'modules:\n  m1:\n    status: active\n    paths:\n      - src/\n')
      const gGap = buildKnowledgeGraph(join(gapRoot, '.sillyspec'))
      assert.equal(graphModuleDocGaps(gGap).map((n) => n.id).join(), 'module:m1')
      assert.equal(graphSummary(gGap, { existsFn: () => true }).module_doc_gaps, 1)
    } finally { rmSync(gapRoot, { recursive: true, force: true }) }
    // clusters：fr 按 belongs-module 域聚簇，代表 ≤5 且都是真实节点
    const frCluster = s.clusters.find((c) => c.key === 'fr:core-engine')
    assert.ok(frCluster, 'fr 簇按域聚合')
    assert.ok(frCluster.count >= 3)
    assert.ok(frCluster.representatives.length >= 1 && frCluster.representatives.length <= 5)
    for (const r of frCluster.representatives) assert.ok(g.nodes.has(r.id))
    // decision 域=域文件名（core-engine.md → core-engine）
    const decCluster = s.clusters.find((c) => c.key === 'decision:core-engine')
    assert.ok(decCluster, 'decision 簇按域文件名聚合')
    // 簇计数守恒：全部簇 count 之和 = 节点总数
    assert.equal(s.clusters.reduce((a, c) => a + c.count, 0), s.nodes)
    // 簇按 count 降序
    for (let i = 1; i < s.clusters.length; i++) assert.ok(s.clusters[i - 1].count >= s.clusters[i].count)
    // clustersLimit 截断只影响簇列表，不影响总数与四计数
    const s2 = graphSummary(g, { existsFn: () => true, clustersLimit: 2 })
    assert.equal(s2.clusters.length, Math.min(2, s.clusters.length))
    assert.equal(s2.nodes, s.nodes)
    assert.equal(s2.orphans, s.orphans)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('⑨nodes 搜索 + CLI 分发 summary/nodes：包含匹配/大小写/limit 钳/usage 错', async () => {
  const root = buildFixture()
  try {
    const g = buildKnowledgeGraph(join(root, '.sillyspec'))
    // 大小写不敏感：id 与 label 双通道命中
    const r1 = graphNodesSearch(g, 'FR-CORE-ENGINE-001', 10)
    assert.ok(r1.count >= 1 && r1.nodes.some((n) => n.id === 'FR-core-engine-001'))
    const r2 = graphNodesSearch(g, '第一个需求', 10) // label 中文包含
    assert.ok(r2.nodes.some((n) => n.id === 'FR-core-engine-001'))
    // limit 钳制：0/负数→1，>50→50
    assert.equal(graphNodesSearch(g, 'e', 0).nodes.length <= 1, true)
    // 空串零命中零遍历
    assert.deepEqual(graphNodesSearch(g, '', 10), { count: 0, nodes: [] })

    const { cmdKnowledgeGraph } = await import('../src/knowledge-graph.js')
    const cap = []
    const origLog = console.log
    console.log = (...a) => cap.push(a.join(' '))
    try {
      await cmdKnowledgeGraph(root, ['summary', '--clusters', '3'], {})
      await cmdKnowledgeGraph(root, ['nodes', '--search', 'core-engine', '--limit', '2'], {})
      await cmdKnowledgeGraph(root, ['nodes'], {})
    } finally { console.log = origLog }
    const j1 = JSON.parse(cap[0])
    assert.equal(j1.ok, true)
    assert.equal(j1.stats.nodes, g.stats.nodeCount)
    assert.ok(j1.stats.clusters.length <= 3)
    assert.ok(j1.stats.clusters.every((c) => c.representatives.length <= 5))
    const j2 = JSON.parse(cap[1])
    assert.equal(j2.ok, true)
    assert.ok(j2.count >= 1 && j2.count <= 2)
    assert.ok(j2.nodes.every((n) => (n.id + n.label).toLowerCase().includes('core-engine')))
    const j3 = JSON.parse(cap[2])
    assert.equal(j3.ok, false)
    assert.equal(j3.error.code, 'search_required')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('⑩doctor↔summary 同源交叉断言：脏 fixture 上四计数逐值相等（单一源契约钉，2026-10-08-graph-summary-consistency）', async () => {
  const { detectKnowledgeGraphIntegrity } = await import('../src/doctor-diagnostics.js')
  const root = buildFixture()
  const prevCwd = process.cwd()
  try {
    process.chdir(root)
    // 被引用文件落盘 + 制造脏面：删锚点目标（dangling-anchor）+ 删路由目标文件
    for (const f of ['src/foo.js', 'src/bar.js', 'src/deep.js', 'src/extra.js', 'test/foo.test.mjs', 'test/ql-side.test.mjs']) {
      mkdirSync(join(root, f.replace(/\/[^/]+$/, '')), { recursive: true })
      writeFileSync(join(root, f), '// x\n')
    }
    writeFileSync(join(root, '.sillyspec', 'knowledge', 'conventions.md'), '# 约定\n\n## Foo 条目\n\n正文\n')
    rmSync(join(root, 'src/foo.js')) // 脏面：两条决策锚点悬空（强边）
    rmSync(join(root, 'src/bar.js')) // 脏面：卡片 doc-refs 悬空（中边）

    const specRoot = join(root, '.sillyspec')
    const r = detectKnowledgeGraphIntegrity(root, specRoot)
    assert.equal(r.pass, false)
    const s = graphSummary(buildKnowledgeGraph(specRoot)) // 双方同用默认 existsSync——同源同值
    // 从 doctor findings 文本解析四计数（doctor 输出格式即契约面——格式漂移本测试即红）
    const cnt = (re) => { const m = r.findings.join('\n').match(re); return m ? Number(m[1]) : 0 }
    assert.equal(cnt(/graph-orphan-entry：(\d+) 个/), s.orphans, 'orphans 同值')
    assert.equal(cnt(/graph-module-doc-gap：(\d+) 个/), s.module_doc_gaps, 'module_doc_gaps 同值')
    assert.equal(cnt(/graph-changelog-dangling：(\d+) 条/), s.changelog_danglings, 'changelog_danglings 同值')
    const anchor = cnt(/graph-dangling-anchor：(\d+) 条/)
    const docRef = cnt(/graph-doc-dangling-ref：(\d+) 条/)
    assert.equal(anchor + docRef, s.dangling_refs, 'dangling_refs = doctor anchor+doc-ref 之和')
    assert.equal(anchor, s.dangling_refs_breakdown.strong_anchors, 'breakdown 强边桶 = doctor dangling-anchor')
    assert.equal(docRef, s.dangling_refs_breakdown.medium_doc_refs, 'breakdown 中边桶 = doctor doc-dangling-ref')
    assert.ok(anchor >= 1 && docRef >= 1, '脏面两桶均非零（断言有区分度）')
  } finally {
    process.chdir(prevCwd)
    rmSync(root, { recursive: true, force: true })
  }
})

// ══ 2026-10-09-graph-dump-layout（平台仓 fullmap 跨仓前置）：dump --layout ══

test('⑪dump --layout：形状/确定性/layout 必带/粗分组视觉', async () => {
  const root = buildFixture()
  try {
    const g = buildKnowledgeGraph(join(root, '.sillyspec'))
    const { layoutFullGraph, cmdKnowledgeGraph } = await import('../src/knowledge-graph.js')
    const { pos, groups } = layoutFullGraph(g)
    assert.equal(pos.size, g.stats.nodeCount)
    // 确定性：两次调用逐位一致
    const again = layoutFullGraph(g)
    assert.deepEqual([...pos.entries()], [...again.pos.entries()])
    // 坐标整数
    for (const p of pos.values()) { assert.ok(Number.isInteger(p.x) && Number.isInteger(p.y)) }
    // 粗分组口径：module 全落「模块」单组、file 按顶级目录
    const names = groups.map(([k]) => k)
    assert.ok(names.includes('模块'))
    assert.ok(names.some((k) => k.startsWith('文件/')))
    // 同簇抽样距离 < 跨簇抽样距离（星系视觉）
    const ids = [...pos.keys()]
    const sameCluster = [...g.nodes.values()].filter((n) => n.type === 'fr')
    if (sameCluster.length >= 2) {
      const d = (a, b) => Math.hypot(pos.get(a.id).x - pos.get(b.id).x, pos.get(a.id).y - pos.get(b.id).y)
      const intra = d(sameCluster[0], sameCluster[1])
      const mod = [...g.nodes.values()].find((n) => n.type === 'module')
      const inter = mod ? d(sameCluster[0], mod) : intra + 1
      assert.ok(intra < inter || inter === 0)
    }
    // CLI 分发
    const cap = []
    const origLog = console.log
    console.log = (...a) => cap.push(a.join(' '))
    try {
      await cmdKnowledgeGraph(root, ['dump', '--layout'], {})
      await cmdKnowledgeGraph(root, ['dump'], {})
    } finally { console.log = origLog }
    const j1 = JSON.parse(cap[0])
    assert.equal(j1.ok, true)
    assert.equal(j1.nodes.length, g.stats.nodeCount)
    assert.ok(j1.nodes.every((n) => Number.isInteger(n.x)))
    assert.equal(j1.stats.nodes, g.stats.nodeCount)
    const j2 = JSON.parse(cap[1])
    assert.equal(j2.ok, false)
    assert.equal(j2.error.code, 'layout_required')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
