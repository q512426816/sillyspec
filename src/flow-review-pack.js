/**
 * flow-review-pack.js — 轻量评审任务书预消化材料包（2026-10-19-thin-review-material-pack）。
 *
 * 病根：轻量评审任务书把原始件（requirements/design/change.patch）原样丢给零上下文评审员，
 * 定位类通读 + 大 patch 整吞 prefill 是主要成本（冻结件实测最大 365KB）。完整流程五阶段
 * 2026-09-19 已为同一病根（评审 ~200x 信息放大）建过材料包（review-material-pack.js），
 * 本模块把同款机制移植到轻量道，三条护栏（design 记录）：
 *   ① 纯机械抽取零模型摘要——全部产出来自确定性行/正则解析，防「自述换皮」破坏「不信自述」；
 *   ② 包=基准面非禁读面——段尾印基准面语义行（照抄完整流程 D-004：包外定向查证须列明、
 *      包不足写 cannot_verify）；
 *   ③ 摘要从冻结件本身算——change.patch 文本直解，不走活 git（review-material-pack 的
 *      extractDiffSummary 走活 git 解 base 那条路不能搬：防「包说的」与评审员手里冻结面漂移）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** 材料包整体体积帽（对齐 review-material-pack.js PACK_MAX_CHARS 先例——包不能成为新的全量面）。 */
export const PACK_MAX_CHARS = 12000

/** 段标题与段尾基准面语义行（护栏②：照抄完整流程 D-004 语义——包=基准面非禁读面）。 */
const PACK_TITLE = '【预消化材料包（CLI 机械抽取——定位索引非证据）】'
const PACK_BASELINE = '  （基准面：包=定位索引非证据；包外定向查证须列明；包不足以作答写 cannot_verify）'

/** FR 标题行（h3）：### FR-NN: 标题——锚形态与 requirements 机器起草模板一致。 */
const FR_HEADING_RE = /^###\s+(FR-\d+)\s*[::]?\s*(.*)$/

/** 测试绑定节内行：FR-NN: 绑定内容。 */
const FR_BINDING_LINE_RE = /^(FR-\d+)\s*[::]\s*(.+)$/

/** diff 文件头：diff --git a/<旧> b/<新>——路径取 b/ 侧（rename 时即新名）。 */
const DIFF_GIT_RE = /^diff --git a\/(.+?) b\/(.+)$/

/** hunk 头（计数用，不解析行号——摘要只要 hunk 数）。 */
const HUNK_RE = /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/

/**
 * FR↔测试绑定表解析（纯函数）：h3 FR 标题按出现序成行，「## 测试绑定」节内 `FR-NN: …`
 * 行按 id 归并。requirements 缺 FR 标题 → 空数组（调用方按该子源零产出处理）。
 * @returns {{ fr: string, title: string, binding: string }[]}
 */
export function parseFrBindingRows(requirementsText) {
  const lines = String(requirementsText || '').replace(/\r\n/g, '\n').split('\n')
  const rows = []
  for (const line of lines) {
    const m = line.match(FR_HEADING_RE)
    if (m) rows.push({ fr: m[1], title: String(m[2] || '').trim(), binding: '' })
  }
  if (rows.length === 0) return rows
  let inBinding = false
  for (const line of lines) {
    if (/^##\s/.test(line)) { inBinding = /^##\s*测试绑定/.test(line); continue }
    if (!inBinding) continue
    const m = line.match(FR_BINDING_LINE_RE)
    if (m) {
      const row = rows.find((r) => r.fr === m[1])
      if (row) row.binding = String(m[2] || '').trim()
    }
  }
  return rows
}

/**
 * 冻结 patch 文件级摘要（纯函数）：按 `diff --git` 头分文件，统计每文件 +增/−删行数
 * （排除 +++/--- 文件名行）与 hunk 数；rename 取 b/ 侧新路径；Binary 行零计数容错。
 * 无文件头的杂文本 → 空数组（不抛错——垃圾进空出，调用方按零产出处理）。
 * @returns {{ path: string, plus: number, minus: number, hunks: number }[]}
 */
export function parseFrozenPatchSummary(patchText) {
  const text = String(patchText || '')
  if (!text.trim()) return []
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const files = []
  let cur = null
  for (const line of lines) {
    const dg = line.match(DIFF_GIT_RE)
    if (dg) {
      if (cur) files.push(cur)
      cur = { path: dg[2].trim(), plus: 0, minus: 0, hunks: 0 }
      continue
    }
    if (!cur) continue
    if (HUNK_RE.test(line)) { cur.hunks += 1; continue }
    if (line.startsWith('+++') || line.startsWith('---')) continue
    if (line.startsWith('+')) cur.plus += 1
    else if (line.startsWith('-')) cur.minus += 1
  }
  if (cur) files.push(cur)
  return files
}

/**
 * 归属切分归一（fail-soft 入参）：非法/缺席 → null（调用方零注入该子段）；数组字段缺省按空。
 * 文件路径统一正斜杠归一（Windows/WSL 混用兼容——评审对象路径口径与冻结件一致）。
 */
function normalizeAttribution(attribution) {
  if (!attribution || typeof attribution !== 'object' || Array.isArray(attribution)) return null
  const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/^\.\//, '')
  const asList = (v) => (Array.isArray(v) ? v.map(norm).filter(Boolean) : [])
  const foreign = Array.isArray(attribution.foreign)
    ? attribution.foreign
      .filter((f) => f && typeof f === 'object' && f.file)
      .map((f) => ({ file: norm(f.file), owners: Array.isArray(f.owners) ? f.owners.map((o) => String(o)).filter(Boolean) : [] }))
    : []
  return { declaredIn: asList(attribution.declaredIn), declaredOut: asList(attribution.declaredOut), foreign }
}

/** 归属切分三段渲染（2026-10-19-thin-review-dispatch-verbatim）：零计数照常渲染（不静默隐藏）。 */
function attributionLines(a) {
  const join = (xs) => (xs.length > 0 ? xs.join('、') : '（无）')
  const foreignLines = a.foreign.map((f) => `${f.file}←${f.owners.length > 0 ? f.owners.join('/') : '未知变更'}`)
  return [
    '  冻结面归属切分（CLI 机械核算——定位索引非证据）：',
    `  - 声明内（design 变更清单 ∩ 冻结面，${a.declaredIn.length} 文件）：${join(a.declaredIn)}`,
    `  - 声明外（冻结面−声明清单，${a.declaredOut.length} 文件——共享仓并行混入/生成物候选，抽查即可勿逐文件 git 考古）：${join(a.declaredOut)}`,
    `  - 他侧归因（提交/声明归属其他变更，${a.foreign.length} 文件）：${join(foreignLines)}`,
  ]
}

/**
 * 归属切分集合运算（纯函数——flow done review 子步装配用）：声明内 = design 变更清单 ∩
 * 冻结面（他侧归因文件除外，归属歧义按他侧披露处理）；声明外 = 冻结面 − 声明清单 − 他侧
 * 归因；他侧归因原样归一化（owner 去重保序）。路径统一正斜杠 + 去 `./` 前缀 + 冻结面去重
 * （Windows/WSL 混用与 patch 同文件多段兼容）。纯集合运算零 IO——git/解析失败由调用方
 * fail-soft（源头失败 → 不调用本函数）。
 * @param {{ declaredFiles?: string[], freezeFiles?: string[], foreign?: Array<{file: string, owners?: string[]}> }} args
 * @returns {{ declaredIn: string[], declaredOut: string[], foreign: Array<{file: string, owners: string[]}> }}
 */
export function buildFreezeAttribution({ declaredFiles, freezeFiles, foreign }) {
  const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/^\.\//, '')
  const declared = new Set((Array.isArray(declaredFiles) ? declaredFiles : []).map(norm).filter(Boolean))
  const frozen = [...new Set((Array.isArray(freezeFiles) ? freezeFiles : []).map(norm).filter(Boolean))]
  const foreignList = (Array.isArray(foreign) ? foreign : [])
    .filter((f) => f && typeof f === 'object' && f.file)
    .map((f) => ({ file: norm(f.file), owners: [...new Set((Array.isArray(f.owners) ? f.owners : []).map(String).filter(Boolean))] }))
  const foreignSet = new Set(foreignList.map((f) => f.file))
  return {
    declaredIn: frozen.filter((f) => declared.has(f) && !foreignSet.has(f)),
    declaredOut: frozen.filter((f) => !declared.has(f) && !foreignSet.has(f)),
    foreign: foreignList,
  }
}

/**
 * 装配材料包注入行（唯一组包入口）：FR 表、patch 摘要、归属切分三子源各自可得各自产出、
 * 全缺返回 null（调用方零注入）。体积帽行级截断（不切半行），截断注记置于基准面语义行之前——
 * 语义行恒为末行；标题+正文+注记+语义行总长恒 ≤ PACK_MAX_CHARS（截断预留注记预算）。
 * requirements.md 读失败（缺件）→ FR 子段零产出；attribution 缺席/非法 → 归属子段零产出
 * （fail-soft 不抛穿，其余子段不受影响）。
 * @param {{ changeDir: string, patchText: string|null, attribution?: object|null }} args
 * @returns {{ lines: string[], truncated: boolean } | null}
 */
export function assembleReviewPack({ changeDir, patchText, attribution = null }) {
  let frRows = []
  try {
    frRows = parseFrBindingRows(readFileSync(join(changeDir, 'requirements.md'), 'utf8'))
  } catch { /* 缺件 → FR 子段零产出 */ }
  const summary = parseFrozenPatchSummary(patchText)
  if (frRows.length === 0 && summary.length === 0) return null
  const body = []
  if (frRows.length > 0) {
    body.push(`  FR↔测试绑定表（requirements.md 机械解析，${frRows.length} 条）：`)
    for (const r of frRows) body.push(`  - ${r.fr}: ${r.title}${r.binding ? ` ｜ 绑定: ${r.binding}` : ' ｜ 绑定: （无绑定行）'}`)
  }
  if (summary.length > 0) {
    body.push(`  冻结 patch 文件级摘要（change.patch 机械解析，${summary.length} 文件）：`)
    for (const f of summary) body.push(`  - ${f.path}（+${f.plus}/-${f.minus}，${f.hunks} hunk）`)
  }
  const attr = normalizeAttribution(attribution)
  if (attr) body.push(...attributionLines(attr))
  const note = `  …（材料包超 ${PACK_MAX_CHARS} 字符截断——需全文时定向查证并列明）`
  let budget = PACK_MAX_CHARS - PACK_TITLE.length - PACK_BASELINE.length - note.length
  const lines = [PACK_TITLE]
  let truncated = false
  for (const l of body) {
    const w = l.length + 1
    if (w > budget) { truncated = true; break }
    lines.push(l)
    budget -= w
  }
  if (truncated) lines.push(note)
  lines.push(PACK_BASELINE)
  return { lines, truncated }
}
