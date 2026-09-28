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

export const UI_VISUAL_PROBE_HEADING = '#### 探针 12：UI 视觉证据（分级门）'
export const UI_EVIDENCE_FILENAME = 'visual-evidence.md'

/* ── 检测启发式（正反例单测锁定；误判面=默认档一行警告，误漏面由文件面扩展名兜底）── */

const UI_TOUCH_PATTERNS = [
  /页面/, /前端/, /\bUI\b/i, /视觉/, /样式/, /界面/, /布局/, /主题色/, /配色/,
  /\.tsx?\b/, /\.jsx\b/, /\.vue\b/, /\.svelte\b/, /\.css\b/, /\.scss\b/, /\.html\b/,
  /组件/, /原型/, /截图/, /渲染/,
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

export function buildUiGuidanceLines() {
  return [
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

const DOWNGRADE_LINE = /(降级|样式统一级|partial)/
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

/** design 文件变更清单行的路径粗提（反引号/裸路径行——探针侧仅作 UI 扩展名兜底命中，不追求全解）。 */
function extractQuotedPaths(designText) {
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
