/**
 * decision-redomain.js — 决策条目跨域迁移（2026-10-15-decision-redomain）
 *
 * 背景：模块路径 glob 匹配失效（2026-10-15-module-path-glob-match）导致消费仓历史决策
 * 大量落 decisions/unmapped.md（平台仓 442 条实证）——匹配器修复止增量后，存量需机器
 * 通道清偿。redomain.js 只管 fr/ 条目；本模块为 decisions/ 面的孪生实现，复用
 * decision-distill 参数化底座（splitKnowledgeSections/joinKnowledgeFile/syncIndexRoutingLines）。
 *
 * 与 FR 版的形态差异：
 *   - 段头 `## D-xxx@vN 标题`（全局号/局部号双形态混存）——默认 sectionRegex 即此格式；
 *     id = `<number>@v<version>`（迁域不换号，字段行内「原编号」等机器行随段整体搬）。
 *   - 跨变更同号合法共存（D 号是变更内局部序号）——冲突键 = id + 变更（目标域已有
 *     同 id 同变更段 = 迁移语义不明，跳该段并报告，不覆盖）。
 *   - 路由行形态与 fr 不同（`- <域>|decision|决策 → [decisions/<域>.md]`）——syncIndexRoutingLines
 *     默认参数即 decisions 面。
 *
 * 幂等：重跑同批——源域已无该段 → 0 条（或 anchor/byChange 无命中报错，与 FR 版同款）。
 */
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { splitKnowledgeSections, joinKnowledgeFile, syncIndexRoutingLines } from './decision-distill.js'
import { writeAtomicSync } from './fs-atomic.js'

const DECISION_HEADER_RE = /^## (D-(?:[A-Za-z0-9_\-\u4e00-\u9fff]+-)?\d+)@v(\d+)\s*(.*)$/

/** 目标域文件头（与 decision-distill 落域文件既有头逐字同款——平台真实库实测形态） */
function newDomainPreamble(domain) {
  return [
    `# 决策知识 — ${domain}`,
    '',
    '> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。',
    '',
  ]
}

/** 段 → {id, number, version, title, change}（id=number@version 即迁域不换号的身份） */
function sectionMeta(s) {
  const m = DECISION_HEADER_RE.exec(s.lines[0] || '')
  if (!m) return null
  const id = `${m[1]}@v${m[2]}`
  const cm = s.lines.find((l) => /^变更[：:]/.test(l)) || s.lines.find((l) => /^来源[：:]/.test(l))
  const change = cm ? cm.replace(/^(变更|来源)[：:]\s*/, '').trim() || null : null
  return { id, number: m[1], version: parseInt(m[2], 10), title: (m[3] || '').trim(), change }
}

function normalizeDomainArg(v) {
  return String(v ?? '').trim().replace(/^decisions\//i, '').replace(/\.md$/i, '').trim()
}

/** 干跑预览：列出将迁移条目，不落盘（anchor/byChange 同执行侧过滤） */
export function planDecisionRedomain({ knowledgeRoot, from, to, anchors = null, byChange = null }) {
  from = normalizeDomainArg(from)
  to = normalizeDomainArg(to)
  if (!from || !to) throw new Error('用法：--from <源域> --to <目标域>（域名可带 decisions/ 前缀与 .md 后缀）')
  if (from === to) throw new Error('源域与目标域相同')
  const dir = join(knowledgeRoot, 'decisions')
  const fromPath = join(dir, `${from}.md`)
  if (!existsSync(fromPath)) throw new Error(`源域文件不存在：decisions/${from}.md`)
  const parsed = splitKnowledgeSections(readFileSync(fromPath, 'utf8'))
  const anchorSet = Array.isArray(anchors) && anchors.length > 0 ? new Set(anchors) : null
  const entries = []
  for (const s of parsed.sections) {
    const meta = sectionMeta(s)
    if (!meta) continue
    if (anchorSet && !anchorSet.has(meta.id)) continue
    if (byChange && meta.change !== byChange) continue
    entries.push(meta)
  }
  if (entries.length === 0) {
    throw new Error(anchorSet
      ? `anchor 未命中（${[...anchorSet].join('、')} 不在 decisions/${from}.md）`
      : byChange ? `「变更：${byChange}」条目在 decisions/${from}.md 无命中` : `decisions/${from}.md 无决策条目段`)
  }
  return {
    entries,
    targetExists: existsSync(join(dir, `${to}.md`)),
    sourceWillDelete: parsed.sections.length - entries.length === 0,
  }
}

/** 执行迁移（纯文件手术——段字节整体搬运，id/机器行零改写） */
export function redomainDecisionEntries({ knowledgeRoot, from, to, anchors = null, byChange = null }) {
  from = normalizeDomainArg(from)
  to = normalizeDomainArg(to)
  if (!from || !to) throw new Error('用法：--from <源域> --to <目标域>')
  if (from === to) throw new Error('源域与目标域相同')
  const dir = join(knowledgeRoot, 'decisions')
  const fromPath = join(dir, `${from}.md`)
  const toPath = join(dir, `${to}.md`)
  if (!existsSync(fromPath)) throw new Error(`源域文件不存在：decisions/${from}.md`)

  const fromParsed = splitKnowledgeSections(readFileSync(fromPath, 'utf8'))
  const anchorSet = Array.isArray(anchors) && anchors.length > 0 ? new Set(anchors) : null
  const targetCreated = !existsSync(toPath)
  const toParsed = targetCreated
    ? { preamble: newDomainPreamble(to), sections: [] }
    : splitKnowledgeSections(readFileSync(toPath, 'utf8'))

  const moving = []
  const staying = []
  const skippedConflicts = []
  const movedKeys = new Set() // 批内双键（id|change）：同批重复段第二条跳过（2026-10-15 平台存量实证幂等残留）
  for (const s of fromParsed.sections) {
    const meta = sectionMeta(s)
    if (!meta) { staying.push(s); continue } // 非条目段（说明/杂项）留守
    if (anchorSet && !anchorSet.has(meta.id)) { staying.push(s); continue }
    if (byChange && meta.change !== byChange) { staying.push(s); continue }
    // 冲突防线：目标域已有同 id + 同变更段（跨变更同号合法共存，双键才冲突）
    const key = `${meta.id}|${meta.change || ''}`
    const clash = movedKeys.has(key) || toParsed.sections.some((t) => {
      const tm = sectionMeta(t)
      return tm && `${tm.id}|${tm.change || ''}` === key
    })
    if (clash) { skippedConflicts.push(meta.id); staying.push(s); continue }
    movedKeys.add(key)
    moving.push({ meta, section: s })
  }
  if (moving.length === 0 && skippedConflicts.length === 0) {
    throw new Error(anchorSet
      ? `anchor 未命中（${[...anchorSet].join('、')} 不在 decisions/${from}.md）`
      : byChange ? `「变更：${byChange}」条目在 decisions/${from}.md 无命中` : `decisions/${from}.md 无决策条目段`)
  }
  if (anchorSet && skippedConflicts.length + moving.length !== anchorSet.size) {
    const got = new Set([...moving.map((m) => m.meta.id), ...skippedConflicts])
    const miss = [...anchorSet].filter((a) => !got.has(a))
    if (miss.length > 0) throw new Error(`anchor 未命中：${miss.join('、')}（不在 decisions/${from}.md）`)
  }

  toParsed.sections.push(...moving.map((m) => m.section))
  writeAtomicSync(toPath, joinKnowledgeFile(toParsed.preamble, toParsed.sections))
  const sourceDeleted = staying.length === 0
  if (sourceDeleted) unlinkSync(fromPath)
  else writeAtomicSync(fromPath, joinKnowledgeFile(fromParsed.preamble, staying))

  // INDEX 路由行：decisions 面默认参数（幂等；缺席行补上）
  const indexPath = join(knowledgeRoot, 'INDEX.md')
  const before = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : ''
  try { syncIndexRoutingLines(knowledgeRoot) } catch { /* INDEX 缺席/同步失败不拦迁移 */ }
  const after = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : ''

  return {
    moved: moving.map((m) => ({ id: m.meta.id, title: m.meta.title })),
    skippedConflicts,
    sourceDeleted,
    targetCreated,
    indexLineAdded: after !== before,
  }
}
