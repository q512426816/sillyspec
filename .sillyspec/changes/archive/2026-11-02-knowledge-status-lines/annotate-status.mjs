#!/usr/bin/env node
/**
 * annotate-status.mjs — 4C 状态行标注（一次性）
 * ① 本仓 known-issues.md 53 条：emoji+标题词+正文启发式 → 建议清单 → --write 落盘状态行
 * ② 平台 48 条：只读建议清单（零写断言）
 * 用法：node annotate-status.mjs [--write]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const LOCAL_KI = join(repoRoot, '.sillyspec', 'knowledge', 'known-issues.md')
const PLATFORM_KI = process.env.SILLYSPEC_PLATFORM_KNOWLEDGE
  ? join(process.env.SILLYSPEC_PLATFORM_KNOWLEDGE, 'known-issues.md')
  : 'C:/Users/qinyi/IdeaProjects/multi-agent-platform/.sillyspec/knowledge/known-issues.md'
const VOCAB = new Set(['现行', '已修复', '已解决', '已退役', '观察', '债务'])
const WRITE = process.argv.includes('--write')

const fileHash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

/** 解析条目段：## heading → {heading, lines}（到下一个 ##）。 */
function parseEntries(text) {
  const out = []
  const blocks = text.replace(/\r\n?/g, '\n').split(/^## /m).slice(1)
  for (const b of blocks) {
    const heading = b.split('\n')[0].trim()
    out.push({ heading, body: b.split('\n').slice(1) })
  }
  return out
}

/** 启发式：emoji + 标题词 + 正文词 → 六值建议。 */
function suggest(heading, body) {
  const text = `${heading} ${body.join(' ')}`
  if (/已修复|已解决/.test(heading)) return '已修复'
  if (/已退役/.test(heading)) return '已退役'
  if (/🟢/.test(heading) && /已修复|已解决|修复/.test(text)) return '已修复'
  if (/🟢/.test(heading)) return '现行'
  if (/🔴/.test(heading)) return '现行'
  if (/🟡/.test(heading) && /债|遗留|缺口|未进|长期/.test(text)) return '债务'
  if (/🟡/.test(heading)) return '观察'
  return '现行'
}

// ── 本仓 ──
const localText = readFileSync(LOCAL_KI, 'utf8')
const localEntries = parseEntries(localText)
const suggestions = localEntries.map((e) => ({ heading: e.heading, status: suggest(e.heading, e.body), hasStatusLine: /^-\s*状态[：:]/.test(e.body.join('\n')) }))
const bad = suggestions.filter((s) => !VOCAB.has(s.status))
if (bad.length > 0) { console.error('❌ 词表外建议：' + bad.map((b) => `${b.heading}→${b.status}`).join('；')); process.exit(1) }
const already = suggestions.filter((s) => s.hasStatusLine)
if (WRITE && already.length > 0) { console.error(`❌ ${already.length} 条已有状态行（幂等保护，勿重复写）`); process.exit(1) }

console.log(`本仓 ${localEntries.length} 条建议（${WRITE ? '落盘' : 'dry-run'}）：`)
for (const s of suggestions) console.log(`  ${s.status.padEnd(3)} | ${s.heading.slice(0, 60)}`)

if (WRITE) {
  // 落盘（行级状态机）：每遇 ## heading 记录，首段说明结束（空行）前插入状态行
  const lines = localText.replace(/\r\n?/g, '\n').split('\n')
  const statusByHeading = new Map(suggestions.map((s) => [s.heading, s.status]))
  const out = []
  let i = 0
  let written = 0
  while (i < lines.length) {
    out.push(lines[i])
    const h = /^## (.+)$/.exec(lines[i])
    if (h && statusByHeading.has(h[1].trim())) {
      const status = statusByHeading.get(h[1].trim())
      // 向前找首段说明的结束（首个空行或下一个 ##），状态行插在空行前
      let j = i + 1
      while (j < lines.length && lines[j].trim() !== '' && !/^## /.test(lines[j])) {
        out.push(lines[j])
        j++
      }
      out.push(`- 状态：${status}`)
      written++
      i = j
      continue
    }
    i++
  }
  if (written !== localEntries.length) { console.error(`❌ 写入 ${written} ≠ 条目 ${localEntries.length}`); process.exit(1) }
  writeFileSync(LOCAL_KI, out.join('\n'))
  console.log(`✅ 落盘 ${written} 条状态行`)
}

// ── 平台（只读）──
if (existsSync(PLATFORM_KI)) {
  const before = fileHash(PLATFORM_KI)
  const platEntries = parseEntries(readFileSync(PLATFORM_KI, 'utf8'))
  const platSugg = platEntries.map((e) => ({ heading: e.heading, status: suggest(e.heading, e.body) }))
  const after = fileHash(PLATFORM_KI)
  if (before !== after) { console.error('❌ 平台零写断言失败'); process.exit(1) }
  const md = ['# 平台 known-issues 状态建议清单（只读，未写入）', '', '| 建议状态 | heading |', '|---|---|']
  for (const s of platSugg) md.push(`| ${s.status} | ${s.heading.replace(/\|/g, '／').slice(0, 70)} |`)
  md.push('', '> 判据：emoji（🟢→已修复/现行、🟡→债务/观察、🔴→现行）+ 标题词（已修复/已解决/已退役）+ 正文语义。词表现行/已修复/已解决/已退役/观察/债务。平台仓主复核后自行落盘。')
  writeFileSync(join(here, 'platform-status-suggestion.md'), md.join('\n') + '\n')
  console.log(`平台 ${platEntries.length} 条建议 → platform-status-suggestion.md（零写断言通过）`)
}
