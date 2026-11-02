/**
 * eval/knowledge/lib/report.mjs — 控制台表与 baseline 对比
 */

/** 四舍五入 4 位（与 metrics 同口径）。 */
const r4 = (x) => Math.round(Number(x) * 10000) / 10000

/** 控制台表：每仓每面的 raw/rendered 指标 + probes + self smoke。 */
export function renderTable(result) {
  const lines = []
  lines.push('知识检索评测基线（eval/knowledge）')
  for (const repo of Object.keys(result.metrics || {})) {
    const c = result.cases?.[repo] || {}
    lines.push(`\n[${repo}] organic=${c.organic ?? 0} self=${c.self ?? 0}`)
    for (const [face, m] of Object.entries(result.metrics[repo])) {
      lines.push(`  ${face.padEnd(9)} raw top1=${m.raw.top1} top3=${m.raw.top3} mrr=${m.raw.mrr} n=${m.raw.n}`
        + ` | rendered top1=${m.rendered.top1} top3=${m.rendered.top3} | truncated=${(m.truncated || []).length}`)
      if (m.subsets) {
        const parts = Object.entries(m.subsets).map(([k, v]) => `${k}(n=${v.n},top1=${v.top1},top3=${v.top3},reach=${v.reachable})`).join(' ')
        lines.push(`    subsets: ${parts}`)
      }
      if (Array.isArray(m.scope_unreachable) && m.scope_unreachable.length > 0) {
        lines.push(`    scope_unreachable: ${m.scope_unreachable.join('、')}`)
      }
    }
    const ss = result.self_smoke?.[repo]
    if (ss && ss.cases > 0) {
      lines.push(`  self-smoke cases=${ss.cases} own_hit_top3=${ss.own_hit_top3} name_only=${ss.name_only_top3} leak_gap=${ss.leak_gap}`)
    }
  }
  lines.push('\n缺陷探针：')
  for (const [defect, pass] of Object.entries(result.probes || {})) {
    lines.push(`  ${pass ? 'GREEN' : 'RED  '} ${defect}`)
  }
  return lines.join('\n')
}

/**
 * baseline 对比：快照指纹不一致 → snapshot_mismatch；各面 raw.top3 与 probe 状态变化逐项列出；
 * baselineSummary 返回基线侧每面 raw/rendered 全量指标（mismatch 时两套指标都要可见）。
 * @returns {{mismatches: string[], changes: string[], baselineSummary: object}}
 */
export function diffBaseline(cur, base) {
  const mismatches = []
  const changes = []
  const baselineSummary = {}
  if (!base || typeof base !== 'object') return { mismatches, changes, baselineSummary }
  for (const repo of Object.keys(cur.snapshot || {})) {
    const b = base.snapshot?.[repo]
    const c = cur.snapshot[repo]
    if (!b) continue
    if (b.head !== c.head || b.knowledge_hash !== c.knowledge_hash) {
      mismatches.push(`${repo}: snapshot_mismatch（head ${String(b.head).slice(0, 8)}→${String(c.head).slice(0, 8)}）`)
    }
  }
  for (const repo of Object.keys(cur.metrics || {})) {
    const bm = base.metrics?.[repo] || {}
    for (const face of Object.keys(cur.metrics[repo])) {
      const bmFace = bm[face]
      const c3 = cur.metrics[repo][face].raw.top3
      if (bmFace && bmFace.raw) {
        baselineSummary[`${repo}/${face}`] = { raw: bmFace.raw, rendered: bmFace.rendered }
        const b3 = bmFace.raw.top3
        if (typeof b3 === 'number' && r4(b3) !== r4(c3)) changes.push(`${repo}/${face} raw.top3 ${b3} → ${c3}`)
      }
    }
  }
  for (const defect of Object.keys(cur.probes || {})) {
    if (typeof base.probes?.[defect] === 'boolean' && base.probes[defect] !== cur.probes[defect]) {
      changes.push(`probe ${defect}: ${base.probes[defect] ? 'GREEN' : 'RED'} → ${cur.probes[defect] ? 'GREEN' : 'RED'}`)
    }
  }
  // self 趋势指标（不进质量门槛，仅 diff 可见——own_hit_top3 变化反映蒸馏→检索链路质量）
  for (const repo of Object.keys(cur.self_smoke || {})) {
    const b = base.self_smoke?.[repo]
    const c = cur.self_smoke[repo]
    if (b && c && typeof b.own_hit_top3 === 'number' && typeof c.own_hit_top3 === 'number' && r4(b.own_hit_top3) !== r4(c.own_hit_top3)) {
      changes.push(`self[${repo}] own_hit_top3 ${b.own_hit_top3} → ${c.own_hit_top3}（趋势，非门槛）`)
    }
  }
  return { mismatches, changes, baselineSummary }
}
