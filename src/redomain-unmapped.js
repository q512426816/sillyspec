/**
 * redomain-unmapped.js — unmapped 停车场存量批量清偿驱动（FR-04，2026-10-21-knowledge-tier-denoise）
 *
 * 决策/FR 条目落 unmapped 是域路由失败的兜底——源头匹配器已修（2026-10-15-module-path-glob-match），
 * 存量需机器通道清偿（decision-redomain.js 头注：迁移原语已在，缺批量推断与编排）。本模块即编排：
 *   - decisions 条目：文件锚（「文件：」字段行）逐文件 matchedModuleIds 投票 → 目标真模块域
 *   - fr 条目：来源变更覆盖面（frCoverageFiles 三源：归档 design 交付表 ∪ change-patch ∪ git）→ 同款投票
 *   - 投票零命中/无锚 → 留 unmapped 并在报告列明残量原因（宁漏勿错，不裸删）
 * 迁移原语复用 redomainDecisionEntries / redomainFrEntries：段字节整体搬运、迁域不换号、
 * 目标域同 id 同变更冲突跳过、幂等；INDEX 路由行随原语内 sync 维护（FR-02 泛词已退役）。
 * 只动 knowledge 活库，不回写归档件（D-unmapped-152 死路：归档是冻结审计面）。
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { splitKnowledgeSections, discoverModuleIndex } from './decision-distill.js'
import { matchedModuleIds, frCoverageFiles, FR_SECTION_RE } from './fr-index.js'
import { anchorFilePaths } from './knowledge-match.js'
import { redomainDecisionEntries, sectionMeta } from './decision-redomain.js'
import { redomainFrEntries } from './redomain.js'

const DECISION_FILE_LINE_RE = /^文件[：:]\s*(.+)$/
const DECISION_ANCHOR_LINE_RE = /^锚点[：:]\s*(.*)$/
const FR_HEADER_RE = /^## (FR-[\w.-]+-\d+|FR-\d+)\s*(.*)$/

/** 决策段 → 路径数组：双源——「文件：」行集（显式字段）∪「锚点：」行 anchorFilePaths 路径
 *  提取（本仓实证 443 条全走锚点源：distill 的 文件： 字段极少发射，锚点是标准兜底
 *  命中源——与 knowledge-match/knowledge-graph 的 anchors 边同判法）。 */
function filesFromDecisionSection(lines) {
  const out = []
  for (const l of lines) {
    const line = String(l || '')
    const m = line.match(DECISION_FILE_LINE_RE)
    if (m) out.push(...String(m[1]).split(/[,，、\s]+/).map((s) => s.replace(/\\/g, '/')).filter(Boolean))
    const a = line.match(DECISION_ANCHOR_LINE_RE)
    if (a) out.push(...anchorFilePaths(a[1]))
  }
  return out
}

/** FR 段「变更：」行（source change 迁移过滤键同款判法）。 */
function changeFromSection(lines) {
  for (const l of lines) {
    const m = String(l || '').match(/^变更[：:]\s*(\S+)/)
    if (m) return m[1]
  }
  return null
}

/** 文件集 → 目标域投票：逐文件 matchedModuleIds（修复后的 glob 匹配器，多命中并计），
 *  最高票为域；平票字典序（确定性）。零命中 → null（留停车场）。 */
function voteDomain(files, moduleIndex) {
  const tally = new Map()
  for (const f of files) {
    for (const mid of matchedModuleIds(moduleIndex, f)) tally.set(mid, (tally.get(mid) || 0) + 1)
  }
  if (tally.size === 0) return null
  return [...tally.entries()].sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))[0][0]
}

function planDecisionsFace(knowledgeRoot, archiveRoot, moduleIndex) {
  const fromPath = join(knowledgeRoot, 'decisions', 'unmapped.md')
  if (!existsSync(fromPath)) return { absent: true, groups: [], leftover: [] }
  const parsed = splitKnowledgeSections(readFileSync(fromPath, 'utf8'))
  const groups = new Map()
  const leftover = []
  for (const s of parsed.sections) {
    const meta = sectionMeta(s)
    if (!meta) continue
    // 三源：文件： 行 ∪ 锚点路径（显式锚优先）→ 都不中再走来源变更覆盖面（fr 面同款——
    // 本仓实证 417/443 锚点「未记录」，436/443 有「变更：」行，覆盖面是主力推断源）
    const files = filesFromDecisionSection(s.lines)
    const change = changeFromSection(s.lines)
    let domain = files.length > 0 ? voteDomain(files, moduleIndex) : null
    if (!domain && change) {
      const cov = [...frCoverageFiles({ archiveRoot, changeName: change })]
      if (cov.length > 0) domain = voteDomain(cov, moduleIndex)
    }
    if (!domain) {
      const reason = files.length === 0
        ? (change ? '锚点无路径且来源覆盖面不命中任何模块' : '无文件锚/锚点路径且无来源变更')
        : '锚不命中任何模块'
      leftover.push({ id: meta.id, title: meta.title, reason })
      continue
    }
    if (!groups.has(domain)) groups.set(domain, [])
    groups.get(domain).push(meta.id)
  }
  return {
    groups: [...groups.entries()].map(([domain, ids]) => ({ domain, ids })),
    leftover,
    total: parsed.sections.filter((s) => sectionMeta(s)).length,
  }
}

function planFrFace(knowledgeRoot, archiveRoot, moduleIndex) {
  const fromPath = join(knowledgeRoot, 'fr', 'unmapped.md')
  if (!existsSync(fromPath)) return { absent: true, groups: [], leftover: [] }
  const parsed = splitKnowledgeSections(readFileSync(fromPath, 'utf8'), { sectionRegex: FR_SECTION_RE, buildId: (n) => n })
  const groups = new Map()
  const leftover = []
  for (const s of parsed.sections) {
    const h = FR_HEADER_RE.exec(s.lines[0] || '')
    if (!h) continue
    const id = h[1]
    const title = (h[2] || '').trim()
    const change = changeFromSection(s.lines)
    const files = change ? [...frCoverageFiles({ archiveRoot, changeName: change })] : []
    const domain = files.length > 0 ? voteDomain(files, moduleIndex) : null
    if (!domain) {
      leftover.push({ id, title, reason: !change ? '无来源变更' : '来源变更覆盖面不命中任何模块' })
      continue
    }
    if (!groups.has(domain)) groups.set(domain, [])
    groups.get(domain).push(id)
  }
  return {
    groups: [...groups.entries()].map(([domain, ids]) => ({ domain, ids })),
    leftover,
    total: parsed.sections.filter((s) => FR_HEADER_RE.exec(s.lines[0] || '')).length,
  }
}

/**
 * 干跑计划：各面分组（目标域 → 条目 id 集）与残量（id/标题/不可推断原因）。
 * @param {{knowledgeRoot: string, archiveRoot: string}} opts
 * @returns {{decisions: object, fr: object}} 各面 {absent?, groups, leftover, total?}
 */
export function planUnmappedRedomain({ knowledgeRoot, archiveRoot }) {
  const moduleIndex = discoverModuleIndex(knowledgeRoot) || { modules: {} }
  return {
    decisions: planDecisionsFace(knowledgeRoot, archiveRoot, moduleIndex),
    fr: planFrFace(knowledgeRoot, archiveRoot, moduleIndex),
  }
}

/**
 * 执行清偿（先内部重算计划——apply 自带干跑等价性；幂等：重跑同批 0 迁移）。
 * 单组失败不拦其余组（逐组收集结果与错误如实上报）。
 * @param {{knowledgeRoot: string, archiveRoot: string, faces?: string[]}} opts faces 缺省双面
 * @returns {{results: object, plan: object}} results 各面 {moved, movedByDomain, skippedConflicts, errors}
 */
export function applyUnmappedRedomain({ knowledgeRoot, archiveRoot, faces = ['decisions', 'fr'] }) {
  const plan = planUnmappedRedomain({ knowledgeRoot, archiveRoot })
  const empty = { moved: 0, movedByDomain: {}, skippedConflicts: [], errors: [] }
  const results = {}
  const run = (groups, migrate) => {
    const acc = { moved: 0, movedByDomain: {}, skippedConflicts: [], errors: [] }
    for (const g of groups) {
      try {
        const res = migrate(g)
        acc.moved += res.moved.length
        acc.movedByDomain[g.domain] = res.moved.length
        if (Array.isArray(res.skippedConflicts)) acc.skippedConflicts.push(...res.skippedConflicts.map((id) => `${g.domain}:${id}`))
      } catch (e) {
        acc.errors.push({ domain: g.domain, error: e && e.message ? e.message : String(e) })
      }
    }
    return acc
  }
  results.decisions = faces.includes('decisions')
    ? run(plan.decisions.groups,
        (g) => redomainDecisionEntries({ knowledgeRoot, from: 'unmapped', to: g.domain, anchors: g.ids }))
    : { ...empty }
  results.fr = faces.includes('fr')
    ? run(plan.fr.groups,
        (g) => redomainFrEntries({ knowledgeRoot, from: 'unmapped', to: g.domain, anchors: g.ids }))
    : { ...empty }
  return { results, plan }
}

/**
 * CLI 子命令（stages/knowledge.js 经 tryImportSubcommandImpl 装载）：
 * sillyspec knowledge redomain-unmapped [--face decisions|fr] [--apply]
 * 缺省 dry-run 只出报告（JSON 出口与 search/graph 同族）；--apply 幂等落盘。
 */
export async function cmdRedomainUnmapped(dir, args, opts = {}) {
  const specBase = opts.specDir || join(dir, '.sillyspec')
  const knowledgeRoot = join(specBase, 'knowledge')
  const archiveRoot = join(specBase, 'changes', 'archive')
  const face = args.includes('--face')
    ? (args[args.indexOf('--face') + 1] === 'decisions' ? 'decisions' : args[args.indexOf('--face') + 1] === 'fr' ? 'fr' : 'all')
    : 'all'
  const apply = args.includes('--apply')
  const emit = (ok, data, error) => console.log(JSON.stringify({ ok, ...data, ...(error ? { error } : {}) }, null, 2))

  if (!existsSync(join(knowledgeRoot, 'INDEX.md'))) {
    emit(false, {}, { code: 'knowledge_dir_missing', path: knowledgeRoot })
    return
  }
  if (apply) {
    const faces = face === 'all' ? ['decisions', 'fr'] : [face]
    const { results, plan } = applyUnmappedRedomain({ knowledgeRoot, archiveRoot, faces })
    const leftoverFace = (name) => (faces.includes(name) ? plan[name].leftover : [])
    emit(true, {
      mode: 'apply', face,
      decisions: results.decisions,
      fr: results.fr,
      leftover: { decisions: leftoverFace('decisions'), fr: leftoverFace('fr') },
    })
    return
  }
  const plan = planUnmappedRedomain({ knowledgeRoot, archiveRoot })
  emit(true, { mode: 'dry-run', face, decisions: plan.decisions, fr: plan.fr })
}
