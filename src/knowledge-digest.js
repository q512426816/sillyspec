/**
 * knowledge-digest.js — 知识资产治理信号收集器（2026-09-27-knowledge-digest）
 *
 * 现状：通用知识走 propose→平台人工合并闭环，规格资产（FR 索引/绑定）全自动入库零人审——
 * 四类信号沉睡库内无人工出口（R23-full 载体仓收件箱积压 40 条实证）。本模块把沉睡数据
 * 变结构化摘要：`sillyspec knowledge digest`（人读文本）/ `--json`（平台 RPC 消费）。
 *
 * 四信号（阈值内静默、超阈才进摘要——安静即健康态，防仪式化）：
 *   ① rot 待复核标记：knowledge/fr/*.md 条目内「待复核：」行，按域计数（阈值 100）
 *   ② 收件箱积压：knowledge/uncategorized.md 的 `## <qlId> | <标题>` 条目（阈值 20）
 *   ③ 伪域落库：auto-* 域文件条目数 + unmapped 池条目数（阈值 0——伪域本不该增长）
 *   ④ 绑定路径解析失败：fr/*.md 绑定行经 resolveTestFileRel（与 repair-paths/门禁读侧
 *      同口径单源）无法自仓根解析（阈值 0）
 *
 * 只读扫描，零写入——动作（迁移/清账/repair）由消费方另行执行。
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { readFrBindings, resolveTestFileRel } from './test-bindings.js'

/** 伪域判定：auto- 前缀（scaffold 时代机器蒸馏域）或 unmapped 池 */
const isPseudoDomain = (domain) => /^auto[-_]/.test(domain) || domain === 'unmapped'

/** 交付路径 → 建议域（落域机械改进的建议器，与 indexRequirements 的告警共用单源） */
export function suggestDomainFromFiles(files) {
  for (const raw of files || []) {
    const p = String(raw || '').replace(/\\/g, '/')
    let m
    if ((m = /^backend\/app\/modules\/([\w-]+)\//.exec(p))) return m[1] // backend 模块归属最强
    if ((m = /^sillyhub-daemon\//.exec(p))) return 'daemon'
    if ((m = /^frontend\//.exec(p))) return 'frontend'
    if ((m = /^backend\//.exec(p))) return 'backend'
    if ((m = /^([\w-]+)\/src\//.exec(p))) return m[1]
    if ((m = /^([\w-]+)\//.exec(p))) return m[1]
  }
  return null
}

/** 条目级解析：fr/<域>.md 的 `## <id> <标题>` 段头与「待复核：」行 */
function scanFrFile(text) {
  const entries = []
  let cur = null
  for (const line of text.split(/\r?\n/)) {
    const h = /^## (FR-[\w.-]+-\d+|FR-\d+)\s*(.*)$/.exec(line)
    if (h) { cur = { id: h[1], needsReview: null }; entries.push(cur); continue }
    if (cur) {
      const r = /^待复核：(.+)$/.exec(line)
      if (r) cur.needsReview = r[1].trim()
    }
  }
  return entries
}

/**
 * 收集治理信号（纯函数，只读）。
 * @returns {{ generated_at: string, healthy: boolean, signals: Array<{kind, level, title, count, detail, suggestion?}>, totals: object }}
 */
export function collectKnowledgeDigest({ specBase, projectRoot }) {
  const knowledgeRoot = join(specBase, 'knowledge')
  const frDir = join(knowledgeRoot, 'fr')
  const signals = []
  const totals = { rot: 0, inbox: 0, pseudo: 0, unresolvedBindings: 0 }

  const rotByDomain = new Map()
  const pseudoByDomain = new Map()
  const unresolved = []
  const frFiles = existsSync(frDir) ? readdirSync(frDir).filter(f => f.endsWith('.md')).sort() : []
  // unmapped 基线消音（与 fr-index 落库告警同口径）：跨仓历史基线不刷信号，只报增量
  let unmappedBaseline = 0
  try {
    const raw = readFileSync(join(specBase, 'local.yaml'), 'utf8')
    const m = raw.match(/^fr_unmapped_baseline:\s*(\d+)\s*$/m)
    if (m) unmappedBaseline = parseInt(m[1], 10)
  } catch { /* 无 local.yaml = 无基线 */ }

  for (const f of frFiles) {
    const domain = f.replace(/\.md$/, '')
    const text = readFileSync(join(frDir, f), 'utf8')
    const entries = scanFrFile(text)
    const rot = entries.filter(e => e.needsReview).length
    if (rot > 0) { rotByDomain.set(domain, rot); totals.rot += rot }
    if (isPseudoDomain(domain) && entries.length > 0) {
      // 基线内的 unmapped 池不计（历史跨仓基线，非新增堆积）；auto-* 伪域无基线语义恒计
      const count = domain === 'unmapped' ? Math.max(0, entries.length - unmappedBaseline) : entries.length
      if (count > 0) { pseudoByDomain.set(domain, count); totals.pseudo += count }
    }
    // 绑定解析失败（与 repair-paths 同口径：先根相对直取，再 resolveTestFileRel）
    for (const e of entries) {
      const rows = readFrBindings({ knowledgeRoot, frId: e.id })
      for (const row of rows) {
        for (const t of row.tests || []) {
          const filePart = String(t).split('#')[0].split('::')[0]
          const rel = resolveTestFileRel(filePart, { projectRoot })
          if (!rel && !existsSync(join(projectRoot, filePart.replace(/\\/g, '/')))) {
            totals.unresolvedBindings++
            unresolved.push(`${e.id}:${t}`)
          }
        }
      }
    }
  }

  // ② 收件箱（uncategorized.md 的 `## <qlId> | <标题>` 行）
  let inboxTitles = []
  const uncPath = join(knowledgeRoot, 'uncategorized.md')
  if (existsSync(uncPath)) {
    inboxTitles = readFileSync(uncPath, 'utf8').split(/\r?\n/)
      .map(l => /^## (.+)$/.exec(l)?.[1]).filter(Boolean)
    totals.inbox = inboxTitles.length
  }

  const mk = (kind, level, title, count, detail, suggestion) =>
    signals.push({ kind, level, title, count, detail, ...(suggestion ? { suggestion } : {}) })

  if (totals.rot > 100) {
    mk('rot', 'warn', `rot 待复核批量标记（${totals.rot} 条 > 100）`, totals.rot,
      [...rotByDomain.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([d, n]) => `${d} ${n}`).join('、'),
      '批量复核：文案漂移类可批量承接，行为类逐条对账')
  }
  if (totals.inbox > 20) {
    mk('inbox', 'warn', `知识收件箱积压（${totals.inbox} 条 > 20）`, totals.inbox,
      inboxTitles.slice(0, 5).join('；') + (inboxTitles.length > 5 ? ' 等' : ''),
      'sillyspec knowledge inbox 逐条 classify 清账')
  }
  if (totals.pseudo > 0) {
    mk('pseudo-domain', 'warn', `伪域在库（auto-*/unmapped 共 ${totals.pseudo} 条）`, totals.pseudo,
      [...pseudoByDomain.entries()].map(([d, n]) => `${d} ${n}`).join('、'),
      '按 suggestDomainFromFiles 建议迁移域（平台信号卡一键/手工 redomain）')
  }
  if (totals.unresolvedBindings > 0) {
    mk('binding-unresolved', 'warn', `绑定路径解析失败（${totals.unresolvedBindings} 个）`, totals.unresolvedBindings,
      unresolved.slice(0, 5).join('、') + (unresolved.length > 5 ? ' 等' : ''),
      'sillyspec tests repair-paths（干跑预览 → --write 归一）')
  }

  return {
    generated_at: new Date().toISOString(),
    healthy: signals.length === 0,
    signals,
    totals,
  }
}

/** 人读文本渲染（CLI 出口；平台走 --json） */
export function renderKnowledgeDigestText(d) {
  const lines = []
  lines.push(`📬 知识资产治理摘要（${d.generated_at.slice(0, 16).replace('T', ' ')}）`)
  if (d.healthy) {
    lines.push('✅ 四类信号全部在阈内（rot/inbox/伪域/坏绑定）——安静即健康态，无需动作')
  } else {
    lines.push(`⚠️ ${d.signals.length} 类信号超阈：`)
    for (const s of d.signals) {
      lines.push(`  [${s.kind}] ${s.title}`)
      if (s.detail) lines.push(`     明细：${s.detail}`)
      if (s.suggestion) lines.push(`     处置：${s.suggestion}`)
    }
  }
  lines.push(`底数：rot 待复核 ${d.totals.rot}｜收件箱 ${d.totals.inbox}｜伪域条目 ${d.totals.pseudo}｜坏绑定 ${d.totals.unresolvedBindings}`)
  return lines.join('\n')
}
