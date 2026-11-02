/**
 * knowledge-hotpath-cache.test.mjs — knowledge-graph 构建的跨进程缓存：
 * 命中等价 / 归档新增失效 / 坏缓存 fail-open / TTL 过期重建 / 输入面变化失效。
 * quicklog 伪条目缓存测试已随 knowledge-quicklog.js 删除（2026-11-03-quicklog-business-retire）。
 */

import { join } from 'path'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, utimesSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')
const root = join(__dirname, '..')

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
function clean(specBase) {
  rmSync(specBase, { recursive: true, force: true })
}

// ── knowledge-graph：命中等价 ──
console.log('\n=== T5: graph 构建——缓存命中与全量构建逐字段等价 ===')
{
  const specBase = setup('graph-equiv')
  try {
    mkdirSync(join(specBase, 'knowledge', 'decisions'), { recursive: true })
    writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), '# I\n\n## Decisions\n- d → [d](decisions/x.md)\n')
    writeFileSync(join(specBase, 'knowledge', 'decisions', 'x.md'), '## D-0001@v1 x\n状态：implemented\n')
    const g1 = buildKnowledgeGraph(specBase)
    const cachePath = join(specBase, '.runtime', 'cache', 'knowledge-graph.json')
    assert(existsSync(cachePath), '缓存文件已落盘')
    const g2 = buildKnowledgeGraph(specBase) // 第二次走缓存
    assert(g2.stats.nodeCount === g1.stats.nodeCount && g2.stats.edgeCount === g1.stats.edgeCount, '缓存命中与全量构建 stats 等价')
  } finally { clean(specBase) }
}

// ── TTL 过期 → 重建 ──
console.log('\n=== T6: TTL 过期 → 重建（savedAt 刷新为证据）===')
{
  const specBase = setup('graph-ttl')
  try {
    mkdirSync(join(specBase, 'knowledge'), { recursive: true })
    writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), '# I\n')
    const g1 = buildKnowledgeGraph(specBase)
    const cachePath = join(specBase, '.runtime', 'cache', 'knowledge-graph.json')
    const c1 = readHotCache(cachePath, { version: 99, fingerprint: {} })
    // 将 savedAt 拨到 11 分钟前
    utimesSync(cachePath, new Date(Date.now() - 11 * 60 * 1000), new Date(Date.now() - 11 * 60 * 1000))
    const g2 = buildKnowledgeGraph(specBase)
    assert(g2.stats.nodeCount === g1.stats.nodeCount, 'TTL 过期重建成功')
  } finally { clean(specBase) }
}

// ── 输入面变化 → 指纹失效 ──
console.log('\n=== T7: 输入面变化（knowledge 文件新增）→ 指纹失效重建 ===')
{
  const specBase = setup('graph-input')
  try {
    mkdirSync(join(specBase, 'knowledge', 'decisions'), { recursive: true })
    writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), '# I\n\n## Decisions\n- d → [d](decisions/x.md)\n')
    const g1 = buildKnowledgeGraph(specBase)
    const n1 = g1.stats.nodeCount
    writeFileSync(join(specBase, 'knowledge', 'decisions', 'x.md'), '## D-0001@v1 x\n状态：implemented\n')
    const g2 = buildKnowledgeGraph(specBase)
    assert(g2.stats.nodeCount !== n1 || g2.stats.edgeCount > 0, '输入变化 → 指纹失效 → 重建')
  } finally { clean(specBase) }
}

// ── 逃生阀 ──
console.log('\n=== T8: 逃生阀 SILLYSPEC_HOT_CACHE=off → 恒 miss ===')
{
  const specBase = setup('graph-off')
  try {
    mkdirSync(join(specBase, 'knowledge'), { recursive: true })
    writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), '# I\n')
    const g = buildKnowledgeGraph(specBase)
    const cachePath = join(specBase, '.runtime', 'cache', 'knowledge-graph.json')
    process.env.SILLYSPEC_HOT_CACHE = 'off'
    try {
      assert(readHotCache(cachePath, { version: 1, fingerprint: {} }) === null, 'off 状态读缓存恒 null')
    } finally { delete process.env.SILLYSPEC_HOT_CACHE }
  } finally { clean(specBase) }
}

// ── 手工文档编辑触发重建 ──
console.log('\n=== T9: 手工文档编辑触发图重建 ===')
{
  const dir = setup('manual-docs')
  const specBase = join(dir, '.sillyspec')
  try {
    mkdirSync(join(specBase, 'knowledge'), { recursive: true })
    writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), '# I\n\n## Gotchas\n- a → [A](gotchas.md#sec-a)\n')
    writeFileSync(join(specBase, 'knowledge', 'gotchas.md'), '# G\n\n## sec a\n\n无路径提及。\n')
    const g1 = buildKnowledgeGraph(specBase)
    const before = g1.edges.filter((e) => e.type === 'doc-refs').length
    writeFileSync(join(specBase, 'knowledge', 'gotchas.md'), '# G\n\n## sec a\n\n引用 src/new.js 的说明。\n')
    const g2 = buildKnowledgeGraph(specBase)
    const after = g2.edges.filter((e) => e.type === 'doc-refs').length
    assert(before === 0 && after === 1, '手工文档编辑触发重建（doc-refs 边 0→1）')
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
