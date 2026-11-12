/**
 * 存量归档叙事基线回放（2026-11-04-archive-baseline-entry）——单机制双执行点的回放侧。
 *
 * 机制侧（decision-distill.distillIntoKnowledge baselineOnly）在归档时为未来变更产出基线；
 * 本模块对存量归档重放同一条代码路径（FR-04：不另立条目体系）。规约 00 纪律：信号词表
 * 一律经 {@link opts.signals} 参数传入——本文件零内置词表常量（缺省空表 = 全量有做法概述
 * 段的变更），调用方（各仓 .runtime 一次性脚本）自持词表。
 *
 * 幂等：写盘前预扫 knowledge/decisions/*.md 已有基线（原编号 D-000@ 行的 变更： 归属），
 * 已含者跳过——中断重入零重复。
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { distillIntoKnowledge, parseDesignOverview } from './decision-distill.js'

const BASELINE_ORIGIN_LINE = /^原编号\s*[：:]\s*D-000@/m
const CHANGE_LINE = /^变更\s*[：:]\s*(\S+)/m

/** knowledge/decisions 下已有基线的变更名集合（幂等预扫，逐文件一次读取）。 */
function existingBaselineChanges(knowledgeRoot) {
  const dir = join(knowledgeRoot, 'decisions')
  const names = new Set()
  let files = []
  try { files = readdirSync(dir).filter(f => f.endsWith('.md')) } catch { return names }
  for (const f of files) {
    let content
    try { content = readFileSync(join(dir, f), 'utf8') } catch { continue }
    // 基线段判定：原编号 D-000@ 行 + 段内变更行（逐段扫描——同文件多变更共存常态）
    for (const block of content.split(/^## /m).slice(1)) {
      if (!BASELINE_ORIGIN_LINE.test(block)) continue
      const m = block.match(CHANGE_LINE)
      if (m) names.add(m[1])
    }
  }
  return names
}

/**
 * 纯读规划：归档集 → 回放候选/跳过归因。
 * @param {string} archiveRoot 归档根（.sillyspec/changes/archive）
 * @param {string} knowledgeRoot 知识根（<repo>/.sillyspec/knowledge）
 * @param {{signals?: string[], full?: boolean}} [opts] signals 非空时仅概述段命中任一词者入选；
 *   full=true 为完整蒸馏回填（2026-11-12-freeze-decision-recall FR-04）——不按「已有基线」
 *   预筛：幂等由 distillIntoKnowledge 内部「号+变更」键保证，而按基线预筛会误跳「有基线但
 *   缺人工条目」的变更，补齐人工条目恰是 full 模式的目标。
 * @returns {{planned: Array<{change: string, dir: string}>, skipped: {noOverview: number,
 *   gated: number, already: number, badDir: number}}
 */
export function planBaselineReplay(archiveRoot, knowledgeRoot, opts = {}) {
  const signals = (opts.signals || []).map(s => String(s).toLowerCase()).filter(Boolean)
  const already = opts.full ? new Set() : existingBaselineChanges(knowledgeRoot)
  const planned = []
  const skipped = { noOverview: 0, gated: 0, already: already.size, badDir: 0 }
  let dirs = []
  try { dirs = readdirSync(archiveRoot) } catch { return { planned, skipped } }
  for (const name of dirs.sort()) {
    const dir = join(archiveRoot, name)
    let isDir = false
    try { isDir = existsSync(join(dir, 'design.md')) } catch { /* 不可读按跳过 */ }
    if (!isDir) { skipped.badDir++; continue }
    if (already.has(name)) continue
    const overview = parseDesignOverview(dir)
    if (!overview) { skipped.noOverview++; continue }
    if (signals.length > 0) {
      const lower = overview.toLowerCase()
      if (!signals.some(s => lower.includes(s))) { skipped.gated++; continue }
    }
    planned.push({ change: name, dir })
  }
  return { planned, skipped }
}

/**
 * 执行回放：逐变更 baselineOnly 蒸馏（单变更失败留痕 continue，不阻断批次）。
 * @param {string} archiveRoot 归档根
 * @param {string} knowledgeRoot 知识根
 * @param {{signals?: string[], headHashOf?: (change: string) => string, full?: boolean}} [opts]
 *   headHashOf 缺省恒 未记录（回放条目的「最近确认」为溯源占位，不冒充归档时 HEAD）；
 *   full=true 走完整蒸馏（不带 baselineOnly），否则沿用基线回放行为（逐字不变）
 * @returns {{applied: number, failed: Array<{change: string, error: string}>,
 *   planned: number, skipped: object}}
 */
export function applyBaselineReplay(archiveRoot, knowledgeRoot, opts = {}) {
  const { planned, skipped } = planBaselineReplay(archiveRoot, knowledgeRoot, opts)
  const scoped = opts.onlyChange ? planned.filter((p) => p.change === opts.onlyChange) : planned
  const applied = []
  const failed = []
  for (const { change, dir } of scoped) {
    try {
      const headHash = (opts.headHashOf && opts.headHashOf(change)) || '未记录'
      const r = distillIntoKnowledge(dir, knowledgeRoot, headHash, null, opts.full ? {} : { baselineOnly: true })
      // applied 只计真正新增（action=append）——update/supersede 是幂等重跑的在位更新，
      // 不算「本次回填产出」。非 full 模式有预筛兜底，此判定对其行为零影响。
      if (r.written && r.written.some((w) => w && w.action === 'append')) applied.push(change)
    } catch (e) {
      failed.push({ change, error: String((e && e.message) || e) })
    }
  }
  return { applied: applied.length, appliedChanges: applied, failed, planned: scoped.length, skipped }
}

/**
 * CLI 出口：`sillyspec knowledge distill-backfill [--apply] [--change <名>]`
 * （2026-11-12-freeze-decision-recall FR-04）。
 *
 * 缺省 dry-run 只读规划，`--apply` 才落盘（与 knowledge redomain-unmapped 同惯例）；
 * 走 full 模式完整蒸馏（非仅基线）。JSON envelope 与 redomain-unmapped 同族。
 *
 * @param {string} dir  仓根（CLI 传入；specDir 未显式给出时取 <dir>/.sillyspec）
 * @param {string[]} args
 * @param {{specDir?: string}} [opts]
 */
export async function cmdDistillBackfill(dir, args, opts = {}) {
  const specBase = opts.specDir || join(dir, '.sillyspec')
  const knowledgeRoot = join(specBase, 'knowledge')
  const archiveRoot = join(specBase, 'changes', 'archive')
  const apply = args.includes('--apply')
  const changeIdx = args.indexOf('--change')
  const onlyChange = changeIdx >= 0 ? args[changeIdx + 1] : null
  const emit = (ok, data, error) => console.log(JSON.stringify({ ok, ...data, ...(error ? { error } : {}) }, null, 2))

  // --change 缺值显式拒绝（静默回落全量 = 契约被切到更大破坏面）
  if (changeIdx >= 0 && (!onlyChange || onlyChange.startsWith('--'))) {
    emit(false, {}, { code: 'change_value_required', usage: '--change <变更名>' })
    return
  }
  if (!existsSync(join(knowledgeRoot, 'INDEX.md'))) {
    emit(false, {}, { code: 'knowledge_dir_missing', path: knowledgeRoot })
    return
  }
  if (onlyChange && !existsSync(join(archiveRoot, onlyChange, 'design.md'))) {
    emit(false, {}, { code: 'change_not_archived', change: onlyChange, archive_root: archiveRoot })
    return
  }

  const planOpts = { full: true, ...(onlyChange ? { onlyChange } : {}) }
  if (!apply) {
    const { planned, skipped } = planBaselineReplay(archiveRoot, knowledgeRoot, planOpts)
    const scoped = onlyChange ? planned.filter((p) => p.change === onlyChange) : planned
    emit(true, { mode: 'dry-run', planned: scoped.length, changes: scoped.map((p) => p.change), skipped })
    return
  }
  const res = applyBaselineReplay(archiveRoot, knowledgeRoot, planOpts)
  emit(true, { mode: 'apply', ...res })
}
