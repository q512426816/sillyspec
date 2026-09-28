/**
 * route-hindsight.js — 轻量道「疑似该走预段未走」事后闭环（2026-09-28-unclear-req-to-brainstorm FR-02）。
 *
 * 三层分工中的后门层：前门盘问（flow.js 渲染）管入口弱信号，本模块管收口事后指标——
 * flow done 收口时计算过程形态指标，任一超阈即标记落库，下次 flow start 点名提示
 * （「疑似」非定罪、可无视），形成 per-repo 自校准回路。
 *
 * D-003 禁区（rejected 决策，逐字遵守）：全部指标为封闭面——行级 diff 比例与记录计数，
 * 零关键词/词表语义判定。需求清不清晰的判定归 agent，机器只产过程形态信号（D-005 弱信号）。
 *
 * 数据面（均 .runtime 下，跨平台 join + 原子写）：
 *   - 首版快照 route-hindsight-baseline-<change>.json：start/adopt 机器稿首次落盘后由
 *     flow.js 调 snapshotBaseline 存 design.md/tasks.md 全文副本；首写者胜（幂等，R-04：
 *     快照锚定起草时点，重入不覆盖）。
 *   - 标记文件 route-hindsight.json：per-repo 单条，每次标记整文件覆盖——提示语义即
 *     「上个轻量变更」。
 *
 * 指标四元组（口径）：
 *   designRewriteRatio / tasksRewriteRatio：终稿 vs 首版快照的行级改写比——复用
 *     flow-draft.computeEditRatio 同款 LCS 口径（改写行/首版行数，纯增行不计入；CRLF/LF
 *     归一后比对）。diff 面先做结构归一：剔 frontmatter 块、HTML 注释标记行（<!--）、空行
 *     ——惰性脚手架行（机器稿里约占半数）会把真实换血稀释到阈值以下（实测整写机器段仅得
 *     0.175-0.275，0.5 阈值永不可达=闭环失效面）；归一是纯结构过滤零语义判定（D-003）。
 *     无快照（旧变更/起草失败）= 0（零信号，不是「实测 0% 改写」）。
 *   blindDims：收口评审 review.json 的 dimensionNotes 中值为 'finding' 的维数——枚举值
 *     计数（评审员已按任务书 schema 判定的结构化面），非机器语义判定；无 review.json
 *     （评审豁免）= 0。
 *   testFailures：.runtime/verify-runs/<ts>/test-result.json 记录面中 change 归属本变更且
 *     status='failed' 的实测失败次数——每次失败收口尝试各落一条（writeRunResult 既有面）。
 *     flow-state substeps 无失败计数面（执行期裁决 D-006：数据源从卡面所述「flow-state
 *     substeps」改读同为既有记录面的 verify-runs 时间线，封闭面语义不变）。
 */
import { existsSync, readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { writeAtomicSync } from './fs-atomic.js'
import { computeEditRatio } from './flow-draft.js'

/** 超阈判定常量（可调；口径：比例两路为严格大于——恰等于阈值不算超，保守防误标 R-01；
 * 计数两路为大于等于——2 维/2 次即系统性信号）。 */
export const HINDSIGHT_THRESHOLDS = {
  designRewriteRatio: 0.5, // design 机器稿改写比 > 0.5（50% 首版行被改写）
  tasksRewriteRatio: 0.6,  // tasks 机器预填稿改写率 > 0.6
  blindDims: 2,            // 评审盲维命中（dimensionNotes='finding'）≥ 2 维
  testFailures: 2,         // 收口实测失败记录 ≥ 2 次
}

const BASELINE_PREFIX = 'route-hindsight-baseline-'
const MARK_FILE = 'route-hindsight.json'

/** CRLF/LF 归一（Windows/Linux/macOS 换行兼容——未归一的行比对会把换行差异计成改写）。 */
function norm(text) {
  return String(text || '').replace(/\r\n/g, '\n')
}

/** diff 面结构归一：剔 frontmatter 块、HTML 注释标记行（<!-- 机器段/槽标记）、空行——
 * 只留正文行（惰性脚手架行不稀释改写比；纯结构过滤，零语义判定）。 */
function contentSurface(text) {
  const lines = norm(text).split('\n')
  const out = []
  let fmOpen = false, fmDone = false
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (!fmDone) {
      if (i === 0 && l === '---') { fmOpen = true; continue }
      if (fmOpen) { if (l === '---') { fmOpen = false; fmDone = true } continue }
      fmDone = true // 首行非 ---：无 frontmatter 的裸文本，全行入面
    }
    if (l.startsWith('<!--')) continue
    if (l.trim() === '') continue
    out.push(l)
  }
  return out.join('\n')
}

function readTextSafe(p) {
  try { return readFileSync(p, 'utf8') } catch { return null }
}

function round4(x) {
  return Math.round(x * 10000) / 10000
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * 首版快照：机器稿起草时点（start 的 draftAll / adopt·resume 的 redraftMissingArtifacts
 * 首次落盘后）由 flow.js 调用。首写者胜——已存在不覆盖（重入/续跑取到的都是首版，R-04）。
 * 缺件（起草失败的文件）存 null，指标面按零信号处理。
 * @returns {{ captured: boolean, path?: string, reason?: string }}
 */
export function snapshotBaseline({ specBase, change, changeDir }) {
  try {
    const runtimeRoot = join(specBase, '.runtime')
    const p = join(runtimeRoot, `${BASELINE_PREFIX}${change}.json`)
    if (existsSync(p)) return { captured: false, reason: 'already-exists（首写者胜）' }
    const payload = {
      schemaVersion: 1,
      change,
      capturedAt: new Date().toISOString(),
      design: readTextSafe(join(changeDir, 'design.md')),
      tasks: readTextSafe(join(changeDir, 'tasks.md')),
    }
    mkdirSync(runtimeRoot, { recursive: true })
    writeAtomicSync(p, JSON.stringify(payload, null, 2) + '\n')
    return { captured: true, path: p }
  } catch (e) {
    return { captured: false, reason: (e && e.message) || String(e) }
  }
}

/**
 * 收口指标计算（封闭面：只读文件与既有记录，无语义判定）。
 * @param {{ changeDir: string, reviewJson: object|null, flowState: object|null }} p
 *   changeDir 布局=<specBase>/changes/<change>（specBase 与 change 名据此派生）；
 *   reviewJson=flow done 评审子步已校验的 review.json 解析对象（豁免时 null）；
 *   flowState=flow-state 对象（仅随 raw 记录，不参与判定）。
 * @returns {{ designRewriteRatio: number, tasksRewriteRatio: number, blindDims: number, testFailures: number, raw: object }}
 */
export function computeHindsightMetrics({ changeDir, reviewJson, flowState }) {
  const raw = { baselinePresent: false }
  const change = basename(changeDir)
  const specBase = dirname(dirname(changeDir))

  // ① 首版快照 → 终稿行级改写比
  let designRewriteRatio = 0
  let tasksRewriteRatio = 0
  const baselineRaw = readTextSafe(join(specBase, '.runtime', `${BASELINE_PREFIX}${change}.json`))
  let baseline = null
  if (baselineRaw != null) { try { const j = JSON.parse(baselineRaw); baseline = j && typeof j === 'object' ? j : null } catch { baseline = null } }
  if (baseline) {
    raw.baselinePresent = true
    const pairs = [['design', 'designRewriteRatio'], ['tasks', 'tasksRewriteRatio']]
    for (const [key, outKey] of pairs) {
      const first = typeof baseline[key] === 'string' ? contentSurface(baseline[key]) : null
      const finalText = readTextSafe(join(changeDir, `${key}.md`))
      if (first && finalText != null) {
        const surface = contentSurface(finalText)
        const ratio = round4(computeEditRatio(first, surface))
        if (outKey === 'designRewriteRatio') designRewriteRatio = ratio
        else tasksRewriteRatio = ratio
        raw[`${key}BaselineLines`] = first.split('\n').length
        raw[`${key}FinalLines`] = surface.split('\n').length
      }
    }
  }

  // ② 评审盲维命中：dimensionNotes 枚举值计数（'finding'——评审员结构化判定面）
  let blindDims = 0
  const dims = reviewJson && typeof reviewJson === 'object' && reviewJson.dimensionNotes
    && typeof reviewJson.dimensionNotes === 'object' && !Array.isArray(reviewJson.dimensionNotes)
    ? reviewJson.dimensionNotes : null
  if (dims) {
    for (const v of Object.values(dims)) if (v === 'finding') blindDims++
    raw.dimensionNotesKeys = Object.keys(dims).length
  }

  // ③ 实测失败次数：verify-runs 记录面按 change 归属计数（status='failed' 枚举）
  let testFailures = 0
  const runsDir = join(specBase, '.runtime', 'verify-runs')
  try {
    for (const e of readdirSync(runsDir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue
      const tr = readTextSafe(join(runsDir, e.name, 'test-result.json'))
      if (tr == null) continue
      try {
        const j = JSON.parse(tr)
        if (j && typeof j === 'object' && j.change === change && j.status === 'failed') testFailures++
      } catch { /* 损坏记录不计 */ }
    }
  } catch { /* 无 verify-runs 目录 = 0 */ }
  raw.failedRunCount = testFailures

  // flowState 仅随 raw 留档（不参与判定——判定面恒为上方三个封闭面）
  raw.flowTier = flowState && flowState.tier ? String(flowState.tier) : null
  raw.adopted = Boolean(flowState && flowState.adopted_from)

  return { designRewriteRatio, tasksRewriteRatio, blindDims, testFailures, raw }
}

/**
 * 超阈判定＋标记落库（.sillyspec/.runtime/route-hindsight.json，per-repo 单条整文件覆盖）。
 * @param {{ cwd: string, specBase: string, change: string, metrics: object }} p
 * @returns {{ marked: boolean, reasons: string[] }}
 */
export function markHindsight({ cwd, specBase, change, metrics }) {
  const base = specBase || join(cwd || '.', '.sillyspec')
  const m = metrics || {}
  const reasons = []
  if (num(m.designRewriteRatio) > HINDSIGHT_THRESHOLDS.designRewriteRatio) {
    reasons.push(`design 机器稿改写比 ${num(m.designRewriteRatio)} > ${HINDSIGHT_THRESHOLDS.designRewriteRatio}`)
  }
  if (num(m.tasksRewriteRatio) > HINDSIGHT_THRESHOLDS.tasksRewriteRatio) {
    reasons.push(`tasks 机器预填稿改写率 ${num(m.tasksRewriteRatio)} > ${HINDSIGHT_THRESHOLDS.tasksRewriteRatio}`)
  }
  if (num(m.blindDims) >= HINDSIGHT_THRESHOLDS.blindDims) {
    reasons.push(`评审盲维命中 ${num(m.blindDims)} 维 ≥ ${HINDSIGHT_THRESHOLDS.blindDims}`)
  }
  if (num(m.testFailures) >= HINDSIGHT_THRESHOLDS.testFailures) {
    reasons.push(`实测失败 ${num(m.testFailures)} 次 ≥ ${HINDSIGHT_THRESHOLDS.testFailures}`)
  }
  if (reasons.length === 0) return { marked: false, reasons: [] }
  const runtimeRoot = join(base, '.runtime')
  mkdirSync(runtimeRoot, { recursive: true })
  writeAtomicSync(join(runtimeRoot, MARK_FILE), JSON.stringify({
    change,
    marked_at: new Date().toISOString(),
    metrics: {
      designRewriteRatio: num(m.designRewriteRatio),
      tasksRewriteRatio: num(m.tasksRewriteRatio),
      blindDims: num(m.blindDims),
      testFailures: num(m.testFailures),
    },
    reasons,
  }, null, 2) + '\n')
  return { marked: true, reasons }
}

/**
 * 下次 flow start 的点名提示读取。无文件/无标记/损坏 → null（新装零影响——无 hindsight
 * 文件的仓 flow start 输出与现状完全一致）。
 * @returns { string | null }
 */
export function readHindsightHint({ specBase }) {
  try {
    const raw = readFileSync(join(specBase, '.runtime', MARK_FILE), 'utf8')
    const j = JSON.parse(raw)
    if (!j || typeof j !== 'object' || !j.change) return null
    const m = j.metrics || {}
    const pct = (v) => (Number.isFinite(Number(v)) ? `${Math.round(Number(v) * 100)}%` : '?')
    const why = Array.isArray(j.reasons) && j.reasons.length > 0 ? j.reasons.join('；') : '过程形态超阈'
    return `🕰️ route-hindsight：上个轻量变更「${j.change}」疑似该走头脑风暴预段未走（${why}；形态计数——design 改写比 ${pct(m.designRewriteRatio)}、tasks 改写率 ${pct(m.tasksRewriteRatio)}、评审盲维命中 ${m.blindDims ?? '?'}、实测失败 ${m.testFailures ?? '?'} 次）。「疑似」是过程形态信号非定罪——本次需求确实已含决策可无视；若拿不准，先 run brainstorm --change <名> 再回来收编。`
  } catch {
    return null
  }
}

export default { HINDSIGHT_THRESHOLDS, snapshotBaseline, computeHindsightMetrics, markHindsight, readHindsightHint }
