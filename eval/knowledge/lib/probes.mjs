/**
 * eval/knowledge/lib/probes.mjs — 六类缺陷探针执行器
 *
 * fixture 物化到 mkdtemp 仓根（<root>/.sillyspec/knowledge/...）后跑真实引擎函数，
 * 断言按 evaluateCase 语义评估。pass = 修复后期望；缺陷存在时 pass=false（检出缺陷）。
 * 临时目录 finally 清理；不写仓、不触网络/遥测。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { PROBE_FIXTURES } from '../fixtures/index.mjs'
import { runEntries, runDecisions, searchView, runScope, catalogHealth } from './engine.mjs'

/** expected 匹配：含 "#" 精确；否则文件级前缀（hit === exp 或 hit.startsWith(exp + "#")）。 */
export function hitMatches(hit, expected) {
  if (String(expected).includes('#')) return hit === expected
  return hit === expected || String(hit).startsWith(`${expected}#`)
}

function containsAll(hits, expected) {
  return (expected || []).every((e) => hits.some((h) => hitMatches(h, e)))
}

function excludesAll(hits, expected) {
  return (expected || []).every((e) => !hits.some((h) => hitMatches(h, e)))
}

/** 物化 fixture 到 mkdtemp 仓根；写入中途失败时清理临时目录再抛（不泄漏）。 */
export function materialize(fixture) {
  const root = mkdtempSync(join(tmpdir(), `ek-probe-${fixture.defect}-`))
  try {
    const kdir = join(root, '.sillyspec', 'knowledge')
    for (const [rel, content] of Object.entries(fixture.files || {})) {
      const p = join(kdir, rel)
      mkdirSync(dirname(p), { recursive: true })
      writeFileSync(p, content)
    }
  } catch (e) {
    rmSync(root, { recursive: true, force: true })
    throw e
  }
  return root
}

/** 单 case 评估 → { name, pass, detail, hits }。 */
export async function evaluateCase(repoRoot, c) {
  const expect = c.expect || {}
  const fails = []
  let hits = []
  if (c.kind === 'entries' || c.kind === 'search' || c.kind === 'decisions' || c.kind === 'scope') {
    if (c.kind === 'entries') hits = runEntries(repoRoot, c.query).hits
    else if (c.kind === 'decisions') hits = runDecisions(repoRoot, c.query).hits
    else if (c.kind === 'scope') hits = runScope(repoRoot, c.scope_files || []).merged
    else {
      const rows = await searchView(repoRoot, c.query, Infinity)
      hits = rows.map((r) => r.file)
      if (expect.score_contract) {
        const bad = rows.filter((r) => r.score !== r.matchedTags.length)
        if (bad.length > 0) fails.push(`score 契约违反：${bad.map((r) => `${r.file} score=${r.score} 命中=${r.matchedTags.length}`).join('；')}`)
      }
    }
    if (!containsAll(hits, expect.contains)) fails.push(`缺少期望命中：${(expect.contains || []).filter((e) => !hits.some((h) => hitMatches(h, e))).join('、')}`)
    if (!excludesAll(hits, expect.excludes)) fails.push(`出现禁止命中：${(expect.excludes || []).filter((e) => hits.some((h) => hitMatches(h, e))).join('、')}`)
    if (expect.empty === true && hits.length > 0) fails.push(`期望空命中但得到 ${hits.length} 条`)
    if (expect.empty === false && hits.length === 0) fails.push('期望非空但零命中')
  } else if (c.kind === 'catalog') {
    const health = catalogHealth(repoRoot)
    hits = [`total=${health.total}`, `anchored=${health.anchored}`, `files=${health.files}`, `linked=${health.linked}`]
    for (const [k, v] of Object.entries(expect.health || {})) {
      if (health[k] !== v) fails.push(`catalog.${k}=${health[k]} ≠ 期望 ${v}`)
    }
  } else {
    fails.push(`未知 kind：${c.kind}`)
  }
  return {
    name: c.name || c.kind,
    pass: fails.length === 0,
    detail: fails.length === 0 ? `ok（hits=${hits.length}）` : fails.join('；'),
    hits: hits.slice(0, 8),
  }
}

/** 全量探针（六个 fixture 顺序执行；tmp 目录 finally 清理）。 */
export async function runAllProbes() {
  const out = []
  for (const fixture of PROBE_FIXTURES) {
    let root = ''
    try {
      root = materialize(fixture)
      const cases = []
      for (const c of fixture.cases) cases.push(await evaluateCase(root, c))
      out.push({ defect: fixture.defect, pass: cases.every((c) => c.pass), cases })
    } finally {
      if (root) rmSync(root, { recursive: true, force: true })
    }
  }
  return out
}
