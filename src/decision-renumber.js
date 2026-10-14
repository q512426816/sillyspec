/**
 * decision-renumber.js — 存量决策号一次性迁移（2026-10-14-decision-legacy-renumber）。
 *
 * 背景：epoch 全局化（2026-10-14-decision-global-id-epoch）落地后新蒸馏条目自动发全局号，但存量
 * 701 条 legacy 局部号节段无跨变更承接机制、不会自然退役。用户裁决一次性迁移（翻「存量不回填」
 * 旧案——fr-index D-007 是设计取舍非技术禁忌，翻案理由随本变更蒸馏留痕）。epoch 读面（双形态解析/
 * 原编号字段/originId 匹配）已就位——迁移产物所有消费方零改动即认识。
 *
 * 纯函数两段（CLI 层 src/stages/knowledge.js case 'renumber' 负责 fs 与原子写）：
 *   planRenumber(knowledgeRoot)——扫描全部域文件产出迁移计划：
 *     · legacy 节段（局部号标题 D-\d+ 且无原编号字段）按「文件字母序 × 节段序」发号
 *       D-<域>-NNN（域=所在文件名去 .md；NNN=该域全域既有 epoch 号 max+1 起批内递增）；
 *     · fanout 组（同变更同号同版本跨文件副本）单一身份——全组共用一号，号域=字母序首文件域；
 *     · 无变更行条目不分组（同号无变更 ≠ 同一决策——backend.md 双 D-001@v1 无变更行实证是
 *       两条不同决策），逐节独立发号；
 *     · epoch 形态节段（全局号标题或原编号在场）零触碰——幂等判定面。
 *   applyRenumberPlan(contentByFile, plan)——按计划重写：标题行旧 id → 新全局号、
 *   「原编号：<旧号>」插入变更行后（无变更行则状态行后，再退标题行后）、其余行逐字节保留、
 *   节段次序不变；joinKnowledgeFile 复用既有归一落盘形态。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { splitKnowledgeSections, joinKnowledgeFile } from './decision-distill.js'

const EPOCH_NUMBER_RE = /^D-[A-Za-z0-9_\-\u4e00-\u9fff]+-\d+$/
const LOCAL_NUMBER_RE = /^D-\d+$/

/** 扫描 decisions 域文件集（files 元素含 splitKnowledgeSections 产物，零写盘） */
function scanDomainFiles(knowledgeRoot) {
  const decisionsDir = join(knowledgeRoot, 'decisions')
  const files = []
  if (!existsSync(decisionsDir)) return files
  for (const f of readdirSync(decisionsDir).sort()) {
    if (!f.endsWith('.md')) continue
    const content = readFileSync(join(decisionsDir, f), 'utf8')
    const { preamble, sections } = splitKnowledgeSections(content)
    files.push({ file: `decisions/${f}`, domain: f.replace(/\.md$/, ''), content, preamble, sections })
  }
  return files
}

/**
 * 纯函数（只读扫描）：产出迁移计划。
 * @param {string} knowledgeRoot knowledge 目录
 * @returns {{ files: Array<{file, domain, content, ops: Array<{secIdx, fromId, toNumber}>}>,
 *   stats: { legacySections, fanoutGroups, fanoutCopies, mintedNumbers, noChangeEntries, untouchedEpoch, perDomainStart: object } }}
 *   perDomainStart = 各发号域的起始号（既有 epoch max+1）；ops 为空的文件也保留（content 供 CLI 指纹校验）
 */
export function planRenumber(knowledgeRoot) {
  const files = scanDomainFiles(knowledgeRoot)
  // 各域既有 epoch 号 max（发号起点——不与已发号冲突）
  const domainMax = new Map()
  let untouchedEpoch = 0
  for (const { sections } of files) {
    for (const s of sections) {
      const m = /^D-([A-Za-z0-9_\-\u4e00-\u9fff]+)-(\d+)$/.exec(s.number)
      if (m) domainMax.set(m[1], Math.max(domainMax.get(m[1]) || 0, parseInt(m[2], 10)))
    }
  }
  const isLegacy = (s) => LOCAL_NUMBER_RE.test(s.number) && !s.origin && !EPOCH_NUMBER_RE.test(s.number)
  for (const { sections } of files) for (const s of sections) if (!isLegacy(s)) untouchedEpoch++
  // fanout 分组：同变更（非空）同号同版本跨文件 → 单一身份（组号=字母序首文件域——files 已按文件名排序）
  const groupKeyOf = (s) => `${s.change}#${s.number}@v${s.version}`
  const groups = new Map()
  files.forEach((f) => f.sections.forEach((s) => {
    if (!isLegacy(s) || !s.change) return
    const k = groupKeyOf(s)
    if (!groups.has(k)) groups.set(k, { domain: f.domain, members: [] })
    groups.get(k).members.push({ file: f.file, secIdx: f.sections.indexOf(s) })
  }))
  const fanoutGroups = [...groups.values()].filter((g) => g.members.length >= 2)
  const fanoutCopies = fanoutGroups.reduce((a, g) => a + g.members.length, 0)
  // 组号预分配（确定性：组键排序）
  const minted = new Map()
  const nextFor = (domain) => {
    const cur = Math.max(domainMax.get(domain) || 0, minted.get(domain) || 0) + 1
    minted.set(domain, cur)
    return `D-${domain}-${String(cur).padStart(3, '0')}`
  }
  const groupNumber = new Map()
  for (const k of [...groups.keys()].sort()) {
    const g = groups.get(k)
    if (g.members.length >= 2) groupNumber.set(k, nextFor(g.domain))
  }
  // 逐文件逐节段：组员复用组号，其余 legacy 独立发号（域=所在文件域）
  const perFileOps = new Map()
  let legacySections = 0
  let mintedNumbers = 0
  let noChangeEntries = 0
  for (const f of files) {
    const ops = []
    f.sections.forEach((s, si) => {
      if (!isLegacy(s)) return
      legacySections++
      if (!s.change) noChangeEntries++
      const fromId = `${s.number}@v${s.version}`
      let toNumber
      if (s.change && groups.get(groupKeyOf(s))?.members.length >= 2) {
        toNumber = groupNumber.get(groupKeyOf(s))
      } else {
        toNumber = nextFor(f.domain)
        mintedNumbers++
      }
      ops.push({ secIdx: si, fromId, toNumber })
    })
    perFileOps.set(f.file, ops)
  }
  mintedNumbers += groupNumber.size
  const perDomainStart = {}
  for (const d of new Set([...files.map((f) => f.domain), ...domainMax.keys(), ...minted.keys()])) {
    perDomainStart[d] = (domainMax.get(d) || 0) + 1
  }
  return {
    files: files.map((f) => ({ file: f.file, domain: f.domain, content: f.content, ops: perFileOps.get(f.file) || [] })),
    stats: { legacySections, fanoutGroups: fanoutGroups.length, fanoutCopies, mintedNumbers, noChangeEntries, untouchedEpoch, perDomainStart },
  }
}

/**
 * 纯函数（零 fs）：按计划重写。contentByFile 为计划时点内容（CLI 层先做指纹校验防他侧写入被覆盖）。
 * @param {Map<string,string>} contentByFile file → 全文
 * @param {object} plan planRenumber 产物
 * @returns {Map<string,string>} 仅有 op 的 file → 重写后全文
 */
export function applyRenumberPlan(contentByFile, plan) {
  const out = new Map()
  for (const fe of plan.files) {
    if (!fe.ops || fe.ops.length === 0) continue
    const content = contentByFile.get(fe.file)
    if (content == null) continue
    const { preamble, sections } = splitKnowledgeSections(content)
    const byIdx = new Map(fe.ops.map((o) => [o.secIdx, o]))
    for (let i = 0; i < sections.length; i++) {
      const op = byIdx.get(i)
      if (!op) continue
      const s = sections[i]
      // 标题行：首个旧 id 出现即节头 id（其余行不动）
      s.lines[0] = s.lines[0].replace(op.fromId, `${op.toNumber}@v${s.version}`)
      // 原编号行：变更行后 > 状态行后 > 标题行后（不破「文件：紧跟锚点」行序红线）
      let at = 1
      const vi = s.lines.findIndex((l) => /^变更[：:]/.test(l))
      if (vi > -1) at = vi + 1
      else {
        const si = s.lines.findIndex((l) => /^状态[：:]/.test(l))
        if (si > -1) at = si + 1
      }
      s.lines.splice(at, 0, `原编号：${op.fromId}`)
      s.id = `${op.toNumber}@v${s.version}`
      s.number = op.toNumber
      s.origin = op.fromId
    }
    out.set(fe.file, joinKnowledgeFile(preamble, sections))
  }
  return out
}

export default { planRenumber, applyRenumberPlan }
