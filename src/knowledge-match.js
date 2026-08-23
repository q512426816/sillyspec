/**
 * knowledge-match.js — knowledge 关键词匹配引擎
 * 从 INDEX.md 解析知识条目，按任务上下文匹配并生成 hit report；
 * 扫描范围含 decisions 决策库（knowledge/decisions/<域>.md，经 INDEX.md ## Decisions 段
 * 路由行发现——路由行由 decision-distill 幂等写入，本引擎只消费不写）——命中路由行的
 * 决策文件解析为 decisionHits（rejected 优先），供 brainstorm Step2 防复潮注入（task-04，FR-05）。
 * decisions 库不存在时（INDEX 无 Decisions 段/文件不存在）一切行为与无 decisions 库时一致。
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * 从 INDEX.md 解析所有知识条目
 * @param {string} indexDir - knowledge 目录路径
 * @returns {{ category: string, keywords: string[], file: string, anchor: string, display: string, line: string }[]}
 */
export function parseKnowledgeIndex(indexDir) {
  const indexPath = join(indexDir, 'INDEX.md')
  if (!existsSync(indexPath)) return []

  const content = readFileSync(indexPath, 'utf8')
  const entries = []
  let currentCategory = ''

  for (const line of content.split('\n')) {
    // 匹配 ## Category 行
    const catMatch = line.match(/^##\s+(.+)/)
    if (catMatch) {
      currentCategory = catMatch[1].trim()
      continue
    }

    // 匹配条目行：- 关键词1|关键词2 → [显示名](文件名#锚点)
    const entryMatch = line.match(/^-\s+(.+?)\s*→\s*\[(.+?)\]\(([^#)]+)(?:#([^)]+))?\)/)
    if (entryMatch) {
      const keywords = entryMatch[1].split('|').map(k => k.trim()).filter(Boolean)
      const display = entryMatch[2].trim()
      const file = entryMatch[3].trim()
      const anchor = entryMatch[4] ? entryMatch[4].trim() : ''
      entries.push({ category: currentCategory, keywords, file, anchor, display, line })
    }
  }

  return entries
}

// ---------------------------------------------------------------------------
// decisions 决策库扫描（task-04，FR-05）：经 INDEX.md ## Decisions 段路由行发现
// knowledge/decisions/<域>.md 并解析 D-xxx@vN 条目。条目格式与 decision-distill 的
// renderBlockLines 逐字对齐（字段行是机械解析契约）：`## D-xxx@vN <短标题>` +
// `状态：implemented|rejected` / `锚点：` / `最近确认：` / `理由：`（rejected 追加
// `否决理由：` / `复潮条件：`）。
// ---------------------------------------------------------------------------

/** INDEX 条目是否为 decisions 库路由行（目标文件在 decisions/ 下） */
function isDecisionRoute(entry) {
  return /^decisions\//.test(String(entry.file || '').replace(/\\/g, '/'))
}

const DECISION_HEADER_RE = /^##\s+(D-\d+@v\d+)\s*(.*)$/
const DECISION_FIELD_RE = /^(状态|理由|否决理由|复潮条件)\s*[：:]\s*(.*)$/

/**
 * 解析单个 decisions/<域>.md 的 D-xxx@vN 条目。
 * reason 语义：rejected 条目取「否决理由」（expects_from task-02 的 reject_reason），
 * 其余条目回退「理由」一句话；revisitWhen 仅 rejected 条目非空（复潮条件）。
 * @param {string} filePath 决策文件绝对路径
 * @param {string} file INDEX 相对路径（decisions/<域>.md），原样进 decisionHits.file
 * @returns {{ file: string, id: string, title: string, status: string, reason: string, revisitWhen: string }[]}
 */
function parseDecisionFile(filePath, file) {
  let content
  try { content = readFileSync(filePath, 'utf8') } catch { return [] }
  const hits = []
  let cur = null
  const flush = () => {
    if (cur) hits.push(cur)
    cur = null
  }
  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    const h = line.match(DECISION_HEADER_RE)
    if (h) {
      flush()
      cur = { file, id: h[1], title: h[2].trim(), status: '', reason: '', revisitWhen: '' }
      continue
    }
    if (!cur) continue
    const f = line.match(DECISION_FIELD_RE)
    if (!f) continue
    const value = f[2].trim()
    if (f[1] === '状态') cur.status = value.toLowerCase()
    else if (f[1] === '否决理由') cur.reason = value
    else if (f[1] === '复潮条件') cur.revisitWhen = value
    else if (!cur.reason) cur.reason = value // 理由：仅作 implemented（或否决理由缺失）时的回填
  }
  flush()
  return hits
}

/**
 * 解析 knowledge/decisions/ 决策库——扫描范围扩到 decisions/*.md，但只经 INDEX.md
 * Decisions 段路由行发现目标文件（路由行由 decision-distill 幂等维护）。
 * @param {string} indexDir knowledge 目录路径
 * @param {Array} [indexEntries] parseKnowledgeIndex 输出（缺省时自行解析 INDEX；传入时
 *   只解析这些条目中指向 decisions/ 的路由行，matchKnowledge 用它做「路由行已命中」过滤）
 * @returns {{ file: string, id: string, title: string, status: string, reason: string, revisitWhen: string }[]}
 *   路由行不存在/目标文件不存在/解析失败 → []（与无 decisions 库时行为完全一致）
 */
export function parseDecisionEntries(indexDir, indexEntries = null) {
  const routes = (indexEntries || parseKnowledgeIndex(indexDir)).filter(isDecisionRoute)
  const hits = []
  for (const route of routes) {
    const filePath = join(indexDir, route.file)
    if (!existsSync(filePath)) continue // 路由行失效（域文件已删）→ 跳过不阻断
    hits.push(...parseDecisionFile(filePath, route.file))
  }
  // 多条路由行指向同一域文件时按 file+id 去重
  const seen = new Set()
  return hits.filter(h => {
    const key = `${h.file}#${h.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 单个关键词是否命中上下文。
 * - 过短关键词（<2 字符）视为噪音，不参与匹配
 * - 非 ASCII（中文等）用子串匹配
 * - ASCII 关键词用词边界匹配，避免子串误命中（如 "DB" 不命中 "dashboard"）
 */
function keywordMatchesContext(keyword, contextLower) {
  const kw = keyword.toLowerCase().trim()
  if (kw.length < 2) return false
  if (/[^\x00-\x7f]/.test(kw)) return contextLower.includes(kw)
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(kw)}([^a-z0-9]|$)`).test(contextLower)
}

/**
 * 用任务上下文匹配知识条目
 * @param {string} indexDir - knowledge 目录路径
 * @param {string} taskContext - 任务上下文（task 名称 + 描述，用于关键词匹配）
 * @returns {{ matched: boolean, entries: Array, report: string, json: object,
 *   decisionHits: Array<{ file: string, id: string, title: string, status: string, reason: string, revisitWhen: string }> }}
 *   matched/entries/report/json 既有四字段结构与语义不变；decisionHits（task-04 新增）= 任务上下文
 *   命中的 Decisions 路由行所指向 decisions/<域>.md 内的全部 D-xxx@vN 条目，rejected 优先排序；
 *   无 decisions 库 / 路由行未命中 → decisionHits: []（其余字段行为与现状一致）。
 */
export function matchKnowledge(indexDir, taskContext) {
  const indexPath = join(indexDir, 'INDEX.md')

  // INDEX.md 不存在
  if (!existsSync(indexPath)) {
    return {
      matched: false,
      entries: [],
      report: 'Status: no matches (INDEX.md not found)',
      json: { matched: false, entry_count: 0, entries: [] },
      decisionHits: []
    }
  }

  const allEntries = parseKnowledgeIndex(indexDir)
  if (allEntries.length === 0 || !taskContext) {
    return {
      matched: false,
      entries: [],
      report: 'Status: no matches',
      json: { matched: false, entry_count: 0, entries: [] },
      decisionHits: []
    }
  }

  const contextLower = taskContext.toLowerCase()
  const matched = allEntries.filter(entry => {
    return entry.keywords.some(kw => keywordMatchesContext(kw, contextLower))
  })

  if (matched.length === 0) {
    return {
      matched: false,
      entries: [],
      report: 'Status: no matches',
      json: { matched: false, entry_count: 0, entries: [] },
      decisionHits: []
    }
  }

  const sources = matched.map(e => {
    const base = e.anchor ? `${e.file}#${e.anchor}` : e.file
    return ` - ${base}`
  }).join('\n')

  const report = [
    'Knowledge Context',
    '─────────────────',
    `Status: matched`,
    `Entries: ${matched.length}`,
    'Sources:',
    sources
  ].join('\n')

  const json = {
    matched: true,
    entry_count: matched.length,
    entries: matched.map(e => ({
      file: e.file,
      anchor: e.anchor,
      keywords: e.keywords,
      category: e.category
    }))
  }

  // decisionHits（task-04）：任务上下文命中的 Decisions 路由行 → 解析其指向的
  // decisions/<域>.md 内全部条目；rejected 优先排序（防复潮信息最先可见，组内保持文件序）。
  // 不引入新顶层 hits 字段，不改 matched/entries/report/json 四个既有键。
  const decisionRoutes = matched.filter(isDecisionRoute)
  const allDecisionHits = decisionRoutes.length > 0 ? parseDecisionEntries(indexDir, decisionRoutes) : []
  const decisionHits = [
    ...allDecisionHits.filter(h => h.status === 'rejected'),
    ...allDecisionHits.filter(h => h.status !== 'rejected')
  ]

  return { matched: true, entries: matched, report, json, decisionHits }
}
