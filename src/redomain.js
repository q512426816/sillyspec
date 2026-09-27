/**
 * redomain.js — FR 条目跨域迁移（2026-09-27-redomain，三层治理 v2 ③）
 *
 * 伪域信号卡指出迁移建议（suggestDomainFromFiles），本模块给机器通道：
 * 把 fr/<from>.md 的条目段切出、拼进 fr/<to>.md（缺席则按 loadDomainSections
 * 同款头新建），目标域无 INDEX 路由行则补（syncIndexRoutingLines 单源）。
 *
 * 身份铁律（D-001 单一身份同源）：迁域**不换号**——条目 ID（FR-<旧域>-NNN）
 * 保持原样，绑定行/supersede 链/最近确认锚全靠 ID 寻址（upsertFrBindings 按
 * `## ${frId}` 全目录扫描定位，与所在文件无关）；前缀与域不符属历史痕迹。
 *
 * 空壳防线：全域迁移后源文件剩 0 条目则删除（防留空壳域文件污染域列表）。
 * 纯文件手术——不动条目内容、不动绑定块（随条目段整体搬）。
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { splitKnowledgeSections, joinKnowledgeFile, syncIndexRoutingLines } from './decision-distill.js'
import { FR_SECTION_RE } from './fr-index.js'
import { writeAtomicSync } from './fs-atomic.js'

/** 条目段头（## FR-xxx-NNN / ## FR-NNN）判定与 ID 提取 */
const FR_HEADER_RE = /^## (FR-[\w.-]+-\d+|FR-\d+)\s*(.*)$/

function frEntryId(headerLine) {
  const m = FR_HEADER_RE.exec(headerLine)
  return m ? m[1] : null
}

/** 目标域文件头（与 fr-index loadDomainSections 新建头逐字同款） */
function newDomainPreamble(domain) {
  return [
    '---',
    `author: sillyspec-fr-index`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    '',
    `# FR 索引 — ${domain}`,
    '',
    '> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。',
    '',
  ]
}

/**
 * 执行迁移（纯函数式落盘）。
 * @param {{knowledgeRoot: string, from: string, to: string, anchors?: string[]}} opts
 * @returns {{moved: Array<{id,title}>, sourceDeleted: boolean, targetCreated: boolean, indexLineAdded: boolean}}
 * @throws 源域缺席 / 无匹配条目 / anchor 未命中
 */
export function redomainFrEntries({ knowledgeRoot, from, to, anchors = null }) {
  const frDir = join(knowledgeRoot, 'fr')
  const fromPath = join(frDir, `${from}.md`)
  const toPath = join(frDir, `${to}.md`)
  if (!existsSync(fromPath)) throw new Error(`源域文件不存在：fr/${from}.md`)
  if (from === to) throw new Error('源域与目标域相同')

  const fromParsed = splitKnowledgeSections(readFileSync(fromPath, 'utf8'), { sectionRegex: FR_SECTION_RE, buildId: (n) => n })
  const anchorSet = Array.isArray(anchors) && anchors.length > 0 ? new Set(anchors) : null

  // 目标域既有内容（缺席=新建头）
  const targetCreated = !existsSync(toPath)
  const toParsed = targetCreated
    ? { preamble: newDomainPreamble(to), sections: [] }
    : splitKnowledgeSections(readFileSync(toPath, 'utf8'), { sectionRegex: FR_SECTION_RE, buildId: (n) => n })

  const moving = []
  const staying = []
  for (const s of fromParsed.sections) {
    const id = frEntryId(s.lines[0] || '')
    if (!id) { staying.push(s); continue } // 非条目段（说明/杂项）留守
    if (anchorSet && !anchorSet.has(id)) { staying.push(s); continue }
    moving.push({ id, title: (FR_HEADER_RE.exec(s.lines[0])?.[2] || '').trim(), section: s })
  }
  if (moving.length === 0) {
    throw new Error(anchorSet ? `anchor 未命中（${[...anchorSet].join('、')} 不在 fr/${from}.md）` : `fr/${from}.md 无 FR 条目段`)
  }
  if (anchorSet && moving.length !== anchorSet.size) {
    const got = new Set(moving.map((m) => m.id))
    const miss = [...anchorSet].filter((a) => !got.has(a))
    throw new Error(`anchor 未命中：${miss.join('、')}（不在 fr/${from}.md）`)
  }
  // 目标域 ID 冲突防线（同 ID 已在目标域=迁移语义不明）
  const toIds = new Set(toParsed.sections.map((s) => frEntryId(s.lines[0] || '')).filter(Boolean))
  const clash = moving.filter((m) => toIds.has(m.id))
  if (clash.length > 0) throw new Error(`目标域已有同 ID 条目（${clash.map((c) => c.id).join('、')}）——先解冲突再迁移`)

  // 落盘：目标域追加；源域留余或删除空壳
  toParsed.sections.push(...moving.map((m) => m.section))
  writeAtomicSync(toPath, joinKnowledgeFile(toParsed.preamble, toParsed.sections))
  const sourceDeleted = staying.length === 0
  if (sourceDeleted) unlinkSync(fromPath)
  else writeAtomicSync(fromPath, joinKnowledgeFile(fromParsed.preamble, staying))

  // INDEX 路由行：syncIndexRoutingLines 扫全目录幂等同步（既有行 no-op、目标域缺席行补上）
  const indexPath = join(knowledgeRoot, 'INDEX.md')
  const before = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : ''
  try {
    syncIndexRoutingLines(knowledgeRoot, {
      section: 'FR 需求索引',
      subdir: 'fr',
      makeLine: (d) => d.startsWith('auto-')
        ? `- ${d}|${d.slice(5)}|FR|需求|承接 → [fr/${d}.md](fr/${d}.md)`
        : `- ${d}|FR|需求|承接 → [fr/${d}.md](fr/${d}.md)`,
    })
  } catch { /* INDEX 缺席/同步失败不拦迁移（主手术已成） */ }
  const after = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : ''

  return {
    moved: moving.map((m) => ({ id: m.id, title: m.title })),
    sourceDeleted,
    targetCreated,
    indexLineAdded: after !== before,
  }
}

/** 干跑预览：列出将迁移条目，不落盘 */
export function planRedomain({ knowledgeRoot, from, to, anchors = null }) {
  const frDir = join(knowledgeRoot, 'fr')
  const fromPath = join(frDir, `${from}.md`)
  if (!existsSync(fromPath)) throw new Error(`源域文件不存在：fr/${from}.md`)
  if (from === to) throw new Error('源域与目标域相同')
  const fromParsed = splitKnowledgeSections(readFileSync(fromPath, 'utf8'), { sectionRegex: FR_SECTION_RE, buildId: (n) => n })
  const anchorSet = Array.isArray(anchors) && anchors.length > 0 ? new Set(anchors) : null
  const candidates = []
  for (const s of fromParsed.sections) {
    const id = frEntryId(s.lines[0] || '')
    if (!id) continue
    if (anchorSet && !anchorSet.has(id)) continue
    candidates.push({ id, title: (FR_HEADER_RE.exec(s.lines[0])?.[2] || '').trim() })
  }
  if (candidates.length === 0) {
    throw new Error(anchorSet ? `anchor 未命中（${[...anchorSet].join('、')}）` : `fr/${from}.md 无 FR 条目段`)
  }
  return {
    from,
    to,
    targetExists: existsSync(join(frDir, `${to}.md`)),
    entries: candidates,
    sourceWillDelete: candidates.length === fromParsed.sections.filter((s) => frEntryId(s.lines[0] || '')).length,
  }
}
