/**
 * eval/knowledge/lib/engine.mjs — 只读适配 src 检索引擎（评测面）
 *
 * 统一命中键：entries/search/scope-entry = `file#anchor`（anchor 缺省为 file）；
 * decisions/scope-decision = `file#id`。期望侧不含 "#" 时按文件级前缀匹配（runner 展开）。
 *
 * searchView 镜像 src/stages/knowledge.js cmdSearch 的构造（score = entry.keywords.length，
 * 2026-11-02 现状事实）——score 契约探针测的正是这处消费面；变更 1 修 score 时两处同步改。
 *
 * 零网络零遥测：只调纯读函数；图构建的缓存写向 <specRoot>/.runtime/cache（可再生派生，
 * fixture 场景落在 mkdtemp 内，真实仓场景仅缓存，不触测试/遥测面）。
 */
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { matchByRouting, parseDecisionEntries, keywordMatchesContext } from '../../../src/knowledge-match.js'
import { buildKnowledgeGraph, scopeRecall } from '../../../src/knowledge-graph.js'

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

/** search 面（镜像 cmdSearch）：file 级行 + 当前 score 契约（keywords.length）+ 实际命中标签。 */
export function searchView(repoRoot, query, limit = 10) {
  const r = matchByRouting(knowledgeDirOf(repoRoot), query)
  const ctx = String(query || '').toLowerCase()
  return r.entries.slice(0, limit).map((e) => ({
    file: e.file,
    anchor: e.anchor,
    score: e.keywords.length,
    tags: e.keywords,
    matchedTags: e.keywords.filter((k) => keywordMatchesContext(k, ctx)),
  }))
}

/** scope 面：图遍历召回（entryHits 前 3 合成 entries + decisionHits 前 20）。 */
export function runScope(repoRoot, scopeFiles) {
  const root = specRootOf(repoRoot)
  if (!graphCache.has(root)) graphCache.set(root, buildKnowledgeGraph(root))
  const recall = scopeRecall(graphCache.get(root), scopeFiles || [])
  if (!recall) return { entryHits: [], decisionHits: [], merged: [] }
  const entryHits = recall.entries.map(entryKey)
  const decisionHits = recall.decisionHits.map((h) => `${h.file}#${h.id}`)
  return { entryHits, decisionHits, merged: [...entryHits.slice(0, 3), ...decisionHits.slice(0, 20)] }
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
