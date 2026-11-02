/**
 * eval/knowledge/lib/faces.mjs — 分面执行（raw/rendered 双口径 + 截断归因）
 *
 * raw = 引擎全量命中序（不预先截断）；rendered = 各消费面实际切片（flow 📚 行 top-3、
 * rejected top-5、search limit 10、scope entry 3 + decision 20）。raw 命中而 rendered 不中
 * → truncated；每 case 的 raw_rank/rendered_rank 进 details（FR-03 的 rank 记录面）。
 */
import { runEntries, runDecisions, searchView, runScope } from './engine.mjs'
import { hitMatches } from './probes.mjs'
import { summarize } from './metrics.mjs'

export const FACES = ['entries', 'decisions', 'search', 'scope']

/** 期望谓词排名（file 级前缀语义；1-based，未命中 = Infinity）。 */
export function rankWithMatches(hits, expected) {
  let best = Infinity
  hits.forEach((h, i) => {
    if (expected.some((e) => hitMatches(h, e))) best = Math.min(best, i + 1)
  })
  return best
}

/** 单仓单面：raw/rendered 双口径 + 截断清单 + 每 case 名次明细。 */
export async function runFace(repoPath, face, cases) {
  const ranksRaw = []
  const ranksRendered = []
  const truncated = []
  const details = []
  for (const c of cases) {
    let rawHits = []
    let renderedHits = []
    if (face === 'entries') {
      const r = runEntries(repoPath, c.query)
      rawHits = r.hits
      renderedHits = r.hits.slice(0, 3)
    } else if (face === 'decisions') {
      const r = runDecisions(repoPath, c.query)
      rawHits = r.hits
      renderedHits = r.hits.slice(0, 5)
    } else if (face === 'search') {
      rawHits = (await searchView(repoPath, c.query, Infinity)).map((r) => r.file)
      renderedHits = rawHits.slice(0, 10)
    } else if (face === 'scope') {
      const r = runScope(repoPath, c.scope_files || [])
      rawHits = r.merged
      renderedHits = [...r.entryHits.slice(0, 3), ...r.decisionHits.slice(0, 20)]
    }
    // search 面单位是 file：expected 的 anchor 后缀投影掉
    const expected = face === 'search' ? c.expected.map((e) => String(e).split('#')[0]) : c.expected
    const rr = rankWithMatches(rawHits, expected)
    const rn = rankWithMatches(renderedHits, expected)
    ranksRaw.push(rr)
    ranksRendered.push(rn)
    const isTruncated = Number.isFinite(rr) && !Number.isFinite(rn)
    if (isTruncated) truncated.push(c.id)
    details.push({
      id: c.id,
      raw_rank: Number.isFinite(rr) ? rr : null,
      rendered_rank: Number.isFinite(rn) ? rn : null,
      truncated: isTruncated,
    })
  }
  return { raw: summarize(ranksRaw), rendered: summarize(ranksRendered), truncated, details }
}
