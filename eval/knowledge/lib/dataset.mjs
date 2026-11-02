/**
 * eval/knowledge/lib/dataset.mjs — 三源数据集加载/校验/现场构建
 *
 * organic：提交冻结的 JSONL（遥测 query 抽样 + 人工 anchor 级标签），加载即校验。
 * self：现场从归档 flow-state.input 构建，期望集 = 该变更蒸馏出的决策（按 变更+id/原编号 映射），
 *       仅用于「蒸馏→检索链路」smoke，禁止进质量指标（自产自测偏差，design 已论证）。
 * probes：fixtures 目录枚举（每个子目录一个缺陷探针，runner 负责执行）。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseDecisionEntries } from '../../../src/knowledge-match.js'
import { readFlowState } from '../../../src/flow-state.js'

const FACES = new Set(['entries', 'decisions', 'search', 'scope'])

/** organic case 字段校验；返回 null = 合法，否则错误原因。
 *  repo 是数据集标签（对应 --repo 的 label 或路径 basename），非项目枚举——任意仓可用。 */
export function validateOrganicCase(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'not-object'
  if (!c.id || typeof c.id !== 'string') return 'id'
  if (!c.repo || typeof c.repo !== 'string') return 'repo'
  if (!FACES.has(c.face)) return 'face'
  if (!c.query || typeof c.query !== 'string' || !c.query.trim()) return 'query'
  if (!Array.isArray(c.expected) || c.expected.length === 0) return 'expected-empty'
  if (c.expected.some((e) => typeof e !== 'string' || !e.trim())) return 'expected-item'
  return null
}

/**
 * 加载 organic JSONL：空行/`//` 注释跳过；坏 JSON、字段缺失、expected 空 → skipped（禁止静默当零命中）。
 * @returns {{cases: Array, skipped: Array<{line:number, reason:string, id?:string}>, missing: boolean}}
 */
export function loadOrganic(filePath) {
  const cases = []
  const skipped = []
  if (!existsSync(filePath)) return { cases, skipped, missing: true }
  const lines = readFileSync(filePath, 'utf8').split('\n')
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line || line.startsWith('//')) return
    let c
    try { c = JSON.parse(line) } catch { skipped.push({ line: i + 1, reason: 'bad-json' }); return }
    const err = validateOrganicCase(c)
    if (err) { skipped.push({ line: i + 1, reason: err, id: c && c.id }); return }
    cases.push({ source: 'organic', ...c })
  })
  return { cases, skipped, missing: false }
}

/**
 * 现场构建 self 集：归档 flow-state.input → 该变更蒸馏决策的映射（变更+id 或 变更+原编号）。
 * 映射不到任何决策的归档 → skipped（无期望集可测，不造 case）。
 * @returns {{cases: Array, skipped: Array<{archive:string, reason:string}>}}
 */
export function buildSelfCases(repoRoot, repo) {
  const archive = join(repoRoot, '.sillyspec', 'changes', 'archive')
  const knowledgeDir = join(repoRoot, '.sillyspec', 'knowledge')
  const cases = []
  const skipped = []
  if (!existsSync(archive)) return { cases, skipped }
  const decisions = parseDecisionEntries(knowledgeDir)
  for (const name of readdirSync(archive).sort()) {
    const dir = join(archive, name)
    const st = readFlowState(dir)
    if (!st || !st.input || typeof st.input !== 'string' || !st.input.trim()) {
      skipped.push({ archive: name, reason: 'no-input' })
      continue
    }
    const dmd = join(dir, 'decisions.md')
    if (!existsSync(dmd)) { skipped.push({ archive: name, reason: 'no-decisions-md' }); continue }
    const localIds = [...readFileSync(dmd, 'utf8').matchAll(/^##\s+(D-(?:[A-Za-z0-9_-]+-)?\d+@v\d+)/gm)].map((m) => m[1])
    const own = []
    for (const id of localIds) {
      const hit = decisions.find((h) => h.change === name && (h.id === id || h.originId === id))
      if (hit) own.push(`${hit.file}#${hit.id}`)
    }
    if (own.length === 0) { skipped.push({ archive: name, reason: 'no-mapped-decision' }); continue }
    cases.push({
      source: 'self', id: `self-${name}`, repo, face: 'self',
      query: st.input.trim(), expected: [...new Set(own)], own: [...new Set(own)],
    })
  }
  return { cases, skipped }
}

/**
 * 遥测 inject 事件 → organic 候选池（去重 change+query，单变更限流）。
 * @returns {Array<{change:string, query:string}>}
 */
export function extractTelemetryPool(telemetryPath, { limitPerChange = 3 } = {}) {
  if (!existsSync(telemetryPath)) return []
  const seen = new Set()
  const byChange = new Map()
  for (const line of readFileSync(telemetryPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t) continue
    let r
    try { r = JSON.parse(t) } catch { continue }
    if (!r || r.type !== 'inject' || typeof r.query !== 'string' || typeof r.change !== 'string') continue
    const q = r.query.replace(/\r\n/g, '\n').trim()
    if (!q) continue
    const key = `${r.change}\u0000${q}`
    if (seen.has(key)) continue
    seen.add(key)
    const arr = byChange.get(r.change) || []
    if (arr.length < limitPerChange) arr.push(q)
    byChange.set(r.change, arr)
  }
  const out = []
  for (const [change, queries] of byChange) for (const q of queries) out.push({ change, query: q })
  // 稳定排序（不依赖遥测事件到达顺序——乱序/迟到无关，变量见 design 盲维①）
  out.sort((a, b) => a.change.localeCompare(b.change) || a.query.localeCompare(b.query))
  return out
}

/** 枚举探针 fixture 目录（每子目录一个；无目录 = 空数组）。 */
export function listProbes(fixturesDir) {
  try {
    return readdirSync(fixturesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  } catch {
    return []
  }
}
