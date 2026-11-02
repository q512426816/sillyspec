/**
 * eval/knowledge/lib/engine.mjs — 只读适配生产检索引擎（评测面）
 *
 * 统一命中键：entries/search/scope-entry = `file#anchor`（anchor 缺省为 file）；
 * decisions/scope-decision = `file#id`；fr = `fr/<域>.md#<FR-id>`。
 * 期望侧不含 "#" 时按文件级前缀匹配（runner 展开）。
 *
 * 三个检索通道与生产同源：
 * - entries/decisions 走 matchKnowledgeHybrid（路由→向量→词片回退，生产 flow/prompt/execute 同入口）；
 * - search 走 matchKnowledgeHybrid + buildSearchMatches（cmdSearch 生产构造单一源）；
 * - fr 走 readActiveFrDigest（FR 索引 digest 生产通道）+ 标题重叠排序。
 * 零网络零遥测：向量层由调用方 env 关闭；只调纯读函数。图构建缓存写 <specRoot>/.runtime/cache
 * （可再生派生，fixture 场景落 mkdtemp，真实仓仅缓存，不触测试/遥测面）。
 */
import { join } from 'node:path'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { parseDecisionEntries, keywordMatchesContext } from '../../../src/knowledge-match.js'
import { buildKnowledgeGraph, scopeRecall } from '../../../src/knowledge-graph.js'
import { matchKnowledgeHybrid } from '../../../src/knowledge-vector.js'
import { buildSearchMatches } from '../../../src/stages/knowledge.js'
import { readActiveFrDigest, frTitleOverlap, resolveTouchedDomains, rankFrDigestForInjection } from '../../../src/fr-index.js'
import { parseModuleMapSimple } from '../../../src/modules.js'

const graphCache = new Map()

function specRootOf(repoRoot) { return join(repoRoot, '.sillyspec') }
function knowledgeDirOf(repoRoot) { return join(specRootOf(repoRoot), 'knowledge') }

function entryKey(e) { return e.anchor ? `${e.file}#${e.anchor}` : e.file }

/** entries 面：生产 hybrid 入口的 entries（只手工条目；路由行已由变更 1 移入 routeHits）。
 *  opts.scopeFiles（仅 fusion 子集传）：融合增量 scopeEntries 追加在路由 entries 之后。 */
export async function runEntries(repoRoot, query, opts = {}) {
  const r = await matchKnowledgeHybrid(knowledgeDirOf(repoRoot), query, { cwd: repoRoot, scopeFiles: opts.scopeFiles || [] })
  const hits = [...(r.entries || []).map(entryKey), ...(r.scopeEntries || []).map(entryKey)]
  return { matched: r.matched, hits, raw: r.entries || [], routeHits: r.routeHits || [], scopeEntries: r.scopeEntries || [] }
}

/** decisions 面：生产 hybrid 入口的 decisionHits（rejected/死路优先序）。
 *  opts.scopeFiles（仅 fusion 子集传）：融合增量 scopeDecisionHits 追加在路由 decisionHits 之后。 */
export async function runDecisions(repoRoot, query, opts = {}) {
  const r = await matchKnowledgeHybrid(knowledgeDirOf(repoRoot), query, { cwd: repoRoot, scopeFiles: opts.scopeFiles || [] })
  const hits = [
    ...(r.decisionHits || []).map((h) => `${h.file}#${h.id}`),
    ...(r.scopeDecisionHits || []).map((h) => `${h.file}#${h.id}`),
  ]
  return { hits, raw: r.decisionHits || [], scopeDecisionHits: r.scopeDecisionHits || [] }
}

/** 合并 docs/<项目>/modules/_module-map.yaml 模块索引（生产触达域解析输入）。 */
function moduleIndexFor(specRoot) {
  const out = {}
  try {
    for (const p of readdirSync(join(specRoot, 'docs'), { withFileTypes: true })) {
      if (!p.isDirectory()) continue
      const f = join(specRoot, 'docs', p.name, 'modules', '_module-map.yaml')
      if (!existsSync(f)) continue
      Object.assign(out, parseModuleMapSimple(readFileSync(f, 'utf8')))
    }
  } catch { /* 无 docs = 空索引 */ }
  return out
}

/** fr 面：带 scope_files 的 case 走生产同源通道（resolveTouchedDomains 触达域 → 域内
 *  readActiveFrDigest → rankFrDigestForInjection TierA/TierB）；纯文本查询无机器键，走近似面
 *  （全域 digest + 标题重叠，channel=approx）并单列、不进对比门槛。 */
export function runFr(repoRoot, query, opts = {}) {
  const specRoot = specRootOf(repoRoot)
  const kdir = knowledgeDirOf(repoRoot)
  const scopeFiles = Array.isArray(opts.scopeFiles) ? opts.scopeFiles.filter(Boolean) : []
  if (scopeFiles.length > 0) {
    try {
      const domains = [...resolveTouchedDomains(tmpdir(), moduleIndexFor(specRoot), scopeFiles, kdir)]
      const frs = readActiveFrDigest(kdir, domains)
      const ranked = rankFrDigestForInjection({ archiveRoot: join(specRoot, 'changes', 'archive'), frs, changed: scopeFiles })
      const ordered = ranked.ranked || []
      return { hits: ordered.map((f) => `fr/${f.domain}.md#${f.id}`), raw: ordered, channel: 'prod' }
    } catch { /* 生产路由失败 → 近似面兜底（如实标 channel） */ }
  }
  let domains = []
  try {
    domains = readdirSync(join(kdir, 'fr')).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''))
  } catch { /* 无 fr 目录 = 空面 */ }
  const entries = readActiveFrDigest(kdir, domains)
  const q = String(query || '')
  const scored = entries.map((e) => ({ e, s: frTitleOverlap(q, `${e.id} ${e.title || ''}`) }))
  scored.sort((a, b) => (b.s - a.s) || a.e.id.localeCompare(b.e.id))
  return { hits: scored.map((x) => `fr/${x.e.domain}.md#${x.e.id}`), raw: scored.map((x) => x.e), channel: 'approx' }
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
  return buildSearchMatches(result, knowledgeDir, limit, query).map((row, i) => ({
    ...row,
    file: result.entries[i] ? result.entries[i].file : row.path.replace(/^knowledge[\\/]/, ''),
    matchedTags: (row.tags || []).filter((k) => keywordMatchesContext(k, ctx)),
  }))
}

/** scope 面：图遍历召回（引擎内建 cap 保持——entry 3 + decision 20，与生产 scopeRecall 一致）。 */
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
