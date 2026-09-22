/**
 * knowledge-quicklog.js — quicklog 历史检索面（知识可见性导线）
 *
 * 缺口（2026-09-21 R5R 实证）：quick 产出（quicklog 条目 + patch）不在任何检索面——
 * knowledge-match 只扫 INDEX 路由与 decisions；主仓唯一核验过键名的先例
 * （ql-20260920-007-d0dd）因 linked 变更未归档而 distill 缺席，FR 检索面零覆盖，
 * 后续三个独立会话全部猜错同一外部键。本模块把 quicklog 历史拉进注入面：
 * 纯读、fail-open、top-3 一行制——注入的是「发生过什么」的历史事实（条目说的是
 * 当时做了什么），不是权威断言；消费方要用契约细节按 ql-ID 回源读全文或读代码。
 *
 * 与 knowledge-match.js 分工：那边消费 INDEX/decisions（结构化知识），这边消费双信号源——
 * quicklog/QUICKLOG-*.md（append-only 历史）+ changes/archive/<变更>/flow-state.yaml（flow 族归档
 * 变更伪条目，2026-09-23 扩源：flow 变更不产生 quicklog 条目，扩源后检索面才看得见）。
 * 条目头与字段行是 allocateQuicklogEntry
 * 的机械解析契约：`## ql-<id> | <时间> | <标题>` + `文件：` 段（`- path（注记）` 行）。
 * run/prompt.js（execute 确认步 + quick step1）与 stages/execute.js（Wave 孪生）两处
 * 注入点共用本模块——格式等价由 test/knowledge-inject.test.mjs 锁定，改渲染必同步两处。
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const QUICKLOG_ENTRY_RE = /^##\s+(ql-[\w-]+)\s*\|\s*([^|]+)\s*\|\s*(.+)$/
// 文件注记行：`- path（中文括注）` / `- path(ascii)` / 裸 `- path`（allocateQuicklogEntry
// 均可产出；path 本身不含空白，故止于首个空白或括号）
const QUICKLOG_FILE_LINE_RE = /^-\s+([^\s（(]+)/
// 文件：段结束边界——出现其他字段标签行即收段（状态/需求/根因/方案/结果/审计/关联变更）
const QUICKLOG_FIELD_RE = /^(状态|关联变更|需求|根因|方案|结果|审计)\s*[：:]/

/**
 * 解析 quicklog 全量条目——双信号源（资产三小件①，2026-09-23 扩源）：
 *   ① quicklog/QUICKLOG-*.md（append-only 历史条目，含按日归档的分片文件）；
 *   ② .sillyspec/changes/archive/<变更>/flow-state.yaml（flow 族归档变更）——flow 变更不产生
 *      quicklog 条目，检索面此前看不见 flow 变更的知识（与 ql-011 治的病同族）。伪条目
 *      三料合成：qlId=变更目录名 / date=目录名日期前缀（缺前缀退 flow-state.yaml mtime）/
 *      title=proposal.md 首个 `# ` 标题行（缺文件退变更名）；solution 恒空、files 恒空。
 * 双源命中时 quicklog 条目排前（matchQuicklogContext 排序 source 键）。
 * @param {string} specBase - .sillyspec 根
 * @returns {{ qlId: string, date: string, title: string, solution: string, files: string[], source: 'quicklog'|'flow' }[]}
 *   两源都不存在 / 全部不可读 → []（调用方零注入零阻断）
 */
export function parseQuicklogEntries(specBase) {
  return [...parseQuicklogFileEntries(specBase), ...parseFlowArchiveEntries(specBase)]
}

/** 源①：quicklog/QUICKLOG-*.md 条目解析（原 parseQuicklogEntries 主体，行为不变）。 */
function parseQuicklogFileEntries(specBase) {
  const dir = join(specBase, 'quicklog')
  let files
  try {
    files = readdirSync(dir).filter((f) => /^QUICKLOG-.*\.md$/i.test(f))
  } catch {
    return []
  }
  const entries = []
  for (const f of files) {
    let content
    try {
      content = readFileSync(join(dir, f), 'utf8')
    } catch {
      continue
    }
    let cur = null
    let inFiles = false
    const flush = () => {
      if (cur) entries.push(cur)
      cur = null
    }
    for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
      const h = line.match(QUICKLOG_ENTRY_RE)
      if (h) {
        flush()
        cur = { qlId: h[1].trim(), date: h[2].trim(), title: h[3].trim(), solution: '', files: [], source: 'quicklog' }
        inFiles = false
        continue
      }
      if (!cur) continue
      if (QUICKLOG_FIELD_RE.test(line)) {
        inFiles = false
        const m = line.match(/^方案\s*[：:]\s*(.*)$/)
        if (m) cur.solution = m[1].trim()
        continue
      }
      if (/^文件\s*[：:]/.test(line)) {
        inFiles = true
        continue
      }
      if (inFiles) {
        const m = line.match(QUICKLOG_FILE_LINE_RE)
        if (m) cur.files.push(m[1].replace(/\\/g, '/'))
      }
    }
    flush()
  }
  return entries
}

/** 源②：flow 归档变更伪条目——目录内 flow-state.yaml 在场即认（不校验 yaml 内容：伪条目
 * 只需「这曾是一个 flow 变更」的存在信号，字段全来自目录名与 proposal.md，缺件逐项降级）。 */
function parseFlowArchiveEntries(specBase) {
  const archiveDir = join(specBase, 'changes', 'archive')
  let dirs
  try {
    dirs = readdirSync(archiveDir, { withFileTypes: true })
  } catch {
    return []
  }
  const out = []
  for (const d of dirs) {
    if (!d.isDirectory()) continue
    try {
      const dir = join(archiveDir, d.name)
      if (!existsSync(join(dir, 'flow-state.yaml'))) continue
      const dm = d.name.match(/^(\d{4}-\d{2}-\d{2})-/)
      let date = dm ? dm[1] : ''
      if (!date) {
        try { date = new Date(statSync(join(dir, 'flow-state.yaml')).mtime).toISOString().slice(0, 10) } catch { /* mtime 不可得 → 空日期（排序自然靠后） */ }
      }
      let title = ''
      try {
        const prop = readFileSync(join(dir, 'proposal.md'), 'utf8')
        const h = prop.replace(/\r\n/g, '\n').split('\n').find((l) => /^#\s+/.test(l))
        if (h) title = h.replace(/^#\s+/, '').trim()
      } catch { /* 无 proposal.md → 标题退变更名 */ }
      out.push({ qlId: d.name, date, title: title || d.name, solution: '', files: [], source: 'flow' })
    } catch { /* 单目录读取异常 → 跳过该目录（fail-open，不影响其余源） */ }
  }
  return out
}

// ── 匹配打分 ─────────────────────────────────────────────────────────────────
// 查询侧 token：ASCII 词（≥3 字符，词边界匹配）+ CJK 连续段（≥2 字，子串匹配）——
// 与 knowledge-match.keywordMatchesContext 同判法，方向相反（那边条目出关键词查上下文，
// 这边上下文出 token 查条目——quicklog 条目没有 INDEX 关键词行，只能反向）。
const ASCII_TOKEN_RE = /[a-z][a-z0-9._-]{2,}/g
const CJK_RUN_RE = /[\u4e00-\u9fff]{2,}/g

function contextTokens(taskContext) {
  const s = String(taskContext || '').toLowerCase()
  const out = new Set()
  for (const t of s.match(ASCII_TOKEN_RE) || []) out.add(t)
  for (const t of s.match(CJK_RUN_RE) || []) out.add(t)
  return [...out]
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 文件命中权重：路径/文件名是强信号（同一文件被改过 ≈ 同域修补） */
const FILE_HIT_WEIGHT = 5
/** 命中门槛：≥1 文件命中，或 ≥2 个不同 token 命中（单 token 命中多为噪音词，不注入） */
const MIN_TOKEN_HITS = 2

/** 源排序权重：quicklog 条目 0（排前），flow 伪条目 1——双源命中时 quicklog 优先（更新鲜）。 */
function sourceRank(entry) {
  return entry && entry.source === 'flow' ? 1 : 0
}

/**
 * 任务上下文 × quicklog 条目匹配（双源条目统一打分，排序 source 键优先）。
 * @param {string} specBase - .sillyspec 根
 * @param {string} taskContext - 任务描述串（与 matchKnowledge 的 query 同源）
 * @param {{ limit?: number }} [opts] - 注入上限（默认 3）
 * @returns {{ hits: Array<{ qlId: string, date: string, title: string, files: string[] }>, report: string }}
 *   无 quicklog / 无命中 / 任何异常 → { hits: [], report: '' }（fail-open，永不抛）
 */
export function matchQuicklogContext(specBase, taskContext, { limit = 3 } = {}) {
  try {
    if (!specBase || !taskContext) return { hits: [], report: '' }
    const entries = parseQuicklogEntries(specBase)
    if (entries.length === 0) return { hits: [], report: '' }
    const tokens = contextTokens(taskContext)
    if (tokens.length === 0) return { hits: [], report: '' }

    const scored = []
    for (const e of entries) {
      const hay = [e.title, e.solution, e.files.join(' ')].join(' ').toLowerCase()
      const basenames = new Set(e.files.map((f) => f.split('/').pop().toLowerCase()))
      let score = 0
      let tokenHits = 0
      let fileHit = 0
      for (const t of tokens) {
        let hit = false
        if (/[^\x00-\x7f]/.test(t)) {
          hit = hay.includes(t)
        } else {
          hit = new RegExp(`(^|[^a-z0-9])${escapeRegex(t)}([^a-z0-9]|$)`).test(hay)
          if (!hit && t.length >= 4) {
            for (const b of basenames) {
              if (b.includes(t)) {
                hit = true
                fileHit++
                score += FILE_HIT_WEIGHT
                break
              }
            }
          }
        }
        if (hit) {
          score += 1
          tokenHits++
        }
      }
      if (fileHit >= 1 || tokenHits >= MIN_TOKEN_HITS) {
        scored.push({ entry: e, score, fileHit })
      }
    }
    scored.sort((a, b) =>
      (sourceRank(a.entry) - sourceRank(b.entry)) ||
      (b.fileHit - a.fileHit) ||
      (b.score - a.score) ||
      String(b.entry.date).localeCompare(String(a.entry.date))
    )
    const top = scored.slice(0, Math.max(1, limit)).map((s) => ({
      qlId: s.entry.qlId,
      date: String(s.entry.date).slice(0, 10),
      title: s.entry.title,
      files: s.entry.files,
    }))
    return { hits: top, report: renderQuicklogSection(top) }
  } catch {
    return { hits: [], report: '' }
  }
}

/**
 * 注入段渲染（prompt.js 与 execute.js 孪生共用——仅段头层级不同）。
 * 一行一条：ql-ID · 标题（截 60）· 日期 · 至多 2 个触碰文件。零正文注入——
 * quicklog 条目正文可能很长，注入面只做「知道有这回事 + 回源指针」。
 * @param {Array<{qlId,date,title,files}>} hits
 * @param {{ h3?: boolean }} [opts] - execute.js Wave prompt 内用 h3（### ）对齐知识段层级
 */
export function renderQuicklogSection(hits, { h3 = false } = {}) {
  if (!Array.isArray(hits) || hits.length === 0) return ''
  const lines = [
    `${h3 ? '### ' : ''}🕘 近期 quick 修补（quicklog 机械匹配，top-${hits.length}——历史记录非权威断言，细节按 ql-ID 回源 .sillyspec/quicklog/ 或读代码）`,
  ]
  for (const h of hits) {
    const files = (h.files || []).slice(0, 2).join(', ')
    const title = String(h.title || '').slice(0, 60)
    const date = String(h.date || '').slice(0, 10)
    lines.push(` - ${h.qlId} · ${title} · ${date}${files ? ` · ${files}` : ''}`)
  }
  return lines.join('\n')
}
