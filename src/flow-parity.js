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
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { splitOwnVsForeignDiffFiles, commitAttributionForChange, isForeignByCommit } from './foreign-declared.js'
import { collectModuleMaps, normalizeMapPath } from './module-resolve.js'
import { writeAtomicSync } from './fs-atomic.js'
import { readV2SectionAnswer } from './flow-review.js'
import { DESIGN_QUESTIONS } from './flow-draft.js'

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
      const hitFiles = deliverables.filter((f) => effs.some((e) => f === e || f.startsWith(e + '/')))
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
  const isCovered = (f) => allPaths.some((pp) => pp && (f === pp || f.startsWith(pp + '/')))
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
 * verify-result 机器回执（归档前合成，随变更目录留档）。
 */
export function renderVerifyReceipt({ change, baseline, head, gateSummary, review, traceCount, patchMeta, generatedAt }) {
  const sha = patchMeta && patchMeta.patchSha256 ? patchMeta.patchSha256.slice(0, 12) : null
  const reviewLine = review
    ? review.verdict === 'exempt'
      ? '豁免（低风险证据齐全' + (review.sampled ? '' : '') + '）'
      : `${review.verdict}（reviewer 见 review.json${Number.isFinite(review.findingsP1) ? `，P1 ${review.findingsP1}` : ''}）`
    : '—'
  const headNote = head && baseline && head === baseline
    ? '（等于基线——交付代码尚未提交，冻结面以 change.patch 实际内容为准）'
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
    `- **交付冻结**：${sha ? `change.patch（sha256 ${sha}…）` : '（无冻结件）'}`,
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
  const text = [
    '---',
    `author: flow-machine-draft`,
    `created_at: ${new Date().toISOString()}`,
    '---',
    `# 决策记录（Decisions）— ${change}`,
    '',
    `## D-001@v1: 风险与死路（design 槽4 收割）`,
    `- 类型：process`,
    `- 状态：confirmed`,
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

export default { reconcileModuleDocs, renderVerifyReceipt, harvestSlot4Decision, collectFreezeFiles, backfillGateSummary }

/**
 * patch 冻结面的提交面过滤（2026-09-27-tool-debt-cleanup 抽出为纯函数供单测锁定）：
 * 非 .sillyspec/ 全留 + 本变更目录（治理工件）+ .sillyspec/docs/ 交付文档（dogfood 模块卡
 * 是交付物——2026-09-27-gate-docs-cleanup 评审 P2 实证旧口径把已提交模块卡漏出审计 patch）。
 * 他侧 .sillyspec/changes/**（quicklog/knowledge WIP）仍滤除。反斜杠归一。
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
    .filter((p) => !p.startsWith('.sillyspec/') || p.startsWith(ownPrefix) || p.startsWith('.sillyspec/docs/'))
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
 * patch 冻结面收集（2026-09-25-thin-r16-patches 修复①，R16 P2：agent 提交晚于 done →
 * 冻结件只有治理件）。committed 提交面为主；exclusive（会话专属 worktree，调用方按
 * gate-snapshot 同款判定注入）时未提交 dirty 交付面一并入冻结——独占树内 dirty 全归属本变更；
 * 共享主仓无法归属 → 不入面只警告（他侧声明的 dirty 连警告都免）。
 */
export function collectFreezeFiles({ cwd, specBase, change, committed, exclusive }) {
  const deliverable = (f) => !String(f).replace(/\\/g, '/').startsWith('.sillyspec/')
  let dirty = []
  try {
    const out = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8', timeout: 30000, windowsHide: true })
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
