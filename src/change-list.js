import { readFileSync, existsSync } from 'fs'

/**
 * 归一化清单/allowed_paths 中的路径项：
 * - 去反引号、去行内括号注释（`src/foo.js (新增)` / `src/foo.js（说明）`）
 * - 统一为正斜杠、去首尾空白与尾部斜杠
 * @param {string} raw
 * @returns {string}
 */
function normalizeEntry(raw) {
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
 * 从 design.md 解析文件变更清单。兼容两种真实写法：
 *   ① 表格：`| 操作 | 文件路径 | 说明 |`（brainstorm 模板默认）
 *   ② 分类列表：`### 新增文件` / `### 修改文件` / `### 不修改文件` 下的 `- path`
 * 始终忽略 `.sillyspec/` 内的路径与占位符；「不修改/保留」子段下的路径会被排除。
 * @param {string} designMdPath - design.md 文件路径
 * @returns {Set<string>} 文件路径集合（相对路径，如 "src/worktree.js"）
 */
export function parseFileChangeList(designMdPath) {
  const result = new Set()

  if (!designMdPath || !existsSync(designMdPath)) return result

  const content = readFileSync(designMdPath, 'utf8').replace(/\r\n/g, '\n')

  // 定位"文件变更清单"标题
  const sectionRegex = /^#{2,3}\s*文件变更清单/m
  const sectionMatch = content.match(sectionRegex)
  if (!sectionMatch) return result

  // 从标题后开始，截取到下一个 ## 标题或文件末尾
  const afterSection = content.slice(sectionMatch.index + sectionMatch[0].length)
  const nextSectionMatch = afterSection.match(/^##\s/m)
  const relevantContent = nextSectionMatch
    ? afterSection.slice(0, nextSectionMatch.index)
    : afterSection

  const isExcluded = (p) => !p || p === '—' || p === '-' || p.startsWith('.sillyspec/')

  const lines = relevantContent.split('\n')
  let headerSkipped = false
  // 分类列表的当前子段模式：include（新增/修改/删除）或 exclude（不修改/保留）
  let listMode = 'include'

  for (const line of lines) {
    // 分类列表子标题：### 新增文件 / ### 修改文件 / ### 不修改文件
    const subHeader = line.match(/^###\s+(.+?)\s*$/)
    if (subHeader) {
      listMode = /不修改|不变|保留|无变更|未变更|不改动/.test(subHeader[1]) ? 'exclude' : 'include'
      continue
    }

    // 表格行
    if (line.startsWith('|')) {
      if (/^\|[-:\s|]+\|$/.test(line)) continue // 分隔行
      const cells = line.split('|').slice(1, -1) // 去掉首尾空元素
      if (cells.length < 2) continue
      if (!headerSkipped) { headerSkipped = true; continue } // 跳过表头

      const filePath = normalizeEntry(cells[1])
      if (isExcluded(filePath)) continue
      result.add(filePath)
      continue
    }

    // 分类列表项：`- path` / `- \`path\``
    const listItem = line.match(/^\s*-\s+(.+)/)
    if (listItem) {
      const filePath = normalizeEntry(listItem[1])
      if (isExcluded(filePath)) continue
      if (listMode === 'exclude') result.delete(filePath)
      else result.add(filePath)
    }
  }

  return result
}
