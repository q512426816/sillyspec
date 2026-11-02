/**
 * eval/knowledge/lib/engine.mjs — 只读适配生产检索引擎（评测面）
 *
 * 统一命中键：entries/search/scope-entry = `file#anchor`（anchor 缺省为 file）；
 * decisions/scope-decision = `file#id`。期望侧不含 "#" 时按文件级前缀匹配（runner 展开）。
 *
 * search 面直接复用生产构造 buildSearchMatches（stages/knowledge.js 单一源）——score 契约
 * 探针测的就是 cmdSearch 本身；检索走 matchKnowledgeHybrid（路由→向量→词片回退，真实三层）。
 * 零网络零遥测：向量层由调用方 env 关闭；只调纯读函数。图构建缓存写 <specRoot>/.runtime/cache
 * （可再生派生，fixture 场景落 mkdtemp，真实仓仅缓存，不触测试/遥测面）。
 */
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { matchByRouting, parseDecisionEntries, keywordMatchesContext } from '../../../src/knowledge-match.js'
import { buildKnowledgeGraph, scopeRecall } from '../../../src/knowledge-graph.js'
import { matchKnowledgeHybrid } from '../../../src/knowledge-vector.js'
import { buildSearchMatches } from '../../../src/stages/knowledge.js'

const graphCache = new Map()

function specRootOf(repoRoot) { return join(repoRoot, '.sillyspec') }
function knowledgeDirOf(repoRoot) { return join(specRootOf(repoRoot), 'knowledge') }

function entryKey(e) { return e.anchor ? `${e.file}#${e.anchor}` : e.file }

/** entries 面：路由命中的面向人条目（当前实现含 fr/decisions 路由行——探针③的检测对象）。 */
export function runEntries(repoRoot, query) {
  const r = matchByRouting(knowledgeDirOf(repoRoot), query)
  return { matched: r.matched, hits: r.entries.map(entryKey), raw: r.entries }
}

/** decisions 面：rejected/死路优先的决策命中通道。 */
export function runDecisions(repoRoot, query) {
  const r = matchByRouting(knowledgeDirOf(repoRoot), query)
  return { hits: (r.decisionHits || []).map((h) => `${h.file}#${h.id}`), raw: r.decisionHits || [] }
}

/**
 * search 面（cmdSearch 等价）：真实 hybrid 检索 + 生产构造 buildSearchMatches。
 * limit 缺省 Infinity = 全量（raw 口径）；rendered 由 faces 层按消费面 limit 截断。
 * 返回行带 matchedTags（与 score 契约对照用）。
 */
export async function searchView(repoRoot, query, limit = Infinity) {
  const knowledgeDir = knowledgeDirOf(repoRoot)
  const result = await matchKnowledgeHybrid(knowledgeDir, query, { cwd: repoRoot })
  if (!result || !result.matched) return []
  const ctx = String(query || '').toLowerCase()
  // buildSearchMatches 与 entries 同序同长（slice+map 一一对应）——按索引补回 file 键
  return buildSearchMatches(result, knowledgeDir, limit).map((row, i) => ({
    ...row,
    file: result.entries[i] ? result.entries[i].file : row.path.replace(/^knowledge[\\/]/, ''),
    matchedTags: (row.tags || []).filter((k) => keywordMatchesContext(k, ctx)),
  }))
}

/** scope 面：图遍历召回（全量 entryHits/decisionHits；消费面截断由 faces 层做）。 */
export function runScope(repoRoot, scopeFiles) {
  const root = specRootOf(repoRoot)
  if (!graphCache.has(root)) graphCache.set(root, buildKnowledgeGraph(root))
  const recall = scopeRecall(graphCache.get(root), scopeFiles || [])
  if (!recall) return { entryHits: [], decisionHits: [], merged: [] }
  const entryHits = recall.entries.map(entryKey)
  const decisionHits = recall.decisionHits.map((h) => `${h.file}#${h.id}`)
  return { entryHits, decisionHits, merged: [...entryHits, ...decisionHits] }
}

/** 语料健康：决策条目总数 / 有锚点 / 有文件字段 / 任一关联（linkage 探针与 baseline 用）。 */
export function catalogHealth(repoRoot) {
  const kdir = knowledgeDirOf(repoRoot)
  if (!existsSync(join(kdir, 'INDEX.md'))) return { total: 0, anchored: 0, files: 0, linked: 0 }
  const hits = parseDecisionEntries(kdir)
  let anchored = 0
  let files = 0
  let linked = 0
  for (const h of hits) {
    const hasAnchor = Boolean(h.anchor && h.anchor.trim() && h.anchor.trim() !== '未记录')
    const hasFiles = Array.isArray(h.files) && h.files.length > 0
    if (hasAnchor) anchored++
    if (hasFiles) files++
    if (hasAnchor || hasFiles) linked++
  }
  return { total: hits.length, anchored, files, linked }
}
