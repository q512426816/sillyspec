/**
 * review-material-pack.js — 评审材料包（2026-09-19-review-material-pack / D-001~D-002）
 *
 * 结构病根（2026-09-19 成本复盘实证：评审 ~200x 信息放大）：每次独立评审从零重建仓库认知，
 * 根因是阶段 prompt 的必读清单（旧 brainstorm.js :417/:424 的两条全读指令——本变更 task-02
 * 已删）优先级压过增量回灌块。本模块是材料包的组装单点：
 *   四阶段包形态（D-002）：
 *     grill-first  = designDigest + fileList + crossPoints[≤5] + snippets[]（点名源码片段）
 *     plan-review  = hardConstraintDelta[]（plan 相对 design 硬约束的差量）
 *     execute-qa   = diffSummary + designHotZone + checklist
 *     re-review    = priorFindings + fixDiff（经 {PRIOR_REVIEW_FACTS} 复审基线段渲染，非本模块槽）
 *   槽位分权（design Wave 1.1）：三阶段走 {REVIEW_MATERIALS}；再审走 {PRIOR_REVIEW_FACTS}
 *   （stage-review.js renderPriorRoundFindingsMd 排他语化——task-02）且模板不含本槽。
 *
 * 基准面语义（D-004，由 task-02 写进 prompt）：包是必答基准面非禁读清单——包外可定向查证
 * 但须列明、禁全量扫读；评审者自检「包不足→cannot_verify＋列缺件」。
 *
 * 纯函数为主；extractDiffSummary 的 base 解序复用 resolveVerifyChangedFiles（verify-postcheck.js:1113
 * 既有锚点优先级 actualBaseHash/baselineCommit＞baseHash——禁独立解 base，防重蹈 baseline
 * 同步文件误入坑，fact-face-checkpoint-pollution 同族）。
 *
 * CLI 半边装配（2026-09-19-review-material-cli-wiring，Gap 1 收口）：assembleStageReviewMaterials
 * 是 prompt.js tier 注入链的组包入口——机械抽素材半边（designDigest/fileList/硬约束/diff/热区/
 * checklist），主代理点名半边（五交叉点/plan 差量）留位不预填（decisions.md D-002）。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { REVIEW_CHECKLISTS } from './stage-review-checklist.js'

/** 材料包渲染上限（防病态体量：包本身不能成为新的全量扫读面） */
const PACK_MAX_CHARS = 12000
const SNIPPET_MAX_CHARS = 2400

/** 截断工具：超限加省略号注记 */
function clamp(text, max, label) {
  const s = String(text || '')
  if (s.length <= max) return s
  return s.slice(0, max) + `\n…（${label} 超 ${max} 字符截断——需全文时定向查证并列明）`
}

/**
 * design 热区抽取（execute.js:979-1023 designHotzone 先例泛化）：按节名抽取指定 section 的
 * 正文（## 标题起、下一 ## 止）。sections 缺省取评审最常用的两节（非目标/兼容策略）。
 * @returns {string} 「### <节名>\n<body」拼接；无命中返回空串。
 */
export function extractDesignHotZone(designContent, sections = ['非目标', '兼容策略']) {
  const text = String(designContent || '')
  if (!text) return ''
  const parts = []
  for (const name of sections) {
    const re = new RegExp(`^#{2,3}\\s*[^\\n]*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*$`, 'm')
    const heading = text.match(re)
    if (!heading) continue
    const start = heading.index + heading[0].length
    const rest = text.slice(start)
    const next = rest.match(/^#{2,3}\s/m)
    const body = (next ? rest.slice(0, next.index) : rest).trim()
    if (body) parts.push(`### ${name}\n${body}`)
  }
  return parts.join('\n\n')
}

/**
 * diff 摘要抽取（base 解序对齐既有基建）：文件名单委托 resolveVerifyChangedFiles（锚点优先级
 * actualBaseHash/baselineCommit＞baseHash 由该函数内部解析），±行数经 git diff --stat 叠加。
 * namesOnly 版不跑 --stat（评审只要名单时省一次 git）。
 * @returns {{ files: string[], stat: string }} stat 为 --stat 尾段文本（best-effort，失败空串）。
 */
export async function extractDiffSummary({ cwd, changeName, specBase, withStat = true, statText = null }) {
  const { resolveVerifyChangedFiles } = await import('./verify-postcheck.js')
  const files = resolveVerifyChangedFiles(cwd, changeName, null, { specBase }) || []
  // QA Gap 3 修正：stat 窗口对齐文件名单（按名单限定路径跑工作树口径 --stat，伪装 HEAD~1 三元已除）；
  // 多提交窗口的精确 stat 由主代理组包时显式传入 statText 覆盖（buildReviewMaterialPack 的
  // diffSummary.stat 消费同一字符串）——base 解序仍单点在 resolveVerifyChangedFiles 内部。
  let stat = statText != null ? String(statText) : ''
  if (statText == null && withStat && files.length > 0) {
    try {
      const { safeGit } = await import('./git-helper.js')
      // safeGit 返回 { value, error } 非裸串（git-helper.js:95）——取 .value；此前 String(整个对象)
      // 渲染成 [object Object]（2026-09-19-review-material-cli-wiring dogfood 注入接线时咬出：
      // 零生产调用期潜伏，接线后成活面）。
      const out = safeGit(cwd, ['diff', '--stat', 'HEAD', '--', ...files], { trim: false })
      stat = String((out && out.value) || '')
    } catch { /* stat best-effort：失败只降级为名单 */ }
  }
  return { files, stat: clamp(stat, 2000, 'diff --stat') }
}

/**
 * 源码片段抽取（点名文件×行窗）：crossPoints 的 snippets 组装器。
 * @param {Array<{file: string, from?: number, to?: number}>} anchors
 * @returns {string} 「`file:from-to`\n```…```」拼接（每片段独立 clamp）。
 */
export function extractSnippets(repoRoot, anchors = []) {
  const parts = []
  for (const a of anchors.slice(0, 8)) {
    if (!a || !a.file) continue
    try {
      const lines = readFileSync(join(repoRoot, a.file), 'utf8').split('\n')
      const from = Math.max(1, Number(a.from) || 1)
      const to = Math.min(lines.length, Number(a.to) || from + 29)
      const body = lines.slice(from - 1, to).map((l, i) => `${from + i}\t${l}`).join('\n')
      parts.push('`' + a.file + ':' + from + '-' + to + '`\n' + clamp(body, SNIPPET_MAX_CHARS, a.file))
    } catch { /* 不可读文件跳过（评审者自检会列缺件） */ }
  }
  return parts.join('\n\n')
}

/**
 * 四阶段材料包组装（纯渲染，不落盘）。
 * @param {'grill-first'|'plan-review'|'execute-qa'|'re-review'} stage
 * @param {object} inputs 按 stage 取用：
 *   grill-first: { designDigest, fileList[], crossPoints[{title,anchors[{file,from,to}]}], repoRoot }
 *   plan-review: { hardConstraints[{id,text}], planDelta[{id,status,note}] }
 *   execute-qa:  { diffSummary{files,stat}, designContent, checklist[] }
 *   re-review:   { priorFindingsMd, fixDiff } （提示：re-review 经 {PRIOR_REVIEW_FACTS} 渲染，
 *                本函数产出仅供该渲染体拼装——不进 {REVIEW_MATERIALS} 槽，槽位分权铁律）
 * @returns {string} 注入文本（含基准面语义头）
 */
export function buildReviewMaterialPack(stage, inputs = {}) {
  const header = '## 评审材料包（基准面——checklist 逐条只对本包作答；包外定向查证合法但须列明，禁全量扫读；包不足以作答时 cannot_verify＋列缺件）\n'
  let body = ''
  if (stage === 'grill-first') {
    const pts = (inputs.crossPoints || []).slice(0, 5).map((p, i) => `${i + 1}. ${p.title}${p.anchors && p.anchors.length ? '\n' + extractSnippets(inputs.repoRoot || '.', p.anchors) : ''}`)
    body = [
      '### design 要点', clamp(inputs.designDigest || '', 4000, 'designDigest'),
      '### 文件清单', (inputs.fileList || []).map(f => '- ' + f).join('\n') || '（无）',
      '### 五个交叉点（主代理点名）', pts.join('\n') || '（无——主代理未点名，评审者按 cannot_verify 列缺件）',
    ].join('\n\n')
  } else if (stage === 'plan-review') {
    const hc = (inputs.hardConstraints || []).map(h => `- [${h.id}] ${h.text}`).join('\n')
    const delta = (inputs.planDelta || []).map(d => `- [${d.id}] ${d.status}${d.note ? '——' + d.note : ''}`).join('\n')
    body = ['### design 硬约束', hc || '（无）', '### plan 差量（逐约束判定：一致/偏离/未覆盖）', delta || '（无——主代理未提供差量，评审者按 cannot_verify 列缺件）'].join('\n\n')
  } else if (stage === 'execute-qa') {
    // 测试清单（R16 减负批次 2026-09-24）：diff 命中的测试文件点名——QA 对「组装行为」条目
    // 作答时不必全仓找测试（R14 对撞失控勘察子代理 2.33M 的反面教材后，包内点名收窄查证面）。
    const testFiles = (inputs.diffSummary && inputs.diffSummary.files || [])
      .filter(f => /(^|[\\/])(tests?|__tests__)([\\/])|\.(test|spec)\.[cm]?[jt]sx?$|_test\.(go|py)$|(^|[\\/])test_[^\\/]+\.py$/i.test(f))
      .slice(0, 30)
    body = [
      '### diff 摘要', (inputs.diffSummary && inputs.diffSummary.files || []).map(f => '- ' + f).join('\n') || '（无）',
      inputs.diffSummary && inputs.diffSummary.stat ? '```diff\n' + inputs.diffSummary.stat + '\n```' : '',
      '### 测试清单（diff 命中的测试文件）', testFiles.map(f => '- ' + f).join('\n') || '（diff 无测试文件——「组装行为」条目按包不足处理：cannot_verify 列缺件或定向查证并列明）',
      '### design 热区（CLI 抽取）', extractDesignHotZone(inputs.designContent || '') || '（无命中节）',
      '### 验收清单', (inputs.checklist || []).map(c => '- [ ] ' + c).join('\n') || '（无）',
    ].filter(Boolean).join('\n\n')
  } else if (stage === 're-review') {
    body = ['### 上一轮 findings', clamp(inputs.priorFindingsMd || '', 4000, 'priorFindings'), '### 对应修复 diff', clamp(inputs.fixDiff || '', 4000, 'fixDiff')].join('\n\n')
  } else {
    return ''
  }
  return clamp(header + '\n' + body, PACK_MAX_CHARS, '材料包')
}

// ══ CLI 半边素材装配（2026-09-19-review-material-cli-wiring，Gap 1 收口）══════════
// prompt.js tier 注入链的组包入口：机械抽取各阶段素材后调 buildReviewMaterialPack。
// 主代理点名半边（grill 五交叉点 / plan 差量判定）恒不预填——留位缺件提示由模板补位
// 指引接手（decisions.md D-002）。re-review 不在本函数面（两槽互斥铁律，走
// {PRIOR_REVIEW_FACTS}）。整体 best-effort：异常/素材全缺 → ''（与占位符缺失同态）。

/** design.md 章节行号索引（execute.js:1011 先例）：`L<行> ## <节名>` 全列。 */
function sectionIndexLines(designContent) {
  const out = []
  String(designContent || '').split('\n').forEach((l, i) => {
    const m = l.match(/^##\s+(.+)$/)
    if (m) out.push(`L${i + 1} ## ${m[1].trim()}`)
  })
  return out
}

/** 抓 section 裸正文（## 标题起、下一 ## 止）——extractDesignHotZone 的无拼装版。 */
function sectionBody(text, name) {
  const re = new RegExp(`^#{2,3}\\s*[^\\n]*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*$`, 'm')
  const heading = text.match(re)
  if (!heading) return ''
  const start = heading.index + heading[0].length
  const rest = text.slice(start)
  const next = rest.match(/^#{2,3}\s/m)
  return (next ? rest.slice(0, next.index) : rest).trim()
}

/** design.md「文件变更清单」表路径列机械解析（第二列剥反引号与 NEW:/MOD: 前缀——操作列已含
 *  新增/修改语义，前缀不重复进清单；表头/分隔行跳过；cap 40）。 */
function extractDesignFileList(designContent) {
  const body = sectionBody(designContent, '文件变更清单')
  const out = []
  for (const line of body.split('\n')) {
    const t = line.trim()
    if (!t.startsWith('|')) continue
    const cols = t.split('|').map(c => c.trim())
    if (cols.length < 3) continue
    const path = (cols[2] || '').replace(/^`+|`+$/g, '').replace(/^(?:NEW|MOD):/, '')
    if (!path || path === '文件路径' || /^-+$/.test(path)) continue
    out.push(path)
  }
  return out.slice(0, 40)
}

/** design.md「全局硬约束」节编号/圆点行 → [{id:'HC-n', text}]（cap 10）。 */
function extractHardConstraints(designContent) {
  const body = sectionBody(designContent, '全局硬约束')
  const out = []
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*(?:\d+[.、)]|[-*])\s+(.+)$/)
    if (!m) continue
    const text = m[1].trim()
    if (text) out.push({ id: `HC-${out.length + 1}`, text })
    if (out.length >= 10) break
  }
  return out
}

/** decisions.md accepted 且 P0/P1 的条目兜底（design 缺「全局硬约束」节时）——cap 10。 */
function extractDecisionConstraints(decisionsContent) {
  const out = []
  for (const b of String(decisionsContent || '').split(/^##\s+/m).slice(1)) {
    const hm = (b.split('\n')[0] || '').match(/^(D-\d+@\w+):\s*(.+)$/)
    if (!hm) continue
    const status = (b.match(/^-\s*status:\s*(\w+)/m) || [])[1]
    const prio = (b.match(/^-\s*priority:\s*(P[012])/m) || [])[1]
    if (status !== 'accepted' || (prio !== 'P0' && prio !== 'P1')) continue
    out.push({ id: hm[1], text: `${hm[2].trim()}（${prio} 决策）` })
    if (out.length >= 10) break
  }
  return out
}

/**
 * CLI 半边素材装配（详见文件首注释块）。cwd 仅作 grill 阶段 extractSnippets 的 repoRoot
 * 传递（交叉点留位时不触达）；diff 解序单点在 extractDiffSummary→resolveVerifyChangedFiles。
 * @param {'grill-first'|'plan-review'|'execute-qa'} stage
 * @returns {Promise<string>} 注入文本；素材全缺/未知 stage/参数缺失 → ''。
 */
export async function assembleStageReviewMaterials({ stage, cwd, changeName, specBase }) {
  try {
    if (!stage || !changeName || !specBase) return ''
    const changeDir = join(specBase, 'changes', changeName)
    let designContent = ''
    try { designContent = readFileSync(join(changeDir, 'design.md'), 'utf8') } catch { /* design 缺失→按阶段判定素材是否全缺 */ }
    if (stage === 'grill-first') {
      if (!designContent) return ''
      const idx = sectionIndexLines(designContent)
      const digestBody = extractDesignHotZone(designContent, ['背景', '设计目标'])
      const designDigest = [
        idx.length ? '章节行号索引（需要其余章节时按行号定向读并列明，禁全量扫读）：\n' + idx.join('\n') : '',
        digestBody,
      ].filter(Boolean).join('\n\n') || '（design 无背景/设计目标/章节可抽取——按章节索引定向读 design.md 对应节并列明）'
      return buildReviewMaterialPack('grill-first', {
        designDigest,
        fileList: extractDesignFileList(designContent),
        crossPoints: [],
        repoRoot: cwd,
      })
    }
    if (stage === 'plan-review') {
      let hardConstraints = extractHardConstraints(designContent)
      if (hardConstraints.length === 0) {
        try { hardConstraints = extractDecisionConstraints(readFileSync(join(changeDir, 'decisions.md'), 'utf8')) } catch { /* decisions 缺失→素材全缺 */ }
      }
      if (hardConstraints.length === 0) return ''
      return buildReviewMaterialPack('plan-review', { hardConstraints, planDelta: [] })
    }
    if (stage === 'execute-qa') {
      const diffSummary = await extractDiffSummary({ cwd, changeName, specBase })
      if (!designContent && (!diffSummary || (diffSummary.files || []).length === 0)) return ''
      return buildReviewMaterialPack('execute-qa', { diffSummary, designContent, checklist: REVIEW_CHECKLISTS.execute })
    }
    return ''
  } catch { /* 装配 best-effort：失败零注入（与占位符缺失同态） */ }
  return ''
}

// ══ execute 任务材料包（2026-09-21-r5-efficiency-batch1 task-02，B-④ / D-003）════
// 两段式装配：稳定段（design.md「接口定义」「文件变更清单」固定节名机械选取原文 + 签名锚点）
// 在前、专属段（task 卡 title/goal/implementation/acceptance + allowed_paths）在后——稳定前缀
// 跨任务共享，兑现统一前缀缓存收益（压 task-08 型子代理轮均 148K vs 同侪 45-92K 差额）。
// 只摘不译（D-003 错键正典红线）：一切内容为源文件原文逐字摘录/字段机械抽取，禁转写缩写。

/** 材料包字节上限（专属段尾部优先截；稳定段超限按节优先级截断——见 assembleExecuteTaskMaterials） */
const EXEC_MATERIALS_MAX_BYTES = 24576
/** 被截节保底形态里「首个代码块/表格」的块级上限（单块病态体量防穿顶） */
const EXEC_STUB_BLOCK_MAX_BYTES = 3600

function bytesOf(s) { return Buffer.byteLength(String(s || ''), 'utf8') }

/** 字节安全截断（按 UTF-8 字节预算切，不切断多字节字符） */
function byteSafeSlice(text, maxBytes) {
  const s = String(text || '')
  if (bytesOf(s) <= maxBytes) return s
  let out = ''
  let used = 0
  for (const ch of s) {
    const b = Buffer.byteLength(ch, 'utf8')
    if (used + b > maxBytes) break
    out += ch
    used += b
  }
  return out
}

/** 节内首个完整代码块（``` 围栏）或表格（连续 | 行）——被截节的保底保留形态 */
function firstBlockOrTable(body) {
  const fence = body.match(/```[^\n]*\n[\s\S]*?```/)
  if (fence) return fence[0]
  const lines = body.split('\n')
  const start = lines.findIndex(l => l.trim().startsWith('|'))
  if (start >= 0) {
    let end = start
    while (end < lines.length && lines[end].trim().startsWith('|')) end++
    return lines.slice(start, end).join('\n')
  }
  return null
}

/** task 卡 frontmatter 块级解析（机械逐字）：顶格 key 行归属，其后缩进行归当前 key */
function splitTaskCardFields(cardText) {
  const m = String(cardText || '').match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  const fields = {}
  let cur = null
  for (const line of m[1].split(/\r?\n/)) {
    if (/^[A-Za-z_][\w-]*:/.test(line)) {
      const at = line.indexOf(':')
      cur = { key: line.slice(0, at), raw: line.slice(at + 1).trim(), lines: [] }
      fields[cur.key] = cur
    } else if (cur) {
      cur.lines.push(line)
    }
  }
  return fields
}

function unquoteScalar(v) {
  const s = String(v || '')
  return s.replace(/^'(.*)'$/s, '$1').replace(/^"(.*)"$/s, '$1')
}

/**
 * task 卡字段取值（只摘不译——原文保持，无 YAML 折叠语义改写）：
 * 块标量（>/|）→ 原始行去公共缩进后逐行拼接；列表 → `- ` 后原文数组；标量 → 去包裹引号。
 * @returns {string|string[]}
 */
function taskCardFieldValue(field) {
  if (!field) return ''
  if (/^[>|][+-]?$/.test(field.raw)) {
    const indents = field.lines.filter(l => l.trim()).map(l => l.match(/^[ \t]*/)[0].length)
    const cut = indents.length ? Math.min(...indents) : 0
    return field.lines.map(l => (l.trim() ? l.slice(cut) : '')).join('\n').trim()
  }
  if (field.raw) return unquoteScalar(field.raw)
  const items = []
  for (const l of field.lines) {
    const im = l.match(/^\s*-\s?(.*)$/)
    if (im && im[1].trim()) items.push(im[1].trim())
  }
  return items
}

/**
 * 组装 execute 任务材料包（两段式，只摘不译——契约见 change design.md「接口定义」）。
 * @param {object} opts
 * @param {string} opts.changeDir         - 变更目录（读 design.md / tasks/task-NN.md）
 * @param {string} opts.taskId            - 'task-NN'
 * @param {string} [opts.materialsDir]    - 落盘目录；缺省 → 不落盘不抛错返回 null（additive）
 * @param {Array<{symbol: string, file: string, line: number}>} [opts.signatureAnchors]
 *                                        - 接口签名锚点（可选，调用方供给；缺省空）
 * @returns {Promise<{path: string, bytes: number, truncated: boolean}|null>}
 *   截尾序：①专属段尾部优先截（稳定段全量保留）；②稳定段自身超限按节优先级（接口定义 >
 *   文件变更清单——高优先节后截）逐节降为「节头 + 首个代码块/表格 + 回源指引行」；锚点永不丢。
 */
export async function assembleExecuteTaskMaterials({ changeDir, taskId, materialsDir, signatureAnchors }) {
  if (!changeDir || !taskId || !materialsDir) return null
  const designPath = join(changeDir, 'design.md')
  const taskCardPath = join(changeDir, 'tasks', `${taskId}.md`)
  let designContent = ''
  let cardContent = ''
  try { designContent = readFileSync(designPath, 'utf8') } catch { /* 缺 design → 稳定段只剩锚点 */ }
  try { cardContent = readFileSync(taskCardPath, 'utf8') } catch { /* 缺卡 → 专属段仅回源指引 */ }

  // ── 稳定段素材：固定节名机械选取（缺节跳过）+ 签名锚点行 ──
  const anchors = (Array.isArray(signatureAnchors) ? signatureAnchors : [])
    .filter(a => a && a.symbol)
    .map(a => `- \`${String(a.symbol)}\` → ${a.file || '?'}:${a.line || '?'}`)
  const anchorsBlock = anchors.length ? `### 接口签名锚点\n\n${anchors.join('\n')}` : ''

  const SECTION_SPECS = [{ name: '接口定义' }, { name: '文件变更清单' }] // 序 = 保留优先级序
  const secBlocks = SECTION_SPECS
    .map(s => ({ ...s, body: sectionBody(designContent, s.name) }))
    .filter(s => s.body)
    .map(s => ({ ...s, full: `### ${s.name}（design.md 原文摘录）\n\n${s.body}` }))

  /** 被截节残体：节头 + 首个代码块/表格（块级 clamp）+ 一行回源指引 */
  const stubOf = s => {
    const first = firstBlockOrTable(s.body)
    const kept = first
      ? (bytesOf(first) > EXEC_STUB_BLOCK_MAX_BYTES ? byteSafeSlice(first, EXEC_STUB_BLOCK_MAX_BYTES) + '\n…（首块超限截断）' : first)
      : byteSafeSlice(s.body, 600)
    return `### ${s.name}（design.md 原文摘录）\n\n${kept}\n\n完整内容回源：${designPath}#${s.name}`
  }

  // ── 专属段素材：task 卡要点（机械摘录）+ allowed_paths + 回源指引 ──
  const fields = splitTaskCardFields(cardContent)
  const val = k => taskCardFieldValue(fields[k])
  const bulletList = v => (Array.isArray(v) ? v.map(i => `  - ${i}`).join('\n') : `  - ${v}`)
  const title = val('title')
  const goal = val('goal')
  const impl = val('implementation')
  const acc = val('acceptance')
  const paths = val('allowed_paths')
  const cardLines = [
    title ? `- title：${title}` : '',
    goal ? `- goal：${goal}` : '',
    impl ? `- implementation：\n${bulletList(impl)}` : '',
    acc ? `- acceptance：\n${bulletList(acc)}` : '',
  ].filter(Boolean).join('\n')
  const dedicatedFull = [
    cardLines ? `### 任务卡要点（tasks/${taskId}.md 摘录）\n\n${cardLines}` : '',
    Array.isArray(paths) && paths.length ? `### allowed_paths\n\n${paths.map(p => `- ${p}`).join('\n')}` : '',
    `### 回源指引\n\n- design.md：${designPath}\n- 任务卡：${taskCardPath}`,
  ].filter(Boolean).join('\n\n')

  // ── 装配（稳定段在前、专属段在后）+ 字节预算 ──
  const packTitle = `# execute 任务材料包：${taskId}`
  const packNote = '> 两段式：稳定段（design 契约节原文摘录）在前、专属段（task 卡摘录）在后。\n> 只摘不译——正文均为源文件原文逐字摘录；与源文件冲突时以源文件为准，按锚点回源核对。'
  const stableTitle = '## 稳定段（design 契约节原文摘录——跨任务稳定）'
  const dedicatedTitle = `## 专属段（${taskId} 专属）`
  const tailMarker = `…（专属段超限截尾——完整内容回源：${taskCardPath}）`
  const joinParts = parts => parts.filter(Boolean).join('\n\n')
  const assemble = (secs, dedicatedText) =>
    joinParts([packTitle, packNote, stableTitle, ...secs, anchorsBlock, dedicatedTitle, dedicatedText])

  let truncated = false
  const sections = secBlocks.map(s => s.full)
  let content = assemble(sections, dedicatedFull)

  if (bytesOf(content) > EXEC_MATERIALS_MAX_BYTES) {
    truncated = true
    // ① 专属段尾部优先截：稳定段全量保留，专属段按剩余预算截尾
    const clampDedicated = () => {
      const head = assemble(sections, '')
      const room = EXEC_MATERIALS_MAX_BYTES - bytesOf(head) - bytesOf('\n\n') - bytesOf(tailMarker) - 1
      if (room < 0) return false
      const sliced = byteSafeSlice(dedicatedFull, room)
      content = head + '\n\n' + (sliced ? sliced + '\n' + tailMarker : tailMarker)
      return true
    }
    if (!clampDedicated()) {
      // ② 稳定段自身超限：按节优先级（接口定义 > 文件变更清单）低优先节先降为残节，逐节重试
      for (let i = secBlocks.length - 1; i >= 0; i--) {
        sections[i] = stubOf(secBlocks[i])
        if (clampDedicated()) break
      }
    }
    // ③ 终极兜底（双节皆残仍超限——仅病态锚点面可达）：字节安全截 + 锚点块强制保留
    if (bytesOf(content) > EXEC_MATERIALS_MAX_BYTES && anchorsBlock) {
      const cut = content.indexOf(anchorsBlock)
      const before = (cut > 0 ? content.slice(0, cut) : content).replace(/\n+$/, '')
      content = byteSafeSlice(before, EXEC_MATERIALS_MAX_BYTES - bytesOf('\n\n' + anchorsBlock)) + '\n\n' + anchorsBlock
    } else if (bytesOf(content) > EXEC_MATERIALS_MAX_BYTES) {
      content = byteSafeSlice(content, EXEC_MATERIALS_MAX_BYTES)
    }
  }

  mkdirSync(materialsDir, { recursive: true })
  const outPath = join(materialsDir, `${taskId}.md`)
  writeFileSync(outPath, content, 'utf8')
  return { path: outPath, bytes: bytesOf(content), truncated }
}
