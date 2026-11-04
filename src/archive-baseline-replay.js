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
 * @param {{signals?: string[]}} [opts] signals 非空时仅概述段命中任一词者入选
 * @returns {{planned: Array<{change: string, dir: string}>, skipped: {noOverview: number,
 *   gated: number, already: number, badDir: number}}
 */
export function planBaselineReplay(archiveRoot, knowledgeRoot, opts = {}) {
  const signals = (opts.signals || []).map(s => String(s).toLowerCase()).filter(Boolean)
  const already = existingBaselineChanges(knowledgeRoot)
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
 * @param {{signals?: string[], headHashOf?: (change: string) => string}} [opts]
 *   headHashOf 缺省恒 未记录（回放条目的「最近确认」为溯源占位，不冒充归档时 HEAD）
 * @returns {{applied: number, failed: Array<{change: string, error: string}>,
 *   planned: number, skipped: object}}
 */
export function applyBaselineReplay(archiveRoot, knowledgeRoot, opts = {}) {
  const { planned, skipped } = planBaselineReplay(archiveRoot, knowledgeRoot, opts)
  const applied = []
  const failed = []
  for (const { change, dir } of planned) {
    try {
      const headHash = (opts.headHashOf && opts.headHashOf(change)) || '未记录'
      const r = distillIntoKnowledge(dir, knowledgeRoot, headHash, null, { baselineOnly: true })
      if (r.written && r.written.length > 0) applied.push(change)
    } catch (e) {
      failed.push({ change, error: String((e && e.message) || e) })
    }
  }
  return { applied: applied.length, appliedChanges: applied, failed, planned: planned.length, skipped }
}
