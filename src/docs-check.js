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
 * 校验链路只读（不修改任何被校验文件）；applyFixes 是唯一写回面（--fix 显式触发，design §9：
 * 文档非多进程竞争的运行时文件，普通 writeFileSync）；纯 Node 内置模块零依赖（D-008：glob 手写 walker，
 * 仅「目录递归」「目录单层」「字面路径」三形态）；Windows 路径归一化；兼容 CRLF/LF。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import jsYaml from 'js-yaml'
import { parseModuleMapSimple } from './modules.js'

/** 提取 file.js:line / file.js:start-end 引用（.js/.mjs，反引号包裹与裸文本均命中，全文扫描 D-006）。
 * repo:// 前缀（2026-08-20）：跨仓引用显式标记——`repo://<仓库名>/<路径>.js:行`。
 * 不同设备兄弟仓库位置不同，未配映射时默认跳过本地校验（防跨设备误报）；
 * 在本机 .sillyspec/local.yaml 的 docs-check.cross_repo_roots 配
 * `<仓库名>: <本机绝对路径>` 后，走与本地引用完全相同的层1（行号边界）+ 层2（关键词窗口）校验。
 * 正则组：1=仓库名（可选），2=文件，3=start，4=end。 */
const REF_RE = /(?:repo:\/\/([A-Za-z0-9_.\-]+)\/)?([A-Za-z0-9_.\-\/]+\.(?:js|mjs)):(\d+)(?:-(\d+))?/g

/** 缺省扫描范围：docs/ + .sillyspec/docs/（scan/modules 产物同是文档，失效即该暴露；2026-08-16 用户裁决改缺省，见 doc-consistency-debt.md §八） */
const DEFAULT_DOC_PATHS = ['docs/**/*.md', '.sillyspec/docs/**/*.md']

/**
 * 读 local.yaml 的 docs-check 段（best-effort，绝不抛；缺文件/无段 → 全缺省）。
 * @param {string} projectRoot 源码仓根（local.yaml 在 <root>/.sillyspec/local.yaml）
 * @returns {{ paths?: string[], skip: string[], keywordAssert: boolean, crossRepoRoots: Record<string, string> }}
 */
export function readDocsCheckConfig(projectRoot) {
  const fallback = { paths: null, skip: [], keywordAssert: true, crossRepoRoots: {} }
  try {
    const p = join(projectRoot, '.sillyspec', 'local.yaml')
    if (!existsSync(p)) return fallback
    const doc = jsYaml.load(readFileSync(p, 'utf8'))
    if (!doc || typeof doc !== 'object') return fallback
    const dc = doc['docs-check']
    if (!dc || typeof dc !== 'object') return fallback
    const crr = dc['cross_repo_roots']
    return {
      paths: Array.isArray(dc.paths) ? dc.paths.filter(s => typeof s === 'string') : null,
      skip: Array.isArray(dc.skip) ? dc.skip.filter(s => typeof s === 'string') : [],
      keywordAssert: typeof dc.keywordAssert === 'boolean' ? dc.keywordAssert : true,
      // repo://<name> → 本机仓库根（每台设备各自配；local.yaml 是 gitignored，绝对路径不入库）
      crossRepoRoots: crr && typeof crr === 'object' && !Array.isArray(crr)
        ? Object.fromEntries(
            Object.entries(crr).filter(([, v]) => typeof v === 'string' && v.trim() !== ''),
          )
        : {},
    }
  } catch {
    return fallback
  }
}

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
  // 行号单遍计算：regex match 天然按 index 升序，游标只前进——原逐引用
  // slice(0,m.index).split() 是 O(引用数 × 文档长度)，长文档×多引用退化明显
  let line = 1
  let cursor = 0
  let m
  while ((m = re.exec(md)) !== null) {
    for (let i = cursor; i < m.index; i++) {
      if (md.charCodeAt(i) === 10) line++ // '\n'（\r\n 也以 \n 计数，1-based 行号不受影响）
    }
    cursor = m.index
    refs.push({
      ref: m[0],
      repo: m[1] !== undefined ? m[1] : null,
      file: m[2],
      start: parseInt(m[3], 10),
      end: m[4] !== undefined ? parseInt(m[4], 10) : parseInt(m[3], 10),
      docLine: line,
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

/** 递归收集 dir 下与 baseName 同名的文件（相对 dir 的 POSIX 路径数组；排除 node_modules/.git）。
 *  treeCache 给定时按 baseName 复用全树扫描结果（N 条裸名引用同一文件免 N 次 walk） */
function findInTree(dir, baseName, rel = '', treeCache = null) {
  if (treeCache && rel === '') {
    const hit = treeCache.get(baseName)
    if (hit) return hit
    const result = findInTree(dir, baseName, '', null)
    treeCache.set(baseName, result)
    return result
  }
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
 * 空数组 = 不存在。treeCache（Map basename→findInTree 结果）给定时透传复用全树扫描。
 */
export function resolveCandidates(projectRoot, refFile, treeCache = null) {
  if (refFile.includes('/')) {
    const direct = join(projectRoot, refFile)
    if (existsSync(direct)) return [direct]
    const inSrc = join(projectRoot, 'src', refFile)
    if (existsSync(inSrc)) return [inSrc]
    const slash = refFile.lastIndexOf('/')
    const baseName = slash === -1 ? refFile : refFile.slice(slash + 1)
    return findInTree(join(projectRoot, 'src'), baseName, '', treeCache)
      .filter((rel) => ('src/' + rel).endsWith('/' + refFile) || 'src/' + rel === 'src/' + refFile)
      .map((rel) => join(projectRoot, 'src', rel))
  }
  return findInTree(join(projectRoot, 'src'), refFile, '', treeCache).map((rel) => join(projectRoot, 'src', rel))
}

/** 读文件行数组（CRLF/LF 归一：split(/\r?\n/)，层2 只做子串查找不污染原文）。
 *  linesCache 给定时按绝对路径复用（同文件被 N 条引用消费免 N 次读盘+split） */
function readLines(absPath, linesCache = null) {
  if (linesCache) {
    if (linesCache.has(absPath)) return linesCache.get(absPath)
    const lines = readLines(absPath)
    linesCache.set(absPath, lines)
    return lines
  }
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
  // 形态 0：**/*.ext（根级递归，无 base 前缀——B11b：原被形态 2 误解析为字面目录 `**` 静默 0 命中）
  let m0 = norm(pattern).match(/^\*\*\/\*(\.[A-Za-z0-9]+)$/)
  if (m0) {
    const [, ext] = m0
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
    rec(projectRoot, '', 0)
    return out
  }
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
    const abs = join(projectRoot, pattern)
    if (!existsSync(abs)) return []
    // B11b：目录字面量抛配置错误（原直传 readFileSync 撞 EISDIR 裸崩 exit 1；契约应 exit 2）
    if (statSync(abs).isDirectory()) {
      throw new DocsCheckConfigError(`路径是目录不是文档：${pattern}（文档路径应为 .md 文件或 glob 形态 **/*.ext / dir/**/*.ext / dir/*.ext）`)
    }
    return [norm(pattern)]
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
 * @param {{ projectRoot: string, docs?: string[], paths?: string[], skip?: string[], keywordAssert?: boolean, crossRepoRoots?: Record<string, string> }} opts
 *   projectRoot 源码仓根（候选解析与 glob 的锚点，平台模式也传源码仓根）
 *   docs 显式文档相对路径列表（优先于 paths glob 展开结果）
 *   crossRepoRoots repo://<仓库名> → 本机仓库根映射（未映射的跨仓引用跳过不计失效）
 * @returns {{ ok: boolean, total: number, invalid: Array<{doc, docLine, ref, reason, suggest?: number[], fix: {fixable: boolean, newLine?: number, reason: string}}>, warnings: string[], kwChecked: number, crossRepoSkipped: number }}
 * @throws {DocsCheckConfigError} glob 形态不支持
 */
export function runDocsCheck(opts) {
  // paths/docs 显式传 null（readDocsCheckConfig 无 local.yaml 段时的回退值）须落回缺省 glob，
  // 解构默认值只挡 undefined 不挡 null——docs-check 无配置裸跑曾因此 null.flatMap 崩溃。
  const {
    projectRoot, docs = null, paths: rawPaths = DEFAULT_DOC_PATHS, skip = [],
    keywordAssert = true, crossRepoRoots = {},
  } = opts || {}
  const paths = Array.isArray(rawPaths) && rawPaths.length > 0 ? rawPaths : DEFAULT_DOC_PATHS
  const warnings = []
  if (keywordAssert === false) warnings.push('关键词断言已关闭（keywordAssert=false），仅做存在性校验')
  const docFiles = docs && docs.length > 0
    ? docs
    : [...new Set(paths.flatMap((p) => walkGlob(projectRoot, p, skip)))].sort()

  const invalid = []
  let total = 0
  let kwChecked = 0
  // repo:// 跨仓引用：未配映射被跳过的数量（不计入 total/invalid，跨设备零误报）
  let crossRepoSkipped = 0
  // per-call 缓存：裸名引用的 src/ 全树扫描结果 + 候选文件行数组——100 文档 × 10 裸名引用
  // 此前 = 1000 次全树 walk + 同文件 N 次重读（2026-08-21 性能审查 PERF-5）。仅本次调用
  // 生命周期内有效，不跨调用（防测试流程中途改树后读到陈旧结果）
  const treeCache = new Map()
  const linesCache = new Map()

  for (const docRel of docFiles) {
    const docAbs = join(projectRoot, docRel)
    if (!existsSync(docAbs)) {
      invalid.push({
        doc: docRel, docLine: 0, ref: '', reason: '文档不存在',
        fix: { fixable: false, reason: '文档不存在，无法自动定位' },
      })
      continue
    }
    const md = readFileSync(docAbs, 'utf8')
    const refs = collectDocRefs(md)
    const mdLines = md.split(/\r?\n/)

    for (const r of refs) {
      // repo:// 跨仓引用：未配映射 → 跳过（不同设备仓库位置不同，不按本仓解析误报）；
      // 配了映射 → 以映射根为唯一候选，走与本地引用相同的层1+层2 校验。
      let candidates
      if (r.repo) {
        const repoRoot = crossRepoRoots && typeof crossRepoRoots[r.repo] === 'string'
          ? crossRepoRoots[r.repo]
          : null
        if (!repoRoot) {
          crossRepoSkipped++
          continue
        }
        const abs = join(repoRoot, r.file)
        if (!existsSync(abs)) {
          total++
          invalid.push({
            doc: docRel, docLine: r.docLine, ref: r.ref,
            reason: `跨仓 repo://${r.repo} → 文件不存在（cross_repo_roots 映射根：${repoRoot}）`,
            fix: { fixable: false, reason: '跨仓引用无法自动定位' },
          })
          continue
        }
        candidates = [abs]
      } else {
        candidates = resolveCandidates(projectRoot, r.file, treeCache)
      }
      total++
      if (candidates.length === 0) {
        invalid.push({
          doc: docRel, docLine: r.docLine, ref: r.ref,
          reason: '文件不存在（含 / 按仓库根解析；裸文件名在 src/ 递归）',
          fix: { fixable: false, reason: '文件不存在，无法自动定位' },
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
        const lines = readLines(candAbs, linesCache)
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
        // 跨仓校验失败的 reason 加 repo:// 前缀，用户一眼区分「改外部仓引用」还是「改本仓引用」
        const repoPrefix = r.repo ? `跨仓 repo://${r.repo} → ` : ''
        invalid.push({
          doc: docRel, docLine: r.docLine, ref: r.ref,
          reason: repoPrefix + (candidateFails.length > 1 ? `多候选全失败 → ${candidateFails.join(' | ')}` : candidateFails[0]),
          // 建议行号（--suggest）：token 在首个候选文件的全量命中行，供人工确认改锚——不自动改文件
          suggest: suggestLines(candidates, tokens, linesCache),
          // 修复分类（--fix 判定依据）：全量候选 token 命中打分——唯一命中或选优严格领先可自动重锚
          fix: classifyFix(candidates, tokens, r.start, linesCache),
        })
      }
    }
  }

  return { ok: invalid.length === 0, total, invalid, warnings, kwChecked, crossRepoSkipped }
}

/**
 * 建议行号计算（--suggest）：对失效引用，在候选文件里找 token 全量命中行。
 * 无 token（纯行号断言）时返回空数组——没有符号线索无法定位，只能人工看。
 */
function suggestLines(candidates, tokens, linesCache = null) {
  if (tokens.length === 0) return []
  try {
    const lines = readLines(candidates[0], linesCache)
    if (lines === null) return []
    const out = []
    lines.forEach((l, i) => { if (tokens.some((t) => l.includes(t))) out.push(i + 1) })
    return out.slice(0, 8)
  } catch { return [] }
}

/**
 * 修复分类（--fix 判定依据）：对 resolveCandidates 全量候选跑 token 命中统计，跨候选合并行号后——
 *   唯一命中 → fixable=true + newLine（自动重锚唯一解）；
 *   多命中 → 打分选优（2026-08-21 docs-ref-auto-pick，替代 D-006 一律人工）：top1 严格优于
 *   top2（分数差 > 0）自动重锚，同分仍人工。实证：一次大改 34 处漂移只有 2 处唯一命中，
 *   32 处人工逐个挑——多命中不代表歧义，行号漂移多为单次编辑的单调位移。
 * 打分信号（全部来自现有数据，不新增 IO）：
 *   - 距离：|命中行 - 文档旧行号|（权重封顶 400）——最近的命中大概率是原锚点漂移后的位置
 *   - 定义行模式 +50：function/const/let/class/def/export 关键词**紧跟** token（引用锚通常指
 *     定义起始行而非调用点；「keyword 后 60 字符内出现」的宽松口径会把调用点误判为定义）
 *   - 注释行 -30（// * # -- 开头）
 *   - 含最长 token（点分整串）+10，优于只含拆段
 * 与 suggestLines 的差异：suggest 只查首个候选（candidates[0]），本函数查全量候选（design §12 自审存疑 +
 * R-01——多候选同名文件场景下防止定位到另一文件的同名符号）。合并口径按「去重后的行号集合」：
 * 重锚写回的目标是行号，多个候选命中同一行号仍是唯一改写目标。
 * 纯增量分类，不参与层1/层2 判定（D-004 兼容红线）。
 * @param {string[]} candidates resolveCandidates 返回的全量候选绝对路径
 * @param {string[]} tokens 层2 提取的期望 token（keywordAssert=false 时为空数组）
 * @param {number|null} [refStart] 文档引用的旧行号（打分用距离信号；范围引用取 start）
 * @returns {{ fixable: boolean, newLine?: number, reason: string }}
 */
function escapeReLocal(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function classifyFix(candidates, tokens, refStart = null, linesCache = null) {
  if (tokens.length === 0) {
    return { fixable: false, reason: '无 token 符号线索（纯位置引用或关键词断言关闭），无法自动定位' }
  }
  const longest = tokens.reduce((a, b) => (b.length > a.length ? b : a), '')
  const defToken = longest.includes('.') ? longest.split('.').pop() : longest
  const defRe = new RegExp(`(?:export\\s+)?(?:async\\s+)?(?:function|const|let|class|def)\\s+${escapeReLocal(defToken)}\\b`)
  const byLine = new Map()
  for (const candAbs of candidates) {
    const lines = readLines(candAbs, linesCache)
    if (lines === null) continue
    lines.forEach((l, i) => {
      if (!tokens.some((t) => l.includes(t))) return
      const lineNo = i + 1
      let score = 0
      if (/^(\/\/|\*|#|--)/.test(l.trim())) score -= 30
      if (defRe.test(l)) score += 50
      if (l.includes(longest)) score += 10
      if (refStart != null && Number.isFinite(refStart)) score -= Math.min(Math.abs(lineNo - refStart), 400)
      // 同一行跨候选取最高分（合并口径不变：重锚目标是行号）
      if (score > (byLine.get(lineNo) ?? -Infinity)) byLine.set(lineNo, score)
    })
  }
  if (byLine.size === 0) {
    return { fixable: false, reason: 'token 在全量候选文件零命中，无法自动定位' }
  }
  if (byLine.size === 1) {
    return { fixable: true, newLine: [...byLine.keys()][0], reason: 'token 在全量候选唯一命中，可自动重锚' }
  }
  const ranked = [...byLine.entries()].sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]))
  const [topLine, topScore] = ranked[0]
  const [runLine, runScore] = ranked[1]
  if (topScore > runScore) {
    return {
      fixable: true,
      newLine: topLine,
      reason: `多命中自动选优：picked=${topLine}（${topScore} 分）runnerUp=${runLine}（${runScore} 分，严格落后才自动改）`,
    }
  }
  const shown = ranked.slice(0, 8).map(([l]) => l).join('、') + (ranked.length > 8 ? '…' : '')
  return { fixable: false, reason: `token 多处命中且最优两行同分（候选行号：${shown}），歧义需人工确认（D-006 保守默认）` }
}

/**
 * 将可确定性修复的失效引用写回文档（--fix 消费面，design §7 接口逐字）。
 * 纯机械定点替换：按 docLine + ref 串在该行内的字符偏移替换为 newRef，不解析行号语义、
 * 不改引用文件名与 token（D-003：ref/newRef 一致性由调用方保证）；候选定位全部依赖调用方
 * 传入（不读 local.yaml 不解析配置）。范围引用（src/a.js:3-8）newRef 同样由调用方给全串。
 * 同一行多个 fix 按行内偏移从后往前（降序）替换，防前序替换挤偏后序偏移（R-04）；
 * 其余字节不动：行内容只动命中片段，行结束符按原文（\r\n / \n 整文件统一口径）原样 join（R-05）。
 * @param {string} projectRoot 源码仓根（doc 相对路径的锚点）
 * @param {Array<{doc: string, docLine: number, ref: string, newRef: string}>} fixes
 *   doc 为相对 projectRoot 的文档路径；ref 旧引用串（如 src/a.js:6），newRef 新引用串（如 src/a.js:1）
 * @param {{dryRun?: boolean}} opts dryRun 为真时不写盘仅返回将应用列表
 * @returns {{applied: number, skipped: Array<{ref: string, reason: string}>}}
 *   dryRun 时 applied 为「将应用」计数；skipped 条目含 ref 与可读 reason（文档不存在/docLine 越界/
 *   行内找不到 ref 串），跳过不中断批量
 */
export function applyFixes(projectRoot, fixes, opts = {}) {
  const dryRun = opts.dryRun === true
  let applied = 0
  const skipped = []
  if (!Array.isArray(fixes) || fixes.length === 0) return { applied, skipped }

  // 按 doc 分组，每文档一次读改写（design §9：普通 writeFileSync，文档非运行时竞争文件）
  const byDoc = new Map()
  for (const f of fixes) {
    if (!f || typeof f !== 'object' || typeof f.doc !== 'string' || typeof f.docLine !== 'number' ||
      typeof f.ref !== 'string' || typeof f.newRef !== 'string') {
      skipped.push({ ref: f && typeof f.ref === 'string' ? f.ref : '(条目缺失)', reason: 'fix 条目字段不完整（doc/docLine/ref/newRef）' })
      continue
    }
    if (!byDoc.has(f.doc)) byDoc.set(f.doc, [])
    byDoc.get(f.doc).push(f)
  }

  for (const [docRel, docFixes] of byDoc) {
    const docAbs = join(projectRoot, docRel)
    if (!existsSync(docAbs)) {
      for (const f of docFixes) skipped.push({ ref: f.ref, reason: `文档不存在：${docRel}` })
      continue
    }
    const raw = readFileSync(docAbs, 'utf8')
    // 行结束符检测整文件统一口径（R-05）：原文含 \r\n 则 CRLF join，否则 LF——与 readLines 归一逻辑一致
    const eol = raw.includes('\r\n') ? '\r\n' : '\n'
    const lines = raw.split(/\r?\n/)
    let dirty = false

    // 同一 docLine 的多 fix 按行内偏移从后往前替换（R-04）：先按 docLine 分组，
    // 组内按 ref 在该行内的命中偏移降序逐个定点替换
    const byLine = new Map()
    for (const f of docFixes) {
      if (!byLine.has(f.docLine)) byLine.set(f.docLine, [])
      byLine.get(f.docLine).push(f)
    }
    for (const [docLine, lineFixes] of byLine) {
      if (!Number.isInteger(docLine) || docLine < 1 || docLine > lines.length) {
        for (const f of lineFixes) skipped.push({ ref: f.ref, reason: `docLine=${docLine} 越界（文档共 ${lines.length} 行）` })
        continue
      }
      const li = docLine - 1
      const located = []
      let cursor = 0
      for (const f of lineFixes) {
        // 找不到 ref 串、或两次命中同一偏移（重复 fix），该条目跳过不中断批量
        const at = lines[li].indexOf(f.ref, cursor)
        if (at === -1) {
          skipped.push({ ref: f.ref, reason: `docLine=${docLine} 行内未找到引用串` })
        } else {
          located.push({ at, f })
          cursor = at + f.ref.length
        }
      }
      located.sort((a, b) => b.at - a.at) // 降序：后位先替换，前序替换不挤偏后序偏移
      let line = lines[li]
      for (const { at, f } of located) {
        line = line.slice(0, at) + f.newRef + line.slice(at + f.ref.length)
        applied++
      }
      if (located.length > 0) {
        lines[li] = line
        dirty = true
      }
    }

    if (dirty && !dryRun) writeFileSync(docAbs, lines.join(eol))
  }

  return { applied, skipped }
}

// ---------------------------------------------------------------------------
// 决策规则族（advisory，change: 2026-08-23-adopt-harness-practices task-05，FR-06 / D-003@v1）
//
// 校验对象：knowledge/decisions/<模块域>.md 的 D-xxx@vN 条目（producer = decision-distill
// 归档提炼，条目字段行 状态/锚点/最近确认 是本处的机械解析契约）。两项规则：
//   1) 锚点校验：implemented 条目「锚点：src/…」路径存在性（锚点：未记录 → 补录提示，非失效）；
//   2) behind 复核：锚定模块源码在「最近确认」commit 后的前进数超阈值 → 决策待复核提示
//      （computeModuleBehind 复用 docs-debt 既有 git 口径，C-10）。
// 铁律（docs-consistency 模块卡）：advisory 只 warn 不进 runDocsCheck 的 invalid 阻断链——
// ok/invalid 判定与 docs gate 阻断行为不受影响；校验链路只读零写盘；无 decisions 库 /
// 无超阈 → findings 空（无信号零输出）。豁免走 known_failures 新键 decisions.* 命名空间
// （C-17：条目级语义键匹配，不复用 docs-gate 的 baseline ratchet）。
// ---------------------------------------------------------------------------

/** behind 复核缺省阈值（local.yaml decisions.behind_threshold 可调；schema 注册归 task-11，
 *  本处读键按「存在则读、不存在用缺省」容错，不依赖 schema 注册）。dogfood 校准前取 10。 */
export const DECISIONS_DEFAULT_BEHIND_THRESHOLD = 10

/**
 * known_failures 键提取——读法逐字对齐 verify-postcheck.extractKnownFailures（块式 + 流式，
 * 剥引号/行内注释，CRLF 归一；注释互指防两处口径漂移）。此处独立复刻不 import
 * verify-postcheck（重模块静态依赖；本模块仅消费 decisions.* 前缀键，见 isDecisionExempt）。
 * @param {string} yamlText local.yaml 全文
 * @returns {string[]} 键列表；无声明返回 []
 */
function extractKnownFailureKeys(yamlText) {
  if (!yamlText) return []
  const yaml = String(yamlText).replace(/\r\n?/g, '\n')
  const inline = yaml.match(/^known_failures:\s*\[([^\]]*)\]\s*(?:#.*)?$/m)
  if (inline) {
    return inline[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  }
  const block = yaml.match(/^known_failures:\s*\n((?:[ \t]+-[ \t].+\n?)+)/m)
  if (block) {
    return (block[1].match(/^[ \t]+-[ \t]+(.+)/gm) || [])
      .map(s => s.replace(/^[ \t]+-[ \t]+/, '').trim().replace(/^['"]|['"]$/g, '').replace(/#.*$/, '').trim())
      .filter(Boolean)
  }
  return []
}

/**
 * 读 local.yaml 的决策规则配置（best-effort 绝不抛；读取模式与 readDocsCheckConfig 一致：
 * 缺文件/无段 → 全缺省）。decisions.behind_threshold 存在则读（数值校验），不存在用缺省 10
 * ——schema 注册（config-schema.js）归 task-11，本处不依赖。
 * @param {string} projectRoot 源码仓根（local.yaml 在 <root>/.sillyspec/local.yaml）
 * @returns {{ behindThreshold: number, knownFailures: string[] }}
 */
export function readDecisionRulesConfig(projectRoot) {
  const fallback = { behindThreshold: DECISIONS_DEFAULT_BEHIND_THRESHOLD, knownFailures: [] }
  try {
    const p = join(projectRoot, '.sillyspec', 'local.yaml')
    if (!existsSync(p)) return fallback
    const raw = readFileSync(p, 'utf8')
    const knownFailures = extractKnownFailureKeys(raw)
    const doc = jsYaml.load(raw)
    if (!doc || typeof doc !== 'object') return { ...fallback, knownFailures }
    const d = doc['decisions']
    if (!d || typeof d !== 'object' || Array.isArray(d)) return { ...fallback, knownFailures }
    const t = d['behind_threshold']
    return {
      behindThreshold: typeof t === 'number' && Number.isFinite(t) && t > 0 ? t : fallback.behindThreshold,
      knownFailures,
    }
  } catch {
    return fallback
  }
}

/** 豁免键匹配（本变更范围先支持键匹配，非子串）：规则级 `decisions.<id>.<kind>` 精确命中，
 *  或条目级 `decisions.<id>` 伞形命中（一条豁免该决策全部规则）。无 decisions. 前缀的键不参与。 */
function isDecisionExempt(knownFailures, entryId, kind) {
  const ruleKey = `decisions.${entryId}.${kind}`
  const entryKey = `decisions.${entryId}`
  return knownFailures.some(k => k === ruleKey || k === entryKey)
}

/**
 * 纯函数：解析 knowledge/decisions/<域>.md 的 D-xxx@vN 条目（与 decision-distill.renderBlockLines
 * 的写入契约对偶：producer=decision-distill → consumer=本规则族；字段行非列表项，顶层
 * 「状态：/锚点：/最近确认：」标签精确匹配，防误吞正文）。旧格式字段缺失容错为 null。
 * @param {string} md 域文件全文
 * @returns {Array<{ id: string, title: string, status: string|null, anchor: string|null, lastConfirmed: string|null }>}
 */
export function parseDecisionEntries(md) {
  const entries = []
  let cur = null
  const flush = () => { if (cur) entries.push(cur) }
  for (const line of String(md || '').replace(/\r\n?/g, '\n').split('\n')) {
    const h = line.match(/^##\s+(D-\d+)(?:@v(\d+))?\s*(.*)$/)
    if (h) {
      flush()
      const version = h[2] ? parseInt(h[2], 10) : 1
      cur = { id: `${h[1]}@v${version}`, title: h[3].trim(), status: null, anchor: null, lastConfirmed: null }
      continue
    }
    if (!cur) continue
    const f = line.match(/^(状态|锚点|最近确认)\s*[：:]\s*(.*)$/)
    if (!f) continue
    if (f[1] === '状态') cur.status = f[2].trim().split(/[\s（(]/)[0] || null
    else if (f[1] === '锚点') cur.anchor = f[2].trim()
    else cur.lastConfirmed = f[2].trim()
  }
  flush()
  return entries
}

/** 锚点值 → 源码路径：剥「:行号 / :行号-行号 / :符号」后缀（锚点契约 `<src 路径>:<行号或符号>`；
 *  旧条目可能只写路径）。「未记录」/空 → null（补录提示路径，非失效）。 */
function anchorFilePath(anchor) {
  const a = String(anchor || '').trim()
  if (!a || a === '未记录') return null
  return a.replace(/:(?:\d+(?:-\d+)?|[A-Za-z_$][A-Za-z0-9_$]*)$/, '').replace(/\\/g, '/') || null
}

/** specBase/docs 下任一项目的 modules/_module-map.yaml 尽力发现（对齐
 *  decision-distill.discoverModuleIndex 口径：首个命中；失败 → null，域模块源码集退化为锚点文件兜底）。 */
function discoverModuleMapIndex(specBase) {
  try {
    const docsDir = join(specBase, 'docs')
    if (!existsSync(docsDir)) return null
    for (const d of readdirSync(docsDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue
      const mapPath = join(docsDir, d.name, 'modules', '_module-map.yaml')
      if (existsSync(mapPath)) return parseModuleMapSimple(readFileSync(mapPath, 'utf8'))
    }
  } catch { /* 尽力而为，失败归 null */ }
  return null
}

/**
 * IO 入口（advisory）：跑一次决策规则族。只产出 findings（warn 语义），不进 runDocsCheck 的
 * invalid 阻断链、不写任何文件——无 decisions 库 / 无信号 → findings 空（零输出）。
 * computeModuleBehind 经动态 import 取自 docs-debt（本模块被 docs-debt 静态 import，静态互引
 * 成 ESM 环——对齐 run/shared.js 对 docs-debt 的动态 import 先例）。
 * @param {{ projectRoot: string, specBase?: string, behindThreshold?: number, knownFailures?: string[], moduleIndex?: object|null }} opts
 *   projectRoot 源码仓根（锚点解析与 git 锚）；specBase 缺省 = <projectRoot>/.sillyspec；
 *   behindThreshold / knownFailures 缺省读 local.yaml（decisions.behind_threshold / known_failures）；
 *   moduleIndex 缺省按 specBase/docs 下任一项目的 modules/_module-map.yaml 尽力发现
 * @returns {Promise<{ empty: boolean, domains: number, entries: number, implemented: number,
 *   threshold: number, findings: Array<{ id: string, domain: string, file: string,
 *   kind: 'anchor'|'behind', behind?: number|null, threshold?: number, anchor?: string|null,
 *   message: string }>, exempted: Array<{ key: string, id: string, kind: string }> }>}
 *   empty=true = decisions 库不存在（冷启动，R-02 由 doctor 层提示）；exempted 为经
 *   known_failures decisions.* 键豁免的条目（披露不隐藏）
 */
export async function runDecisionRules(opts) {
  const { projectRoot, specBase, behindThreshold = null, knownFailures = null, moduleIndex = null } = opts || {}
  const emptyResult = (threshold) => ({ empty: true, domains: 0, entries: 0, implemented: 0, threshold, findings: [], exempted: [] })
  if (!projectRoot) return emptyResult(DECISIONS_DEFAULT_BEHIND_THRESHOLD)

  const cfg = readDecisionRulesConfig(projectRoot)
  const threshold = typeof behindThreshold === 'number' && Number.isFinite(behindThreshold) && behindThreshold > 0
    ? behindThreshold
    : cfg.behindThreshold
  const failures = Array.isArray(knownFailures) ? knownFailures : cfg.knownFailures

  const kb = specBase || join(projectRoot, '.sillyspec')
  const decisionsDir = join(kb, 'knowledge', 'decisions')
  let domainFiles = []
  try {
    domainFiles = readdirSync(decisionsDir).filter(f => f.endsWith('.md')).sort()
  } catch {
    return emptyResult(threshold) // 库不存在 → 零信号（doctor 层另行提示空库）
  }

  // 模块域 → 源码路径集（module-map paths∪core_files；未命中 map 的域退化为锚点文件兜底）
  const mapIndex = moduleIndex || discoverModuleMapIndex(kb)
  const flatIndex = mapIndex && mapIndex.modules ? mapIndex.modules : mapIndex
  const { computeModuleBehind } = await import('./docs-debt.js')

  const findings = []
  const exempted = []
  let entriesTotal = 0
  let implementedTotal = 0
  const treeCache = new Map() // resolveCandidates 全树扫描复用（同 docs check 主链路口径）

  const emit = (id, domain, file, kind, extra, message) => {
    if (isDecisionExempt(failures, id, kind)) {
      exempted.push({ key: `decisions.${id}.${kind}`, id, kind })
      return
    }
    findings.push({ id, domain, file, kind, ...extra, message })
  }

  for (const f of domainFiles) {
    const domain = f.replace(/\.md$/, '')
    const rel = `knowledge/decisions/${f}`
    let entries
    try { entries = parseDecisionEntries(readFileSync(join(decisionsDir, f), 'utf8')) } catch { continue }
    for (const e of entries) {
      entriesTotal++
      if ((e.status || '').toLowerCase() !== 'implemented') continue // rejected/未知状态不做锚点与 behind 校验
      implementedTotal++
      const anchorPath = anchorFilePath(e.anchor)
      // 规则 1：锚点存在性（未记录 → 补录提示；路径不存在 → 失效提示）
      if (!anchorPath) {
        emit(e.id, domain, rel, 'anchor', { anchor: e.anchor || null },
          `「${e.id}」锚点未记录（${rel}）——旧格式条目，补「锚点：src/…」后可机械校验（advisory）`)
      } else if (resolveCandidates(projectRoot, anchorPath, treeCache).length === 0) {
        emit(e.id, domain, rel, 'anchor', { anchor: e.anchor },
          `「${e.id}」锚点文件不存在：${anchorPath}（${rel}）——决策落点已漂移，人工复核（advisory）`)
      }
      // 规则 2：behind 复核（「最近确认」后锚定模块源码前进数超阈值 → 决策待复核；
      // 「最近确认」未记录/域无源码集（无 map 无锚点）→ 无法计算，静默跳过——advisory 不产噪声）
      if (!e.lastConfirmed || !/^[0-9a-f]{4,40}$/i.test(e.lastConfirmed)) continue
      let srcPaths = null
      const m = flatIndex && typeof flatIndex === 'object' ? flatIndex[domain] : null
      if (m) srcPaths = [...(Array.isArray(m.paths) ? m.paths : []), ...(Array.isArray(m.core_files) ? m.core_files : [])]
      if ((!srcPaths || srcPaths.length === 0) && anchorPath) srcPaths = [anchorPath]
      if (!srcPaths || srcPaths.length === 0) continue
      const { behind } = computeModuleBehind(domain, e.lastConfirmed, { projectRoot, srcPaths })
      if (behind !== null && behind > threshold) {
        emit(e.id, domain, rel, 'behind', { behind, threshold },
          `「${e.id}」决策待复核：锚定模块 ${domain} 在最近确认 ${e.lastConfirmed} 后源码已前进 ${behind} commit，超阈值 ${threshold}（${rel}）——复核后更新「最近确认」`)
      }
    }
  }

  findings.sort((a, b) => a.file.localeCompare(b.file) || a.id.localeCompare(b.id))
  exempted.sort((a, b) => a.key.localeCompare(b.key))
  return { empty: false, domains: domainFiles.length, entries: entriesTotal, implemented: implementedTotal, threshold, findings, exempted }
}
