/**
 * quick-gate-profile.js — quick 出口分级门禁画像（信号层，纯函数零 IO）
 *
 * quick --done 分级门禁的信号单一来源（2026-09-14-quick-exit-tiered-gates task-01 / FR-02）：
 * 输入 CLI 审计链的 git 事实 changedFiles（非 --files 自声明）+ 调用方传入的 moduleIndex
 * （_module-map.yaml 解析结果），输出 L0/L1/L2 画像与检查项，供 Wave 2 接线消费
 * （run/shared.js 挂 review.gateProfile → complete-handlers 落账 / quick-audit 打印 /
 * scope-audit 表格与 --json 双出口）。本模块零 IO、零子进程：moduleIndex、风险表、阈值
 * 全部由参数或默认值提供（D-007 独立纯函数模块；R-04 画像=纯字符串运算）。
 *
 * 判级（阈值只引用 THRESHOLDS 常量，不散落字面量）：
 *   正常态（moduleIndex 可用）：L2 = 跨 ≥L2_SPAN 模块 或 风险命中；L1 = 跨 ≥L1_SPAN 模块
 *     或 ≥L1_FILES 文件；否则 L0。
 *   降级态（moduleIndex 为 null/undefined/空，如未 scan / 无 module-map 的存量项目）：
 *     span 退出判级，L2 = ≥L2_FILES_DEGRADED 文件 或 风险命中；L1 = ≥L1_FILES 文件。
 *   全部 advisory（D-003：升 blocking 是另立变更的显式决策），不抛错不阻断。
 *
 * 计数口径（design 接口定义，勿自创字段）：
 *   fileCount     = 全部变更文件数（判级用的「文件数」信号与之一致——与旧「≤3 文件」规则
 *                   及 sillyhub 校准统计同基）；
 *   testFileCount = 非文档文件中：路径含 __tests__/、/tests/ 目录段、basename test_ 前缀
 *                   （python 风格）或 .test./_test./.spec. 命名（对齐仓内既有测试判定先例）；
 *   codeFileCount = 其余非文档文件。文档口径沿用 docSyncHint 的 isDoc（run/shared.js
 *                   auditQuickCompletion 内 isDocFile 同款：.md/.yaml/.yml 扩展或 docs/、
 *                   .sillyspec/docs/ 前缀——模块卡与 changelog sidecar 均 .md 天然覆盖），
 *                   文档文件不计入 testFileCount/codeFileCount，也不参与模块归属与风险命中。
 */
import { QUICK_RISK_PATH_PATTERNS } from './change-risk-profile.js'

/** 代码内默认阈值（task-05 真实图谱校准定稿，缺省行为的单一事实源；local.yaml quick-gate 段可覆写，D-009）。
 *  定稿依据（2026-09-14，sillyhub 919 条 quicklog × 5 份真实 _module-map.yaml 重算交叉表，
 *  证据全文见主仓 changes/2026-09-14-quick-exit-tiered-gates/design.md「阈值校准记录」）：
 *  L1_SPAN=2 落在文档同步率断崖上（≤3 文件档 span1 33.3% → span2-3 5.9%，近期口径）；
 *  L2_SPAN=4 边界内格子全档最差（近期 span4+×4-10 文件 0-14.3%）；L1_FILES=4 维持旧规则
 *  「≤3 文件」边界连续性（文件维度无同步率断崖——量错维度的实证本身）；L2_FILES_DEGRADED=8
 *  覆盖降级档最差文件桶 7-10（32.9-35.3%）。四值与 brainstorm 初值一致，维持不调。 */
export const THRESHOLDS = {
  L1_SPAN: 2,            // 跨 ≥2 模块 → L1
  L1_FILES: 4,           // 或 ≥4 文件 → L1
  L2_SPAN: 4,            // 跨 ≥4 模块 → L2
  L2_FILES_DEGRADED: 8,  // module-map 缺失降级档：≥8 文件 → L2
}

/** local.yaml quick-gate 键 → THRESHOLDS 常量键（覆写面与代码默认值的单一对照）。 */
const GATE_KEY_TO_THRESHOLD = {
  l1_span: 'L1_SPAN',
  l1_files: 'L1_FILES',
  l2_span: 'L2_SPAN',
  l2_files_degraded: 'L2_FILES_DEGRADED',
}

/** 阈值合法性：≥1 的有限整数（0/负数会让一切改动升 L1、浮点/字符串无意义）。 */
function isValidThreshold(v) {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1
}

/**
 * 合并 local.yaml quick-gate 段覆写与代码默认值（D-009）。
 * @param {object} config local.yaml 解析结果（无 quick-gate 段 → 全默认；键非法回退默认并 warn）
 * @returns {{ l1_span: number, l1_files: number, l2_span: number, l2_files_degraded: number }}
 */
export function resolveGateThresholds(config) {
  const merged = {
    l1_span: THRESHOLDS.L1_SPAN,
    l1_files: THRESHOLDS.L1_FILES,
    l2_span: THRESHOLDS.L2_SPAN,
    l2_files_degraded: THRESHOLDS.L2_FILES_DEGRADED,
  }
  const section = config == null ? undefined : config['quick-gate']
  if (section == null) return merged
  if (typeof section !== 'object' || Array.isArray(section)) {
    console.warn('[quick-gate] local.yaml quick-gate 段须为键值对象，已忽略（使用默认阈值）')
    return merged
  }
  for (const [key, constName] of Object.entries(GATE_KEY_TO_THRESHOLD)) {
    if (!(key in section)) continue
    const v = section[key]
    if (isValidThreshold(v)) merged[key] = v
    else console.warn(`[quick-gate] local.yaml 配置键 quick-gate.${key}=${JSON.stringify(v)} 非法（须为 ≥1 整数），回退默认 ${THRESHOLDS[constName]}`)
  }
  return merged
}

// ── 计数口径判定（文档/测试/代码三分；口径见文件头注释） ──

/** 文档文件口径：沿用 docSyncHint 的 isDoc（run/shared.js auditQuickCompletion 内 isDocFile 逐款同源）。 */
function isDocPath(p) {
  return p.endsWith('.md') || p.endsWith('.yaml') || p.endsWith('.yml') ||
    p.startsWith('docs/') || p.startsWith('.sillyspec/docs/')
}

/** __tests__/ 或 tests/ 目录段（/test_ 前缀与命名判定在 isTestPath 内）。 */
const TEST_DIR_RE = /(^|\/)(__tests__|tests)\//i

/** 测试文件判定：目录段、basename test_ 前缀、.test./_test./.spec. 命名三信号任一命中。 */
function isTestPath(p) {
  if (TEST_DIR_RE.test(p)) return true
  const base = p.slice(p.lastIndexOf('/') + 1)
  if (/^test_/i.test(base)) return true
  return /[._](test|spec)\.[^.]+$/i.test(base)
}

/** moduleIndex 兼容两种形态：parseModuleMapSimple 扁平 { id: {...} } 或 { modules: {...} } 包装；空 → null（degraded）。 */
function resolveModulesObject(moduleIndex) {
  if (moduleIndex == null || typeof moduleIndex !== 'object') return null
  const wrapped = moduleIndex.modules
  const obj = wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped) ? wrapped : moduleIndex
  return Object.keys(obj).length > 0 ? obj : null
}

/** 一级归属：paths/core_files 字面量或目录前缀命中（与 docs-debt matchFilesToModules 一级口径同款，纯内存零 IO）。 */
function matchModuleForFile(posix, modulesObj) {
  for (const [id, m] of Object.entries(modulesObj)) {
    if (m == null || typeof m !== 'object') continue
    const prefixes = [...(Array.isArray(m.paths) ? m.paths : []), ...(Array.isArray(m.core_files) ? m.core_files : [])]
    for (const raw of prefixes) {
      const p = String(raw).replace(/\\/g, '/').replace(/\/+$/, '')
      if (!p) continue
      if (posix === p || posix.startsWith(p + '/')) return id
    }
  }
  return null
}

/** 卡片认领判定：模块 doc 字段（如 modules/core-engine.md）对应卡片文件在 changedFiles 内。
 *  changedFiles 为仓库根相对路径（如 .sillyspec/docs/<project>/modules/core-engine.md），
 *  本函数无 cwd/project 入参，按字面量或后缀对齐。 */
function cardInFiles(doc, fileSet) {
  const d = doc.replace(/\\/g, '/').replace(/^\.\//, '')
  for (const f of fileSet) {
    if (f === d || f.endsWith('/' + d)) return true
  }
  return false
}

/**
 * quick 出口门禁画像（纯函数：无 IO、无子进程，moduleIndex/风险表/阈值全由参数或默认值）。
 * @param {string[]} changedFiles 变更文件（CLI 审计链 git 事实；反斜杠自动归一 POSIX）
 * @param {object|null} moduleIndex _module-map.yaml 解析结果（null/undefined/空 → degraded）
 * @param {object} [opts]
 * @param {Array<{pattern: string, re: RegExp}>} [opts.riskTable] 路径模式风险表（默认 QUICK_RISK_PATH_PATTERNS）
 * @param {object} [opts.thresholds] 已合并阈值（resolveGateThresholds 产物；缺省用 THRESHOLDS，D-009）
 * @param {Array<{path: string}>} [opts.fileNotes] --file-notes 解析结果（perFileNotes 覆盖率判定）
 * @param {boolean} [opts.noDocs] --no-docs 显式豁免（docClaim → exempt-no-docs）
 * @returns 画像对象（字段与判级规则见 design.md 接口定义）
 */
export function computeGateProfile(changedFiles, moduleIndex, opts = {}) {
  const riskTable = Array.isArray(opts.riskTable) ? opts.riskTable : QUICK_RISK_PATH_PATTERNS

  // 阈值：opts.thresholds 逐键取合法值，否则回 THRESHOLDS 默认（warn 责任在 resolveGateThresholds）
  const th = {}
  for (const [key, constName] of Object.entries(GATE_KEY_TO_THRESHOLD)) {
    const v = opts.thresholds ? opts.thresholds[key] : undefined
    th[key] = isValidThreshold(v) ? v : THRESHOLDS[constName]
  }

  const files = (Array.isArray(changedFiles) ? changedFiles : [])
    .map((f) => String(f).replace(/\\/g, '/'))
    .filter(Boolean)

  const notedPaths = new Set(
    (Array.isArray(opts.fileNotes) ? opts.fileNotes : [])
      .filter((n) => n != null && typeof n.path === 'string' && typeof n.note === 'string' && n.note.trim() !== '')
      .map((n) => n.path.replace(/\\/g, '/')),
  )

  const codeFiles = []
  const testFiles = []
  for (const f of files) {
    if (isDocPath(f)) continue // 文档文件不计入两者、不参与归属与风险命中（口径见文件头）
    if (isTestPath(f)) testFiles.push(f)
    else codeFiles.push(f)
  }

  const modulesObj = resolveModulesObject(moduleIndex)
  const degraded = modulesObj === null

  // 模块归属（非文档文件 × paths/core_files 前缀聚类）；degraded 时不算，modules=[]、unmappedFiles=[]
  const modules = []
  const unmappedFiles = []
  if (!degraded) {
    const byModule = new Map()
    for (const f of [...codeFiles, ...testFiles]) {
      const id = matchModuleForFile(f, modulesObj)
      if (id == null) { unmappedFiles.push(f); continue }
      const entry = byModule.get(id)
      if (entry) entry.files.push(f)
      else byModule.set(id, { id, files: [f] })
    }
    modules.push(...byModule.values())
  }
  const moduleSpan = degraded ? null : modules.length

  // 风险命中：非文档文件 × 路径模式表（v1 仅路径模式，无 diff 关键词维度；元素只含 pattern/file）
  const riskHits = []
  for (const f of [...codeFiles, ...testFiles]) {
    for (const entry of riskTable) {
      const re = entry == null ? null : entry.re
      if (!(re instanceof RegExp)) continue
      if (re.global) re.lastIndex = 0 // 防调用方传入 /g 正则跨文件携带 lastIndex 状态
      if (re.test(f)) riskHits.push({ pattern: entry.pattern, file: f })
    }
  }

  // 判级：正常态 span 参与；degraded 态 span 退出（L1=≥l1_files、L2=≥l2_files_degraded 或风险命中）
  let level = 'L0'
  if (degraded) {
    if (files.length >= th.l2_files_degraded || riskHits.length > 0) level = 'L2'
    else if (files.length >= th.l1_files) level = 'L1'
  } else if (moduleSpan >= th.l2_span || riskHits.length > 0) level = 'L2'
  else if (moduleSpan >= th.l1_span || files.length >= th.l1_files) level = 'L1'

  // L1：--file-notes 覆盖率（changedFiles 全集均有非空注记 → true；`path::` 空括注不算——防形式化绕过；
  // 空集空真 true——L0 不消费）
  const perFileNotes = files.every((f) => notedPaths.has(f))

  // L1 机械规则：codeFileCount ≥2 且 testFileCount===0 → missing；codeFileCount ≤1 → na；其余 ok
  let testDelta
  if (codeFiles.length <= 1) testDelta = 'na'
  else if (testFiles.length === 0) testDelta = 'missing'
  else testDelta = 'ok'

  // L2：模块文档认领（触及模块中带 doc 卡片的模块，其卡片文件全在 changedFiles → claimed；
  // 无带卡片的触及模块（含 degraded）→ 无可认领，空真 claimed 不出假 advisory；--no-docs 优先豁免）
  let docClaim
  if (opts.noDocs) docClaim = 'exempt-no-docs'
  else {
    const fileSet = new Set(files)
    const claimable = modules.filter((e) => {
      const m = modulesObj == null ? null : modulesObj[e.id]
      return m != null && typeof m === 'object' && typeof m.doc === 'string' && m.doc.trim() !== ''
    })
    docClaim = claimable.every((e) => cardInFiles(modulesObj[e.id].doc, fileSet)) ? 'claimed' : 'missing'
  }

  // L2 风险命中：运行时证据要求（advisory 提示，不引入 quick 没有的 wait 机制）
  const runtimeEvidence = riskHits.length > 0 ? 'required' : 'na'

  return {
    fileCount: files.length,
    codeFileCount: codeFiles.length,
    testFileCount: testFiles.length,
    moduleSpan,
    modules,
    unmappedFiles,
    riskHits,
    level,
    degraded,
    checks: { perFileNotes, testDelta, docClaim, runtimeEvidence },
  }
}
