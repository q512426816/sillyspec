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
import { existsSync, readFileSync, writeFileSync, readdirSync, appendFileSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { runtimeStatePath, runtimeTempPath } from './runtime-paths.js'
import { join, relative, dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import yaml from 'js-yaml'
import { git, gitQuiet } from './git-helper.js'
import { writeAtomicSync } from './fs-atomic.js'
import { resolveRuntimeRoot, triggerSync, triggerSyncTerminalStrict, assertDatedChangeName } from './run/shared.js'
import { detectUiTouch, buildUiGuidanceLines, runUiVisualProbe, readUiVisualGate, UI_EVIDENCE_FILENAME } from './ui-visual.js'
import { runHunkAttributionGate, readHunkGate, renderHunkAttributionLines } from './hunk-attribution.js'
// 2026-10-13-thin-sync-stage：FLOW_STATE_FILE/readFlowState 单一源上移叶子模块 flow-state.js
// （progress.js 同步投影也要读；叶子化避免 progress.js 为读一个状态文件拉入本协议整条
// 依赖链——评审 P3 勘误：非静态循环依赖，本文件 import 闭包实测不达 progress.js）；
// re-export 保持 `import('../flow.js')`（run/command.js 既有动态引用）导出面不变。
import { FLOW_STATE_FILE, readFlowState } from './flow-state.js'
export { FLOW_STATE_FILE, readFlowState }

const SUBSTEPS = ['artifacts', 'ledger', 'patch', 'review', 'probes', 'distill', 'archive', 'events']

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

/** 批准通道取值（2026-10-12-approve-channel-attest）：flow done 回显与遥测同源——历史变更
 *  无 channel 字段时归一 unattested-legacy（2026-10-12 之前真批/自批不可区分的留痕形态），
 *  autopilot 是用户显式豁免通道非批准。三态封闭集（user-confirmed/agent-self/unattested）是
 *  治理域（谁在主张批准），不承载内容语义——开放内容走 spec_rejected_reason 自由文本。 */
export function approveChannelOf(st) {
  const s = st || {}
  if (s.autopilot) return 'autopilot'
  if (s.spec_approved_channel) return String(s.spec_approved_channel)
  return s.spec_approved ? 'unattested-legacy' : 'none'
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
    // module_gate_ignore（2026-10-12-thin-module-gate-and-feed）：未登记目录软门的固定忽略清单，
    // 单行逗号串（目录前缀，posix）——列表块形态不支持，readFlowConfig 同款逐键正则防线
    const ig = raw.match(/^\s*module_gate_ignore\s*:\s*(.+)$/m)
    return {
      mode,
      editRatioThreshold: th ? Number(th[1]) : 0.5,
      editRatioEnforcement: en ? en[1] : 'advisory',
      moduleGateIgnore: ig ? ig[1].split(',').map((s) => s.trim()).filter(Boolean) : [],
    }
  } catch {
    return { mode: 'thin', editRatioThreshold: 0.5, editRatioEnforcement: 'advisory', moduleGateIgnore: [] }
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
 * 轻量道知识注入查询串瘦身（2026-10-15-thin-query-slim）：--input 的「成功标准：」段是验收
 * 判据语料（文件路径/测试名/断言词——对知识匹配是纯噪音，且路径词会过触路由关键词把命中面
 * 撑爆：本仓实证整段 input 匹配出 76 条目、58 个 fr 域文件全命中）。查询只取动机段——
 * 「成功标准：」标记前正文；标记缺席=无标准段，全文照旧（兼容旧形态）；标记前为空白则退全 input。
 * @param {string} change 变更名（查询首行，既有口径）
 * @param {string} input --input 全文
 * @returns {string} 瘦身后的查询串
 */
export function thinKnowledgeQuery(change, input) {
  const raw = String(input || '')
  const markerIdx = raw.search(/成功标准[:：]/)
  const motivation = markerIdx >= 0 ? raw.slice(0, markerIdx) : raw
  const body = motivation.trim() || raw.trim()
  return `${change || ''}\n${body}`
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
    const { deathPathNote, decisionChangeQualifier } = await import('./knowledge-match.js')
    // scope 遍历召回（2026-10-08-knowledge-graph，FR-04）：touched=机器算的图查询键
    // （filesOverride ∪ design 交付表——上方既有变量），词面三层零命中时沿强边保底防复潮
    const kmQuery = thinKnowledgeQuery(change, input)
    const km = await matchKnowledgeHybrid(knowledgeRoot, kmQuery, { cwd: dirname(specBase), scopeFiles: touched })
    // 防复潮面 = 死路注记 ∪ 有主题重叠的 rejected（2026-09-28-knowledge-inject-ranking 起 rejected∪死路；
    // 2026-09-28-knowledge-gate-denoise 收紧：score 零的 rejected 与查询零主题重叠——空标题条目靠状态
    // 蹭进回显是行为实测三例的噪音源，不再注入）
    const rejected = (km.decisionHits || []).filter((h) => h.deathPath || (h.status === 'rejected' && h.score > 0))
    summary.rejectedDecisions = rejected.length
    summary.knowledgeEntries = km.matched ? (km.entries || []).length : 0
    if (rejected.length > 0) {
      lines.push(`   ⚠️ 否决决策/死路注记（历史已否决或已记死路，防复潮——除非复潮条件满足勿重提，复潮须在本变更 decisions.md 记新版本；跨变更引用带变更名 变更名#D-xxx@vN）：`)
      for (const h of rejected.slice(0, 5)) {
        const note = h.status === 'rejected' ? (h.reason || '（未记录）') : `死路——${deathPathNote(h.reason)}`
        lines.push(`   - ${h.id} ${h.title}（${h.file}｜${decisionChangeQualifier(h.change)}）${h.status === 'rejected' ? '否决理由' : '⚰️'}：${note}`)
      }
    }
    if (km.matched && (km.entries || []).length > 0) {
      const src = km.entries.slice(0, 3).map((e) => (e.anchor ? `${e.file}#${e.anchor}` : e.file)).join('；')
      lines.push(`   📚 知识命中（INDEX 关键词，按需 Read）：${src}`)
    }
    // 遥测导线（2026-10-15-thin-inject-telemetry）：轻量道注入此前不落 hits.jsonl——thin 常态化后
    // inject 事件流断流（本仓 10-09 后归零实证），knowledge stats 从未命中判定被盲区污染。
    // 分级字段（A2-lite）：injectedFiles=正文实际注入（thin 面恒空——只出按需 Read 行）、
    // mentionedFiles=显式展示给 agent 的锚点（📚 行 top-3）。既有 matchedFiles 口径不变
    // （knowledge-stats 消费面零回归）。仅命中面非空才落盘；fail-soft（R-04）不阻断注入。
    const thinMatchedFiles = km.matched ? (km.entries || []).map((e) => (e.anchor ? `${e.file}#${e.anchor}` : e.file)) : []
    if (thinMatchedFiles.length > 0 || rejected.length > 0) {
      try {
        const { appendKnowledgeHit } = await import('./knowledge-hits.js')
        appendKnowledgeHit(join(specBase, '.runtime'), {
          type: 'inject',
          change,
          query: kmQuery,
          matchedFiles: thinMatchedFiles,
          injectedFiles: [],
          mentionedFiles: thinMatchedFiles.slice(0, 3),
          rejectedCount: rejected.length,
          source: 'thin-start',
        })
      } catch { /* 遥测 fail-soft（R-04）：hits 落盘失败不影响注入本体 */ }
    }
    if (domains.length === 0 && rejected.length === 0 && !km.matched) {
      lines.length = 0
      lines.push(`🧠 知识注入（轻量道读取面）：语料未命中知识库（无触达域依据、无否决命中、INDEX 无对齐条目）——可自行查 knowledge/INDEX.md。`)
    }
    // 向量开关发现性提示（2026-10-15-vector-switch-discoverability）：零命中=正需要语义召回
    // 而未获得的时刻——平台已连接但开关未开（缺省关）时给一行可执行提示；有命中/未连接/
    // 已开启零新增（vectorSwitchHint 单源，同款提示也挂 knowledge search hint 键）。
    if (!km.matched && rejected.length === 0) {
      try {
        const { vectorSwitchHint } = await import('./knowledge-vector.js')
        const hint = vectorSwitchHint(dirname(specBase))
        if (hint) lines.push(`   ${hint}`)
      } catch { /* 提示 fail-open */ }
    }
    // 模块卡欠账提示前移（2026-10-12-thin-module-gate-and-feed 三档）：触碰命中模块 behind>0
    // 才出事实行——动手前看到「你要动的卡已落后」比收口时警告有效；computeDocsDebt（厚道
    // execute {DOCS_DEBT}）同源，空债/无图零输出，异常走外层 catch fail-open 不阻断 start。
    if (touched.length > 0) {
      try {
        const { renderThinDocsDebt } = await import('./flow-parity.js')
        const debtLines = renderThinDocsDebt({ specBase, projectRoot: dirname(specBase), changedFiles: touched })
        if (debtLines.length > 0) lines.push(...debtLines)
      } catch { /* 欠账计算 fail-open */ }
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
/**
 * flow diff —— change 粒度文件统计只读查询（2026-10-13-flow-diff-cmd）。
 * 双态同构：归档态读 change-patch.json scopeAudit（冻结时点真相，含 verdict）；活跃态实时算
 * baseline→工作树 累计口径（与 patch 子步冻结面同规则：filterCommittedFace 剔 ownPrefix 治理件
 * 保 .sillyspec/docs/；行数 git numstat，untracked 按文件行数、二进制 ∅）。只读零副作用：
 * 不 pull（无 triggerPullActiveChange）、不写盘、不动状态机——scan diff 同纪律。
 * rows[].state：committed（工作树==HEAD）/ dirty（有未提交改动）/ untracked / archived。
 */
async function cmdFlowDiff({ change, cwd, specBase, json = false }) {
  const toPosix = (p) => String(p).replace(/\\/g, '/')
  const activeDir = join(specBase, 'changes', change)
  const archiveJson = join(specBase, 'changes', 'archive', change, 'change-patch.json')
  const rows = []
  let mode = null
  let baseline = null
  if (existsSync(archiveJson)) {
    mode = 'archived'
    try {
      const meta = JSON.parse(readFileSync(archiveJson, 'utf8'))
      const sa = meta.scopeAudit || {}
      for (const r of (sa.rows || [])) {
        if (!r || !r.path) continue
        rows.push({ path: toPosix(r.path), additions: Number.isFinite(r.additions) ? r.additions : null, deletions: Number.isFinite(r.deletions) ? r.deletions : null, state: 'archived', verdict: r.verdict || null })
      }
      const t = (sa.totals && sa.totals.files != null) ? sa.totals : meta.totals
      var archivedTotals = (t && typeof t === 'object') ? { files: t.files ?? rows.length, additions: t.additions ?? null, deletions: t.deletions ?? null } : null
    } catch { /* 损坏件 → 按活跃态兜底（下方 activeDir 分支不命中则报不存在） */
      mode = null
    }
  }
  if (mode === null && existsSync(join(activeDir, 'flow-state.yaml'))) {
    mode = 'active'
    const st = readFlowState(activeDir)
    baseline = st?.baseline_commit || null
    if (baseline) {
      const ownPrefix = `.sillyspec/changes/${change}/`
      const committedRaw = String(gitQuiet(cwd, ['diff', '--name-only', `${baseline}..HEAD`]) || '').split('\n').map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean)
      const { filterCommittedFace } = await import('./flow-parity.js')
      const committed = filterCommittedFace(committedRaw, ownPrefix)
      // dirty 面（含 untracked）：porcelain 全列，交付规则同冻结面（.sillyspec/ 剔、.sillyspec/docs/ 保、ownPrefix 剔）
      // ⚠ 行不可 trim——porcelain 前导状态码含空格（' M x'）；git() 默认整段 trim 会吃掉首行
      // 前导空格（实测 ' M work.txt' → 'M work.txt' → slice(3) 错位吃路径首字符），须 trim:false
      const por = String(gitQuiet(cwd, ['status', '--porcelain', '-uall'], { trim: false }) || '').split('\n').filter((s) => s.length >= 4)
      const dirtyState = new Map() // path -> 'dirty' | 'untracked'
      for (const line of por) {
        const xy = line.slice(0, 2)
        const raw = line.slice(3).trim()
        const path = toPosix(raw.includes(' -> ') ? raw.split(' -> ').pop() : raw)
        if (!path || path.startsWith(ownPrefix)) continue
        if (path.startsWith('.sillyspec/') && !path.startsWith('.sillyspec/docs/')) continue
        dirtyState.set(path, xy === '??' ? 'untracked' : 'dirty')
      }
      const face = [...new Set([...committed, ...dirtyState.keys()])]
      // 累计口径 numstat：baseline → 工作树（无 HEAD 上限，含未提交；untracked 不入 git diff 单独算）
      const tracked = face.filter((f) => dirtyState.get(f) !== 'untracked')
      const nsOut = String(gitQuiet(cwd, ['diff', '--numstat', baseline, '--', ...tracked]) || '')
      const ns = new Map()
      for (const l of nsOut.split('\n').filter(Boolean)) {
        const [a, d, ...rest] = l.split('\t')
        if (rest.length === 0) continue
        ns.set(toPosix(rest.join('\t')), { additions: /^\d+$/.test(a) ? Number(a) : null, deletions: /^\d+$/.test(d) ? Number(d) : null })
      }
      for (const f of face) {
        const st3 = dirtyState.get(f)
        if (st3 === 'untracked') {
          try {
            const buf = readFileSync(join(cwd, f))
            const text = buf.toString('utf8')
            const lines = text.split('\n')
            if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
            rows.push({ path: f, additions: buf.includes(0) ? null : lines.length, deletions: null, state: 'untracked' })
          } catch { rows.push({ path: f, additions: null, deletions: null, state: 'untracked' }) }
        } else {
          const s = ns.get(f)
          rows.push({ path: f, additions: s ? s.additions : null, deletions: s ? s.deletions : null, state: st3 === 'dirty' ? 'dirty' : 'committed' })
        }
      }
    }
  }
  if (mode === null) {
    console.error(`❌ 变更「${change}」不存在（活跃 flow-state 与归档 change-patch.json 均未找到）`)
    console.error('   修复：sillyspec status 查变更列表核对拼写/日期前缀；归档变更名与归档目录名逐字一致')
    process.exit(1)
  }
  const totals = mode === 'archived' && archivedTotals
    ? archivedTotals
    : { files: rows.length, additions: rows.reduce((s, r) => s + (r.additions || 0), 0), deletions: rows.reduce((s, r) => s + (r.deletions || 0), 0) }
  if (json) {
    console.log(JSON.stringify({ change, mode, baseline, rows, totals }))
    return
  }
  if (mode === 'active' && !baseline) {
    console.log(`📦 flow diff — ${change}（active）：无 git 基线（无历史仓）——无可对账面`)
    return
  }
  console.log(`📐 flow diff — ${change}（${mode}${mode === 'active' ? `｜baseline ${String(baseline).slice(0, 8)}→工作树` : '｜flow done 冻结件'}）`)
  for (const r of rows) {
    const a = r.additions == null ? '   ∅' : `+${String(r.additions).padStart(4)}`
    const d = r.deletions == null ? '   ∅' : `-${String(r.deletions).padStart(4)}`
    const tag = r.state === 'dirty' ? '（未提交）' : r.state === 'untracked' ? '（未跟踪·新文件）' : r.state === 'archived' && r.verdict ? `｜${r.verdict}` : ''
    console.log(`  ${a} ${d}  ${r.path}${tag}`)
  }
  console.log(`合计：${totals.files} 文件 +${totals.additions ?? '?'} -${totals.deletions ?? '?'}${mode === 'active' ? '（baseline→工作树累计口径，含未提交）' : ''}`)
}

/**
 * 升厚行值重置（坑 thin-upgrade-stale-stage-window，2026-10-13）：升厚只写 flow-state
 * 不碰 DB 行——行值残留 'thin'（平台 pull 往返透传形态）时，serializeForSync 的 thin 投影
 * 在首次 run <stage> 前持续误标平台「轻量」出身（短窗展示面失真）。升厚三写点统一调本
 * helper：行 current_stage 'thin' → 'brainstorm'（厚档起点，与 run 阶段机首写同值），
 * 仅 thin 值才动（其余行值不越权重置）。best-effort 不阻断升厚链。
 */
function resetThinStageRowOnUpgrade(cwd, change, specBase = null) {
  try {
    // cmdFlowDone 作用域无共享 ProgressManager——helper 直走底层数据库文件（node:sqlite）
    // 零依赖；specBase 优先（与 flow 侧锚定同口径，平台模式 specRoot 异位不迷路）
    const db = new DatabaseSync(join(specBase || join(cwd, '.sillyspec'), '.runtime', 'sillyspec.db'))
    try {
      const row = db.prepare('SELECT current_stage FROM changes WHERE name = ?').get(change)
      if (row && row.current_stage === 'thin') {
        db.prepare('UPDATE changes SET current_stage = ? WHERE name = ?').run('brainstorm', change)
        console.log('   ↺ 升厚重置 DB 行 current_stage: thin → brainstorm（防平台短窗误标轻量出身）')
      }
    } finally {
      try { db.close() } catch { /* 关闭失败不放大 */ }
    }
  } catch { /* 行值重置 best-effort，不阻断升厚 */ }
}

export async function cmdFlowStart({ change, input, title: titleFlag = null, thick = false, withTasks = false, reviewForce = null, autopilot = false, prestageAck = false, turbo = false, cwd, specBase, runtimeRootOpt = null, json = false }) {
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
        // 预段反馈闭环（2026-10-14-prestage-consent-gate）：走了头脑风暴预段=选道正确，
        // 消费 route-hindsight 标记（同意门的一次性豁免在这里用掉，无声明 flag 也放行）
        try {
          const { clearHindsightMark } = await import('./route-hindsight.js')
          if (clearHindsightMark({ specBase })) console.log('🕰️ 预段同意门：头脑风暴收编即选道正确，route-hindsight 标记已消费')
        } catch { /* 消费 best-effort */ }
        const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
        const baseline = typeof head === 'string' && head.trim() ? head.trim() : null
        writeFlowState(changeDir, { tier: 'thin', born_face: 'thin', adopted_from: 'brainstorm', review_force: reviewForce, baseline_commit: baseline, substeps: {},
          // 极速模式留痕（2026-10-14-thin-turbo-mode D-005）：--turbo 用户显式触发声明性落盘；
          // flow done 读态以 turbo && tier!=='thick' 判定（D-007 升厚即失效）
          ...(turbo ? { turbo: true, turbo_since: new Date().toISOString() } : {}) })
        try {
          const { redraftMissingArtifacts, ensureBindingSlots } = await import('./flow-draft.js')
          const r = redraftMissingArtifacts({ changeDir, change, input: null, runtimeRoot })
          if (r.drafted.length > 0) console.log(`📌 收编补生成缺失机器稿：${r.drafted.join('、')}（brainstorm 未产的工件机器补齐，criteria 从 proposal 成功标准回提；已存在文件未动）`)
          const b = ensureBindingSlots({ changeDir })
          if (b.appended) console.log(`📌 收编追加测试绑定槽 ${b.slots} 枚（brainstorm requirements 无绑定面——动码前作答，flow done 校验）`)
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
          if (w.status === 'spawned') console.log(`🔄 [watcher] 观测旁路已拉起：事件流 .sillyspec/.runtime/state/watcher-events-${change}.jsonl（恒带 provisional:true）`)
        } catch { /* 观测旁路 best-effort */ }
        // adopt 标题（2026-09-29；2026-10-16-short-change-title 提炼；2026-10-16-title-range-gate
        // 硬区间 10-30）：头脑风暴 proposal H1 人写语义标题（纯模板 H1 回退动机首句）→ --title
        // 优先（合区间校验，超界 exit 2）→ --input 首行提炼 → 兜底变更名。收编是既成事实的
        // 延续面，非 flag 的超界不硬断（收编半态不可恢复）打 ⚠️ 强提示。
        try {
          const { deriveTitleFromLinkedChange, deriveShortChangeTitle, isValidChangeTitle, shortTitleRejectMessage, shortTitleRangeWarnLine } = await import('./quicklog.js')
          if (titleFlag && !isValidChangeTitle(titleFlag)) {
            console.error(shortTitleRejectMessage(titleFlag))
            process.exit(2)
          }
          const adoptTitle = titleFlag || deriveTitleFromLinkedChange(specBase, change) || deriveShortChangeTitle(input) || change
          pm.initChange(cwd, change, { title: adoptTitle })
          const _arow = pm._ensureDB(cwd).getDb().prepare('SELECT title FROM changes WHERE name = ?').get(change)
          if (_arow && !_arow.title) pm.updateChangeMeta(cwd, change, { title: adoptTitle })
          console.log(`🏷️ 变更标题：${adoptTitle}（收编自头脑风暴产物；重入 --title 可改）`)
          if (!isValidChangeTitle(adoptTitle)) console.log(shortTitleRangeWarnLine(adoptTitle))
        } catch { /* adopt 标题 best-effort */ }
        const materials = materialPaths(specBase, change, changeDir)
        const artifacts = changeArtifactPaths(changeDir)
        const prototypePaths = artifacts.filter((p) => /\.html$/i.test(p))
        // 知识注入（2026-09-25-thin-fr-inject-parity）：adopt 路径域路由走 design.md 交付清单
        let digestLines = []
        try { digestLines = (await flowKnowledgeDigest({ specBase, change, changeDir, input: null })).lines } catch { /* 注入 best-effort */ }
        console.log([
          `🧲 头脑风暴产物已收编进轻量跑道: ${change}（adopted_from=brainstorm，baseline=${baseline ? baseline.slice(0, 10) : '（无 git 历史）'}）`,
          // 极速指引行（2026-10-14-thin-turbo-mode FR-01）：--turbo 在场才输出，缺省路径逐字不变
          ...(turbo ? [`⚡ 极速模式（用户显式触发）：只产 spec+代码，收口自动跳过实测与重仪式门（必留面照常）；本次收口不含测试客观核验`] : []),
          `══════════════════════════════════════`,
          `📖 必读（头脑风暴产出——方案的承诺锚，先读完再动手）：`,
          ...artifacts.map((p) => `   - ${p}`),
          prototypePaths.length > 0
            ? `🖼️ 原型在场（${prototypePaths.length} 个 HTML）：实现前必看，界面/交互/流程按原型对齐；有出入以 design.md 承诺为准并在回复中说明。`
            : null,
          `【你要做的】① spec 阶段先定稿任务面：把 tasks.md 改写为工作分解（每行=可独立完成并当场验证的一步：做什么+怎么验证；全 \`- [ ]\`——代码开动前工作队列先存在）；`,
          `🛑 断点①（机器门）：spec 面（任务面+测试绑定槽）定稿后把摘要给用户看 → flow approve --change ${change}（或用户显式 --autopilot）——批准后才动码。design 四节槽收编豁免（以 brainstorm design 为准）。`,
          `② 执行走任务循环：对 tasks.md 每个 pending 行——展示「Working on task N/M: <任务>」→ 做 → 测试绿后当场勾一格（\`- [ ]\`→\`- [x]\`：sillyspec task tick --change ${change} --task task-NN 或直接 Edit）→ 下一行；全勾后 flow done（收口硬门拒单拍多格勾选）。design/decisions 是本变更的承诺锚（flow done 豁免 design 四节槽，以其为准）。`,
          `requirements 测试绑定槽（收编追加）每条 FR 至少一行作答；写码前作答（动码前，与任务面定稿同批）。`,
          `✅ 任务面归你（工作分解契约）：tasks.md 是你的工作队列（机器种子可增删改，保持 \`- [ ] task-NN:\` 行形态）——CLI 以 checkbox 为进度状态机（task tick/flow status 实时读它），TodoWrite 类工具不替代；`,
          `   勾选是收口证据面（逐格核提交 token/review.json）：做一件 → 勾一格（task tick 即时回显进度与下一任务）→ 继续下一条，勿攒一把勾；勾选修改与任务交付同一提交入库（pathspec 带上本变更 tasks.md——task tick 回显给现成命令）；`,
          `   任务拟法：收口/推送/发布类动作不单列 task（协议自身承担，成功标准照写 requirements）；确需单列的，勾选前先有消息预埋 task-NN token 的交付提交（回执类证据写进提交消息）。`,
          `   flow status --change ${change} 为自愿查看/恢复面（非协议必需，D-007 中间零必需交互；恢复时给下一任务指针与进度）。`,
          `⚠️ 交付纪律：收口前交付代码显式 pathspec 提交——冻结件范围=baseline..HEAD，未提交不进审计件。`,
          ``,
          `【协议调用 2/2（干完后）】sillyspec flow done --change ${change}`,
          ``,
          `材料路径清单（按需 Read）：`,
          ...materials.map((p) => `  - ${p}`),
          ``,
          ...digestLines,
          ...(prototypePaths.length > 0 ? [
            `变更原型（头脑风暴产出，UI 实现前必看——中部 🖼️ 行的绝对尾部重列，防长输出截断丢指针）：`,
            ...prototypePaths.map((p) => `  - ${p}`),
          ] : []),
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
    // 变更标题补写（2026-09-29 title=中文概括；2026-10-16-short-change-title 提炼 ≤30；
    // 2026-10-16-title-range-gate 硬区间 10-30）——存量在途变更 title 空/缺失时的回填通道：
    // 显式 --title 恒生效（重入改标题）且必须合区间（超界 exit 2，参数面最易修正）；提炼补写
    // 仅当库内 title 为空才写（首写者胜），超界不阻断（resume 不可断）打 ⚠️ 强提示。
    try {
      const { deriveShortChangeTitleEx, isValidChangeTitle, shortTitleRejectMessage, shortTitleRangeWarnLine, SHORT_TITLE_HARDCUT_HINT } = await import('./quicklog.js')
      if (titleFlag && !isValidChangeTitle(titleFlag)) {
        console.error(shortTitleRejectMessage(titleFlag))
        process.exit(2)
      }
      const _row = pm._ensureDB(cwd).getDb().prepare('SELECT title FROM changes WHERE name = ?').get(change)
      const _cur = _row ? (_row.title || '') : ''
      const _derived = titleFlag ? { title: titleFlag, hardCut: false } : deriveShortChangeTitleEx(input)
      if (_derived && _derived.title && (titleFlag || !_cur)) {
        pm.updateChangeMeta(cwd, change, { title: _derived.title })
        console.log(`🏷️ 变更标题${titleFlag ? '已更新' : '已补写'}：${_derived.title}（面板显示用；须 10-30 字、建议 ~20 字，重入 --title 可改）`)
        if (_derived.hardCut) console.log(SHORT_TITLE_HARDCUT_HINT)
        if (!titleFlag && !isValidChangeTitle(_derived.title)) console.log(shortTitleRangeWarnLine(_derived.title))
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

  // 预段选道同意门（2026-10-14-prestage-consent-gate）：route-hindsight 标记从「下次 start 点名
  // 提示」升级为声明即过的同意门——上个轻量变更被标「疑似该走预段未走」时，本次全新 start 须
  // 显式选道一次（--no-prestage 声明留痕 / 先走 brainstorm 预段）。边界：门不判本次需求清不清晰
  // （判定归 agent/用户，D-005 弱信号），只把上次的过程形态信号摆上台面要求一次显式消费——同
  // --autopilot/--upgrade-thick 的同意门模式（「可无视」升级为「可无视但需留痕声明」）。
  // 豁免面：resume（上方分支早退）天然不受影响；平台 writer 预建空目录（proceedFreshEmptyDir）
  // 豁免——平台自动派发无选道对话面，标记留给人工会话消化；adopt（头脑风暴收编）= 选道正确，
  // 在 adopt 分支消费标记。读取 fail-open（读不到=无门），消费失败不阻断（下次再声明一次）。
  if (!proceedFreshEmptyDir) {
    let prestageMark = null
    try {
      const { readHindsightMark } = await import('./route-hindsight.js')
      prestageMark = readHindsightMark({ specBase })
    } catch { /* 标记读取 fail-open */ }
    if (prestageMark) {
      if (!prestageAck) {
        const _why = Array.isArray(prestageMark.reasons) && prestageMark.reasons.length > 0
          ? prestageMark.reasons.join('；') : '过程形态超阈'
        console.error(`❓ 预段选道同意门：上个轻量变更「${prestageMark.change}」被 route-hindsight 标记「疑似该走头脑风暴预段未走」（${_why}）。本次全新 start 须显式选道（声明即过——标记是过程形态信号非定罪）：`)
        console.error(`   ① 确认需求已含决策（成功标准来自用户原话或既有文档转写，而非你的推断）：sillyspec flow start --change ${change} --input "<原输入>" --no-prestage（声明留痕 flow-state.prestage_ack，标记消费）`)
        console.error(`   ② 需求不清晰或需方案探索：sillyspec run brainstorm --change ${change}（完成后回来 flow start 收编，标记自动消费）`)
        process.exit(2)
      }
      try {
        const { clearHindsightMark } = await import('./route-hindsight.js')
        clearHindsightMark({ specBase })
        console.log(`🕰️ 预段同意门：已按 --no-prestage 声明放行（本次需求已含决策，留痕 flow-state.prestage_ack；上个标记「${prestageMark.change}」已消费）`)
      } catch { /* 标记消费 best-effort：失败不阻断（下次 start 再声明一次） */ }
    }
  }

  // 升厚预判已删除（2026-09-25-thin-precheck-removal）：技术面关键词（数据库/迁移等）测错轴——
  // R16 实证碰迁移的变更轻量变更带评审最优收口，预判反诱发误升厚（臂 A 129M）与误报打断。选道只留
  // 形态信号：清晰度门管「需求说不清楚」（预段收编），升厚只留用户决策（--upgrade-thick 同意门）
  // 与运行时证据（实测失败升档/edit_ratio/评审——风险面在收口时点按承诺词/diff 原语/盲维判定）。

  // 变更标题硬区间门（2026-10-16-title-range-gate：10-30 字必须、建议 ~20、强制 agent 命名；
  // 提炼口径见 2026-10-16-short-change-title）：--title 显式 > --input 首行提炼 > 变更名兜底。
  // agent 命名时刻强制：不在区间/无 --input 兜底 → 拒绝启动（exit 2，在任何状态写入前——
  // 零半态）；平台 writer 预建空目录（自动派发，无 agent 对话面）豁免硬门仅 ⚠️ 留痕。
  let _st = null
  let _rejectMsg = null
  try {
    const _q = await import('./quicklog.js')
    _st = _q.resolveStartTitle({ titleFlag, input, change, enforce: !proceedFreshEmptyDir })
    if (!_st.ok) _rejectMsg = _q.shortTitleRejectMessage(_st.kind === 'fallback' ? _st.rejectedTitle : _st.title)
  } catch { /* quicklog 不可用（实践不可达）：降级保持旧行为兜底 */ _st = { title: titleFlag || change, ok: true, kind: titleFlag ? 'flag' : 'fallback', hardCut: false } }
  if (_rejectMsg) {
    console.error(_rejectMsg)
    process.exit(2)
  }
  const changeTitle = _st.title
  pm.initChange(cwd, change, { title: changeTitle })
  console.log(`🏷️ 变更标题：${changeTitle}（面板显示用；须 10-30 字、建议 ~20 字，重入 flow start --title 可改）`)
  try {
    const { isValidChangeTitle, shortTitleRangeWarnLine, SHORT_TITLE_HARDCUT_HINT } = await import('./quicklog.js')
    if (_st.hardCut) console.log(SHORT_TITLE_HARDCUT_HINT)
    if (proceedFreshEmptyDir && !isValidChangeTitle(changeTitle)) console.log(shortTitleRangeWarnLine(changeTitle))
  } catch { /* 提示行 best-effort */ }
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
    if (r.status === 'spawned') console.log(`🔄 [watcher] 观测旁路已拉起：事件流 .sillyspec/.runtime/state/watcher-events-${change}.jsonl（恒带 provisional:true）`)
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
    // 预段同意门声明留痕（2026-10-14-prestage-consent-gate）：hindsight 标记在场时全新 start
    // 以 --no-prestage 显式声明「本次需求已含决策」放行——审计面可区分「确认过」与「没被问过」
    prestage_ack: Boolean(prestageAck),
    // 极速模式留痕（2026-10-14-thin-turbo-mode D-005）：--turbo 用户显式触发声明性落盘；
    // flow done 读态以 turbo && tier!=='thick' 判定（D-007 升厚即失效）
    ...(turbo ? { turbo: true, turbo_since: new Date().toISOString() } : {}),
    baseline_commit: baseline,
    substeps: {},
  })

  // 跨仓基线锚（2026-10-13-cross-repo-baseline-anchor）：thin 手工交付的跨仓对账此前无锚
  // （B 档 HEAD~1 单笔窗口，多提交交付漏文件+交错时序抓错面——fire-ledger 两笔交付实证）。
  // start 时点记各注册仓 HEAD（cross_baselines），收口窗口=基线..工作树（与主仓 baseline_commit
  // 同构）。首写者胜（对齐 baseline_sha256 模式：重入不刷新，防跨仓已有并行提交后重锚漂移窗口）。
  // 纯读 fail-soft：注册不可达/非 git 仓/rev-parse 失败 → 跳过该仓，绝不阻断 start。
  try {
    if (!(readFlowState(changeDir) || {}).cross_baselines) {
      const _yamlText = existsSync(join(specBase, 'local.yaml')) ? readFileSync(join(specBase, 'local.yaml'), 'utf8') : ''
      if (_yamlText) {
        const { parseRepoRegistry } = await import('./stages/plan-postcheck.js')
        const { isAbsolute: _isAbs, resolve: _res } = await import('node:path')
        const _repos = parseRepoRegistry(_yamlText)
        const _bl = {}
        for (const [k, rawPath] of _repos || []) {
          const rp = _isAbs(rawPath) ? rawPath : _res(cwd, rawPath)
          if (!rp || !existsSync(rp)) continue
          const sha = gitQuiet(rp, ['rev-parse', 'HEAD'], { timeout: 10_000 })
          const s = sha === null ? '' : String(sha).trim()
          if (/^[0-9a-f]{7,40}$/i.test(s)) _bl[k] = s
        }
        if (Object.keys(_bl).length > 0) {
          writeFlowState(changeDir, { cross_baselines: _bl })
          console.log(`🌐 跨仓基线锚：${Object.keys(_bl).length} 个注册仓 HEAD 已记入 flow-state（cross_baselines 首写者胜）——收口跨仓对账窗口=基线..工作树`)
        }
      }
    }
  } catch { /* 跨仓基线锚 best-effort：失败不阻断 start（收口回退既有档位） */ }

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
  // 跨仓清单写法提示（2026-10-13-thin-empty-face-crosscheck）：注册仓非空时提示段头契约——
  // thin 通道此前零跨仓指引（fire-ledger-form-strict 实证：契约只活在厚流程模板里，裸写仓目录
  // 前缀撞空面即静默丢对账）。注册为空 → 零新增输出（横幅逐字节不变）。
  let crossRepoHintLines = []
  try {
    const { loadRegisteredRepoKeys } = await import('./scope-audit.js')
    const _repoKeys = loadRegisteredRepoKeys(specBase)
    if (_repoKeys && _repoKeys.length > 0) crossRepoHintLines = [
      `🌐 跨仓交付：清单跨仓文件另用段头「## <注册key> 仓变更」段内写仓根相对路径（或子段「### <注册key>」/条目前缀 cross-repo:<注册key>:）——key 以 local.yaml repos 注册为准（本仓注册 ${_repoKeys.length} 个）；`,
      `   裸写「仓目录名/路径」前缀不触发跨仓对账与冻结（收口空面门将点名阻断）。`,
      ``,
    ]
  } catch { /* 注册仓读取失败 → 零提示（与无注册仓同形态） */ }
  // FR 域预判（2026-10-13-batchtick-evidence-domain-hint）：--input 提及路径 × 模块图（discoverModuleIndex
  // 读 docs/<project>/modules/_module-map.yaml——与 distill 域路由同一匹配面）。第一次知道「路径未登记」
  // 不该是收口模块门（最贵时点）。纯提示不设门：input 路径可能不全，路由真相以实际交付文件为准；
  // 绿地无图/零路径 → 零新增输出（与模块门「绿地无图不拦」语义对齐）。fr-index.js 零编辑——
  // resolveTouchedDomains（内部即 pseudoDomainFromPaths+词典守卫）复用 distill 同一伪域回退链。
  let domainHintLines = []
  try {
    const _routingFace = await extractRoutingInputPaths(cwd, specBase, input)
    if (_routingFace.length > 0) {
      const { discoverModuleIndex } = await import('./decision-distill.js')
      const { matchedModuleIds, resolveTouchedDomains } = await import('./fr-index.js')
      const _knowledgeRoot = join(specBase, 'knowledge')
      const _moduleIndex = discoverModuleIndex(_knowledgeRoot)
      if (_moduleIndex && Object.keys(_moduleIndex).length > 0) {
        const _hitRows = []
        const _missFiles = []
        for (const f of _routingFace) {
          const ids = matchedModuleIds(_moduleIndex, f)
          if (ids.length > 0) _hitRows.push({ f, ids })
          else _missFiles.push(f)
        }
        if (_hitRows.length > 0 || _missFiles.length > 0) {
          const _lines = ['🗺️ FR 域预判（按 --input 提及路径；最终以收口实际交付文件路由为准）：']
          for (const r of _hitRows) _lines.push(`   ✓ ${r.f} → fr/${r.ids.join('、')}`)
          if (_missFiles.length > 0) {
            const _pseudo = (resolveTouchedDomains(changeDir, _moduleIndex, _missFiles, _knowledgeRoot)[0]) || 'unmapped'
            _lines.push(`   ⚠️ ${_missFiles.slice(0, 5).join('、')}${_missFiles.length > 5 ? ' 等' : ''} → 未命中知识模块图，FR 蒸馏将落域 ${_pseudo}（按 distill 同一伪域回退链预判——未吸附为 auto-<段>，词典吸附命中既有真域）`)
            _lines.push('   建议现在登记模块条目（docs/<project>/modules/_module-map.yaml 的 modules.<id>.paths 覆盖该目录）——登记后蒸馏自动落真域（收口模块门仍会兜底拦未登记目录）')
          }
          domainHintLines = _lines
        }
      }
    }
  } catch { /* 域预判 best-effort：图/路径读取失败零输出 */ }
  const lines = [
    `🏃 flow start（${thick ? 'thick 厚档（--thick 显式声明，人声明不做启发式）' : 'thin 轻量跑道'}）: ${change}`,
    `══════════════════════════════════════`,
    // 极速指引行（2026-10-14-thin-turbo-mode FR-01；2026-10-14-turbo-guide-tier-copy 评审 P3
    // 清偿）：承诺文案随档位收窄——thick 起步时 done 读态 turbo 不生效（D-007），文案如实告知
    // 全量仪式，防「提示说 A 实现是 B」漂移（cli-copy-selfsufficient②）。缺省路径逐字不变。
    ...(turbo && !thick ? [`⚡ 极速模式（用户显式触发）：只产 spec+代码，收口自动跳过实测与重仪式门（必留面照常）；本次收口不含测试客观核验`]
      : turbo && thick ? [`⚡ 极速留痕已记（--turbo），但 --thick 厚档起步——收口走全量仪式，实测与仪式门照跑不跳过（升厚即失效）`] : []),
    ...(hindsightHint ? [hindsightHint, ''] : []),
    `🔎 选道自检——对本需求，你还有没有必须问用户才能动手的问题？`,
    `   有 → sillyspec run brainstorm --change ${change}（它就是结构化问询协议，产物随后 flow start 自动收编续跑）；`,
    `   无 → 继续轻量跑道。纯提示不阻断——不设声明 flag、不拦流程（选错了还有事后闭环指标兜底）。`,
    ``,
    `【协议调用 1/2（本次）】change 已建 + 基线锚定（baseline_commit=${baseline ? baseline.slice(0, 10) : '（无 git 历史）'}）${withTasks ? ' + 任务卡模式（--with-tasks：中间自愿用 task done，收尾仍 flow done）' : ''}`,
    ``,
    // 顺序正典（2026-10-19-thin-order-canon）：行动句必须是顺序句——实证（artifact 时间戳
    // 还原+跨仓 14 例抽样）agent 跟从【你要做的】首义行动，旧句「直接干活」把动码提前、
    // 文档与批准沦为收口仪式；正典=先答 spec 面 → 批准 → 才动码（读代码探究不算动码）。
    `【你要做的】先答 spec 面，批准后才动码：① 答 spec——requirements FR 行为句+测试绑定行、design.md 四节作答（动码前；读代码探究不算动码）；② 断点①——摘要给用户看 → flow approve --change ${change}（或用户显式 --autopilot）；③ 才干活——写测试、改代码。治理工件骨架 CLI 已起草、收口机器做（协议记账单位=change 级）。`,
    // 收口拒收红线前置（2026-10-11-flow-start-redline-frontload）：钉死/空槽/绑定三面都是文档
    // 先行校验，实证第一次最容易踩（四问文本被改写、区间 task-NN 写法零证据被拒）——横幅
    // 头部先行告知，收口才暴露的规则前置到动笔前。
    `🚫 收口拒收红线（文档须先于动码——动笔前先读，第一次最容易踩的就是这三条）：`,
    `   ① design 四问文本与 FR 标题锚逐字钉死勿改写——问题原文保持原样、答案写在问题下方，改写/删除即收口拒收（文档↔锚逐字对比）；`,
    `   ② design.md 四节（做法/接口契约/边界并发四问/风险）每节至少一行——空节拒收（写「不适用：<理由>」也算答；动码前作答）；`,
    `   ③ requirements 每条 FR 须有带强度词的行为句（必须/禁止/SHOULD）+ 测试绑定行——缺任一即拒收（动码前作答）。`,
    `书写面（纯 markdown 起草）：requirements FR 正文/design 四节作答/测试绑定行都直接写正文——`,
    `   文档内零指纹标记、零槽注释、零书写指导（规则以本横幅与命令卡为唯一源）；成功标准漂移只出 advisory 不拒收。`,
    `⚠️ design.md 四节动码前作答（它是断点① 批准的输入——后补属超期补写、留痕可审计）；列改动文件用独立「## 文件变更清单」节+表格（| 操作 | 路径 | 说明 |）`,
    `   ——勿写在「接口契约」节内（收口按节名解析声明面）。`,
    ...crossRepoHintLines,
    `📜 requirements 每条 FR = 标题锚 + 行为句 + 按需场景块（#### 场景：名 + Given/When/Then）；`,
    `   测试绑定节每条 FR 一行 \`FR-NN: test/路径「用例」\`（无测试面写「不适用：理由」）。`,
    `📦 冻结面在 flow done 时点采集（baseline..HEAD 提交面）：未提交交付文件——会话专属 worktree 自动并入；`,
    `   共享主仓可带 --freeze-dirty 显式声明并入；git 中间提交归档后可 reset --soft 压扁为单提交`,
    `   （审计真相在 change.patch 冻结件 sha256 锚定，不依赖 git 历史形态）。`,
    `⚖️ 独立评审定档（flow done 按危险证据判，不看文件数）：高危承诺词/盲维实质作答/diff 危险`,
    `   原语/决策密度任一命中即需评审（届时会收到评审任务书，起子代理产出 review.json）；豁免`,
    `   也有 1/4 抽查采样。要强制/豁免可重启时带 --review / --no-review${reviewForce === true ? '（本变更已声明 --review）' : reviewForce === false ? '（本变更已声明 --no-review）' : ''}。`,
    `⚠️ 交付纪律：收口前先把交付代码用显式 pathspec 提交（git add -- <文件> && git commit）——`,
    `   patch 冻结件范围=baseline..HEAD 提交面，未提交的代码不进审计件（R16 评审 P2 实证）；`,
    `   tasks.md 一并显式 pathspec 提交（勾选证据进 git 历史，勿 untracked 直至归档——R19 实证；task tick 回显会给现成命令）。`,
    `✅ 任务面归你（工作分解契约，2026-10-07-thin-tasks-v3）：tasks.md 是你的工作队列——机器种子按真实实现路径改写`,
    `   （每行=可独立完成并当场验证的一步：做什么+怎么验证；增删改随意，保持 \`- [ ] task-NN:\` 行形态）；`,
    `   执行循环：对每个未勾行 Working on task N/M → 做一件 → 测试绿后当场勾这一格 → 下一行——CLI 以 checkbox 为进度状态机`,
    `   （sillyspec task tick --change ${change} --task task-NN 即时回显进度 N/M 与下一任务指针，flow status 同源；或直接 Edit 翻格 \`- [ ]\`→\`- [x]\`），watcher 实时上平台。`,
    `   ⚠️ harness 的 TodoWrite 类工具是会话内便利面，不替代 tasks.md——平台进度/收口证据只读它（0/12 事故实证：todo 全 completed 而 tasks.md 0 勾）；`,
    `   勾选是收口证据面：每格勾选要有对应提交（消息带 task-NN——逐个列出或 /、，连写如 task-01/02/03，「task-01..task-05」区间写法不认；pathspec 带上本变更 tasks.md——勾选修改与任务交付同一提交入库，task tick 回显会给现成命令）或 review.json，全勾但零证据会被拒收；勿攒一把勾（收口硬门拒单拍多格）；`,
    // 任务拟法指引（2026-10-12-closeout-task-guidance，三次「哨兵抓收口型任务零证据」复盘）：
    // 成功标准≠工作分解——收口/推送/发布是协议自身承担的动作；单列则证据（token 提交）必须先于勾选存在。
    `   任务拟法：收口/推送/发布类动作不单列 task（提交、归档、推送是 flow start→done 协议自身承担的动作——成功标准照写 requirements，勿逐字搬进任务清单）；确需单列的收口/操作型任务，勾选前先做消息预埋 task-NN token 的交付提交——回执类证据（push/publish 回执、构建日志路径）写进提交消息，勿依赖勾选后补；`,
    `   flow status --change ${change} 为自愿查看/恢复面（恢复时给下一任务指针与进度）。`,
    ``,
    `🛑 三断点纪律（顺序纪律：①未过不动码；②③为汇报点——用户没说「全跑完」就必须在每个断点向用户汇报并等确认）：`,
    `   ① spec 断点【机器门】：填完 FR 区和 design 四节后，把摘要给用户看（FR 条目+盲维作答+方案概述），`,
    `      用户确认后请其运行 sillyspec flow approve --change ${change}（批准留痕）再动手写代码——`,
    `      agent 代跑时如实声明通道：--user-confirmed（转述用户已确认）/ --self-approved（agent 自批），`,
    `      无 flag 按 unattested 留痕（审计面无法区分用户确认与自批）——2026-10-12-approve-channel-attest。`,
    `      方案错了返工最贵；批准是动码前置义务（未批准且未声明 --autopilot 时 flow done 亦拒收——2026-10-04-thin-docs-v2）；`,
    `      用户否掉方案 → flow reject --change ${change} --reason <理由>（拒后批准须显式通道再确认）。`,
    `   ② 执行断点：写完代码跑完测试后，把测试结果（过了几个/挂了什么）给用户看，`,
    `      等用户确认再跑收口。`,
    `   ③ 归档断点：flow done 跑完后（无论过/拒），把结果（归档成功/被什么拦了）给用户看。`,
    `   用户明确说「直接跑完/不用问我」→ 重跑 flow start --change ${change} --autopilot 声明豁免（用户显式授权、留痕——非 agent 自选补救通道），`,
    `   ①②③人审全免（agent 自主跑到底）。`,
    `   随时可查进度：sillyspec flow status --change ${change}`,
    ...(detectUiTouch(input)
      ? [...buildUiGuidanceLines(specBase), '']
      : []),
    ``,
    `【协议调用 2/2（干完后）】sillyspec flow done --change ${change}`,
    `  测试对账：P2 账本优先，无记录 CLI 亲测（fail-closed：实测失败/超时=整单 FAIL exit≠0；中断重入断点续）。`,
    ``,
    `材料路径清单（稳定前缀，按需 Read）：`,
    ...materials.map((p) => `  - ${p}`),
    ``,
    ...digest.lines,
    ...(domainHintLines.length > 0 ? ['', ...domainHintLines] : []),
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
  const hasLedger = existsSync(runtimeStatePath(runtimeRoot, `verify-quality-scan-${change}.json`))
  console.log([
    `🔁 flow start 恢复简报（重入）: ${change}（tier=${st.tier}${st.legacy_fallback ? '，legacy_fallback=true 混跑回退中' : ''}）`,
    `══════════════════════════════════════════════════════`,
    ...(title ? [`- 标题：${title}`] : []),
    `- 做到哪：任务勾选 ${checked}/${total}；基线以来提交 ${commits} 个；变更/dirty 文件 ${dirty} 个；P2 质量扫描记录 ${hasLedger ? '在场' : '无'}。`,
    `- 六子步标记：${done.length ? `已完成 ${done.join('/')}` : '（无）'}${left.length ? `；待办 ${left.join('/')}` : '；全部完成'}`,
    // 顺序正典（2026-10-19-thin-order-canon）：恢复面带批准状态——重入时 agent 只看简报，
    // 未批准时「下一步」必须指向补批而非「继续干活」（防先码后批在恢复路径复发）。
    `- spec 批准：${st.spec_approved ? `✅ 已批准（channel=${approveChannelOf(st)}）` : st.autopilot ? '🔑 autopilot 豁免（用户显式授权）' : '⬜ 未批准——动码前先过断点①（摘要给用户 → flow approve）'}`,
    // 红线重申（2026-10-11-flow-start-redline-frontload）：重入不出首进横幅——钉死规则与
    // task-NN token 形态随简报补位，断点续跑生命周期内规则不丢。
    `- 红线重申：design 四问文本/FR 标题锚逐字钉死勿改写（改写即拒收）；勾选证据提交消息逐个带 task-NN 或 /、，连写（「task-01..task-05」区间写法不认）。`,
    `- 剩什么：${left.length === 0 && dirty === 0 ? '活已干完' : dirty > 0 ? '活未干完（继续改代码）' : '收尾待裁决'}`,
    `- 下一步：${left.length === 0 ? `sillyspec flow done --change ${change}` : !st.spec_approved && !st.autopilot ? `未批准先补批（摘要给用户 → sillyspec flow approve --change ${change}）；随后继续干活，干完跑 flow done（断点续）` : `继续干活；干完跑 flow done（断点续）`}`,
    ...(digestLines.length > 0 ? ['', ...digestLines] : []),
    // 尾部原型锚（2026-10-14-guide-anchor-adopt-proto）：收编/含原型变更重入时原型指针不隐身
    //（首进 adopt 输出的 🖼️ 行在会话切换后已丢，简报尾部补可发现面；置于 digestLines 后＝绝对
    // 尾部，长知识注入段也顶不掉——评审 P3-2 清偿）。无原型零输出。
    ...(() => {
      const protos = changeArtifactPaths(changeDir).filter((p) => /\.html$/i.test(p))
      return protos.length > 0
        ? [`- 变更原型在场（UI 实现前必看，界面/交互/流程按原型对齐）：`, ...protos.map((p) => `  - ${p}`)]
        : []
    })(),
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

export async function cmdFlowDone({ change, cwd, specBase, runtimeRootOpt = null, confirmArchive = true, freezeDirty = false, acceptDirtyGap = false, acceptOrphanFace = false, allowBatchTick = false, acceptUnmapped = false, acceptEmptyFace = false }) {
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
  // 极速模式读态（2026-10-14-thin-turbo-mode FR-02/D-007）：turbo && tier!=='thick' 双条件——
  // 升厚（distill 异态/verify 失败/--thick 起步）后 turbo 残留不短路厚档仪式，重入即恢复全量校验
  const turbo = st.turbo === true && st.tier !== 'thick'
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
  // 模块对账面（2026-10-12-thin-module-gate-and-feed）：patch 子步算出后供 distill 回写消费；
  // 断点续跑 patch 已 done 时从 change-patch.json files[] 回读重算（单一时点口径，不随图回写漂移）
  let moduleScope = null
  let changelogAppended = []
  // 遥测单点（2026-09-25-thin-parity-assets 修评审 P2①：失败路径 exit 前也要落账——校准信号
  // 不许在失败面丢失；成功收口走函数末尾同款记录，失败面只多不少）
  const appendTelemetry = (review) => {
    try {
      appendFileSync(runtimeTempPath(runtimeRoot, 'flow-telemetry.jsonl'), JSON.stringify({
        ts: new Date().toISOString(), change, protocolCalls: 2,
        draftAmendments: st.edit_ratio != null ? 1 : 0, editRatio: st.edit_ratio ?? null,
        routeHint: st.route_hint ?? null, tier: st.tier, upgraded: st.upgrade_reason ?? null,
        // 批准通道遥测（2026-10-12-approve-channel-attest）：与收口回显同源取值，校准
        // unattested/agent-self 占比用（dogfood 实证留痕不可区分 → 通道可聚合）。
        approveChannel: approveChannelOf(st),
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
      // 问题行机器回填留痕（2026-10-13-design-question-autorepair）：先于拒收渲染（评审 P3 清偿：
      // 混合拒收场景回填已落盘，若渲染在 exit(1) 之后则留痕不可达且幂等重跑后永久丢失）。
      for (const p of r.repairs || []) console.log(`🔧 [design 问题行机器回填] ${p}`)
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
        console.error(`❌ spec 断点未批准：批准是动码前置义务（不是收口补救动作）——本变更缺方案确认留痕`)
        console.error(`   补批通道（留痕可审计）：把 FR 条目+design 四节摘要给用户看，用户确认后由用户运行：`)
        console.error(`     sillyspec flow approve --change ${change} [--user-confirmed|--self-approved]`)
        console.error(`   或用户显式豁免（须用户授权，非 agent 自选）：重跑 flow start --change ${change} --autopilot（声明留痕）`)
        reportMidFail('artifacts')
        process.exit(1)
      }
      // 批准通道回显（2026-10-12-approve-channel-attest）：channel 是审计面第一公民——agent-self
      // 与 unattested 醒目（dogfood 实证：用户真批转述与 agent 自批在留痕层面曾不可区分）。
      if (st.autopilot) {
        console.log('🔑 spec 断点：autopilot 显式豁免（用户授权自主跑到底）')
      } else {
        const _ch = approveChannelOf(st)
        const _warn = _ch === 'agent-self' || _ch.startsWith('unattested')
        // 评审 P3② 清偿：翻越语只在 superseded 戳在场时陈述——并发窄窗混合态（approved 真 +
        // 拒绝未翻越）不得假称「已显式再确认」，按状态异常如实告警。
        const _rej = st.spec_rejected_reason
          ? (st.spec_rejected_superseded_at
            ? `（曾拒绝：${String(st.spec_rejected_reason).slice(0, 60)}→显式再确认翻越）`
            : `（⚠️ 存在未翻越拒绝记录（spec_rejected 未 superseded）——状态异常，请核查 flow-state）`)
          : ''
        console.log(`${_warn ? '⚠️' : '🔑'} spec 断点批准留痕：channel=${_ch}｜by=${st.spec_approved_by || '?'}${_rej}`)
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
    let _sentinelEvidenceComplete = false // 哨兵证据完备（status=complete——每格已勾任务均有 token/review.json）：单拍降级判据（2026-10-13-batchtick-evidence-domain-hint）
    let _autopilotTicked = 0 // 机器代勾格数（>0 时勾选节奏门降 advisory——代勾是单拍多格机械写，非 agent 纪律面）
    // 勾选观测共享采集（2026-10-17-tick-timing-source）：watcher 事件流 + task-ticks.jsonl 侧车
    // 一次读取——时点判定与勾选节奏门同源消费（此前节奏门单独读，现两门一份数据；检测逻辑
    // 与优先序不变：事件流先判、空结果回退侧车突发）。侧车=CLI tick 逐格毫秒时戳事实源（随
    // 归档进 git、不受观测盲窗影响）。任一源缺失按空（fail-open），绝不阻断收口。
    const _tickObs = await (async () => {
      try {
        const { readWatcherEvents } = await import('./watcher.js')
        const { detectBatchCheckCadence, detectTickBurst } = await import('./sentinel-assertions.js')
        const stream = readWatcherEvents({ runtimeRoot, change })
        let ticks = []
        try { ticks = (await import('./timeline.js')).parseTickLog(readFileSync(join(changeDir, 'task-ticks.jsonl'), 'utf8')) } catch { /* 侧车缺失/不可读按空（fail-open） */ }
        let batch = stream.exists ? detectBatchCheckCadence(stream.events) : null
        if (!batch) batch = detectTickBurst(ticks)
        return { stream, ticks, batch }
      } catch { return { stream: { exists: false, events: [] }, ticks: [], batch: null } }
    })()
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
          console.error(`🚫 哨兵断言拒收：tasks.md 全勾（${sent.checked}/${sent.claimTotal}）但 ${sent.missing.length} 个任务零完成证据（baseline..HEAD 提交标题与正文均无 token、无 review.json）：${sent.missing.join('、')}`)
          // token 合法形态写明（2026-10-11-flow-start-redline-frontload）：实证「task-01..task-05」
          // 区间写法被判零证据时才知道格式约束——拒收文案自释，减少一轮试错。
          console.error('   补证据（提交标题或正文带 task-NN——逐个列出或 /、，连写（如 task-01/02/03），「task-01..task-05」区间写法不认；或产 review.json）或取消勾选后重跑——假完成主张不许过门')
          // 扫描面透明化（2026-10-12-cli-friction-signal，dogfood 实证：跨仓交付的 agent 靠猜
          // 证据该落在哪）——声明哨兵只扫工作区仓与变更目录，跨仓仓提交天然不在面内。
          console.error(`   证据扫描面：工作区仓 git log ${st.baseline_commit ? String(st.baseline_commit).slice(0, 10) : 'baseline'}..HEAD 的提交消息（标题+正文）+ 变更目录内 review.json；`)
          console.error('   跨仓仓（register-repo 登记的外部仓）的提交不在扫描面——交付提交在其他仓时，须在工作区仓的提交消息带 task-NN（如治理工件提交）或产出 review.json 补证。')
          appendTelemetry({ sentinel: 'fake', missing: sent.missing.length })
          reportMidFail('ledger')
          process.exit(1)
        }
        _sentinelNonMirrorTasks = sent.claimTotal
        if (sent.status === 'complete') {
          _sentinelEvidenceComplete = true
          console.log(`🛡️ 哨兵：全勾 ${sent.checked}/${sent.claimTotal} 证据齐（提交 token/review.json）`)
          // 勾选时点判定（2026-10-17-tick-timing-source 换源）：判据从「tasks.md git 首次提交
          // == 收口最后提交」整体退役——git 历史形态被官方允许的 reset --soft 压扁无声摧毁
          // （tick-timing-squash-blindspot 坑：并行会话压扁归档把边干边勾的渐进历史抹平，警告
          // 照出，结构性误报；且 tasks.md 不进交付 pathspec 的纪律下「untracked 直至归档」恒
          // 复现）。换源=task-ticks.jsonl 侧车墙钟时戳（detectTickTiming 纯函数：跨度超 120s
          // =边干边勾确认；挤 ≤120s 短窗且变更存活 ≥10×跨度=末尾集中勾选）——墙钟时戳是文件
          // 事实，压扁/rebase 不可改写，与「审计真相锚 change.patch sha256、不依赖 git 形态」
          // 口径对齐。节奏门已检出单拍跳/突发时让位（防双重警告——其判定覆盖同一批格子）；
          // 无侧车观测输出一行 task tick 教学（不再作结构性警告）；advisory 不阻断语义不变。
          try {
            if (_tickObs.batch) {
              /* 节奏门将报单拍多格/突发——时点判定让位 */
            } else {
              const _baseRaw = st && st.baseline_commit ? gitQuiet(cwd, ['show', '-s', '--format=%ct', String(st.baseline_commit)]) : null
              const _baseTs = Number(String(_baseRaw ?? '').trim())
              const { detectTickTiming } = await import('./sentinel-assertions.js')
              const t = detectTickTiming({ ticks: _tickObs.ticks, lifespanMs: Number.isFinite(_baseTs) && _baseTs > 0 ? Date.now() - _baseTs * 1000 : NaN })
              if (t.status === 'concentrated') {
                console.warn(`⚠️ 勾选时点：${t.count} 格勾选时戳集中在 ${Math.max(1, Math.round(t.spanMs / 1000))}s 短窗内（末尾集中勾选形态）——token 证据齐放行，但边干边勾是进度锚，下次完成单元即勾（task tick 回显含现成提交命令）`)
              } else if (t.status === 'spread') {
                console.log(`✅ 勾选时点：${t.count} 格勾选时戳跨度 ${Math.max(1, Math.round(t.spanMs / 60000))} 分钟——边干边勾确认（判据=task-ticks 侧车墙钟时戳，不受 git 压扁影响）`)
              } else if (t.status === 'no-ticks') {
                console.log(`ℹ️ 勾选时点：无 tick 时戳观测（未走 task tick）——下次勾选建议 sillyspec task tick --change ${change} --task task-NN（即时回显进度与现成提交命令）`)
              }
              /* 'single'/'no-anchor' 静默：单格无节奏可言；缺存活锚 fail-open 不判 */
            }
          } catch { /* 时点判定 fail-soft */ }
        }
        // 全勾硬门（2026-10-07-allticked-gate-docs-resync，openspec all_done 对齐）：tasks.md 是
        // 完成状态机——有任务行但未全勾即拒收（旧「勾选缺失 advisory 放行」退役：懒路径零勾也
        // 能归档教会了无视任务面）。出口：逐格 task tick（每格需提交 token 证据——哨兵同门）；
        // 任务面与实际不符可先改写 tasks.md（工作分解归 agent）再逐格勾。token 代勾（governance-
        // autopilot）已在上方先跑：有证据未勾的格子已代勾，此处拒的纯属零证据未完成面。
        if (sent.claimTotal > 0 && sent.checked < sent.claimTotal) {
          console.error(`🚫 任务未全勾（${sent.checked}/${sent.claimTotal}）——tasks.md 是完成状态机：完成一件勾一格（每格勾选需对应提交带 task-NN token 或 review.json；提交 pathspec 带上本变更 tasks.md——勾选修改与任务交付同一提交入库），全勾后重跑 flow done`)
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
    // 侧车突发回退（2026-10-14-tick-burst-sidecar-gate）：CLI 收口端快连点对事件流不可见（单格
    // 精确跳），空结果时回退 task-ticks.jsonl 毫秒时戳判突发——CLI 与直接 Edit 两条路径同判。
    try {
      const { resolveBatchTickAction } = await import('./sentinel-assertions.js')
      // 观测消费共享采集（2026-10-17-tick-timing-source）：事件流/侧车/突发判定已在前文哨兵段
      // 前置采集为 _tickObs（时点判定与节奏门同源一份数据；读取仅前移，检测逻辑与优先序不变
      // ——事件流先判、空结果回退侧车突发，侧车缺失按空 fail-open）。
      const stream = _tickObs.stream
      const batch = _tickObs.batch
      if (batch) {
        // 代勾计数取「本拍实时代勾 ∨ 持久化代勾」较大者（二轮 P2-B：重入漂移防护）；决策纯函数
        // 单源（resolveBatchTickAction）四态与豁免优先序见其 JSDoc——代勾须解释整跳才降级
        const _persistedAuto = Number(st?.autopilot_ticked) || 0
        const _autoN = Math.max(_autopilotTicked, _persistedAuto)
        const v = resolveBatchTickAction({ batchTick: batch, nonMirrorCount: _sentinelNonMirrorTasks, allowBatchTick, autopilotTicked: _autoN, evidenceComplete: _sentinelEvidenceComplete })
        const at = Number.isFinite(batch.ts) ? new Date(batch.ts).toLocaleTimeString() : '未知时刻'
        if (v.action === 'bypass') {
          try { writeFlowState(changeDir, { allow_batch_tick: true }) } catch { /* 留痕 best-effort */ }
          console.warn(`⚠️ --allow-batch-tick：单拍多格勾选（${batch.detail}，${at}）硬门显式旁路——留痕 flow-state 与平台时间线`)
        } else if (v.action === 'advisory') {
          // 证据完备降级（2026-10-13-batchtick-evidence-domain-hint）：同形态 git 时点检查（一把勾
          // 模式）因 token 证据齐放行——事件流门对齐该语义；损害只剩 per-task 时间戳信号面，advisory
          // + flow-state 留痕与损害对齐。证据缺失形态不走此态（哨兵先拒 / 决策函数维持 reject）。
          if (v.reason === 'evidence-complete') {
            try { writeFlowState(changeDir, { batch_ticked: true }) } catch { /* 留痕 best-effort */ }
            console.warn(`⚠️ 勾选节奏：单拍多格勾选（${batch.detail}，${at}）——哨兵证据完备（每格已勾任务均有 token 提交/review.json），降级提醒不拒（batch_ticked 已留痕；下次完成单元即勾）`)
          } else {
            const why = v.reason === 'autopilot-ticked'
              ? `机器代勾 ${_autoN} 格（governance-autopilot 单拍机械写，非 agent 纪律面；本拍 ${_autopilotTicked}/持久化 ${_persistedAuto}）`
              : '哨兵任务面未知（fail-open 防误拒）'
            console.warn(`⚠️ 勾选节奏：单拍多格勾选（${batch.detail}，${at}）——${why}，降级提醒不拒`)
          }
        } else if (v.action === 'reject') {
          const _via = batch.source === 'tick-burst' ? '侧车时戳观测到' : '事件流观测到'
          console.error(`🚫 单拍勾选拒收：${_via}一拍勾选 ${batch.detail}（${at}）——勾选纪律要求逐格（做一件→勾一格→下一个），勾选任务 ${_sentinelNonMirrorTasks} 格`)
          console.error('   出口：①节奏违例已既成——认知后重跑带 --allow-batch-tick 显式留痕过门（平台时间线可见旁路）；②疑观测误判→sillyspec doctor 核对事件流')
          appendTelemetry({ sentinel: 'batch-tick', jump: batch.detail })
          reportMidFail('ledger')
          process.exit(1)
        }
      }
    } catch { /* 节奏门 best-effort：读流失败静默（fail-open——观测缺席不阻断） */ }
    // 极速模式实测门跳过（2026-10-14-thin-turbo-mode FR-02/D-002）：turbo 在场不调
    // runQuickTestLintGate，合成 gate 同形状 skipped 对象（带 status:'skipped' 完整形态——
    // 下方 fmt 对 null 显示 '—'，带形态才输出「skipped — 跳过原因」，审计可见；
    // 对齐 quick-audit env 逃生门 skip 形态先例 src/run/quick-audit.js:482）。
    // 失败升厚分支（下方 action==='fail'）turbo 下天然不触达——升厚语义不变。
    const gate = turbo
      ? { action: 'skip', failed: [], reason: `⚡ 极速模式（用户显式触发 ${st.turbo_since || '时点未记'}）——test+lint 实测跳过（审计留痕；本次收口不含测试客观核验）`, test: { status: 'skipped', command: null, exitCode: null, durationMs: null, outputTail: null, reason: `⚡ 极速模式（用户显式触发 ${st.turbo_since || '时点未记'}）——本次收口不含测试客观核验（审计留痕）`, resultPath: null }, lint: { status: 'skipped', command: null, exitCode: null, durationMs: null, outputTail: null, reason: '⚡ 极速模式——lint 实测跳过（审计留痕）', resultPath: null } }
      : await runQuickTestLintGate({ cwd, specBase, changedFiles, changeName: change, skipSentinel: true /* flow 侧哨兵带 baseline 区间，quick 侧区间不可靠——单判不双判 */ })
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
      resetThinStageRowOnUpgrade(cwd, change, specBase)
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
    gateSummaryText = `${turbo ? '⚡极速模式｜' : ''}test: ${fmt(gate && gate.test)}｜lint: ${fmt(gate && gate.lint)}｜门文件 ${Array.isArray(changedFiles) ? changedFiles.length : '?'} 个`
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
  // JSON-only 冻结形态（无主仓 change.patch，跨仓正文在 repos[]）——收口指引文案按它
  // 切换审计锚表述（2026-10-19-thin-empty-face-cross-repo-freeze）。
  let jsonOnlyFreeze = false
  if (st.substeps?.patch === 'done') {
    // 处置漂移检测（2026-10-05-disposition-refreeze-drift，主清单 P1）：冻结后又有本变更交付
    // 提交时，幂等跳过会把 change.patch/review.json 停在处置前时点（归档审计件缺处置面，
    // 2026-10-05-flowdone-lintfail-output 收编活体复现）。漂移 → 自动重冻结（等价 --refreeze）
    // + review 已有结论则隔离旧 review.json（结论对着旧冻结面不作数）并重置标记强制重评。
    //
    // 冻结件存在性复查（2026-10-14-patch-refreeze-missing-artifact）：子步标记 done 而冻结件
    // 缺席（手工误删/上次写盘中断）时，旧逻辑 readFileSync 抛错被下方 catch 吞掉 → 幂等跳过
    // → 归档无审计冻结件（multi-agent-platform 2026-10-14 实证：verify-result 记「无冻结件」，
    // 只能按 git 手工重建）。存在性复查优先于子步状态：缺件按漂移同款自动重冻结（重冻面=
    // 当前 HEAD）；review 处置沿用漂移面同一隔离规则——缺基面无法判 governance-only，
    // 未锚定一律隔离（fail-safe 宁可多评）。
    const patchJsonPath = join(changeDir, 'change-patch.json')
    const patchTextPath = join(changeDir, 'change.patch')
    // 空面跨仓冻结（2026-10-19-thin-empty-face-cross-repo-freeze）：JSON-only 留档
    // （无 change.patch、repos[] 承载跨仓正文）是完整冻结，存在性复查不得判缺件。
    const { inspectFreezeArtifacts: inspectFreeze, freezeGapLabels } = await import('./flow-parity.js')
    // 完整性以探针的 complete 为准（坏 JSON 即使 change.patch 在场也不可信）。
    const missingFreeze = freezeGapLabels(inspectFreeze(changeDir))
    let drifted = false
    let drift = null
    if (missingFreeze.length > 0) {
      drifted = true
      console.warn(`⚠️ 冻结件缺失：patch 子步标记 done 但 ${missingFreeze.join('、')} 不在——存在性复查优先于子步状态，按漂移同款自动重冻结（2026-10-14-patch-refreeze-missing-artifact）`)
    } else {
      try {
        const patchMeta = JSON.parse(readFileSync(patchJsonPath, 'utf8'))
        const { detectPatchDrift } = await import('./flow-parity.js')
        drift = detectPatchDrift({ cwd, change, freezeHead: patchMeta.head })
        if (drift.drifted) {
          drifted = true
          console.warn(`⚠️ 审计时点漂移：patch 冻结（${String(patchMeta.head || '').slice(0, 8)}）后另有 ${drift.ownCommits.length} 个本变更交付提交（${drift.ownCommits.slice(0, 3).join('；')}${drift.ownCommits.length > 3 ? ' 等' : ''}）——幂等跳过会把审计件停在处置前时点`)
        }
      } catch { /* 漂移检测失败按现状幂等跳过（fail-safe 不新造阻断面） */ }
    }
    if (drifted) {
      // 隔离先行（评审处置 P3：时间戳槽位防跨代覆盖——单槽 .superseded 在 Windows renameSync
      // 同名碰撞会抛错；隔离失败则整体退回现状幂等跳过（fail-safe：漂移处理要么完整交付要么
      // 不动，不留半套状态），指引人工处置后重跑）
      const reviewPath = join(changeDir, 'review.json')
      let quarantineOk = true
      if (existsSync(reviewPath)) {
        // 重冻结目标 HEAD：漂移面取 detectPatchDrift.head；缺件重冻面取当前 HEAD（重冻结将锚定该面）。
        // 锚定保留判定（2026-10-06-review-anchor-and-negation 实测竞态：复审对着当前 HEAD
        // 做的 PASS 结论落盘 26 秒后被「重冻结时刻在场=过期」口径误隔离）：reviewedAgainst
        // 命中重冻结目标 HEAD = 评审对象即最新交付面，结论有效——保留不隔离、review 标记不重置。
        // 缺省/读失败/格式非法按未锚定处理，隔离行为不变（fail-safe 宁可多评）。
        const refreezeHead = drift ? drift.head : String(gitQuiet(cwd, ['rev-parse', 'HEAD']) || '').trim()
        let anchoredToHead = false
        try {
          const { reviewAnchoredToHead } = await import('./flow-review.js')
          anchoredToHead = reviewAnchoredToHead(reviewPath, refreezeHead)
        } catch { /* 锚定判定失败按未锚定处理 */ }
        if (anchoredToHead) {
          console.log(`   review.json 已锚定当前 HEAD（reviewedAgainst 命中 ${String(refreezeHead || '').slice(0, 8)}）——评审对象即最新交付面，结论保留不隔离`)
        } else if (drift && drift.governanceOnly && !drift.touchedPromiseFace) {
          // 治理面等价保留（2026-10-10-drift-review-governance-keep，坑 drift-review-governance-loop
          // 用户实证）：评审结论的对象是交付面——窗口内本变更提交只碰 .sillyspec/** 治理文件且
          // 未触本变更 requirements/design（承诺面也是评审对象）时，结论对最新交付面逐字节等价，
          // 保留不隔离不重置标记；change.patch 仍走下方 driftRefreeze 自动重冻结（FR-01 后治理
          // 工件不入冻结面——治理修复的留档真相=归档目录本体文件，重冻结保交付面时点对齐）
          // （审计件覆盖最新提交面不变量不破）。此前任何后缀提交一律隔离重评——评审后修一个
          // P2 文档措辞也付整轮子代理评审费（循环，被迫手工重排执行顺序自赎）。
          console.log(`   review.json 保留不隔离——窗口内本变更提交仅触及治理文件（${drift.ownFiles.length} 个，未触 requirements/design），评审对象（交付面）未变，结论对最新面等价；change.patch 自动重冻结（治理工件不入冻结面，治理修复随归档目录本体留档）`)
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
    if (!driftRefreeze) skip('patch')
  }
  if (st.substeps?.patch !== 'done' || driftRefreeze) {
    let patchOk = false
    let orphanGapCount = 0
    try {
      // patch 面 = 本变更可归属的交付面（2026-10-12-close-trace-freeze-integrity FR-01 收敛）：
      // ①baseline..HEAD 提交面过滤 .sillyspec/（只留 docs/ 交付文档——治理工件目录不入冻，
      // 对齐 execute --done 沉淀资产面投影；工件真相随归档目录本体入库，patch 再冻是冗余且
      // 掩盖「可归属面为空」哨兵——ws-ref-ws-name +137/-0 全工件 0 代码实证）②独占树未提交
      // 交付面（worktree/--freeze-dirty）。他侧 quicklog/knowledge WIP 不入；提交面再过他侧
      // 声明切分（他侧同窗口提交的防线）。
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
          // 极速模式（2026-10-14-thin-turbo-mode FR-02/D-002）：缺口三选一阻断降 advisory——
          // 警告+缺口数留痕后放行，不 exit；非 turbo 路径逐字不变。
          if (turbo && !freezeDirty && !acceptDirtyGap) {
            console.warn(`⚡ 极速模式：未提交交付缺口未显式处置——降 advisory 放行（缺口数 ${freeze.dirtyWarned.length} 随收口输出留痕，审计自负）`)
          }
          if (!freezeDirty && !acceptDirtyGap && !turbo) {
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
        // 收口留痕四名全排除（2026-10-09-close-trace-single-set 后只写 change.patch/
        // change-patch.json 两件，但旧轮冻结件里可能仍有 scope-audit.json/.patch——
        // legacy 防护保留）：上一轮留痕件作为 untracked 新文件被全文自嵌入即自引用循环
        // （旧 patch 内容混进新 patch，三评 P1 根因）。
        const ownFiles = [...new Set([...freeze.files])]
          .filter((f) => f && !f.endsWith('change.patch') && !f.endsWith('change-patch.json')
            && !f.endsWith('scope-audit.json') && !f.endsWith('scope-audit.patch'))
        // 独占 worktree 冻结完备性守卫（2026-10-12-close-trace-freeze-integrity FR-02）：
        // 事故形态（multi-agent-platform ws-ref-ws-name 取证）：实现提交在会话 worktree 内完成
        // 但不在 flow done 时点 HEAD 的祖先链（reset/detach/平行分支）——baseline..HEAD 提交面
        // 与 git status 脏面都看不到，冻结面静默缺实现。本 worktree 的 HEAD reflog 会话独占
        // （linked worktree 独立 reflog），扫全部轨迹：不在 HEAD 祖先链且触及交付面的提交，
        // patch-id 与 baseline..HEAD 提交等价（amend/rebase 残留）视为已覆盖；否则阻断收口
        // （与 dirty gate 同款断点续语义）。共享主仓路径明确不启用——reflog 混他侧会话操作
        // 无法归属，--freeze-dirty 手动声明只覆盖脏面不进 reflog 扫描。
        if (exclusiveFrom === 'worktree') {
          try {
            const { scanOrphanFace } = await import('./flow-parity.js')
            const orphan = scanOrphanFace(cwd, { baseline: st.baseline_commit })
            if (orphan.files.length > 0 && !acceptOrphanFace) {
              console.error(`⛔ 会话专属 worktree 存在冻结面外交付改动：${orphan.commits.length} 个提交不在 HEAD 祖先链（patch-id 不等价）触及 ${orphan.files.length} 个交付文件——收口阻断（不归档；处置后重跑同一条命令从断点续）：`)
              console.error(`   提交：${orphan.commits.slice(0, 5).map((c) => c.slice(0, 10)).join('、')}${orphan.commits.length > 5 ? ' 等' : ''}`)
              console.error(`   文件：${orphan.files.slice(0, 5).join('、')}${orphan.files.length > 5 ? ' 等' : ''}`)
              console.error(`   ① git rebase/cherry-pick 这些提交到 HEAD（补齐冻结面）后重跑`)
              console.error(`   ② 确认放弃这些提交：清理对应分支/reflog 源后重跑`)
              console.error(`   ③ 接受缺口留痕：flow done --change ${change} --accept-orphan-face`)
              reportMidFail('patch')
              process.exit(1)
            }
            if (orphan.files.length > 0 && acceptOrphanFace) {
              orphanGapCount = orphan.files.length
              console.warn(`⚠️ --accept-orphan-face：显式接受 ${orphan.commits.length} 个冻结面外提交的 ${orphan.files.length} 个交付文件不进冻结面（缺口数随 change-patch.json acceptedOrphanFace 留痕）`)
            }
          } catch { /* 守卫异常不阻断（fail-safe 不新造阻断面） */ }
        }
        // ── 声明面自证前置（2026-10-13-thin-empty-face-crosscheck）：planEntries 解析与跨仓防呆
        //    告警提到 ownFiles 判空之前——空面也要跑。fire-ledger-form-strict 实证（multi-agent-platform
        //    docs/sillyspec/thin-done-empty-face-no-declared-crosscheck.md 37c7d146b）：跨仓交付撞空面时
        //    本段整挂在非空 else 分支内从未执行，归档件永久缺 patch 且零告警；空面恰是高危形态。
        let planEntries = []
        try {
          const { parseFileChangeListDetailed } = await import('./change-list.js')
          // repoKeys（2026-10-10-cross-repo-patch-freeze D-002@v1）：注册仓清单传入——跨仓
          // 子段/cross-repo: 前缀条目才带 repo 标注（不传则跨仓声明全落主仓口径， thin 跨仓
          // 对账无从谈起）
          const { loadRegisteredRepoKeys } = await import('./scope-audit.js')
          planEntries = parseFileChangeListDetailed(join(changeDir, 'design.md'), { keepSillyspecDocs: true, repoKeys: loadRegisteredRepoKeys(specBase) })
        } catch { /* 清单缺失/不可解析 → 实际侧 only 快照行（无 verdict，与主链路降级同语义） */ }
        // 跨仓声明防呆（坑 design-filelist-crossrepo-prefix-silent-main）：嫌疑判定从「首段命中
        // 注册仓」放宽为「声明路径主仓不存在即点名」（仓根相对路径形态首段不命中是盲区）；
        // 首段命中注册仓的条目额外标注 key，点名+三种正确语法指引。
        const _declared = []
        for (const e of planEntries) {
          const pe = String((e && e.path) || '').split('\\').join('/')
          if (!pe || pe.startsWith('.sillyspec/')) continue
          if (e.repo) continue
          _declared.push({ path: pe })
        }
        let _repoAliases = null
        try {
          const _yamlText = existsSync(join(specBase, 'local.yaml')) ? readFileSync(join(specBase, 'local.yaml'), 'utf8') : ''
          if (_yamlText) {
            const { parseRepoRegistry } = await import('./stages/plan-postcheck.js')
            const _repos = parseRepoRegistry(_yamlText)
            if (_repos && _repos.size > 0) {
              _repoAliases = new Map()
              for (const [k, v] of _repos) {
                _repoAliases.set(k, k)
                const norm = String(v || '').split('\\').join('/')
                const bn = norm.replace(/\/+$/, '').split('/').pop()
                if (bn) _repoAliases.set(bn, k)
              }
            }
          }
        } catch { /* 注册表读取失败 → 别名标注缺席，存在性判定不受影响 */ }
        const _suspects = []
        for (const d of _declared) {
          if (existsSync(join(cwd, d.path))) continue
          _suspects.push({ path: d.path, key: (_repoAliases && _repoAliases.get(d.path.split('/')[0])) || null })
        }
        if (_suspects.length > 0) {
          console.warn(`⚠️ 疑似跨仓声明未按规范标注（${_suspects.length} 条已按主仓路径对账）：${_suspects.slice(0, 5).map((x) => `${x.path}（主仓不存在${x.key ? `，首段命中注册仓 ${x.key}` : ''}）`).join('、')}${_suspects.length > 5 ? ' 等' : ''}`)
          console.warn('   主仓无这些路径 → 冻结面将标「计划未动」、跨仓对账与 patch 冻结不触发。正确写法三选一：① 段头「## <注册key> 仓变更」段内写仓根相对路径；② 子段「### <注册key>」；③ 条目前缀 cross-repo:<注册key>:<仓根相对路径>——key 以 local.yaml repos 注册为准')
        }
        // ── 空面门：空冻结面 + 声明清单有未标注交付条目 → 阻断（三处置一次给全；fire-ledger-form-strict 形态补位）──
        if (ownFiles.length === 0 && _declared.length > 0 && !acceptEmptyFace && !st.accept_empty_face) {
          console.error(`❌ 冻结面为空但 design 声明清单有 ${_declared.length} 条未标注交付条目（实现不在冻结窗口——跨仓交付撞空面的实证形态）——收口阻断（不归档；处置后重跑同一条命令从断点续）：`)
          for (const x of _suspects.slice(0, 5)) console.error(`   - ${x.path}${x.key ? `（首段命中注册仓 ${x.key}）` : '（主仓不存在）'}`)
          console.error('   ① 实现在主仓：先提交后重跑')
          console.error('   ② 跨仓交付：清单按规范标注后重跑——正确写法三选一：段头「## <注册key> 仓变更」段内写仓根相对路径；子段「### <注册key>」；条目前缀 cross-repo:<注册key>:<仓根相对路径>（key 以 local.yaml repos 注册为准）')
          console.error(`   ③ 纯文档变更/清单误列：同步裁剪 design 清单后重跑；或显式签收：flow done --change ${change} --accept-empty-face（留痕 flow-state，重跑免重拦）`)
          reportMidFail('patch')
          process.exit(1)
        }
        if (ownFiles.length === 0 && _declared.length > 0 && (acceptEmptyFace || st.accept_empty_face)) {
          if (acceptEmptyFace && !st.accept_empty_face) {
            writeFlowState(changeDir, { accept_empty_face: { at: new Date().toISOString(), declaredCount: _declared.length, by: process.env.SILLYSPEC_SESSION_ID || null } })
            st.accept_empty_face = true
          }
          console.warn(`⚠️ --accept-empty-face：显式签收空冻结面与声明面矛盾（${_declared.length} 条声明交付不进冻结面，留痕 flow-state accept_empty_face）`)
        }
        // 空面跨仓冻结（2026-10-19-thin-empty-face-cross-repo-freeze）：主仓冻结面为空且
        // 声明清单含规范跨仓标注时，跨仓交付面仍可留档——JSON 路线只写 change-patch.json，
        // scopeAudit.repos[] 承载各仓 patch 正文/sha256，不写 change.patch（主仓面确为空，
        // 混入跨仓正文会让按主仓 cwd 解析 hunk 的读方错位）。各仓窗口内无可归属交付时
        // 维持空面跳过（无清单段形态同此路，留给第 2 步的窗口探测点名）。
        let emptyFaceCrossRepos = []
        let emptyFaceCrossRows = undefined
        if (ownFiles.length === 0 && planEntries.some((e) => e && e.repo)) {
          try {
            const { reconcileCrossRepoPlan } = await import('./scope-audit.js')
            const recon = reconcileCrossRepoPlan({
              cwd, specBase,
              runtimeRoot: resolveRuntimeRoot(runtimeRootOpt ? { runtimeRoot: runtimeRootOpt } : {}, specBase),
              changeName: change,
              planEntries,
              collectPatch: true,
              crossBaselines: (st && st.cross_baselines && typeof st.cross_baselines === 'object') ? st.cross_baselines : null,
            })
            emptyFaceCrossRows = recon.rows
            // 「有交付」判定按对账三态行，不按 totals.files——后者含声明未动的 untouched
            // 占位行（空仓也会得到 files>0，导致空面误落 JSON-only 留档）。判定只决定
            // 落不落件；落件时 repos[] 原样携带全部仓（含降级仓与 degradedReason——
            // 与非空主仓分支同口径，读侧可感知采集失败面）。
            const deliveredRepoKeys = new Set((Array.isArray(recon.rows) ? recon.rows : [])
              .filter((r) => r && r.crossRepo && r.verdict !== 'untouched')
              .map((r) => r.crossRepo))
            const hasDelivered = deliveredRepoKeys.size > 0
              || (recon.repos || []).some((r) => r && typeof r.patch === 'string' && r.patch.length > 0)
            emptyFaceCrossRepos = hasDelivered ? (recon.repos || []) : []
            for (const n of recon.notes) console.log(`   📎 ${n}`)
          } catch { /* 跨仓对账失败 → 退回空面跳过（fail-soft 不新造阻断面） */ }
        }
        if (ownFiles.length === 0 && emptyFaceCrossRepos.length > 0) {
          const { buildThinSnapshotRows, writeCloseTraceArtifacts } = await import('./flow-parity.js')
          const { rows: snapRows, totals: snapTotals } = buildThinSnapshotRows({ ownFiles: [], stats: new Map(), planEntries, crossRepoRows: emptyFaceCrossRows })
          const headCommit = String(gitQuiet(cwd, ['rev-parse', 'HEAD']) || '').trim() || null
          // 先清旧 change.patch 再写 JSON：JSON-only 语义下残留旧正文与新 JSON（无顶级
          // patchSha256）互相矛盾。清理失败直接抛出（外层 catch → patch 子步不标 done，
          // 重入重试），不留「双件并存且复查判完整」的自愈盲区。
          const stalePatchPath = join(changeDir, 'change.patch')
          if (existsSync(stalePatchPath)) {
            try { unlinkSync(stalePatchPath) } catch (e) {
              throw new Error(`旧 change.patch 清理失败（${e.message}）——保持半态可重入，修复文件权限后重跑`)
            }
          }
          const closeTrace = writeCloseTraceArtifacts({
            changeDir,
            change,
            baseline: st.baseline_commit,
            head: headCommit,
            files: [],
            metaTotals: { files: 0, additions: 0, deletions: 0 },
            patchText: null,
            savedAt: new Date().toISOString(),
            patchStatus: 'ok',
            snapObj: {
              mode: 'full-flow', ok: true, degradedReason: null,
              baseAnchor: st.baseline_commit || null,
              totals: snapTotals,
              rows: snapRows,
              excluded: { foreignDeclared: [] },
              note: 'flow done 时点冻结（主仓冻结面为空；跨仓交付面见 repos[]）',
              closedBy: 'flow done',
              repos: emptyFaceCrossRepos,
            },
            meta: {
              note: 'flow done 时点冻结（主仓冻结面为空；跨仓交付面见 scopeAudit.repos[]——2026-10-19-thin-empty-face-cross-repo-freeze）',
              modules: [], uncoveredDirs: [], moduleMaps: [],
            },
          })
          jsonOnlyFreeze = true
          const frozenRepos = emptyFaceCrossRepos.filter((r) => r && typeof r.patch === 'string' && r.patch.length > 0).length
          console.log(`📦 空面跨仓 patch 留档：change-patch.json（主仓面为空，跨仓 ${emptyFaceCrossRepos.length} 仓、正文 ${frozenRepos}——diff 见 scopeAudit.repos[]）`)
          patchOk = closeTrace.patchStatus === 'ok'
        } else if (ownFiles.length === 0) {
          if (_declared.length === 0 && planEntries.some((e) => e && e.repo)) {
            console.warn('⚠️ 声明清单全部为跨仓规范标注且主仓冻结面为空——跨仓窗口内没有可归属交付，按空面跳过 patch 留档（如实现应在此，先提交后重跑）')
          }
          console.log('📦 patch 留档跳过：本变更可归属文件面为空（无交付面改动——治理工件不入冻结面；若实现代码应在此，先提交后重跑）')
          patchOk = true
        } else {
          const { buildFrozenPatch, collectNumstatByPath } = await import('./scope-audit.js')
          // 双口径冻结（2026-09-28-split-guard-and-gate-report 评审 P2 清偿）：交付面（committed）
          // 用 baseRef..HEAD 提交区间 diff——共享主仓里并行会话对同文件的未提交 hunk 不再漏进
          // 冻结件；独占树未提交交付（dirtyAdded）保留工作树口径（FR-01 后治理工件目录不再入冻，
          // 工作树口径集只剩 dirtyAdded）。重叠文件归提交区间，避免双 hunk。
          const headCommit = String(gitQuiet(cwd, ['rev-parse', 'HEAD']) || '').trim() || null
          const toPosix = (p) => String(p).replace(/\\/g, '/')
          const worktreeSet = new Set([...((freeze.dirtyAdded) || [])].map(toPosix))
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
          moduleScope = { modules: [], uncoveredDirs: [], moduleMaps: [] }
          try {
            const { reconcileModuleDocs } = await import('./flow-parity.js')
            const rec = reconcileModuleDocs({ cwd, specBase, ownFiles, committedRaw })
            if (rec.lines.length > 0) for (const l of rec.lines) console.log(l)
            moduleScope = { modules: rec.modules, uncoveredDirs: rec.uncoveredDirs, moduleMaps: rec.moduleMaps }
          } catch { /* 对账 best-effort（三键空数组兜底） */ }
          // 未登记目录软门（2026-10-12-thin-module-gate-and-feed 一档）：拦在 distill 之前——
          // indexRequirements 的域路由发生在 distill，拦在前面 FR 才不落伪域。拦但可签收：登记/
          // --accept-unmapped（缺口数留痕）/ module_gate_ignore 固定忽略三条出路；绿地无图不拦。
          // 门消费的是本子步刚算的对账面（与收口留痕同时点口径），失败在 mark('patch') 前——
          // 重入 done 从 patch 断点续，登记后重算自然通过。
          let moduleGate = { block: false, dirs: [], maps: [] }
          try {
            const { evaluateModuleGate } = await import('./flow-parity.js')
            moduleGate = evaluateModuleGate({ moduleScope, ignore: readFlowConfig(specBase).moduleGateIgnore })
          } catch { /* 门判定异常不拦（对账面空 → 无可拦事实，fail-open 同对账口径） */ }
          if (moduleGate.block && !acceptUnmapped) {
            const dirList = moduleGate.dirs.slice(0, 5).map((d) => `${d.dir}（${d.files} 文件）`).join('、') + (moduleGate.dirs.length > 5 ? ' 等' : '')
            console.error(`❌ 模块图未登记交付目录（门）：${dirList}——共 ${moduleGate.dirs.length} 个目录不在任何 _module-map.yaml 的 paths 下`)
            console.error('   未登记后果是静默的：FR 蒸馏将落伪域 auto-*、知识图谱模块侧边（module-files/describes/changelog-of）断供、模块上下文注入绕开这些目录。')
            console.error(`   ① 登记后重跑：在 docs/<project>/modules/_module-map.yaml 增补 modules.<id>（paths 指向该目录，可带 doc: modules/<id>.md）后重跑 flow done`)
            console.error(`   ② 确认无需登记：flow done --change ${change} --accept-unmapped（缺口数随 change-patch.json acceptedUnmappedDirs 留痕）`)
            console.error('   ③ 固定忽略（合法未登记面：根级脚本/配置等）：.sillyspec/local.yaml 加 module_gate_ignore: <目录>（单行逗号分隔，前缀匹配）')
            reportMidFail('patch')
            process.exit(1)
          }
          if (moduleGate.block && acceptUnmapped) {
            console.warn(`⚠️ --accept-unmapped：显式接受 ${moduleGate.dirs.length} 个未登记目录不进模块图（缺口数随 change-patch.json acceptedUnmappedDirs 留痕）`)
          }
          // 收口留痕单套写（2026-10-09-close-trace-single-set）：共用 writeCloseTraceArtifacts
          // 只写 change.patch + change-patch.json 两件——对账面数据并入 JSON 的 scopeAudit
          // 子对象（thin 通道同样有对账面），旧名 scope-audit.* 停写、读侧兼容兜存量归档。
          // planEntries 解析与跨仓防呆告警已前移至 ownFiles 判空之前（2026-10-13-thin-empty-face-crosscheck）。
          // 跨仓声明在场 → 共享集成层分仓对账 + patch 冻结（D-001/D-002@v1）：与 heavy 通道
          // （execute --done）同源 reconcileCrossRepoPlan，repos[]（锚点/计数/patch 正文）
          // 随 snapObj 进 change-patch.json；任何异常 fail-soft 退 ⊘ 补行现行为（不阻断收口）
          let crossRepos = []
          let crossRepoRows = undefined
          if (planEntries.some((e) => e && e.repo)) {
            try {
              const { reconcileCrossRepoPlan } = await import('./scope-audit.js')
              const recon = reconcileCrossRepoPlan({
                cwd, specBase,
                runtimeRoot: resolveRuntimeRoot(runtimeRootOpt ? { runtimeRoot: runtimeRootOpt } : {}, specBase),
                changeName: change,
                planEntries,
                collectPatch: true,
                // 跨仓基线锚透传（2026-10-13-cross-repo-baseline-anchor）：flow start 记录的
                // cross_baselines → collectRepoActual 3c 档（基线..工作树窗口，token 归因主面）
                crossBaselines: (st && st.cross_baselines && typeof st.cross_baselines === 'object') ? st.cross_baselines : null,
              })
              crossRepoRows = recon.rows
              crossRepos = recon.repos
              for (const n of recon.notes) console.log(`   📎 ${n}`)
            } catch { /* 跨仓对账失败 → 退 ⊘ 补行（crossRepoRows 保持 undefined） */ }
          }
          const { buildThinSnapshotRows, writeCloseTraceArtifacts } = await import('./flow-parity.js')
          const { rows: snapRows, totals: snapTotals } = buildThinSnapshotRows({ ownFiles, stats, planEntries, crossRepoRows })
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
              ...(crossRepos.length > 0 ? { repos: crossRepos } : {}),
            },
            meta: {
              note: 'flow done 时点冻结（本变更可归属交付面：baseline..HEAD 提交面过滤 .sillyspec/ 只留 .sillyspec/docs/ 交付文档 + 独占树未提交交付；治理工件目录不入冻结——2026-10-12-close-trace-freeze-integrity FR-01）',
              // 模块对账结构化面（2026-09-27-thin-module-scope-persist）：done 时点口径
              // （与 files[] 同时点语义，不随模块图后续变更回写）；modules[] 空≠无影响
              ...moduleScope,
              // dirty 缺口显式接受留痕（2026-10-08-thin-done-dirty-gate-and-paren-attribution）：
              // --accept-dirty-gap 放行时缺口数入档（审计面可见，非只 console）
              ...(acceptDirtyGap && freeze.dirtyWarned.length > 0 ? { acceptedDirtyGap: freeze.dirtyWarned.length } : {}),
              // 未登记目录签收留痕（2026-10-12-thin-module-gate-and-feed 一档）：同款显式接受语义
              ...(acceptUnmapped && moduleGate.dirs.length > 0 ? { acceptedUnmappedDirs: moduleGate.dirs.length } : {}),
              // 孤儿面缺口显式接受留痕（2026-10-12-close-trace-freeze-integrity FR-02）：
              // --accept-orphan-face 放行时缺口数入档
              ...(acceptOrphanFace && orphanGapCount > 0 ? { acceptedOrphanFace: orphanGapCount } : {}),
            },
          })
          console.log(`📦 变更 patch 留档（单套）：change.patch + change-patch.json（${ownFiles.length} 文件，+${additions}/-${deletions}，对账面并入 scopeAudit 子对象）${closeTrace.patchStatus === 'ok' ? '，sha256 已锚' : '——patch 采集失败已留痕'}`)
          if (crossRepos.length > 0) {
            const frozenRepos = crossRepos.filter((r) => r && r.patch).length
            const degradedRepos = crossRepos.filter((r) => r && r.degraded).length
            console.log(`   📦 跨仓 patch 冻结：${crossRepos.length} 仓（正文 ${frozenRepos}、降级 ${degradedRepos}）——锚点/计数/diff 正文见 change-patch.json scopeAudit.repos[]`)
          }
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
  } else if (turbo) {
    // 极速模式评审豁免（2026-10-14-thin-turbo-mode FR-02/D-001/D-002）：用户显式极速声明=
    // 风险自担留痕，跳过 classifyReviewNeed 强制豁免（telemetry src/flow.js 整对象 JSON
    // 序列化，turboExempt 字段无破坏——Grill X-003 探针已核）。
    console.log('⚡ 极速模式：评审子步豁免（用户显式极速声明=风险自担留痕）')
    reviewOutcome = { required: false, sampled: false, verdict: 'exempt', turboExempt: true }
    mark('review')
  } else {
    const { classifyReviewNeed, renderReviewerTaskbook, validateReviewJson } = await import('./flow-review.js')
    let patchText = null
    try { patchText = readFileSync(join(changeDir, 'change.patch'), 'utf8') } catch { /* patch 子步 skip/失败面 */ }
    // JSON-only 跨仓冻结（2026-10-19-thin-empty-face-cross-repo-freeze）：无主仓
    // change.patch 时交付 diff 证据在 change-patch.json 的 scopeAudit.repos[].patch——
    // 不接上的话 classifyReviewNeed 恒判「交付 diff 不可得」，评审定档失真。
    if (patchText === null) {
      try {
        const meta = JSON.parse(readFileSync(join(changeDir, 'change-patch.json'), 'utf8'))
        const repos = meta && meta.scopeAudit && Array.isArray(meta.scopeAudit.repos) ? meta.scopeAudit.repos : []
        const repoDiff = repos
          .filter((r) => r && typeof r.patch === 'string' && r.patch.length > 0)
          .map((r) => r.patch)
          .join('\n')
        if (repoDiff) patchText = repoDiff
      } catch { /* 无/坏 JSON → 保持 null（既有判定） */ }
    }
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
      // 项目评审探针装配（2026-10-12-review-probe-injection）：local.yaml 数据驱动的项目特有
      // 必查面注入任务书（未配置零注入；装载告警/帽留痕 best-effort 提示，不阻断渲染）。
      let _probeLines = null
      try {
        const { assembleProbeLinesForScope } = await import('./review-probes.js')
        const _assembled = assembleProbeLinesForScope(specBase, 'thin')
        for (const _w of _assembled.warnings) console.warn(`⚠️ review_probes：${_w}`)
        if (_assembled.lines.length > 0) _probeLines = _assembled.lines
      } catch { /* 探针面 fail-soft：装配失败零注入 */ }
      // 预消化材料包装配（2026-10-19-thin-review-material-pack）：机械抽取 FR↔测试绑定表 +
      // 冻结 patch 文件级摘要注入任务书——砍零上下文评审员的定位类读与大 patch 整吞 prefill；
      // 摘要只从冻结件本身算（不走活 git，防与评审员手里冻结面漂移）；fail-soft 零注入。
      let _packLines = null
      try {
        const { assembleReviewPack } = await import('./flow-review-pack.js')
        const _pack = assembleReviewPack({ changeDir, patchText })
        if (_pack && Array.isArray(_pack.lines) && _pack.lines.length > 0) _packLines = _pack.lines
      } catch { /* 材料包面 fail-soft：装配失败零注入 */ }
      console.log(renderReviewerTaskbook({ change, changeDir, head: taskbookHead, probeLines: _probeLines, packLines: _packLines }))
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
        // 处置提示（2026-10-10-drift-review-governance-keep，坑 drift-review-governance-loop）：
        // P2/P3 非阻断可留债归档；要修则修复面决定是否重评——只碰治理文件不动本变更
        // requirements/design 的后缀提交触发治理面等价保留（评审保留+自动重冻结，零重评）；
        // 触及交付面或承诺面才隔离重评（任务书带前轮 findings，复审只验修复+新增）。
        console.warn(`   💡 处置参考：P2/P3 非阻断，可留债归档；要修——只碰治理文件（.sillyspec/**，不动本变更 requirements/design）的提交不触发重评；触及交付面或 requirements/design 需重评（复审只验修复+新增，非全量首评）`)
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
      if (turbo) {
        // 极速模式（2026-10-14-thin-turbo-mode FR-02/D-002）：ui 视觉探针跳过留痕
        console.log('⚡ 极速模式：UI 视觉证据探针跳过（审计留痕）')
      } else {
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
      }
    } catch (e) {
      console.warn(`⚠️ UI 视觉证据探针异常（fail-soft 降级放行）：${(e && e.message) || e}`)
    }
    // hunk 归属门（2026-09-27-hunk-attribution-gate：提交面行级对账——规则 11 文件级 pathspec
    // 防不住「同文件异行」的并行会话夹带，本会话 4f859053 实证。三类信号：未归因文件、跨变更
    // 竞争、在途残留；hunk_gate warn 默认（警告）/error（阻断）/off。与「提交面夹带嫌疑
    // advisory」互补：advisory 在冻结面采集处看文件名，本门在 probes 执法看 hunk 与竞争面。
    try {
      // 极速模式（2026-10-14-thin-turbo-mode FR-02/D-002）：hunk 门强制降 warn 档——
      // 判定链路照跑（三类信号照常渲染），仅 error 阻断档解除（降 advisory 留痕不阻断）。
      const gate = turbo ? 'warn' : readHunkGate(specBase)
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

  // 模块对账面断点续跑回读（2026-10-12-thin-module-gate-and-feed 二档）：patch 子步已 done 的
  // 重入轮次上 moduleScope 为空（进程内变量不跨轮）——从 change-patch.json files[] 回读重算
  // （distill 回写与 archive 前的 extraDocs 推导共用；files[] 与冻结面同时点口径）。
  if (!moduleScope) {
    try {
      const pm = JSON.parse(readFileSync(join(changeDir, 'change-patch.json'), 'utf8'))
      const filesArr = Array.isArray(pm && pm.files) ? pm.files : []
      if (filesArr.length > 0) {
        const { reconcileModuleDocs } = await import('./flow-parity.js')
        const rec = reconcileModuleDocs({ cwd, specBase, ownFiles: filesArr, committedRaw: [] })
        moduleScope = { modules: rec.modules, uncoveredDirs: rec.uncoveredDirs, moduleMaps: rec.moduleMaps }
      }
    } catch { /* 回读失败 → 空面（回写零命中静默） */ }
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
      if (h.harvested) console.log(`🌱 槽4（风险与死路）收割 → decisions.md（底稿——作答里的放弃方案请拆成 rejected 条目再收口；随蒸馏链进 knowledge）`)
    } catch { /* 收割 best-effort */ }
    // 模块变更索引机械回写（2026-10-12-thin-module-gate-and-feed 二档）：命中模块的卡/sidecar
    // 追加一行本变更条目——零语义判断（日期/变更名/动机首行全已知），split-changelog 契约 sidecar
    // 优先、卡内「## 变更索引」节次之、变更名在场即跳过（断点续跑幂等）。moduleScope 由上方
    // 回读块保证在场（patch 本轮算出或 change-patch.json 回读）。
    try {
      if (moduleScope && Array.isArray(moduleScope.modules) && moduleScope.modules.length > 0) {
        const { appendChangeIndexEntries, motiveFromInput } = await import('./flow-parity.js')
        // 摘要与变更标题同源（2026-10-15-title-label-skip）：段头行（动机与背景：等）跳过取次行，
        // 空提取回退变更名——此前裸取首行致「动机与背景：」整行入摘要（stages.changelog 实证）。
        const motive = motiveFromInput(st.input, change)
        const wr = appendChangeIndexEntries({ specBase, modules: moduleScope.modules, change, summary: motive, date: new Date().toISOString().slice(0, 10) })
        changelogAppended = wr.appended
        if (wr.appended.length > 0) console.log(`📖 模块变更索引回写：${wr.appended.length} 个目标（${wr.appended.join('、')}）——sidecar 优先/卡内节次之，随归档窄化入暂存`)
        const skippedReal = wr.skipped.filter((s) => !/已记录/.test(s.reason))
        if (skippedReal.length > 0) console.log(`   ↩️ 跳过 ${skippedReal.length} 个（${skippedReal.slice(0, 3).map((s) => `${s.id}：${s.reason}`).join('；')}${skippedReal.length > 3 ? ' 等' : ''}）`)
      }
    } catch (e) { console.warn(`⚠️ 变更索引回写失败（fail-soft 不阻断归档）：${(e && e.message) || e}`) }
    try {
      const { distillIntoKnowledge } = await import('./decision-distill.js')
      const knowledgeRoot = join(specBase, 'knowledge')
      const head = gitQuiet(cwd, ['rev-parse', 'HEAD'])
      const res = distillIntoKnowledge(changeDir, knowledgeRoot, typeof head === 'string' ? head.trim() : '', null)
      const abnormal = res && (res.rejected > 0 || res.needsWait > 0)
      if (abnormal) {
        writeFlowState(changeDir, { tier: 'thick', upgrade_reason: `distill 异态（rejected=${res.rejected} needsWait=${res.needsWait}）——升厚留人工裁决` })
        resetThinStageRowOnUpgrade(cwd, change, specBase)
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
    // extraDocs 断点续跑推导（评审 P3 清偿 2026-10-12-thin-module-gate-and-feed）：distill 已
    // done 的重入轮次上 changelogAppended 为空（进程内变量不跨轮）——从命中模块的卡/sidecar
    // 反查含本变更名的目标文件（幂等事实，判据与回写去重同款 text.includes(change)），
    // extraDocs 精确入暂存不靠目录级回退兜底。
    if (changelogAppended.length === 0 && moduleScope && Array.isArray(moduleScope.modules) && moduleScope.modules.length > 0) {
      try {
        const { deriveRecordedChangeIndexTargets } = await import('./flow-parity.js')
        changelogAppended = deriveRecordedChangeIndexTargets({ specBase, modules: moduleScope.modules, change })
      } catch { /* 推导失败 → extraDocs 空（目录级回退兜底） */ }
    }
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
      // 二档回写文件随归档窄化精确入暂存（文件级 pathspec；空数组传 null 走既有零行为）
      extraDocs: changelogAppended.length > 0 ? changelogAppended.map((p) => join(specBase, p)) : null,
    })
    // 归档后 changeDir 已搬走——后续子步标记随归档目录走（flow-state 随变更包留存审计）
    markDir = destDir
    mark('archive')
  }

  // ⑥ events：事件收口（watcher 观测旁路 best-effort 读回，非真相源）
  if (st.substeps?.events === 'done') { skip('events') } else {
    try {
      const eventsPath = runtimeStatePath(runtimeRoot, `watcher-events-${change}.jsonl`)
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
      console.log(`   审计真相已冻结在归档件 ${jsonOnlyFreeze ? 'change-patch.json（跨仓 repos[] 正文+sha256 锚定）' : 'change.patch（sha256 锚定）'} + verify-result + review.json，不依赖 git 历史；`)
      console.log(`   注：knowledge「最近确认」hash 为溯源快照，压扁后成孤儿引用属预期（非活引用）。`)
    }
  } catch { /* 指引 best-effort */ }
  // 平台同步（同 flow start 尾部接线——归档后的 docs/knowledge/FR 面随本轮回推平台）。
  // 终态强校验（2026-10-17-archive-half-state-location-stuck-active）：flow done 到此 =
  // 变更已归档，文件树推送失败不再静默半态（🚨 告警 + 自救命令 + exit 1）
  try { await triggerSyncTerminalStrict(cwd, change) } catch { /* 同步绝不阻断协议面 */ }
  return { change, substeps: doneList }
}

/** flow 命令族入口（index.js case 'flow' 接线）：flow start|done|amend-draft。 */
/**
 * flow approve（2026-10-04-thin-docs-v2 FR-06）：spec 断点用户批准留痕——用户确认 FR+design
 * 方案后运行；写 flow-state {spec_approved,spec_approved_at,spec_approved_by}。flow done 的
 * v2 机器门消费该证据（未批准且未声明 autopilot → 拒收）。
 *
 * 通道 attest（2026-10-12-approve-channel-attest，dogfood 实证驱动：8 次 approve 中 2 次为
 * agent 自批、其中一次在用户明确拒绝方案后把重复催促反读为授权，且留痕层面用户真批转述与
 * agent 自批不可区分——spec_approved_by 恒为 agent session id）：
 *   --user-confirmed  agent 转述「用户已确认方案」（channel=user-confirmed）
 *   --self-approved   agent 自批如实声明（channel=agent-self）
 *   无 flag            默认路径行为不变（零破坏），channel=unattested 留痕+警示
 * 拒后派生授权硬拦：spec_rejected 在场且未被显式翻越（无 spec_rejected_superseded_at）时，
 * approve 必须带显式通道——「用户拒绝过方案」之后的无通道批准正是实证事故形态。
 * 诚实边界：同机 agent 仍可谎报 --user-confirmed（与 --by 同界）——通道的价值是必留痕+
 * 可区分+评审抽查兜底，非防伪；强凭据属平台层课题（CLI 直连用户问询），不在此层伪造。
 */
async function cmdFlowApprove({ change, cwd, specBase, by = null, channelFlag = null }) {
  const changeDir = join(specBase, 'changes', change)
  if (!existsSync(changeDir)) {
    console.error(`❌ 变更不存在：${change}（flow approve 在 flow start 之后运行）`)
    process.exit(2)
  }
  const st = readFlowState(changeDir) || {}
  if (st.spec_rejected && !st.spec_rejected_superseded_at && !channelFlag) {
    console.error(`❌ 本变更存在未翻越的拒绝记录（spec_rejected，reason=${String(st.spec_rejected_reason || '?').slice(0, 80)}）——拒绝后的批准必须显式声明通道：`)
    console.error(`   用户重新确认后：sillyspec flow approve --change ${change} --user-confirmed（agent 转述用户确认）`)
    console.error(`   agent 自批如实声明：sillyspec flow approve --change ${change} --self-approved`)
    console.error(`   （拒绝后派生授权须显式再确认——2026-10-12-approve-channel-attest）`)
    process.exit(2)
  }
  // 批准前文档完整性校验（2026-10-19-approve-gate-tick-nudge FR-01/02）：批准=有内容的机器
  // 事实（批时文档必齐）。复用 done 门同源校验（verifyFlowDrafts 双轨）；repair:false——批准
  // 面只读，不做 design 问题行自动回填（写盘修复属 done 面）。诚实边界：本门证明「答在批前」，
  // 不证明「答在码前」——时序证据路线已实证不可行（批量收口下 git 时间戳说谎，thin-order-canon
  // 四路调查），不做假装能拦的检查。
  {
    const runtimeRoot = resolveRuntimeRoot({}, specBase)
    const { verifyFlowDrafts, verifyDesignRecordFilled } = await import('./flow-draft.js')
    const adoptedDesign = st.adopted_from === 'brainstorm' && existsSync(join(changeDir, 'design.md'))
    const r = verifyFlowDrafts({ changeDir, change, runtimeRoot, skipDesign: adoptedDesign, repair: false })
    for (const a of r.advisories || []) console.warn(`⚠️ [门柱漂移 advisory] ${a}（不阻断批准）`)
    if (r.applicable && r.violations.length > 0) {
      console.error(`❌ spec 断点未批准——文档未齐（批准是动码前置，先答 spec 面再批）：`)
      for (const v of r.violations) console.error(`   - ${v}`)
      console.error(`   作答齐备后重跑：sillyspec flow approve --change ${change} [--user-confirmed|--self-approved]`)
      process.exit(1)
    }
    if (!r.applicable) {
      // draft-ledger 机本位缺失（跨机批准/存量变更）：fail-open 降级——仅 v1（AGENT 槽形态）跑
      // 空槽兜底；v2 纯 markdown 无 ledger 无法对锚校验，如实降级放行（不假装能查）。
      let v1Text = null
      try { v1Text = readFileSync(join(changeDir, 'design.md'), 'utf8') } catch { /* 无 design */ }
      if (v1Text && /<!--AGENT:槽\d+/.test(v1Text)) {
        const dr = verifyDesignRecordFilled({ changeDir })
        if (dr.applicable && dr.emptySlots.length > 0) {
          console.error(`❌ spec 断点未批准——design.md 有 ${dr.emptySlots.length} 个空 AGENT 槽（${dr.emptySlots.join('、')}）：每节至少一行（「不适用：<理由>」也算答）`)
          console.error(`   作答齐备后重跑：sillyspec flow approve --change ${change} [--user-confirmed|--self-approved]`)
          process.exit(1)
        }
      }
      console.log(`ℹ️ 批准校验降级放行：draft-ledger 不在此机（.runtime 机本位/存量变更）——空槽兜底校验通过`)
    }
  }
  let approvedBy = by
  if (!approvedBy) {
    try {
      const { resolveSessionIdentity } = await import('./progress.js')
      approvedBy = (resolveSessionIdentity({ cwd }) || {}).session || 'user'
    } catch { approvedBy = 'user' }
  }
  const channel = channelFlag === 'user-confirmed' ? 'user-confirmed'
    : channelFlag === 'self-approved' ? 'agent-self' : 'unattested'
  const at = new Date().toISOString()
  const patch = {
    spec_approved: true, spec_approved_at: at, spec_approved_by: approvedBy,
    spec_approved_channel: channel,
  }
  if (channelFlag) patch.spec_attested_by = approvedBy
  else patch.spec_attested_by = null // 评审 P3① 清偿：无通道再批准清除旧声明者，防 unattested 态残留陈旧 attest
  if (st.spec_rejected && !st.spec_rejected_superseded_at) patch.spec_rejected_superseded_at = at
  writeFlowState(changeDir, patch)
  console.log(`✅ spec 断点已批准（change=${change}）`)
  const chLabel = channelFlag === 'user-confirmed' ? 'user-confirmed（agent 转述用户确认）'
    : channelFlag === 'self-approved' ? 'agent-self（agent 自批如实声明）' : 'unattested（未声明通道）'
  console.log(`   批准人：${approvedBy}｜时间：${at}｜通道：${chLabel}`)
  if (!channelFlag) {
    console.warn(`⚠️ 本次批准未带 attest 通道（--user-confirmed / --self-approved）——按 unattested 留痕，评审/审计无法区分用户确认与 agent 自批。`)
  }
  if (channelFlag === 'self-approved') {
    console.warn(`⚠️ agent 自批留痕：如用户实际未确认，请撤销——sillyspec flow reject --change ${change} --reason <理由>`)
  }
  if (patch.spec_rejected_superseded_at) console.log(`   已翻越既有拒绝记录（superseded_at=${patch.spec_rejected_superseded_at}，拒绝理由保留于 spec_rejected_reason）`)
  console.log(`   批准是动码前置义务：若尚未动码，现在可以开始写码；若已动码，本次属超期补批（留痕可审计）。flow done 断点门已满足。撤销：sillyspec flow reject --change ${change} --reason <理由>`)
}

/**
 * flow reject（2026-10-12-approve-channel-attest）：spec 断点拒绝留痕——撤销既有批准并记录
 * 拒绝理由（审计可复原「批准→用户否掉→显式再确认」序）；此后 approve 必须带显式 attest 通道
 * （防「拒绝后派生授权」——dogfood 实证：用户拒绝方案后 agent 把重复催促反读为授权自批）。
 * spec_approved 撤销为显式 false（非删键）——重入读侧恒见；spec_rejected* 历史字段保留不删。
 */
async function cmdFlowReject({ change, cwd, specBase, reason }) {
  const changeDir = join(specBase, 'changes', change)
  if (!existsSync(changeDir)) {
    console.error(`❌ 变更不存在：${change}（flow reject 在 flow start 之后运行）`)
    process.exit(2)
  }
  const reasonText = String(reason || '').trim()
  if (!reasonText) {
    console.error('❌ flow reject 需要 --reason <文本>（拒绝理由，留痕供审计）')
    process.exit(2)
  }
  let rejectedBy = 'user'
  try {
    const { resolveSessionIdentity } = await import('./progress.js')
    rejectedBy = (resolveSessionIdentity({ cwd }) || {}).session || 'user'
  } catch { /* 缺省 user */ }
  const at = new Date().toISOString()
  writeFlowState(changeDir, {
    spec_approved: false,
    spec_rejected: true, spec_rejected_at: at,
    spec_rejected_reason: reasonText, spec_rejected_by: rejectedBy,
    spec_rejected_superseded_at: null, // 再拒绝重置翻越戳（上一轮「拒→显式确认」序已被新拒绝终结）
  })
  console.log(`🚫 spec 断点已拒绝留痕（change=${change}）`)
  console.log(`   理由：${reasonText}｜操作者：${rejectedBy}｜时间：${at}`)
  console.log(`   既有批准已撤销（spec_approved=false）——flow done 断点机器门将重新拦收。`)
  console.log(`   用户重新确认后批准须显式通道：flow approve --change ${change} --user-confirmed（agent 自批则 --self-approved 如实声明）`)
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
        console.error('   sillyspec flow start --change <YYYY-MM-DD-简短描述> --input "<一句 10-30 字中文概括（首行即变更标题，硬区间 10-30 必须、建议 ~20 字）；随后动机与背景')
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
      prestageAck: hasFlag('--no-prestage'),
      turbo: hasFlag('--turbo'),
      cwd, specBase,
      json: hasFlag('--json') || jsonGlobal,
    })
  }
  if (sub === 'approve') {
    const change = getFlag('--change')
    if (!change) { console.error('❌ flow approve 需 --change <名>'); process.exit(2) }
    validateChangeName(change)
    // attest 通道（2026-10-12-approve-channel-attest）：互斥二选一，无 flag=unattested（留痕+警示）
    const userConfirmed = hasFlag('--user-confirmed')
    const selfApproved = hasFlag('--self-approved')
    if (userConfirmed && selfApproved) {
      console.error('❌ --user-confirmed 与 --self-approved 互斥（一次只能声明一个 attest 通道）')
      process.exit(2)
    }
    await reportAgentLog(change, sub)
    return cmdFlowApprove({ change, cwd, specBase, by: getFlag('--by') || null, channelFlag: userConfirmed ? 'user-confirmed' : (selfApproved ? 'self-approved' : null) })
  }
  if (sub === 'reject') {
    const change = getFlag('--change')
    if (!change) { console.error('❌ flow reject 需 --change <名>'); process.exit(2) }
    validateChangeName(change)
    await reportAgentLog(change, sub)
    return cmdFlowReject({ change, cwd, specBase, reason: getFlag('--reason') })
  }
  if (sub === 'diff') {
    // 只读查询面（2026-10-13-flow-diff-cmd）：change 粒度文件统计双态口——与 status 同级自愿面
    const change = getFlag('--change')
    if (!change) { console.error('❌ flow diff 需 --change <名>'); process.exit(2) }
    validateChangeName(change)
    await reportAgentLog(change, sub)
    await cmdFlowDiff({ change, cwd, specBase, json: jsonGlobal || hasFlag('--json') })
    return
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
      // 双格式判定单一源（2026-10-19-approve-gate-tick-nudge FR-03 上移 flow-review.js；
      // 判据与原内联逻辑逐字一致——status/tick 同源，行为零变化）
      const { designSectionsFilled } = await import('./flow-review.js')
      designFilled = designSectionsFilled(dText)
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
    // 阶段推断（2026-10-19-thin-order-canon：相位看批准——docs 齐但未批准仍停 ① spec 待批准，
    // 防 status 中途查询面诱导「先执行后卡点」；autopilot 是用户显式豁免、进执行段带标注）
    const specApproved = st.spec_approved === true
    const autopilotOn = st.autopilot === true
    let phase = '① spec（填 FR + design 槽）'
    if (designFilled && frFilled && bindingsFilled >= bindingsTotal && bindingsTotal > 0) {
      phase = specApproved
        ? '② 执行（已批准·写代码跑测试）'
        : autopilotOn
          ? '② 执行（autopilot 豁免·写代码跑测试）'
          : '① spec（→ 待用户批准：摘要给用户后 flow approve）'
    }
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
        specApproved, specApprovedChannel: specApproved ? approveChannelOf(st) : null,
        ...(st.legacy_fallback ? { legacyFallback: true } : {}),
      }))
      return
    }
    console.log([
      `📋 ${change}`,
      ...(changeTitle ? [`   标题：${changeTitle}`] : []),
      `   阶段：${phase}`,
      `   spec 批准：${specApproved ? '✅ 已批准' : autopilotOn ? '🔑 autopilot 豁免（用户显式授权）' : '⬜ 未批准（动码前先过断点①）'}`,
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
        return cmdFlowDone({ change, cwd, specBase, runtimeRootOpt, freezeDirty: hasFlag('--freeze-dirty'), acceptDirtyGap: hasFlag('--accept-dirty-gap'), acceptOrphanFace: hasFlag('--accept-orphan-face'), allowBatchTick: hasFlag('--allow-batch-tick'), acceptUnmapped: hasFlag('--accept-unmapped'), acceptEmptyFace: hasFlag('--accept-empty-face') })
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
  console.error('用法: sillyspec flow start --change <名> --input "<一句 10-30 字中文概括（首行即变更标题，硬区间 10-30 必须、建议 ~20 字）＋动机与背景详述＋独立一行『成功标准：』＋每行一条『- 可验证标准』>" [--thick|--with-tasks] [--no-prestage（hindsight 标记在场时声明需求已含决策，留痕放行）] | sillyspec flow done --change <名> | sillyspec flow status --change <名> [--json] | sillyspec flow diff --change <名> [--json]（只读文件统计）')
  console.error('      --input 可照抄形态（引号内换行合法）：')
  console.error('      sillyspec flow start --change <名> --input "<一句 10-30 字中文概括（首行即变更标题，硬区间 10-30 必须、建议 ~20 字）；随后动机与背景')
  console.error('')
  console.error('      成功标准：')
  console.error('      - <可验证标准>"')
  console.error('      预段同意门被拦时（上个轻量变更被 route-hindsight 标记「疑似该走预段未走」）：确认需求已含决策加 --no-prestage；不清晰则先 run brainstorm --change <名>，完成后回来 flow start 收编（标记自动消费）')
  process.exit(2)
}

export default { cmdFlow, cmdFlowStart, cmdFlowDone, readFlowState, writeFlowState, readFlowConfig }
