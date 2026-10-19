/**
 * flow-parity.js — 轻量变更资产对齐三件（2026-09-25-thin-parity-assets，能力/资产对照表终核收口）。
 *
 * ① reconcileModuleDocs：模块文档同步对账——厚道 module-impact 死信门的轻量变更等价物（advisory）：
 *    交付文件命中模块图 → 点名模块与文档路径；模块代码变了而文档未动 → 强提示。模块文档是
 *    后续变更 module 命中/门禁收窄/知识注入的原料（verify -68% 那笔账的来源），失供是复利折旧。
 *    （2026-09-27-thin-module-scope-persist：同一计算增加结构化返回面 modules/uncoveredDirs/
 *    moduleMaps，随 change-patch.json 落盘供平台展示轻量变更影响模块范围。）
 * ② renderVerifyReceipt：verify-result 机器回执——人类可读收口结论（实测面/评审/绑定/冻结 sha），
 *    厚道有轻量变更缺的审计资产；机器合成勿手改。
 * ③ harvestSlot4Decision：design 槽4（风险与死路）实质作答收割合成 decisions.md——轻量变更决策
 *    产出为零的补口（死路与风险取舍正是 decisions.md 该记的内容；已有文件不覆盖）。
 * ④ writeCloseTraceArtifacts / buildThinSnapshotRows：收口留痕单套写
 *    （2026-10-09-close-trace-single-set）——thin flow done 与 heavy execute --done 共用
 *    一处只写 change.patch + change-patch.json 两件（对账面并入 scopeAudit 子对象；
 *    此前 2026-10-07-unify-close-trace 的四件双轨形态收口为单套，旧名读侧兼容兜存量）。
 * ⑤⑥⑦ evaluateModuleGate / appendChangeIndexEntries / renderThinDocsDebt
 *    （2026-10-12-thin-module-gate-and-feed 三档）：未登记目录软门判定（拦但可签收）、
 *    命中模块变更索引机械回写（sidecar 优先、幂等）、start 注入面欠账事实行（提示前移）。
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { modulePathMatches } from './modules.js'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { splitOwnVsForeignDiffFiles, commitAttributionForChange, isForeignByCommit, parseChangeNamesFromSubject } from './foreign-declared.js'
import { collectModuleMaps, normalizeMapPath } from './module-resolve.js'
import { computeDocsDebt } from './docs-debt.js'
import { anchorBackfillCandidate } from './decision-distill.js'
import { writeAtomicSync } from './fs-atomic.js'
import { normalizePath } from './change-list.js'
import { readV2SectionAnswer } from './flow-review.js'
import { DESIGN_QUESTIONS } from './flow-draft.js'
import { pathMatches } from './change-list.js'
import { classifyToolScaffold, filterDeliverableFiles } from './worktree-apply.js'
import { deriveChangeTitle } from './quicklog.js'

/**
 * 模块文档对账（advisory）+ 结构化落盘面（2026-09-27-thin-module-scope-persist）。
 * @param cwd 仓库根（子项目前缀判定 + specBase→仓根相对换算）
 * @param ownFiles 交付文件（posix；.sillyspec/ 治理面内部滤除——模块命中只对账代码交付面，
 * 否则本变更目录工件会污染未登记清单）
 * @param committedRaw 含 .sillyspec 的原始提交面（仓根相对——模块文档是否随变更更新以此判定）
 * @returns {{lines: string[], hits: number,
 *   modules: Array<{id: string, files: number, doc: string|null, docTouched: boolean, docMissing: boolean}>,
 *   uncoveredDirs: Array<{dir: string, files: number}>, moduleMaps: string[]}}
 *   lines 为空=无命中零输出；结构化三键恒在场（无图/零命中=空数组），随 change-patch.json 落盘。
 * 口径对齐 module-resolve.collectModuleMaps（2026-09-27-thin-module-scope-persist 修复旧实现
 * 四缺陷：js-yaml 顶层迭代不进 modules: 包层致命中恒 0、字母序取首个项目图致多项目仓读错图、
 * 子项目 paths 前缀缺失、docTouched 拿 specBase 相对路径比仓根相对 committedRaw 恒 false）。
 */
export function reconcileModuleDocs({ cwd, specBase, ownFiles, committedRaw }) {
  let maps = []
  try { maps = collectModuleMaps({ cwd: cwd || specBase, specBase }) } catch { maps = [] }
  if (maps.length === 0) return { lines: [], hits: 0, modules: [], uncoveredDirs: [], moduleMaps: [] }
  const deliverables = [...new Set((ownFiles || []).map((f) => String(f).replace(/\\/g, '/')))]
    .filter((f) => !f.startsWith('.sillyspec/'))
  const committed = new Set((committedRaw || []).map((f) => String(f).replace(/\\/g, '/')))
  // specBase 相对 → 仓根相对（docTouched 比对基准：committedRaw 是 git diff 仓根相对输出）
  const specRel = (() => {
    if (!cwd) return ''
    try {
      const r = relative(cwd, specBase).replace(/\\/g, '/')
      if (!r || r === '.') return ''
      return r.replace(/\/+$/, '') + '/'
    } catch { return '' }
  })()
  const lines = []
  const modules = []
  let hits = 0
  for (const map of maps) {
    for (const [modId, entry] of map.entries) {
      const effs = (entry.paths || [])
        .map((pp) => (map.prefix + normalizeMapPath(pp)).replace(/\/+$/, ''))
        .filter(Boolean)
      if (effs.length === 0) continue
      const hitFiles = deliverables.filter((f) => effs.some((e) => modulePathMatches(f, e)))
      if (hitFiles.length === 0) continue
      hits++
      const docRel = entry.doc ? `docs/${map.project}/${String(entry.doc).replace(/^\/+/, '')}` : null
      const docAbs = docRel ? join(specBase, docRel) : null
      const docTouched = docRel ? committed.has(specRel + docRel) : false
      const docMissing = docAbs ? !existsSync(docAbs) : false
      modules.push({ id: modId, files: hitFiles.length, doc: docRel, docTouched, docMissing })
      if (docTouched) lines.push(`   ✓ ${modId}（${hitFiles.length} 文件）——文档 ${docRel} 已同步`)
      else lines.push(`   ⚠️ ${modId}（${hitFiles.length} 文件）——文档${docAbs && existsSync(docAbs) ? ` ${docRel} ` : '（缺失）'}未随变更更新：若行为/接口有变请先补文档（模块文档是后续变更门禁收窄与知识注入的原料）`)
    }
  }
  // 未登记模块目录检测（2026-09-25-thin-fr-quality，R16 实证：observation 新模块不在图 → FR
  // 落伪域 auto-frontend）：交付目录不在任何模块 paths 下时点名提示登记——首个变更把家建好，
  // 后续变更的模块命中/门禁收窄/知识注入才能吃到
  const allPaths = []
  for (const map of maps) {
    for (const entry of map.entries.values()) {
      for (const pp of entry.paths || []) allPaths.push((map.prefix + normalizeMapPath(pp)).replace(/\/+$/, ''))
    }
  }
  const isCovered = (f) => allPaths.some((pp) => pp && modulePathMatches(f, pp))
  const uncoveredMap = new Map()
  for (const f of deliverables) {
    if (isCovered(f)) continue
    const dir = String(f).split('/').slice(0, -1).join('/')
    if (dir) uncoveredMap.set(dir, (uncoveredMap.get(dir) || 0) + 1)
  }
  const uncoveredDirs = [...uncoveredMap.entries()].sort((a, b) => b[1] - a[1]).map(([dir, files]) => ({ dir, files }))
  const topDirs = uncoveredDirs.slice(0, 3)
  const out = [...lines]
  if (hits > 0) out.unshift(`📎 模块文档对账（advisory）：交付面命中 ${hits} 个模块——`)
  if (topDirs.length > 0) {
    out.push(`🗺️ 未登记模块图的交付目录（${topDirs.map((e) => `${e.dir}（${e.files} 文件）`).join('、')}${uncoveredDirs.length > 3 ? ' 等' : ''}）——本变更的 FR 将落伪域 auto-*`)
    out.push(`   建议收口前在模块图（docs/<project>/modules/_module-map.yaml）登记模块条目（模块 id + paths 指向目录 + doc），后续变更的模块命中/门禁收窄/知识注入才能吃到`)
  }
  return { lines: out, hits, modules, uncoveredDirs, moduleMaps: maps.map((m) => `docs/${m.project}/modules/_module-map.yaml`) }
}

/**
 * ⑤ evaluateModuleGate：未登记目录软门判定（2026-10-12-thin-module-gate-and-feed 一档）。
 * 消费 reconcileModuleDocs 结构化面——纯判定零 IO；门语义=拦但可签收（--accept-unmapped 留痕
 * acceptedUnmappedDirs，镜像 acceptedDirtyGap 先例）：未登记目录是直接信号（文件在、图没认），
 * 但存量仓有合法未登记面（根级脚本/配置），误报硬拦会训练忽略报警（docs-gate 既有裁决）——
 * 签收制让每次放行成为审计面可见决策。绿地（无图）不拦：无图时 reconcileModuleDocs 空面短路，
 * 强制登记等于替 scan 做模块划分。
 * @param {{moduleScope: {moduleMaps?: string[], uncoveredDirs?: Array<{dir: string, files: number}>}|null,
 *   ignore?: string[]}} opts ignore=local.yaml module_gate_ignore（目录前缀，posix）
 * @returns {{block: boolean, dirs: Array<{dir: string, files: number}>, maps: string[]}}
 */
export function evaluateModuleGate({ moduleScope, ignore } = {}) {
  const scope = moduleScope || {}
  const maps = Array.isArray(scope.moduleMaps) ? scope.moduleMaps : []
  const ig = (Array.isArray(ignore) ? ignore : [])
    .map((s) => String(s || '').replace(/\\/g, '/').replace(/\/+$/, '').trim()).filter(Boolean)
  const dirs = (Array.isArray(scope.uncoveredDirs) ? scope.uncoveredDirs : [])
    .map((d) => ({ dir: String((d && d.dir) || '').replace(/\\/g, '/').replace(/\/+$/, ''), files: Number(d && d.files) || 0 }))
    .filter((d) => d.dir)
    .filter((d) => !ig.some((p) => d.dir === p || d.dir.startsWith(p + '/')))
  return { block: maps.length > 0 && dirs.length > 0, dirs, maps }
}

/**
 * ⑥-0 motiveFromInput：模块变更索引摘要提取（2026-10-15-title-label-skip）。与变更标题
 * 同源走 deriveChangeTitle——此前 flow.js 裸取 --input 首行，「动机与背景：」段头行整行
 * 入摘要（stages.changelog 实证）。段头行跳过/标签剥离随 deriveChangeTitle 单源；提取为
 * 空回退变更名（可辨识不达意优于空串；appendChangeIndexEntries 侧另有 '轻量变更' 二级兜底）。
 * @returns {string} 摘要（≤50 字）
 */
export function motiveFromInput(input, change = '') {
  let derived = ''
  try { derived = deriveChangeTitle(input) } catch { derived = '' }
  return derived || String(change || '')
}

/**
 * ⑥ appendChangeIndexEntries：命中模块变更索引机械回写（二档）。零语义判断——日期/变更名/
 * 动机首行全是已知量，与 decision-distill 降 noAI 同性质。目标判定遵守 split-changelog 契约
 * （modules.js）：sidecar 在场优先追加 sidecar 勿写回卡；否则卡内「## 变更索引」节（存在才动，
 * 节外逐字保留）；两者皆无跳过。幂等去重=目标文本已含变更名即跳过（断点续跑防双写）。
 * 行形态按目标既有体自适应（表格「| 日期 | 变更名 | 摘要 |」/ 列表「- 变更名 | 摘要」——
 * module-changelog.js CHANGE_NAME_RE 两种都解析；空节按节标题「（表格…）」倾向表格）。
 * @returns {{appended: string[], skipped: Array<{id: string, reason: string}>}} appended=specBase 相对 posix 路径
 */
export function appendChangeIndexEntries({ specBase, modules, change, summary, date } = {}) {
  const appended = []
  const skipped = []
  const safeSummary = String(summary || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim().slice(0, 60) || '轻量变更'
  for (const m of (Array.isArray(modules) ? modules : [])) {
    try {
      if (!m || !m.id) continue
      if (!m.doc || m.docMissing) { skipped.push({ id: m.id, reason: '无卡（未登记 doc 或卡缺失）' }); continue }
      const cardAbs = join(specBase, String(m.doc).replace(/^\/+/, ''))
      const sidecarAbs = cardAbs.replace(/\.md$/, '.changelog.md')
      const useSidecar = existsSync(sidecarAbs)
      const targetAbs = useSidecar ? sidecarAbs : (existsSync(cardAbs) ? cardAbs : null)
      if (!targetAbs) { skipped.push({ id: m.id, reason: '无卡（doc 指向的文件不存在）' }); continue }
      const text = readFileSync(targetAbs, 'utf8')
      if (!useSidecar && !/^##\s*变更索引/m.test(text)) { skipped.push({ id: m.id, reason: '卡内无「## 变更索引」节' }); continue }
      if (text.includes(change)) { skipped.push({ id: m.id, reason: '已记录（幂等跳过）' }); continue }
      const lines = text.replace(/\r\n/g, '\n').split('\n')
      // 定位插入点与形态：sidecar=整文件体；卡=节内（下一个 ## 或 EOF 前）
      let segStart = 0
      let segEnd = lines.length
      if (!useSidecar) {
        segStart = lines.findIndex((l) => /^##\s*变更索引/.test(l))
        if (segStart < 0) { skipped.push({ id: m.id, reason: '卡内无「## 变更索引」节' }); continue }
        segStart += 1
        segEnd = lines.length
        for (let i = segStart; i < lines.length; i++) {
          if (/^##\s/.test(lines[i])) { segEnd = i; break }
        }
      }
      const body = lines.slice(segStart, segEnd)
      const isTable = body.some((l) => /^\s*\|/.test(l)) || /^##\s*变更索引[^\n]*（表格/.test(lines[segStart - 1] || '')
      const row = isTable ? `| ${date} | ${change} | ${safeSummary} |` : `- ${change} | ${safeSummary}`
      let insertAt = segEnd
      while (insertAt > segStart && lines[insertAt - 1].trim() === '') insertAt -= 1
      // 空节（「（表格，初始为空）」模板）：节标题后空一行再落行
      if (insertAt === segStart && !useSidecar) insertAt = Math.min(segStart + 1, segEnd)
      lines.splice(insertAt, 0, row)
      writeFileSync(targetAbs, lines.join('\n'), 'utf8')
      appended.push(String(m.doc).replace(/^\/+/, ''))
    } catch (e) {
      skipped.push({ id: (m && m.id) || '?', reason: `回写失败（fail-soft）：${(e && e.message) || e}` })
    }
  }
  return { appended, skipped }
}

/**
 * ⑥b deriveRecordedChangeIndexTargets：断点续跑路径反查已回写目标（评审 P3 清偿）。distill
 * 已 done 的重入轮次上进程内 changelogAppended 不跨轮——用与回写幂等去重同款判据
 * （目标文本含变更名）从命中模块的卡/sidecar 反推文件集，供 extraDocs 精确入暂存。
 * sidecar 含变更名优先记 sidecar（split-changelog 契约：已拆卡新条目只可能落 sidecar）。
 * @returns {string[]} specBase 相对 posix 路径（与 appendChangeIndexEntries.appended 同口径）
 */
export function deriveRecordedChangeIndexTargets({ specBase, modules, change } = {}) {
  const out = []
  for (const m of (Array.isArray(modules) ? modules : [])) {
    try {
      if (!m || !m.id || !m.doc || m.docMissing) continue
      const docRel = String(m.doc).replace(/^\/+/, '')
      const cardAbs = join(specBase, docRel)
      const sidecarAbs = cardAbs.replace(/\.md$/, '.changelog.md')
      if (existsSync(sidecarAbs)) {
        if (readFileSync(sidecarAbs, 'utf8').includes(change)) out.push(docRel.replace(/\.md$/, '.changelog.md'))
        continue
      }
      if (existsSync(cardAbs)) {
        const txt = readFileSync(cardAbs, 'utf8')
        if (/^##\s*变更索引/m.test(txt) && txt.includes(change)) out.push(docRel)
      }
    } catch { /* 单模块推导失败跳过（best-effort） */ }
  }
  return out
}

/**
 * ⑦ renderThinDocsDebt：flow start 触碰命中模块的欠账事实行（三档——提示前移：动手前看到
 * 「你要动的卡已落后」，比收口时警告有效）。computeDocsDebt（厚道 execute {DOCS_DEBT}）同源
 * 复用；只出 behind>0 或卡从未提交的模块（空债零输出）；behind=null 降级注记不出（代理信号
 * 不配噪音）。git 锚按 projectRoot；平台模式（specBase 在仓外）走 computeDocsDebt 既有降级。
 * @returns {string[]} 空数组=无债/无图/全降级
 */
export function renderThinDocsDebt({ specBase, projectRoot, changedFiles } = {}) {
  const out = []
  let maps = []
  try { maps = collectModuleMaps({ cwd: projectRoot || specBase, specBase }) } catch { return out }
  const rows = []
  for (const map of maps) {
    let r = null
    try { r = computeDocsDebt({ projectRoot: projectRoot || specBase, specBase, projectName: map.project, changedFiles }) } catch { continue }
    if (!r || !r.ok || !Array.isArray(r.entries)) continue
    for (const e of r.entries) {
      if (!e || !e.module) continue
      if (e.neverCommitted === true) rows.push(`  - ${e.module}：模块卡 ${e.doc || '?'} 从未提交（欠账最重）`)
      else if (Number.isFinite(e.behind) && e.behind > 0) rows.push(`  - ${e.module}：模块卡落后源码 ${e.behind} 个提交${e.doc ? `（${e.doc}）` : ''}`)
    }
  }
  if (rows.length > 0) {
    out.push(`📚 模块卡欠账（behind 计数，advisory——本次若改行为/接口请顺带补卡，收口对账会再提醒）：`)
    out.push(...rows.slice(0, 5))
    if (rows.length > 5) out.push(`   （+${rows.length - 5} 条略）`)
  }
  return out
}

/**
 * verify-result 机器回执（归档前合成，随变更目录留档）。
 */
export function renderVerifyReceipt({ change, baseline, head, gateSummary, review, traceCount, patchMeta, generatedAt }) {
  const sha = patchMeta && patchMeta.patchSha256 ? patchMeta.patchSha256.slice(0, 12) : null
  // 空面跨仓冻结（2026-10-19-thin-empty-face-cross-repo-freeze）：JSON-only 留档没有顶级
  // patchSha256，但 scopeAudit.repos[] 内有跨仓 patch 正文——回执须如实报「跨仓 N 仓」，
  // 不能写「无冻结件」（否则平台/归档读者把成功冻结误判成缺件）。
  const repoFrozen = patchMeta && patchMeta.scopeAudit && Array.isArray(patchMeta.scopeAudit.repos)
    ? patchMeta.scopeAudit.repos.filter((r) => r && typeof r.patch === 'string' && r.patch.length > 0)
    : []
  const freezeLine = sha
    ? `change.patch（sha256 ${sha}…）`
    : repoFrozen.length > 0
      ? `跨仓 ${repoFrozen.length} 仓（diff 见 change-patch.json scopeAudit.repos[]；主仓面为空）`
      : '（无冻结件）'
  const reviewLine = review
    ? review.verdict === 'exempt'
      ? '豁免（低风险证据齐全' + (review.sampled ? '' : '') + '）'
      : `${review.verdict}（reviewer 见 review.json${Number.isFinite(review.findingsP1) ? `，P1 ${review.findingsP1}` : ''}）`
    : '—'
  const headNote = head && baseline && head === baseline
    ? '（等于基线——交付代码尚未提交，冻结面以交付留档实际内容为准：change.patch 或 change-patch.json repos[]）'
    : ''
  return [
    `---`,
    `author: flow-machine-draft`,
    `created_at: ${generatedAt}`,
    `---`,
    `# 验证回执（flow）— ${change}`,
    ``,
    `- **结论**：PASS（flow done 2/2 协议调用收口）`,
    `- **基线..收口时 HEAD**：${baseline ? baseline.slice(0, 10) : '?'}..${head ? head.slice(0, 10) : '?'}${headNote}`,
    `- **实测面**：${gateSummary || '—'}`,
    `- **独立评审**：${reviewLine}`,
    `- **测试绑定**：${traceCount > 0 ? `${traceCount} 行（test-trace.json，已随发号提升）` : '0（无锚行）'}`,
    `- **交付冻结**：${freezeLine}`,
    `- **生成**：${generatedAt}（机器合成，勿手改；明细见 flow-telemetry.jsonl / change-patch.json）`,
    ``,
  ].join('\n')
}

/**
 * design 槽4（风险与死路）实质作答收割 → decisions.md（已有不覆盖）。
 * @returns {{harvested: boolean, reason?: string}}
 */
export function harvestSlot4Decision({ changeDir, change }) {
  const decPath = join(changeDir, 'decisions.md')
  if (existsSync(decPath)) return { harvested: false, reason: 'decisions.md 已在场（不覆盖）' }
  let dText
  try { dText = readFileSync(join(changeDir, 'design.md'), 'utf8') } catch { return { harvested: false, reason: '无 design.md' } }
  const lines = dText.replace(/\r\n/g, '\n').split('\n')
  let inSlot = false
  const buf = []
  for (const line of lines) {
    if (/^<!--\s*AGENT:槽4/.test(line)) { inSlot = true; continue }
    if (inSlot && (/^<!--/.test(line) || /^#{1,6}\s/.test(line))) break
    if (inSlot) buf.push(line)
  }
  let answer = buf.join('\n').trim()
  // v2 纯 markdown（2026-10-04-thin-docs-v2）：无槽标记时改读「风险与死路」节正文（复用
  // flow-review 的 v2 节读取——剥离问题原文行；单一源 DESIGN_QUESTIONS 防镜像漂移）
  if (!inSlot) {
    const risksSec = DESIGN_QUESTIONS.sections.find((s) => s.key === 'risks')
    answer = readV2SectionAnswer(dText, risksSec.heading, DESIGN_QUESTIONS)
  }
  if (!answer || /^不适用/.test(answer)) return { harvested: false, reason: '槽4 空/不适用' }
  // 锚点自动回填（2026-10-15-decision-anchor-backfill 收割端）：风险段作答文本恰含一个
  // 路径 token → 写入 - 锚点：行（源 decisions.md 是真相源，蒸馏自然带上、人可改）；
  // 0/多候选不写（蒸馏端渲染时还会再兜底一次同款判定）。单一源 anchorBackfillCandidate。
  const anchorCand = anchorBackfillCandidate(answer)
  const anchorLine = anchorCand ? [`- 锚点：${anchorCand}`] : []
  const text = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 决策记录（Decisions）— ${change}`,
    '',
    // 标题自解释（2026-10-15-harvest-title-clarify）：读者面是 decisions 文档与 knowledge，
    // 机制出处（槽4 收割）由 frontmatter author: flow-machine-draft 承载，标题只说内容与性质。
    `## D-001@v1: 设计期风险与放弃方案（底稿）`,
    `- 类型：process`,
    `- 状态：confirmed`,
    ...anchorLine,
    // 类型/状态字段（2026-09-26-slot4-distill-fix）：蒸馏链入选要 status∈{confirmed|accepted|rejected}
    // 且 type∈七类白名单，字段解析只认 `- 字段：值` 列表行形态——此前收割条目零字段致永不入选，
    // 「随蒸馏链进 knowledge」断链（thin-agent-tasks 教训留档归档而 knowledge 零落地的实证）。
    // 槽4 是定案的流程/方法论取舍，process+confirmed 语义成立。
    `- 答案：${answer.replace(/\s*\n+\s*/g, ' ')}`,
    // 正文用「答案」标签（同修）：distill 落盘「理由：」行取 entry.answer——此前「- 决策：」非白名单
    // 字段，正文不随条目进 knowledge（骨架落盘内容丢失）。一行展平（评审 P1 清偿）：字段解析是
    // 单行契约，多行槽4 作答经 \n 续行会静默丢后续行——收割端压平为单行（空格分隔）保全文。
    '',
  ].join('\n')
  writeAtomicSync(decPath, text)
  return { harvested: true }
}

export default { reconcileModuleDocs, renderVerifyReceipt, harvestSlot4Decision, collectFreezeFiles, backfillGateSummary, motiveFromInput }

/**
 * patch 冻结面的提交面过滤（2026-09-27-tool-debt-cleanup 抽出为纯函数供单测锁定）：
 * 非 .sillyspec/ 全留 + .sillyspec/docs/ 交付文档（dogfood 模块卡是交付物——2026-09-27-
 * gate-docs-cleanup 评审 P2 实证旧口径把已提交模块卡漏出审计 patch）。
 * .sillyspec/changes/** 全滤除，含本变更目录（2026-10-12-close-trace-freeze-integrity
 * FR-01：工件随归档目录本体入库，patch 再冻是冗余且污染 totals、掩盖「可归属面为空」
 * 哨兵；口径对齐 execute --done 沉淀资产面投影的 filterDeliverableFiles）。反斜杠归一。
 *
 * 提交事实归属补位（2026-10-05-diff-commit-attribution）：现状「已提交即本变更的」前提是
 * 单会话——多会话共享仓 baseline..HEAD 混入他侧交付（评审 P2 实证：他会话 knowledge-stats
 * hunk 冻进本变更审计件）。在现状过滤后剔除「窗口内全部提交均属他侧变更名」的交付文件。
 * 与否决决策 sentinel-evidence-freeze⑤ 的分界：按提交 message 变更名（既成事实）切，不按
 * 任何变更的声明清单（该决策禁的是陈旧声明的意图抢夺）。best-effort：变更名自 ownPrefix
 * 反解，baseline 自 flow-state.yaml 读取；不可得（非 git 仓/无 flow-state/git 失败/归档后
 * 目录已移走）= 行为与旧版完全一致。保守：被无后缀裸提交触碰过的文件不剔（fail-closed）。
 */
export function filterCommittedFace(committedRaw, ownPrefix, opts = {}) {
  const base = committedRaw
    .map((f) => String(f).replace(/\\/g, '/'))
    .filter((p) => !p.startsWith('.sillyspec/') || p.startsWith('.sillyspec/docs/'))
  try {
    const cwd = opts.cwd || process.cwd()
    const pm = /^\.sillyspec\/changes\/([^/]+)\/$/.exec(String(ownPrefix || ''))
    if (!pm) return base
    const specBase = opts.specBase || join(cwd, '.sillyspec')
    const attr = commitAttributionForChange(cwd, specBase, pm[1], opts.baselineCommit || null)
    if (!attr) return base
    return base.filter((p) => {
      if (p.startsWith('.sillyspec/')) return true // 治理面归属已由上方现状口径裁决
      return !isForeignByCommit(attr.get(p), pm[1])
    })
  } catch { return base }
}

/**
 * patch 冻结面漂移检测（2026-10-05-disposition-refreeze-drift，主清单 P1）：处置重入审计
 * 时点错位——评审发现处置涉及代码修改后重跑 flow done，patch 子步幂等跳过让 change.patch/
 * review.json 停在处置前时点（2026-10-05-review-promise-negation 先例 905397ef；
 * 2026-10-05-flowdone-lintfail-output 收编活体复现：评审 P1 处置提交后不带 --refreeze 重跑，
 * 归档件缺处置面）。
 *
 * 判定：freezeHead（change-patch.json.head 冻结锚）..HEAD 窗口内存在「本变更名后缀提交」即
 * 漂移——按提交 message 变更名归属（parseChangeNamesFromSubject，与 filterCommittedFace
 * 同口径的既成事实切分，非声明抢文件）。仅他侧后缀/裸提交不触发（他侧面归属切分另有防线，
 * 裸提交保守不动作）。检测自身失败按无漂移（退现状幂等跳过行为，fail-safe 不新造阻断面）。
 *
 * 文件面三字段（2026-10-10-drift-review-governance-keep，坑 drift-review-governance-loop）：
 * ownCommits 只答「有没有漂移」，不答「评审结论该不该作废」——调用方（flow.js 漂移分支）
 * 据文件面区分治理面等价（评审保留）与交付/承诺面（隔离重评）：
 *   ownFiles            窗口内本变更提交触及的文件集（--name-only 采集，正斜杠归一；merge 提交
 *                       无 -m 展开不计文件——漏采只可能让 governanceOnly 偏 false，回落隔离
 *                       重评，fail-safe 宁可多评）
 *   governanceOnly      own 提交全在 .sillyspec/** 下且文件集非空（治理文件等价漂移）
 *   touchedPromiseFace  含本变更 requirements.md / design.md（承诺面也是评审对象，破豁免）
 * @param {{ cwd: string, change: string, freezeHead: string|null }} opts
 * @returns {{ drifted: boolean, ownCommits: string[], head: string|null, ownFiles: string[], governanceOnly: boolean, touchedPromiseFace: boolean }} ownCommits=本变更后缀提交的 subject 列表（截 80 字）
 */
/**
 * 冻结件完整性探针（2026-10-19-thin-empty-face-cross-repo-freeze）：空面跨仓冻结走
 * JSON-only 留档（主仓面为空，`scopeAudit.repos[]` 承载跨仓 patch 正文，无 change.patch）。
 * 存在性复查不能把「无 change.patch」一律判缺件——JSON 在场且 repos 内有 patch 正文即完整。
 * 坏 JSON/读失败按缺件处理（重冻结兜底，fail-safe 不新造静默跳过面）。
 * @returns {{ hasJson: boolean, hasText: boolean, repoPatchCount: number, complete: boolean }}
 */
export function inspectFreezeArtifacts(changeDir) {
  const patchJsonPath = join(changeDir, 'change-patch.json')
  const patchTextPath = join(changeDir, 'change.patch')
  const hasJson = existsSync(patchJsonPath)
  const hasText = existsSync(patchTextPath)
  let repoPatchCount = 0
  let jsonOk = false
  if (hasJson) {
    try {
      const meta = JSON.parse(readFileSync(patchJsonPath, 'utf8'))
      jsonOk = true
      const repos = meta && meta.scopeAudit && meta.scopeAudit.repos
      if (Array.isArray(repos)) {
        repoPatchCount = repos.filter((r) => r && typeof r.patch === 'string' && r.patch.length > 0).length
      }
    } catch { /* 坏 JSON → 按缺件处理（重冻结兜底） */ }
  }
  // jsonOk 与 hasText 必须同时成立：change.patch 在场但 change-patch.json 损坏时，
  // 冻结元数据已不可信（审计面缺锚），不能因正文文件在就判完整。
  return { hasJson, hasText, jsonOk, repoPatchCount, complete: jsonOk && (hasText || repoPatchCount > 0) }
}

/**
 * 冻结缺口标签（存在性复查的调用点共用逻辑，纯函数便于直测）：
 * 完整 → []；否则给出可读缺件清单（坏 JSON 与真缺件区分，防止「正文在就判完整」盲区）。
 * @param {{ hasJson?: boolean, hasText?: boolean, jsonOk?: boolean, repoPatchCount?: number, complete?: boolean }} state
 * @returns {string[]}
 */
export function freezeGapLabels(state) {
  const s = state && typeof state === 'object' ? state : {}
  if (s.complete === true) return []
  const gaps = []
  if (!s.hasJson) gaps.push('change-patch.json')
  else if (!s.jsonOk) gaps.push('change-patch.json（损坏）')
  if (!s.hasText && !(Number(s.repoPatchCount) > 0)) gaps.push('change.patch')
  if (gaps.length === 0) gaps.push('冻结件不完整')
  return gaps
}

/**
 * 冻结缺口标签（目录级入口，flow done 存在性复查的唯一调用面）：
 * 检查（inspect）与标签（freezeGapLabels）一次封装——调用点直接用本函数，
 * 直测本函数即覆盖调用点接线（防「探针修了调用点没接」的回归）。
 * @param {string} changeDir
 * @returns {string[]}
 */
export function missingFreezeLabels(changeDir) {
  return freezeGapLabels(inspectFreezeArtifacts(changeDir))
}

export function detectPatchDrift({ cwd, change, freezeHead }) {
  try {
    if (!freezeHead) return { drifted: false, ownCommits: [], head: null, ownFiles: [], governanceOnly: false, touchedPromiseFace: false }
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8', timeout: 30000, windowsHide: true }).trim()
    if (!head || head === freezeHead) return { drifted: false, ownCommits: [], head, ownFiles: [], governanceOnly: false, touchedPromiseFace: false }
    const log = execFileSync('git', ['log', '--name-only', '--format=%x00%s', `${freezeHead}..HEAD`], { cwd, encoding: 'utf8', timeout: 30000, windowsHide: true })
    const own = []
    const ownFileSet = new Set()
    for (const block of String(log).split('\x00')) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      const subject = lines[0]
      if (!subject) continue
      if (parseChangeNamesFromSubject(subject).includes(change)) {
        own.push(subject.slice(0, 80))
        for (const f of lines.slice(1)) ownFileSet.add(f.replace(/\\/g, '/'))
      }
    }
    const ownFiles = [...ownFileSet]
    const promiseFace = [`.sillyspec/changes/${change}/requirements.md`, `.sillyspec/changes/${change}/design.md`]
    const governanceOnly = own.length > 0 && ownFiles.length > 0 && ownFiles.every((f) => f.startsWith('.sillyspec/'))
    const touchedPromiseFace = ownFiles.some((f) => promiseFace.includes(f))
    return { drifted: own.length > 0, ownCommits: own, head, ownFiles, governanceOnly, touchedPromiseFace }
  } catch { return { drifted: false, ownCommits: [], head: null, ownFiles: [], governanceOnly: false, touchedPromiseFace: false } }
}

/**
 * patch 冻结面收集（2026-09-25-thin-r16-patches 修复①，R16 P2：agent 提交晚于 done →
 * 冻结件只有治理件）。committed 提交面为主；exclusive（会话专属 worktree，调用方按
 * gate-snapshot 同款判定注入）时未提交 dirty 交付面一并入冻结——独占树内 dirty 全归属本变更；
 * 共享主仓无法归属 → 不入面只警告（他侧声明的 dirty 连警告都免）。
 */
export function collectFreezeFiles({ cwd, specBase, change, committed, exclusive }) {
  const deliverable = (f) => !String(f).replace(/\\/g, '/').startsWith('.sillyspec/')
  let dirty = []
  try {
    // -uall（2026-10-08-thin-done-dirty-gate-and-paren-attribution）：全新目录会折叠成
    // `dir/` token（porcelain 缺省形态）——readFileSync(目录) 静默 skip，--freeze-dirty
    // 声称并入却漏目录内交付文件（dg-freeze 夹具实证 src/ 折叠）。逐文件展开与
    // scope-audit/flow.js 状态采集口径对齐。
    const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd, encoding: 'utf8', timeout: 30000, windowsHide: true })
    for (const line of String(out).split('\n')) {
      if (!line || line.length < 4) continue
      const p = line.slice(3).trim().replace(/^"|"$/g, '')
      const arrow = p.indexOf(' -> ')
      const path = (arrow !== -1 ? p.slice(arrow + 4) : p).replace(/\\/g, '/')
      if (deliverable(path) && !dirty.includes(path)) dirty.push(path)
    }
  } catch { /* git 失败零 dirty 面 */ }
  // 归属切分单点：exclusive（worktree/--freeze-dirty）与共享主仓共用——他侧已声明 dirty 永不入冻
  // （评审 P2 修复：--freeze-dirty 承诺「非他侧声明」，全量冻入会造成跨变更审计双计；worktree
  // 下 own 恒为全量，切分无伤）
  let ownDirty = dirty
  try {
    ownDirty = splitOwnVsForeignDiffFiles(cwd, change, dirty, { specBase }).own
  } catch { /* 归属切分失败：exclusive 保留全量（声明即边界），共享主仓退全量警告 */ }
  if (exclusive) return { files: [...new Set([...committed, ...ownDirty])], dirtyAdded: ownDirty, dirtyWarned: [] }
  return { files: [...committed], dirtyAdded: [], dirtyWarned: ownDirty }
}

/**
 * 会话专属 worktree 孤儿提交面扫描（2026-10-12-close-trace-freeze-integrity FR-02）。
 *
 * 事故形态（multi-agent-platform 2026-10-12-ws-ref-ws-name 取证）：实现提交在会话 worktree
 * 内完成但不在 flow done 时点 HEAD 的祖先链（reset/detach/平行分支）——baseline..HEAD 提交面
 * 与 git status 脏面都看不到，冻结面静默缺实现（+38/-10 实现零留痕、归档后 apply 才找回）。
 *
 * 扫描面：本 worktree 的 HEAD reflog（linked worktree 独立 reflog，会话独占不污染）。取不在
 * HEAD 祖先链、也不在 baseline 祖先链（flow start 前的既有历史不算缺口）的提交；其 patch-id
 * 与 baseline..HEAD 任一提交等价（amend/rebase 残留同内容）视为已覆盖剔除；余者触及交付面
 * 文件（非 .sillyspec/）即入缺口。只读不写，git 全失败返回空面（fail-safe）。
 * 已知边界（钉行为见 test/close-trace-freeze-integrity.test.mjs「merge 提交自身不判」用例）：
 * merge 形态的孤儿提交经 `git show`（combined diff 常空）取不到文件面 → 自身不判；但其
 * 侧支成员提交若发生在 HEAD 轨迹上（checkout 后 commit）reflog 仍可见、照判——盲区不掩盖
 * 成员工作，留披露不静默。
 *
 * @param cwd 会话专属 worktree 根（调用方保证路径判定命中，本函数不复判）
 * @param opts.baseline flow start 基线提交（不可解析时返回空面——区间无法建立）
 * @returns {{ commits: string[], files: string[] }} commits 去重提交 SHA、files 并集交付文件（posix）
 */
export function scanOrphanFace(cwd, { baseline } = {}) {
  const empty = { commits: [], files: [] }
  const git = (args, opts = {}) => {
    try {
      return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 60000, windowsHide: true, ...opts }).trim()
    } catch { return null }
  }
  if (!baseline || !/^[0-9a-f]{4,40}$/i.test(baseline)) return empty
  if (git(['cat-file', '-e', `${baseline}^{commit}`]) === null) return empty
  const head = git(['rev-parse', 'HEAD'])
  if (!head) return empty
  // baseline..HEAD 提交集 + 各自 patch-id（等价覆盖面）
  const inRange = String(git(['log', '--no-merges', '--format=%H', `${baseline}..${head}`]) || '')
    .split('\n').map((s) => s.trim()).filter(Boolean)
  const covered = new Set(inRange)
  const patchIdOf = (commit) => {
    const diff = git(['show', '--no-color', '--pretty=format:', '--patch', '--no-merges', commit])
    if (!diff) return null
    const out = git(['patch-id', '--stable'], { input: diff + '\n' })
    return out ? out.split(/\s+/)[0] : null
  }
  const coveredIds = new Set()
  for (const c of inRange) {
    const pid = patchIdOf(c)
    if (pid) coveredIds.add(pid)
  }
  // 本 worktree HEAD reflog 全轨迹（linked worktree 独立）
  const reflogHashes = String(git(['reflog', 'show', '--format=%H', 'HEAD']) || '')
    .split('\n').map((s) => s.trim()).filter(Boolean)
  const isAncestor = (sha, of) => git(['merge-base', '--is-ancestor', sha, of], {}) !== null
  const deliverable = (f) => !String(f).replace(/\\/g, '/').startsWith('.sillyspec/')
  const orphanCommits = []
  const orphanFiles = new Set()
  for (const h of [...new Set(reflogHashes)]) {
    if (covered.has(h)) continue
    // exit code 0 = ancestor；execFileSync 抛非零 → 返回 null
    if (isAncestor(h, head)) continue
    if (isAncestor(h, baseline)) continue // flow start 前既有历史（worktree 建立期轨迹）
    const pid = patchIdOf(h)
    if (pid && coveredIds.has(pid)) continue // amend/rebase 等价残留
    const files = String(git(['show', '--no-color', '--name-only', '--pretty=format:', '--no-merges', h]) || '')
      .split('\n').map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean).filter(deliverable)
    if (files.length === 0) continue // 只碰治理面的孤儿不入缺口
    orphanCommits.push(h)
    for (const f of files) orphanFiles.add(f)
  }
  return { commits: orphanCommits, files: [...orphanFiles].sort() }
}

/**
 * thin 通道三态行构造（writeCloseTraceArtifacts 的 snapObj.rows 数据源，纯函数）：
 * ownFiles 过 filterDeliverableFiles（与 scope-audit actual 侧同口径——治理工件目录不进
 * 快照行）× design 清单 pathMatches 判三态（planned/unplanned；与主链路三态判定同款）；
 * stats（collectNumstatByPath 产物 Map）缺档落 null 行数（不出伪数据）；planEntries 空/缺省
 * → 实际侧 only 行（无 verdict，与主链路计划侧降级同语义）。清单条目未命中冻结面 →
 * untouched 0/0 补行（跨仓条目带 crossRepo 保持 ⊘ 形态，主链路补行同语义）。
 * crossRepoRows（2026-10-10-cross-repo-patch-freeze D-002@v1 可选第 4 参）：scope-audit
 * reconcileCrossRepoPlan 的跨仓对账行（真实三态或 degraded ⊘，均带 crossRepo 标记）——
 * 提供时带 repo 的声明条目若已被对账行覆盖（crossRepo+pathMatches 双判）不再落 ⊘ 补行
 * （跨仓实改不谎报「未动」）；缺省 undefined → 现行为逐字节零回归（单仓变更/对账失败
 * fail-soft 退路）。
 * @returns {{ rows: Array<object>, totals: { files: number, additions: number, deletions: number } }}
 */
export function buildThinSnapshotRows({ ownFiles, stats, planEntries, crossRepoRows }) {
  const plan = Array.isArray(planEntries) ? planEntries : []
  const crossRows = (Array.isArray(crossRepoRows) ? crossRepoRows : []).filter((r) => r && typeof r === 'object')
  const statMap = stats instanceof Map ? stats : new Map()
  const rowFiles = filterDeliverableFiles([...new Set((Array.isArray(ownFiles) ? ownFiles : [])
    .map((f) => String(f).replace(/\\/g, '/')).filter(Boolean))]).sort()
  const rows = []
  const matched = new Set()
  for (const f of rowFiles) {
    const st = statMap.get(f) || {}
    const row = {
      path: f,
      additions: Number.isFinite(st.additions) ? st.additions : null,
      deletions: Number.isFinite(st.deletions) ? st.deletions : null,
      kind: st.kind || 'modified',
    }
    if (plan.length > 0) {
      const entry = plan.find((e) => e && pathMatches(f, e.path))
      if (entry) {
        matched.add(entry.path)
        row.planned = entry.operation || null
        row.verdict = 'planned'
      } else {
        row.planned = null
        row.verdict = 'unplanned'
        const facility = classifyToolScaffold(f)
        if (facility) row.facility = facility
      }
    }
    rows.push(row)
  }
  for (const e of plan) {
    if (!e || matched.has(e.path)) continue
    // 跨仓对账覆盖判定（D-002@v1）：crossRepoRows 提供且该声明条目已被对账行覆盖（同 repoKey
    // + pathMatches 双判——对账行是真实三态或 degraded ⊘，覆盖即不再补恒 ⊘ 行）；对账行缺失
    // （fail-soft 退路/降级仓无行）→ 照旧补 ⊘ 行
    if (e.repo && crossRows.some((r) => r.crossRepo === e.repo && pathMatches(String(r.path || ''), e.path))) continue
    // 兜底合并（2026-10-13-declared-paren-strip）：declared 路径剥括号残片（normalizePath，
    // 与解析端同源）后与实际行精确等值 → 不补占位行；实际行归因升 planned（取更准一行），
    // totals 按唯一路径计。防他源污染形态致同文件双行/文件数虚高（缺陷档案实证形态的兜底层）。
    const clean = normalizePath(String(e.path || ''))
    const hitRow = clean ? rows.find((r) => r.path === clean && !r.crossRepo) : null
    if (hitRow) {
      matched.add(e.path)
      if (hitRow.verdict !== 'planned') {
        hitRow.planned = e.operation || null
        hitRow.verdict = 'planned'
      }
      continue
    }
    rows.push({
      path: e.path, planned: e.operation || null, additions: 0, deletions: 0,
      kind: 'modified', verdict: 'untouched',
      ...(e.repo ? { crossRepo: e.repo } : {}),
    })
  }
  // 跨仓对账行并入总表（D-002@v1，heavy 通道同款语义——「跨仓行并入后自然计入 totals」）：
  // 主仓行在前、跨仓行按仓追加；真实三态行（实 +/- 行数）替换恒 ⊘ 谎报
  rows.push(...crossRows)
  let additions = 0
  let deletions = 0
  for (const r of rows) {
    if (Number.isFinite(r.additions)) additions += r.additions
    if (Number.isFinite(r.deletions)) deletions += r.deletions
  }
  return { rows, totals: { files: rows.length, additions, deletions } }
}

/**
 * heavy 通道沉淀资产面投影（writeCloseTraceArtifacts 的 files/totals 数据源，纯函数；
 * 2026-10-07-unify-close-trace，评审 P3 覆盖清偿抽纯函数）：rows → 主仓实改行——
 * untouched 0/0 是声明不是改动、crossRepo 行 patch 不在主仓，均不入；verdict 缺失行
 * （计划侧降级形态）按实改保留；null 行数不计合计（不出伪数据）。
 * @returns {{ rows: object[], files: string[], totals: { files: number, additions: number, deletions: number } }}
 */
export function projectTraceFaceRows(rows) {
  const face = (Array.isArray(rows) ? rows : [])
    .filter((r) => r && typeof r === 'object' && !r.crossRepo && r.verdict !== 'untouched')
  let additions = 0
  let deletions = 0
  for (const r of face) {
    if (Number.isFinite(r.additions)) additions += r.additions
    if (Number.isFinite(r.deletions)) deletions += r.deletions
  }
  return { rows: face, files: face.map((r) => r.path), totals: { files: face.length, additions, deletions } }
}

/**
 * 收口留痕单套写（2026-10-09-close-trace-single-set）：thin（flow done）与 heavy
 * （execute --done）统一只落 change.patch + change-patch.json 两件。原对账快照面
 * （scope-audit.json + scope-audit.patch，2026-10-07-unify-close-trace 起与沉淀资产面
 * 双轨并写）停写：对账数据并入 change-patch.json 的 scopeAudit 子对象，顶级键
 * （change/baseline/head/files/totals/savedAt/note/moduleScope 等）原位不动——
 * fr-index/knowledge-graph/flow 漂移检测与平台 assets.py/parser.py 等顶级字段读方零改动。
 * patchText 一次 sha256 锚定 patch 与 patchStatus；patchText 空/null → failed、不落
 * patch 文件。读侧兼容链（scopeAudit 子对象 > 旧 scope-audit.json > .runtime 快照 >
 * thin 回放 > 实时区间）兜存量归档，旧名只读不写。
 *
 * @param {string} changeDir 变更目录（活跃或归档侧——归档竞态由调用方解析）
 * @param {object} snapObj scopeAudit 子对象主体（mode/ok/degradedReason/baseAnchor/
 *   totals/rows/excluded/note[/repos]；closedBy 由调用方携带标收尾通道——读侧回放按它
 *   标注，缺省 'execute --done' 兼容旧快照）
 * @param {object} meta change-patch.json 顶级增量键（note/moduleScope 等，展开在 totals 后）
 * @returns {{ patchStatus: 'ok'|'failed', patchSha256: string|null }}
 */
export function writeCloseTraceArtifacts({ changeDir, change, baseline, head, files, metaTotals, patchText, savedAt, snapObj, meta = {}, patchStatus = null }) {
  const fileList = Array.isArray(files) ? files : []
  const patchOk = typeof patchText === 'string' && patchText.length > 0
  const patchBody = patchOk ? (patchText.endsWith('\n') ? patchText : patchText + '\n') : null
  const patchSha256 = patchBody
    ? createHash('sha256').update(patchBody.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
    : null
  // 显式 patchStatus（2026-10-19-thin-empty-face-cross-repo-freeze）：空面跨仓冻结
  // 没有主仓 patchText，但冻结本身成功——调用方传 'ok' 表达「冻结成功，无主仓 patch」，
  // 不能复用 patchText 判空落 'failed'（平台/归档读者会把成功冻结误判为采集失败）。
  const status = patchStatus === 'ok' || patchStatus === 'failed' ? patchStatus : (patchOk ? 'ok' : 'failed')
  if (patchOk) writeFileSync(join(changeDir, 'change.patch'), patchBody)
  writeFileSync(join(changeDir, 'change-patch.json'), JSON.stringify({
    change,
    baseline: baseline ?? null,
    head: head ?? null,
    files: fileList,
    totals: metaTotals && typeof metaTotals === 'object'
      ? metaTotals
      : { files: fileList.length, additions: 0, deletions: 0 },
    savedAt,
    ...meta,
    scopeAudit: { ...snapObj },
    ...(patchSha256 ? { patchSha256 } : {}),
    patchStatus: status,
  }, null, 2) + '\n')
  return { patchStatus: status, patchSha256 }
}

/**
 * 实测面回填（修复③：ledger 子步断点续跑 skip 后回执不失忆）——从 verify-runs 最近
 * test-result.json（带 change 键）重建摘要；无匹配返回 null。
 */
export function backfillGateSummary(runtimeRoot, change) {
  try {
    const runsDir = join(runtimeRoot, 'verify-runs')
    if (!existsSync(runsDir)) return null
    for (const d of [...readdirSync(runsDir)].sort().reverse()) {
      const p = join(runsDir, d, 'test-result.json')
      if (!existsSync(p)) continue
      let r
      try { r = JSON.parse(readFileSync(p, 'utf8')) } catch { continue }
      if (r && r.change === change) {
        return `test: ${r.status ?? '?'}${r.command ? ` ← ${r.command}` : ''}${typeof r.duration_ms === 'number' ? `（${(r.duration_ms / 1000).toFixed(1)}s）` : ''} 结果：${p}`
      }
    }
  } catch { /* 回填 best-effort */ }
  return null
}
