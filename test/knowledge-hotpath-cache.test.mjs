/**
 * knowledge-hotpath-cache.test.mjs — 2026-10-21-knowledge-tier-denoise FR-03
 * quicklog flow 归档伪条目扫描与 knowledge-graph 构建的跨进程缓存：
 * 命中等价 / 归档新增失效 / 坏缓存 fail-open / TTL 过期重建 / 输入面变化失效。
 */

import { join } from 'path'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, utimesSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')
const root = join(__dirname, '..')

const { parseFlowArchiveEntries } = await import(pathToFileURL(join(root, 'src', 'knowledge-quicklog.js')).href)
const { buildKnowledgeGraph } = await import(pathToFileURL(join(root, 'src', 'knowledge-graph.js')).href)
const { readHotCache } = await import(pathToFileURL(join(root, 'src', 'hot-cache.js')).href)

let passed = 0, failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const dir = join(tmpdir(), `khc-test-${name}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}
function clean(...dirs) {
  for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {}
}

function mkArchive(specBase, name, { title = `# ${name} 标题`, flowState = 'tier: thin\n' } = {}) {
  const dir = join(specBase, 'changes', 'archive', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'flow-state.yaml'), flowState)
  writeFileSync(join(dir, 'proposal.md'), `${title}\n`)
  return dir
}

// ── quicklog 伪条目：命中等价 ──
console.log('\n=== T1: 伪条目扫描——首扫落缓存、二扫逐字段等价 ===')
{
  const specBase = setup('t1')
  try {
    mkArchive(specBase, '2026-01-01-alpha', { title: '# 甲变更标题' })
    mkArchive(specBase, '2026-01-02-beta', { title: '# 乙变更标题' })
    const e1 = parseFlowArchiveEntries(specBase)
    assert(e1.length === 2 && e1[0].qlId === '2026-01-01-alpha' && e1[0].title === '甲变更标题' && e1[0].source === 'flow', '首扫解析正确')
    const cachePath = join(specBase, '.runtime', 'cache', 'quicklog-archive-entries.json')
    assert(existsSync(cachePath), '缓存文件落盘')
    const e2 = parseFlowArchiveEntries(specBase)
    assert(JSON.stringify(e1) === JSON.stringify(e2), '二扫命中缓存逐字段等价')
  } finally { clean(specBase) }
}

// ── quicklog 伪条目：缓存命中证据（子文件删除不触发指纹变化 → 仍返回缓存）──
console.log('\n=== T2: 冻结面指纹——深层子文件变化不重扫（命中证据）===')
{
  const specBase = setup('t2')
  try {
    const dir = mkArchive(specBase, '2026-01-01-alpha')
    parseFlowArchiveEntries(specBase)
    rmSync(join(dir, 'flow-state.yaml')) // 归档根 mtime 不变——冻结面语义下走缓存
    const e = parseFlowArchiveEntries(specBase)
    assert(e.length === 1 && e[0].qlId === '2026-01-01-alpha', '子文件删除后仍命中缓存（归档根指纹未变）')
  } finally { clean(specBase) }
}

// ── quicklog 伪条目：归档新增失效 + 坏缓存 fail-open ──
console.log('\n=== T3: 归档新增触发指纹失效 → 全量重建含新目录 ===')
{
  const specBase = setup('t3')
  try {
    mkArchive(specBase, '2026-01-01-alpha')
    parseFlowArchiveEntries(specBase)
    mkArchive(specBase, '2026-01-02-beta', { title: '# 乙变更标题' })
    const e = parseFlowArchiveEntries(specBase)
    assert(e.length === 2 && e.some((x) => x.qlId === '2026-01-02-beta'), '新增归档目录进结果（重建）')
  } finally { clean(specBase) }
}
console.log('\n=== T4: 坏缓存 fail-open → 全量重建不抛错 ===')
{
  const specBase = setup('t4')
  try {
    mkArchive(specBase, '2026-01-01-alpha')
    parseFlowArchiveEntries(specBase)
    writeFileSync(join(specBase, '.runtime', 'cache', 'quicklog-archive-entries.json'), '{broken json')
    const e = parseFlowArchiveEntries(specBase)
    assert(e.length === 1 && e[0].qlId === '2026-01-01-alpha', '坏缓存丢弃重建，结果正确')
  } finally { clean(specBase) }
}

// ── knowledge-graph：命中等价 ──
console.log('\n=== T5: graph 构建——缓存命中与全量构建逐字段等价 ===')
{
  const specBase = setup('t5')
  try {
    mkdirSync(join(specBase, 'knowledge', 'decisions'), { recursive: true })
    writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), [
      '# Knowledge Index', '', '## Decisions',
      '- core-engine|决策 → [decisions/core-engine.md](decisions/core-engine.md)', '',
    ].join('\n'))
    writeFileSync(join(specBase, 'knowledge', 'decisions', 'core-engine.md'), [
      '# 决策知识 — core-engine', '',
      '## D-001@v1 决策一', '状态：implemented', '理由：理由', '文件：src/a.js', '',
    ].join('\n'))
    mkArchive(specBase, '2026-01-01-alpha')
    writeFileSync(join(specBase, 'changes', 'archive', '2026-01-01-alpha', 'design.md'),
      '# D\n\n## 文件变更清单\n\n| 操作 | 文件路径 |\n|---|---|\n| 修改 | src/a.js |\n')
    const g1 = buildKnowledgeGraph(specBase)
    assert(g1.nodes.size > 0 && g1.stats.byNodeType.decision >= 1, '全量构建有决策节点')
    const cachePath = join(specBase, '.runtime', 'cache', 'knowledge-graph.json')
    assert(existsSync(cachePath), '图缓存落盘')
    const g2 = buildKnowledgeGraph(specBase)
    assert(JSON.stringify([...g1.nodes.values()]) === JSON.stringify([...g2.nodes.values()]), '节点面逐字段等价（含迭代序）')
    assert(JSON.stringify(g1.edges) === JSON.stringify(g2.edges), '边面逐字段等价')
    assert(JSON.stringify(g1.stats) === JSON.stringify(g2.stats), 'stats 等价')
    assert(JSON.stringify([...g1.byEdgeType.keys()]) === JSON.stringify([...g2.byEdgeType.keys()]), 'byEdgeType 键序等价')
  } finally { clean(specBase) }
}

// ── knowledge-graph：TTL 过期重建 + 输入面变化失效 ──
console.log('\n=== T6: TTL 过期 → 重建（savedAt 刷新为证据）===')
{
  const specBase = setup('t6')
  try {
    mkdirSync(join(specBase, 'knowledge'), { recursive: true })
    writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), '# Knowledge Index\n')
    buildKnowledgeGraph(specBase)
    const cachePath = join(specBase, '.runtime', 'cache', 'knowledge-graph.json')
    const raw = JSON.parse(readFileSync(cachePath, 'utf-8'))
    const stale = Date.now() - 20 * 60 * 1000
    writeFileSync(cachePath, JSON.stringify({ ...raw, savedAt: stale }))
    buildKnowledgeGraph(specBase)
    const raw2 = JSON.parse(readFileSync(cachePath, 'utf-8'))
    assert(raw2.savedAt > stale + 10 * 60 * 1000, '超 TTL 缓存被重建刷新（savedAt 回到当下）')
  } finally { clean(specBase) }
}
console.log('\n=== T7: 输入面变化（knowledge 文件新增）→ 指纹失效重建 ===')
{
  const specBase = setup('t7')
  try {
    mkdirSync(join(specBase, 'knowledge'), { recursive: true })
    writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), '# Knowledge Index\n')
    buildKnowledgeGraph(specBase)
    // decisions 只经 INDEX Decisions 路由行发现（parseDecisionEntries 契约）——新增面带路由行
    writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), [
      '# Knowledge Index', '', '## Decisions',
      '- core-engine|决策 → [decisions/core-engine.md](decisions/core-engine.md)', '',
    ].join('\n'))
    mkdirSync(join(specBase, 'knowledge', 'decisions'), { recursive: true })
    writeFileSync(join(specBase, 'knowledge', 'decisions', 'core-engine.md'),
      '# 决策知识 — core-engine\n\n## D-001@v1 决策一\n状态：implemented\n')
    const g = buildKnowledgeGraph(specBase)
    assert(g.stats.byNodeType.decision >= 1, '新增决策文件后重建出决策节点')
  } finally { clean(specBase) }
}
console.log('\n=== T8: 逃生阀 SILLYSPEC_HOT_CACHE=off → 恒 miss ===')
{
  const specBase = setup('t8')
  try {
    mkArchive(specBase, '2026-01-01-alpha')
    parseFlowArchiveEntries(specBase)
    const cachePath = join(specBase, '.runtime', 'cache', 'quicklog-archive-entries.json')
    process.env.SILLYSPEC_HOT_CACHE = 'off'
    try {
      assert(readHotCache(cachePath, { version: 1, fingerprint: {} }) === null, 'off 状态读缓存恒 null')
    } finally { delete process.env.SILLYSPEC_HOT_CACHE }
  } finally { clean(specBase) }
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
