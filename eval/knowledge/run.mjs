#!/usr/bin/env node
/**
 * eval/knowledge/run.mjs — 知识检索评测 runner（变更 0：评测面）
 *
 * 通用性（工具中立）：不枚举任何具体项目——`--repo` 接受任意仓路径（逗号分隔，
 * 可 `<label>:<path>` 显式标签），缺省评当前仓；organic 数据集的 repo 字段是标签，
 * 与 `--repo` 的 label 或路径 basename 对应。
 *
 * 用法：
 *   node eval/knowledge/run.mjs [--repo <path|label:path>[,<path>…]] [--face entries|decisions|search|scope|all]
 *                               [--set-baseline] [--json] [--smoke]
 *
 * 设计锚：.sillyspec/changes/2026-11-02-knowledge-eval/design.md
 * 零网络零遥测：强制 SILLYSPEC_KNOWLEDGE_VECTOR=off / SILLYSPEC_HITS_PUSH=0，只调纯读引擎；
 * 唯一写点是 --set-baseline 的 baseline.json（临时文件+rename 原子落盘）与图派生缓存（可再生）。
 * 面：entries@3（flow 📚）、decisions@5（rejected 优先）、search@10（cmdSearch 等价）、
 *     scope@3/20（图遍历）；raw=引擎全量、rendered=消费面切片，per-case 名次进 details。
 */
import { existsSync, readFileSync, writeFileSync, renameSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { loadOrganic, buildSelfCases } from './lib/dataset.mjs'
import { runDecisions } from './lib/engine.mjs'
import { snapshotFingerprint } from './lib/snapshot.mjs'
import { runAllProbes } from './lib/probes.mjs'
import { renderTable, diffBaseline } from './lib/report.mjs'
import { runFace, rankWithMatches, FACES } from './lib/faces.mjs'
import { parseRepoArgs } from './lib/repos.mjs'

process.env.SILLYSPEC_KNOWLEDGE_VECTOR = 'off'
process.env.SILLYSPEC_HITS_PUSH = '0'

const here = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = join(here, '..', '..')
const DATASET = join(here, 'datasets', 'organic.jsonl')
const BASELINE = join(here, 'baseline.json')

const args = process.argv.slice(2)
const has = (n) => args.includes(n)
const val = (n) => {
  const i = args.indexOf(n)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null
}

const facesArg = val('--face') || 'all'
if (!['all', ...FACES].includes(facesArg)) {
  console.error(`❌ 未知面：${facesArg}（可选 ${['all', ...FACES].join('|')}）`)
  process.exit(2)
}
let REPO_ROOTS
try {
  REPO_ROOTS = parseRepoArgs(val('--repo'), repoRoot)
} catch (e) {
  console.error(`❌ ${e.message}`)
  process.exit(2)
}
const wantFaces = facesArg === 'all' ? FACES : [facesArg]

/** self 集 smoke：own 命中率 + name-only 对照（leak_gap = full − name_only，越接近 0 越靠变更名泄漏）。 */
function runSelfSmoke(repoPath, repo) {
  const { cases, skipped } = buildSelfCases(repoPath, repo)
  if (cases.length === 0) return { cases: 0, skipped: skipped.length }
  let full = 0
  let nameOnly = 0
  for (const c of cases) {
    const name = c.id.replace(/^self-/, '')
    const ownHit = (q) => rankWithMatches(runDecisions(repoPath, q).hits, c.own) <= 3
    if (ownHit(c.query)) full++
    if (ownHit(name)) nameOnly++
  }
  const n = cases.length
  const r4 = (x) => Math.round(x * 10000) / 10000
  return {
    cases: n,
    skipped: skipped.length,
    own_hit_top3: r4(full / n),
    name_only_top3: r4(nameOnly / n),
    leak_gap: r4((full - nameOnly) / n),
  }
}

/** --smoke：零数据依赖冒烟（probes + baseline 原子读写往返于 mkdtemp）。 */
async function runSmoke() {
  const probes = Object.fromEntries((await runAllProbes()).map((p) => [p.defect, p.pass]))
  const dir = mkdtempSync(join(tmpdir(), 'ek-smoke-'))
  try {
    const f = join(dir, 'baseline.json')
    const tmp = `${f}.tmp`
    const payload = { version: 1, probes }
    writeFileSync(tmp, JSON.stringify(payload, null, 2))
    renameSync(tmp, f)
    const back = JSON.parse(readFileSync(f, 'utf8'))
    if (JSON.stringify(back) !== JSON.stringify(payload)) throw new Error('baseline 读写往返失败')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  return probes
}

async function main() {
  if (has('--smoke')) {
    const probes = await runSmoke()
    const detected = Object.entries(probes).filter(([, p]) => p === false).map(([d]) => d)
    const out = { ok: true, mode: 'smoke', probes, detected_defects: detected }
    if (has('--json')) {
      console.log(JSON.stringify(out, null, 2))
      return
    }
    console.log(renderTable({ metrics: {}, probes }))
    console.log(detected.length
      ? `\nℹ️ 检出缺陷 ${detected.length} 类（probe RED = 缺陷仍在，修复后转 GREEN）：${detected.join('、')}`
      : '\n✅ 全部探针 GREEN')
    return
  }

  const { cases: organic, skipped } = loadOrganic(DATASET)
  const result = {
    version: 1,
    generated_by: 'eval/knowledge/run.mjs',
    snapshot: {},
    cases: {},
    metrics: {},
    self_smoke: {},
    probes: {},
    warnings: [],
  }
  for (const [repo, path] of REPO_ROOTS) {
    const repoCases = organic.filter((c) => c.repo === repo)
    result.cases[repo] = { organic: repoCases.length, self: 0 }
    if (!existsSync(join(path, '.sillyspec', 'knowledge'))) {
      result.warnings.push(existsSync(path)
        ? `仓无 .sillyspec/knowledge：${repo} → ${path}`
        : `仓路径不存在：${repo} → ${path}`)
      result.snapshot[repo] = { head: '', knowledge_hash: '', knowledge_files: 0, missing: true }
      result.metrics[repo] = {}
      continue
    }
    result.snapshot[repo] = snapshotFingerprint(path)
    result.metrics[repo] = {}
    for (const face of wantFaces) {
      let faceCases = []
      if (face === 'entries') faceCases = repoCases.filter((c) => c.face === 'entries')
      else if (face === 'decisions') faceCases = repoCases.filter((c) => c.face === 'decisions')
      else if (face === 'search') faceCases = repoCases.filter((c) => c.face === 'entries')
      else if (face === 'scope') faceCases = repoCases.filter((c) => Array.isArray(c.scope_files) && c.scope_files.length > 0)
      result.metrics[repo][face] = await runFace(path, face, faceCases)
    }
    const self = runSelfSmoke(path, repo)
    result.self_smoke[repo] = self
    result.cases[repo].self = self.cases
  }
  const unmatched = organic.filter((c) => !REPO_ROOTS.has(c.repo))
  result.probes = Object.fromEntries((await runAllProbes()).map((p) => [p.defect, p.pass]))

  let diffs = { mismatches: [], changes: [], baselineSummary: {} }
  if (has('--set-baseline')) {
    const tmp = `${BASELINE}.tmp-${process.pid}`
    writeFileSync(tmp, JSON.stringify(result, null, 2) + '\n')
    renameSync(tmp, BASELINE) // 原子落盘（中途崩溃不产半截基线）
  } else if (existsSync(BASELINE)) {
    try {
      diffs = diffBaseline(result, JSON.parse(readFileSync(BASELINE, 'utf8')))
    } catch (e) {
      diffs.error = `baseline 解析失败：${e.message}——按无基线处理（当前指标仍有效）`
    }
  }

  if (has('--json')) {
    console.log(JSON.stringify({ ok: true, skipped_cases: skipped.length, unmatched_cases: unmatched.length, ...result, diff: diffs }, null, 2))
    return
  }
  console.log(renderTable(result))
  if (result.warnings.length > 0) console.log(`\n⚠️ ${result.warnings.join('；')}`)
  if (skipped.length > 0) console.log(`\n⚠️ organic 跳过 ${skipped.length} 条（字段缺失/期望空）：${skipped.map((s) => `${s.id || `L${s.line}`}:${s.reason}`).join(' ')}`)
  if (unmatched.length > 0) console.log(`\n⚠️ organic 有 ${unmatched.length} 条未匹配本次仓标签（${[...new Set(unmatched.map((c) => c.repo))].join('、')}）——用 --repo label:path 对齐标签或忽略`)
  if (diffs.error) console.log(`\n⚠️ ${diffs.error}`)
  if (diffs.mismatches.length > 0) {
    console.log(`\n⚠️ ${diffs.mismatches.join('；')}——基线与当前快照不一致，两套指标并列如下`)
    for (const [k, v] of Object.entries(diffs.baselineSummary || {})) {
      console.log(`   baseline ${k}: raw top1=${v.raw.top1} top3=${v.raw.top3} mrr=${v.raw.mrr}`
        + ` | rendered top1=${v.rendered.top1} top3=${v.rendered.top3} mrr=${v.rendered.mrr}`)
    }
  }
  if (diffs.changes.length > 0) console.log(`\n📊 相对 baseline 变化：\n  ${diffs.changes.join('\n  ')}`)
  if (has('--set-baseline')) console.log(`\n✅ baseline 已写入 ${BASELINE}`)
}

main().catch((e) => {
  console.error(`❌ 评测失败：${e && e.stack ? e.stack : e}`)
  process.exit(1)
})
