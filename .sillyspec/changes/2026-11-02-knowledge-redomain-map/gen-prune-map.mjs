#!/usr/bin/env node
/**
 * gen-prune-map.mjs — 4B 执行脚本（一次性）
 * ① 重判定本仓 duplicate（4A 的 id+change 口径，执行时验证防 id 漂移）→ prune-map-{decisions,fr}.json
 * ② 平台两栏建议清单（模块投票 + 平票候选集）→ platform-map-suggestion.json
 * ③ 4B-REPORT.md（移交指针/守恒数字/警告）
 * 只读平台；本仓写仅发生在显式调用 CLI --map --apply 时（本脚本不直接写 knowledge）。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const LOCAL = join(repoRoot, '.sillyspec', 'knowledge')
const PLATFORM = process.env.SILLYSPEC_PLATFORM_KNOWLEDGE || 'C:/Users/qinyi/IdeaProjects/multi-agent-platform/.sillyspec/knowledge'
const TEMPLATE_RE = /设计期风险与放弃方案|风险与死路|design\s*槽\s*4\s*收割|底稿/

function readDecisionSegments(kdir, file) {
  const p = join(kdir, file)
  if (!existsSync(p)) return []
  const out = []
  for (const b of readFileSync(p, 'utf8').replace(/\r\n?/g, '\n').split(/^## /m).slice(1)) {
    const m = /^(D-(?:[A-Za-z0-9_\-\u4e00-\u9fff]+-)?\d+@v\d+)\s*(.*)$/.exec(b.split('\n')[0])
    if (!m) continue
    out.push({
      id: m[1],
      title: m[2].trim(),
      originId: (b.match(/^原编号[：:]\s*(\S+)/m) || [])[1] || '',
      change: (b.match(/^变更[：:]\s*(\S+)/m) || b.match(/^来源[：:]\s*(\S+)/m) || [])[1] || '',
      reason: (b.match(/^(?:否决理由|理由)[：:]\s*(.+)$/m) || [])[1] || '',
      hash: createHash('sha256').update(b).digest('hex').slice(0, 16),
    })
  }
  return out
}
function readFrSegments(kdir, file) {
  const p = join(kdir, file)
  if (!existsSync(p)) return []
  const out = []
  for (const b of readFileSync(p, 'utf8').replace(/\r\n?/g, '\n').split(/^## /m).slice(1)) {
    const m = /^(FR-[A-Za-z0-9-]+-\d+)\s*(.*)$/.exec(b.split('\n')[0])
    if (!m) continue
    out.push({ id: m[1], title: m[2].trim(), change: (b.match(/^变更[：:]\s*(\S+)/m) || [])[1] || '' })
  }
  return out
}
function indexRepo(kdir, kind) {
  const keyed = new Set()
  const hashes = new Map()
  const add = (e) => {
    keyed.add(`${e.id}#${e.change || ''}`)
    if (e.originId) keyed.add(`${e.originId}#${e.change || ''}`)
    if (!hashes.has(e.id)) hashes.set(e.id, new Set())
    hashes.get(e.id).add(e.hash || '')
  }
  const dir = kind === 'decisions' ? 'decisions' : 'fr'
  try {
    for (const f of readdirSync(join(kdir, dir)).filter((x) => x.endsWith('.md')).sort()) {
      for (const e of kind === 'decisions' ? readDecisionSegments(kdir, `${dir}/${f}`) : readFrSegments(kdir, `${dir}/${f}`)) add(e)
    }
  } catch { /* 无目录 */ }
  return { keyed, hashes }
}
const dupEvidence = (e, other) => {
  if (e.change) {
    if (other.keyed.has(`${e.id}#${e.change}`)) return `${e.id}@${e.change}`
    if (e.originId && other.keyed.has(`${e.originId}#${e.change}`)) return `${e.originId}@${e.change}`
    return ''
  }
  const set = other.hashes.get(e.id)
  return set && set.has(e.hash) ? `${e.id}@hash` : ''
}

// ── ① 本仓重判定 → prune map ──
const platformDec = indexRepo(PLATFORM, 'decisions')
const platformFr = indexRepo(PLATFORM, 'fr')
const localDec = readDecisionSegments(LOCAL, 'decisions/unmapped.md')
const localFr = readFrSegments(LOCAL, 'fr/unmapped.md')

const decPrune = []
const decKeep = []
for (const e of localDec) {
  const isTemplate = TEMPLATE_RE.test(`${e.title} ${e.reason}`)
  const ev = dupEvidence(e, platformDec)
  if (!isTemplate && ev) decPrune.push({ id: e.id, domain: '__prune__', evidence: ev })
  else decKeep.push({ id: e.id, template: isTemplate, dup: Boolean(ev) })
}
const frPrune = localFr.filter((e) => dupEvidence(e, platformFr)).map((e) => ({ id: e.id, domain: '__prune__', evidence: dupEvidence(e, platformFr) }))
const frKeep = localFr.filter((e) => !dupEvidence(e, platformFr)).map((e) => ({ id: e.id }))

writeFileSync(join(here, 'prune-map-decisions.json'), JSON.stringify(decPrune.map(({ id, domain }) => ({ id, domain })), null, 2) + '\n')
writeFileSync(join(here, 'prune-map-fr.json'), JSON.stringify(frPrune.map(({ id, domain }) => ({ id, domain })), null, 2) + '\n')

// ── ② 平台两栏建议（模块投票 + 平票候选集）──
const { pathToFileURL } = await import('node:url')
const { discoverModuleIndex } = await import(pathToFileURL(join(repoRoot, 'src', 'decision-distill.js')).href)
const { matchedModuleIds, frCoverageFiles } = await import(pathToFileURL(join(repoRoot, 'src', 'fr-index.js')).href)
const platformModuleIndex = discoverModuleIndex(PLATFORM) || { modules: {} }
function voteWithTies(files, moduleIndex) {
  const tally = new Map()
  for (const f of files) for (const mid of matchedModuleIds(moduleIndex, f)) tally.set(mid, (tally.get(mid) || 0) + 1)
  if (tally.size === 0) return { domain: null, candidates: [] }
  const sorted = [...tally.entries()].sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))
  const top = sorted[0][1]
  const winners = sorted.filter(([, n]) => n === top).map(([d]) => d)
  return winners.length === 1 ? { domain: winners[0], candidates: [] } : { domain: null, candidates: winners.sort() }
}
// 平台 unmapped 段（决策面：锚点路径 + 变更覆盖面投票；fr 面：变更覆盖面）
const platformUnmappedDec = readDecisionSegments(PLATFORM, 'decisions/unmapped.md')
const archiveRoot = join(PLATFORM, '.sillyspec'.replace('.sillyspec', ''), '.sillyspec', 'changes', 'archive')
const suggestion = []
const needsManual = []
const platformArchiveRoot = join(PLATFORM, '..', 'changes', 'archive')
for (const e of platformUnmappedDec) {
  if (TEMPLATE_RE.test(`${e.title} ${e.reason}`)) continue // 模板不进建议
  const anchorFiles = (e.reason.match(/[\w./-]+\.[a-z]{1,6}/gi) || []).map((s) => s.replace(/^.*?:\/\//, ''))
  const cov = e.change ? [...frCoverageFiles({ archiveRoot: platformArchiveRoot, changeName: e.change })] : []
  const files = [...new Set([...anchorFiles, ...cov])]
  const v = voteWithTies(files, platformModuleIndex)
  const row = { id: e.id, title: e.title, change: e.change, ...v }
  if (v.domain) suggestion.push(row)
  else needsManual.push({ ...row, note: '平票或零命中——人工定域' })
}
writeFileSync(join(here, 'platform-map-suggestion.json'), JSON.stringify({ generated_at: new Date().toISOString(), direct: suggestion, manual: needsManual, note: '执行时在平台仓重新生成/验证；平票只列候选域集不填 domain；平台 fr/backend.md 存在无段头孤儿字段块，执行 --map 前先修结构' }, null, 2) + '\n')

// ── ③ 报告 ──
const md = []
md.push('# 4B 执行报告')
md.push('')
md.push(`生成时间：${new Date().toISOString()}`)
md.push('')
md.push('## 本仓重判定（防 id 漂移——执行时验证）')
md.push('')
md.push(`- decisions/unmapped：${localDec.length} 段 = 模板 ${decKeep.filter((e) => e.template).length} + unique/不可判 ${decKeep.filter((e) => !e.template && !e.dup).length} + 待裁 duplicate ${decPrune.length}`)
md.push(`- fr/unmapped：${localFr.length} 段 = 保留 ${frKeep.length} + 待裁 duplicate ${frPrune.length}`)
md.push('- 清单：prune-map-decisions.json / prune-map-fr.json（domain=__prune__，含证据）')
md.push('')
md.push('## 执行命令（人工核后运行）')
md.push('')
md.push('```bash')
md.push(`node bin/sillyspec.js knowledge redomain-unmapped --face decisions --map ${join(here, 'prune-map-decisions.json')} --apply`)
md.push(`node bin/sillyspec.js knowledge redomain-unmapped --face fr --map ${join(here, 'prune-map-fr.json')} --apply`)
md.push('```')
md.push('')
md.push('## 移交平台（9 条 unique，指针 + 增量说明）')
md.push('')
md.push('见 4A 归档 ledger（.sillyspec/changes/archive/2026-11-02-knowledge-provenance/redomain-provenance.json，cls=unique 且 repo=sillyspec）。增量说明：7 条 decisions unique 锚点全部「未记录」、无「变更：」行（seed 手工回填）——模块投票零命中，域建议只能人工（内容主题：daemon 授权/auth/PPM）；2 条 fr unique 同为平台功能。')
md.push('')
md.push('## 平台建议清单')
md.push('')
md.push(`两栏见 platform-map-suggestion.json：direct ${suggestion.length} 条（可直喂 --map）+ manual ${needsManual.length} 条（平票/零命中，只列候选域）。注意：平台文件在漂移，执行时须重新生成；平台 fr/backend.md 有无段头孤儿字段块，--map 前先修结构。`)
md.push('')
md.push('## 头注失真（记 4C）')
md.push('')
md.push('fr/unmapped.md 头注「本池残余 625 条」——裁剪后剩 2 条，数字修正留 4C（known-issues resolved 状态变更一并处理）。')
writeFileSync(join(here, '4B-REPORT.md'), md.join('\n') + '\n')

console.log(JSON.stringify({
  ok: true,
  decisions: { total: localDec.length, prune: decPrune.length, keep: decKeep.length },
  fr: { total: localFr.length, prune: frPrune.length, keep: frKeep.length },
  platform: { direct: suggestion.length, manual: needsManual.length },
}, null, 2))
