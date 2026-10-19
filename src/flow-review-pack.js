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
