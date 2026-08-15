/**
 * docs-check — 文档行号引用校验核心（change: 2026-08-15-docs-check-productize）
 *
 * 从 dogfood 私有测试 test/doc-ref-check.test.mjs 抽离产品化（design D-001~D-008）：
 *   层1 存在性（所有引用必查）：文件存在 + 行号 ≥1 且 ≤ 总行数（范围引用查 end）
 *   层2 关键词断言（keywordAssert 可配，缺省开）：引用所在文档行内的反引号代码符号 token，
 *       断言源文件 [start-2, end+5] 窗口（实现期口径，非对称——文档行号常指向块起始行
 *       而 token 在体首几行）内含任一 token。多候选宽容：裸文件名多命中时任一候选全过即通过。
 *
 * 纯函数（collectDocRefs/looksLikeCodeSymbol/validateRefLines/extractExpectedTokensFromLine）
 * 无 fs 依赖可单测；resolveCandidates/walkGlob/runDocsCheck 是 IO 面。
 * 只读校验（不修改任何被校验文件）；纯 Node 内置模块零依赖（D-008：glob 手写 walker，
 * 仅「目录递归」「目录单层」「字面路径」三形态）；Windows 路径归一化；兼容 CRLF/LF。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** 提取 file.js:line / file.js:start-end 引用（.js/.mjs，反引号包裹与裸文本均命中，全文扫描 D-006） */
export const REF_RE = /([A-Za-z0-9_.\-\/]+\.(?:js|mjs)):(\d+)(?:-(\d+))?/g

/** 配置错误（glob 形态不支持等）→ CLI exit 2 */
export class DocsCheckConfigError extends Error {}

/**
 * 纯函数：从 markdown 全文提取全部 file:line 引用。
 * @param {string} md 文档全文
 * @returns {Array<{ ref, file, start, end, docLine }>} docLine 为 1-based 文档行号
 */
export function collectDocRefs(md) {
  if (!md || typeof md !== 'string') return []
  const refs = []
  const re = new RegExp(REF_RE.source, 'g')
  let m
  while ((m = re.exec(md)) !== null) {
    refs.push({
      ref: m[0],
      file: m[1],
      start: parseInt(m[2], 10),
      end: m[3] !== undefined ? parseInt(m[3], 10) : parseInt(m[2], 10),
      docLine: md.slice(0, m.index).split(/\r?\n/).length,
    })
  }
  return refs
}

/**
 * 纯函数：判定 token 是否「像代码符号」：首字符字母/_/$，且含大写字母/下划线/点/$ 之一。
 * 纯小写英文单词（local/platform/abort）→ false（自然语言，跳过断言防误报）。
 */
export function looksLikeCodeSymbol(token) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(token)) return false
  return /[A-Z_$.]/.test(token)
}

/**
 * 纯函数：层1 行号边界校验。
 * @param {number} totalLines 源文件总行数
 * @param {number} start 1-based 起始行
 * @param {number} end 1-based 结束行（单行引用 = start）
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function validateRefLines(totalLines, start, end) {
  const reasons = []
  if (start < 1 || start > totalLines) reasons.push(`行号超界（start=${start} > 总行数 ${totalLines}）`)
  if (end < start || end > totalLines) reasons.push(`范围 end=${end} 超界（总行数 ${totalLines}）`)
  return { ok: reasons.length === 0, reasons }
}

/**
 * 纯函数：层2 token 提取——引用所在的文档行内所有反引号 token 中的代码符号。
 * token 归一：①剥函数括号（getDispatchMode()）；②点分名拆段（syncMod.checkApproval → 两段）。
 * 空数组 = 纯位置引用，跳过层2。
 * @param {string} line 引用所在的文档行全文
 * @returns {string[]} token 列表
 */
export function extractExpectedTokensFromLine(line) {
  if (!line || typeof line !== 'string') return []
  const tokens = new Set()
  for (const mm of line.matchAll(/`([^`\n]{1,60})`/g)) {
    const t = mm[1].split('(')[0].trim()
    if (!looksLikeCodeSymbol(t)) continue
    tokens.add(t)
    if (t.includes('.')) {
      for (const seg of t.split('.')) {
        if (looksLikeCodeSymbol(seg)) tokens.add(seg)
      }
    }
  }
  return [...tokens]
}

/** 递归收集 dir 下与 baseName 同名的文件（相对 dir 的 POSIX 路径数组；排除 node_modules/.git） */
function findInTree(dir, baseName, rel = '') {
  const out = []
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue
    const relPath = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...findInTree(join(dir, e.name), baseName, relPath))
    else if (e.name === baseName) out.push(relPath)
  }
  return out
}

/**
 * 解析引用文件 → 候选绝对路径数组。文档写法三种混用（首跑实证）：
 * ①仓库根相对（src/sync.js / docs/...）→ 直拼；②src/ 内部相对（dispatch/probe.js）→
 * src/ 前缀重试；③裸中缀（backends/sillyhub-mcp.js）→ src/ 树内按路径后缀匹配。
 * 空数组 = 不存在。
 */
export function resolveCandidates(projectRoot, refFile) {
  if (refFile.includes('/')) {
    const direct = join(projectRoot, refFile)
    if (existsSync(direct)) return [direct]
    const inSrc = join(projectRoot, 'src', refFile)
    if (existsSync(inSrc)) return [inSrc]
    const slash = refFile.lastIndexOf('/')
    const baseName = slash === -1 ? refFile : refFile.slice(slash + 1)
    return findInTree(join(projectRoot, 'src'), baseName)
      .filter((rel) => ('src/' + rel).endsWith('/' + refFile) || 'src/' + rel === 'src/' + refFile)
      .map((rel) => join(projectRoot, 'src', rel))
  }
  return findInTree(join(projectRoot, 'src'), refFile).map((rel) => join(projectRoot, 'src', rel))
}

/** 读文件行数组（CRLF/LF 归一：split(/\r?\n/)，层2 只做子串查找不污染原文） */
function readLines(absPath) {
  try { return readFileSync(absPath, 'utf8').split(/\r?\n/) } catch { return null }
}

/** 简单通配匹配（skip 排除用，仅 * 单段） */
function matchSimple(text, pattern) {
  const parts = pattern.split('*')
  let idx = 0
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '') continue
    const found = text.indexOf(parts[i], idx)
    if (found === -1) return false
    if (i === 0 && found !== 0) return false
    idx = found + parts[i].length
  }
  return true
}

/**
 * glob walker（D-008：手写不引依赖）。仅支持三形态：
 *   - `dir/「递归」*.ext` 递归收集（maxDepth 12 兜底防符号链接环）
 *   - `dir/*.ext` 单层
 *   - 字面路径直传（存在才返回）
 * 其他形态（?、{a,b}、多层 * 混合等）抛 DocsCheckConfigError → CLI exit 2。
 * @param {string} projectRoot 锚点（平台模式也锚源码仓根，design §3.3）
 * @param {string} pattern glob 模式
 * @param {string[]} skip 排除 glob（前缀或单 * 简单匹配）
 * @returns {string[]} 命中文件的 POSIX 相对路径
 */
export function walkGlob(projectRoot, pattern, skip = []) {
  const norm = (p) => p.replace(/\\/g, '/')
  const isSkipped = (rel) => skip.some((s) => {
    const sn = norm(s).replace(/\/$/, '')
    return rel === sn || rel.startsWith(sn + '/') ||
      (sn.includes('*') && matchSimple(rel, sn))
  })
  const matchExt = (name, ext) => name.endsWith(ext)
  // 形态 1：**/*.ext
  let m = norm(pattern).match(/^(.+?)\/\*\*\/\*(\.[A-Za-z0-9]+)$/)
  if (m) {
    const [, baseDir, ext] = m
    const out = []
    const rec = (dir, rel, depth) => {
      if (depth > 12) return
      let entries
      try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.git') continue
        const relPath = rel ? `${rel}/${e.name}` : e.name
        if (isSkipped(relPath)) continue
        if (e.isDirectory()) rec(join(dir, e.name), relPath, depth + 1)
        else if (matchExt(e.name, ext)) out.push(relPath)
      }
    }
    rec(join(projectRoot, baseDir), baseDir, 0)
    return out
  }
  // 形态 2：dir/*.ext（单层）
  m = norm(pattern).match(/^(.+?)\/\*(\.[A-Za-z0-9]+)$/)
  if (m) {
    const [, baseDir, ext] = m
    const out = []
    let entries
    try { entries = readdirSync(join(projectRoot, baseDir), { withFileTypes: true }) } catch { return out }
    for (const e of entries) {
      if (!e.isFile()) continue
      const relPath = `${baseDir}/${e.name}`
      if (isSkipped(relPath)) continue
      if (matchExt(e.name, ext)) out.push(relPath)
    }
    return out
  }
  // 形态 3：字面路径（不含任何通配元字符才直传；含 ?、{ }、[ ] 等不支持形态落 error）
  if (!/[*?{}\[\]]/.test(pattern)) {
    return existsSync(join(projectRoot, pattern)) ? [norm(pattern)] : []
  }
  throw new DocsCheckConfigError(`不支持的 glob 形态：${pattern}（当前仅支持 dir/**/*.ext、dir/*.ext、字面路径）`)
}

/** 候选路径 → 相对 projectRoot 显示（失败信息用；Windows 反斜杠归一） */
function relDisplay(absPath, projectRoot) {
  return absPath
    .replace(/\\/g, '/')
    .replace(projectRoot.replace(/\\/g, '/') + '/', '')
}

/**
 * IO 入口：跑一次完整校验。
 * @param {{ projectRoot: string, docs?: string[], paths?: string[], skip?: string[], keywordAssert?: boolean }} opts
 *   projectRoot 源码仓根（候选解析与 glob 的锚点，平台模式也传源码仓根）
 *   docs 显式文档相对路径列表（优先于 paths glob 展开结果）
 * @returns {{ ok: boolean, total: number, invalid: Array<{doc, docLine, ref, reason}>, warnings: string[], kwChecked: number }}
 * @throws {DocsCheckConfigError} glob 形态不支持
 */
export function runDocsCheck(opts) {
  const { projectRoot, docs = null, paths = ['docs/**/*.md'], skip = [], keywordAssert = true } = opts || {}
  const warnings = []
  if (keywordAssert === false) warnings.push('关键词断言已关闭（keywordAssert=false），仅做存在性校验')
  const docFiles = docs && docs.length > 0
    ? docs
    : [...new Set(paths.flatMap((p) => walkGlob(projectRoot, p, skip)))].sort()

  const invalid = []
  let total = 0
  let kwChecked = 0

  for (const docRel of docFiles) {
    const docAbs = join(projectRoot, docRel)
    if (!existsSync(docAbs)) {
      invalid.push({ doc: docRel, docLine: 0, ref: '', reason: '文档不存在' })
      continue
    }
    const md = readFileSync(docAbs, 'utf8')
    const refs = collectDocRefs(md)
    const mdLines = md.split(/\r?\n/)

    for (const r of refs) {
      total++
      const candidates = resolveCandidates(projectRoot, r.file)
      if (candidates.length === 0) {
        invalid.push({
          doc: docRel, docLine: r.docLine, ref: r.ref,
          reason: '文件不存在（含 / 按仓库根解析；裸文件名在 src/ 递归）',
        })
        continue
      }
      // 多候选宽容：逐候选跑层1+层2，任一全过即通过
      const tokens = keywordAssert
        ? extractExpectedTokensFromLine(mdLines[r.docLine - 1] || '')
        : []
      const candidateFails = []
      let passedAny = false
      for (const candAbs of candidates) {
        const lines = readLines(candAbs)
        if (lines === null) { candidateFails.push(`${relDisplay(candAbs, projectRoot)}: 读取失败`); continue }
        const v = validateRefLines(lines.length, r.start, r.end)
        // 层2：token 任一在 [start-2, end+5] 窗口命中即过
        let kwOk = true
        if (tokens.length > 0) {
          const from = Math.max(0, r.start - 2)
          const to = Math.min(lines.length, r.end + 5)
          const window = lines.slice(from, to).join('\n')
          kwOk = tokens.some((t) => window.includes(t))
        }
        if (v.ok && kwOk) { passedAny = true; break }
        const reasons = [...v.reasons]
        if (!kwOk) reasons.push(`关键词缺失：期望任一「${tokens.join(' / ')}」在 [start-2, end+5] 窗口内`)
        candidateFails.push(`${relDisplay(candAbs, projectRoot)}: ${reasons.join('；')}`)
      }
      if (tokens.length > 0) kwChecked++
      if (!passedAny) {
        invalid.push({
          doc: docRel, docLine: r.docLine, ref: r.ref,
          reason: candidateFails.length > 1 ? `多候选全失败 → ${candidateFails.join(' | ')}` : candidateFails[0],
        })
      }
    }
  }

  return { ok: invalid.length === 0, total, invalid, warnings, kwChecked }
}
