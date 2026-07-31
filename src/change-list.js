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
 * 容忍可选编号前缀（`## 6. 文件变更清单` / `## 6) 文件变更清单`）——
 * brainstorm Step11 模板鼓励 design 章节带编号，编号前缀不应让 plan-postcheck 解析失败。
 */
const FILE_LIST_SECTION_RE = /^#{2,3}\s*(?:\d+[.)]\s*)?(文件变更清单|变更文件清单|文件清单|File Changes|Files to Change)/im

/**
 * exclude 子标题词集：「不修改/暂缓/保留」类 —— 其下路径从清单移除，不强制 task 覆盖。
 * 用排除集而非白名单：容忍「改动/变更/涉及」等近义 include 写法。
 */
const EXCLUDE_SUBSECTION_RE = /不修改|不变|保留|无变更|未变更|不改动|暂不|暂缓|暂定|待定|后续|未改|无需|不涉及/

/**
 * operation 词→归一化标签。design 清单「操作」列 cell 与分类列表子标题共用。
 * 用途：verify 删除探针对账——声明「新增/修改」却整文件删除 = 高风险信号。
 */
const OP_KEYWORDS = [
  { re: /^(新增|新建|创建|添加|add|new|create)$/i, op: '新增' },
  { re: /^(修改|更新|调整|改动|变更|重写|modify|update|change)$/i, op: '修改' },
  { re: /^(删除|移除|去掉|remove|delete|drop)$/i, op: '删除' },
  { re: /^(重命名|改名|rename|move)$/i, op: '重命名' },
]
function classifyOperation(raw) {
  if (!raw) return null
  const hit = OP_KEYWORDS.find(k => k.re.test(raw.trim()))
  return hit ? hit.op : null
}

/**
 * 分类列表子标题 → operation（`### 删除文件` → '删除'）。不命中返回 null。
 * ⚠️ 调用方必须先判 EXCLUDE_SUBSECTION_RE：「### 不修改文件」含「修改」二字，
 *    会被此处误匹配为「修改」——exclude 永远优先，命中 exclude 不跑 OP 映射。
 */
const OP_SUBSECTION_RE = [
  { re: /新增|新建|创建/, op: '新增' },
  { re: /修改|更新|改动|重写/, op: '修改' },
  { re: /删除|移除|去掉/, op: '删除' },
  { re: /重命名|改名/, op: '重命名' },
]
function classifySubsectionOp(title) {
  const hit = OP_SUBSECTION_RE.find(k => k.re.test(title))
  return hit ? hit.op : null
}

/** 表头列定位：cell 整体匹配操作类列名（与 isPathHeaderCell 对偶，用于定位 operation 列） */
function isOperationHeaderCell(c) {
  return /^(操作|类型|变更类型|改动类型|变更|operation|type|action|op)$/i.test(c)
}

function isPlaceholder(p) {
  return !p || p === '—' || p === '-' || /^(n\/?a|无|none|-+)$/i.test(p)
}

/** 表头列定位：cell 整体匹配路径类词 */
function isPathHeaderCell(c) {
  return /^(文件路径|文件名|文件|路径|filepath|filename|file\s*path|path)$/i.test(c)
}

/**
 * 路径合理性兜底：合法路径必含目录分隔 `/` 或扩展名点；
 * 两者皆无时仅保留纯 ASCII 单词 token（Dockerfile / Makefile / LICENSE 这类无扩展名文件名），
 * 丢弃含空格/中文的脏描述（如 design 表格第二列误写的「frontend 组件测试」「后端逻辑」）。
 * 防止把自由文本当路径计入 fileCount，虚高 review-tier 分级（误推 independent）。
 */
function looksLikePath(p) {
  if (!p) return false
  if (p.includes('/') || p.includes('.')) return true
  return /^[\w@-]+$/.test(p)
}

/**
 * 「顺带修复」标记：design §6 清单里标注的、不属本次变更 task 边界但合规修的预存债文件
 * （CLAUDE.md 规则20 鼓励）。assess 的 allowed_paths 校验对 incidental 文件豁免（坑
 * worktree-execute-apply-friction 坑1/4）。标记载体：表格「说明」列写「顺带修复：xxx」，
 * 或路径 cell / 列表项的括号注释「（顺带修复）」。
 */
const INCIDENTAL_RE = /顺带修复|附带修复|顺带|drive-?by|incidental/i

/**
 * 从 design.md 解析文件变更清单（含 incidental 标记）。兼容两种真实写法：
 *   ① 表格：`| 操作 | 文件路径 | 说明 |`（brainstorm 模板默认）
 *   ② 分类列表：`### 新增文件` / `### 修改文件` / `### 不修改文件` 下的 `- path`
 * 表头列顺序自适应（定位「文件/路径/file/path」列，列顺序写反时不会把操作名当路径）；
 * 忽略 `.sillyspec/` 与占位符（`—`/`-`/`N/A`/`无`）；「不修改/暂缓」子段下的路径会被排除；
 * CRLF 容错。incidental 嗅探：表格非路径列（说明列）+ 路径 cell 原始值（剥注释前的括号内容）+ 列表项原文。
 *
 * 内核函数：parseFileChangeList（Set 包装，向后兼容）与 parseFileChangeListDetailed 共用，
 * 单一真相源，避免两处各自重写清单解析漂移。
 * @param {string} designMdPath - design.md 文件路径
 * @returns {Array<{ path: string, operation: string|null, incidental: boolean }>}（顺序按首次出现，exclude 子段移除）
 */
function _parseFileListDetailed(designMdPath) {
  if (!designMdPath || !existsSync(designMdPath)) return []

  const content = readFileSync(designMdPath, 'utf8').replace(/\r\n/g, '\n')

  const sectionMatch = content.match(FILE_LIST_SECTION_RE)
  if (!sectionMatch) return []

  // 从标题后开始，截取到下一个 ## 标题或文件末尾
  const afterSection = content.slice(sectionMatch.index + sectionMatch[0].length)
  const nextSectionMatch = afterSection.match(/^##\s/m)
  const relevantContent = nextSectionMatch
    ? afterSection.slice(0, nextSectionMatch.index)
    : afterSection

  const lines = relevantContent.split('\n')
  let headerSkipped = false
  let pathColIdx = 1            // 默认第 2 列；解析表头后可重定位
  let opColIdx = -1             // 操作列下标（表头扫描后定位；-1 = 无操作列 → operation=null）
  let listMode = 'include'      // include | exclude（分类列表子段）
  let currentOp = null          // 分类列表子标题推导的 operation（表格模式不用）
  const entries = new Map()     // path -> { path, operation, incidental }（exclude 子段 delete）

  for (const line of lines) {
    // 分类列表子标题：### 新增文件 / ### 修改文件 / ### 不修改文件
    const subHeader = line.match(/^###\s+(.+?)\s*$/)
    if (subHeader) {
      // ⚠️ EXCLUDE 优先：「### 不修改文件」含「修改」二字，会被 classifySubsectionOp 误匹配。
      //    先判 exclude 词集，命中则 exclude 且 currentOp=null，绝不跑 OP 映射。
      if (EXCLUDE_SUBSECTION_RE.test(subHeader[1])) {
        listMode = 'exclude'
        currentOp = null
      } else {
        listMode = 'include'
        currentOp = classifySubsectionOp(subHeader[1])
      }
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
        // 操作列定位：非路径列里找操作类列名（「操作/类型/operation」），找不到 opColIdx 保持 -1
        const opIdx = cells.findIndex((c, i) => i !== pathColIdx && isOperationHeaderCell(c))
        if (opIdx >= 0) opColIdx = opIdx
        continue
      }

      const filePath = normalizePath(cells[pathColIdx] || '')
      // 列定位兜底：取到纯操作词（表头未命中且列顺序异常）→ 跳过，避免把「修改」当路径
      if (/^(新增|修改|删除|重命名|new|modify|update|delete|create|rename)$/i.test(filePath)) continue
      if (isPlaceholder(filePath) || filePath.startsWith('.sillyspec/')) continue
      if (!looksLikePath(filePath)) continue // 脏描述兜底：丢弃非路径自由文本（防虚高 fileCount）
      // operation：操作列 cell 分类（无操作列 → null）
      const operation = opColIdx >= 0 ? classifyOperation(cells[opColIdx] || '') : null
      // incidental：说明列（非路径列的所有 cell）+ 路径 cell 原始值（剥注释前的括号内容）
      const incidental = cells.some((c, i) => i !== pathColIdx && INCIDENTAL_RE.test(c))
        || INCIDENTAL_RE.test(cells[pathColIdx] || '')
      if (listMode === 'exclude') { entries.delete(filePath); continue }
      entries.set(filePath, { path: filePath, operation, incidental })
      continue
    }

    // 分类列表项：`- path` / `- \`path\``
    const listItem = line.match(/^\s*-\s+(.+)/)
    if (listItem) {
      const filePath = normalizePath(listItem[1])
      if (isPlaceholder(filePath) || filePath.startsWith('.sillyspec/')) continue
      if (!looksLikePath(filePath)) continue // 脏描述兜底
      const incidental = INCIDENTAL_RE.test(listItem[1])
      if (listMode === 'exclude') { entries.delete(filePath); continue }
      entries.set(filePath, { path: filePath, operation: currentOp, incidental })
    }
  }

  return [...entries.values()]
}

/**
 * 从 design.md 解析文件变更清单（路径集合，向后兼容）。
 * @param {string} designMdPath - design.md 文件路径
 * @returns {Set<string>} 文件路径集合（相对路径，如 "src/worktree.js"）
 */
export function parseFileChangeList(designMdPath) {
  return new Set(_parseFileListDetailed(designMdPath).map(e => e.path))
}

/**
 * 从 design.md 解析文件变更清单（含 operation + incidental 标记）。
 * operation 供 verify 删除探针对账（声明「新增/修改」却整文件删除 = 高风险）；
 * incidental 供 assess allowed_paths 豁免。
 * @param {string} designMdPath - design.md 文件路径
 * @returns {Array<{ path: string, operation: string|null, incidental: boolean }>}
 */
export function parseFileChangeListDetailed(designMdPath) {
  return _parseFileListDetailed(designMdPath)
}
