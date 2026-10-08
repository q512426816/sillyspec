/**
 * knowledge-vector.js — 平台向量召回层（CLI 侧，2026-09-29-knowledge-vector-recall）
 *
 * 检索四层（2026-10-08-knowledge-graph 起）：路由 tag 命中 →（零命中）平台向量召回（本模块，
 * 已连接平台时）→ scope 遍历召回（knowledge-graph.js，scopeFiles 在场时）→ 本地词片复现窗口
 * （knowledge-match.js fallbackByQueryShingles）→ 空。
 *
 * 原则（用户裁决 2026-09-29）：平台只做语义召回——返回「哪个文件哪个条目」的候选
 * （spec_path＋anchor＋score）；条目 status/deathPath/回显资格等全部策略面在本地解析
 * （本地文件是真相源，向量结果不携带策略语义）。CLI 本地零模型约束不变。
 *
 * 端点契约（SillyHub 侧实现规格，测试夹具按此 mock）：
 *   POST {platform.url}/api/spec/knowledge/vector-search
 *   Headers: Authorization: Bearer <token>; Content-Type: application/json
 *   Body:    { "query": "<检索文本>", "limit": 10 }
 *   200 →    { "ok": true, "results": [
 *              { "spec_path": "knowledge/decisions/unmapped.md", "anchor": "D-001@v1",
 *                "change": "2026-09-26-thin-agent-tasks", "score": 0.83 } ] }
 *   anchor = 决策条目 id（## D-xxx@vN）；change = 条目「变更：」字段——同号条目跨变更常见
 *   （runtime.md 七个 D-001@v1 先例），change 在场时消歧；缺省时同号条目全量带回（候选诚实）。
 *
 * 降级纪律：任何失败（未连接/开关关闭/网络/404/5xx/超时/响应形态不符）静默降级本地层
 * ——检索是 advisory 面且高频（每方案步 --done），失败刷屏即狼来了；debug 排障可设
 * SILLYSPEC_KNOWLEDGE_VECTOR_DEBUG=1 打单行stderr。
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { readPlatformConfig } from './sync.js'
import { matchByRouting, fallbackByQueryShingles, parseDecisionEntries } from './knowledge-match.js'

const VECTOR_TIMEOUT_MS = 3000
const ENDPOINT_PATH = '/api/spec/knowledge/vector-search'

/** local.yaml knowledge.vector_search 开关（行级扫描 knowledge: 段下 vector_search: off）。 */
function vectorSwitchFromLocalYaml(cwd) {
  try {
    const lines = readFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'utf-8').split(/\r?\n/)
    let inKnowledge = false
    for (const line of lines) {
      const top = line.match(/^([A-Za-z_][\w-]*):\s*$/)
      if (top) { inKnowledge = top[1] === 'knowledge'; continue }
      if (!inKnowledge) continue
      const kv = line.match(/^\s+vector_search\s*:\s*(\S+)/)
      if (kv) return kv[1].toLowerCase()
    }
  } catch { /* 无 local.yaml = 缺省 auto */ }
  return 'auto'
}

function vectorEnabled(cwd) {
  const env = String(process.env.SILLYSPEC_KNOWLEDGE_VECTOR || '').toLowerCase()
  if (env === 'off' || env === 'auto') return env === 'auto'
  return vectorSwitchFromLocalYaml(cwd) !== 'off'
}

/**
 * 平台向量召回（纯 HTTP 层）。未连接/失败/形态不符 → null（调用方降级）。
 * @returns {Promise<{results: Array<{spec_path: string, anchor: string, score: number}>}|null>}
 */
export async function platformVectorRecall({ cwd, query, limit = 10, timeoutMs = VECTOR_TIMEOUT_MS }) {
  const cfg = readPlatformConfig(cwd)
  if (!cfg || !cfg.url || !cfg.token) return null
  const q = String(query || '').trim().slice(0, 4000)
  if (!q) return null
  try {
    const res = await fetch(`${String(cfg.url).replace(/\/+$/, '')}${ENDPOINT_PATH}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, limit }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      if (process.env.SILLYSPEC_KNOWLEDGE_VECTOR_DEBUG) console.error(`[knowledge-vector] ${res.status} ${ENDPOINT_PATH}——降级本地`)
      return null
    }
    const body = await res.json().catch(() => null)
    const results = body && Array.isArray(body.results)
      ? body.results.filter((r) => r && typeof r.spec_path === 'string' && typeof r.anchor === 'string')
      : []
    return results.length > 0 ? { results } : null
  } catch {
    if (process.env.SILLYSPEC_KNOWLEDGE_VECTOR_DEBUG) console.error(`[knowledge-vector] 请求失败/超时——降级本地`)
    return null
  }
}

/** spec_path（knowledge/decisions/x.md）→ INDEX 相对 file（decisions/x.md）。 */
function specPathToFile(specPath) {
  return String(specPath).replace(/^knowledge\//, '').replace(/\\/g, '/')
}

/** 平台候选 → matchKnowledge 同构结果（策略面全本地解析）。 */
function buildResultFromPlatform(indexDir, pvResults) {
  const byFile = new Map()
  for (const r of pvResults) {
    const file = specPathToFile(r.spec_path)
    if (!file.startsWith('decisions/')) continue
    if (!byFile.has(file)) byFile.set(file, [])
    byFile.get(file).push(r)
  }
  if (byFile.size === 0) return null
  const all = parseDecisionEntries(indexDir)
  const entries = []
  const decisionHits = []
  for (const [file, rs] of byFile) {
    const wanted = new Set(rs.map((r) => r.anchor))
    const fileEntries = all.filter((h) => h.file === file && wanted.has(h.id))
    if (fileEntries.length === 0) continue
    for (const r of rs) {
      // 同号消歧：change 在场取精确条目；缺省同号全量带回（跨变更同号是已知形态）
      const matched = r.change
        ? fileEntries.filter((e) => e.id === r.anchor && e.change === r.change)
        : fileEntries.filter((e) => e.id === r.anchor)
      for (const h of matched.length > 0 ? matched : []) {
        decisionHits.push({ ...h, score: typeof r.score === 'number' ? r.score : 1 })
      }
    }
    entries.push({
      category: 'Decisions',
      keywords: ['vector'],
      file,
      anchor: rs[0].anchor,
      display: `${file}（平台向量召回）`,
    })
  }
  if (decisionHits.length === 0) return null
  decisionHits.sort((a, b) =>
    (b.score - a.score) ||
    (((b.status === 'rejected' || b.deathPath) ? 1 : 0) - ((a.status === 'rejected' || a.deathPath) ? 1 : 0))
  )
  // 缺 change 的同号锚点全量带回可放大（unmapped 实测 65 个 D-001@v1）——score 序封顶 20
  if (decisionHits.length > 20) decisionHits.length = 20
  return {
    matched: true,
    entries: entries.slice(0, 3),
    report: `Status: platform-vector matched (${decisionHits.length} entries)`,
    json: {
      matched: true, entry_count: Math.min(entries.length, 3), vector: true,
      entries: entries.slice(0, 3).map((e) => ({ file: e.file, anchor: e.anchor, keywords: e.keywords, category: e.category })),
    },
    decisionHits,
  }
}

/**
 * 异步三层检索入口（四消费方使用：flow 注入段／complete 门／prompt {DECISION_HITS}／
 * knowledge search CLI）：路由 → 平台向量（已连接且开关开）→ scope 遍历 → 本地词片 → 空。
 * opts.cwd = 仓根（平台配置与 local.yaml 定位用）；缺省由 indexDir 上推两级。
 * opts.scopeFiles（2026-10-08-knowledge-graph，FR-04 承接 FR-cli-entry-234）：变更触碰文件集
 * ——机器算的图查询键（D-004：flow 注入段传 touched、complete 门传 decisions.md 锚点提取）。
 * 缺省/空数组 → 遍历层整体跳过，行为与不携带该参数的旧行为逐字段一致（回归钉死）。
 */
export async function matchKnowledgeHybrid(indexDir, taskContext, opts = {}) {
  const r = matchByRouting(indexDir, taskContext)
  if (r.matched) return r
  const cwd = opts.cwd || dirname(dirname(String(indexDir)))
  if (vectorEnabled(cwd)) {
    const pv = await platformVectorRecall({ cwd, query: taskContext, limit: opts.limit || 10 })
    const built = pv ? buildResultFromPlatform(indexDir, pv.results) : null
    if (built) return built
  }
  // scope 遍历层（第三层）：只在 scope 非空且向量零命中后接管；fail-soft（图构建异常静默降级词片）
  const scopeFiles = Array.isArray(opts.scopeFiles) ? opts.scopeFiles.filter(Boolean) : []
  if (scopeFiles.length > 0) {
    try {
      const { buildKnowledgeGraph, scopeRecall, buildScopeRecallResult } = await import('./knowledge-graph.js')
      const specRoot = String(indexDir).replace(/[\\/]knowledge[\\/]?$/, '')
      const built = buildScopeRecallResult(scopeRecall(buildKnowledgeGraph(specRoot), scopeFiles))
      if (built) return built
    } catch { /* 图构建 fail-soft——降级词片层 */ }
  }
  const fb = fallbackByQueryShingles(indexDir, taskContext)
  return fb || r
}
