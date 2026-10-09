/**
 * flow.js — 2-调用协议（R7 切片二 / D-002 D-003 D-007 / FR-03~06）。
 *
 * 协议形状属性（机械 harness 可验，非 agent 配额）：轻量跑道 CLI 必需交互 = 2——
 *   ① `flow start`（一次下发：建 change + 基线锚定 + 轻量变更说明 + 全部材料**路径**清单
 *      ——稳定前缀=缓存最优；已存在 change → 恢复简报（盘面状态：checkbox/提交/账本/
 *      dirty files → 做到哪、剩什么））；
 *   ② `flow done`（唯一裁决点：六子步幂等——工件校验/P2 账本对账+亲测/探针/distill/
 *      归档/事件收口）。
 * 中间零协议必需交互；agent 自愿 status/verify 合法不计入（D-007：协议记账单位=change 级
 * ≈ 一次 GSD Phase；task 卡是干活单位非协议检查点）。
 *
 * fail-closed 三句（用户裁定钉死）：①亲自实测失败=整单 FAIL exit≠0（不继续 distill/归档）；
 * ②实测超时=失败（同 quick 门，无部分成功当绿）；③半态可重入不可假绿——归档子步未完成前
 * change 仍 active，重入从断点续不新开 change。
 *
 * 配置（local.yaml，config-schema 注册；design 措辞 `flow: thin|legacy` 落地为单键
 * `flow.mode: thin|legacy`——YAML 单键形态语义一致）：缺省 thin（2026-09-25-thin-default-flip
 * 入口归一——D-010@v2 实验通道定位由轻量变更加固件【设计记录/测试绑定/patch 留档/预段收编】推翻，
 * quick 退役第 1 步）；legacy=显式回旧道，既有 run <stage> 全族逐字不动，flow start 拒跑并指路
 * （切回一行 yaml）。thin change 上跑 run <stage> =
 * 混跑回退（flow-state 落 legacy_fallback，flow done 按厚档裁决——两套记账不叠加）。
 *
 * 状态落文件不落 DB（红线）：.sillyspec/changes/<名>/flow-state.yaml（tier/baseline_commit/
 * 六子步完成标记/legacy_fallback/route_hint）——fs-atomic 原子写，缺文件=未参与 thin。
 * 幂等循 task-done 先例：子步各查自身完成标记，中断半态重入断点续，中段失败精确报告。
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, appendFileSync, renameSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import yaml from 'js-yaml'
import { git, gitQuiet } from './git-helper.js'
import { writeAtomicSync } from './fs-atomic.js'
import { resolveRuntimeRoot, triggerSync, assertDatedChangeName } from './run/shared.js'
import { detectUiTouch, buildUiGuidanceLines, runUiVisualProbe, readUiVisualGate, UI_EVIDENCE_FILENAME } from './ui-visual.js'
import { runHunkAttributionGate, readHunkGate, renderHunkAttributionLines } from './hunk-attribution.js'

const FLOW_STATE_FILE = 'flow-state.yaml'
const SUBSTEPS = ['artifacts', 'ledger', 'patch', 'review', 'probes', 'distill', 'archive', 'events']

/** 读 flow-state（缺文件/损坏 → null = 未参与 thin）。 */
export function readFlowState(changeDir) {
  try {
    const raw = readFileSync(join(changeDir, FLOW_STATE_FILE), 'utf8')
    const obj = yaml.load(raw)
    return obj && typeof obj === 'object' ? obj : null
  } catch {
    return null
  }
}

/** 原子写 flow-state（patch 合并，幂等）。 */
export function writeFlowState(changeDir, patch) {
  const cur = readFlowState(changeDir) || {}
  writeAtomicSync(join(changeDir, FLOW_STATE_FILE), yaml.dump({
    tier: 'thin',
    legacy_fallback: false,
    substeps: {},
    ...cur,
    ...patch,
    substeps: { ...(cur.substeps || {}), ...(patch.substeps || {}) },
    updatedAt: new Date().toISOString(),
  }, { lineWidth: 120 }) + '\n')
}

/** 读 local.yaml 的 flow 配置（缺省 thin——2026-09-25-thin-default-flip 翻转：入口归一，
 * D-010@v2 实验通道定位由轻量变更加固件（设计记录/测试绑定/patch 留档/预段收编）的数据推翻；
 * 显式 mode: legacy 的仓维持旧道。文本级读同既有习惯）。 */
export function readFlowConfig(specBase) {
  try {
    const raw = readFileSync(join(specBase, 'local.yaml'), 'utf8')
    const m = raw.match(/^\s*mode\s*:\s*(thin|legacy)\s*$/m)
    let mode = m ? m[1] : 'thin'
    if (/^flow\s*:\s*(thin|legacy)\s*$/m.test(raw)) mode = raw.match(/^flow\s*:\s*(thin|legacy)\s*$/m)[1]
    const th = raw.match(/^\s*edit_ratio_threshold\s*:\s*([0-9.]+)\s*$/m)
    const en = raw.match(/^\s*edit_ratio_enforcement\s*:\s*(advisory|block)\s*$/m)
    return {
      mode,
      editRatioThreshold: th ? Number(th[1]) : 0.5,
      editRatioEnforcement: en ? en[1] : 'advisory',
    }
  } catch {
    return { mode: 'thin', editRatioThreshold: 0.5, editRatioEnforcement: 'advisory' }
  }
}

/** 基线以来变更文件（git diff 基线→HEAD + 工作区 dirty——flow done 测试门清单来源，D-003）。
 * 排除 .sillyspec/ 内部产物（观测对象≠交付物；spec 文件不触发测试门也不算 dirty 恢复信号）。 */
function changedFilesSinceBaseline(cwd, baselineCommit) {
  const files = new Set()
  const addIfDeliverable = (p) => {
    if (p && !p.replace(/\\/g, '/').startsWith('.sillyspec/')) files.add(p)
  }
  if (baselineCommit) {
    const d = gitQuiet(cwd, ['diff', '--name-only', `${baselineCommit}..HEAD`])
    if (d) for (const l of String(d).split('\n')) if (l.trim()) addIfDeliverable(l.trim())
  }
  const s = gitQuiet(cwd, ['status', '--porcelain'])
  if (s) {
    for (const line of String(s).split('\n')) {
      if (!line || line.length < 4) continue
      const p = line.slice(3).trim().replace(/^"|"$/g, '')
      const arrow = p.indexOf(' -> ')
      const path = arrow !== -1 ? p.slice(arrow + 4) : p
      addIfDeliverable(path)
    }
  }
  return [...files]
}

/** 递归取路径最新 mtime（目录取全体成员最大值——目录自身 mtime 只随成员增删动，不随成员内容写动）。
 * stat/readdir 失败与超帽一律返回 Infinity（=「新」，调用方保守保留——评审 P3 清偿：readdir
 * 抛错曾返回 stat 时刻的目录自身 mtime，窄角竞态下会把真被干活触及的目录误剔）。安全帽：walk
 * 预算 2000 条（巨型未跟踪树防遍历失控）。开放世界：时间戳是唯一裁判，不按路径形态设例外。
 * statFn 注入缝（resolveArchiveCommitPathspecs 的 existsFn 同款先例）：仅测试可达。 */
function newestMtime(p, budget = { left: 2000 }, statFn = statSync) {
  let st
  try { st = statFn(p) } catch { return Infinity }
  if (!st.isDirectory()) return st.mtimeMs
  let max = st.mtimeMs
  let entries
  try { entries = readdirSync(p, { withFileTypes: true }) } catch { return Infinity }
  for (const e of entries) {
    if (--budget.left < 0) return Infinity
    const m = newestMtime(join(p, e.name), budget, statFn)
    if (m > max) max = m
  }
  return max
}

/**
 * 重入路由面的未跟踪前置过滤（坑 resume-domain-flip，2026-10-06 轻量道实测）：resume 域路由
 * 复用 changedFilesSinceBaseline（fr-rot-precision ⑥ 口径——含未跟踪是对的：干活期创建未提交
 * 的交付文件必须路由），但 `git status --porcelain` 会把**先于变更存在**的他侧未跟踪遗留一并
 * 扫进来；重入早于干活时区间 diff 为空、本变更无工作树改动，路由面只剩这批垃圾 → 域被劫持成
 * 伪域、fresh 简报的 input 域与 FR 注入全丢。判据是时间不是路径形态：未跟踪（??）条目的最新
 * mtime 早于变更出生时刻 = 本变更存活期内从未写过 = 不属本变更的路由面，剔除。
 * 保守保留（行为同现状）：birthTs 空/非有限、stat 失败、walk 超帽。跟踪条目（区间 diff、M/D）
 * 不过此滤——提交与工作树修改是明确的变更事实。
 * @param {string} cwd 工作区根
 * @param {string[]} files changedFilesSinceBaseline 产出的路径面（含 `??` 原样目录条目）
 * @param {number|null} birthTs 变更出生时刻（epoch 毫秒；null=不过滤）
 * @param {{ statFn?: (p: string) => object }} [opts] 测试注入缝（statFn 缺省真 statSync）
 * @returns {string[]} 过滤后的路径面
 */
export function filterPreChangeUntracked(cwd, files, birthTs, opts = {}) {
  if (!Array.isArray(files) || files.length === 0) return Array.isArray(files) ? files : []
  if (typeof birthTs !== 'number' || !Number.isFinite(birthTs)) return files
  const s = gitQuiet(cwd, ['status', '--porcelain'])
  if (!s) return files
  const untracked = new Set()
  for (const line of String(s).split('\n')) {
    if (!line || line.length < 4) continue
    if (!line.startsWith('??')) continue
    const p = line.slice(3).trim().replace(/^"|"$/g, '')
    if (p) untracked.add(p.replace(/\\/g, '/'))
  }
  if (untracked.size === 0) return files
  const statFn = typeof opts.statFn === 'function' ? opts.statFn : statSync
  return files.filter((f) => {
    const norm = String(f).replace(/\\/g, '/')
    if (!untracked.has(norm)) return true // 非 ?? 条目（跟踪/区间 diff）不滤
    return !(newestMtime(join(cwd, norm), { left: 2000 }, statFn) < birthTs) // 最新 mtime 早于出生时刻 → 剔除
  })
}

/** 材料路径清单（稳定前缀——缓存最优；按在场性列出，不读内容）。 */
function materialPaths(specBase, changeName, changeDir) {
  const paths = [
    join(changeDir, FLOW_STATE_FILE),
    join(specBase, 'docs', 'sillyspec', 'scan', 'PROJECT.md'),
    join(specBase, 'docs', 'sillyspec', 'scan', 'CONVENTIONS.md'),
    join(specBase, 'docs', 'sillyspec', 'modules', '_module-map.yaml'),
    join(specBase, 'knowledge', 'INDEX.md'),
  ]
  return paths.filter((p) => { try { return existsSync(p) } catch { return false } })
}

/** --input 语料中的路径样 token 提取（fresh 起点的域路由依据——best-effort：无 design/diff 时
 * 唯一可判材料；提取失败=空数组，走空域诚实提示）。 */
function extractInputPaths(input) {
  const out = new Set()
  for (const m of String(input || '').matchAll(/[\w.@+-]+(?:\/[\w.@+-]+)+/g)) {
    const p = m[0].replace(/\/+$/, '')
    if (p.length > 1) out.add(p.replace(/\\/g, '/'))
  }
  return [...out]
}

/**
 * 域路由用 input 路径样 token：在场或图内过滤（坑 module-map-list-leak 实测次生——散文斜杠词
 * git/DB/JSON 被当路径参与路由，冒充真域 server-parser）。判据：token 相对 cwd 在文件系统在场
 * （existsSync），或被模块图声明的路径覆盖（matchedModuleIds——图内尚不存在的目标文件照常路由，
 * thin-fr-inject-parity ④ 契约：--input 提到将新建的 src/cli/login.js 须命中 cli 域）。
 * 两判据都不建前缀/扩展名白名单——文件系统与仓内模块图即开放世界裁判；散文斜杠词两者皆不
 * 成立即出局（走「起点无依据」诚实提示）。绿地草案（bsPaths）不过滤：绿地语料允许指向
 * 尚不存在目标，模块图从零起草恰需它们。
 * @param {string} cwd 工作区根
 * @param {string} specBase .sillyspec 根
 * @param {string} input --input 语料
 * @returns {string[]} 在场或图内的路径样 token
 */
export async function extractRoutingInputPaths(cwd, specBase, input) {
  let moduleIndex = null
  let matchedModuleIds = null
  try {
    const dd = await import('./decision-distill.js')
    const fi = await import('./fr-index.js')
    moduleIndex = dd.discoverModuleIndex(join(specBase, 'knowledge'))
    matchedModuleIds = fi.matchedModuleIds
  } catch { /* best-effort：图缺席则只按在场判 */ }
  return extractInputPaths(input).filter((p) => {
    try { if (existsSync(join(cwd, p))) return true } catch { /* 落到图内判 */ }
    try { return (matchedModuleIds(moduleIndex, p) || []).length > 0 } catch { return false }
  })
}

/**
 * 轻量道知识注入段（2026-09-25-thin-fr-inject-parity）：默认快道读取面对齐——
 * {FR_INDEX_DIGEST}/{DECISION_HITS}/execute 知识命中报告此前只在 run 族装配，轻量道 fresh
 * 不经 brainstorm，knowledge/fr 现行 FR、否决决策、已知坑对 agent 全不可见（实证：FR-runtime-020
 * 与实现相反长期无人撞见）。域路由与 distill 同口径（resolveTouchedDomains 的 filesOverride
 * 旁路）：fresh=--input 提取路径、resume=基线 diff、adopt=design 工件交付清单。
 * 纯读 fail-open；注入段独立成块（材料清单稳定前缀不被动态内容污染）；空态留一行可见。
 * @returns {{ lines: string[], summary: { domains: string[], frCount: number, rejectedDecisions: number, knowledgeEntries: number } }}
 */
export async function flowKnowledgeDigest({ specBase, change, changeDir, input, filesOverride }) {
  const summary = { domains: [], frCount: 0, rejectedDecisions: 0, knowledgeEntries: 0 }
  const lines = []
  try {
    const knowledgeRoot = join(specBase, 'knowledge')
    const { discoverModuleIndex } = await import('./decision-distill.js')
    const { resolveTouchedDomains, readActiveFrDigest, rankFrDigestForInjection, deliverableFilesFromDesignText } = await import('./fr-index.js')
    const moduleIndex = discoverModuleIndex(knowledgeRoot)
    let domains = []
    let basis = ''
    let touched = []
    if (Array.isArray(filesOverride) && filesOverride.length > 0) {
      domains = resolveTouchedDomains(changeDir, moduleIndex, filesOverride, knowledgeRoot).filter((d) => d !== 'unmapped')
      basis = filesOverride.length > 0 ? 'input/diff 路径' : ''
      touched = filesOverride
    } else if (existsSync(join(changeDir, 'design.md'))) {
      domains = resolveTouchedDomains(changeDir, moduleIndex, null, knowledgeRoot).filter((d) => d !== 'unmapped')
      basis = 'design.md 交付清单'
      try {
        touched = deliverableFilesFromDesignText(readFileSync(join(changeDir, 'design.md'), 'utf8'))
      } catch { /* design 不可读=无触碰面 */ }
    }
    const frs = domains.length > 0 ? readActiveFrDigest(knowledgeRoot, domains) : []
    // 注入排序（2026-10-03-fr-inject-relevance-rank）：TierA 覆盖命中（🎯）置前、TierB 日期新→旧
    // ——取代文件序前 8（域增长后注入面恒为最老 8 条，新立规格永不可见）。触碰面与域路由同源；
    // fail-soft：两面皆缺=纯 TierB（保持 readActiveFrDigest 文件序）。
    let tierAIds = new Set()
    let frRanked = frs
    if (frs.length > 0 && touched.length > 0) {
      ({ ranked: frRanked, tierAIds } = rankFrDigestForInjection({ archiveRoot: join(specBase, 'changes', 'archive'), frs, changed: touched }))
    }
    // 骨架门（2026-10-03-fr-skeleton-gate）：纯骨架条目不占注入席位（TierA 命中例外——它可能是
    // 该文件唯一行为痕迹）；指针行披露骨架数。查重/rot/绑定面不滤。
    const injectable = frRanked.filter((f) => !f.skeleton || tierAIds.has(f.id))
    const skeletonHidden = frs.filter((f) => f.skeleton && !tierAIds.has(f.id)).length
    summary.domains = domains
    summary.frCount = frs.length
    lines.push(`🧠 知识注入（轻量道读取面——现行 FR/否决决策/已知坑，动手前扫一眼）：`)
    if (domains.length === 0) {
      lines.push(`   触达域：起点无依据（--input 无路径语料、无 design 清单）——干活涉及 src 后 resume/收口会补查；`)
      lines.push(`   相关域现行 FR 可自行查 knowledge/fr/<域>.md（INDEX.md 有路由）。`)
    } else {
      lines.push(`   触达域（${basis}）：${domains.join('、')}`)
      if (frs.length === 0) {
        lines.push(`   现行 FR：（该域暂无 active FR 索引条目——本变更大概率是首批需求）`)
      } else {
        const renderedFr = injectable.slice(0, 8)
        for (const f of renderedFr) {
          lines.push(`   - ${f.id} ${f.title}${tierAIds.has(f.id) ? ' 🎯' : ''}${f.unconfirmed > 0 ? ` ⚪${f.unconfirmed}未确认绑定` : ''}`)
        }
        const hiddenCount = frs.length - renderedFr.length
        if (hiddenCount > 0) lines.push(`   （+${hiddenCount} 条见 knowledge/fr/ 对应域文件${skeletonHidden > 0 ? `；纯骨架 ${skeletonHidden} 条不注入` : ''}${tierAIds.size > 0 ? '；🎯=与本次触碰文件有覆盖交集' : ''}）`)
        // 抽查确认（2026-09-27-confirm-on-use 三层治理①层）：干活中本来就在消费这些条目——
        // 相符则收口前翻牌（机械防橡皮图章：--evidence 必须是可解析的真实测试路径），
        // 不符留给 knowledge digest 信号。至多点名 2 个（抽查式，防全勾仪式化）。
        const unconfirmed = injectable.filter((f) => f.unconfirmed > 0).slice(0, 2)
        if (unconfirmed.length > 0) {
          lines.push(`   🔍 抽查确认（至多 ${unconfirmed.length} 条，干活中顺带核）：${unconfirmed.map((f) => f.id).join('、')} —— 绑定与实态相符则收口前 \`sillyspec tests --confirm --anchor <id> --evidence <真实测试路径>\`（翻 active；--confirm 是 flag 非子命令——形态与 index.js 实现及其用法文案一致，2026-10-05-tests-confirm-hint 修正错形态静默空转）；不符则不动，留给 knowledge digest 信号`)
        }
      }
    }
    const { matchKnowledgeHybrid } = await import('./knowledge-vector.js')
    const { deathPathNote } = await import('./knowledge-match.js')
    // scope 遍历召回（2026-10-08-knowledge-graph，FR-04）：touched=机器算的图查询键
    // （filesOverride ∪ design 交付表——上方既有变量），词面三层零命中时沿强边保底防复潮
    const km = await matchKnowledgeHybrid(knowledgeRoot, `${change}\n${input || ''}`, { cwd: dirname(specBase), scopeFiles: touched })
    // 防复潮面 = 死路注记 ∪ 有主题重叠的 rejected（2026-09-28-knowledge-inject-ranking 起 rejected∪死路；
    // 2026-09-28-knowledge-gate-denoise 收紧：score 零的 rejected 与查询零主题重叠——空标题条目靠状态
    // 蹭进回显是行为实测三例的噪音源，不再注入）
    const rejected = (km.decisionHits || []).filter((h) => h.deathPath || (h.status === 'rejected' && h.score > 0))
    summary.rejectedDecisions = rejected.length
    summary.knowledgeEntries = km.matched ? (km.entries || []).length : 0
    if (rejected.length > 0) {
      lines.push(`   ⚠️ 否决决策/死路注记（历史已否决或已记死路，防复潮——除非复潮条件满足勿重提，复潮须在本变更 decisions.md 记新版本）：`)
      for (const h of rejected.slice(0, 5)) {
        const note = h.status === 'rejected' ? (h.reason || '（未记录）') : `死路——${deathPathNote(h.reason)}`
        lines.push(`   - ${h.id} ${h.title}（${h.file}）${h.status === 'rejected' ? '否决理由' : '⚰️'}：${note}`)
      }
    }
    if (km.matched && (km.entries || []).length > 0) {
      const src = km.entries.slice(0, 3).map((e) => (e.anchor ? `${e.file}#${e.anchor}` : e.file)).join('；')
      lines.push(`   📚 知识命中（INDEX 关键词，按需 Read）：${src}`)
    }
    if (domains.length === 0 && rejected.length === 0 && !km.matched) {
      lines.length = 0
      lines.push(`🧠 知识注入（轻量道读取面）：语料未命中知识库（无触达域依据、无否决命中、INDEX 无对齐条目）——可自行查 knowledge/INDEX.md。`)
    }
  } catch (e) {
    lines.length = 0
    lines.push(`🧠 知识注入（轻量道读取面）：注入失败（${(e && e.message) || e}）——可自行读 knowledge/INDEX.md 与 knowledge/fr/`)
  }
  return { lines, summary }
}

/**
 * flow done 收口的 FR 腐烂 suspect（2026-09-25-thin-fr-inject-parity 起，fr-rot-precision 收紧）：
 * quick-done 钩子迁轻量道 + 按文件面交集判相关度（域级全标→三分判据，评审实测基线 131 条 →
 * strong 83 / unknown 8 / skip 40）。对触达域每条 active FR：coverage = frCoverageFiles(来源变更)
 * ∪ bindings，与本次归属文件面单向匹配（changed 恒文件级：相等 || changed.startsWith(cov 补/）：
 * 交集非空 → strong（只进收口 advisory 与遥测——2026-09-29-rot-retire-inject-cap 起不再落盘
 * 待复核标记：371 条零消费实证，持久化已拆）；coverage 空 → unknown（遥测
 * 单列——宁漏勿滥）；非空无交集 → skip。
 * 遥测 count 语义=strong（防污染 knowledge-stats 的 rotSuspectByDomain 消费读数，评审 P1-1）。
 * advisory 零阻断，fail-open。
 * @returns={{ warn: string|null, warnInfo?: string|null, domains: string[], strong: number, unknown: number, skip: number }}
 */
export async function rotSuspectFlow({ specBase, change, changeDir, files }) {
  // 查询核迁 fr-index.activeFrCoverageHits 单源（2026-09-26-dynamic-test-inference）——
  // 同一「覆盖面∩触碰文件」查询双消费：本函数出收口 advisory 与遥测（信号面）；verify 门
  // collectFrLinkedTests 反用为需求关联回归测试面。判据语义逐字不变。
  const { activeFrCoverageHits } = await import('./fr-index.js')
  const q = activeFrCoverageHits({ specBase, change, changeDir, files })
  const { domains, hits: strong, unknownSources, unknownFrCount, skip } = q
  if (domains.length === 0) {
    return { warn: null, warnInfo: null, domains, strong: 0, unknown: 0, skip: 0 }
  }
  const { appendKnowledgeHit } = await import('./knowledge-hits.js')
  appendKnowledgeHit(join(specBase, '.runtime'), {
    type: 'fr-rot-suspect', change, domains,
    // unknown=覆盖面不可判定的 FR 条数（评审 P2-1 清偿：与旧版 frs.length-strong-skip 口径逐字等价，
    // 非来源变更数）；unknownSources 披露来源名单（FR 多条可共享一个来源变更）
    strong: strong.length, unknown: unknownFrCount, skip, count: strong.length, // count=strong：knowledge-stats 消费口径（评审 P1-1）
    unknownSources: [...unknownSources], source: 'flow-done',
    // frIds（2026-10-03-fr-governance-telemetry）：strong 命中条目 id 帽 20——L3 裁决从域级计数
    // 升为条目级有的放矢（stats 裁决候选视图的聚合键）。
    frIds: strong.slice(0, 20).map((h) => h.id),
  })
  const warn = strong.length > 0
    ? `⚠️ [FR 腐烂 suspect·advisory] 触达 ${domains.join('、')} 域的 ${strong.length} 条 active FR 与本次交付文件面有覆盖交集——若改动影响这些行为，请在 requirements 承接/supersede 对账（收口提示即止，不留账）`
    : null
  const warnInfo = unknownFrCount > 0
    ? `ℹ️ 另有 ${unknownFrCount} 条 active FR 无法判定覆盖面（来源变更无归档件且无测试绑定，不计入 suspect）：${unknownSources.slice(0, 5).join('、')}${unknownSources.length > 5 ? ' 等' : ''}`
    : null
  return { warn, warnInfo, domains, strong: strong.length, unknown: unknownFrCount, skip }
}

/**
 * flow done distill 前的 FR 重复嫌疑软门（2026-09-25-thin-fr-inject-parity）：brainstorm --done
 * 判据迁轻量道——新 FR（无承接）× 同域 active 条目标题 bigram 重叠 ≥0.6 → advisory warning +
 * fr-duplicate-warning 遥测。双出路：requirements 加承接行或改标题区分；不阻断。
 * @returns {{ warn: string|null, hits: Array<{ local: string, active: string, title: string }> }}
 */
export async function frDupGateFlow({ specBase, change, changeDir, files }) {
  const { parseChangeRequirements, resolveTouchedDomains, readActiveFrDigest, frTitleOverlap, FR_TITLE_OVERLAP_THRESHOLD } = await import('./fr-index.js')
  const req = parseChangeRequirements(changeDir)
  if (req.missing || req.frs.length === 0) return { warn: null, hits: [] }
  const knowledgeRoot = join(specBase, 'knowledge')
  const { discoverModuleIndex } = await import('./decision-distill.js')
  const moduleIndex = discoverModuleIndex(knowledgeRoot)
  const domains = resolveTouchedDomains(changeDir, moduleIndex, Array.isArray(files) ? files : []).filter((d) => d !== 'unmapped')
  if (domains.length === 0) return { warn: null, hits: [] }
  const active = readActiveFrDigest(knowledgeRoot, domains)
  const hits = []
  for (const fr of req.frs) {
    if ((fr.supersedes || []).length > 0 || !fr.title) continue
    // 取最高重叠对（fr-rot-precision：对齐 brainstorm 软门语义——多命中时指认最相近的，非首个过阈者）
    let hit = null
    for (const a of active) {
      const o = frTitleOverlap(fr.title, a.title)
      if (!hit || o > hit.o) hit = { a, o }
    }
    if (hit && hit.o >= FR_TITLE_OVERLAP_THRESHOLD) {
      const scen = (hit.a.scenarios || []).filter((s) => s && s !== '（无场景名）').join('；')
      hits.push({ local: fr.local, active: hit.a.id, title: hit.a.title, overlap: hit.o, scenarios: scen })
    }
  }
  if (hits.length === 0) return { warn: null, hits }
  const { appendKnowledgeHit } = await import('./knowledge-hits.js')
  appendKnowledgeHit(join(specBase, '.runtime'), { type: 'fr-duplicate-warning', change, hits: hits.length, source: 'flow-done' })
  const pairs = hits.map((h) => {
    const scen = h.scenarios ? `（场景：${h.scenarios}）` : ''
    return `${h.local}↔${h.active}「${h.title}」${scen}`
  }).join('、')
  const warn = `⚠️ [FR 重复嫌疑·advisory] ${hits.length} 条新 FR 与同域 active 条目标题高度重叠：${pairs}——双出路：requirements 加承接行（承接: FR-xxx，改写时对照上述场景）或改标题区分；本次放行不阻断`
  return { warn, hits }
}

/** 变更目录实际产物枚举（2026-09-25-flow-tick-prototype，adopt 路径必读面）：adopt 时头脑风暴
 * 产出的原型 HTML/决策清单等不在 materialPaths（那是稳定前缀 scan 面）——动态扫变更目录把实际
 * 在场产物列成必读清单，原型显式点名（agent 看不到就不会用）。 */
function changeArtifactPaths(changeDir) {
  const out = []
  try {
    for (const e of readdirSync(changeDir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name === 'prototypes') {
          for (const f of readdirSync(join(changeDir, 'prototypes'))) out.push(join(changeDir, 'prototypes', f))
        }
        continue
      }
      if (/\.(md|html)$/i.test(e.name) && e.name !== FLOW_STATE_FILE) out.push(join(changeDir, e.name))
    }
  } catch { /* 目录异常 = 空清单 */ }
  return out.filter((p) => { try { return existsSync(p) } catch { return false } })
}

/**
 * flow start —— 第 1 次协议调用（建卡+下发）。已存在 change → 恢复简报（不新建不重置）。
 * @param {{change:string, input?:string, thick?:boolean, withTasks?:boolean, cwd:string, specBase:string, json?:boolean}} p
 */
export async function cmdFlowStart({ change, input, title: titleFlag = null, thick = false, withTasks = false, reviewForce = null, autopilot = false, cwd, specBase, runtimeRootOpt = null, json = false }) {
  // local.yaml 缺席 fail-fast（R22 实证：缺 local.yaml 时 flow done 测试门静默兜底裸
  // python -m pytest → aiobotocore 假红/全量 860s 撞 600s 帽 → 11 轮重试 135min）。
  // local.yaml 是 init 的职责面——flow start 在此拒绝，不让 agent 在错误的测试配置上走完全程
  // 才在收口处发现。恢复/adopt 路径的变更目录已存在时跳过（在途变更不因配置后补而拦）。
  const _localYaml = join(specBase, 'local.yaml')
  if (!existsSync(_localYaml) && !existsSync(join(specBase, 'changes', change))) {
    console.error('❌ local.yaml 不存在——先跑 sillyspec init（mode/lint/known_failures 等 init 级配置的落点）。')
    console.error('   测试面无需在此配置（2026-09-26 起：测试门按变更动态推断——本变更测试 ∪ FR 关联回归 ∪ import 依赖，')
    console.error('   runner 自项目结构 pyproject/package.json 推断；modules.*.test/commands.test 已退役，后者仅显式 test_strategy: full 生效）。')
    process.exit(2)
  }
  const cfg = readFlowConfig(specBase)
  if (cfg.mode === 'legacy') {
    console.error('❌ 本仓显式配置 flow.mode=legacy——走既有流程：sillyspec run <stage> --change <名>')
    console.error('   切回轻量跑道（2026-09-25 起缺省即 thin）：local.yaml 删掉 mode: legacy 或改为 mode: thin')
    process.exit(2)
  }
  // PM 锚定 specBase（平台参数面修复：此前裸构锚 resolveSpecDir(cwd)——DB 行/change 目录落本地，
  // specBase 侧无目录 → writeFlowState ENOENT 崩溃、进度与工件分裂两处根）
  const { ProgressManager } = await import('./progress.js')
  const pm = new ProgressManager({ specDir: specBase })
  const changesDir = join(specBase, 'changes')
  const changeDir = join(changesDir, change)
  const runtimeRoot = resolveRuntimeRoot(runtimeRootOpt ? { runtimeRoot: runtimeRootOpt } : {}, specBase)

  let proceedFreshEmptyDir = false
  if (existsSync(changeDir)) {
    const st = readFlowState(changeDir)
    if (!st) {
      // adopt 收编（2026-09-25-thin-brainstorm-prestage）：头脑风暴预段产物（proposal/design 在场、
      // 无 flow-state）收编进轻量变更——brainstorm 是 run 族预段，先跑后到不触发混跑守卫；产物原样
      // 保留，机器只补缺件与绑定面。无产物 = 真 legacy 既有变更，维持原拒收。
      const hasBsArtifacts = existsSync(join(changeDir, 'proposal.md')) || existsSync(join(changeDir, 'design.md'))
      if (hasBsArtifacts) {
        const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
        const baseline = typeof head === 'string' && head.trim() ? head.trim() : null
        writeFlowState(changeDir, { tier: 'thin', born_face: 'thin', adopted_from: 'brainstorm', review_force: reviewForce, baseline_commit: baseline, substeps: {} })
        try {
          const { redraftMissingArtifacts, ensureBindingSlots } = await import('./flow-draft.js')
          const r = redraftMissingArtifacts({ changeDir, change, input: null, runtimeRoot })
          if (r.drafted.length > 0) console.log(`📌 收编补生成缺失机器稿：${r.drafted.join('、')}（brainstorm 未产的工件机器补齐，criteria 从 proposal 成功标准回提；已存在文件未动）`)
          const b = ensureBindingSlots({ changeDir })
          if (b.appended) console.log(`📌 收编追加测试绑定槽 ${b.slots} 枚（brainstorm requirements 无绑定面——干活时作答，flow done 校验）`)
        } catch (e) { console.warn(`⚠️ 收编补件失败（best-effort）: ${(e && e.message) || e}`) }
        // route-hindsight 首版快照（收编时点=redraftMissingArtifacts 首次落盘后）：adopt 的
        // design 是头脑风暴产物、机器只补缺件——快照取收编时点内容，此后 agent 改写计入指标。
        try {
          const { snapshotBaseline, baselineSha256 } = await import('./route-hindsight.js')
          snapshotBaseline({ specBase, change, changeDir })
          const _bsha = baselineSha256({ specBase, change })
          if (_bsha && !(readFlowState(changeDir) || {}).baseline_sha256) writeFlowState(changeDir, { baseline_sha256: _bsha }) // 锚定首写者胜——重入不刷新
        } catch { /* 快照 best-effort（缺失=指标零信号） */ }
        try {
          const { spawnWatcher } = await import('./watcher.js')
          const w = await spawnWatcher(cwd, change, { specBase })
          if (w.status === 'spawned') console.log(`🔄 [watcher] 观测旁路已拉起：事件流 .sillyspec/.runtime/watcher-events-${change}.jsonl（恒带 provisional:true）`)
        } catch { /* 观测旁路 best-effort */ }
        // adopt 标题（用户需求 2026-09-29）：头脑风暴 proposal 的 H1 是人写语义标题，
        // deriveTitleFromLinkedChange 提取；--title 优先；兜底变更名。adopt 路径此前完全不
        // 注册 changes 行——initChange 补插（幂等），既有行 title 空时回填。
        try {
          const { deriveTitleFromLinkedChange, deriveChangeTitle } = await import('./quicklog.js')
          const adoptTitle = titleFlag || deriveTitleFromLinkedChange(specBase, change) || deriveChangeTitle(input) || change
          pm.initChange(cwd, change, { title: adoptTitle })
          const _arow = pm._ensureDB(cwd).getDb().prepare('SELECT title FROM changes WHERE name = ?').get(change)
          if (_arow && !_arow.title) pm.updateChangeMeta(cwd, change, { title: adoptTitle })
          console.log(`🏷️ 变更标题：${adoptTitle}（收编自头脑风暴产物；重入 --title 可改）`)
        } catch { /* adopt 标题 best-effort */ }
        const materials = materialPaths(specBase, change, changeDir)
        const artifacts = changeArtifactPaths(changeDir)
        const prototypePaths = artifacts.filter((p) => /\.html$/i.test(p))
        // 知识注入（2026-09-25-thin-fr-inject-parity）：adopt 路径域路由走 design.md 交付清单
        let digestLines = []
        try { digestLines = (await flowKnowledgeDigest({ specBase, change, changeDir, input: null })).lines } catch { /* 注入 best-effort */ }
        console.log([
          `🧲 头脑风暴产物已收编进轻量跑道: ${change}（adopted_from=brainstorm，baseline=${baseline ? baseline.slice(0, 10) : '（无 git 历史）'}）`,
          `══════════════════════════════════════`,
          `📖 必读（头脑风暴产出——方案的承诺锚，先读完再动手）：`,
          ...artifacts.map((p) => `   - ${p}`),
          prototypePaths.length > 0
            ? `🖼️ 原型在场（${prototypePaths.length} 个 HTML）：实现前必看，界面/交互/流程按原型对齐；有出入以 design.md 承诺为准并在回复中说明。`
            : null,
          `【你要做的】① spec 阶段先定稿任务面：把 tasks.md 改写为工作分解（每行=可独立完成并当场验证的一步：做什么+怎么验证；全 \`- [ ]\`——代码开动前工作队列先存在）；`,
          `② 执行走任务循环：对 tasks.md 每个 pending 行——展示「Working on task N/M: <任务>」→ 做 → 测试绿后当场勾一格（\`- [ ]\`→\`- [x]\`：sillyspec task tick --change ${change} --task task-NN 或直接 Edit）→ 下一行；全勾后 flow done（收口硬门拒单拍多格勾选）。design/decisions 是本变更的承诺锚（flow done 豁免 design 四节槽，以其为准）。`,
          `requirements 测试绑定槽（收编追加）每条 FR 至少一行作答；写码前后顺手填。`,
          `✅ 任务面归你（工作分解契约）：tasks.md 是你的工作队列（机器种子可增删改，保持 \`- [ ] task-NN:\` 行形态）——CLI 以 checkbox 为进度状态机（task tick/flow status 实时读它），TodoWrite 类工具不替代；`,
          `   勾选是收口证据面（逐格核提交 token/review.json）：做一件 → 勾一格（task tick 即时回显进度与下一任务）→ 继续下一条，勿攒一把勾；`,
          `   flow status --change ${change} 为自愿查看/恢复面（非协议必需，D-007 中间零必需交互；恢复时给下一任务指针与进度）。`,
          `⚠️ 交付纪律：收口前交付代码显式 pathspec 提交——冻结件范围=baseline..HEAD，未提交不进审计件。`,
          ``,
          `【协议调用 2/2（干完后）】sillyspec flow done --change ${change}`,
          ``,
          `材料路径清单（按需 Read）：`,
          ...materials.map((p) => `  - ${p}`),
          ``,
          ...digestLines,
        ].filter(Boolean).join('\n'))
        try { await triggerSync(cwd, change) } catch { /* 同步绝不阻断协议面 */ }
        return { adopted: true, change, baseline }
      }
      // 平台 writer 预建空目录放行（平台参数面）：平台派发先建目录后 spawn——空目录=全新 thin
      // 起点而非 legacy 记账证据；非空且无头脑风暴产物才是真 legacy 拒收面
      let dirEmpty = false
      try { dirEmpty = readdirSync(changeDir).length === 0 } catch { dirEmpty = false }
      if (dirEmpty) {
        console.log('ℹ️ 预建空变更目录放行（平台 writer 形态）：按全新轻量跑道 start 处理')
        proceedFreshEmptyDir = true
      } else {
        console.error(`❌ change 目录已存在但无 ${FLOW_STATE_FILE}（legacy 记账的既有变更）——混跑回退：走 run <stage> 续跑，勿用 flow`)
        process.exit(2)
      }
    }
    if (!proceedFreshEmptyDir) {
    // 幂等补起草（2026-09-25-thin-dogfood-fixes 修复①）：draft 谱系是 start 时点快照，工具
    // 升级新增工件后重入补缺（已存在不碰、ledger 合并）——恢复简报前执行，简报读到补齐后的盘面。
    try {
      const { redraftMissingArtifacts } = await import('./flow-draft.js')
      const r = redraftMissingArtifacts({ changeDir, change, input, runtimeRoot })
      if (r.drafted.length > 0) {
        console.log(`📌 重入补生成缺失机器稿 ${r.drafted.length} 件：${r.drafted.join('、')}（工具升级晚于 start 的在途变更补件；已存在文件未动）`)
      }
    } catch (e) { console.warn(`⚠️ 补起草失败（不阻断恢复简报）: ${(e && e.message) || e}`) }
    // route-hindsight 首版快照（resume 补件后，首写者胜）：旧版本起步的在途变更此处首次取到
    // 快照（偏晚=少计早期改写，方向保守不误标）；恢复简报渲染零变化（快照静默落盘）。
    try {
      const { snapshotBaseline, baselineSha256 } = await import('./route-hindsight.js')
      snapshotBaseline({ specBase, change, changeDir })
      const _bsha2 = baselineSha256({ specBase, change })
      if (_bsha2 && !(readFlowState(changeDir) || {}).baseline_sha256) writeFlowState(changeDir, { baseline_sha256: _bsha2 }) // 锚定首写者胜——resume 重入不刷新（审查 P1：重锚洗白篡改）
    } catch { /* 快照 best-effort */ }
    // 声明通道 resume 生效（fr-governance-sweep 评审 P3 清偿）：--review/--no-review 对在途
    // 变更重入 start 时落盘 review_force——与新变更/adopt 两路口径一致（此前 resume 只打简报
    // 即 return，flag 静默失效）。幂等：未带 flag（null）不覆盖既有声明。
    if (reviewForce !== null) {
      writeFlowState(changeDir, { review_force: reviewForce })
      console.log(`⚖️ 已更新评审声明通道：review_force=${reviewForce}（resume 落盘）`)
    }
    // autopilot resume 声明（2026-10-04-thin-docs-v2）：重入带 --autopilot 补记豁免
    if (autopilot && !(readFlowState(changeDir) || {}).autopilot) {
      writeFlowState(changeDir, { autopilot: true })
      console.log(`🤖 已声明 autopilot：spec 断点人审豁免（用户显式声明留痕）`)
    }
    // 变更标题补写（用户需求 2026-09-29：title=中文概括 ≤50 字，建议 ~20 字）——存量在途
    // 变更 title 空/缺失时的回填通道：显式 --title 恒生效（重入改标题）；否则从 --input 首
    // 行推导、仅当库内 title 为空才写（不覆盖已有语义标题）。best-effort 不阻断恢复简报。
    try {
      const { deriveChangeTitle } = await import('./quicklog.js')
      const _row = pm._ensureDB(cwd).getDb().prepare('SELECT title FROM changes WHERE name = ?').get(change)
      const _cur = _row ? (_row.title || '') : ''
      const _derived = titleFlag || deriveChangeTitle(input)
      if (_derived && (titleFlag || !_cur)) {
        pm.updateChangeMeta(cwd, change, { title: _derived })
        console.log(`🏷️ 变更标题${titleFlag ? '已更新' : '已补写'}：${_derived}（面板显示用；建议 ~20 字中文概括，重入 --title 可改）`)
      }
    } catch { /* 标题补写 best-effort */ }
    // 知识注入（2026-09-25-thin-fr-inject-parity）：resume 路径域路由走基线以来文件面——
    // changedFilesSinceBaseline（fr-rot-precision 评审 P2：含未提交工作树/untracked、剔 .sillyspec，
    // 与收口口径同源；裸 git diff 双提交区间会漏干活期未提交文件）；best-effort 不阻断恢复简报。
    let resumeDigest = { lines: [], summary: null }
    try {
      // 重入注入回填（2026-10-05-flow-tail-polish）：input:null 会把注入降级为「语料未命中」，
      // 首次 start 给的抽查确认指引断点恢复后丢失——flow-state.input 优先，proposal 动机
      // 「任务原话转写：」剥前缀回退（存量 change 无 input 字段走此路；「（未提供 --input）」占位视为空）。
      let resumeInput = typeof st.input === 'string' && st.input.trim() ? st.input : null
      if (!resumeInput) {
        try {
          const pText = readFileSync(join(changeDir, 'proposal.md'), 'utf8')
          const m = /任务原话转写：([^\n]+)/.exec(pText)
          if (m && !m[1].includes('（未提供 --input）')) resumeInput = m[1].trim()
        } catch { /* proposal 回退 best-effort */ }
      }
      // 路由面 = 过滤后的基线以来文件面 ∪ input 路径语料路由面（resume-domain-flip 修复：
      // 未跟踪遗留先于变更存在 → 时间过滤剔除；并集保证重入知识面 ⊇ fresh——重入早于干活时
      // 文件面只剩他侧垃圾，input 面是唯一真实依据）。出生时刻读进度库 changes.created_at
      // （best-effort：无 DB/无行/解析失败不过滤，行为同现状）。
      let birthTs = null
      try {
        const row = pm._ensureDB(cwd).getDb().prepare('SELECT created_at FROM changes WHERE name = ?').get(change)
        if (row && row.created_at) {
          const t = Date.parse(row.created_at)
          if (Number.isFinite(t)) birthTs = t
        }
      } catch { /* 出生时刻 best-effort */ }
      const diffFace = changedFilesSinceBaseline(cwd, st.baseline_commit)
      const inputFace = resumeInput ? (await extractRoutingInputPaths(cwd, specBase, resumeInput)) : []
      resumeDigest = await flowKnowledgeDigest({
        specBase, change, changeDir, input: resumeInput,
        filesOverride: [...new Set([...filterPreChangeUntracked(cwd, diffFace, birthTs), ...inputFace])],
      })
    } catch { /* 注入 best-effort */ }
    // 恢复简报标题（2026-10-06-resume-title）：getChangeTitle 单源只读（与 flow status 同族），
    // best-effort——读取失败按无标题渲染（与现状输出一致）
    let resumeTitle = null
    try {
      resumeTitle = new ProgressManager({ specDir: specBase }).getChangeTitle(cwd, change)
    } catch { /* 标题 best-effort */ }
    printRecoveryBriefing({ cwd, specBase, change, changeDir, runtimeRoot, st, digestLines: resumeDigest.lines, title: resumeTitle })
    return { recovery: true }
    }
  }

  // 需求清晰度门（2026-09-25-thin-brainstorm-prestage）：轻量跑道假定输入已含决策——--input 缺失
  // 或成功标准提取 0 条时不建变更、exit 2 给两选一（头脑风暴预段 / 补成功标准重跑）。
  // 重入与 adopt 路径在上方分支早退，不受此门影响。CLI 只产信号，选择权归用户/agent。
  {
    const { extractSuccessCriteria } = await import('./flow-draft.js')
    if (!input || extractSuccessCriteria(input).length === 0) {
      console.error(`❓ 需求不够清晰（--input ${input ? '在场但「成功标准」条目提取 0 条' : '缺失'}）——轻量跑道假定输入已含决策，两选一：`)
      console.error(`   ① 头脑风暴预段（需求不明时推荐）：sillyspec run brainstorm --change ${change}`)
      console.error(`      人机交互探索需求、出 design/决策/原型；完成后回来 sillyspec flow start --change ${change}，产物自动收编续跑轻量变更`)
      console.error(`   ② 确认输入已含决策：sillyspec flow start --change ${change} --input "<完整需求>"（引号内换行合法，可照抄形态）：`)
      console.error('      <动机/背景在前>')
      console.error('')
      console.error('      成功标准：')
      console.error('      - <可验证标准，一行一条>')
      process.exit(2)
    }
  }

  // 升厚预判已删除（2026-09-25-thin-precheck-removal）：技术面关键词（数据库/迁移等）测错轴——
  // R16 实证碰迁移的变更轻量变更带评审最优收口，预判反诱发误升厚（臂 A 129M）与误报打断。选道只留
  // 形态信号：清晰度门管「需求说不清楚」（预段收编），升厚只留用户决策（--upgrade-thick 同意门）
  // 与运行时证据（实测失败升档/edit_ratio/评审——风险面在收口时点按承诺词/diff 原语/盲维判定）。

  // 变更标题（用户需求 2026-09-29：title=中文概括 ≤50 字、建议 ~20 字，agent 总结）：
  // --title 显式指定优先；否则 --input 首行推导（agent 在 input 首行写一句中文概括即为标题）；
  // 两者皆缺用变更名兜底（可辨识但不达意——横幅提示下次带 --title）。
  let changeTitle = null
  try {
    const { deriveChangeTitle } = await import('./quicklog.js')
    changeTitle = titleFlag || deriveChangeTitle(input) || change
  } catch { changeTitle = titleFlag || change }
  pm.initChange(cwd, change, { title: changeTitle })
  console.log(`🏷️ 变更标题：${changeTitle}${changeTitle === change ? '（变更名兜底——下次带 --title "<≤20 字中文概括>" 更达意）' : '（面板显示用；建议 ~20 字中文概括，重入 flow start --title 可改）'}`)
  try {
    const { resolveSessionIdentity } = await import('./progress.js')
    const { session } = resolveSessionIdentity({ flagSession: null, cwd })
    pm.claimChangeOwner(cwd, change, session)
  } catch { /* claim 失败不阻断启动（fail-open，同 runCommand 接线） */ }

  // watcher 拉起（D-001：change 启动即观测——flow start 走 index.js 分发不经 runCommand，
  // 需在此独立接线；语义同 command.js 侧：无条件 spawn+单飞锁合并+best-effort 不阻断，
  // 未连接平台也 spawn（本地 jsonl 是事件唯一真相源）；SILLYSPEC_WATCHER=0 逃生阀）。
  try {
    const { spawnWatcher } = await import('./watcher.js')
    const r = await spawnWatcher(cwd, change, { specBase })
    if (r.status === 'spawned') console.log(`🔄 [watcher] 观测旁路已拉起：事件流 .sillyspec/.runtime/watcher-events-${change}.jsonl（恒带 provisional:true）`)
  } catch { /* 观测旁路 best-effort，绝不阻断协议面 */ }

  const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
  const baseline = typeof head === 'string' && head.trim() ? head.trim() : null
  writeFlowState(changeDir, {
    tier: thick ? 'thick' : 'thin',
    // born_face=工件面出身（R7 切片四修正：失败升厚改 tier 只升仪式不回溯出身——轻量面出身归档
    // 恒走 skipPlanCheck，防「升厚后无 plan.md 归档死锁」；厚面出身（--thick 起步）才要 plan.md）
    born_face: thick ? 'thick' : 'thin',
    with_tasks: Boolean(withTasks),
    review_force: reviewForce,
    // input 原文留存（2026-10-05-flow-tail-polish）：重入 start 知识注入回填的优先源
    // （增量字段——读侧缺省容错，存量 change 走 proposal 转写回退）
    input: typeof input === 'string' ? input : null,
    // autopilot（2026-10-04-thin-docs-v2 FR-06）：用户显式声明跳过 spec 断点人审（--autopilot）；
    // 缺省 false——flow done 要求 flow approve 批准证据（spec 断点机器化，护栏#2：零 prompt 劝说）
    autopilot: Boolean(autopilot),
    baseline_commit: baseline,
    substeps: {},
  })

  // 全件机器起草（R7 切片三 / FR-07：工件回填轮=0——治理工件 CLI 写，agent 只裁例外）。
  // 任务卡分岔（用户裁定#3）：默认 thin+直写零任务卡；--thick/--with-tasks 才生成任务卡。
  let drafted = []
  try {
    const { draftAll } = await import('./flow-draft.js')
    const r = draftAll({ changeDir, change, input, withTasks: thick || withTasks, runtimeRoot })
    drafted = r.written
  } catch (e) {
    console.warn(`⚠️ 机器起草失败（轻量工件面降级为 flow done 默认验收；best-effort 不阻断）: ${(e && e.message) || e}`)
  }

  // route-hindsight 首版快照（FR-02 后门，2026-09-28-unclear-req-to-brainstorm）：机器稿起草
  // 时点锚定 design/tasks 首版副本（首写者胜幂等；R-04——取晚会让改写比恒 0 闭环失效）。
  // 快照缺失=指标零信号（不误标），best-effort 不阻断 start。
  try {
    const { snapshotBaseline, baselineSha256 } = await import('./route-hindsight.js')
    snapshotBaseline({ specBase, change, changeDir })
    const _bsha3 = baselineSha256({ specBase, change })
    if (_bsha3) writeFlowState(changeDir, { baseline_sha256: _bsha3 })
  } catch { /* 快照 best-effort */ }

  // route-hindsight 历史提示（FR-02 前门同屏注入）：上个轻量变更被标记「疑似该走预段未走」
  // 时点名（渲染在下方自检段上方）。无标记文件 → null 零注入（未升级/新装仓输出与现状一致）。
  let hindsightHint = null
  try {
    const { readHindsightHint } = await import('./route-hindsight.js')
    hindsightHint = readHindsightHint({ specBase })
  } catch { /* 提示读取 best-effort 不阻断 start */ }

  const materials = materialPaths(specBase, change, changeDir)
  // 绿地 bootstrap（greenfield-bootstrap，R17 实证：无模块图仓 FR 全落伪域/unmapped，知识复利
  // 从第一条断流）：模块图缺席且 --input 有路径语料 → 机器起草初始 _module-map.yaml 草案（按
  // 目录段聚合 modules.<id>.paths；generator=flow-bootstrap-draft + status=draft 标识；不含
  // blast 段——判级对缺席有安全降级；不覆盖已有文件）。草案身份醒目提示，指路 scan 校准。
  try {
    const { discoverModuleIndex } = await import('./decision-distill.js')
    const knowledgeRoot = join(specBase, 'knowledge')
    if (discoverModuleIndex(knowledgeRoot) === null) {
      const bsPaths = extractInputPaths(input)
      if (bsPaths.length > 0) {
        const { draftModuleMap } = await import('./greenfield-bootstrap.js')
        const r = draftModuleMap({ cwd, specBase, paths: bsPaths })
        if (r.written) {
          console.log(`🗺️ [绿地草案] 模块图缺席——已起草初始 _module-map.yaml（${r.modules} 个模块：${r.moduleIds.join('、')}）→ ${r.path}`)
          console.log(`   草案身份（status: draft）：建议跑 sillyspec run scan 或 modules 校准后转正——不校准也可用，域路由按草案分流（不再全落 unmapped）`)
        }
      }
    }
  } catch (e) { console.warn(`⚠️ 绿地模块图草案起草失败（best-effort 不阻断 start）：${(e && e.message) || e}`) }
  // 知识注入（2026-09-25-thin-fr-inject-parity）：fresh 起点域路由用 --input 提取的路径样
  // token（best-effort）——brainstorm 的 {FR_INDEX_DIGEST}/{DECISION_HITS} 注入面对齐到轻量道。
  // 在场过滤（坑 module-map-list-leak）：散文斜杠词（git/DB/JSON）不参与路由。
  let digest = { lines: [], summary: { domains: [], frCount: 0, rejectedDecisions: 0, knowledgeEntries: 0 } }
  try {
    digest = await flowKnowledgeDigest({ specBase, change, changeDir, input, filesOverride: await extractRoutingInputPaths(cwd, specBase, input) })
  } catch { /* 注入 best-effort 不阻断 start */ }
  const lines = [
    `🏃 flow start（${thick ? 'thick 厚档（--thick 显式声明，人声明不做启发式）' : 'thin 轻量跑道'}）: ${change}`,
    `══════════════════════════════════════`,
    ...(hindsightHint ? [hindsightHint, ''] : []),
    `🔎 选道自检——对本需求，你还有没有必须问用户才能动手的问题？`,
    `   有 → sillyspec run brainstorm --change ${change}（它就是结构化问询协议，产物随后 flow start 自动收编续跑）；`,
    `   无 → 继续轻量跑道。纯提示不阻断——不设声明 flag、不拦流程（选错了还有事后闭环指标兜底）。`,
    ``,
    `【协议调用 1/2（本次）】change 已建 + 基线锚定（baseline_commit=${baseline ? baseline.slice(0, 10) : '（无 git 历史）'}）${withTasks ? ' + 任务卡模式（--with-tasks：中间自愿用 task done，收尾仍 flow done）' : ''}`,
    ``,
    `【你要做的】直接干活：改代码、写测试。治理工件不用你写——flow done 机器做（协议记账单位=change 级）。`,
    `书写面（纯 markdown 起草）：requirements FR 正文/design 四节作答/测试绑定行都直接写正文——`,
    `   文档内零指纹标记、零槽注释、零书写指导（规则以本横幅与命令卡为唯一源）；`,
    `   标题锚（FR 标题、四问文本）勿改写，收口做文档↔锚对比（锚失踪/空答拒收，成功标准漂移出 advisory）。`,
    `⚠️ design.md 四节（做法/接口契约/边界并发四问/风险）动码前后顺手作答——答案写在问题下方，`,
    `   每节至少一行，写「不适用：<理由>」也算答；flow done 空节拒收（承诺锚点，评审与 FR 对账都对着它）；`,
    `   列改动文件用独立「## 文件变更清单」节+表格（| 操作 | 路径 | 说明 |）——勿写在「接口契约」节内（收口按节名解析声明面）。`,
    `📜 requirements 每条 FR = 标题锚 + 一句带强度词的行为规定（必须/禁止/SHOULD/可以）+ 按需场景块`,
    `   （#### 场景：名 + Given/When/Then）；测试绑定节每条 FR 一行 \`FR-NN: test/路径「用例」\`。`,
    `📦 冻结面在 flow done 时点采集（baseline..HEAD 提交面）：未提交交付文件——会话专属 worktree 自动并入；`,
    `   共享主仓可带 --freeze-dirty 显式声明并入；git 中间提交归档后可 reset --soft 压扁为单提交`,
    `   （审计真相在 change.patch 冻结件 sha256 锚定，不依赖 git 历史形态）。`,
    `⚖️ 独立评审定档（flow done 按危险证据判，不看文件数）：高危承诺词/盲维实质作答/diff 危险`,
    `   原语/决策密度任一命中即需评审（届时会收到评审任务书，起子代理产出 review.json）；豁免`,
    `   也有 1/4 抽查采样。要强制/豁免可重启时带 --review / --no-review${reviewForce === true ? '（本变更已声明 --review）' : reviewForce === false ? '（本变更已声明 --no-review）' : ''}。`,
    `⚠️ 交付纪律：收口前先把交付代码用显式 pathspec 提交（git add -- <文件> && git commit）——`,
    `   patch 冻结件范围=baseline..HEAD 提交面，未提交的代码不进审计件（R16 评审 P2 实证）；`,
    `   tasks.md 一并显式 pathspec 提交（勾选证据进 git 历史，勿 untracked 直至归档——R19 实证）。`,
    `✅ 任务面归你（工作分解契约，2026-10-07-thin-tasks-v3）：tasks.md 是你的工作队列——机器种子按真实实现路径改写`,
    `   （每行=可独立完成并当场验证的一步：做什么+怎么验证；增删改随意，保持 \`- [ ] task-NN:\` 行形态）；`,
    `   执行循环：对每个未勾行 Working on task N/M → 做一件 → 测试绿后当场勾这一格 → 下一行——CLI 以 checkbox 为进度状态机`,
    `   （sillyspec task tick --change ${change} --task task-NN 即时回显进度 N/M 与下一任务指针，flow status 同源；或直接 Edit 翻格 \`- [ ]\`→\`- [x]\`），watcher 实时上平台。`,
    `   ⚠️ harness 的 TodoWrite 类工具是会话内便利面，不替代 tasks.md——平台进度/收口证据只读它（0/12 事故实证：todo 全 completed 而 tasks.md 0 勾）；`,
    `   勾选是收口证据面：每格勾选要有对应提交（消息带 task-NN）或 review.json，全勾但零证据会被拒收；勿攒一把勾（收口硬门拒单拍多格）；`,
    `   flow status --change ${change} 为自愿查看/恢复面（恢复时给下一任务指针与进度）。`,
    ``,
    `🛑 三断点纪律（可控性要求——用户没说「全跑完」就必须在每个断点向用户汇报并等确认）：`,
    `   ① spec 断点【机器门】：填完 FR 区和 design 四节后，把摘要给用户看（FR 条目+盲维作答+方案概述），`,
    `      用户确认后请其运行 sillyspec flow approve --change ${change}（批准留痕）再动手写代码——`,
    `      方案错了返工最贵；未批准且未声明 --autopilot 时 flow done 拒收（2026-10-04-thin-docs-v2）。`,
    `   ② 执行断点：写完代码跑完测试后，把测试结果（过了几个/挂了什么）给用户看，`,
    `      等用户确认再跑收口。`,
    `   ③ 归档断点：flow done 跑完后（无论过/拒），把结果（归档成功/被什么拦了）给用户看。`,
    `   用户明确说「直接跑完/不用问我」→ 重跑 flow start --change ${change} --autopilot 声明豁免（留痕），`,
    `   ②③断点 agent 自主跳过。`,
    `   随时可查进度：sillyspec flow status --change ${change}`,
    ...(detectUiTouch(input)
      ? [...buildUiGuidanceLines(), '']
      : []),
    ``,
    `【协议调用 2/2（干完后）】sillyspec flow done --change ${change}`,
    `  测试对账：P2 账本优先，无记录 CLI 亲测（fail-closed：实测失败/超时=整单 FAIL exit≠0；中断重入断点续）。`,
    ``,
    `材料路径清单（稳定前缀，按需 Read）：`,
    ...materials.map((p) => `  - ${p}`),
    ``,
    ...digest.lines,
  ]
  if (json) {
    console.log(JSON.stringify({ change, tier: thick ? 'thick' : 'thin', baseline, materials, knowledgeDigest: digest.summary }))
  } else {
    console.log(lines.join('\n'))
  }
  // 平台同步（2026-09-22-thin-fr-distill-sync：flow 走 index.js 分发不经 runCommand，此前后台
  // spec-sync 从不触发——轻量变更 docs/knowledge 不推平台。对齐 run 族语义：尾部 best-effort 后台推）
  try { await triggerSync(cwd, change) } catch { /* 同步绝不阻断协议面 */ }
  return { change, baseline, materials }
}

/** 恢复简报：盘面状态（checkbox/提交/账本/dirty files）→ 做到哪、剩什么、下一步。
 * title（2026-10-06-resume-title）：进度库登记的变更标题（string|null）——仅非空时在头两行后渲染。 */
function printRecoveryBriefing({ cwd, specBase, change, changeDir, runtimeRoot, st, digestLines = [], title = null }) {
  const done = []
  const left = []
  for (const k of SUBSTEPS) (st.substeps?.[k] === 'done' ? done : left).push(k)
  let checked = 0, total = 0
  try {
    const t = readFileSync(join(changeDir, 'tasks.md'), 'utf8')
    checked = (t.match(/^- \[x\]/gm) || []).length
    total = (t.match(/^- \[( |x)\]/gm) || []).length
  } catch { /* 无 tasks.md = 零任务卡（thin 默认） */ }
  const commits = st.baseline_commit
    ? (gitQuiet(cwd, ['rev-list', '--count', `${st.baseline_commit}..HEAD`]) || '0').toString().trim()
    : '?'
  const dirty = changedFilesSinceBaseline(cwd, st.baseline_commit).length
  const hasLedger = existsSync(join(runtimeRoot, `verify-quality-scan-${change}.json`))
  console.log([
    `🔁 flow start 恢复简报（重入）: ${change}（tier=${st.tier}${st.legacy_fallback ? '，legacy_fallback=true 混跑回退中' : ''}）`,
    `══════════════════════════════════════════════════════`,
    ...(title ? [`- 标题：${title}`] : []),
    `- 做到哪：任务勾选 ${checked}/${total}；基线以来提交 ${commits} 个；变更/dirty 文件 ${dirty} 个；P2 质量扫描记录 ${hasLedger ? '在场' : '无'}。`,
    `- 六子步标记：${done.length ? `已完成 ${done.join('/')}` : '（无）'}${left.length ? `；待办 ${left.join('/')}` : '；全部完成'}`,
    `- 剩什么：${left.length === 0 && dirty === 0 ? '活已干完' : dirty > 0 ? '活未干完（继续改代码）' : '收尾待裁决'}`,
    `- 下一步：${left.length === 0 ? `sillyspec flow done --change ${change}` : `继续干活；干完跑 flow done（断点续）`}`,
    ...(digestLines.length > 0 ? ['', ...digestLines] : []),
  ].join('\n'))
}

/**
 * flow done —— 第 2 次协议调用（唯一裁决点，六子步幂等）。
 * 子步：artifacts（工件校验）→ ledger（账本对账+亲测）→ probes（探针）→ distill（决策提炼）
 * → archive（归档经 runArchiveChain，thin 轻量工件面跳过 plan.md 硬校验）→ events（事件收口）。
 */
/**
 * 中断简报「待办」计算（2026-10-06-archive-cmd-race-and-brief：陈旧读修复）。
 * 旧口径只看运行头快照 st.substeps——mark() 只写盘不回填内存快照，首轮运行时本轮刚
 * 完成/跳过的子步全被误列进待办（实测 flow-status-json 首轮：已完成 artifacts、ledger、
 * patch，待办仍列全部 8 子步）。正确口径 = 全部子步 − 盘上历史 done（快照）− 本轮
 * doneList（含 (skip) 后缀）− 中断子步；重入时历史 done 已含上轮标记，两口径收敛同值。
 * 纯函数，单测直接钉口径。
 */
export function remainingSubstepsAtFail({ snapshotSubsteps = {}, doneList = [], failed } = {}) {
  const doneNow = new Set((doneList || []).map((d) => String(d).replace(/\(skip\)$/, '')))
  return SUBSTEPS.filter((k) => k !== failed && snapshotSubsteps?.[k] !== 'done' && !doneNow.has(k))
}

export async function cmdFlowDone({ change, cwd, specBase, runtimeRootOpt = null, confirmArchive = true, freezeDirty = false, acceptDirtyGap = false, allowBatchTick = false }) {
  const changeDir = join(specBase, 'changes', change)
  const st = readFlowState(changeDir)
  if (!st) {
    console.error(`❌ ${change} 无 ${FLOW_STATE_FILE}（未参与 thin 协议）——走 run <stage> 既有流程`)
    process.exit(2)
  }
  if (st.legacy_fallback) {
    console.error('❌ 本 change 已混跑回退 legacy（跑过 run <stage>）——剩余流程按厚档走 run <stage>，flow done 不再裁决')
    process.exit(2)
  }
  const runtimeRoot = resolveRuntimeRoot(runtimeRootOpt ? { runtimeRoot: runtimeRootOpt } : {}, specBase)
  // 归属收窄清单（2026-09-25-thin-dogfood-fixes 修复②）：baseline..HEAD 不分作者——并行会话在
  // start..done 之间的提交会混入本变更实测面与 FR 域路由。复用 verify 对账同款切分器：他侧显式
  // 声明（quick --files / design 清单）的文件剔除归他者；未声明文件保留（fail-closed 不因并行漏跑）。
  // ledger 门与 distill 的 deliverableFiles 单源走这里（此前 distill 直取 git diff 未切分）。
  const attributedChangedFiles = async () => {
    let files = changedFilesSinceBaseline(cwd, st.baseline_commit)
    try {
      const { splitOwnVsForeignDiffFiles } = await import('./foreign-declared.js')
      const { own, foreign } = splitOwnVsForeignDiffFiles(cwd, change, files, { specBase })
      if (foreign.length > 0) {
        console.log(`🔗 归属收窄：剔除 ${foreign.length} 个他侧声明文件（${foreign.slice(0, 5).map((x) => x.file).join(', ')}${foreign.length > 5 ? ' 等' : ''}）——不进本变更实测面与 FR 域路由`)
        return own
      }
    } catch { /* 切分失败 fail-closed 保留全量 */ }
    return files
  }
  let markDir = changeDir
  const mark = (k) => { writeFlowState(markDir, { substeps: { [k]: 'done' } }); doneList.push(k) }
  const doneList = []
  const skip = (k) => { doneList.push(`${k}(skip)`) }
  let reviewOutcome = null
  let gateSummaryText = null
  // 遥测单点（2026-09-25-thin-parity-assets 修评审 P2①：失败路径 exit 前也要落账——校准信号
  // 不许在失败面丢失；成功收口走函数末尾同款记录，失败面只多不少）
  const appendTelemetry = (review) => {
    try {
      appendFileSync(join(runtimeRoot, 'flow-telemetry.jsonl'), JSON.stringify({
        ts: new Date().toISOString(), change, protocolCalls: 2,
        draftAmendments: st.edit_ratio != null ? 1 : 0, editRatio: st.edit_ratio ?? null,
        routeHint: st.route_hint ?? null, tier: st.tier, upgraded: st.upgrade_reason ?? null,
        review,
      }) + '\n', 'utf8')
    } catch { /* 遥测 best-effort */ }
  }
  const reportMidFail = (failed) => {
    console.error(`❌ flow done 中断于子步「${failed}」。已完成：${doneList.length ? doneList.join('、') : '（无）'}；待办：${remainingSubstepsAtFail({ snapshotSubsteps: st.substeps, doneList, failed }).join('、') || '（无）'}`)
    console.error('   重入：修复后重跑同一条命令——已完成子步幂等跳过，从断点续（半态可重入不可假绿：归档子步未完成前 change 仍 active）')
  }

  // ① artifacts：工件校验（双轨：v2 纯 markdown=文档↔锚对比+spec 断点机器门；v1 指纹=三态拒收）
  //    + 设计记录空槽拒收（v1；v2 的四节空答在 verifyThinDocsV2 内）。纯文档检查前置于实测门，
  //    秒级失败秒级返工。
  if (st.substeps?.artifacts === 'done') { skip('artifacts') } else {
    const { verifyFlowDrafts, verifyDesignRecordFilled } = await import('./flow-draft.js')
    // 头脑风暴预段设计豁免判定前置（v2 以 skipDesign 透传；v1 分支保留原日志）
    const adoptedDesign = st.adopted_from === 'brainstorm' && existsSync(join(changeDir, 'design.md'))
    const r = verifyFlowDrafts({ changeDir, change, runtimeRoot, skipDesign: adoptedDesign })
    if (r.applicable && r.schema === 2) {
      // v2 纯 markdown 轨（2026-10-04-thin-docs-v2）：violations 拒收 → 漂移 advisory → spec 断点机器门
      if (r.violations.length > 0) {
        console.error(`❌ 工件校验拒收（v2 文档↔锚对比）：`)
        for (const v of r.violations) console.error(`   - ${v}`)
        reportMidFail('artifacts')
        process.exit(1)
      }
      for (const a of r.advisories) console.warn(`⚠️ [门柱漂移 advisory] ${a}`)
      if (adoptedDesign) console.log('ℹ️ 头脑风暴预段设计在场——豁免 design 四节槽门（adopted_from=brainstorm，设计承诺以 brainstorm design 为准）')
      // spec 断点机器门（FR-06/FR-07，护栏#2 零 prompt 劝说——advisory 断点在 0/12 勾选类事故
      // 实证下无牙；v2 起批准是收口硬前提，autopilot 是用户显式豁免通道）
      if (!st.autopilot && !st.spec_approved) {
        console.error(`❌ spec 断点未批准：本变更（v2 起草）收口需要方案确认留痕`)
        console.error(`   修复：把 FR 条目+design 四节摘要给用户看，用户确认后由用户运行：`)
        console.error(`     sillyspec flow approve --change ${change}`)
        console.error(`   或用户显式豁免（自主跑到底）：重跑 flow start --change ${change} --autopilot（声明留痕）`)
        reportMidFail('artifacts')
        process.exit(1)
      }
    } else {
      if (r.applicable && r.violations.length > 0) {
        console.error(`❌ 工件校验拒收（机器稿指纹三态）：`)
        for (const v of r.violations) console.error(`   - ${v}`)
        reportMidFail('artifacts')
        process.exit(1)
      }
      if (adoptedDesign) {
        console.log('ℹ️ 头脑风暴预段设计在场——豁免 design 四节槽门（adopted_from=brainstorm，设计承诺以 brainstorm design 为准）')
      } else {
        const dr = verifyDesignRecordFilled({ changeDir })
        if (dr.applicable && dr.emptySlots.length > 0) {
          console.error(`❌ 设计记录未作答：design.md 有 ${dr.emptySlots.length} 个空 AGENT 槽（${dr.emptySlots.join('、')}）`)
          console.error(`   每节至少写一行（小改动可写「不适用：<理由>」）——设计承诺是评审与 FR 对账的锚点，空槽=承诺未落盘`)
          console.error(`   恢复指引：槽标记（<!--AGENT:槽N）被删时，从 .runtime/step-guides/ 的指纹缓存可找骨架原文；或删 design.md 后重入 flow start 补生成（criteria 从 proposal 回提）`)
          reportMidFail('artifacts')
          process.exit(1)
        }
      }
    }
    mark('artifacts')
  }

  // ② ledger：P2 账本对账+亲测（runQuickTestLintGate 同源：账本优先→真跑→recordTestLedger 落账）
  if (st.substeps?.ledger === 'done') {
    skip('ledger')
    // 实测面回填（2026-09-25-thin-r16-patches 修复③：断点续跑收口的回执不失忆——review 回填同族）
    if (!gateSummaryText) {
      try {
        const { backfillGateSummary } = await import('./flow-parity.js')
        gateSummaryText = backfillGateSummary(runtimeRoot, change)
      } catch { /* 回填 best-effort */ }
    }
  } else {
    const { runQuickTestLintGate } = await import('./run/quick-audit.js')
    const changedFiles = await attributedChangedFiles()
    // 哨兵断言（2026-09-25-sentinel-wiring）：tasks.md 全勾但零完成证据（区间提交消息标题与正文
    // 均无 task-NN token 且无对应 review.json）→ 拒收——L0 硬门接线，两道收口同一哨兵（quick 侧同判）。
    let _sentinelNonMirrorTasks = null // 镜像豁免面外的任务数（null=哨兵未跑；0=纯镜像任务面——节奏 advisory 静默）
    let _autopilotTicked = 0 // 机器代勾格数（>0 时勾选节奏门降 advisory——代勾是单拍多格机械写，非 agent 纪律面）
    // 证据面=整条提交消息（2026-09-25-thin-done-gate-calibration 坑2：%s 只取标题行，正文里的
    // token 被判零证据，与文案「提交带 task-NN」口径漂移）——%B%x1e 按提交切记录，advisory 的
    // 提交计数不因多行正文失真。
    try {
      // 自动勾选（governance-autopilot）：哨兵检查前，解析区间提交的 task-NN token，
      // 自动勾选 tasks.md 中尚未勾选但有证据的条目——agent 零手工编辑 tasks.md。
      const _tasksMdPath = join(changeDir, 'tasks.md')
      if (existsSync(_tasksMdPath)) {
        const _tickLog = gitQuiet(cwd, ['log', '--format=%B%x1e', `${st.baseline_commit}..HEAD`])
        if (_tickLog) {
          const _commitTexts = String(_tickLog).split('\x1e').map(x => x.trim()).filter(Boolean).join('\n')
          const _evidencedTasks = new Set()
          // 连写组展开（坑 flow-done-sentinel-token-split）：task-01/02/03 的 02/03 缩写不带
          // task- 前缀、裸正则提取不到——与哨兵判定同口径先展开再提。
          const { expandTaskShorthand } = await import('./sentinel-assertions.js')
          for (const m of expandTaskShorthand([_commitTexts])[0].matchAll(/task-(\d{1,2})/gi)) _evidencedTasks.add(String(Number(m[1])).padStart(2, '0'))
          if (_evidencedTasks.size > 0) {
            let _tasksMd = readFileSync(_tasksMdPath, 'utf8')
            let _autoTicked = 0
            for (const nn of _evidencedTasks) {
              const re = new RegExp(`^- \\[ \\](.*task-${nn}:)`, 'm')
              if (re.test(_tasksMd)) {
                _tasksMd = _tasksMd.replace(re, `- [x]$1`)
                _autoTicked++
              }
            }
            if (_autoTicked > 0) {
              const { writeAtomicSync } = await import('./fs-atomic.js')
              writeAtomicSync(_tasksMdPath, _tasksMd)
              _autopilotTicked = _autoTicked
              // 代勾事实持久化（二轮评审 P2-B）：重入时 tasks 已被代勾、本拍 _autoTicked=0，
              // 但首拍代勾写下的单拍跳事件仍在流里——不持久化会把重入误判成 agent 一把勾拒收
              try { writeFlowState(changeDir, { autopilot_ticked: _autoTicked }) } catch { /* 留痕 best-effort */ }
              console.log(`✅ [自动勾选] ${_autoTicked} 个任务有提交证据但未勾——已机器代勾（governance-autopilot）`)
            }
          }
        }
      }
      const { detectFakeCheckCompletion } = await import('./sentinel-assertions.js')
      const tasksPath = join(changeDir, 'tasks.md')
      if (existsSync(tasksPath)) {
        const _logRaw = gitQuiet(cwd, ['log', '--format=%B%x1e', `${st.baseline_commit}..HEAD`])
        if (_logRaw === null || _logRaw === undefined) {
          console.log('ℹ️ 哨兵：git log 不可用，跳过（fail-open——空提交组照判会假拦）')
        } else { // 空串=区间零提交（哨兵照跑：零提交不豁免——角度 A 空转收口实证）
        const commitMessages = String(_logRaw).split('\x1e').map((x) => x.trim()).filter(Boolean)
        // 证据判据统一（2026-10-07-thin-tasks-v3，镜像豁免/收口代勾退役）：tasks.md 是 agent
        // 工作分解队列，每格勾选一律按 per-task 证据判（提交 token / review.json）——不再读
        // 机器稿基线做镜像豁免（route-hindsight 基线快照仍供改写比指标，与哨兵解耦）。
        const sent = detectFakeCheckCompletion({ changeDir, tasksMd: readFileSync(tasksPath, 'utf8'), commits: commitMessages })
        if (sent.status === 'fake') {
          console.error(`🚫 哨兵断言拒收：tasks.md 全勾（${sent.checked}/${sent.claimTotal}）但 ${sent.missing.length} 个任务零完成证据（区间提交标题与正文均无 token、无 review.json）：${sent.missing.join('、')}`)
          console.error('   补证据（提交标题或正文带 task-NN，或产 review.json）或取消勾选后重跑——假完成主张不许过门')
          appendTelemetry({ sentinel: 'fake', missing: sent.missing.length })
          reportMidFail('ledger')
          process.exit(1)
        }
        _sentinelNonMirrorTasks = sent.claimTotal
        if (sent.status === 'complete') {
          console.log(`🛡️ 哨兵：全勾 ${sent.checked}/${sent.claimTotal} 证据齐（提交 token/review.json）`)
          // 勾选时点判定（2026-09-26-tick-loop-nudge，R19 行为发现）：tasks.md 的 git 首次提交
          // == 收口窗口最后提交（一把勾模式）→ 放行但打行为提醒（不阻断——token 证据已验，
          // 这是提醒边干边勾纪律，非假勾）。tasks.md 全程 untracked（未随交付提交）时同款提醒。
          // 首提锚定（2026-10-07-tick-timing-first-commit）：--reverse 全 history 首行=首次提交——
          // 旧实现 -n 1 取最近一次提交，每任务随交付提交 tasks.md 的渐进形态（首提早于 HEAD）
          // 被误报一把勾（完整实测实证：历史 0→1→2 渐进勾选仍出警告）。
          try {
            const _firstRaw = gitQuiet(cwd, ['log', '--reverse', '--format=%h', '--', tasksPath])
            const tasksIn = _firstRaw ? (String(_firstRaw).split(/\r?\n/).map((x) => x.trim()).filter(Boolean)[0] || null) : null
            const lastIn = gitQuiet(cwd, ['log', '--format=%h', '-n', '1'])
            if (!tasksIn) {
              console.warn(`⚠️ 勾选时点：tasks.md 未随交付提交（untracked 直至归档）——勾选证据链靠归档兜底，git 历史不可回溯；下次收口前 tasks.md 一并显式 pathspec 提交`)
            } else if (String(tasksIn).trim() === String(lastIn).trim()) {
              console.warn(`⚠️ 勾选时点：tasks.md 的首次 git 提交 == 收口最后提交（一把勾模式）——token 证据齐放行，但边干边勾是进度锚（OS Guardrails 同款纪律），下次完成单元即勾`)
            }
          } catch { /* 时点判定 fail-soft */ }
        }
        // 全勾硬门（2026-10-07-allticked-gate-docs-resync，openspec all_done 对齐）：tasks.md 是
        // 完成状态机——有任务行但未全勾即拒收（旧「勾选缺失 advisory 放行」退役：懒路径零勾也
        // 能归档教会了无视任务面）。出口：逐格 task tick（每格需提交 token 证据——哨兵同门）；
        // 任务面与实际不符可先改写 tasks.md（工作分解归 agent）再逐格勾。token 代勾（governance-
        // autopilot）已在上方先跑：有证据未勾的格子已代勾，此处拒的纯属零证据未完成面。
        if (sent.claimTotal > 0 && sent.checked < sent.claimTotal) {
          console.error(`🚫 任务未全勾（${sent.checked}/${sent.claimTotal}）——tasks.md 是完成状态机：完成一件勾一格（每格勾选需对应提交带 task-NN token 或 review.json），全勾后重跑 flow done`)
          console.error('   任务面与实际实现路径不符时，先改写 tasks.md（工作分解归你，增删改随意）再逐格勾；查下一任务：sillyspec task tick --change ' + `${change}` + ' --task task-NN（回显进度与指针）')
          appendTelemetry({ sentinel: 'incomplete-tasks', checked: sent.checked, total: sent.claimTotal })
          reportMidFail('ledger')
          process.exit(1)
        }
        }
      }
    } catch (e) { console.warn(`⚠️ 哨兵断言失败（fail-open 放行，best-effort）: ${(e && e.message) || e}`) }
    // 勾选节奏门（2026-09-26-thin-check-cadence 起 advisory；2026-09-29-batch-tick-gate 升硬门）：
    // 事件流 task-done 单拍跳 ≥2 格 = 一把全勾——per-task 时间戳/进度信号面失真（39 条流零
    // 例外实证 + 三次复发 0→6/0→3）。逐格纪律的机器牙齿：任务面存在 → 拒收；
    // 采样去重（2026-10-07-thin-tasks-v3）：task tick 直写的精确事件（source:'task-tick'）为
    // 权威口径，watcher 3s 采样合并跳被去重——CLI 快速连续 tick 不再误伤；观测旁路缺席
    // （无流/读失败）→ 跳过（fail-open，watcher 非真相源）；--allow-batch-tick 显式旁路留痕。
    try {
      const { readWatcherEvents } = await import('./watcher.js')
      const { detectBatchCheckCadence, resolveBatchTickAction } = await import('./sentinel-assertions.js')
      const stream = readWatcherEvents({ runtimeRoot, change })
      const batch = stream.exists ? detectBatchCheckCadence(stream.events) : null
      if (batch) {
        // 代勾计数取「本拍实时代勾 ∨ 持久化代勾」较大者（二轮 P2-B：重入漂移防护）；决策纯函数
        // 单源（resolveBatchTickAction）四态与豁免优先序见其 JSDoc——代勾须解释整跳才降级
        const _persistedAuto = Number(st?.autopilot_ticked) || 0
        const _autoN = Math.max(_autopilotTicked, _persistedAuto)
        const v = resolveBatchTickAction({ batchTick: batch, nonMirrorCount: _sentinelNonMirrorTasks, allowBatchTick, autopilotTicked: _autoN })
        const at = Number.isFinite(batch.ts) ? new Date(batch.ts).toLocaleTimeString() : '未知时刻'
        if (v.action === 'bypass') {
          try { writeFlowState(changeDir, { allow_batch_tick: true }) } catch { /* 留痕 best-effort */ }
          console.warn(`⚠️ --allow-batch-tick：单拍多格勾选（${batch.detail}，${at}）硬门显式旁路——留痕 flow-state 与平台时间线`)
        } else if (v.action === 'advisory') {
          const why = v.reason === 'autopilot-ticked'
            ? `机器代勾 ${_autoN} 格（governance-autopilot 单拍机械写，非 agent 纪律面；本拍 ${_autopilotTicked}/持久化 ${_persistedAuto}）`
            : '哨兵任务面未知（fail-open 防误拒）'
          console.warn(`⚠️ 勾选节奏：单拍多格勾选（${batch.detail}，${at}）——${why}，降级提醒不拒`)
        } else if (v.action === 'reject') {
          console.error(`🚫 单拍勾选拒收：事件流观测到一拍勾选 ${batch.detail}（${at}）——勾选纪律要求逐格（做一件→勾一格→下一个），勾选任务 ${_sentinelNonMirrorTasks} 格`)
          console.error('   出口：①节奏违例已既成——认知后重跑带 --allow-batch-tick 显式留痕过门（平台时间线可见旁路）；②疑观测误判→sillyspec doctor 核对事件流')
          appendTelemetry({ sentinel: 'batch-tick', jump: batch.detail })
          reportMidFail('ledger')
          process.exit(1)
        }
      }
    } catch { /* 节奏门 best-effort：读流失败静默（fail-open——观测缺席不阻断） */ }
    const gate = await runQuickTestLintGate({ cwd, specBase, changedFiles, changeName: change, skipSentinel: true /* flow 侧哨兵带 baseline 区间，quick 侧区间不可靠——单判不双判 */ })
    if (gate && gate.action === 'fail') {
      console.error(`❌ 测试门 FAIL（整单 FAIL——实测失败/超时=失败，不继续 distill/归档）：`)
      console.error(`   ${gate.reason || gate.message || JSON.stringify(gate)}`)
      // FAIL 三件套（2026-09-28-split-guard-and-gate-report，P6）：失败行样本 + 结果文件全路径 +
      // 可粘贴重放的批命令——排障不再手翻 .runtime（快照模式回拷后同样可读）。
      try {
        const t = gate.test
        if (t && t.resultPath && existsSync(t.resultPath)) {
          const tr = JSON.parse(readFileSync(t.resultPath, 'utf8'))
          const rem = tr.failure_remaining || []
          if (rem.length > 0) {
            console.error(`   失败行（前 5，完整清单在结果文件 failure_remaining）：`)
            for (const l of rem.slice(0, 5)) console.error(`   - ${String(l).trim().slice(0, 140)}`)
          }
          for (const m of tr.modules || []) {
            if (m.status && m.status !== 'passed' && m.command) console.error(`   重放（快照内命令，主仓同命令可复跑）：${m.command}`)
          }
          console.error(`   结果文件：${t.resultPath}`)
        }
      } catch { /* 三件套 best-effort：读不到不阻断 FAIL 主输出 */ }
      // lint FAIL 件套（坑 flowdone-lint-fail-no-output，2026-10-03 实证：quick-audit 的
      // runVerifyLintCheck 全程静默、printVerifyLintCheck 未在 flow 路径调用——「命令与输出
      // 尾部见上」名不副实，agent 只能盲猜或直调同参复现）。对齐 test 三件套：命令 + 输出
      // 尾部 + 失败文件 + 结果文件（lint 结果已由 persistLintResult 并入 test-result.json
      // 或独立落盘，kind: 'lint'）。
      try {
        const l = gate.lint
        if (l && l.status === 'failed') {
          console.error(`   lint 命令：${l.command || '（未知）'}${l.reason ? `（${l.reason}）` : ''}`)
          const tail = String(l.outputTail || '')
          if (tail) {
            const lines = tail.split('\n').filter((x) => x.trim())
            console.error(`   lint 输出尾部（后 ${Math.min(lines.length, 15)} 行）：`)
            for (const line of lines.slice(-15)) console.error(`   | ${line.slice(0, 160)}`)
          }
          if (Array.isArray(l.failureFiles) && l.failureFiles.length > 0) {
            console.error(`   lint 失败文件（前 10）：${l.failureFiles.slice(0, 10).join('、')}${l.failureFiles.length > 10 ? ' 等' : ''}`)
          }
          if (l.resultPath) console.error(`   lint 结果文件：${l.resultPath}`)
        }
      } catch { /* lint 件套 best-effort */ }
      // 失败触发升级（R7 切片四 / FR-10 / 护栏#4：不依赖 agent 主动）——剩余流程按厚档走
      writeFlowState(changeDir, { tier: 'thick', upgrade_reason: `verify 实测失败（${gate.reason || 'test fail'}）——失败自动升厚` })
      console.error('   ⬆️ 已自动升厚档（tier=thick）：重入修复后剩余流程按厚档语义（归档不跳过 plan.md 校验）')
      reportMidFail('ledger')
      process.exit(1)
    }
    // 实测面对账（2026-09-25 修复③）：agent 可核对自己的测试有没有被扫到——命令/时长/结果文件
    // 一行打全（skip 路径 test/lint 为 null 显示 —；结果文件 test-result.json 含完整文件清单可回溯）。
    // skipped 标因（2026-09-25-platform-feedback-batch2 C）：跳过必须说为什么——环境缺件/无测试面/
    // 模块未命中/策略 skip 各有 reason，实测面透传首句让下游能区分。
    const fmt = (r) => r
      ? `${r.status}${r.command ? ` ← ${r.command}` : ''}${typeof r.durationMs === 'number' ? `（${(r.durationMs / 1000).toFixed(1)}s）` : ''}${r.resultPath ? ` 结果：${r.resultPath}` : ''}${r.status === 'skipped' && r.reason ? ` — 跳过原因：${String(r.reason).split('。')[0]}。` : ''}`
      : '—'
    gateSummaryText = `test: ${fmt(gate && gate.test)}｜lint: ${fmt(gate && gate.lint)}｜门文件 ${Array.isArray(changedFiles) ? changedFiles.length : '?'} 个`
    console.log(`🧾 实测面对账 — ${gateSummaryText}`)
    try { writeFlowState(changeDir, { gate_summary: gateSummaryText }) } catch { /* 存档 best-effort */ }
    // FR 腐烂 suspect（2026-09-25-thin-fr-inject-parity）：quick-done 钩子迁轻量道（quick 退役后
    // 原侧悬空）——归属文件面触达域的 active FR 出收口 advisory 与遥测（2026-09-29 起不落盘）。advisory 不阻断。
    try {
      const rot = await rotSuspectFlow({ specBase, change, changeDir, files: changedFiles })
      if (rot.warn) console.warn(rot.warn)
      if (rot.warnInfo) console.warn(rot.warnInfo)
    } catch { /* rot fail-open */ }
    mark('ledger')

    // ── 绑定校验+自动补全（governance-autopilot，R21 实证 P1 修正：从 artifacts 移到 ledger
    //    之后——测试已跑、verify-runs/test-result.json 已生成，auto-bind 才有数据可读）──
    const { verifyRequirementBindings: _vrb } = await import('./flow-draft.js')
    let _rb = _vrb({ changeDir })
    if (_rb.applicable && _rb.emptySlots.length > 0) {
      let _autoFilled = 0
      try {
        const _runtimeRoot = resolveRuntimeRoot(platformOpts || {}, specBase)
        const _runsDir = join(_runtimeRoot, 'verify-runs')
        let _testFiles = new Set()
        if (existsSync(_runsDir)) {
          const _runs = readdirSync(_runsDir).sort().reverse()
          for (const _rd of _runs.slice(0, 3)) {
            const _tr = join(_runsDir, _rd, 'test-result.json')
            if (!existsSync(_tr)) continue
            try {
              const _j = JSON.parse(readFileSync(_tr, 'utf8'))
              // P1 修复：从 command 解析测试文件路径（匹配 test_*.py / *.test.ts / *.spec.tsx 等）
              const _cmd = String(_j.command || '')
              for (const _fm of _cmd.matchAll(/([\w\/\\.-]+\.\w{1,5})/g)) {
                if (/test|spec/i.test(_fm[1])) _testFiles.add(_fm[1].replace(/\\/g, '/'))
              }
              if (_testFiles.size > 0) break
            } catch {}
          }
        }
        if (_testFiles.size > 0) {
          const _reqPath = join(changeDir, 'requirements.md')
          const _lines = readFileSync(_reqPath, 'utf8').split('\n')
          const _bindingLine = [..._testFiles].slice(0, 3).join('、')
          for (let _li = 0; _li < _lines.length - 1; _li++) {
            if (/^<!--\s*AGENT:测试绑定/.test(_lines[_li]) && !_lines[_li + 1].trim()) {
              _lines[_li + 1] = _bindingLine
              _autoFilled++
              _li++
            }
          }
          // v2 纯文本绑定行（2026-10-04-thin-docs-v2）：`FR-NN: （待填…）` → 测试结果补全
          for (let _li = 0; _li < _lines.length; _li++) {
            const _bm = _lines[_li].match(/^(FR-\d{2}: )（待填[^）]*）\s*$/)
            if (_bm) {
              _lines[_li] = _bm[1] + _bindingLine
              _autoFilled++
            }
          }
          if (_autoFilled > 0) {
            const { writeAtomicSync } = await import('./fs-atomic.js')
            writeAtomicSync(_reqPath, _lines.join('\n'))
            console.log(`✅ [自动绑定] ${_autoFilled} 个空绑定槽已从测试结果补全（${_bindingLine.slice(0, 60)}）——agent 可覆盖`)
            _rb = _vrb({ changeDir })
          }
        }
      } catch { /* 自动补全 fail-soft */ }
      if (_rb.applicable && _rb.emptySlots.length > 0 && _autoFilled === 0) {
        console.error(`❌ 需求测试绑定未作答：requirements.md ${_rb.emptySlots.length} 处（${_rb.emptySlots.slice(0, 4).join('、')}${_rb.emptySlots.length > 4 ? ' 等' : ''}）`)
        console.error(`   每条 FR 至少一行：测试文件项目相对全路径＋用例名；无测试面写「不适用：<理由>」`)
        reportMidFail('ledger')
        process.exit(1)
      }
    }
  }

  // ②b patch：变更级 patch 留档（2026-09-25-thin-patch-bindings，noAI）：quicklog/patches 生态
  // 退役后审计件挂变更自身。范围=归属收窄后的本变更文件面（他侧声明剔除、含工作树未提交与
  // untracked 自拼 hunk），基=baseline，时点=done 冻结。fail-soft：失败只告警不阻断归档、
  // 不标 done（重入 done 重试）。
  let driftRefreeze = false
  if (st.substeps?.patch === 'done') {
    // 处置漂移检测（2026-10-05-disposition-refreeze-drift，主清单 P1）：冻结后又有本变更交付
    // 提交时，幂等跳过会把 change.patch/review.json 停在处置前时点（归档审计件缺处置面，
    // 2026-10-05-flowdone-lintfail-output 收编活体复现）。漂移 → 自动重冻结（等价 --refreeze）
    // + review 已有结论则隔离旧 review.json（结论对着旧冻结面不作数）并重置标记强制重评。
    try {
      const patchMeta = JSON.parse(readFileSync(join(changeDir, 'change-patch.json'), 'utf8'))
      const { detectPatchDrift } = await import('./flow-parity.js')
      const drift = detectPatchDrift({ cwd, change, freezeHead: patchMeta.head })
      if (drift.drifted) {
        console.warn(`⚠️ 审计时点漂移：patch 冻结（${String(patchMeta.head || '').slice(0, 8)}）后另有 ${drift.ownCommits.length} 个本变更交付提交（${drift.ownCommits.slice(0, 3).join('；')}${drift.ownCommits.length > 3 ? ' 等' : ''}）——幂等跳过会把审计件停在处置前时点`)
        // 隔离先行（评审处置 P3：时间戳槽位防跨代覆盖——单槽 .superseded 在 Windows renameSync
        // 同名碰撞会抛错；隔离失败则整体退回现状幂等跳过（fail-safe：漂移处理要么完整交付要么
        // 不动，不留半套状态），指引人工处置后重跑）
        const reviewPath = join(changeDir, 'review.json')
        let quarantineOk = true
        if (existsSync(reviewPath)) {
          // 锚定保留判定（2026-10-06-review-anchor-and-negation 实测竞态：复审对着当前 HEAD
          // 做的 PASS 结论落盘 26 秒后被「重冻结时刻在场=过期」口径误隔离）：reviewedAgainst
          // 命中当前 HEAD = 评审对象即最新交付面，结论有效——保留不隔离、review 标记不重置。
          // 缺省/读失败/格式非法按未锚定处理，隔离行为不变（fail-safe 宁可多评）。
          let anchoredToHead = false
          try {
            const { reviewAnchoredToHead } = await import('./flow-review.js')
            anchoredToHead = reviewAnchoredToHead(reviewPath, drift.head)
          } catch { /* 锚定判定失败按未锚定处理 */ }
          if (anchoredToHead) {
            console.log(`   review.json 已锚定当前 HEAD（reviewedAgainst 命中 ${String(drift.head || '').slice(0, 8)}）——评审对象即最新交付面，结论保留不隔离`)
          } else {
            const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '')
            try {
              renameSync(reviewPath, `${reviewPath}.superseded-${ts}`)
              console.warn(`   旧 review.json 已隔离为 review.json.superseded-${ts}（评审结论对着旧冻结面）——重新执行评审任务书后再收口`)
            } catch (e) {
              quarantineOk = false
              console.error(`   ⚠️ 旧 review.json 隔离失败（${e.message}）——本次保持现状幂等跳过，手动删除/改名 ${reviewPath} 后重跑（将自动重冻结+重评）`)
            }
          }
        }
        if (quarantineOk) {
          driftRefreeze = true
          if (st.substeps?.review === 'done' && !existsSync(reviewPath)) {
            // 双故障边界（评审 P3 处置披露）：writeFlowState 盘写失败时内存重置保本运行正确；
            // 极端双故障（隔离成功+盘写失败）下轮残留 done 且 review.json 缺席 → review 子步
            // backfill 按 exempt 误读——该窄路径未测（需 I/O 故障注入，design 边界披露）
            try { writeFlowState(changeDir, { substeps: { review: null } }) } catch { /* 见上边界注释 */ }
            if (st.substeps) st.substeps.review = null
            if (!existsSync(reviewPath)) console.warn('   review 豁免口径对着旧冻结面——review 子步标记已重置，本次重新定档')
          }
        }
      }
    } catch { /* 漂移检测失败按现状幂等跳过（fail-safe 不新造阻断面） */ }
    if (!driftRefreeze) skip('patch')
  }
  if (st.substeps?.patch !== 'done' || driftRefreeze) {
    let patchOk = false
    try {
      // patch 面 = 本变更可归属变化（2026-09-25-thin-patch-scope-fix 收窄：dirty 全扫面会把并行
      // 会话未声明 WIP 冻结进来——上变更实测 49 文件泄漏）：①baseline..HEAD 提交面（.sillyspec/
      // 治理面只留本变更目录，他侧 quicklog/knowledge WIP 不入）②本变更目录全部工作树件（未提交
      // 治理面/槽位作答）——排除 patch 自引用。提交面再过他侧声明切分（他侧同窗口提交的防线）。
      if (!st.baseline_commit) {
        console.log('📦 patch 留档跳过：无 git 基线（无历史仓）')
        patchOk = true
      } else {
        const ownPrefix = `.sillyspec/changes/${change}/`
        const diffOut = gitQuiet(cwd, ['diff', '--name-only', `${st.baseline_commit}..HEAD`])
        const committedRaw = String(diffOut || '').split('\n').map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean)
        // 提交面过滤抽为 flow-parity.filterCommittedFace（2026-09-27-tool-debt-cleanup：
        // +.sillyspec/docs/ 交付文档保留——模块卡漏出审计 patch 的评审 P2 修复）
        const { filterCommittedFace } = await import('./flow-parity.js')
        let committed = filterCommittedFace(committedRaw, ownPrefix)
        // 夹带嫌疑 advisory（坑 parallel-session-stale-snapshot-carried-in-commit，2026-09-26
        // 实证：daemon 遥测主题提交整体夹带并行会话旧分叉 page.tsx，静默回滚 main 已落地三处
        // 功能——git 无冲突、聚焦测试不覆盖挂载面，绿灯直过）。提交面里未被本变更任何声明面
        // （design 文件变更清单 ∪ requirements 测试绑定文件）提及的交付文件，收口前显式归因：
        // 属并行会话在途 → pathspec 隔离（AGENTS.md 规则 11）；属本变更 → 补 design 自声明。
        // advisory 不阻断（多会话并行是常态，提示归因而非拒绝收口）；声明面全空（adopt 等）时
        // 降为「无声明面」提示，不指认夹带。
        try {
          const declared = new Set()
          const { parseFileChangeList } = await import('./change-list.js')
          for (const p of parseFileChangeList(join(changeDir, 'design.md'))) declared.add(p)
          const { extractRequirementBindings } = await import('./flow-draft.js')
          const { testAnchorFile } = await import('./test-bindings.js')
          for (const row of extractRequirementBindings({ changeDir, change })) {
            for (const t of row.tests || []) declared.add(testAnchorFile(t))
          }
          const deliverables = committed.filter((f) => !f.startsWith('.sillyspec/'))
          const undeclared = deliverables.filter((f) => !declared.has(f))
          if (declared.size > 0 && undeclared.length > 0) {
            console.warn(`⚠️ 提交面夹带嫌疑：${undeclared.length} 个 baseline..HEAD 提交文件未被本变更声明面提及（design 文件变更清单/requirements 测试绑定）: ${undeclared.slice(0, 5).join('、')}${undeclared.length > 5 ? ' 等' : ''}`)
            console.warn(`   属并行会话在途交付 → 整文件覆盖即静默回滚风险，收口提交用显式 pathspec 隔离（AGENTS.md 规则 11）；确属本变更 → 补 design「文件变更清单」自声明后重跑 flow done`)
          } else if (declared.size === 0 && deliverables.length > 0) {
            console.warn(`⚠️ 本变更无任何文件声明面（design 无清单、requirements 无绑定），提交面 ${deliverables.length} 个交付文件无法归因——建议补 design「文件变更清单」自声明（冻结面归属与夹带识别的锚点）`)
          }
        } catch { /* 声明面解析失败不阻断冻结 */ }
        // 提交面不过 foreign 声明切分（2026-09-25-sentinel-evidence-freeze ⑤：已提交的文件就是
        // 本变更的——陈旧声明的旧变更不该抢走 baseline..HEAD 里我实际提交的文件，静默少文件+门禁
        // 静默 skipped 是平台狗粮实证。foreign 声明切分保留给 dirty 面与 attributedChangedFiles
        // （实测面/FR 域路由）——那里归属确实模糊。）
        // dirty 面切分 + 警告不再静默：
        let dirtyForeign = []
        try {
          const { splitOwnVsForeignDiffFiles } = await import('./foreign-declared.js')
          const statusOut = gitQuiet(cwd, ['status', '--porcelain'])
          const dirtyAll = String(statusOut || '').split('\n').map((l) => {
            if (!l || l.length < 4) return null
            const p = line => line.slice(3).trim().replace(/^"|"$/g, '')
            const raw = l.slice(3).trim().replace(/^"|"$/g, '')
            const arrow = raw.indexOf(' -> ')
            return (arrow !== -1 ? raw.slice(arrow + 4) : raw).replace(/\\/g, '/')
          }).filter(Boolean).filter((f) => !f.startsWith('.sillyspec/'))
          if (dirtyAll.length > 0) {
            const dirtySplit = splitOwnVsForeignDiffFiles(cwd, change, dirtyAll, { specBase })
            dirtyForeign = dirtySplit.foreign
          }
        } catch { /* dirty 切分失败不阻断 */ }
        if (dirtyForeign.length > 0) {
          console.warn(`⚠️ patch 留档：${dirtyForeign.length} 个 dirty 文件被其他活跃变更声明排除（${dirtyForeign.slice(0, 3).map((x) => `${x.file}←${x.owners[0]}`).join(', ')}${dirtyForeign.length > 3 ? ' 等' : ''}）——如有误（陈旧声明），清理该旧变更或用 --refreeze 重冻结`)
        }
        const changeDirFiles = []
        const walk = (dir) => {
          for (const e of readdirSync(dir, { withFileTypes: true })) {
            // flow-state.yaml 是运行态（机器写、冻结后仍随子步推进变化）——不入审计 patch
            //（2026-09-27-tool-debt-cleanup：旧口径把它当 new file 冻进 patch，评审 P2）
            if (e.name === 'flow-state.yaml') continue
            const p = join(dir, e.name)
            if (e.isDirectory()) walk(p)
            else changeDirFiles.push(relative(cwd, p).replace(/\\/g, '/'))
          }
        }
        try { walk(changeDir) } catch { /* 目录异常=空面 */ }
        // 冻结面收集（2026-09-25-thin-r16-patches 修复①）：committed 为主；会话专属 worktree
        // （gate-snapshot 同款路径判定）下未提交 dirty 交付面一并入冻结——独占树内全归属本变更；
        // 共享主仓 dirty 无法归属只警告（他侧声明免警告），审计缺口显式化不再静默。
        let exclusiveFrom = null // 'flag' | 'worktree' | null——入冻路径来源（输出标签区分）
        if (freezeDirty === true) {
          exclusiveFrom = 'flag' // --freeze-dirty：显式声明非他侧声明 dirty 全归属本变更（独占树自动路径的手动版）
        } else {
          try {
            const { shouldSkipGateSnapshotForWorktree } = await import('./run/gate-snapshot.js')
            if (shouldSkipGateSnapshotForWorktree(cwd)) exclusiveFrom = 'worktree'
          } catch { /* 判定异常按共享主仓 */ }
        }
        const exclusive = exclusiveFrom != null
        let freeze = null
        try {
          const { collectFreezeFiles } = await import('./flow-parity.js')
          freeze = collectFreezeFiles({ cwd, specBase, change, committed, exclusive })
        } catch { freeze = { files: [...committed], dirtyAdded: [], dirtyWarned: [] } }
        if (freeze.dirtyAdded.length > 0) {
          console.log(`🔒 ${exclusiveFrom === 'flag' ? '--freeze-dirty 显式声明' : '会话专属 worktree'}：${freeze.dirtyAdded.length} 个未提交交付文件一并入冻结面`)
        }
        if (freeze.dirtyWarned.length > 0) {
          console.warn(`⚠️ ${freeze.dirtyWarned.length} 个未提交交付文件未入冻结面（共享主仓无法归属）——三选一：`)
          console.warn(`   ① 先提交这些文件（信息尾缀带变更名）后重跑 ② 确认全部归属本变更：重跑 flow done --freeze-dirty 并入冻结 ③ 确认接受审计缺口：重跑 flow done --accept-dirty-gap（缺口数随 change-patch.json 留痕）。Git 中间提交可归档后压扁（见收口指引）`)
          console.warn(`   ${freeze.dirtyWarned.slice(0, 3).join('、')}${freeze.dirtyWarned.length > 3 ? ' 等' : ''}`)
          // 收口阻断门（2026-10-08-thin-done-dirty-gate-and-paren-attribution，坑①修复：
          // multi-agent-platform docs/sillyspec/thin-done-src-commit-order-and-attribution-paren.md）
          // ——旧行为警告后继续归档，autopilot 单跑到底把三选一变成不可达选项（归档即拒收重入）。
          // 缺口在场且未显式处置 → 停在 patch 子步标记之前（半态可重入，与 review 中断同款
          // exit 语义）：处置后重跑，patch 全量重建自动并入已提交 src。
          if (!freezeDirty && !acceptDirtyGap) {
            console.error('⛔ 未提交交付缺口未显式处置——收口阻断（不归档；处置后重跑同一条命令从断点续）：')
            console.error(`   ① git commit 这些文件（信息尾缀带 (${change}) 或 （${change}），重跑本命令——冻结面自动并入`)
            console.error(`   ② 全部归属本变更：flow done --change ${change} --freeze-dirty`)
            console.error(`   ③ 接受审计缺口：flow done --change ${change} --accept-dirty-gap`)
            reportMidFail('patch')
            process.exit(1)
          }
          if (acceptDirtyGap) {
            // 双 flag 同给时 --freeze-dirty 优先（exclusive 路径 dirtyWarned 恒空，本分支不进
            // ——设计接口契约已披露；无告警代码即无死代码，二轮评审 P3 清偿）
            console.warn(`⚠️ --accept-dirty-gap：显式接受 ${freeze.dirtyWarned.length} 个未提交交付文件不进冻结面（缺口数随 change-patch.json acceptedDirtyGap 留痕）`)
          }
        }
        const ownFiles = [...new Set([...freeze.files, ...changeDirFiles])]
          .filter((f) => f && !f.endsWith('change.patch') && !f.endsWith('change-patch.json')
            && !f.endsWith('scope-audit.json') && !f.endsWith('scope-audit.patch'))
        if (ownFiles.length === 0) {
          console.log('📦 patch 留档跳过：本变更可归属文件面为空')
          patchOk = true
        } else {
          const { buildFrozenPatch, collectNumstatByPath } = await import('./scope-audit.js')
          // 双口径冻结（2026-09-28-split-guard-and-gate-report 评审 P2 清偿）：交付面（committed）
          // 用 baseRef..HEAD 提交区间 diff——共享主仓里并行会话对同文件的未提交 hunk 不再漏进
          // 冻结件；治理工件目录（changeDirFiles，本变更独占无他会话面）保留工作树口径（未提交
          // 的槽位作答/勾选要进审计件）。重叠文件归提交区间，避免双 hunk。
          const headCommit = String(gitQuiet(cwd, ['rev-parse', 'HEAD']) || '').trim() || null
          const toPosix = (p) => String(p).replace(/\\/g, '/')
          // 复审 P2/P3a 清偿：工作树口径集 = 治理工件目录（含已提交后又改的槽位/勾选——工作树
          // diff 能捕捉提交后编辑）∪ 独占树未提交交付（dirtyAdded）；其余交付面走提交区间。
          // 排除项与 ownFiles 同款（change.patch/change-patch.json）——否则上一轮冻结件作为
          // untracked 新文件被全文自嵌入（自引用循环：旧 patch 内容混进新 patch，三评 P1 根因）。
          const dirFilesForPatch = changeDirFiles.filter((f) => !f.endsWith('change.patch') && !f.endsWith('change-patch.json')
            && !f.endsWith('scope-audit.json') && !f.endsWith('scope-audit.patch'))
          const worktreeSet = new Set([...dirFilesForPatch, ...((freeze.dirtyAdded) || [])].map(toPosix))
          const committedFace = freeze.files.map(toPosix).filter((f) => !worktreeSet.has(f))
          const frozenCommitted = buildFrozenPatch(cwd, committedFace, { baseRef: st.baseline_commit, headRef: headCommit })
          const frozenDir = buildFrozenPatch(cwd, [...worktreeSet], { baseRef: st.baseline_commit })
          const frozen = [frozenCommitted, frozenDir].filter((p) => typeof p === 'string' && p).join('\n') || null
          const stats = collectNumstatByPath(cwd, ownFiles, { baseRef: st.baseline_commit })
          let additions = 0
          let deletions = 0
          for (const f of ownFiles) {
            const s = stats.get(f)
            if (s && Number.isFinite(s.additions)) additions += s.additions
            if (s && Number.isFinite(s.deletions)) deletions += s.deletions
          }
          const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
          // 模块文档对账（2026-09-25-thin-parity-assets：厚道 module-impact 死信门的轻量变更 advisory
          // 等价物——模块文档是后续变更门禁收窄/知识注入的原料，失供是复利折旧）。
          // 2026-09-27-thin-module-scope-persist：调用前移至 meta 写盘前——结构化结果
          // （modules/uncoveredDirs/moduleMaps）随 change-patch.json 落盘供平台展示影响模块
          // 范围，单一计算喂 console 与落盘两处。ownFiles 传冻结面（与 files[] 同口径——
          // worktree/--freeze-dirty 场景 dirty 交付也计入模块命中；.sillyspec 治理面对账内部
          // 滤除）；三键恒在场（对账异常兜底空数组，评审 P3 清偿）；best-effort 不阻断。
          let moduleScope = { modules: [], uncoveredDirs: [], moduleMaps: [] }
          try {
            const { reconcileModuleDocs } = await import('./flow-parity.js')
            const rec = reconcileModuleDocs({ cwd, specBase, ownFiles, committedRaw })
            if (rec.lines.length > 0) for (const l of rec.lines) console.log(l)
            moduleScope = { modules: rec.modules, uncoveredDirs: rec.uncoveredDirs, moduleMaps: rec.moduleMaps }
          } catch { /* 对账 best-effort（三键空数组兜底） */ }
          // 双通道收尾留痕统一（2026-10-07-unify-close-trace）：共用 writeCloseTraceArtifacts
          // 一次写齐四件——沉淀资产面（change.patch + change-patch.json，键结构/口径不变）+
          // 对账快照面（scope-audit.json + scope-audit.patch，thin 通道新增）：同点同锚
          // （同一 patchText 一次 sha256），新变更两条通道留痕对称，读侧回退退化为存量兜底。
          let planEntries = []
          try {
            const { parseFileChangeListDetailed } = await import('./change-list.js')
            planEntries = parseFileChangeListDetailed(join(changeDir, 'design.md'), { keepSillyspecDocs: true })
          } catch { /* 清单缺失/不可解析 → 实际侧 only 快照行（无 verdict，与主链路降级同语义） */ }
          const { buildThinSnapshotRows, writeCloseTraceArtifacts } = await import('./flow-parity.js')
          const { rows: snapRows, totals: snapTotals } = buildThinSnapshotRows({ ownFiles, stats, planEntries })
          const closeTrace = writeCloseTraceArtifacts({
            changeDir,
            change,
            baseline: st.baseline_commit,
            head: typeof head === 'string' ? head.trim() : null,
            files: ownFiles,
            metaTotals: { files: ownFiles.length, additions, deletions },
            patchText: typeof frozen === 'string' && frozen ? frozen : null,
            savedAt: new Date().toISOString(),
            snapObj: {
              mode: 'full-flow', ok: true, degradedReason: null,
              baseAnchor: st.baseline_commit || null,
              totals: snapTotals,
              rows: snapRows,
              excluded: { foreignDeclared: [] },
              note: 'flow done 时点冻结（本文件落盘时采集）',
              closedBy: 'flow done',
            },
            meta: {
              note: 'flow done 时点冻结（本变更可归属面：baseline..HEAD 提交面过滤 .sillyspec/ 非本变更目录但保留 .sillyspec/docs/ 交付文档 + 本变更目录工作树件；含未提交与 untracked，排除 flow-state.yaml 运行态）',
              // 模块对账结构化面（2026-09-27-thin-module-scope-persist）：done 时点口径
              // （与 files[] 同时点语义，不随模块图后续变更回写）；modules[] 空≠无影响
              ...moduleScope,
              // dirty 缺口显式接受留痕（2026-10-08-thin-done-dirty-gate-and-paren-attribution）：
              // --accept-dirty-gap 放行时缺口数入档（审计面可见，非只 console）
              ...(acceptDirtyGap && freeze.dirtyWarned.length > 0 ? { acceptedDirtyGap: freeze.dirtyWarned.length } : {}),
            },
          })
          console.log(`📦 变更 patch 留档（双轨统一）：change.patch + change-patch.json（${ownFiles.length} 文件，+${additions}/-${deletions}）+ scope-audit.json + scope-audit.patch（对账快照同点冻结）${closeTrace.patchStatus === 'ok' ? '，sha256 已锚' : '——patch 采集失败已留痕'}`)
          // design 声明面自证（2026-09-25-platform-feedback-batch2 E）：design.md 文件变更清单
          // 声明的交付文件是否都在冻结面——不在=承诺改了但没交付（承诺未兑现面，advisory 不
          // 阻断——可能是范围裁剪了但 design 没同步更新）
          try {
            const designPath = join(changeDir, 'design.md')
            if (existsSync(designPath)) {
              const { parseFileChangeListDetailed } = await import('./change-list.js')
              const declared = parseFileChangeListDetailed(designPath).map((e) => e.path)
              const frozenSet = new Set(ownFiles.map((f) => String(f).replace(/\\/g, '/')))
              const missing = declared.filter((p) => !frozenSet.has(p) && !p.startsWith('.sillyspec/'))
              if (missing.length > 0) {
                console.warn(`⚠️ design 声明面自证：${missing.length} 个声明文件不在冻结面（${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' 等' : ''}）——design 说了要改但交付里没有，确认是范围裁剪（请同步更新 design 清单）还是遗漏`)
              }
            }
          } catch { /* 自证 best-effort */ }
          patchOk = true
        }
      }
    } catch (e) {
      console.warn(`⚠️ patch 留档失败（fail-soft 不阻断归档；重入 flow done 从断点重试）：${(e && e.message) || e}`)
    }
    if (patchOk) mark('patch')
  }

  // ②c review：危险证据定档的独立评审（2026-09-25-thin-review-slice）。定档=证据累积制
  // （承诺词一票/盲维实质作答/diff 原语/决策密度/声明一票），文件数出局；缺省要评审、豁免要
  // 多证并举、豁免者 1/4 定额抽查采样。评审任务书由 CLI 渲染（agent 起干净上下文子代理执行，
  // 协议调用数不变）；FAIL 或 P1 发现=拦截（修复后删件重评再重跑 done，断点续）。
  if (st.substeps?.review === 'done') {
    skip('review')
    // 回填（修评审 P2②：续跑成功轮遥测不失忆——review 已发生但子步已标，从留档件回读结论）
    try {
      const { validateReviewJson } = await import('./flow-review.js')
      const rp = join(changeDir, 'review.json')
      if (existsSync(rp)) {
        const v = validateReviewJson(rp)
        reviewOutcome = v.ok
          ? { required: true, sampled: false, verdict: v.review.verdict, findingsP1: (v.review.findings || []).filter((f) => /^P1$/i.test(String(f.severity || ''))).length, backfilled: true }
          : { required: true, sampled: false, verdict: 'invalid', backfilled: true }
      } else {
        reviewOutcome = { required: false, sampled: false, verdict: 'exempt', backfilled: true }
      }
    } catch { reviewOutcome = { required: null, verdict: 'done', backfilled: true } }
  } else {
    const { classifyReviewNeed, renderReviewerTaskbook, validateReviewJson } = await import('./flow-review.js')
    let patchText = null
    try { patchText = readFileSync(join(changeDir, 'change.patch'), 'utf8') } catch { /* patch 子步 skip/失败面 */ }
    const tier = classifyReviewNeed({ changeDir, input: null, patchText, editRatio: st.edit_ratio ?? null, reviewForce: st.review_force ?? null, change })
    if (!tier.required) {
      console.log(`⚖️ 评审豁免（低风险证据齐全）：${tier.exemptEvidence.join('；')}`)
      reviewOutcome = { required: false, sampled: false, verdict: 'exempt' }
      mark('review')
    } else if (!existsSync(join(changeDir, 'review.json'))) {
      // 任务书标注评审对象 HEAD（2026-10-06-review-anchor-and-negation）：评审员照抄进
      // review.json.reviewedAgainst——处置提交后的重入重跑据此保留「对着最新面的刚完成评审」，
      // 不再被漂移重冻结误隔离（实测竞态修复）。rev-parse 失败传 null（任务书退引导形态）。
      let taskbookHead = null
      try { const h = gitQuiet(cwd, ['rev-parse', 'HEAD']); if (h && /^[0-9a-f]{7,40}$/i.test(String(h).trim())) taskbookHead = String(h).trim() } catch { /* best-effort */ }
      console.log(`⚖️ 本变更需要独立评审（${tier.reasons.join('；')}）——评审任务书如下，起一个干净上下文的子代理执行后重跑本命令：\n`)
      console.log(renderReviewerTaskbook({ change, changeDir, head: taskbookHead }))
      reviewOutcome = { required: true, sampled: tier.sampled, verdict: 'missing' }
      appendTelemetry(reviewOutcome) // 修评审 P2①：失败面先落账再 exit（校准信号不丢）
      reportMidFail('review')
      process.exit(1)
    } else {
      const v = validateReviewJson(join(changeDir, 'review.json'))
      if (!v.ok) {
        console.error(`❌ review.json 校验失败（${v.errors.join('；')}）——按任务书 schema 修正后重跑`)
        reviewOutcome = { required: true, sampled: tier.sampled, verdict: 'invalid' }
        appendTelemetry(reviewOutcome) // 修评审 P2①
        reportMidFail('review')
        process.exit(1)
      }
      const p1s = (v.review.findings || []).filter((f) => /^P1$/i.test(String(f.severity || '')))
      const others = (v.review.findings || []).filter((f) => !/^P1$/i.test(String(f.severity || '')))
      if (v.review.verdict === 'FAIL' || p1s.length > 0) {
        console.error(`❌ 独立评审未过（verdict=${v.review.verdict}，P1 发现 ${p1s.length} 项）——承诺与实现不一致，不许归档：`)
        for (const f of [...p1s, ...others]) console.error(`   [${f.severity}] ${f.title} — ${f.evidence || ''}${f.location ? `（${f.location}）` : ''}`)
        console.error(`   修复后删除 review.json 并重新执行评审任务书（起子代理重评），再重跑 flow done（断点续）`)
        reviewOutcome = { required: true, sampled: tier.sampled, verdict: 'FAIL', findingsP1: p1s.length }
        appendTelemetry(reviewOutcome) // 修评审 P2①：sampled+FAIL 恰是误豁免率校准的最关键信号
        reportMidFail('review')
        process.exit(1)
      }
      if (others.length > 0) {
        console.warn(`⚠️ 评审非阻断发现 ${others.length} 项（P2/P3，随归档留档）：`)
        for (const f of others) console.warn(`   [${f.severity}] ${f.title} — ${f.evidence || ''}`)
      }
      console.log(`✅ 独立评审通过（reviewer=${v.review.reviewer}${tier.sampled ? '，豁免抽查采样命中' : ''}）`)
      reviewOutcome = { required: true, sampled: tier.sampled, verdict: 'PASS', findingsP1: 0 }
      mark('review')
    }
  }

  // ②d hindsight：事后闭环指标接线（FR-02 / D-005，2026-09-28-unclear-req-to-brainstorm）——
  // patch/review 之后、archive 搬走 changeDir 之前：review.json（评审子步已定在场与否）、首版
  // 快照 vs 终稿、verify-runs 记录面 → 封闭面指标四元组（diff 比例与计数，零语义判定 D-003）；
  // 任一超阈 → per-repo 标记落库，下次 flow start 点名提示（「疑似」非定罪可无视）。
  // best-effort：异常仅 warn 不阻断收口（断点续跑重入本块幂等——标记整文件覆盖同值）。
  try {
    const { computeHindsightMetrics, markHindsight } = await import('./route-hindsight.js')
    let reviewJson = null
    try { reviewJson = JSON.parse(readFileSync(join(changeDir, 'review.json'), 'utf8')) } catch { /* 评审豁免/缺件 → null（盲维计 0） */ }
    const metrics = computeHindsightMetrics({ changeDir, reviewJson, flowState: st })
    const marked = markHindsight({ cwd, specBase, change, metrics })
    if (marked.marked) {
      console.warn(`🕰️ route-hindsight 标记：本变更疑似该走预段未走（${marked.reasons.join('；')}）——下次 flow start 将点名提示（过程形态信号非定罪）`)
    }
  } catch (e) { console.warn(`⚠️ route-hindsight 指标接线失败（best-effort 不阻断收口）: ${(e && e.message) || e}`) }

  // ③ probes：thin 轻量跑无 verify-result 骨架——探针产物面（probe1-8 事实核验）由 flow done
  // 裁决自含（测试门+工件指纹）；升厚（tier=thick）时探针链由 run verify 的既有 --init --draft
  // 产物面承接（第 3 批资产复用，不重做）。本子步记账占位：thin=not-applicable 直过。
  if (st.substeps?.probes === 'done') { skip('probes') } else {
    if (st.tier === 'thick') console.log('ℹ️ 厚档探针链：run verify --done 时经 verify-probes --init --draft 承接（第 3 批既有面）')
    // 探针 12 error 档收口拦截（2026-09-27-ui-visual-guidance：UI 视觉证据分级门——
    // 视觉降级无用户裁决留痕恒拦；ui_visual_gate=error 时缺 visual-evidence.md 亦拦；
    // 默认 warn 档只警告不拦。与 run/gates.js verify 收尾同一检测单点，不二算）。
    try {
      const uiProbe = runUiVisualProbe({ changeDir, gate: readUiVisualGate(specBase) })
      if (uiProbe.level === 'error') {
        console.error('\n❌ UI 视觉证据门（探针 12 error 档）阻断收口：')
        for (const n of uiProbe.notes) console.error(`   - ${n}`)
        console.error(`   修复：补渲染对照证据到 ${join(changeDir, UI_EVIDENCE_FILENAME)}；降级项补「用户裁决」留痕段后重跑（断点续，已完成子步幂等跳过）。`)
        reportMidFail('probes')
        process.exit(1)
      } else if (uiProbe.level === 'warn') {
        console.warn(`⚠️ UI 视觉证据（探针 12 warn 档）：${uiProbe.notes.join('；')}`)
      }
    } catch (e) {
      console.warn(`⚠️ UI 视觉证据探针异常（fail-soft 降级放行）：${(e && e.message) || e}`)
    }
    // hunk 归属门（2026-09-27-hunk-attribution-gate：提交面行级对账——规则 11 文件级 pathspec
    // 防不住「同文件异行」的并行会话夹带，本会话 4f859053 实证。三类信号：未归因文件、跨变更
    // 竞争、在途残留；hunk_gate warn 默认（警告）/error（阻断）/off。与「提交面夹带嫌疑
    // advisory」互补：advisory 在冻结面采集处看文件名，本门在 probes 执法看 hunk 与竞争面。
    try {
      const gate = readHunkGate(specBase)
      let committedForGate = []
      try {
        committedForGate = String(gitQuiet(cwd, ['diff', '--name-only', `${st.baseline_commit}..HEAD`]) || '')
          .split('\n').map((x) => x.trim().replace(/\\/g, '/')).filter(Boolean)
      } catch { /* 无 git/无基线 → 空面，模块内降级跳过 */ }
      const hunkResult = await runHunkAttributionGate({
        cwd, specBase, changeName: change, baselineCommit: st.baseline_commit,
        committedFiles: committedForGate, gitFn: gitQuiet, gate,
      })
      for (const line of renderHunkAttributionLines(hunkResult)) {
        if (line.startsWith('- ✅') || line.startsWith('- ℹ️')) console.log(`🔍 ${line.slice(2)}`)
        else if (line.startsWith('- ⚠️')) {
          if (gate === 'error') console.error(`❌ ${line.slice(2)}`)
          else console.warn(`⚠️ ${line.slice(2)}`)
        } else if (line.startsWith('- ❌')) console.error(`❌ ${line.slice(2)}`)
      }
      if (gate === 'error' && !hunkResult.ok) {
        console.error('   修复：未归因文件补 design 自声明或协调归属；竞争文件逐 hunk 核对后协调串行或拆分提交。清零后重跑（断点续）。')
        reportMidFail('probes')
        process.exit(1)
      }
    } catch (e) {
      console.warn(`⚠️ hunk 归属门异常（fail-soft 降级放行）：${(e && e.message) || e}`)
    }
    mark('probes')
  }

  // ④ distill：决策提炼（rejected/needsWait 异态 → 升厚留人工裁决，不静默吞）+ FR 索引提炼
  // （2026-09-22-thin-fr-distill-sync：轻量变更此前只蒸馏 decisions 不调 indexRequirements——
  // requirements 永不进 knowledge/fr，知识复利在新默认道断流；轻量变更无 design.md，域路由
  // 以基线以来交付 diff 供 deliverableFiles，伪域回退同口径）
  if (st.substeps?.distill === 'done') { skip('distill') } else {
    // 槽4收割（2026-09-25-thin-parity-assets：design「风险与死路」实质作答合成 decisions.md——
    // 轻量变更决策产出从零到一；已有 decisions 不覆盖）
    try {
      const { harvestSlot4Decision } = await import('./flow-parity.js')
      const h = harvestSlot4Decision({ changeDir, change })
      if (h.harvested) console.log(`🌱 槽4（风险与死路）收割 → decisions.md（随蒸馏链进 knowledge）`)
    } catch { /* 收割 best-effort */ }
    try {
      const { distillIntoKnowledge } = await import('./decision-distill.js')
      const knowledgeRoot = join(specBase, 'knowledge')
      const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
      const res = distillIntoKnowledge(changeDir, knowledgeRoot, typeof head === 'string' ? head.trim() : '', null)
      const abnormal = res && (res.rejected > 0 || res.needsWait > 0)
      if (abnormal) {
        writeFlowState(changeDir, { tier: 'thick', upgrade_reason: `distill 异态（rejected=${res.rejected} needsWait=${res.needsWait}）——升厚留人工裁决` })
        console.warn(`⚠️ distill 异态 → 已升厚档（tier=thick）。剩余流程按厚档走 run <stage> 完整仪式；归档子步仍将执行（厚档语义不跳过 plan.md 校验）。`)
      }
    } catch (e) {
      console.warn(`⚠️ distill best-effort 失败（不阻断归档链）: ${(e && e.message) || e}`)
    }
    // 测试绑定行落盘（2026-09-25-thin-patch-bindings）：requirements 绑定槽 → test-trace.json
    // （FR 局部锚/candidate/machine），紧接的 indexRequirements 发号后随既有归档提升铸全局。
    try {
      const { extractRequirementBindings } = await import('./flow-draft.js')
      const rows = extractRequirementBindings({ changeDir, change })
      if (rows.length > 0) {
        const { writeChangeTrace } = await import('./test-bindings.js')
        const w = writeChangeTrace(changeDir, change, rows)
        if (w.changed) console.log(`🔗 测试绑定行落盘：${rows.length} 行 → test-trace.json（随 indexRequirements 发号归档提升）`)
      }
    } catch (e) { console.warn(`⚠️ 测试绑定行落盘失败（fail-open）：${(e && e.message) || e}`) }
    try {
      const { indexRequirements } = await import('./fr-index.js')
      const knowledgeRoot = join(specBase, 'knowledge')
      const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
      const deliverableFiles = await attributedChangedFiles()
      // FR 重复嫌疑软门（2026-09-25-thin-fr-inject-parity）：brainstorm --done 判据迁轻量道——
      // 新 FR × 同域 active 标题重叠 ≥0.6 → advisory（承接或改标题双出路），不阻断 distill。
      try {
        const dup = await frDupGateFlow({ specBase, change, changeDir, files: deliverableFiles })
        if (dup.warn) console.warn(dup.warn)
      } catch { /* 软门 fail-open */ }
      const r = indexRequirements({ changeDir, knowledgeRoot, headHash: typeof head === 'string' ? head.trim() : '', deliverableFiles })
      if (r && Array.isArray(r.written) && r.written.length > 0) {
        console.log(`📚 FR 索引提炼：${r.written.map((w) => w.id).join('、')} → knowledge/fr/（域=${r.written[0].file}）`)
      }
    } catch (e) {
      console.warn(`⚠️ FR 索引提炼 best-effort 失败（不阻断归档链）: ${(e && e.message) || e}`)
    }
    mark('distill')
  }

  // ⑤ archive：归档经 runArchiveChain（thin 轻量工件面跳过 plan.md 硬校验；thick 不跳）
  if (st.substeps?.archive === 'done') { skip('archive') } else {
    // verify-result 机器回执（2026-09-25-thin-parity-assets：人类可读收口结论，随归档留档）
    try {
      const { renderVerifyReceipt } = await import('./flow-parity.js')
      let patchMeta = null
      try { patchMeta = JSON.parse(readFileSync(join(changeDir, 'change-patch.json'), 'utf8')) } catch { /* 无冻结件 */ }
      let traceCount = 0
      try { traceCount = (JSON.parse(readFileSync(join(changeDir, 'test-trace.json'), 'utf8')).rows || []).length } catch { /* 无锚行 */ }
      // 实测面回填（断点续跑 ledger 已 skip 时本轮 var 为 null——从 flow-state.gate_summary 回读。
      // 不回读 verify-runs/test-result.json：隔离快照模式的结果落在临时快照目录且收尾即清，不可靠）
      if (!gateSummaryText) {
        try {
          const stNow = readFlowState(changeDir)
          if (stNow && stNow.gate_summary) gateSummaryText = String(stNow.gate_summary) + '（断点续跑回读）'
        } catch { /* 回读失败留 — */ }
      }
      const headNow = gitQuiet(cwd, ['rev-parse', 'HEAD'])
      writeFileSync(join(changeDir, 'verify-result.md'), renderVerifyReceipt({
        change, baseline: st.baseline_commit, head: typeof headNow === 'string' ? headNow.trim() : null,
        gateSummary: gateSummaryText, review: reviewOutcome, traceCount, patchMeta,
        generatedAt: new Date().toISOString(),
      }))
      console.log('🧾 验证回执已合成：verify-result.md（随归档留档）')
    } catch (e) { console.warn(`⚠️ 回执合成失败（不阻断归档）：${(e && e.message) || e}`) }
    const { ProgressManager } = await import('./progress.js')
    const { runArchiveChain } = await import('./run/complete-handlers.js')
    // 锚定同 start（平台参数面）
    const { archiveDestDirName } = await import('./stage-contract.js')
    const pm = new ProgressManager()
    const date = new Date().toISOString().slice(0, 10)
    const destName = archiveDestDirName(date, change)
    const destDir = join(specBase, 'changes', 'archive', destName)
    await runArchiveChain({
      pm, cwd, specBase, changeName: change,
      srcDir: changeDir,
      destDir,
      skipPlanCheck: (st.born_face ?? st.tier) === 'thin',
    })
    // 归档后 changeDir 已搬走——后续子步标记随归档目录走（flow-state 随变更包留存审计）
    markDir = destDir
    mark('archive')
  }

  // ⑥ events：事件收口（watcher 观测旁路 best-effort 读回，非真相源）
  if (st.substeps?.events === 'done') { skip('events') } else {
    try {
      const eventsPath = join(runtimeRoot, `watcher-events-${change}.jsonl`)
      if (existsSync(eventsPath)) {
        const n = readFileSync(eventsPath, 'utf8').split('\n').filter(Boolean).length
        console.log(`📊 watcher 事件收口：${n} 条 provisional 事件在案（.runtime 留档，平台展示面）`)
      } else {
        console.log('📊 watcher 事件收口：无事件文件（观测旁路未在跑——best-effort，不影响裁决）')
      }
    } catch { /* 读回失败不阻断 */ }
    mark('events')
  }

  // ── 切片四收口面：路由信号醒目打印 + 遥测四列记一笔（advisory 定案——只记录不判罚）──
  const cfg = readFlowConfig(specBase)
  if (st.route_hint === 'thick') {
    console.warn(`🧭 route_hint: thick（机器稿改写比例 ${st.edit_ratio ?? '?'} > 阈值 ${cfg.editRatioThreshold}——决策覆盖度低，该走厚档；advisory 不强制，测绿已轻量档过）`)
    if (cfg.editRatioEnforcement === 'block') {
      console.error('❌ flow.edit_ratio_enforcement=block：超阈阻断 done（降阈/改走 thick/回退 advisory 三选一）')
      process.exit(1)
    }
  }
  appendTelemetry(reviewOutcome) // 成功收口（失败面已在各失败路径提前落账，appendTelemetry 单点）

  console.log(`📦 归档断点：全部子步完成，即将归档——agent 把收口结果（子步清单+评审结论+验证回执）给用户看。`)
  console.log(`✅ flow done 完成（2/2 协议调用收口）：${change}——${SUBSTEPS.length} 子步 ${doneList.join('、')}；change 已归档注销。`)
  // Git 历史整理指引（2026-09-25-thin-freeze-git-hygiene）：多轮中间提交可压扁为单提交——审计
  // 真相在 change.patch（sha256 锚定）与归档产物，不依赖历史形态；baseline 在 change-patch.json。
  try {
    const finalHead = gitQuiet(cwd, ['rev-parse', 'HEAD'])
    if (st.baseline_commit && typeof finalHead === 'string' && finalHead.trim() && finalHead.trim() !== st.baseline_commit) {
      console.log(`🧹 Git 历史可自由整理：多轮中间提交可压扁为单提交——git reset --soft ${st.baseline_commit.slice(0, 10)} && git commit -m "<最终提交信息>"`)
      console.log(`   审计真相已冻结在归档件 change.patch（sha256 锚定）+ verify-result + review.json，不依赖 git 历史；`)
      console.log(`   注：knowledge「最近确认」hash 为溯源快照，压扁后成孤儿引用属预期（非活引用）。`)
    }
  } catch { /* 指引 best-effort */ }
  // 平台同步（同 flow start 尾部接线——归档后的 docs/knowledge/FR 面随本轮回推平台）
  try { await triggerSync(cwd, change) } catch { /* 同步绝不阻断协议面 */ }
  return { change, substeps: doneList }
}

/** flow 命令族入口（index.js case 'flow' 接线）：flow start|done|amend-draft。 */
/**
 * flow approve（2026-10-04-thin-docs-v2 FR-06）：spec 断点用户批准留痕——用户确认 FR+design
 * 方案后由**用户**运行（不是 agent 代跑）；写 flow-state {spec_approved,spec_approved_at,
 * spec_approved_by}。flow done 的 v2 机器门消费该证据（未批准且未声明 autopilot → 拒收）。
 * 诚实边界：同机 agent 理论上也能跑本命令——门的价值是仪式+留痕（谁在何时批的）+评审抽查
 * 兜底，非绝对防伪；--by 显式署名供平台/脚本侧调用。
 */
async function cmdFlowApprove({ change, cwd, specBase, by = null }) {
  const changeDir = join(specBase, 'changes', change)
  if (!existsSync(changeDir)) {
    console.error(`❌ 变更不存在：${change}（flow approve 在 flow start 之后运行）`)
    process.exit(2)
  }
  let approvedBy = by
  if (!approvedBy) {
    try {
      const { resolveSessionIdentity } = await import('./progress.js')
      approvedBy = (resolveSessionIdentity({ cwd }) || {}).session || 'user'
    } catch { approvedBy = 'user' }
  }
  const at = new Date().toISOString()
  writeFlowState(changeDir, { spec_approved: true, spec_approved_at: at, spec_approved_by: approvedBy })
  console.log(`✅ spec 断点已批准（change=${change}）`)
  console.log(`   批准人：${approvedBy}｜时间：${at}`)
  console.log(`   flow done 的断点机器门已满足；agent 可继续执行/收口。撤销：编辑 flow-state.yaml 删除 spec_approved 三字段。`)
}

export async function cmdFlow(args, cwd, specDir = null, opts = {}) {
  const sub = args[0] || ''
  const rest = args.slice(1)
  // 全局 --json 透传（2026-10-06-flow-status-json）：index.js 顶层把 --json 从 filteredArgs
  // 剥进全局变量，flow 族此前在真实 CLI 入口下永远收不到该 flag（in-process 直调 cmdFlow 带
  // --json 才生效）——cmdFlowStart 的 json 信封成了死代码、status 无机器可读面。统一入口
  // 形状：第 4 参 opts.json 由 index.js 传入，与 args 内残余 --json（直调/测试路径）取或，
  // 两路同语义不分叉。
  const jsonGlobal = opts.json === true
  // 平台参数面（2026-09-25-thin-platform-args，平台侧三子代理核对驱动）：specBase 统一走
  // resolvePlatformSpecDir——显式 --spec-dir/--spec-root > .sillyspec-platform.json 指针（fail-closed，
  // 指针失效报错不静默回退本地防状态分裂）> 本地。此前 flow 族零平台支持：--spec-dir 是 ENOENT
  // 崩溃路径、指针不读、--spec-root 静默忽略——平台 thin 派发被完全挡住。
  const getFlag = (name) => {
    const i = rest.indexOf(name)
    return i !== -1 && i + 1 < rest.length ? rest[i + 1] : null
  }
  const hasFlag = (name) => rest.includes(name)
  let specBase
  try {
    const { resolvePlatformSpecDir } = await import('./progress.js')
    specBase = resolvePlatformSpecDir(cwd, specDir || getFlag('--spec-root'))
  } catch (e) {
    console.error(`❌ 平台 spec 根解析失败（fail-closed，不回退本地防状态分裂）：${(e && e.message) || e}`)
    console.error('   修复：重跑平台 scan 重建 .sillyspec-platform.json 指针，或显式传 --spec-dir <specRoot>')
    process.exit(2)
  }
  // --runtime-root 透传（start/done 内部 resolveRuntimeRoot 优先取 platformOpts.runtimeRoot）
  const runtimeRootOpt = getFlag('--runtime-root') || null
  // 变更名白名单（平台核对实证：穿越名 ../evil 实测逃逸、default/quick-<hex> 形态崩溃）——
  // 词字符/点/横线/连字符/中文，拒路径分隔符与点穿越；default 与 quick-<8hex> 是进度库辅助键
  // 非实体变更，flow 层直接拒收
  const validateChangeName = (name, exitCode = 2) => {
    const bad = !name || name === 'default' || /^quick-[0-9a-f]{8}$/.test(name)
      || !/^[\w.\-一-鿿]{1,120}$/.test(name) || name.includes('..') || /[\/]/.test(name)
    if (bad) {
      console.error(`❌ 非法变更名「${name}」——flow 族要求：词字符/点/横线/中文，无路径分隔符与 ..，非 default/quick-<hex> 辅助键（平台键 <日期>-<slug>-<hex6> 天然合法）`)
      process.exit(exitCode)
    }
  }
  // ── agent 会话日志登记 + 上报（2026-09-29-flow-agent-log-report，对齐 run 族）──
  // runCommand 入口统一调 recordAgentLogInvocation（run/command.js 同款）——run 族全量覆盖；
  // flow 走本独立入口此前从未接入，轻量变更的本地会话路径不上报平台（平台只见 CLI 阶段信息，
  // 看不到 agent 实际执行日志）。各子命令 change 解析后 best-effort 调用：探测 agent 环境
  // （Claude Code / Codex / ZCode transcript / SILLYSPEC_AGENT_LOG 覆盖）登记
  // <runtimeRoot>/agent-session-log.json 并 REST 上报（POST /api/agent-logs，own 打标/推送
  // 收敛/互斥语义复用同实现）。context.changeKey=flow change 名（flow 无 quick 会话概念，
  // quickId 恒空）；hubSessionId 走 env SILLYHUB_SESSION_ID（daemon 注入通道，与 run 同源）。
  // 推送上限 5s（PUSH_TIMEOUT_MS）、失败静默留底——best-effort，绝不阻断协议面。
  const reportAgentLog = async (changeKey, subName) => {
    try {
      const { recordAgentLogInvocation } = await import('./agent-session-log.js')
      const hubSessionIdEnv = typeof process.env.SILLYHUB_SESSION_ID === 'string' ? process.env.SILLYHUB_SESSION_ID.trim() : ''
      await recordAgentLogInvocation({
        cwd,
        platformOpts: runtimeRootOpt ? { runtimeRoot: runtimeRootOpt } : {},
        specBase,
        context: { hubSessionId: hubSessionIdEnv || null, changeKey: changeKey || null, quickId: null },
        // 只记 flag 名不记值（对齐 run 口径：--input 等 flag 值是 agent 工作文本，不进产物）
        command: [subName, ...rest.filter(t => typeof t === 'string' && t.startsWith('--'))].join(' '),
      })
    } catch { /* best-effort：登记失败不影响 flow 协议面 */ }
  }
  if (sub === 'start') {
    const change = getFlag('--change') || `${new Date().toISOString().slice(0, 10)}-flow-${Math.random().toString(16).slice(2, 6)}`
    validateChangeName(change)
    // 变更名日期前缀门禁（对齐 run/command.js 净新建门与 change-rename 门，brainstorm step6
    // 规则 CLI 化）：轻量道此前无此门，roadmap-copy-purge 实证无前缀名被照单物化入档，打乱
    // 归档字典序时间线。只拦净新建（changes/<名> 与 changes/archive/<名> 均不存在）；恢复/
    // 头脑风暴收编/平台 writer 预建空目录均目录在场不追诉（旧无前缀存量照常可续跑）。
    if (!existsSync(join(specBase, 'changes', change)) && !existsSync(join(specBase, 'changes', 'archive', change))) {
      try {
        assertDatedChangeName(change)
      } catch (e) {
        console.error(`❌ ${e.message}`)
        // 可照抄实例（2026-10-05-input-teach-copyable）：引号内换行合法，行级 trim 容忍缩进
        console.error('   重试（--input 引号内换行合法，可照抄）：')
        console.error('   sillyspec flow start --change <YYYY-MM-DD-简短描述> --input "<动机与背景>')
        console.error('')
        console.error('   成功标准：')
        console.error('   - <可验证标准>"')
        process.exit(2) // 用法错（净新建变更名缺日期前缀/格式非法）→ exit 2
      }
    }
    await reportAgentLog(change, sub)
    return cmdFlowStart({
      change,
      input: getFlag('--input') || undefined,
      title: getFlag('--title') || null,
      thick: hasFlag('--thick'),
      withTasks: hasFlag('--with-tasks'),
      reviewForce: hasFlag('--review') ? true : hasFlag('--no-review') ? false : null,
      autopilot: hasFlag('--autopilot'),
      cwd, specBase,
      json: hasFlag('--json') || jsonGlobal,
    })
  }
  if (sub === 'approve') {
    const change = getFlag('--change')
    if (!change) { console.error('❌ flow approve 需 --change <名>'); process.exit(2) }
    validateChangeName(change)
    await reportAgentLog(change, sub)
    return cmdFlowApprove({ change, cwd, specBase, by: getFlag('--by') || null })
  }
  if (sub === 'status') {
    // 三断点配套（2026-09-25-flow-checkpoints）：随时可查当前变更阶段/槽位/子步进度
    const change = getFlag('--change')
    if (!change) { console.error('❌ flow status 需 --change <名>'); process.exit(2) }
    validateChangeName(change)
    await reportAgentLog(change, sub)
    const changeDir = join(specBase, 'changes', change)
    const st = readFlowState(changeDir)
    // --json（2026-10-06-flow-status-json）：机器可读单对象输出——事实与人类渲染同源同判定，
    // 退出码同点（missing=1，其余=0），程序化消费方不再 fragile 文本匹配。
    // 入口双路：jsonGlobal 来自 index.js 全局透传（真实 CLI），hasFlag 覆盖直调/测试路径
    const json = jsonGlobal || hasFlag('--json')
    if (!st) {
      // 归档检测：归档后目录搬至 changes/archive/<日期>-<名>（原目录不存在）——查 archive 目录
      const archiveDir = join(specBase, 'changes', 'archive')
      let isArchived = false
      try {
        if (existsSync(archiveDir)) isArchived = readdirSync(archiveDir).some((e) => e === change) // 精确匹配（fr-governance-sweep：归档目录名恒等 change 名，includes 子串会把 flow-check 误命中 flow-checkpoints）
      } catch { /* best-effort */ }
      // 前置形态先归一（archived/dir-no-state/missing）——--json 与人类渲染共用同一判定，防两路径各算各的漂移
      const form = isArchived ? 'archived' : (existsSync(changeDir) ? 'dir-no-state' : 'missing')
      if (json) console.log(JSON.stringify({ change, status: form }))
      else if (form === 'archived') console.log(`📦 ${change}：已归档`)
      else if (form === 'dir-no-state') console.log(`📁 ${change}：变更目录在场但无 flow-state（可能头脑风暴预段产物，尚未进入轻量变更）`)
      else console.log(`❓ ${change}：变更不存在`)
      // exit 1（2026-10-05-flow-tail-polish）：查询目标缺失=运行错——exit 0 时脚本无法区分
      // 「存在但无进度」与「不存在」；在场两形态（已归档/目录在场）仍走上方形态路径 exit 0。
      // --json 与人类路径同点退出（分叉会让脚本消费方无法复用退出码判定）
      if (form === 'missing') process.exit(1)
      return
    }
    const subDone = SUBSTEPS.filter((k) => st.substeps?.[k] === 'done')
    const subLeft = SUBSTEPS.filter((k) => st.substeps?.[k] !== 'done')
    // 变更标题（2026-10-06-flow-status-title）：flow start/--title 写入进度库，status 只读回显
    // （getChangeTitle 前置判 DB 在场——只读查询不建库；读取失败按无标题渲染，输出与现状一致）
    let changeTitle = null
    try {
      const { ProgressManager } = await import('./progress.js')
      changeTitle = new ProgressManager({ specDir: specBase }).getChangeTitle(cwd, change)
    } catch { /* 标题 best-effort */ }
    // 槽位快检
    let designFilled = false, frFilled = false, bindingsFilled = 0, bindingsTotal = 0
    try {
      const dText = readFileSync(join(changeDir, 'design.md'), 'utf8')
      // 双格式：v1 AGENT 槽计数；v2 纯 markdown 按节「有实质作答」判（复用 flow-review 的
      // v2 节读取——问题原文行剥离；仅标题在场不算已填，防 spec 相位误跳「②执行」）
      if (/<!--AGENT:槽\d+/.test(dText)) {
        designFilled = Array.from(dText.matchAll(/<!--AGENT:槽\d+[^\n]*-->\n(\S)/g)).length >= 3
      } else {
        try {
          const { readV2SectionAnswer } = await import('./flow-review.js')
          const { DESIGN_QUESTIONS } = await import('./flow-draft.js')
          designFilled = DESIGN_QUESTIONS.sections.filter((s) => readV2SectionAnswer(dText, s.heading, DESIGN_QUESTIONS)).length >= 3
        } catch { designFilled = false }
      }
    } catch { /* 无 design */ }
    try {
      const rText = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
      frFilled = /### FR-\d+:/.test(rText.replace(/<!--[\s\S]*?-->/g, ''))
      if (/<!--AGENT:测试绑定FR-\d+/.test(rText)) {
        bindingsTotal = (rText.match(/<!--AGENT:测试绑定FR-\d+/g) || []).length
        bindingsFilled = (rText.match(/<!--AGENT:测试绑定FR-\d+[^\n]*-->\n\S/g) || []).length
      } else {
        // v2 纯文本行：`FR-NN: 内容`（（待填=未答）
        const _rows = [...rText.matchAll(/^(FR-\d{2}):\s*(.*)$/gm)]
        bindingsTotal = _rows.length
        bindingsFilled = _rows.filter((m) => m[2].trim() && !m[2].trim().startsWith('（待填')).length
      }
    } catch { /* 无 requirements */ }
    // 阶段推断
    let phase = '① spec（填 FR + design 槽）'
    if (designFilled && frFilled && bindingsFilled >= bindingsTotal && bindingsTotal > 0) phase = '② 执行（写代码跑测试）→ ①卡点：spec 摘要给用户确认'
    if (subDone.includes('ledger')) phase = '③ 归档（flow done 收口）'
    // 任务心跳（2026-09-29-flow-task-heartbeat + d007-incontext 纠偏）：②执行阶段把「下一个任务」
    // 交给机器指——当场重读 tasks.md（唯一进度源）取第一个未勾行 + 进度。进度推进本身零 CLI
    // （做一件→勾一格→继续下一条，D-007 中间零协议必需交互）；本面是自愿查看/恢复面——用户
    // 问进度、断点续跑时一次调用拿到指针。全勾改指 flow done；勾选证据口径不变（哨兵逐 task）。
    let heartbeat = null
    try {
      if (phase.startsWith('②')) {
        const t = readFileSync(join(changeDir, 'tasks.md'), 'utf8')
        const c = (t.match(/^- \[x\]/gm) || []).length
        const tot = (t.match(/^- \[( |x)\]/gm) || []).length
        const next = t.split(/\r?\n/).find((l) => /^- \[ \] (task-\d+):/.test(l))
        if (tot > 0 && next) {
          const m = next.match(/^- \[ \] (task-\d+):\s*(.*)$/)
          heartbeat = [
            `   ⏭️ 下一任务：${m[1]} ${String(m[2] || '').slice(0, 60)}`,
            `   ✅ 进度：${c}/${tot}——边干边勾：做一件 → 勾一格（- [ ] → - [x]）→ 继续下一条（tasks.md 是进度源，勿攒一把勾；收口哨兵逐 task 核证据）。本面为自愿查看/恢复面——中间零协议必需交互（D-007）`,
          ]
        } else if (tot > 0 && c >= tot) {
          // 全勾判定用 c>=tot 而非「找不到未勾 task-NN 行」——行形态漂移（未勾行缺 task-NN
          // 前缀）时宁可静默不出心跳，不误刷「任务全勾」催 flow done（评审 P3）
          heartbeat = [`   ✅ 任务全勾（${c}/${tot}）——跑 flow done 收口（哨兵逐 task 核对提交 token/review.json 证据）`]
        }
      }
    } catch { /* 心跳 fail-soft */ }
    // 任务勾选预计算（--json 与人类渲染共用同源；正则与原内联 IIFE 逐字一致；hasTasks 保住
    // 「缺 tasks.md 时不渲染该行」的现状——人类输出不得因本变更变形）
    let tasksChecked = 0, tasksTotal = 0, hasTasks = false
    try {
      const t = readFileSync(join(changeDir, 'tasks.md'), 'utf8')
      hasTasks = true
      tasksChecked = (t.match(/^- \[x\]/gm) || []).length
      tasksTotal = (t.match(/^- \[( |x)\]/gm) || []).length
    } catch { /* 无 tasks.md */ }
    if (json) {
      console.log(JSON.stringify({
        change, status: 'active', phase, title: changeTitle,
        designFilled, frFilled, bindingsFilled, bindingsTotal,
        tasksChecked, tasksTotal,
        substeps: subDone, substepsTotal: SUBSTEPS.length,
        ...(st.legacy_fallback ? { legacyFallback: true } : {}),
      }))
      return
    }
    console.log([
      `📋 ${change}`,
      ...(changeTitle ? [`   标题：${changeTitle}`] : []),
      `   阶段：${phase}`,
      `   design 槽：${designFilled ? '✅ 已填' : '⬜ 未填'}｜FR 区：${frFilled ? '✅ 已填' : '⬜ 未填'}｜绑定槽：${bindingsFilled}/${bindingsTotal}`,
      hasTasks ? `   任务勾选：${tasksChecked}/${tasksTotal}` : null,
      ...(heartbeat || []),
      `   子步：${subDone.length}/${SUBSTEPS.length}${subDone.length > 0 ? `（${subDone.join('、')}）` : ''}`,
      subLeft.length > 0 ? `   待办：${subLeft.join('、')}` : '',
      st.legacy_fallback ? `   ⚠️ 已升厚（legacy_fallback）——剩余流程走 run <stage>` : '',
    ].filter(Boolean).join('\n'))
    return
  }
  if (sub === 'done') {
    const change = getFlag('--change')
    if (!change) { console.error('❌ flow done 需 --change <名>'); process.exit(2) }
    validateChangeName(change)
    await reportAgentLog(change, sub)
    // --refreeze（2026-09-25-sentinel-evidence-freeze ⑤）：重置 patch 子步标记强制下次重冻结
    // （冻结面归属有误时的人工逃生口——提交面已不过 foreign 切分，dirty 面排除有警告指引到此）
    if (hasFlag('--refreeze')) {
      const cd = join(specBase, 'changes', change)
      const stRf = readFlowState(cd)
      if (stRf) {
        writeFlowState(cd, { substeps: { patch: null } })
        console.log('🔄 --refreeze：patch 子步标记已重置，本次 done 将重新冻结（change.patch 按 baseline..HEAD 最新面重建）')
      }
    }
    return cmdFlowDone({ change, cwd, specBase, runtimeRootOpt, freezeDirty: hasFlag('--freeze-dirty'), acceptDirtyGap: hasFlag('--accept-dirty-gap'), allowBatchTick: hasFlag('--allow-batch-tick') })
  }
  if (sub === 'amend-draft') {
    // 机器稿唯一留痕修改通道（R7 切片三 / FR-08）：重锚哈希 + ledger amendment 审计；
    // 首版原文 body 永存（切片四 editRatio 基准）。
    const change = getFlag('--change')
    if (!change) { console.error('❌ flow amend-draft 需 --change <名>'); process.exit(2) }
    // 变更名白名单与 start/status/done 同门（评审 P1 修复：amend-draft 此前无校验，未检字符串
    // 会经 reportAgentLog 的 context.change_key 进产物与平台上报——与「白名单名无注入面」的设计声明对齐）
    validateChangeName(change)
    await reportAgentLog(change, sub)
    const changeDir = join(specBase, 'changes', change)
    const runtimeRoot = resolveRuntimeRoot({}, specBase)
    const { amendFlowDraft } = await import('./flow-draft.js')
    const r = amendFlowDraft({ changeDir, change, runtimeRoot })
    if (r.reanchored.length === 0) {
      console.error('（无可重锚机器稿——draft ledger 不在案或稿件无标记段）')
      process.exit(1)
    }
    // 切片四：editRatio 路由信号（D-005 advisory 定案——测绿可轻量档过；超阈提示+route_hint 落档）
    const cfg = readFlowConfig(specBase)
    // 路由信号取段级最大改写比（任一段过半=该段决策未被输入覆盖——聚合比会被未改段稀释）；
    // 段级明细 sectionRatios 已随 amendment 入 ledger，遥测可见。
    const maxRatio = Math.max(0, ...Object.values(r.sectionRatios || {}))
    if (maxRatio > cfg.editRatioThreshold) {
      writeFlowState(changeDir, { route_hint: 'thick', edit_ratio: maxRatio })
      console.warn(`⚠️ route_hint: thick——机器稿段级最大改写比例 ${maxRatio}（阈值 ${cfg.editRatioThreshold}）：决策覆盖度低，该走厚档（advisory：测绿可轻量档过，不强制；flow done 将醒目提示+遥测记账）`)
    } else {
      writeFlowState(changeDir, { edit_ratio: maxRatio })
    }
    console.log(`✅ flow amend-draft 留痕重锚：${r.reanchored.join('、')}——ledger amendment 审计在案；editRatio=${maxRatio}（段级最大；基准=首版原文，AGENT 槽不计入）`)
    return r
  }
  console.error('用法: sillyspec flow start --change <名> --input "<动机与背景＋独立一行『成功标准：』＋每行一条『- 可验证标准』>" [--thick|--with-tasks] | sillyspec flow done --change <名> | sillyspec flow status --change <名> [--json]')
  console.error('      --input 可照抄形态（引号内换行合法）：')
  console.error('      sillyspec flow start --change <名> --input "<动机与背景>')
  console.error('')
  console.error('      成功标准：')
  console.error('      - <可验证标准>"')
  process.exit(2)
}

export default { cmdFlow, cmdFlowStart, cmdFlowDone, readFlowState, writeFlowState, readFlowConfig }
