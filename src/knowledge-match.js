/**
 * knowledge-match.js — knowledge 关键词匹配引擎
 * 从 INDEX.md 解析知识条目，按任务上下文匹配并生成 hit report
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
 * @returns {{ matched: boolean, entries: Array, report: string, json: object }}
 */
export function matchKnowledge(indexDir, taskContext) {
  const indexPath = join(indexDir, 'INDEX.md')

  // INDEX.md 不存在
  if (!existsSync(indexPath)) {
    return {
      matched: false,
      entries: [],
      report: 'Status: no matches (INDEX.md not found)',
      json: { matched: false, entry_count: 0, entries: [] }
    }
  }

  const allEntries = parseKnowledgeIndex(indexDir)
  if (allEntries.length === 0 || !taskContext) {
    return {
      matched: false,
      entries: [],
      report: 'Status: no matches',
      json: { matched: false, entry_count: 0, entries: [] }
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
      json: { matched: false, entry_count: 0, entries: [] }
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

  return { matched: true, entries: matched, report, json }
}
