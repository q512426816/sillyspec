import { readFileSync, existsSync } from 'fs'

/**
 * 路径项归一化：去反引号、去行内括号注释（`src/foo.js (新增)` / `src/foo.js（说明）`）、
 * 统一为正斜杠、去首尾空白与尾部斜杠。
 * design 清单 cell 与 task allowed_paths 共用此归一化（两处写法都可能带注释/反引号）。
 * @param {string} raw
 * @returns {string}
 */
export function normalizePath(raw) {
  if (!raw) return ''
  return raw
    .replace(/`/g, '')
    .replace(/\s*（[^）]*）\s*$/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
    .trim()
}

/**
 * glob → 正则：双星（globstar）跨零或多段目录（含零段，bash 语义）、
 * 单星 → 单段（[^/]*）、问号 → 单字符（[^/]），其余转义。
 * pattern 不含通配符时返回 false（调用方先用完全相等判断）。
 * 不支持字符类（design/allowed_paths 实际不写，遇方括号按字面转义）。
 * @param {string} str
 * @param {string} pattern
 * @returns {boolean}
 */
export function globMatch(str, pattern) {
  if (!/[*?]/.test(pattern)) return false
  let re = '^'
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        // ** 跨零或多段：吞掉紧随的 /，输出 (?:.*/)? 让 src/**/a.js 也能匹配 src/a.js
        if (pattern[i + 2] === '/') { re += '(?:.*/)?'; i += 2 }
        else { re += '.*'; i++ }
      } else {
        re += '[^/]*'
      }
    } else if (ch === '?') {
      re += '[^/]'
    } else {
      re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
  }
  re += '$'
  try { return new RegExp(re).test(str) } catch { return false }
}

/**
 * 双向容差匹配：design 清单文件 vs task allowed_paths（或脏文件 vs 清单）。
 * 命中条件（任一）：完全相等 / 目录前缀包含（双向）/ glob 通配（双向）。
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function pathMatches(a, b) {
  a = normalizePath(a)
  b = normalizePath(b)
  if (!a || !b) return false
  if (a === b) return true
  if (a.startsWith(b + '/') || b.startsWith(a + '/')) return true
  if (globMatch(a, b) || globMatch(b, a)) return true
  return false
}

/**
 * 「文件变更清单」章节标题同义词（与 src/stage-contract.js 的识别集对齐，
 * 避免两个校验器对「有没有清单」给出矛盾结论）。
 */
const FILE_LIST_SECTION_RE = /^#{2,3}\s*(文件变更清单|变更文件清单|文件清单|File Changes|Files to Change)/im

/**
 * exclude 子标题词集：「不修改/暂缓/保留」类 —— 其下路径从清单移除，不强制 task 覆盖。
 * 用排除集而非白名单：容忍「改动/变更/涉及」等近义 include 写法。
 */
const EXCLUDE_SUBSECTION_RE = /不修改|不变|保留|无变更|未变更|不改动|暂不|暂缓|暂定|待定|后续|未改|无需|不涉及/

function isPlaceholder(p) {
  return !p || p === '—' || p === '-' || /^(n\/?a|无|none|-+)$/i.test(p)
}

/** 表头列定位：cell 整体匹配路径类词 */
function isPathHeaderCell(c) {
  return /^(文件路径|文件名|文件|路径|filepath|filename|file\s*path|path)$/i.test(c)
}

/**
 * 从 design.md 解析文件变更清单。兼容两种真实写法：
 *   ① 表格：`| 操作 | 文件路径 | 说明 |`（brainstorm 模板默认）
 *   ② 分类列表：`### 新增文件` / `### 修改文件` / `### 不修改文件` 下的 `- path`
 * 表头列顺序自适应（定位「文件/路径/file/path」列，列顺序写反时不会把操作名当路径）；
 * 忽略 `.sillyspec/` 与占位符（`—`/`-`/`N/A`/`无`）；「不修改/暂缓」子段下的路径会被排除；
 * CRLF 容错。
 * @param {string} designMdPath - design.md 文件路径
 * @returns {Set<string>} 文件路径集合（相对路径，如 "src/worktree.js"）
 */
export function parseFileChangeList(designMdPath) {
  const result = new Set()
  if (!designMdPath || !existsSync(designMdPath)) return result

  const content = readFileSync(designMdPath, 'utf8').replace(/\r\n/g, '\n')

  const sectionMatch = content.match(FILE_LIST_SECTION_RE)
  if (!sectionMatch) return result

  // 从标题后开始，截取到下一个 ## 标题或文件末尾
  const afterSection = content.slice(sectionMatch.index + sectionMatch[0].length)
  const nextSectionMatch = afterSection.match(/^##\s/m)
  const relevantContent = nextSectionMatch
    ? afterSection.slice(0, nextSectionMatch.index)
    : afterSection

  const lines = relevantContent.split('\n')
  let headerSkipped = false
  let pathColIdx = 1            // 默认第 2 列；解析表头后可重定位
  let listMode = 'include'      // include | exclude（分类列表子段）

  for (const line of lines) {
    // 分类列表子标题：### 新增文件 / ### 修改文件 / ### 不修改文件
    const subHeader = line.match(/^###\s+(.+?)\s*$/)
    if (subHeader) {
      listMode = EXCLUDE_SUBSECTION_RE.test(subHeader[1]) ? 'exclude' : 'include'
      continue
    }

    // 表格行
    if (line.startsWith('|')) {
      if (/^\|[-:\s|]+\|$/.test(line)) continue // 分隔行
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      if (cells.length < 2) continue

      if (!headerSkipped) {
        headerSkipped = true
        // 表头列定位：找「文件/路径/file/path」列，找不到保持默认第 2 列
        const idx = cells.findIndex(isPathHeaderCell)
        if (idx >= 0) pathColIdx = idx
        continue
      }

      const filePath = normalizePath(cells[pathColIdx] || '')
      // 列定位兜底：取到纯操作词（表头未命中且列顺序异常）→ 跳过，避免把「修改」当路径
      if (/^(新增|修改|删除|重命名|new|modify|update|delete|create|rename)$/i.test(filePath)) continue
      if (isPlaceholder(filePath) || filePath.startsWith('.sillyspec/')) continue
      result.add(filePath)
      continue
    }

    // 分类列表项：`- path` / `- \`path\``
    const listItem = line.match(/^\s*-\s+(.+)/)
    if (listItem) {
      const filePath = normalizePath(listItem[1])
      if (isPlaceholder(filePath) || filePath.startsWith('.sillyspec/')) continue
      if (listMode === 'exclude') result.delete(filePath)
      else result.add(filePath)
    }
  }

  return result
}
