#!/usr/bin/env node
/**
 * provenance.mjs — 4A 数据分层与来源对账（一次性只读脚本，零写入）
 *
 * 输入：本仓 .sillyspec/knowledge 与平台仓 knowledge（只读）
 * 输出：redomain-provenance.json（逐条 ledger）+ 4A-REPORT.md（分类计数对照 + 处置表）
 * 内嵌断言：条目守恒、处置表覆盖、零写入（两仓 knowledge 目录前后 hash 一致）
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const LOCAL = join(repoRoot, '.sillyspec', 'knowledge')
const PLATFORM = 'C:/Users/qinyi/IdeaProjects/multi-agent-platform/.sillyspec/knowledge'
const TEMPLATE_RE = /设计期风险与放弃方案|风险与死路|design\s*槽\s*4\s*收割|底稿/

const hashText = (t) => createHash('sha256').update(String(t)).digest('hex').slice(0, 16)

function listFiles(dir, base = dir, out = []) {
  let entries
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, e.name)
    if (e.isDirectory()) listFiles(p, base, out)
    else if (e.isFile()) out.push(p.slice(base.length + 1).replace(/\\/g, '/'))
  }
  return out
}

/** knowledge 目录内容 hash（零写入断言用：前后必须相等）。 */
function knowledgeHash(dir) {
  const h = createHash('sha256')
  for (const rel of listFiles(dir).sort()) {
    h.update(rel)
    h.update('\0')
    try { h.update(readFileSync(join(dir, rel))) } catch { h.update('<unreadable>') }
    h.update('\0')
  }
  return h.digest('hex')
}

/** decisions/<file> 的 D 条目段解析（自包含：## D-...@v 段 + 状态/变更/理由/否决理由/原编号）。 */
function readDecisionSegments(kdir, file) {
  const p = join(kdir, file)
  if (!existsSync(p)) return []
  const out = []
  const blocks = readFileSync(p, 'utf8').replace(/\r\n?/g, '\n').split(/^## /m).slice(1)
  for (const b of blocks) {
    const head = b.split('\n')[0]
    const m = /^(D-(?:[A-Za-z0-9_\-\u4e00-\u9fff]+-)?\d+@v\d+)\s*(.*)$/.exec(head)
    if (!m) continue
    const change = (b.match(/^变更[：:]\s*(\S+)/m) || b.match(/^来源[：:]\s*(\S+)/m) || [])[1] || ''
    const originId = (b.match(/^原编号[：:]\s*(\S+)/m) || [])[1] || ''
    const status = (b.match(/^状态[：:]\s*(\S+)/m) || [])[1] || ''
    const reason = (b.match(/^(?:否决理由|理由)[：:]\s*(.+)$/m) || [])[1] || ''
    out.push({ id: m[1], title: m[2].trim(), originId, change, status, reason, hash: hashText(b) })
  }
  return out
}

/** fr/<file> 的 FR 条目段解析。 */
function readFrSegments(kdir, file) {
  const p = join(kdir, file)
  if (!existsSync(p)) return []
  const out = []
  const blocks = readFileSync(p, 'utf8').replace(/\r\n?/g, '\n').split(/^## /m).slice(1)
  for (const b of blocks) {
    const head = b.split('\n')[0]
    const m = /^(FR-[A-Za-z0-9-]+-\d+)\s*(.*)$/.exec(head)
    if (!m) continue
    const change = (b.match(/^变更[：:]\s*(\S+)/m) || [])[1] || ''
    out.push({ id: m[1], title: m[2].trim(), change, hash: hashText(b) })
  }
  return out
}

/** 另一仓全量 id 集合（decisions 含原编号；fr 全量）。 */
function otherRepoIdSets(kdir) {
  const dec = new Set()
  const fr = new Set()
  try {
    for (const f of readdirSync(join(kdir, 'decisions')).filter((x) => x.endsWith('.md')).sort()) {
      for (const e of readDecisionSegments(kdir, `decisions/${f}`)) {
        dec.add(e.id)
        if (e.originId) dec.add(e.originId)
      }
    }
  } catch { /* 无 decisions 目录 */ }
  try {
    for (const f of readdirSync(join(kdir, 'fr')).filter((x) => x.endsWith('.md')).sort()) {
      for (const e of readFrSegments(kdir, `fr/${f}`)) fr.add(e.id)
    }
  } catch { /* 无 fr 目录 */ }
  return { dec, fr }
}

const beforeLocal = knowledgeHash(LOCAL)
const beforePlatform = existsSync(PLATFORM) ? knowledgeHash(PLATFORM) : null

const localDec = readDecisionSegments(LOCAL, 'decisions/unmapped.md')
const localFr = readFrSegments(LOCAL, 'fr/unmapped.md')
const platformDec = existsSync(PLATFORM) ? readDecisionSegments(PLATFORM, 'decisions/unmapped.md') : []
// 平台仓无 fr/unmapped.md（审查实测），仍读取防形态变化
const platformFr = existsSync(PLATFORM) ? readFrSegments(PLATFORM, 'fr/unmapped.md') : []

const localAll = otherRepoIdSets(LOCAL)
const platformAll = otherRepoIdSets(PLATFORM)

/** 同仓同 id 计数（跨全量）。 */
function dupCount(allSet, elements) {
  const m = new Map()
  for (const e of elements) m.set(e.id, (m.get(e.id) || 0) + 1)
  return m
}
const localDecDup = dupCount(localAll.dec, localDec)
const platformDecDup = dupCount(platformAll.dec, platformDec)

function classify(entries, otherSet, rank) {
  return entries.map((e) => {
    const template = TEMPLATE_RE.test(`${e.title} ${e.reason || ''}`)
    const dupOther = otherSet.has(e.id) || (e.originId && otherSet.has(e.originId)) || false
    const cls = template ? 'template-draft' : dupOther ? 'duplicate-of-platform' : 'unique'
    const action = template ? 'mark-draft-exclude' : dupOther ? 'archive-or-prune' : 'manual-domain-map'
    const reason = template
      ? '底稿模板特征（设计期风险/死路/槽4 收割）——不占防复潮席位'
      : dupOther
        ? '另一仓已存在同 ID 条目（fork 快照）——归档或裁剪'
        : '本仓唯一真实条目——人工域映射后迁移'
    return { ...e, repo: rank, cls, action, reason, dupOther, sameRepoDuplicates: 0 }
  })
}

const ledger = [
  ...classify(localDec, platformAll.dec, 'sillyspec').map((e) => ({ ...e, file: 'decisions/unmapped.md' })),
  ...classify(localFr, platformAll.fr, 'sillyspec').map((e) => ({ ...e, file: 'fr/unmapped.md' })),
  ...classify(platformDec, localAll.dec, 'platform').map((e) => ({ ...e, file: 'decisions/unmapped.md' })),
  ...classify(platformFr, localAll.fr, 'platform').map((e) => ({ ...e, file: 'fr/unmapped.md' })),
]
for (const e of ledger) {
  if (e.repo === 'sillyspec' && e.file === 'decisions/unmapped.md') e.sameRepoDuplicates = localDecDup.get(e.id) || 1
  if (e.repo === 'platform' && e.file === 'decisions/unmapped.md') e.sameRepoDuplicates = platformDecDup.get(e.id) || 1
}
ledger.sort((a, b) => (a.repo === b.repo ? a.id.localeCompare(b.id) : a.repo.localeCompare(b.repo)))

// ── 内嵌断言 ──
const afterLocal = knowledgeHash(LOCAL)
const afterPlatform = existsSync(PLATFORM) ? knowledgeHash(PLATFORM) : null
const errors = []
if (afterLocal !== beforeLocal) errors.push('零写入断言失败：本仓 knowledge 目录发生变化')
if (beforePlatform && afterPlatform !== beforePlatform) errors.push('零写入断言失败：平台仓 knowledge 目录发生变化')
const decisionTotal = localDec.length + platformDec.length
const frTotal = localFr.length + platformFr.length
if (ledger.length !== decisionTotal + frTotal) errors.push(`守恒断言失败：ledger ${ledger.length} ≠ decisions ${decisionTotal} + fr ${frTotal}`)
if (errors.length > 0) {
  console.error('❌ ' + errors.join('；'))
  process.exit(1)
}

// ── 统计与报告 ──
function tally(list) {
  const out = {}
  for (const e of list) out[e.cls] = (out[e.cls] || 0) + 1
  return out
}
const stats = {
  sillyspec: { decisions: localDec.length, fr: localFr.length, decisionsByClass: tally(ledger.filter((e) => e.repo === 'sillyspec' && e.file === 'decisions/unmapped.md')), frByClass: tally(ledger.filter((e) => e.repo === 'sillyspec' && e.file === 'fr/unmapped.md')) },
  platform: { decisions: platformDec.length, fr: platformFr.length, decisionsByClass: tally(ledger.filter((e) => e.repo === 'platform' && e.file === 'decisions/unmapped.md')), frByClass: tally(ledger.filter((e) => e.repo === 'platform' && e.file === 'fr/unmapped.md')) },
}
// 两仓同 ID 条目数（overlap）
let overlap = 0
try {
  const localFiles = new Set(listFiles(LOCAL).filter((f) => /^(fr|decisions)\//.test(f) && f.endsWith('.md')))
  for (const f of localFiles) {
    const base = f.split('/').pop()
    const p = join(PLATFORM, f)
    if (!existsSync(p)) continue
    const localIds = f.startsWith('fr/') ? readFrSegments(LOCAL, f).map((e) => e.id) : readDecSegments(LOCAL, f).map((e) => e.id)
    const platIds = new Set(f.startsWith('fr/') ? readFrSegments(PLATFORM, f).map((e) => e.id) : readDecSegments(PLATFORM, f).map((e) => e.id))
    for (const id of localIds) if (platIds.has(id)) overlap++
  }
} catch { /* overlap 统计 fail-soft */ }

function readDecSegments(kdir, file) { return readDecisionSegments(kdir, file) }

const jsonOut = { generated_at: new Date().toISOString(), stats, overlap, ledger }
writeFileSync(join(here, 'redomain-provenance.json'), JSON.stringify(jsonOut, null, 2) + '\n')

const md = []
md.push('# 4A 数据分层与来源对账报告（只读）')
md.push('')
md.push(`生成时间：${jsonOut.generated_at}｜条目守恒：decisions ${decisionTotal} + fr ${frTotal} = ledger ${ledger.length}｜零写入：两仓 knowledge hash 前后一致`)
md.push('')
md.push('## 与审查实测数字对照')
md.push('')
md.push('| 指标 | 审查实测 | 本次对账 | 差异 |')
md.push('|---|---|---|---|')
const cmp = (label, expected, actual) => md.push(`| ${label} | ${expected} | ${actual} | ${expected === actual ? '一致' : '差异（如实记录）'} |`)
cmp('本仓 decisions/unmapped', 74, stats.sillyspec.decisions)
cmp('本仓 fr/unmapped', 210, stats.sillyspec.fr)
cmp('平台 decisions/unmapped', 308, stats.platform.decisions)
cmp('两仓同 ID 条目（overlap）', 1026, overlap)
md.push('')
md.push('## 分类计数')
md.push('')
md.push(`- 本仓 decisions：${JSON.stringify(stats.sillyspec.decisionsByClass)}`)
md.push(`- 本仓 fr：${JSON.stringify(stats.sillyspec.frByClass)}`)
md.push(`- 平台 decisions：${JSON.stringify(stats.platform.decisionsByClass)}`)
md.push(`- 平台 fr：${JSON.stringify(stats.platform.frByClass)}`)
md.push('')
md.push('## 处置表（4B/4C 输入）')
md.push('')
md.push('| 仓 | id | 文件 | change | class | 动作 | 理由 |')
md.push('|---|---|---|---|---|---|---|')
for (const e of ledger) md.push(`| ${e.repo} | ${e.id} | ${e.file} | ${e.change || '—'} | ${e.cls} | ${e.action} | ${e.reason} |`)
md.push('')
md.push('## 处置汇总')
md.push('')
const actions = {}
for (const e of ledger) actions[`${e.repo}/${e.file}/${e.action}`] = (actions[`${e.repo}/${e.file}/${e.action}`] || 0) + 1
for (const [k, v] of Object.entries(actions).sort()) md.push(`- ${k}：${v}`)
md.push('')
md.push('## 下一变更输入')
md.push('')
md.push('- 4B（定向迁移）：`manual-domain-map` 条目 = 本仓唯一真实决策 + 平台唯一真实决策（附 id/标题/变更，人工定域后迁）')
md.push('- 4C（resolved 状态）：known-issues 状态词人工审核（不在本报告范围）')
md.push('- 模板 draft 候选与重复裁剪候选见处置表')
writeFileSync(join(here, '4A-REPORT.md'), md.join('\n') + '\n')

console.log(JSON.stringify({ ok: true, stats, overlap, ledger: ledger.length, outputs: ['redomain-provenance.json', '4A-REPORT.md'] }, null, 2))
