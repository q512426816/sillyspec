/**
 * doc-ref-check — 文档行号引用校验（change: 2026-08-14-doc-ref-check）
 *
 * 目标：把「文档 file:line 引用与源码一致性」变成 npm test 硬门。
 * 行号漂移（文件删改名 / 行号超界 / 引用指向的行内容与文档断言的关键词对不上）
 * → 本测试红灯 → npm test 失败 → CI（pre-push）阻断。
 *
 * 设计依据：.sillyspec/changes/2026-08-14-doc-ref-check/design.md
 *   层1 存在性（所有引用必查）：文件存在 + 行号 ≥1 且 ≤ 总行数（范围引用查 end）
 *   层2 关键词断言（条件触发）：引用前后 30 字符内最近的反引号 token 若「像代码符号」
 *       （首字符字母/_/$，且含大写字母/下划线/点/$ 之一），断言源文件 start±1 行内含该
 *       token（子串）。纯小写英文单词（local/platform 等）跳过，防误报。
 *   多候选宽容策略：裸文件名在 src/ 多命中（如 shared.js 在 src/run/ 与 src/progress/）
 *       时逐候选跑全部断言，任一候选全过即通过；全失败 → fail 并列各候选原因。
 *
 * 用法：node test/doc-ref-check.test.mjs（也被 test/run-tests.mjs 自动收集）
 * 铁律：只读（不修改任何被校验文件）；纯 Node 内置模块零依赖；兼容 CRLF/LF。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 被校验文档白名单（后续渐进加，本次仅平台接口地图） */
const DOCS = [
  'docs/sillyspec/platform-interface-map.md',
]

/** 提取 file.js:line / file.js:start-end 引用（.js/.mjs，兼容反引号包裹与裸文本） */
const REF_RE = /([A-Za-z0-9_.\-\/]+\.(?:js|mjs)):(\d+)(?:-(\d+))?/g

/**
 * 判定 token 是否「像代码符号」：首字符字母/_/$，且含大写字母/下划线/点/$ 之一。
 * 纯小写英文单词（local/platform/abort）→ false（自然语言，跳过断言防误报）。
 */
function looksLikeCodeSymbol(token) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(token)) return false
  return /[A-Z_$.]/.test(token)
}

/** 递归收集 dir 下与 baseName 同名的文件（相对 dir 的路径数组） */
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
function resolveCandidates(refFile) {
  if (refFile.includes('/')) {
    const direct = join(REPO_ROOT, refFile)
    if (existsSync(direct)) return [direct]
    const inSrc = join(REPO_ROOT, 'src', refFile)
    if (existsSync(inSrc)) return [inSrc]
    // 裸中缀：src/ 树内路径以 /refFile 结尾（如 backends/sillyhub-mcp.js → src/dispatch/backends/...）
    const slash = refFile.lastIndexOf('/')
    const baseName = slash === -1 ? refFile : refFile.slice(slash + 1)
    return findInTree(join(REPO_ROOT, 'src'), baseName)
      .filter((rel) => ('src/' + rel).endsWith('/' + refFile) || 'src/' + rel === 'src/' + refFile)
      .map((rel) => join(REPO_ROOT, 'src', rel))
  }
  // 裸文件名：src/ 全树递归（排除 node_modules/.git）
  return findInTree(join(REPO_ROOT, 'src'), refFile).map((rel) => join(REPO_ROOT, 'src', rel))
}

/** 读文件行数组（CRLF/LF 归一：split(/\r?\n/)，不污染原文判定——层2 只做子串查找） */
function readLines(absPath) {
  try { return readFileSync(absPath, 'utf8').split(/\r?\n/) } catch { return null }
}

/** 层2：收集引用所在文档行内（同行，防表格相邻单元格/相邻行 token 污染——首跑实证）
 * 所有反引号 token 中的代码符号。表格行常含多个 token（方法名/tool 名），放宽为多候选，
 * 断言时任一 token 命中即通过（检测力不损：真漂移时整行 token 都不会出现在目标行附近）。
 * token 归一（首跑实证两类）：①剥函数括号——`getDispatchMode()` 带括号过不了符号正则；
 * ②点分名拆段——`syncMod.checkApproval` 整体子串在源码不出现（源码是裸 checkApproval），
 * 拆段后任一段命中即过；纯小写段（console/warn）不滤除整体。
 * 空数组 = 纯位置引用，跳过层2。 */
function extractExpectedTokens(md, matchStart, matchEnd) {
  const lineStart = md.lastIndexOf('\n', matchStart) + 1
  let lineEnd = md.indexOf('\n', matchEnd)
  if (lineEnd === -1) lineEnd = md.length
  const line = md.slice(lineStart, lineEnd)
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

let totalRefs = 0
let kwChecked = 0
const failures = []

for (const docRel of DOCS) {
  const docAbs = join(REPO_ROOT, docRel)
  if (!existsSync(docAbs)) {
    console.error(`❌ doc-ref-check: 白名单文档不存在：${docRel}`)
    process.exit(1)
  }
  const md = readFileSync(docAbs, 'utf8')
  const mdLines = md.split(/\r?\n/)

  REF_RE.lastIndex = 0
  let m
  while ((m = REF_RE.exec(md)) !== null) {
    const [, refFile, startStr, endStr] = m
    const start = parseInt(startStr, 10)
    const end = endStr !== undefined ? parseInt(endStr, 10) : start
    const docLine = md.slice(0, m.index).split(/\r?\n/).length
    totalRefs++

    // ── 候选解析 ──
    const candidates = resolveCandidates(refFile)
    if (candidates.length === 0) {
      failures.push(`[${docRel}:L${docLine}] ${m[0]} → 文件不存在（含 / 按仓库根解析；裸文件名在 src/ 递归）`)
      continue
    }

    // ── 多候选宽容策略：逐候选跑层1+层2，任一全过即通过 ──
    const candidateFails = []
    let passedAny = false
    const tokens = extractExpectedTokens(md, m.index, m.index + m[0].length)
    for (const candAbs of candidates) {
      const fails = []
      const lines = readLines(candAbs)
      if (lines === null) { fails.push('读取失败'); candidateFails.push(`${candAbs}: 读取失败`); continue }
      // 层1 存在性（文件已确认存在，这里查行号边界）
      if (start < 1 || start > lines.length) fails.push(`行号超界（start=${start} > 总行数 ${lines.length}）`)
      if (end < start || end > lines.length) fails.push(`范围 end=${end} 超界（总行数 ${lines.length}）`)
      // 层2 关键词断言（token 为代码符号才触发；多 token 任一命中即通过）。
      // 窗口（实现期从 ±1 放宽，design.md 已同步）：[start-1, end+5]——文档行号常指向
      // 函数/块起始行而 token 在块体内几行后（实证：shared.js:331→triggerSync 在 333、
      // doctor-diagnostics.js:38→POINTER_STATUS 在 40+）；+5 覆盖函数头+体首几行，
      // 真漂移（大段移动）仍全 token miss。
      let kwOk = true
      if (tokens.length > 0) {
        const from = Math.max(0, start - 2)
        const to = Math.min(lines.length, end + 5)
        const window = lines.slice(from, to).join('\n')
        kwOk = tokens.some((t) => window.includes(t))
      }
      if (fails.length === 0 && kwOk) { passedAny = true; break }
      const reasons = [...fails]
      if (!kwOk) reasons.push(`关键词缺失：期望任一「${tokens.join(' / ')}」在 L${start}±1 行内`)
      candidateFails.push(`${candAbs.replace(REPO_ROOT + '/', '')}: ${reasons.join('；')}`)
    }
    if (tokens.length > 0) kwChecked++
    if (!passedAny) {
      const detail = candidateFails.length > 1
        ? `多候选全失败 →\n     ${candidateFails.join('\n     ')}`
        : candidateFails[0]
      // 附实际行内容摘要（取首个候选 start 行），便于修文档
      let ctx = ''
      const firstLines = readLines(candidates[0])
      if (firstLines && start >= 1 && start <= firstLines.length) {
        ctx = `（实际 L${start}：${firstLines[start - 1].slice(0, 80)}）`
      }
      failures.push(`[${docRel}:L${docLine}] ${m[0]} → ${detail} ${ctx}`)
    }
  }
}

if (failures.length > 0) {
  console.error(`\n❌ doc-ref-check: ${failures.length}/${totalRefs} 处引用失效：`)
  for (const f of failures) console.error(`  ❌ ${f}`)
  console.error(`\n修复指引：行号漂移 → 更新文档行号到当前源码；文件删改名 → 更新引用路径；`)
  console.error(`关键词缺失但行号正确 → 确认符号是否改名，改文档 token 或行号。`)
  process.exit(1)
}

console.log(`✅ doc-ref-check: ${DOCS.length} 份文档 ${totalRefs} 处引用全通过（其中 ${kwChecked} 处带关键词断言）`)
