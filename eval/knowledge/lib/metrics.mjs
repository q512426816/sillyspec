/**
 * eval/knowledge/lib/metrics.mjs — 检索评测指标纯函数（零 IO 零全局状态，可单测）
 *
 * 候选与期望的统一单位是「命中键」字符串（file#anchor / D-id / FR-id / 文件路径），
 * 由 engine 层归一成本模块的输入；本模块只做排名数学。
 * 浮点输出统一 4 位小数、键序固定——baseline.json 可 diff 的前提。
 */

/** 期望条目在有序命中列表中的最佳名次（1-based；未命中 = Infinity）。 */
export function rankOf(hits, expectedKeys) {
  const want = new Set(expectedKeys || [])
  let best = Infinity
  for (let i = 0; i < hits.length; i++) {
    if (want.has(hits[i])) best = Math.min(best, i + 1)
  }
  return best
}

/** Top-k 命中判定（rank 为 Infinity 视为未命中）。 */
export function hitAtK(rank, k) {
  return Number.isFinite(rank) && rank <= k
}

/** 平均倒数排名（未命中记 0）。 */
export function mrr(ranks) {
  if (ranks.length === 0) return 0
  return ranks.reduce((s, r) => s + (Number.isFinite(r) ? 1 / r : 0), 0) / ranks.length
}

/** precision@k：前 k 个命中里属于期望集的占比（top 为空记 0）。 */
export function precisionAtK(hits, expectedKeys, k) {
  const want = new Set(expectedKeys || [])
  const top = hits.slice(0, k)
  if (top.length === 0) return 0
  return top.filter((h) => want.has(h)).length / top.length
}

/** 汇总一组 case 的分面指标（键序固定 top1/top3/mrr/n；空集全零）。 */
export function summarize(ranks) {
  const n = ranks.length
  const r4 = (x) => Math.round(x * 10000) / 10000
  return {
    top1: n > 0 ? r4(ranks.filter((r) => hitAtK(r, 1)).length / n) : 0,
    top3: n > 0 ? r4(ranks.filter((r) => hitAtK(r, 3)).length / n) : 0,
    mrr: r4(mrr(ranks)),
    n,
  }
}

/** 稳定排序：按 score 降序，同分保持原始序（评测输出确定性的前提）。 */
export function stableSortByScore(items, scoreOf) {
  return items
    .map((it, i) => ({ it, i, s: scoreOf(it) }))
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .map((x) => x.it)
}
