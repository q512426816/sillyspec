/**
 * deps-symbol-narrow — import 依赖回归面的枢纽符号收敛纯函数层
 * （2026-11-11-deps-hub-symbol-narrow / FR-01~05）
 *
 * 定位：叶子模块，只依赖 node 内建（verify-postcheck.js import 本模块；本模块绝不反向
 * import——设计「试过但放弃②」：反向依赖成环）。三件套：
 *   extractTouchedExports(content, diffText) —— export 声明 span × diff 精确改动行（+/− 的
 *     新侧行号）命中 ∪ 差异行导出名词法 → 触达导出符号集
 *   namedImportEvidence(code, srcRel, symbols) —— 命名导入三态判定 'hit'|'miss'|'unknown'
 *     （code 须为剥注释后代码——调用方 verify-postcheck 已有 stripCommentsForDepMatch）
 *   collectTouchedExportSymbols({cwd, changeName, specBase, changedFiles, gitFn}) —— diff
 *     收集器（flow-state baseline_commit 直锚 + 脏面；untracked 全符号触达）；任何失败
 *     返回 null（fail-soft，调用方回落现状模块级匹配）
 *
 * 收敛不变量：多跑侧保留（hit/unknown）只在「全部命名导入均不含触达符号」这一可判定
 * 形态上放开出面（miss）——该放开是本变更的显式设计取舍（用户决策），其余形态一律
 * fail-open 回落模块路径匹配（只可能多跑不漏的 2026-09-26-dynamic-test-inference 契约）。
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

/** 枢纽阈值：模块路径命中依赖测试数 > 该值的变更文件才激活符号收敛（无配置键——默认零配置可用）。 */
export const DEPS_SYMBOL_NARROW_HUB_MIN = 8

/** 测试文件判定（与 verify-postcheck.js isTestFilePath 同形——独立声明防反向依赖）。 */
function isTestFilePath(p) {
  return /\.(test|spec)\.[cm]?(js|jsx|ts|tsx)$/.test(p) || /(^|\/)test_[^\/]+\.py$/.test(p) || /(^|\/)[^\/]+_test\.py$/.test(p)
}

/**
 * export 声明体 span 终点（字符串感知括号配对）：从声明后首个 { 起配对到闭合；首个 { 在
 * 声明行外（如 `const x = 5` 后面才是别的导出的花括号）→ 退行尾，防 span 越界吞下一导出。
 */
function findDeclSpanEnd(content, fromIdx) {
  const lineEnd = content.indexOf('\n', fromIdx)
  let i = content.indexOf('{', fromIdx)
  if (i === -1 || (lineEnd !== -1 && i > lineEnd)) return lineEnd === -1 ? content.length : lineEnd
  let depth = 0
  let quote = null
  for (; i < content.length; i++) {
    const c = content[i]
    if (quote) {
      if (c === '\\') { i++; continue }
      if (c === quote) quote = null
      continue
    }
    if (c === '\'' || c === '"' || c === '`') { quote = c; continue }
    if (c === '{' || c === '(' || c === '[') depth++
    else if (c === '}' || c === ')' || c === ']') {
      depth--
      if (depth === 0) return i
    }
  }
  return content.length
}

/** char offset → 1-based 行号（行起点偏移表法，避免逐声明 O(n²) 切片）。 */
function lineOf(offsets, idx) {
  let lo = 0
  let hi = offsets.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (offsets[mid] <= idx) lo = mid
    else hi = mid - 1
  }
  return lo + 1
}

/** import 子句分类：named（含命名清单文本）/ default / ns / other。 */
function classifyImportClause(clause) {
  const t = clause.trim()
  if (t.startsWith('*') || /(^|,\s*)\*\s+as\s+[A-Za-z_$][\w$]*$/.test(t)) return { kind: 'ns' }
  const defNamed = t.match(/^(?:type\s+)?([A-Za-z_$][\w$]*)\s*,\s*(?:type\s+)?\{([\s\S]*)\}$/)
  if (defNamed) return { kind: 'default+named', named: defNamed[2] }
  const defOnly = t.match(/^(?:type\s+)?([A-Za-z_$][\w$]*)$/)
  if (defOnly) return { kind: 'default' }
  const named = t.match(/^(?:type\s+)?\{([\s\S]*)\}$/)
  if (named) return { kind: 'named', named: named[1] }
  return { kind: 'other' }
}

/** 命名清单文本 → 符号名数组（`a as b` 取前名；`default as x` 走 default 特判归 unnamable）。 */
function parseNamedList(text) {
  return text.split(',')
    .map((s) => {
      const m = s.trim().match(/^([A-Za-z_$][\w$]*)/)
      return m ? m[1] : null
    })
    .filter((n) => n && n !== 'default')
}

/**
 * 触达导出符号集（纯函数）：
 * ① diff 精确改动行集合（+/− 行的新侧行号；@@ 头 span 含默认 3 行上下文，直接用会把相邻
 *    导出误触达——逐行游标法只记真实改动行）→ export 声明（function/class/const/let/var/
 *    interface/type/enum 具名 + `export { … }` 列表，字符串感知配对定 span）的行 span 命中
 *    任一改动行 → 触达；
 * ② diff +/− 行上出现导出名（\b 词法）→ 触达（改动行引用了别的导出名——保守并入多跑侧）。
 * @returns {string[]} 排序去重后的符号名（匿名 default export 无名不产出——其使用方走 unknown fail-open）
 */
export function extractTouchedExports(content, diffText) {
  const c = String(content || '')
  const d = String(diffText || '')
  if (!c || !d) return []
  // 行起点偏移表
  const offsets = [0]
  for (let i = 0; i < c.length; i++) if (c[i] === '\n') offsets.push(i + 1)
  // ① 具名 export 声明
  const decls = []
  const DECL_RE = /(?:^|[\s;}])export\s+(?:default\s+)?(?:async\s+)?(?:function\s*\*|function|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g
  for (const m of c.matchAll(DECL_RE)) {
    decls.push({ name: m[1], start: lineOf(offsets, m.index), end: lineOf(offsets, findDeclSpanEnd(c, m.index + m[0].length)) })
  }
  // ② export { a, b as c } 列表（span=列表花括号配对——任一列表行被改动即整列表触达）
  for (const m of c.matchAll(/export\s*\{/g)) {
    const openIdx = m.index + m[0].length - 1
    const end = findDeclSpanEnd(c, openIdx)
    const inner = c.slice(openIdx + 1, end)
    const names = parseNamedList(inner)
    const start = lineOf(offsets, m.index)
    for (const n of names) decls.push({ name: n, start, end: lineOf(offsets, end) })
  }
  if (decls.length === 0) return []
  // diff 精确改动行（新侧行号）：游标走 diff 正文，+ 行记行号、− 行不推进、上下文推进不记
  const changedLines = new Set()
  let nline = 0
  for (const line of d.split('\n')) {
    const hm = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/)
    if (hm) { nline = parseInt(hm[1], 10); continue }
    if (!line || line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) continue
    if (line.startsWith('\\')) continue
    if (line.startsWith('+')) { changedLines.add(nline); nline++ }
    else if (line.startsWith('-')) { /* 旧侧行——不推进新侧游标 */ }
    else nline++
  }
  const touched = new Set()
  for (const decl of decls) {
    for (let ln = decl.start; ln <= decl.end; ln++) {
      if (changedLines.has(ln)) { touched.add(decl.name); break }
    }
  }
  // 差异行词法（+/- 行，跳过 +++/--- 文件头）
  const names = decls.map((x) => x.name)
  for (const line of d.split('\n')) {
    if (!line || (line[0] !== '+' && line[0] !== '-') || line.startsWith('+++') || line.startsWith('---')) continue
    const text = line.slice(1)
    for (const n of names) {
      if (new RegExp(`\\b${n}\\b`).test(text)) touched.add(n)
    }
  }
  return [...touched].sort()
}

/**
 * 命名导入三态判定（纯函数；code 须为剥注释后代码——调用方 verify-postcheck 的
 * stripCommentsForDepMatch 产物）：
 *   'hit'     —— 任一引用语句的命名清单含触达符号（别名取前名）
 *   'miss'    —— 全部引用语句均为纯命名清单且无一含触达符号（收敛出面形态，唯一放开点）
 *   'unknown' —— 存在 default/namespace/动态 import/副作用/require 整体赋值形态、或无任何
 *                import 语句（字符串提及等）——fail-open 保留
 */
export function namedImportEvidence(code, srcRel, symbols) {
  const codeStr = String(code || '')
  const rel = String(srcRel || '')
  const symSet = new Set(Array.isArray(symbols) ? symbols : [])
  if (!codeStr || !rel || symSet.size === 0) return 'unknown'
  let sawNamed = false
  let sawUnnamable = false
  let hit = false
  const scanList = (listText) => {
    const names = parseNamedList(listText)
    if (names.length === 0) { sawUnnamable = true; return }
    sawNamed = true
    if (names.some((n) => symSet.has(n))) hit = true
  }
  // import … from '…'
  for (const m of codeStr.matchAll(/import\s+([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/g)) {
    if (!m[2].includes(rel)) continue
    const cls = classifyImportClause(m[1])
    if (cls.kind === 'named') scanList(cls.named)
    else if (cls.kind === 'default+named') scanList(cls.named) // 命中优先多跑侧；未命中由 default 标 unknown
    else sawUnnamable = true
  }
  // 副作用 import '…'（无 from 子句）
  for (const m of codeStr.matchAll(/import\s*['"]([^'"]+)['"]/g)) {
    if (m[1].includes(rel)) sawUnnamable = true
  }
  // require 解构 / require 整体赋值 / 动态 import
  for (const m of codeStr.matchAll(/(?:const|let|var)\s+(?:type\s+)?\{([^}]*)\}\s*=\s*(?:await\s+)?require\s*\(\s*['"]([^'"]+)['"]/g)) {
    if (!m[2].includes(rel)) continue
    scanList(m[1])
  }
  for (const m of codeStr.matchAll(/(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:await\s+)?require\s*\(\s*['"]([^'"]+)['"]/g)) {
    if (m[1].includes(rel)) sawUnnamable = true
  }
  for (const m of codeStr.matchAll(/import\s*\(\s*['"]([^'"]+)['"]/g)) {
    if (m[1].includes(rel)) sawUnnamable = true
  }
  if (hit) return 'hit'
  if (sawUnnamable) return 'unknown'
  if (sawNamed) return 'miss'
  return 'unknown'
}

/** 缺省 git 执行（路径安全：仅本仓相对文件参数，timeout 30s 帽）。 */
function defaultGit(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 30_000 })
}

function safeDiff(run, cwd, args) {
  try { return String(run(cwd, args) || '') } catch { return '' }
}

/** flow-state.yaml 的 baseline_commit（specBase 优先 + cwd/.sillyspec 兜底双候选——resolveMainChangedFiles 同口径）。 */
function readBaselineCommit({ cwd, specBase, changeName }) {
  const candidates = specBase
    ? [join(specBase, 'changes', changeName, 'flow-state.yaml'), join(cwd, '.sillyspec', 'changes', changeName, 'flow-state.yaml')]
    : [join(cwd, '.sillyspec', 'changes', changeName, 'flow-state.yaml')]
  for (const p of candidates) {
    try {
      const m = readFileSync(p, 'utf8').match(/^\s*baseline_commit:\s*([0-9a-fA-F]{7,40})\s*$/m)
      if (m) return m[1]
    } catch { /* 下一候选 */ }
  }
  return null
}

/**
 * diff 收集器：变更 JS/TS 源文件逐个提「触达导出符号集」。anchor 取 flow-state baseline_commit
 * （缺失 → 仅脏面）；diff = 提交面（anchor..HEAD）∪ 脏面（HEAD..工作区）；untracked 新文件
 * → 全文件视为新增（全符号触达=等价模块级，不产生收窄）。
 * 任何失败返回 null（fail-soft——调用方回落现状）；文件不可读（删除）/无符号 → 不进结果
 * （该文件由 discover 侧回落模块级）。
 * @returns {Object<string, string[]>|null} posixPath → 符号名数组
 */
export function collectTouchedExportSymbols({ cwd, changeName, specBase, changedFiles, gitFn } = {}) {
  try {
    if (!cwd || !changeName || !Array.isArray(changedFiles) || changedFiles.length === 0) return null
    const run = typeof gitFn === 'function' ? gitFn : defaultGit
    const norm = (p) => String(p).replace(/\\/g, '/')
    const srcFiles = [...new Set(changedFiles.map(norm))]
      .filter((p) => !isTestFilePath(p) && /\.(js|mjs|cjs|ts|tsx)$/.test(p))
    if (srcFiles.length === 0) return null
    const anchor = readBaselineCommit({ cwd, specBase, changeName })
    const out = {}
    for (const f of srcFiles) {
      let content
      try { content = readFileSync(join(cwd, f), 'utf8') } catch { continue }
      let diffText = ''
      if (anchor) diffText += safeDiff(run, cwd, ['diff', `${anchor}..HEAD`, '--', f])
      diffText += safeDiff(run, cwd, ['diff', 'HEAD', '--', f])
      if (!diffText.trim()) {
        const tracked = safeDiff(run, cwd, ['ls-files', '--', f])
        if (!tracked.trim()) diffText = content.split('\n').map((l) => '+' + l).join('\n')
      }
      const symbols = extractTouchedExports(content, diffText)
      if (symbols.length > 0) out[f] = symbols
    }
    return Object.keys(out).length > 0 ? out : null
  } catch {
    return null
  }
}
