/**
 * ui-visual —— UI 视觉变更的「过程引导 + 收口痕迹对账」（2026-09-27-ui-visual-guidance）。
 *
 * 背景教训（平台仓 2026-09-26-core-pages-visual-redesign 实证）：视觉保真度在流程里零承接
 * ——design 写明截图走查硬门，verify 以「代码级佐证」降级放行仍 PASS，差距部署后才被肉眼
 * 发现。本模块补两件事（收口不产新证据，只验在场）：
 *   ① flow start 引导前置：检测 --input 触及前端页面或 UI → 输出「UI 变更执行须知」
 *      （改前确认视觉基准、边改边渲染对照、证据随手落变更目录 visual-evidence.md、
 *      视觉降级须用户裁决留痕）——agent 开工即知规程，不是收口才被告知；
 *   ② verify「UI 视觉证据」分级探针：UI 触达变更收口时验证据在场性——
 *      缺 visual-evidence.md → 默认 ⚠️ 警告（local.yaml ui_visual_gate: warn|error|off，
 *      默认 warn）；design/requirements 声明视觉降级而无用户裁决留痕 → 恒 ❌ error
 *      （仅 off 豁免）——堵 D-004 型静默降级。
 *
 * 仓中立：不硬编码任何特定仓的路径或命令（须知指引通用口径：原型、黄金页或现有截图均可为基准）。
 * 检测为纯函数；探针只读变更目录内文件，fail-soft 同探针 8-11 先例。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import jsYaml from 'js-yaml'

export const UI_VISUAL_PROBE_HEADING = '#### 探针 12：UI 视觉证据（分级门）'
export const UI_EVIDENCE_FILENAME = 'visual-evidence.md'

/* ── 检测启发式（正反例单测锁定；误判面=默认档一行警告，误漏面由文件面扩展名兜底）── */

// 词表不含后端高频通用词「渲染/组件/样式」：CLI「渲染输出」「组件」「输出样式」是常规后端
// 用语，2026-10-05-knowledge-stats-freshness 实测误触整段 UI 须知+探针 warn（描述该问题的
// input 自己也复触一次）；真 UI 信号由页面/前端/UI/视觉/界面/布局等词与扩展名兜底承接。
const UI_TOUCH_PATTERNS = [
  /页面/, /前端/, /\bUI\b/i, /视觉/, /界面/, /布局/, /主题色/, /配色/,
  /\.tsx?\b/, /\.jsx\b/, /\.vue\b/, /\.svelte\b/, /\.css\b/, /\.scss\b/, /\.html\b/,
  /原型/, /截图/,
]

/** input/规约文本是否触及前端页面或 UI（关键词启发式，≥1 命中即算）。 */
export function detectUiTouch(text) {
  if (!text || typeof text !== 'string') return false
  return UI_TOUCH_PATTERNS.some((re) => re.test(text))
}

/** 声明文件面是否含前端产物文件（design 清单路径扩展名口径——input 漏检的兜底源）。 */
export function detectUiTouchInPaths(paths) {
  if (!Array.isArray(paths)) return false
  return paths.some((p) =>
    /\.(tsx|jsx|vue|svelte|css|scss|less|html)$/i.test(String(p).replace(/^NEW:\s*/, '')),
  )
}

/* ── flow start 须知（仓中立；证据约定与探针同源）── */

/**
 * local.yaml ui_prototype 段解析（2026-10-15-ui-proto-form-config，FR-01）。
 * 每仓原型形态契约：form: real-code | single-html；豁免（single-html）须带 ruling{by,at,reason}
 * 全三字段（用户裁决留痕——缺任一=登记不完整，消费方须警告）；repos.<子仓键> 同构 override。
 * fail-soft：段缺席/文件不可读/YAML 坏/值非法 → registered:false 零抛出（与 readUiVisualGate
 * 同根同哲学）。诚实边界：工具只消费登记与注入指引，不校验原型质量。
 */
export function readUiPrototypeForm(specBase) {
  const empty = { registered: false, form: null, ruling: null, rulingComplete: false, repos: {} }
  if (!specBase) return empty
  let raw
  try {
    raw = jsYaml.load(readFileSync(join(specBase, 'local.yaml'), 'utf8'))
  } catch { return empty }
  const section = raw && typeof raw === 'object' ? raw.ui_prototype : null
  if (!section || typeof section !== 'object') return empty
  const parseEntry = (e) => {
    if (!e || typeof e !== 'object') return null
    const form = e.form === 'real-code' || e.form === 'single-html' ? e.form : null
    if (!form) return null
    const r = e.ruling && typeof e.ruling === 'object' ? e.ruling : null
    const rulingComplete = !!(r && r.by && r.at && r.reason)
    return { form, ruling: r, rulingComplete }
  }
  const top = parseEntry(section)
  const repos = {}
  if (section.repos && typeof section.repos === 'object') {
    for (const [key, val] of Object.entries(section.repos)) {
      const entry = parseEntry(val)
      if (entry) repos[key] = entry
    }
  }
  if (!top) return { registered: false, form: null, ruling: null, rulingComplete: false, repos }
  return { registered: true, ...top, repos }
}

/**
 * 多仓 override 解析（FR-02）：触达路径与 local.yaml repos 注册路径（key→path 映射，与
 * plan-postcheck parseRepoRegistry 同源语义）前缀匹配——命中的注册子仓若在 ui_prototype.repos
 * 有 override 则该形态优先；未命中/无 override 走仓级兜底。返回形态条目数组（去重）：
 * 每项 { scope: '仓级'|'<子仓键>', form, ruling, rulingComplete, registered }。
 */
export function resolveUiPrototypeFor(specBase, paths = []) {
  const proto = readUiPrototypeForm(specBase)
  const out = []
  const seen = new Set()
  const push = (entry) => {
    const key = `${entry.form}|${entry.rulingComplete}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(entry)
  }
  if (paths.length > 0) {
    let repoPaths = {}
    try {
      const raw = jsYaml.load(readFileSync(join(specBase, 'local.yaml'), 'utf8'))
      if (raw && raw.repos && typeof raw.repos === 'object') repoPaths = raw.repos
    } catch { /* 路径归一失败=零子仓命中，仓级兜底 */ }
    const norm = (p) => String(p).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
    for (const [key, registeredPath] of Object.entries(repoPaths)) {
      if (typeof registeredPath !== 'string') continue
      const hit = paths.some((p) => {
        const np = norm(p)
        return np.startsWith(norm(registeredPath) + '/') || np === norm(registeredPath)
      })
      const override = proto.repos[key]
      if (hit && override) push({ scope: key, registered: true, ...override })
    }
  }
  push(proto.registered
    ? { scope: '仓级', registered: true, form: proto.form, ruling: proto.ruling, rulingComplete: proto.rulingComplete }
    : { scope: '仓级', registered: false, form: null, ruling: null, rulingComplete: false })
  return out
}

/** 须知第 5 节：按形态条目组合「本仓原型形态」行（FR-03 四态；生态命令词禁入——neutrality 契约）。 */
function uiPrototypeFormLines(entries) {
  const lines = [`📐 本仓原型形态（local.yaml ui_prototype 登记；工具只查声明在场不验质量）：`]
  let anyContent = false
  for (const e of entries) {
    const scope = e.scope === '仓级' ? '' : `【子仓 ${e.scope}】`
    if (!e.registered) {
      anyContent = true
      lines.push(`   ⚠️ ${scope}未登记原型形态——本次按阶梯执行：有真实前端工具链→定稿原型必须真码；查无真码管线→先单开一个轻量变更搭最小入口（管线建设与业务变更分离），或登记豁免（form: single-html + ruling 用户裁决留痕）。收口前把 local.yaml ui_prototype 登记补上（强提醒，不阻断）。`)
    } else if (e.form === 'single-html' && !e.rulingComplete) {
      anyContent = true
      lines.push(`   ⚠️ ${scope}豁免登记不完整（single-html 缺 ruling{by,at,reason} 某字段）——这是静默漂移入口：补齐用户裁决留痕（by/at/reason）后再依赖豁免；本次仍按阶梯执行。`)
    } else if (e.form === 'single-html') {
      anyContent = true
      lines.push(`   📋 ${scope}豁免生效（single-html；裁决 by=${e.ruling.by} at=${e.ruling.at}）：定稿原型＝自包含 HTML + 真值 token（来源须声明：token 源文件/组件参照），反向翻译税为已裁决接受项。`)
    } else {
      anyContent = true
      lines.push(`   🔒 ${scope}真码契约（real-code）：定稿原型必须与实现同方言真码；查无管线先单开轻量变更搭最小入口（bootstrap 与业务变更分离）。`)
    }
  }
  return anyContent ? lines : []
}

export function buildUiGuidanceLines(specBase = null, paths = []) {
  const lines = [
    `🎨 UI 变更执行须知（本变更触及前端页面或 UI——advisory 引导非门禁）：`,
    `   1. 定稿原型必须是可复跑的真码产物（与实现同方言、能被本项目工具链构建）——手绘单文件`,
    `      仅限一次性粗选对比，不作为交付原型（2026-09-28 frontend-apple-style 实证：手绘定稿后每条意见都要反向翻译回真实代码）；`,
    `   2. 开工先就近发现本项目原型管线：查本次变更触达项目自己的脚本、任务与工具链（多项目仓`,
    `      按触达路径就近，不假设全仓共享一套）；已有则复用，没有则现场搭最小管线并把入口留在`,
    `      项目惯例位置——下一个会话能自己发现；`,
    `   3. 边改边渲染对照：每完成一个页面任务单元就渲染实页与基准并排比对，差异清零再勾任务；`,
    `      对照截图与结论随手落变更目录 ${UI_EVIDENCE_FILENAME}（干活时顺手写，收口只验在场）；`,
    `   4. 视觉降级须用户裁决留痕：执行中因约束对不齐基准而降级（结构收敛、范围缩小、样式统一级）`,
    `      必须停下找用户签字，裁决记录写进 ${UI_EVIDENCE_FILENAME}（含「用户裁决」字样段）——`,
    `      静默降级会在收口被「UI 视觉证据」探针硬拦（error 门）。`,
  ]
  if (specBase) {
    try {
      const entries = resolveUiPrototypeFor(specBase, paths)
      lines.push('', ...uiPrototypeFormLines(entries))
    } catch { /* 登记解析失败零打扰（fail-soft 同 readUiVisualGate） */ }
  }
  return lines
}

/* ── 分级探针 ── */

/** local.yaml 读 ui_visual_gate（warn|error|off，默认 warn；CRLF 容错——手写行扫描器坑先例）。 */
export function readUiVisualGate(specBase) {
  try {
    const raw = readFileSync(join(specBase, 'local.yaml'), 'utf8')
    const m = raw.match(/^\s*ui_visual_gate\s*:\s*['\"]?(warn|error|off)['\"]?\s*$/m)
    return m ? m[1] : 'warn'
  } catch {
    return 'warn'
  }
}

// 降级声明判定词=绑定窗口而非裸词「降级」：裸词在后端/机制讨论语境高频（探针档位、性能
// 降级），与远处视觉词同行共现时分属两个讨论对象——2026-10-05-uivisual-word-narrow 实测
// 「error 档（降级无裁决）……渲染/组件/样式」同行共现被误判、error 档阻断收口（自举陷阱）。
// 窗口语义：降级与视觉词 ≤6 字内同短语（两侧顺序皆认，经既有正例「视觉收敛降级」标定）；
// 绑定词表与 VISUAL_LINE 同集（含页面——评审 P2：缺页面时「六个页面降级为三个」漏判）；
// 样式统一级独立短语与 \bpartial\b 词边界保留。纯结构判定，D-003 封闭面不变。
const DOWNGRADE_LINE = /((视觉|样式|界面|页面|UI)[^\n]{0,6}降级|降级[^\n]{0,6}(视觉|样式|界面|页面|UI)|样式统一级|\bpartial\b)/i
const VISUAL_LINE = /(视觉|UI|页面|样式|界面)/

/** design/requirements 是否声明「视觉降级」（同行共现口径——行级命中防跨行误配；runUiVisualProbe 内部消费）。 */
function detectVisualDowngrade(designText, requirementsText) {
  for (const t of [designText, requirementsText]) {
    if (!t) continue
    for (const line of t.split(/\r?\n/)) {
      if (DOWNGRADE_LINE.test(line) && VISUAL_LINE.test(line)) return true
    }
  }
  return false
}

/**
 * UI 视觉证据探针（只读变更目录；fail-soft 由调用方 catch 兜底）。
 * level 三态：error（降级无裁决留痕，或 gate=error 且缺证据）→ 收口阻断；
 * warn（默认档缺证据）→ advisory 警告；ok（证据在场，或降级但有裁决留痕）。
 */
export function runUiVisualProbe({ changeDir, gate = 'warn' }) {
  const read = (name) => {
    try { return readFileSync(join(changeDir, name), 'utf8') } catch { return '' }
  }
  const designText = read('design.md')
  const requirementsText = read('requirements.md')
  const proposalText = read('proposal.md')
  const evidenceText = read(UI_EVIDENCE_FILENAME)
  const decisionsText = read('decisions.md')

  const declaredPaths = extractQuotedPaths(designText)
  const uiTouched =
    detectUiTouch(`${proposalText}\n${requirementsText}`) ||
    detectUiTouchInPaths(declaredPaths)

  if (gate === 'off') {
    return { applicable: false, uiTouched, level: 'ok', notes: ['ui_visual_gate=off——探针关闭（含降级硬规则）'] }
  }
  if (!uiTouched) {
    return { applicable: false, uiTouched: false, level: 'ok', notes: [] }
  }

  const evidencePresent = evidenceText.trim().length > 0
  const downgradeDeclared = detectVisualDowngrade(designText, requirementsText)
  const rulingPresent = evidenceText.includes('用户裁决') || decisionsText.includes('用户裁决')

  let level = 'ok'
  const notes = []
  if (downgradeDeclared && !rulingPresent) {
    level = 'error'
    notes.push('design/requirements 存在视觉降级声明而变更目录无用户裁决留痕（visual-evidence.md 或 decisions.md 含「用户裁决」）——静默降级禁止收口')
  } else if (!evidencePresent) {
    level = gate === 'error' ? 'error' : 'warn'
    notes.push(`变更目录缺 ${UI_EVIDENCE_FILENAME}（渲染对照证据应在执行时随手落盘——收口只验在场不产新证据）`)
  } else if (downgradeDeclared && rulingPresent) {
    notes.push('视觉降级已带用户裁决留痕')
  }

  return {
    applicable: true,
    uiTouched: true,
    evidencePresent,
    downgradeDeclared,
    rulingPresent,
    level,
    notes,
  }
}

/**
 * execute 收口的前置 advisory（2026-10-07-flow-friction-batch3 task-05）：UI 触达变更的
 * visual-evidence.md 应在执行期随手落盘，但执法只在 verify 收口（error 档）——postmortem
 * （provider-model-list）实证 agent 到 verify 末步才发现缺证据。本函数供 execute --done 的
 * gates 调用（warn 级提示，不阻断 execute；verify 的 error 档语义不动）：UI 触达且证据
 * 缺失时返回提示串，否则 null（非 UI / 证据在场 / gate off 零打扰）。
 * @param {{ changeDir: string, specBase?: string }} opts
 * @returns {string|null}
 */
export function uiEvidenceExecuteAdvisory({ changeDir, specBase = null }) {
  try {
    const gate = readUiVisualGate(specBase || join(changeDir, '..', '..', '..'))
    const probe = runUiVisualProbe({ changeDir, gate })
    if (!probe.applicable) return null
    if (probe.evidencePresent) return null
    const hard = gate === 'error'
    return `UI 触达变更但变更目录尚无 ${UI_EVIDENCE_FILENAME}——渲染对照证据应在执行期随手落盘（截图/对照结论，收口只验在场不产新证据）${hard ? '；本仓 ui_visual_gate=error，verify 收口会硬拦' : '；verify 收口会警告'}。落盘路径：${join(changeDir, UI_EVIDENCE_FILENAME)}`
  } catch {
    return null // fail-soft：探测异常零打扰（verify 侧同款口径兜底）
  }
}

/** design 文件变更清单行的路径粗提（反引号/裸路径行——探针侧仅作 UI 扩展名兜底命中，不追求全解；导出供 prompt.js 组子仓 override 匹配路径用）。 */
export function extractQuotedPaths(designText) {
  if (!designText) return []
  const paths = []
  for (const m of designText.matchAll(/`([^`]+)`/g)) {
    if (/[\\/]/.test(m[1])) paths.push(m[1])
  }
  for (const line of designText.split(/\r?\n/)) {
    const t = line.trim()
    const m = t.match(/^(?:修改|新增|删除|NEW:)?\s*((?:frontend|src|web|app|client|ui)\b[\\/][^\s|]+)/i)
    if (m) paths.push(m[1])
  }
  return paths
}

/** 探针 12 段渲染（renderProbe11Lines 同构：不适用 / ❌ error / ⚠️ warn / ✅ ok + 口径注记）。 */
export function renderUiVisualProbeLines(p12) {
  const L = [UI_VISUAL_PROBE_HEADING]
  if (!p12 || !p12.applicable) {
    L.push(`- 不适用（${p12 && p12.uiTouched ? 'ui_visual_gate=off' : '非 UI 触达变更（input/声明文件面均未命中）——零打扰'}）`)
    for (const n of (p12 && p12.notes) || []) L.push(`- ℹ️ ${n}`)
    return L
  }
  L.push('<!-- 口径注记：在场性检查非语义审计——只验 visual-evidence.md 存在非空与降级裁决留痕，不判对照结论对错（语义面归 verify-result 人工判断层）。证据应在执行时按 flow start「UI 变更执行须知」随手产生；本探针不要求收口现做。分级：缺证据默认 ⚠️（local.yaml ui_visual_gate=error 升阻断）；视觉降级无「用户裁决」留痕恒 ❌（off 豁免）。 -->')
  if (p12.level === 'error') {
    for (const n of p12.notes) L.push(`- ❌ ${n}`)
    L.push('  - 修复：补渲染对照证据到 visual-evidence.md；降级项补用户裁决留痕（含「用户裁决」字样段）后重跑收口')
  } else if (p12.level === 'warn') {
    for (const n of p12.notes) L.push(`- ⚠️ ${n}`)
  } else {
    L.push(`- ✅ UI 视觉证据在场（${UI_EVIDENCE_FILENAME} 非空${p12.downgradeDeclared ? '，降级带用户裁决留痕' : ''}）`)
    for (const n of p12.notes || []) L.push(`- ℹ️ ${n}`)
  }
  return L
}
