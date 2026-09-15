/**
 * verify-probes.js — `sillyspec verify-probes` 的机械探针实现 + verify-result.md 骨架生成
 * （2026-08-21 agent-手工产出审计第三批 H1/H3/H5/H7/F9）。
 *
 * verify-probes.md 模板定义六个探针，agent 此前逐条手跑 grep/递归查找/git 对账再手工拼表格。
 * 本模块把纯机械的四个探针命令化（语义判断的留 agent，输出里显式标注）：
 *   探针1 未实现标记扫描：design §6 清单的具体文件逐行 grep TODO/FIXME/尚未实现 等
 *   探针3 测试覆盖：逐 task 按 allowed_paths 定位模块目录，递归找测试文件（co-located tests/ 陷阱
 *        + JVM src/test/<lang> 同包镜像根——Maven/Gradle 布局测试与 main 侧永不 co-located）
 *   探针5 API 契约对账：复用 contract-matrix.verifyApiParity（endpoints.json × 前端调用）+ 表格渲染
 *   探针6 删除对账：git diff --name-status HEAD 的 D/R × design 声明操作三态判定
 *   探针7 验收×测试覆盖矩阵：task 卡 acceptance 自解析（jsYaml，string/array 双形态）+ 双源结构
 *        归属（allowed_paths 测试模式 ∪ execute-runs review.json changedFiles test/ 前缀）+
 *        关键词命中提示（命中≠判定，不参与门禁；2026-09-14-acceptance-test-matrix）
 * 探针2（关键词提取半语义）/探针3.4 集成盲区/3.5 断言抽查/探针4（决策追踪语义）留 agent。
 *
 * verify-result.md 骨架：七章节固定结构 + 探针结果机械预填 + 其余章节 <!--TODO--> 占位。
 * 结论走「结论枚举：」固定槽行（刀③）——占位符不含枚举词，槽未填 extractVerifyConclusionSlot
 * 返回 '' 即判不过，骨架不能直接过门（与 symbol-impact 骨架同款防偷懒语义）。
 * P3b 增量：①章节标题行末尾 claims 层标注（可复跑探针/确定性检查/人工判断，纯后缀不新增行）；
 * ②--init 同步落盘 verify-facts.json 机器底稿（探针命令行 + 首跑关键指标 + 时间戳，CLI 全权写，
 * 供事后独立复跑审计；重复 --init 覆盖为最近一次 init 快照）。
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join, dirname, basename } from 'path'
import jsYaml from 'js-yaml'
import { gitQuiet } from './git-helper.js'
import {
  FACTS_SCHEMA_VERSION, EVIDENCE_SLOT_HEADING, RECEIPT_SLOT_HEADING, parseEvidenceSlots,
} from './verify-facts-schema.js'
import { parseFileChangeListDetailed } from './change-list.js'
import { parseDecisions } from './decision-distill.js'
import { parseAllowedPaths, parseRepo } from './stages/plan-postcheck.js'
import { verifyApiParity, _readWorktreeMeta } from './contract-matrix.js'
import { splitOwnVsForeignDiffFiles } from './foreign-declared.js'
import { resolveSpecDir, resolveRuntimeRoot, detectWorktreeSpecDrift } from './run/shared.js'

// 探针1 未实现标记匹配（坑 probe1-literal-false-positive，2026-09-15 复盘实证：16 命中全
// 字面误报——TODO_FLAG_TODO 业务常量、「XXX完成处置」中文占位模板）。口径分三级：
// - 尚未实现：中文短语高置信，保持子串匹配；
// - TODO/FIXME/HACK：ASCII 标识符边界匹配——TODO_FLAG_TODO / parseHackArgs 等标识符内部不再
//   命中（两侧任一边贴 [A-Za-z0-9_] 即视为标识符成分）；
// - XXX：边界匹配且前或后紧邻 CJK 表意字符即排除——「XXX完成处置」「订单XXX号」类中文占位
//   模板不再命中（独立代码注释 `XXX:` / `// XXX fix` 紧邻标点空白，仍命中）。
const CJK_IDEOGRAPH_CLASS = '\\u4e00-\\u9fff\\u3400-\\u4dbf'
const TODO_ASCII_MARKER_RE = new RegExp(`(^|[^A-Za-z0-9_])(?:TODO|FIXME|HACK)(?![A-Za-z0-9_])`)
const XXX_MARKER_RE = new RegExp(`(^|[^A-Za-z0-9_${CJK_IDEOGRAPH_CLASS}])XXX(?![A-Za-z0-9_${CJK_IDEOGRAPH_CLASS}])`)
export function isUnimplementedMarkerLine(line) {
  if (line.includes('尚未实现')) return true
  if (TODO_ASCII_MARKER_RE.test(line)) return true
  if (XXX_MARKER_RE.test(line)) return true
  return false
}
// 测试文件名判定（坑 probe3-testname-false-positive，2026-09-15 EHS 生产实证：model 目录下
// TestData.java 数据夹具被旧 /test|spec/i 子串命中 → task-01 假绿「找到 1 个测试文件」；
// specification.md / contest.css 同族反向噪音）。三路命中，任一即测试文件：
// - 分隔符分词（按非字母数字切段）含 test/tests/spec/specs —— foo.test.js、test_utils.py、foo-spec.ts
// - 裸词文件名（去扩展名即上述词，大小写归一）—— test.js、Tests.java
// - 驼峰末段后缀 Test/Tests/Spec/Specs/IT（Java/Kotlin 惯例 FooTest/FooIT）——只认末位驼峰段：
//   RpFlowEngineTest 命中；TestData/TestUtil/TestMain（Test 是首段=夹具命名惯势）不命中
// 取向：漏检罕见命名（FooTestCase/TestFoo 前缀式）→ ⚠️ 落 agent 手查（fail-visible 可接受）；
// 假绿掩盖真缺测是 fail-hidden，更糟——宁紧勿松。
const TEST_NAME_TOKENS = new Set(['test', 'tests', 'spec', 'specs'])
const TEST_NAME_SUFFIXES = new Set(['Test', 'Tests', 'Spec', 'Specs', 'IT'])
export function isTestFileName(name) {
  const stem = String(name || '').replace(/\.[^.]+$/, '')
  if (!stem) return false
  if (TEST_NAME_TOKENS.has(stem.toLowerCase())) return true
  const tokens = stem.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  if (tokens.some(t => TEST_NAME_TOKENS.has(t))) return true
  const lastHump = stem.match(/(?:[A-Z][a-z0-9]*|[A-Z]+)$/)
  return !!lastHump && TEST_NAME_SUFFIXES.has(lastHump[0])
}
const PROBE1_MAX_MATCHES = 200

/**
 * verify-probes 的 spec 根解析（含 worktree 副本漂移锚定）。
 *
 * 坑 worktree-spec-artifact-misplace（2026-08-24 用户实证）：在 worktree 内跑
 * `verify-probes --init` 时 spec 根随 cwd 落进 worktree 的 .sillyspec checkout 副本——骨架
 * 写进副本、主仓 verify gate 读不到，副本随 worktree 清理蒸发。与 run/command.js 对
 * plan/execute/verify/archive 的漂移守卫同口径：命中副本自动锚回主仓后继续（不 exit）；
 * 平台模式 / 显式 --spec-dir 已明确指定，不纠正。
 * @param {string} cwd
 * @param {string|null} [specDir] --spec-dir（显式指定则不锚定）
 * @param {string|null} [platformBase] 平台 spec 根（仅 .sillyspec-platform.json pointer 存在时传入；
 *   resolvePlatformSpecDir 无 pointer 时回退本地解析会返回 worktree 副本根，不能当平台根传）
 * @returns {string} spec 根绝对路径（漂移时为主仓）
 */
export function resolveVerifyProbesSpecBase(cwd, specDir = null, platformBase = null) {
  if (platformBase) return platformBase
  const base = resolveSpecDir(cwd, { specDir: specDir || undefined })
  if (specDir) return base
  const wt = detectWorktreeSpecDrift(base)
  if (wt) {
    console.warn(`⚠️ 已自动锚定主仓 spec：${wt.mainSpecBase}（原 cwd 命中 worktree 副本 ${wt.changeName}，verify-probes 产物落主仓，已纠正，流程继续）`)
    return wt.mainSpecBase
  }
  return base
}

function listTaskIds(tasksPath) {
  if (!existsSync(tasksPath)) return []
  const ids = []
  for (const line of readFileSync(tasksPath, 'utf8').split('\n')) {
    const m = line.match(/^[-*]\s*\[[ xX]\]\s*(task-\d+)\b/)
    if (m) ids.push(m[1])
  }
  return ids
}

/** 递归找测试文件（排除 node_modules/.git/dist 等；返回 posix 相对 cwd 路径，封顶展示） */
function findTestFiles(rootDir, cwd, cap = 10) {
  const found = []
  const skip = new Set(['node_modules', '.git', '.gradle', '__pycache__', '.venv', 'dist', 'build', 'target', 'out'])
  const walk = (d) => {
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const full = join(d, e.name)
      if (e.isDirectory()) {
        if (!skip.has(e.name)) walk(full)
      } else if (e.isFile() && isTestFileName(e.name)) {
        found.push(full.split('\\').join('/').replace(cwd.split('\\').join('/').replace(/\/$/, '') + '/', ''))
        if (found.length >= cap) return
      }
    }
  }
  if (existsSync(rootDir)) walk(rootDir)
  return found
}

// ── 探针 7（验收×测试覆盖矩阵，2026-09-14-acceptance-test-matrix FR-01）常量与纯函数 ──
const PROBE7_HEADING = '#### 探针 7：验收×测试覆盖矩阵'
// execute run id 格式（与 task-review.js isValidExecuteRunId 同口径锚定，防提示词注入/路径穿越）
const PROBE7_EXEC_RUN_ID_RE = /^exec-\d{4}-\d{2}-\d{2}-\d{6}(?:-[a-z0-9]{1,8}){0,2}$/
// 关键词提取：≥3 字符标识符（[A-Za-z_][A-Za-z0-9_]{2,}）∪ ≥2 字连续 CJK 片段，按出现顺序交错
const PROBE7_TERM_RE = /[A-Za-z_][A-Za-z0-9_]{2,}|[\u4e00-\u9fff]{2,}/g
const PROBE7_TERM_CAP = 5
// 坑 probe7-prefill-evidence（ql-20260915-004）：无归属时的 non-testable 判别词（机械保守：
// acceptance 文本命中即预填 non-testable，agent 复核可改写）
const PROBE7_NONTESTABLE_RE = /文档|部署|doc|deploy|manual|config/i

/**
 * 解析 task-NN.md frontmatter 的 acceptance（string/array 双形态归一为数组）。
 * 口径锚 src/stages/plan-postcheck.js acceptance best-effort 段（string → 原文单条、array →
 * 逐条）——不 import 它：parseTaskContracts 只返回 provides/expects_from 不含 acceptance。
 * @param {string} content task 卡全文
 * @returns {string[]|null} acceptance 条目数组；null = 无 frontmatter（调用方跳过该卡）；
 *   frontmatter 在场但无 acceptance / 非法 YAML → []（防御行，plan-postcheck 已拦缺失）
 */
export function parseTaskAcceptance(content) {
  const fmMatch = String(content || '').match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) return null
  try {
    const fmObj = jsYaml.load(fmMatch[1]) || {}
    if (typeof fmObj.acceptance === 'string') {
      const t = fmObj.acceptance.trim()
      return t ? [t] : []
    }
    if (Array.isArray(fmObj.acceptance)) {
      return fmObj.acceptance.filter(x => typeof x === 'string' && x.trim() !== '').map(x => x.trim())
    }
  } catch { /* frontmatter 非法 YAML → 防御性空（plan-postcheck 侧已拦） */ }
  return []
}

/**
 * allowed_paths 条目是否测试形态（结构归属面）：test/ 前缀，或文件名含 .test. / _test. / spec
 * 惯例（(?:^|[._-])test(?:[._-]|$) 覆盖 foo.test.mjs / foo_test.js / test-foo.js 三形）。
 * 比探针 3 的存在性面（isTestFileName 文件名形态判定，宽松存在性提示）严格——这是 3/7 口径差异的落点。
 */
function isProbe7TestPath(p) {
  const posix = String(p).split('\\').join('/')
  if (/^test\//.test(posix)) return true
  const name = basename(posix)
  return /(?:^|[._-])test(?:[._-]|$)/i.test(name) || /spec/i.test(name)
}

/**
 * 内联解析当前 execute runId（探针 7 专用——禁静态 import task-review：
 * task-review→verify-postcheck→verify-probes 三步环，先例见 backfillFactsFromMdAndTests
 * 对 stage-contract 的分层注释）。优先读 marker current-execute-run-id-<change>；
 * 读不到/非法则扫描 execute-runs/ 下 mtime 最新的 exec-* 目录兜底；两路皆空 → null
 * （review 源归空集，不报错）。
 * @param {string} runtimeRoot
 * @param {string} changeName
 * @returns {string|null}
 */
function resolveExecuteRunIdInline(runtimeRoot, changeName) {
  try {
    const marker = join(runtimeRoot, `current-execute-run-id-${changeName}`)
    if (existsSync(marker)) {
      const c = readFileSync(marker, 'utf8').trim()
      if (c && PROBE7_EXEC_RUN_ID_RE.test(c)) return c
    }
  } catch { /* marker 读取失败 → 目录扫描兜底 */ }
  try {
    const runsDir = join(runtimeRoot, 'execute-runs')
    if (!existsSync(runsDir)) return null
    const cands = readdirSync(runsDir)
      .filter(n => PROBE7_EXEC_RUN_ID_RE.test(n))
      .map(n => ({ n, p: join(runsDir, n) }))
      .filter(x => { try { return statSync(x.p).isDirectory() } catch { return false } })
      .map(x => { try { return { n: x.n, m: statSync(x.p).mtimeMs } } catch { return { n: x.n, m: 0 } } })
      .sort((a, b) => b.m - a.m)
    return cands.length > 0 ? cands[0].n : null
  } catch {
    return null
  }
}

/**
 * 读当前 runId 下某 task 的 review.json changedFiles 中 test/ 前缀路径（归属第二源）。
 * review.json 读不到 / JSON 非法 / changedFiles 非数组 → 空集不报错（提示面，宁缺毋噪）。
 */
function readReviewChangedTestFiles(runtimeRoot, runId, taskId) {
  try {
    const review = JSON.parse(readFileSync(join(runtimeRoot, 'execute-runs', runId, 'tasks', taskId, 'review.json'), 'utf8'))
    if (!review || !Array.isArray(review.changedFiles)) return []
    return review.changedFiles
      .filter(f => typeof f === 'string')
      .map(f => f.split('\\').join('/'))
      .filter(f => f.startsWith('test/'))
  } catch {
    return []
  }
}

/** acceptance 行关键词提取（标识符 ∪ CJK 片段，去重、按出现顺序，上限 5 词防膨胀） */
function extractAcceptanceTerms(text) {
  const terms = []
  const seen = new Set()
  const re = new RegExp(PROBE7_TERM_RE.source, 'g') // 共享 g 正则有 lastIndex 状态坑，每次新建
  let m
  while ((m = re.exec(String(text || ''))) !== null) {
    if (!seen.has(m[0])) { seen.add(m[0]); terms.push(m[0]) }
    if (terms.length >= PROBE7_TERM_CAP) break
  }
  return terms
}

/**
 * 关键词命中提示：逐 acceptance 条目提取词，在归属测试文件内容里 grep（大小写敏感子串）。
 * 命中≠判定（R-03，不参与门禁）——只有存在命中的条目才进 hints（键 = acceptance 条目下标）。
 * 测试文件读取双根回退（cwd → worktree 根，坑 probe1-worktree-path-blind / probe3 双根同族：
 * apply 前新测试只在 worktree）。读不到的文件计 null 跳过。
 * 坑 probe7-prefill-evidence（ql-20260915-004）：anchors 逐词记录首命中 file:line（grep -n
 * 语义——首个包含该词的测试文件内的首行号），供证据列机械预填；terms/files 键维持旧形态
 * （既有消费方/测试零回归）。
 * @returns {Record<number, {terms: string[], files: string[], anchors: Array<{term: string, file: string, line: number}>}>}
 *   普通对象，可 JSON 序列化
 */
function buildAcceptanceHints(acceptanceItems, testFiles, cwd, wtRoot) {
  const hints = {}
  if (!testFiles || testFiles.length === 0) return hints
  const cache = new Map()
  const readTest = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    let content = null
    const posix = String(rel).split('\\').join('/')
    for (const root of [cwd, wtRoot]) {
      if (!root) continue
      try { content = readFileSync(join(root, posix), 'utf8'); break } catch { /* 换根重试 */ }
    }
    cache.set(rel, content)
    return content
  }
  // 首命中行号（1-based）：indexOf 前缀行计数，CRLF 不影响（按 \n 切）
  const firstHitLine = (content, term) => {
    const idx = content.indexOf(term)
    return idx === -1 ? null : content.slice(0, idx).split('\n').length
  }
  acceptanceItems.forEach((item, idx) => {
    const hitTerms = []
    const hitFiles = new Set()
    const anchors = []
    for (const term of extractAcceptanceTerms(item)) {
      const hits = testFiles.filter(f => { const c = readTest(f); return !!c && c.includes(term) })
      if (hits.length > 0) {
        hitTerms.push(term)
        for (const f of hits) hitFiles.add(f)
        // 首命中文件内的首命中行（单文件 grep -n 首命中即可，机械保守）
        const firstFile = hits[0]
        const line = firstHitLine(readTest(firstFile) || '', term)
        if (line !== null) anchors.push({ term, file: firstFile, line })
      }
    }
    if (hitTerms.length > 0) hints[idx] = { terms: hitTerms, files: [...hitFiles], anchors }
  })
  return hints
}

/** 表格单元格转义：管道转 \|（GFM 行内字面量）、连续空白折叠、超长截断（纯展示层） */
function mdEscapeCell(text, cap = 200) {
  let s = String(text).replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|')
  if (s.length > cap) s = s.slice(0, cap) + '…'
  return s
}

/**
 * 探针 7 判定/证据两列机械预填（坑 probe7-prefill-evidence，ql-20260915-004）。
 *
 * 背景：此前骨架判定列 `<待填：四选一>` + 证据列 `<TODO>` 全占位，24 格矩阵 agent 全量
 * 手填——CLI 已算出归属/关键词命中却弃之不用。预填规则（机械保守，agent 逐格复核改写）：
 *   - 无归属 → uncovered；acceptance 文本含 文档/部署/doc/deploy/manual/config 类词且无归属
 *     → non-testable
 *   - 有归属且命中 ≥1 → covered，证据 = 首命中 `file:line`（term）锚点（≤3 条防膨胀）
 *   - 有归属零命中 → partial，证据 = 无机械命中提示 + 反引号归属文件（满足门禁测试锚点口径）
 *
 * 门禁兼容（stage-contract.js extractAcceptanceMatrixSlots / MATRIX_VERDICT_WHITELIST）：判定列
 * 须为纯枚举（精确 trim 匹配白名单）——行内尾注「（预填，复核后可改）」会破坏枚举解析，故
 * 尾注改置矩阵段头注记；covered/partial 证据须含测试锚点（file:line / 反引号 / .test.），
 * non-testable 证据须非空——预填值均按此口径构造（预填即可过门，复核责任在段头注记明示）。
 * @param {string} item acceptance 条目文本
 * @param {string[]|undefined} testFiles 归属测试文件
 * @param {{terms: string[], files: string[], anchors?: Array<{term: string, file: string, line: number}>}|null} hint
 * @returns {{verdict: string, evidence: string}}
 */
function prefillMatrixCells(item, testFiles, hint) {
  const hasAttribution = Array.isArray(testFiles) && testFiles.length > 0
  if (!hasAttribution) {
    return {
      verdict: PROBE7_NONTESTABLE_RE.test(String(item || '')) ? 'non-testable' : 'uncovered',
      evidence: '（无归属测试）',
    }
  }
  const anchors = (hint && Array.isArray(hint.anchors)) ? hint.anchors : []
  if (anchors.length > 0) {
    const evidence = anchors.slice(0, 3)
      .map(a => `\`${mdEscapeCell(a.file, 120)}:${a.line}\`（${mdEscapeCell(a.term, 40)}）`)
      .join('、')
    return { verdict: 'covered', evidence }
  }
  return {
    verdict: 'partial',
    evidence: `（无机械命中——人工核验 \`${mdEscapeCell(testFiles[0], 120)}\`）`,
  }
}

/**
 * 渲染探针 7 段（骨架与幂等补段共用单一实现）。
 * 坑 probe7-prefill-evidence（ql-20260915-004）：判定/证据两列由 prefillMatrixCells 机械预填
 * （原 `<待填：四选一>` / `<TODO>` 占位淘汰）——幂等保障沿用补段口径：段已在场（agent 已填/
 * 未填）一律不触碰（ensureAcceptanceMatrixSection 段在场即 no-op），预填只在骨架生成与缺段补齐
 * 两条新写路径生效，agent 已填内容永不被覆盖。
 * @param {{ applicable: boolean, tasks: Array<{task: string, acceptance: string[], testFiles: string[], hints: Record<number, {terms: string[], files: string[], anchors?: Array<{term: string, file: string, line: number}>}>}> }} p7
 * @returns {string[]} 行数组（含段标题；调用方自理前后空行）
 */
function renderProbe7Lines(p7) {
  const L = [PROBE7_HEADING]
  if (!p7 || !p7.applicable) {
    L.push('- 不适用（无 TaskCard）')
    return L
  }
  L.push('<!-- 口径注记：探针 3 = 模块目录递归存在性面（allowed_paths 目录附近有没有测试）；探针 7 = allowed_paths ∪ review changedFiles 结构归属承接面（每条 acceptance 由哪些测试承接）；两者并排冲突以 7 为准。判定枚举（四选一）：covered / partial / uncovered / non-testable（文档/部署类显式逃生门）。关键词命中只是提示，命中≠判定。 -->')
  L.push('<!-- 预填说明（ql-20260915-004）：判定列为 CLI 机械预填，agent 逐格复核改写——规则：无归属→uncovered（文档/部署/doc/deploy/manual/config 类词→non-testable）；有归属且命中≥1→covered；有归属零命中→partial。证据列给首命中 file:line 锚点或人工核验提示。预填≠结论：与事实不符的格子必须改写（枚举须保持 covered/partial/uncovered/non-testable 纯值，备注写在证据列）。 -->')
  for (const t of (p7.tasks || [])) {
    L.push('')
    L.push(`**${t.task}**`)
    if (!Array.isArray(t.acceptance) || t.acceptance.length === 0) {
      L.push('- （卡无 acceptance——防御，plan-postcheck 已拦）')
      continue
    }
    L.push('| acceptance 条目 | 归属测试文件 | 关键词命中（提示，命中≠判定） | 判定 | 证据 |')
    L.push('|---|---|---|---|---|')
    t.acceptance.forEach((item, i) => {
      const attribCell = (t.testFiles && t.testFiles.length > 0)
        ? t.testFiles.map(f => `\`${f}\``).join('<br>')
        : '无归属测试——判定大概率 uncovered'
      const h = (t.hints && t.hints[i]) || null
      const hintCell = h
        ? `${h.terms.map(x => mdEscapeCell(x)).join('、')}（${(h.files || []).map(f => `\`${f}\``).join('、')}）`
        : '—'
      const pre = prefillMatrixCells(item, t.testFiles, h)
      L.push(`| ${mdEscapeCell(item)} | ${attribCell} | ${hintCell} | ${pre.verdict} | ${pre.evidence} |`)
    })
  }
  return L
}

/**
 * 跑四个机械探针 + 探针 7 验收×测试覆盖矩阵。
 * @param {{ cwd: string, changeName: string, specDir?: string|null }} opts
 * @returns {{ probe1: object, probe3: object, probe5: object, probe6: object, probe7: object }}
 */
export function runVerifyProbes({ cwd, changeName, specDir = null }) {
  const specBase = resolveVerifyProbesSpecBase(cwd, specDir)
  const changeDir = join(specBase, 'changes', changeName)
  const designPath = join(changeDir, 'design.md')
  const detailed = existsSync(designPath) ? parseFileChangeListDetailed(designPath) : []
  const designOps = new Map(detailed.map(e => [e.path, e.operation]))

  // ── 探针 1：未实现标记扫描（design 清单具体文件；glob 项列出让 agent 展开）──
  // worktree 路径回退（坑 probe1-worktree-path-blind，2026-08-24 用户实证：verify 从主仓跑、
  // apply 前 design 清单新文件只在 worktree → 6 个新文件被报「不存在」跳过不扫）。主仓路径
  // 缺失且存在真实 worktree（gitDir≠cwd，与探针 5 的 _readWorktreeMeta 同源解析）→ 读 worktree
  // 版本并计数；两处皆缺才进 skippedFiles。in-place meta（gitDir==cwd）零行为变化。
  const wtInfo = _readWorktreeMeta(specBase, cwd, changeName)
  const wtRoot = (wtInfo && wtInfo.gitDir && wtInfo.gitDir !== cwd) ? wtInfo.gitDir : null
  const probe1 = { matches: [], globEntries: [], skippedFiles: [], worktreeHits: 0 }
  for (const e of detailed) {
    if (e.path.startsWith('.sillyspec/')) continue
    if (/[*?[\]]/.test(e.path)) {
      probe1.globEntries.push(e.path)
      continue
    }
    // NEW: 待建前缀剥离（坑 probe1-new-prefix-miss，2026-09-12 驾驭第十七批③，用户实证
    // 「NEW: 前缀文件已合入主仓」时 existsSync(join(cwd,'NEW:src/x')) 恒 miss 落 skippedFiles
    // 留 ⚠️ 噪声）：design 清单的 NEW: 是「新建意图」标记，文件 apply 后已是无前缀实体——
    // 探针按目标文件扫（与 pathMatches 比对侧剥除同源）。
    const probePath = String(e.path).replace(/^NEW:\s*/, '')
    let abs = join(cwd, probePath)
    if (!existsSync(abs)) {
      const wtAbs = wtRoot ? join(wtRoot, probePath) : null
      if (wtAbs && existsSync(wtAbs)) {
        abs = wtAbs
        probe1.worktreeHits++
      } else {
        probe1.skippedFiles.push(e.path)
        continue
      }
    }
    try {
      const lines = readFileSync(abs, 'utf8').split('\n')
      lines.forEach((line, i) => {
        if (probe1.matches.length >= PROBE1_MAX_MATCHES) return
        if (isUnimplementedMarkerLine(line)) probe1.matches.push({ file: probePath, line: i + 1, content: line.trim().slice(0, 160) })
      })
    } catch {
      probe1.skippedFiles.push(e.path)
    }
  }

  // ── 探针 3：验收标准测试覆盖（task 卡 allowed_paths → 模块目录递归找测试文件）──
  const tasksPath = join(changeDir, 'tasks.md')
  const probe3 = { tasks: [], note: '集成盲区（路由/跨模块装配）与断言有效性抽查是语义判断，留给 agent 逐 task 标注 ⚠️' }
  for (const taskId of listTaskIds(tasksPath)) {
    const cardPath = join(changeDir, 'tasks', `${taskId}.md`)
    let allowed = []
    if (existsSync(cardPath)) allowed = parseAllowedPaths(readFileSync(cardPath, 'utf8'))
    const moduleDirs = [...new Set(allowed.map(p => dirname(p.split('\\').join('/'))).filter(d => d && d !== '.'))]
    // JVM 镜像测试根（坑 probe3-java-mirror-blind，2026-09-15 EHS 生产实证 task-02~06 五连
    // 假⚠️）：Maven/Gradle 布局测试在 src/test/<lang> 同包镜像树，与 src/main 侧永不
    // co-located——只递归 allowed_paths 目录（全在 main 侧）必然落空。对命中 src/main/<lang>
    // 的目录补推镜像目录进扫描集（主仓或 worktree 任一侧存在才列/才扫——不存在的镜像根=
    // 该包真无测试，保持 ⚠️ 真信号）。
    const mirrorDirs = []
    for (const d of moduleDirs) {
      const m = d.match(/^(.*\/src\/)main(\/(?:java|kotlin|scala|groovy)(?:\/.*)?)$/)
      if (!m) continue
      const mirror = `${m[1]}test${m[2]}`
      if (mirrorDirs.includes(mirror) || moduleDirs.includes(mirror)) continue
      if (existsSync(join(cwd, mirror)) || (wtRoot && wtRoot !== cwd && existsSync(join(wtRoot, mirror)))) {
        mirrorDirs.push(mirror)
      }
    }
    const testFiles = []
    for (const d of [...moduleDirs, ...mirrorDirs]) {
      // 双根并集扫描（坑 probe3-worktree-test-false-negative，2026-09-10 驾驭小结第五批②，
      // 用户实证 5 条假 warning）：apply 前新测试文件只在 worktree（untracked），而模块目录在
      // 主仓**已存在**——旧「主仓目录缺失才回退 worktree」条件不触发，探针 3 报「未找到测试
      // 文件」假阴。改为无条件双根并集（主仓 ∪ worktree，各自存在才扫，路径相对各自根呈现，
      // 按 rel 去重主仓优先——与探针 5 的三根并集同族）。主仓 in-place（wtRoot=null）零变化。
      const roots = []
      if (existsSync(join(cwd, d))) roots.push({ root: join(cwd, d), base: cwd })
      if (wtRoot && wtRoot !== cwd && existsSync(join(wtRoot, d))) roots.push({ root: join(wtRoot, d), base: wtRoot })
      for (const s of roots) {
        for (const f of findTestFiles(s.root, s.base)) {
          if (!testFiles.includes(f)) testFiles.push(f)
        }
      }
    }
    probe3.tasks.push({
      task: taskId,
      moduleDirs,
      mirrorDirs,
      testFiles: testFiles.slice(0, 10),
      testFileCount: testFiles.length,
      hasTest: testFiles.length > 0,
      located: moduleDirs.length > 0,
    })
  }

  // ── 探针 5：API 契约对账（复用 verifyApiParity：endpoints.json × 前端调用）──
  const runtimeRoot = resolveRuntimeRoot({ specRoot: specDir }, specBase)
  const probe5 = verifyApiParity(specBase, cwd, runtimeRoot, changeName)
  // 跨仓 task 卡计数（坑 probe5-cross-repo-scope-blindness，2026-09-15 复盘：跨仓仓的前端
  // 调用不在 parity 扫描根内，「frontend 0 调用」会被误读为漏配——渲染侧显式注记扫描面
  // 边界。计数失败按 0（不渲染注记，零新增失败面）。
  try {
    const tasksDir = join(changeDir, 'tasks')
    if (changeName && existsSync(tasksDir)) {
      let crossRepoCardCount = 0
      for (const f of readdirSync(tasksDir).filter(n => /^task-\d+\.md$/.test(n))) {
        if (parseRepo(readFileSync(join(tasksDir, f), 'utf8'))) crossRepoCardCount++
      }
      if (crossRepoCardCount > 0) probe5.crossRepoCardCount = crossRepoCardCount
    }
  } catch { /* tasks 目录不可读 → 不注记 */ }

  // ── 探针 6：代码删除对账（git diff --name-status HEAD 的 D/R × design 声明三态）──
  const probe6 = { deletions: [], unavailable: false, note: '以 git 事实为准（真实 > 声明）；是否 FAIL blocker 由 agent 诚实判定' }
  // 他者声明归属过滤（坑 verify-reconcile-foreign-wip）：并行会话在途删除/改动不进本变更对账
  // gitQuiet 失败（非仓库/git 缺失/报错）返回 null ≠ 空结果：null 必须显式标记不可用，
  // 否则半截对账被渲染成「✅ 无删除」的错误全清信号（对照 verify-postcheck runVerifyDeletionCheck 的 skipped 口径）
  const nsOut = gitQuiet(cwd, ['diff', '--name-status', 'HEAD'])
  if (nsOut === null) probe6.unavailable = true
  let nsRows = (nsOut || '').split('\n').filter(Boolean)
  {
    const rawTargets = nsRows.map(row => ((row.split('\t')[1]) || ''))
      .filter(Boolean).map(t => t.split('\\').join('/'))
    const { foreign } = splitOwnVsForeignDiffFiles(cwd, changeName, rawTargets, { specBase, runtimeRoot })
    if (foreign.length > 0) {
      const foreignSet = new Set(foreign.map(x => x.file))
      nsRows = nsRows.filter(row => !foreignSet.has((row.split('\t')[1] || '').split('\\').join('/')))
      console.warn(`⚠️ 探针6 已排除 ${foreign.length} 个并行会话声明的删除/改动（${foreign.slice(0, 5).map(x => x.file).join(', ')}${foreign.length > 5 ? ' 等' : ''}）`)
    }
  }
  for (const row of nsRows) {
    const [status, ...paths] = row.split('\t')
    const st = (status || '').trim().toUpperCase()
    if (!/^[DRC]/.test(st)) continue
    // R/C 的旧路径等价删除（paths[0]）；D 的唯一路径——两者都取 paths[0]
    const target = paths[0] || ''
    const posix = target.split('\\').join('/')
    if (!posix || posix.startsWith('.sillyspec/') || posix === 'meta.json' || basename(posix) === 'meta.json') continue
    const op = designOps.get(posix)
    let verdict
    if (op && /删除|delete|del/i.test(op)) verdict = '✅ 合规（design 声明删除）'
    else if (op) verdict = `❌ 高风险（design 声明「${op}」却整文件删除）`
    else verdict = '⚠️ 未声明删除（design 清单未列出）'
    probe6.deletions.push({ path: posix, status: st, designOp: op || null, verdict })
  }

  // ── 探针 7：验收×测试覆盖矩阵（acceptance 自解析 + 双源结构归属 + 关键词提示）──
  // applicable 顶层键：tasks/ 目录不存在或全无 frontmatter = false（quick 会话/旧变更零行为
  // 变化——不渲染矩阵、不产生待填槽）。归属双源 = 卡 allowed_paths 测试模式 ∪ 当前 runId
  // review.json changedFiles 的 test/ 前缀（runId 由 resolveExecuteRunIdInline 内联解析——
  // 禁静态 import task-review，三步环见该函数注释）。
  const probe7 = { applicable: false, tasks: [] }
  {
    const tasksDir = join(changeDir, 'tasks')
    if (existsSync(tasksDir)) {
      const runId = resolveExecuteRunIdInline(runtimeRoot, changeName)
      const cards = []
      try {
        for (const f of readdirSync(tasksDir).filter(n => /^task-\d+\.md$/.test(n)).sort()) {
          const raw = readFileSync(join(tasksDir, f), 'utf8')
          const acceptance = parseTaskAcceptance(raw)
          if (acceptance === null) continue // 无 frontmatter → 跳过（plan-postcheck 已拦）
          const fmId = (raw.match(/^id:\s*(\S+)/m) || [])[1]
          cards.push({ task: fmId || f.replace(/\.md$/, ''), acceptance, raw })
        }
      } catch { /* tasks 目录不可读 → applicable 维持 false */ }
      probe7.applicable = cards.length > 0
      for (const card of cards) {
        const fromAllowed = parseAllowedPaths(card.raw)
          .map(p => String(p).replace(/^NEW:\s*/, '').trim())
          .filter(p => p && isProbe7TestPath(p))
        const fromReview = runId ? readReviewChangedTestFiles(runtimeRoot, runId, card.task) : []
        const testFiles = [...new Set([...fromAllowed, ...fromReview])]
        probe7.tasks.push({
          task: card.task,
          acceptance: card.acceptance,
          testFiles,
          hints: buildAcceptanceHints(card.acceptance, testFiles, cwd, wtRoot),
        })
      }
    }
  }

  return { probe1, probe3, probe5, probe6, probe7 }
}

/**
 * 渲染探针结果为 markdown（可直接粘进 verify-result.md「探针结果」章节）。
 */
export function renderVerifyProbesReport(result) {
  const L = []
  const { probe1, probe3, probe5, probe6 } = result

  L.push('#### 探针 1：未实现标记扫描（design 清单文件）')
  if (probe1.matches.length === 0) {
    L.push('- ✅ 无 TODO/FIXME/尚未实现 标记命中')
  } else {
    for (const m of probe1.matches) L.push(`- ⚠️ \`${m.file}:${m.line}\` ${m.content}`)
  }
  if (probe1.globEntries.length > 0) L.push(`- ℹ️ glob 项未展开（agent 手动展开扫描）：${probe1.globEntries.join('、')}`)
  if (probe1.worktreeHits > 0) L.push(`- ℹ️ ${probe1.worktreeHits} 个清单文件主仓不存在、已从 worktree 读取（apply 前新文件形态）`)
  if (probe1.skippedFiles.length > 0) L.push(`- ℹ️ 清单文件不存在（跳过）：${probe1.skippedFiles.join('、')}`)
  L.push('')

  L.push('#### 探针 2：设计关键词覆盖')
  L.push('<!--TODO: 半语义探针——从 design 提取能力关键词逐个 grep 确认实现（agent 执行）-->')
  L.push('')

  L.push('#### 探针 3：验收标准测试覆盖')
  if (probe3.tasks.length === 0) {
    L.push('- ℹ️ tasks.md 无 checkbox 任务')
  } else {
    for (const t of probe3.tasks) {
      if (!t.located) {
        L.push(`- ⚠️ ${t.task}: 无 task 卡/allowed_paths，无法定位模块目录（agent 手查）`)
      } else if (t.hasTest) {
        const mirrorNote = (t.mirrorDirs && t.mirrorDirs.length > 0)
          ? `；JVM 镜像测试根（${t.mirrorDirs.join('、')}）` : ''
        L.push(`- ✅ ${t.task}: 模块目录（${t.moduleDirs.join('、')}）${mirrorNote}找到 ${t.testFileCount} 个测试文件（${t.testFiles.slice(0, 5).join('、')}${t.testFileCount > 5 ? ' …' : ''}）`)
      } else {
        const mirrorNote = (t.mirrorDirs && t.mirrorDirs.length > 0)
          ? '（含 co-located tests/ 与 JVM src/test 镜像根）' : '（含 co-located tests/）'
        L.push(`- ⚠️ ${t.task}: 模块目录（${t.moduleDirs.join('、')}）递归未找到测试文件${mirrorNote}`)
      }
    }
  }
  L.push(`- ℹ️ ${probe3.note}`)
  L.push('')

  // 探针 7 紧随探针 3（3.5 已被断言有效性抽查占用，编号顺延取 7 兼容锚定正则 /#### 探针 (\d+)/）；
  // 骨架序 3 → 7 → 4，ensureAcceptanceMatrixSection 补段同序。result 无 probe7 键（存量调用方/
  // 合成 result）→ applicable=false 渲染「不适用」行，零回归。
  L.push(...renderProbe7Lines(result.probe7 || { applicable: false, tasks: [] }))
  L.push('')

  L.push('#### 探针 4：决策追踪覆盖')
  L.push('<!--TODO: 语义探针——D-xxx@vN → FR-xxx → plan/task 引用 → 证据回指闭环（agent 执行）-->')
  L.push('')

  L.push('#### 探针 5：API Contract Parity')
  L.push(`- ${probe5.summary || `backend ${probe5.backendCount ?? 0} 端点 / frontend ${probe5.frontendCount ?? 0} 调用`}`)
  if (probe5.crossRepoCardCount > 0) {
    L.push(`- ℹ️ parity 扫描面只含主仓——另有 ${probe5.crossRepoCardCount} 张跨仓 task 卡的仓不在扫描根内，跨仓前端调用/端点请到对应仓核对（D-004 跨仓对账不在本变更范围）`)
  }
  if ((probe5.scanRoots || []).length > 1) {
    L.push(`- ℹ️ 后端端点比对集为多根并集（主仓既有 ∪ worktree 新增 ∪ 存量 artifact），共扫 ${probe5.scanRoots.length} 个根`)
  }
  if (probe5.prefixAlignedCount > 0) {
    L.push(`- ℹ️ ${probe5.prefixAlignedCount} 处前端调用经挂载前缀对齐匹配（endpoints 提取不含 include_router/app.use 挂载点前缀，比对时剥除对齐——非契约缺口）`)
  }
  if ((probe5.missingBackend || []).length > 0) {
    L.push('')
    L.push('| 状态 | 前端调用 | 后端端点 | 文件 |')
    L.push('|---|---|---|---|')
    for (const m of probe5.missingBackend) {
      L.push(`| ❌ missing | ${m.method} ${m.path} | — | ${m.consumerFile || '?'}${m.consumerLine ? ':' + m.consumerLine : ''} |`)
    }
    L.push('')
    L.push('- ❌ contract gap 是真实集成缺陷——诚实判 FAIL 并回 execute 补端点（CLI 仅 advisory 不硬阻断）')
  }
  if ((probe5.unusedBackend || []).length > 0) {
    L.push(`- ⚠️ ${probe5.unusedBackend.length} 个后端端点前端未调用（warning 不阻断）：${probe5.unusedBackend.slice(0, 5).map(u => `${u.method} ${u.path}`).join('、')}${probe5.unusedBackend.length > 5 ? ' …' : ''}`)
  }
  L.push('')

  L.push('#### 探针 6：代码删除对账')
  if (probe6.unavailable) {
    L.push('- ⚠️ git 不可用或非仓库，删除对账无法执行（不能视为「无删除」，agent 需人工核对）')
  } else if (probe6.deletions.length === 0) {
    L.push('- ✅ git diff 无整文件删除（D/R/C）记录')
  } else {
    for (const d of probe6.deletions) {
      L.push(`- ${d.verdict} \`${d.path}\`（git 状态 ${d.status}）`)
    }
  }
  L.push(`- ℹ️ ${probe6.note}`)
  return L.join('\n')
}

/**
 * 从 runVerifyProbes 结果构造 verify-facts.json 机器底稿对象（P3b 可复跑审计底稿）。
 * 命令行统一 `sillyspec verify-probes --change <name>`；指标 fail-soft——字段不可得时少列
 * 该键而非报错（probe5 形态随 verifyApiParity 演进，宁可少列不可失真）。
 * @param {{ probe1?: object, probe3?: object, probe5?: object, probe6?: object }} result
 * @param {{ changeName?: string, now?: string }} [opts] now 缺省取当前时刻（ISO）
 * @returns {{ schemaVersion: number, change: string, generatedAt: string, probes: object }}
 */
export function buildVerifyFacts(result, { changeName, now } = {}) {
  const command = `sillyspec verify-probes --change ${changeName}`
  // undefined 值键不进 metrics（「取不到的字段宁可少列」）
  const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))
  const len = (a) => (Array.isArray(a) ? a.length : undefined)
  const num = (v) => (typeof v === 'number' ? v : undefined)
  const p1 = (result && result.probe1) || {}
  const p3 = (result && result.probe3) || {}
  const p5 = (result && result.probe5) || {}
  const p6 = (result && result.probe6) || {}
  // v2（2026-09-08-ir-verify-facts）：probes 机器段原样；conclusion/tests/requiredEvidence/
  // runtimeEvidence/factsConsistency 五段是 slot-backfill/实测回填段（D-001@v2），--init 快照
  // 不落键（writeVerifyFacts 分段合并时保留既有固化段），由 backfillFactsFromMdAndTests 填。
  return {
    schemaVersion: 2,
    change: changeName,
    generatedAt: now || new Date().toISOString(),
    probes: {
      probe1: {
        command,
        metrics: defined({
          matches: len(p1.matches),
          skippedFiles: len(p1.skippedFiles),
          worktreeHits: num(p1.worktreeHits),
          globEntries: len(p1.globEntries),
        }),
      },
      probe3: {
        command,
        metrics: defined({
          tasks: len(p3.tasks),
          hasTest: Array.isArray(p3.tasks) ? p3.tasks.filter(t => t && t.hasTest).length : undefined,
        }),
      },
      probe5: {
        command,
        metrics: defined({
          backendEndpoints: num(p5.backendCount),
          frontendCalls: num(p5.frontendCount),
        }),
      },
      probe6: {
        command,
        metrics: defined({
          deletions: len(p6.deletions),
          unavailable: typeof p6.unavailable === 'boolean' ? p6.unavailable : undefined,
        }),
      },
    },
  }
}

/**
 * 平台模式产物路径回显注记（2026-09-10 驾驭小结②，用户实锤「显示混乱」）：
 * verify-probes --init 在平台模式（.sillyspec-platform.json pointer 存在）下 spec 根解析为
 * hub 镜像目录——回显的物理路径（骨架生成/已存在/facts 刷新）都在镜像根下，而产物经
 * daemon spec-sync 落主仓 .sillyspec/changes/<change>/。agent/人工核对以主仓路径为准，
 * 回显行尾追加本注记消歧义（本地模式返回空串，回显零变化）。
 * @param {string|null} platformBase 平台镜像根（null/undefined = 非平台模式）
 * @param {string} changeName 变更名
 * @param {string} file 产物文件名（verify-result.md / verify-facts.json）
 * @returns {string} 注记文本（非平台模式为 ''）
 */
export function formatPlatformPathNote(platformBase, changeName, file) {
  if (!platformBase) return ''
  return `（平台模式：物理写盘在 hub 镜像根 ${platformBase}；主仓同步位置 .sillyspec/changes/${changeName}/${file}，核对以主仓路径为准）`
}

/**
 * verify-probes --init 落盘 verify-facts.json（CLI 全权写）。v2（2026-09-08-ir-verify-facts）改
 * 分段合并：re-init 刷新机器段（probes/generatedAt），保留既有 slot-backfill/实测固化段
 * （conclusion/tests/requiredEvidence/runtimeEvidence）——旧「无条件覆盖」会抹掉 --done 回填数据
 * （设计审查 P1-5）。agent 勿手改：复跑审计的对照快照，防篡改基准是 verify-result.md 正文。
 * @param {string} changeDir 变更目录（spec 根下 changes/<name>）
 * @param {object} result runVerifyProbes 返回值
 * @param {string} changeName 变更名（统一命令行呈现）
 * @param {{ platformNote?: string }} [opts] platformNote 回显行尾追加（平台模式路径消歧，纯回显层不进落盘）
 * @returns {{ facts: object, path: string }}
 */
export function writeVerifyFacts(changeDir, result, changeName, opts = {}) {
  const fresh = buildVerifyFacts(result, { changeName })
  const factsPath = join(changeDir, 'verify-facts.json')
  let facts = fresh
  try {
    const prev = JSON.parse(readFileSync(factsPath, 'utf8'))
    if (prev && prev.schemaVersion === FACTS_SCHEMA_VERSION) {
      facts = {
        ...fresh,
        conclusion: prev.conclusion,
        tests: prev.tests,
        requiredEvidence: prev.requiredEvidence,
        runtimeEvidence: prev.runtimeEvidence,
        factsConsistency: prev.factsConsistency, // 保留至上次对比结论（下次 --done 重算覆盖）
      }
    }
  } catch { /* 首次落盘/v1/损坏 → 全新快照（v1 无固化段，直接升 v2） */ }
  writeFileSync(factsPath, JSON.stringify(facts, null, 2) + '\n')
  console.log(`📝 已刷新 verify-facts.json 机器底稿: ${factsPath}（v2 分段合并，固化段保留；CLI 全权写，勿手改）${opts.platformNote || ''}`)
  return { facts, path: factsPath }
}

/**
 * --done 回填（D-001@v2 slot-backfill）：结论枚举槽 + 证据/回执槽解析固化进 facts；
 * testCheckResult 提供时回填 tests 段（实测在 runValidators 之后 → gates 二次回填，FR-03 次序）。
 * 机器段（probes/factsConsistency）不经本函数（writeVerifyFacts / checkProbeConsistency 所有）。
 * fail-soft：facts 缺失时原地升 v2（probes 保留或空）；落盘失败 warn 不抛。
 * @param {string} factsPath verify-facts.json 路径
 * @param {{ verifyMd: string, testCheckResult?: object|null }} opts
 * @returns {{ facts: object, conclusion: string|null, evidenceCount: number, receiptCount: number, testsBackfilled: boolean }}
 */
export function backfillFactsFromMdAndTests(factsPath, { verifyMd, testCheckResult = null, conclusion = null }) {
  let facts = null
  try { facts = JSON.parse(readFileSync(factsPath, 'utf8')) } catch { /* 缺失见下 */ }
  // 只固化既有底稿，不无中生有（2026-09-08-ir-verify-facts 接线实证）：无 facts 的存量变更
  // （未跑过 --init）若被回填凭空建出 facts.json，checkProbeConsistency 的「有 facts 无探针
  // 子节 → error」判别会把存量兼容 skip 误升 error（run-complete-step-verify e2e 抓出）。
  // 底稿创建唯一入口是 verify-probes --init。
  if (!facts) {
    return { facts: null, skipped: true, conclusion: null, evidenceCount: 0, receiptCount: 0, testsBackfilled: false, reason: '无 verify-facts.json（未跑 --init），回填跳过——底稿创建唯一入口是 --init' }
  }
  if (facts.schemaVersion !== FACTS_SCHEMA_VERSION) {
    facts = { ...facts, schemaVersion: FACTS_SCHEMA_VERSION, probes: (facts && facts.probes) || {} }
  }
  const slots = parseEvidenceSlots(verifyMd || '')
  // conclusion 由调用方传 stage-contract.extractVerifyConclusionSlot(verifyMd) 的结果
  // （避免 verify-probes → stage-contract 静态 import 的潜在环，分层单向）
  const conclusionSlot = conclusion || null
  if (conclusionSlot) facts.conclusion = conclusionSlot
  if (slots.hasEvidenceSlot && slots.requiredEvidence.length > 0) {
    facts.requiredEvidence = slots.requiredEvidence.map(e => ({
      task: e.task, status: e.status, verifiedFiles: e.verifiedFiles,
      ...(e.exempt ? { exempt: true, exemptionReason: e.exemptionReason } : {}),
    }))
  }
  if (slots.hasReceiptSlot && slots.runtimeEvidence.length > 0) {
    facts.runtimeEvidence = slots.runtimeEvidence
  }
  let testsBackfilled = false
  if (testCheckResult && testCheckResult.status && testCheckResult.status !== 'skipped') {
    facts.tests = {
      command: testCheckResult.command || null,
      exitCode: typeof testCheckResult.exitCode === 'number' ? testCheckResult.exitCode : null,
      strategy: testCheckResult.mode || testCheckResult.strategy || null,
      failedRemaining: testCheckResult.failureNames || testCheckResult.failedTests || [],
      passedAt: new Date().toISOString(),
    }
    testsBackfilled = true
  }
  try {
    writeFileSync(factsPath, JSON.stringify(facts, null, 2) + '\n')
  } catch (e) {
    console.warn(`⚠️ facts 回填落盘失败（fail-soft，不阻断）: ${e && e.message ? e.message : e}`)
  }
  return { facts, conclusion: conclusionSlot, evidenceCount: slots.requiredEvidence.length, receiptCount: slots.runtimeEvidence.length, testsBackfilled }
}

/**
 * md 槽段缺失补齐（--init 段落级补齐，2026-09-08-ir-verify-facts R-02）：已存在的
 * verify-result.md 缺「证据账/集成验证回执」槽段时仅追加骨架（不触碰既有正文），幂等二跑零改动。
 * @param {string} mdPath verify-result.md 路径
 * @param {Array<{task:string,evidence:string[]}>} [requiredEvidenceItems] verify-required-evidence.json items（预填 task 行）
 * @returns {{ added: string[] }} 追加的槽段标题列表
 */
export function backfillMissingEvidenceSlots(mdPath, requiredEvidenceItems = []) {
  let text = ''
  try { text = readFileSync(mdPath, 'utf8') } catch { return { added: [] } }
  const normalized = text.replace(/\r\n/g, '\n')
  const added = []
  const blocks = []
  if (!normalized.includes(EVIDENCE_SLOT_HEADING)) {
    const lines = [EVIDENCE_SLOT_HEADING, '[层：人工判断——CLI 核验]', '', '<!-- 无 cannot_verify 任务时本节写「无」 -->']
    if (requiredEvidenceItems.length > 0) {
      for (const it of requiredEvidenceItems) {
        lines.push(`- ${it.task}: <待填：三选一> | verifiedFiles: <精确路径，逗号分隔>（satisfied 必填；豁免时填 missing 并加（豁免：<一句话理由>）后缀）`)
      }
    } else {
      lines.push('无（本次变更无 cannot_verify 任务）')
    }
    lines.push('')
    blocks.push(lines.join('\n'))
    added.push(EVIDENCE_SLOT_HEADING)
  }
  if (!normalized.includes(RECEIPT_SLOT_HEADING)) {
    blocks.push([
      RECEIPT_SLOT_HEADING, '[层：自述声明——CLI 一致性校验]', '',
      '<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->',
      '- claim: <待填：一句话> | command: <待填：命令> | exit: <待填：0 或非 0> | log: <待填：日志路径>',
      '',
    ].join('\n'))
    added.push(RECEIPT_SLOT_HEADING)
  }
  if (added.length > 0) {
    writeFileSync(mdPath, normalized.replace(/\n?$/, '\n') + blocks.join('\n') + '\n')
  }
  return { added }
}

/**
 * 探针 7 矩阵段幂等补齐（--init 段落级，2026-09-14-acceptance-test-matrix FR-01；学
 * backfillMissingEvidenceSlots 形态）：verify-result.md 已存在但缺「#### 探针 7」段且
 * applicable=true（有 TaskCard）时补矩阵骨架段——不触碰既有正文；二跑零改动（幂等）。
 * 插入位置：文件内有「#### 探针 3」小节时插在该小节之后（保持骨架序 3 → 7 → 4），否则
 * 文末追加（旧格式/手写正文）。段已在场（冒号全/半角均认，防走样标题绕过检测）或
 * applicable=false → no-op。本变更自举通道：verify-result.md 先于特性存在的存量走此补段。
 * @param {string} mdPath verify-result.md 路径
 * @param {{ applicable: boolean, tasks: Array }} probe7 runVerifyProbes 返回的 probe7
 * @returns {{ added: boolean, reason?: string }}
 */
export function ensureAcceptanceMatrixSection(mdPath, probe7) {
  let text
  try { text = readFileSync(mdPath, 'utf8') } catch { return { added: false, reason: 'verify-result.md 不存在或不可读' } }
  const normalized = text.replace(/\r\n/g, '\n')
  if (/^#### 探针 7[：:]/m.test(normalized)) return { added: false, reason: '探针 7 段已在场' }
  const p7 = probe7 && typeof probe7 === 'object' ? probe7 : { applicable: false, tasks: [] }
  if (!p7.applicable) return { added: false, reason: '不适用（无 TaskCard）' }
  const blockLines = [...renderProbe7Lines(p7), '']
  try {
    const lines = normalized.split('\n')
    const p3Idx = lines.findIndex(l => /^#### 探针 3[：:]/.test(l))
    if (p3Idx === -1) {
      writeFileSync(mdPath, normalized.replace(/\n?$/, '\n') + '\n' + blockLines.join('\n'))
    } else {
      // 探针 3 小节终点 = 下一个任意级别标题行（与 verify-postcheck extractProbeSubsections 同口径）
      let end = lines.length
      for (let i = p3Idx + 1; i < lines.length; i++) {
        if (/^#{1,6}\s/.test(lines[i])) { end = i; break }
      }
      lines.splice(end, 0, ...blockLines)
      writeFileSync(mdPath, lines.join('\n'))
    }
  } catch (e) {
    console.warn(`⚠️ 探针 7 矩阵段补齐落盘失败（fail-soft，不阻断）: ${e && e.message ? e.message : e}`)
    return { added: false, reason: '落盘失败' }
  }
  return { added: true }
}

/**
 * 结论草稿槽行预填（P0-1 前置三，noai-ir-roadmap §3）：机械事实全绿时把骨架「结论枚举：」
 * 待填槽替换为 PASS 草稿——显式「草稿待确认」内联标注（非默认值语义），agent 复核后可改写；
 * gate 对槽行的独立复核逻辑不经本函数（判定链不动，预填只省打字成本）。纯文本变换三态：
 * 槽行未填（仍含「待填」）→ 改写；已填（任何枚举值）→ 原样返回；无槽行（legacy 存量）→
 * 原样返回。改写后槽行满足 extractVerifyConclusionSlot 行首锚定枚举解析（返回 PASS）。
 */
export function applyConclusionDraftToText(text, draft = 'PASS') {
  const normalized = String(text).replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (/^结论枚举：/.test(lines[i]) && lines[i].includes('待填')) {
      lines[i] = `结论枚举：${draft}（🤖 CLI 草稿待确认——机械事实全绿自动预填：noAI 实测通过 + 探针 1/3/5/6 干净 + 风险门非 integration/deployment；复核后不同意即改写本行枚举值，gate 独立复核不受预填影响）`
      return lines.join('\n')
    }
  }
  return text
}

/**
 * 决策追踪矩阵机械半边（P0-1，noai-ir-roadmap §3）：D→FR→task 链自结构化字段构建——
 * decisions.md 条目（parseDecisions 双格式解析，与 distill 同源单一实现）× tasks/task-NN.md
 * frontmatter 的 decision_ids / requirement_ids（taskcard 9 硬校验字段，CLI 骨架写入——比
 * tasks.md 行内注解可靠）。Evidence / 状态两列是人工判断置 <待填>；D 无 task 回指 →
 * ⚠️ 未闭环显式列出（这正是矩阵要暴露的风险，不静默）。
 * @returns {{ rows: string[], decisionCount: number, taskCount: number }|null}
 *   null = 无 decisions.md / 解析 0 条（矩阵段留 TODO 不注入）
 */
export function buildDecisionChainMatrix(changeDir) {
  let decisions
  try {
    decisions = parseDecisions(changeDir)
  } catch {
    return null
  }
  if (!decisions || decisions.missing || (decisions.entries || []).length === 0) return null
  // task 卡 frontmatter 结构化字段反查（列表 [a, b] 形态；frontmatter 由 plan-postcheck 硬校验）
  const taskRefs = []
  const tasksDir = join(changeDir, 'tasks')
  try {
    if (existsSync(tasksDir)) {
      for (const f of readdirSync(tasksDir).filter((f) => /^task-\d+\.md$/.test(f)).sort()) {
        const raw = readFileSync(join(tasksDir, f), 'utf8')
        const id = (raw.match(/^id:\s*(\S+)/m) || [])[1] || f.replace(/\.md$/, '')
        const decLine = (raw.match(/^decision_ids:\s*\[([^\]]*)\]/m) || [])[1] || ''
        const reqLine = (raw.match(/^requirement_ids:\s*\[([^\]]*)\]/m) || [])[1] || ''
        taskRefs.push({
          task: id,
          decisions: new Set(decLine.split(',').map((s) => s.trim()).filter(Boolean)),
          reqs: new Set(reqLine.split(',').map((s) => s.trim()).filter(Boolean)),
        })
      }
    }
  } catch { /* tasks 目录不可读 → 矩阵 task 列全标未闭环（信息仍在） */ }
  const rows = []
  for (const d of decisions.entries) {
    // task 卡 decision_ids 可能写 D-001（无 @vN）——id 与 number 双匹配同源
    const hitTasks = taskRefs.filter((t) => t.decisions.has(d.id) || t.decisions.has(d.number))
    const frs = [...new Set(hitTasks.flatMap((t) => [...t.reqs]))].sort()
    const taskCell = hitTasks.length > 0 ? hitTasks.map((t) => t.task).join('、') : '⚠️ 未闭环（无 task 回指）'
    const frCell = frs.length > 0 ? frs.join('、') : '⚠️ 未映射'
    rows.push(`| ${d.id} | ${frCell} | ${taskCell} | <待填：证据回指> | <待填> |`)
  }
  return { rows, decisionCount: decisions.entries.length, taskCount: taskRefs.length }
}

/**
 * 矩阵机械半边注入 verify-result.md（--init 接线）：只在「决策追踪矩阵」段内仍是骨架
 * TODO 行（含 D-xxx 形态）且段内无既有表格时替换注入——幂等（agent 已写/前次注入零改动），
 * 不触碰正文其余部分。落盘失败 fail-soft 返回 null。
 * @returns {{ decisions: number, tasks: number }|null} null = 无 decisions/无可替换 TODO/已注入
 */
export function injectDecisionChainDraft(mdPath, changeDir) {
  let text
  try { text = readFileSync(mdPath, 'utf8') } catch { return null }
  const headingIdx = text.indexOf('## 决策追踪矩阵')
  if (headingIdx === -1) return null
  const nextHeading = text.indexOf('\n## ', headingIdx + 1)
  const sectionEnd = nextHeading === -1 ? text.length : nextHeading
  const section = text.slice(headingIdx, sectionEnd)
  if (/^\|/m.test(section)) return null // 已有表格 → 尊重既有内容
  const todoRe = /<!--TODO:[^\n]*D-xxx[^\n]*-->/
  if (!todoRe.test(section)) return null // 无骨架 TODO（手写正文）→ 不动
  const matrix = buildDecisionChainMatrix(changeDir)
  if (!matrix || matrix.rows.length === 0) return null
  const block = [
    '<!-- 机械半边预填（CLI，P0-1）：D→FR→task 链自 decisions.md × tasks/*.md frontmatter 结构化字段构建；',
    '     Evidence / 状态两列是人工判断——逐格复核，未闭环行必须在报告标注风险 -->',
    '| 决策 ID | FR | Task | Evidence | 状态 |',
    '|---|---|---|---|---|',
    ...matrix.rows,
  ].join('\n')
  const next = text.slice(0, headingIdx) + section.replace(todoRe, block) + text.slice(sectionEnd)
  try {
    writeFileSync(mdPath, next)
  } catch (e) {
    console.warn(`⚠️ 决策追踪矩阵预填落盘失败（fail-soft）: ${e && e.message ? e.message : e}`)
    return null
  }
  return { decisions: matrix.decisionCount, tasks: matrix.taskCount }
}

/**
 * 生成 verify-result.md 骨架（七章节；探针结果机械预填，语义章节 <!--TODO--> 占位）。
 * 结论走「结论枚举：」固定槽行（刀③，2026-09-08）——占位符不含枚举词（<待填：三选一>），
 * 槽未填 → extractVerifyConclusionSlot 返回 '' → gate 判不过（fail-closed；旧占位符
 * `<待填：PASS 或 FAIL>` 含 PASS 字样会被窗口正则误读成已填 PASS，已修）。
 * 章节标题行末尾带 claims 层标注（P3b）：探针结果=可复跑探针 / 测试结果=确定性检查 / 其余=
 * 人工判断——纯渲染层后缀，不新增行；结论解析槽优先于标题关键词窗口（存量兼容）。
 * @returns {string|null} 骨架全文；无 design.md/tasks.md（非完整流程变更）→ null
 */
export function generateVerifyResultSkeleton(result) {
  const L = [
    '# 验证报告（骨架由 `sillyspec verify-probes --change <变更名> --init` 生成）',
    '',
    '> 探针结果已机械预填；其余章节把 `<!--TODO-->` 替换为真实内容。**结论只认「结论枚举：」槽行**——',
    '> 槽行留「<待填：三选一>」会被 gate 判不过（fail-closed），正文其他位置的 PASS/FAIL 字样不参与判定。',
    '>',
    '> 「层」=证据可核验性分层（非执行者声明）：「人工判断」指本节为语义判断，由执行 agent 填写、',
    '> CLI 不机械复跑（gate 抽查 + 人类审批点复核兜底）；「可复跑探针/确定性检查/CLI 一致性校验」= gate 可机械复核段。',
    '',
    '## 结论 [层：人工判断]',
    '',
    '结论枚举：`<待填：三选一>`（把尖括号占位整体替换为 PASS / PASS WITH NOTES / FAIL 之一；一句话理由写在枚举后同行或下一行）',
    '',
    '## 证据账（cannot_verify 任务） [层：人工判断——CLI 核验]',
    '<!-- 无 cannot_verify 任务时本节写「无」；有则逐 task 一行 -->',
    '- task-NN: <待填：三选一> | verifiedFiles: <精确路径，逗号分隔>（satisfied 必填；豁免时填 missing 并加（豁免：<一句话理由>）后缀）',
    '',
    '## 集成验证回执 [层：自述声明——CLI 一致性校验]',
    '<!-- integration-critical/deployment-critical 变更必填；其余写「无」 -->',
    '- claim: <待填：一句话> | command: <待填：命令> | exit: <待填：0 或非 0> | log: <待填：日志路径>',
    '',
    '## 任务完成度 [层：人工判断]',
    '<!--TODO: 逐 task 对照 tasks.md 勾选与验收标准，完成/未完成/存疑三态-->',
    '',
    '## 设计一致性 [层：人工判断]',
    '<!--TODO: 实现与 design.md 的偏差（无偏差也显式写「一致」）-->',
    '',
    '## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]',
    renderVerifyProbesReport(result),
    '',
    '## 测试结果 [层：确定性检查——CLI 实测对账]',
    '<!--TODO: 测试命令 + 结果（通过数/失败数；known_failures 豁免逐条注明）-->',
    '',
    '## 决策追踪矩阵（如存在 decisions.md；无则删本节） [层：人工判断]',
    '<!--TODO: | 决策 ID | FR | Task | Evidence | 状态 |（D-xxx@vN → FR-xxx → task → 证据回指闭环）-->',
    '',
    '## 技术债务 [层：人工判断]',
    '<!--TODO: TODO/FIXME/HACK 统计（探针 1 的命中已预填在上方探针结果）-->',
    '',
    '## 变更风险等级 [层：人工判断]',
    '<!--TODO: doc-only / unit-sufficient / contract-required / integration-critical / deployment-critical；若 design.md frontmatter 有 risk_level 显式声明，写明「显式声明 = <等级>」+ 理由；若有命中被同句否定语境抑制（如「不新增 daemon 协议」），写明被抑制关键词与理由（抑制可审计，不许用来静默降级）-->',
    '',
    '## Runtime Evidence [层：人工判断]',
    '<!--TODO: 关键命令输出/时间戳/commit hash 证据链；integration/deployment-critical 必填，按实际触碰的运行时组件写（启动命令/端点/请求响应/日志片段/生命周期终态断言/失败模式排除），未涉及的行写「不涉及」-->',
    '',
    '## 代码审查 [层：人工判断]',
    '<!--TODO: 问题列表 + 总体评价-->',
    '',
  ]
  return L.join('\n')
}
