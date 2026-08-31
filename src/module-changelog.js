/**
 * module-changelog.js — 模块卡「变更索引」解析（模块→变更历史只读索引）。
 *
 * 背景（2026-08-31 变更关联审计）：模块卡的变更史是全仓变更名提名密度最高的活文档
 * （12 张卡 + 6 个 sidecar，45+ 行），但格式是 agent 归档同步时自发形成的半结构化惯例，
 * 从未被解析消费。本模块把它变成机器可读：供 prompt.js buildModuleContextInjection
 * 注入「最近变更」，让 brainstorm/plan/execute 免扫描地知道该模块最近被谁动过。
 *
 * 格式实测变体（勿按单一格式写死）：
 *   标题：`## 变更索引（表格，初始为空）`（scan 模板）与 `## 变更索引`（手写）两种；
 *   行体：表格 `| 日期 | 变更名 | 摘要 |` 与列表 `- <变更名> | <摘要>` 混用（同一卡可混合）；
 *   名字：日期前缀真实变更名（2026-08-13-foo）或 ql-* quicklog id，偶见 `（quick）`后缀；
 *   噪音：表头/分隔行、纯日期遗留行（`- 2026-06-03 | 初始文档`）、sidecar 迁出指针行
 *   （`见 \`x.changelog.md\`——…`）——全部经「整格匹配变更名」自然排除，无需黑名单。
 * sidecar（split-changelog 迁出产物）：`<module>.changelog.md`，frontmatter +
 * `# <module> 变更索引（changelog sidecar）` + 同款表格。卡内表是迁出前历史保留不动，
 * 与 sidecar 同名条目按首次出现去重（卡优先）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** 变更名整格匹配（剥 `（quick）` 类括号后缀后校验）：日期前缀真实名 / ql-* quicklog id */
const CHANGE_NAME_RE = /^(\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*|ql-\d{8}-\d{3}-[a-z0-9]+)$/i

/** 卡内小节标题：`## 变更索引` 前缀匹配（兼容「（表格，初始为空）」后缀变体） */
const SECTION_HEADING_RE = /^##\s*变更索引/

/**
 * 单行清洗为变更名：去列表标记 / 表格竖线两侧、剥括号后缀，整格匹配不过返回 null。
 * @param {string} raw 行内单元格或列表项原文
 * @returns {string|null}
 */
function toChangeName(raw) {
  const s = String(raw || '').trim().replace(/^[-|]\s*/, '').replace(/\s*[（(][^）)]*[)）]\s*$/, '').trim()
  return CHANGE_NAME_RE.test(s) ? s : null
}

/**
 * 从「变更索引」段文本解析条目（纯函数，卡内小节与 sidecar 正文共用）。
 * 表格行取「第一个整格匹配变更名的 cell」为名、最后一个非名 cell 为摘要；
 * 列表行 `- name | desc` 同理。表头/分隔行/纯日期遗留行/指针行均不匹配自然跳过。
 * @param {string} text 已切出的段文本（CRLF 已归一）
 * @returns {{ name: string, summary: string }[]}
 */
export function parseChangelogEntries(text) {
  const entries = []
  const seen = new Set()
  for (const line of String(text || '').replace(/\r\n/g, '\n').split('\n')) {
    if (/^\|[-:\s|]+\|$/.test(line.trim())) continue // 表格分隔行
    let cells
    if (line.startsWith('|')) {
      cells = line.split('|').slice(1, -1).map(c => c.trim())
    } else {
      const item = line.match(/^\s*-\s+(.+)/)
      if (!item) continue
      cells = item[1].split('|').map(c => c.trim())
    }
    const nameIdx = cells.findIndex(toChangeName)
    if (nameIdx === -1) continue
    const name = toChangeName(cells[nameIdx])
    if (seen.has(name)) continue
    // 摘要 = 名字 cell 之后最后一个非空 cell（容忍行尾悬空竖线与「只有名字」的列表行）
    let summary = ''
    for (let i = cells.length - 1; i > nameIdx; i--) {
      if (cells[i]) { summary = cells[i]; break }
    }
    entries.push({ name, summary })
    seen.add(name)
  }
  return entries
}

/** 切出卡内「## 变更索引…」段（到下一个 ## 标题或文末）；无该段返回 '' */
function extractChangelogSection(cardText) {
  const lines = String(cardText || '').replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex(l => SECTION_HEADING_RE.test(l))
  if (start === -1) return ''
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l))
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n')
}

/** sidecar 正文剥 frontmatter（--- … ---）后整文即变更索引段 */
function stripFrontmatter(text) {
  const t = String(text || '').replace(/\r\n/g, '\n')
  return t.startsWith('---') ? t.replace(/^---\n.*?\n---\n?/s, '') : t
}

/**
 * 读单个模块的变更史（卡内段 + sidecar，同名去重，按名字内日期降序 = 最近在前）。
 * 展示用途，宁可漏抓不可错抓：解析失败/文件缺失 → []（不抛，不阻断注入）。
 * @param {string} modulesDir 模块文档目录（…/docs/<project>/modules）
 * @param {string} moduleId
 * @returns {{ name: string, summary: string }[]}
 */
export function readModuleRecentChanges(modulesDir, moduleId) {
  if (!modulesDir || !moduleId) return []
  const entries = []
  const seen = new Set()
  const absorb = list => {
    for (const e of list) {
      if (seen.has(e.name)) continue
      entries.push(e)
      seen.add(e.name)
    }
  }
  try {
    const cardPath = join(modulesDir, `${moduleId}.md`)
    if (existsSync(cardPath)) absorb(parseChangelogEntries(extractChangelogSection(readFileSync(cardPath, 'utf8'))))
    const sidecarPath = join(modulesDir, `${moduleId}.changelog.md`)
    if (existsSync(sidecarPath)) absorb(parseChangelogEntries(stripFrontmatter(readFileSync(sidecarPath, 'utf8'))))
  } catch { /* 读失败按无变更史处理 */ }
  // 排序键 = 名字内前 8 位数字（日期前缀名 2026-08-13 与 ql-20260804 都取到各自日期；
  // 连续 \d{8} 匹配不到带横线的日期格式，按位收集）。无数字名垫底
  const dateKey = n => Number((n.match(/\d/g) || []).slice(0, 8).join('') || '0')
  return entries.sort((a, b) => dateKey(b.name) - dateKey(a.name))
}
