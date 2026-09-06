/**
 * archive-delta — 归档变更 delta 聚合器（Before/Delta/After 三段式 delta.md 纯函数）
 * （change: 2026-09-07-ir-stage-p3d，task-01，D-001@v1/D-002@v1/D-003@v1）
 *
 * 职责（设计文档「总体方案」的四源采集 fail-soft + 三段式渲染，CLI/archive 接线在 task-02）：
 *   1. collectDeltaSources({ changeDir, specRoot, project, runtimeRoot })：四源采集——
 *      ①reconcile：runtimeRoot/verify-runs/<ts>/reconcile-result.json 按 ts 倒序、change 字段
 *      过滤后取最新（R-01 跨变更串台防护：不同变更的 run 混存于同一 verify-runs/）；
 *      全无命中 → runtimeRoot/apply-pathspec-<change>.txt 逐行交付清单兜底（D-003，reconcile=null）。
 *      ②verifyFacts：changeDir/verify-facts.json（JSON.parse fail-soft → null）。
 *      ③moduleMap：复用 design-facts loadModuleMap；归属推导复用 deriveActualModules（P3d 导出）。
 *      ④decisions：changeDir/decisions.md 文本 → parseDecisionDomains（null-safe，文件缺 → null）。
 *   2. buildDeltaReport(...)：三段式 md（D-002）——Before（受影响模块 map 注册摘要 + 声明域并集）/
 *      Delta（交付文件×模块归属表 + missing/undeclared 差集附注 + 决策清单 + 探针 metrics 摘要）/
 *      After（module-impact.md「更新结果」表引用 + scan 刷新建议 + 端点基线独立立项提示）。
 *      缺源逐段降级注记（「（无 X：原因）」），不因缺源失败（兼容策略：存量变更仍生成）。
 *
 * 端点 before/after 基线不做（D-001@v1 非目标）——probe5 backendEndpoints > 0 时 After 段
 * 仅出一行独立立项提示，不含端点增删段。
 *
 * 依赖方向（单向防环）：archive-delta → design-facts / modules，两者均不反向 import 本模块。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { parseDecisionDomains, loadModuleMap, deriveActualModules } from './design-facts.js'
import { parseModuleMapSimple } from './modules.js'

// ---------------------------------------------------------------------------
// 小工具（全部 fail-soft：读不到/解析失败 → null / []，不抛出）
// ---------------------------------------------------------------------------

/** 读 JSON 文件 → 对象；不存在/解析失败 → null */
function readJsonSafe(p) {
  if (!p || !existsSync(p)) return null
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null }
}

/** 读文本文件 → 字符串；不存在/读失败 → null */
function readTextSafe(p) {
  if (!p || !existsSync(p)) return null
  try { return readFileSync(p, 'utf8') } catch { return null }
}

/** verify-runs/ 下 ts 形目录名（YYYYMMDDHHMMSS 纯数字）倒序列表 */
function listRunTsDescending(runsDir) {
  try {
    return readdirSync(runsDir).filter(n => /^\d+$/.test(n)).sort().reverse()
  } catch { return [] }
}

/**
 * 单文件 × prefixPairs 前缀匹配 → 全部命中模块 id（design-facts deriveActualModules 同款
 * 语义：全等或目录前缀——但取全部命中而非首命中即断，供归属表展示一文件多模块的真实形态）。
 * @returns {string[]} 命中模块 id（prefixPairs 顺序去重）
 */
function matchFileModules(file, prefixPairs) {
  const t = String(file || '').replace(/\\/g, '/').replace(/\/+$/, '')
  const ids = []
  if (!t) return ids
  for (const { id, path: p } of prefixPairs) {
    if ((t === p || t.startsWith(p + '/')) && !ids.includes(id)) ids.push(id)
  }
  return ids
}

/** 读 _module-map.yaml → Map<id, status>（Before 注册摘要的 status 列；loadModuleMap 只回
 *  ids/prefixPairs 不含标量字段，此处复用 modules.js canonical 解析再读一遍——只读不改） */
function loadModuleStatuses(specRoot, project) {
  if (!specRoot || !project) return null
  const text = readTextSafe(join(specRoot, 'docs', project, 'modules', '_module-map.yaml'))
  if (text === null) return null
  let parsed = {}
  try { parsed = parseModuleMapSimple(text) || {} } catch { return null }
  const st = new Map()
  for (const [id, m] of Object.entries(parsed)) st.set(id, (m && m.status) || '未标注')
  return st
}

/** 提取 module-impact.md「## 更新结果」小节正文（到下一 `## ` 标题或文末）；无文件/无小节 → null */
function extractUpdateResultSection(mdPath) {
  const text = readTextSafe(mdPath)
  if (text === null) return null
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex(l => /^##\s+更新结果/.test(l))
  if (start < 0) return null
  const out = []
  for (let i = start; i < lines.length; i++) {
    if (i > start && /^##\s+/.test(lines[i])) break
    out.push(lines[i])
  }
  const body = out.join('\n').trim()
  return body || null
}

/** verifyFacts 探针 metrics 一行渲染：`key=value` 以「 / 」连接；probe5 形态随演进（P3b
 *  fail-soft 原则）——metrics 缺失/空时整行降级注记而非报错 */
function renderProbeLine(name, probe) {
  const metrics = (probe && probe.metrics) || {}
  const kv = Object.entries(metrics).map(([k, v]) => `${k}=${String(v)}`)
  return kv.length > 0 ? `- ${name}：${kv.join(' / ')}` : `- ${name}：（无 metrics）`
}

const probe5BackendEndpoints = (verifyFacts) => {
  const m = (verifyFacts && verifyFacts.probes && verifyFacts.probes.probe5
    && verifyFacts.probes.probe5.metrics) || {}
  return typeof m.backendEndpoints === 'number' ? m.backendEndpoints : null
}

// ---------------------------------------------------------------------------
// 四源采集（Gap-2 兜底：deliverables 仅在 reconcile 全无命中时填充）
// ---------------------------------------------------------------------------

/**
 * 纯函数：聚合变更 delta 的四源数据（fail-soft，任一/全部缺源不抛出）。
 * @param {{ changeDir?: string, specRoot?: string, project?: string, runtimeRoot?: string }} opts
 *   changeDir=变更目录（basename 即 changeName，active changes/ 或 archive/ 下均可）；
 *   specRoot=规范根（.sillyspec）；project=子项目名；runtimeRoot=运行时根（.sillyspec/.runtime）
 * @returns {{ reconcile: object|null, verifyFacts: object|null, moduleMap: object|null,
 *             decisions: Array<{id, domains}>|null, deliverables: string[] }}
 *   reconcile=按 change 过滤取最新的对账产物；verifyFacts=探针底稿；moduleMap=loadModuleMap
 *   返回形态；decisions=当前版本 D 条目模块域（decisions.md 缺 → null）；deliverables=
 *   reconcile 全无命中时的 apply-pathspec 兜底清单（否则 []）
 */
export function collectDeltaSources({ changeDir, specRoot, project, runtimeRoot } = {}) {
  const change = changeDir ? basename(changeDir) : ''

  // ① reconcile（R-01：先按 change 字段过滤再取最新，跨变更 run 不串台）
  let reconcile = null
  if (runtimeRoot && change) {
    for (const ts of listRunTsDescending(join(runtimeRoot, 'verify-runs'))) {
      const data = readJsonSafe(join(runtimeRoot, 'verify-runs', ts, 'reconcile-result.json'))
      if (data && data.change === change) { reconcile = data; break }
    }
  }

  // 兜底（Gap-2/D-003）：全无 reconcile → apply-pathspec-<change>.txt 逐行路径作交付清单
  let deliverables = []
  if (!reconcile && runtimeRoot && change) {
    const text = readTextSafe(join(runtimeRoot, `apply-pathspec-${change}.txt`))
    if (text !== null) {
      deliverables = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    }
  }

  // ② verifyFacts（JSON.parse fail-soft null）
  const verifyFacts = changeDir
    ? readJsonSafe(join(changeDir, 'verify-facts.json'))
    : null

  // ③ moduleMap（design-facts 单一真相源）
  const moduleMap = loadModuleMap(specRoot, project)

  // ④ decisions（null-safe：文件缺 → null；存在但无条目 → []）
  let decisions = null
  if (changeDir) {
    const text = readTextSafe(join(changeDir, 'decisions.md'))
    if (text !== null) decisions = parseDecisionDomains(text)
  }

  return { reconcile, verifyFacts, moduleMap, decisions, deliverables }
}

// ---------------------------------------------------------------------------
// 三段式渲染（Before/Delta/After，缺源逐段降级注记）
// ---------------------------------------------------------------------------

/**
 * 纯函数：生成 delta.md 全文（三段式，D-002；不落盘——写盘/幂等由 CLI task-02 负责）。
 * @param {{ changeDir?: string, specRoot?: string, project?: string, runtimeRoot?: string, now?: string }} opts
 *   前四项同 collectDeltaSources；now=生成时刻 ISO（缺省当前时刻，测试可注入）
 * @returns {string} delta.md 全文（LF 行尾，单一尾换行）
 */
export function buildDeltaReport({ changeDir, specRoot, project, runtimeRoot, now } = {}) {
  const change = changeDir ? basename(changeDir) : '<变更名>'
  const { reconcile, verifyFacts, moduleMap, decisions, deliverables } =
    collectDeltaSources({ changeDir, specRoot, project, runtimeRoot })
  const statuses = loadModuleStatuses(specRoot, project)

  // 差集路径归一（missing={task,path,isNew?} / undeclared={path,suspectTask?|string}——
  // 生产端 verify-postcheck.js :2087/:2088 钉死的形态；字符串形态按存量容忍）
  const undeclaredPaths = (reconcile && Array.isArray(reconcile.undeclared))
    ? reconcile.undeclared.map(u => (u && typeof u === 'object' ? u.path : u)).filter(Boolean)
    : []
  const affectedFiles = reconcile
    ? [...(Array.isArray(reconcile.matched) ? reconcile.matched : []), ...undeclaredPaths]
    : deliverables
  const deliveredFiles = reconcile
    ? (Array.isArray(reconcile.matched) ? reconcile.matched : [])
    : deliverables

  // 受影响模块集 + 未匹配文件（R-02：未命中任何模块 paths 的文件显式列出不猜）
  const affectedModules = moduleMap ? [...deriveActualModules(affectedFiles, moduleMap.prefixPairs)] : null
  const unmatchedFiles = moduleMap
    ? affectedFiles.filter(f => matchFileModules(f, moduleMap.prefixPairs).length === 0)
    : [...affectedFiles]

  // 声明域并集（NEW: 前缀 → 「（新模块）」标记；decisions.md 的模块域可选字段）
  const declaredDomains = []
  if (Array.isArray(decisions)) {
    for (const { domains } of decisions) {
      for (const d of domains || []) if (!declaredDomains.includes(d)) declaredDomains.push(d)
    }
  }

  const L = []

  // ---- frontmatter（generated_at + 来源四项命中状态）----
  L.push('---')
  L.push(`generated_at: ${String(now || '').trim() || new Date().toISOString()}`)
  L.push(`sources_reconcile: ${reconcile
    ? `命中（ran_at=${reconcile.ran_at || '?'}，verify-runs 按 change 过滤取最新）`
    : `未命中（apply-pathspec 兜底，${deliverables.length} 项）`}`)
  L.push(`sources_verify_facts: ${verifyFacts ? '命中' : '缺失'}`)
  L.push(`sources_module_map: ${moduleMap ? '命中' : '缺失'}`)
  L.push(`sources_decisions: ${decisions === null ? '缺失' : '命中'}`)
  L.push('---')
  L.push('')
  L.push(`# 变更 Delta — ${change}`)
  L.push('')

  // ---- Before（变更前状态）----
  L.push('## Before（变更前状态）')
  L.push('')
  L.push('### 受影响模块（module-map 注册摘要）')
  L.push('')
  if (!moduleMap) {
    L.push(`（无 module-map：docs/${project || '?'}/modules/_module-map.yaml 不存在或不可解析——模块归属推导跳过，交付文件全部按未匹配列出）`)
    L.push('')
  } else if (affectedModules.length === 0) {
    L.push('（受影响模块集为空——交付/差集文件均未命中任何模块 paths）')
    L.push('')
  } else {
    L.push('| 模块 | status | paths+core_files 条目数 |')
    L.push('|---|---|---|')
    for (const id of affectedModules) {
      const status = (statuses && statuses.get(id)) || '—'
      const count = moduleMap.prefixPairs.filter(p => p.id === id).length
      L.push(`| ${id} | ${status} | ${count} |`)
    }
    L.push('')
  }
  if (unmatchedFiles.length > 0) {
    L.push(`未匹配文件（不归属任何模块 paths，人工裁量）：${unmatchedFiles.join('、')}`)
    L.push('')
  }
  L.push('### 声明域并集（decisions.md 模块域）')
  L.push('')
  if (decisions === null) {
    L.push(`（无 decisions.md：${join(changeDir || '?', 'decisions.md')} 不存在——声明域缺位）`)
  } else if (declaredDomains.length === 0) {
    L.push(`（decisions.md 解析出 ${decisions.length} 条当前版本决策，均未填写模块域——声明域为空）`)
  } else {
    L.push(declaredDomains.map(d => (d.startsWith('NEW:') ? `${d}（新模块）` : d)).join('、'))
  }
  L.push('')

  // ---- Delta（做了什么）----
  L.push('## Delta（做了什么）')
  L.push('')
  L.push('### 交付文件 × 模块归属')
  L.push('')
  if (!reconcile && deliveredFiles.length === 0) {
    L.push(`（无 reconcile 产物且无 apply-pathspec-${change}.txt——交付文件清单不可得，本节缺位）`)
    L.push('')
  } else {
    if (!reconcile) {
      L.push(`（无 reconcile 产物（变更先于 P3a 或 verify 未落盘），清单取 apply-pathspec——文件级，无 missing/undeclared 差集）`)
      L.push('')
    }
    L.push('| 交付文件 | 模块归属 |')
    L.push('|---|---|')
    for (const f of deliveredFiles) {
      const ids = moduleMap ? matchFileModules(f, moduleMap.prefixPairs) : []
      const cell = !moduleMap ? '—（无 module-map）' : (ids.length > 0 ? ids.join('、') : '—（未匹配）')
      L.push(`| ${f} | ${cell} |`)
    }
    L.push('')
  }
  if (reconcile) {
    L.push(`- 对账基线：status=${reconcile.status || '?'} / form=${reconcile.form || '?'} / sources=${(Array.isArray(reconcile.sources) ? reconcile.sources : []).join('、') || '?'}`)
    const missing = Array.isArray(reconcile.missing) ? reconcile.missing : []
    if (missing.length > 0) {
      L.push(`- missing（声明未落盘，${missing.length} 项）：${missing.map(m => (m && typeof m === 'object'
        ? `${m.task}：${m.path}${m.isNew ? '（NEW: 声明，路径已剥前缀）' : ''}`
        : String(m))).join('；')}`)
    } else {
      L.push('- missing（声明未落盘）：无')
    }
    if (undeclaredPaths.length > 0) {
      const items = (Array.isArray(reconcile.undeclared) ? reconcile.undeclared : [])
        .map(u => (u && typeof u === 'object' ? `${u.path}${u.suspectTask ? `（疑似归因 ${u.suspectTask}）` : ''}` : String(u)))
      L.push(`- undeclared（落盘未声明，${undeclaredPaths.length} 项）：${items.join('；')}`)
    } else {
      L.push('- undeclared（落盘未声明）：无')
    }
    L.push('')
  }
  L.push('### 决策清单（id × 模块域）')
  L.push('')
  if (decisions === null) {
    L.push(`（无 decisions.md：${join(changeDir || '?', 'decisions.md')} 不存在——决策清单缺位）`)
    L.push('')
  } else if (decisions.length === 0) {
    L.push('（decisions.md 无当前版本 D 条目——决策清单为空）')
    L.push('')
  } else {
    L.push('| 决策 | 模块域 |')
    L.push('|---|---|')
    for (const { id, domains } of decisions) {
      L.push(`| ${id} | ${(domains || []).join('、') || '（未填写）'} |`)
    }
    L.push('')
  }
  L.push('### 探针 metrics 摘要（验证结论表的机器半边）')
  L.push('')
  if (!verifyFacts || !verifyFacts.probes) {
    L.push(`（无 verify-facts.json：${join(changeDir || '?', 'verify-facts.json')} 不存在或不可解析——探针指标快照缺位，可跑 sillyspec verify-probes --change ${change} --init 补）`)
  } else {
    if (verifyFacts.generatedAt) L.push(`快照时刻：${verifyFacts.generatedAt}`)
    const order = ['probe1', 'probe3', 'probe5', 'probe6']
    const names = [...order, ...Object.keys(verifyFacts.probes).filter(n => !order.includes(n))]
    for (const n of names) L.push(renderProbeLine(n, verifyFacts.probes[n]))
  }
  L.push('')

  // ---- After（建议动作）----
  L.push('## After（建议动作）')
  L.push('')
  L.push('### 模块卡同步状态（module-impact.md「更新结果」）')
  L.push('')
  const updateResult = changeDir ? extractUpdateResultSection(join(changeDir, 'module-impact.md')) : null
  if (updateResult) {
    L.push('（引自变更目录 module-impact.md，人工维护为准）')
    L.push('')
    L.push(updateResult)
  } else if (changeDir && existsSync(join(changeDir, 'module-impact.md'))) {
    L.push('（module-impact.md 存在但无「## 更新结果」小节——模块卡同步状态引用缺位）')
  } else {
    L.push(`（无 module-impact.md：${join(changeDir || '?', 'module-impact.md')} 不存在——模块卡同步状态引用缺位）`)
  }
  L.push('')
  L.push('### scan 刷新建议')
  L.push('')
  if (affectedModules && affectedModules.length > 0) {
    L.push(`- \`sillyspec scan facts\` 下次刷新重点关注：${affectedModules.join('、')}（共 ${affectedModules.length} 个模块）`)
  } else if (!moduleMap) {
    L.push(`- （无 module-map：docs/${project || '?'}/modules/_module-map.yaml 不存在——受影响模块无法推导，建议先跑 sillyspec modules 同步补索引）`)
  } else {
    L.push('- （受影响模块集为空——无重点刷新面）')
  }
  if (unmatchedFiles.length > 0) {
    L.push(`- 未匹配文件补录提示：以下文件未命中任何模块 paths——建议补录 _module-map.yaml（新文件）或核对归属（人工裁量）：${unmatchedFiles.join('、')}`)
  }
  L.push('')
  const backendEndpoints = probe5BackendEndpoints(verifyFacts)
  if (backendEndpoints !== null && backendEndpoints > 0) {
    L.push('### 端点基线提示')
    L.push('')
    L.push(`- backendEndpoints=${backendEndpoints}（>0）——端点 before/after 基线属独立立项（D-001@v1：contract-matrix 无 before 数据），本 delta 不含端点增删段`)
    L.push('')
  }

  return L.join('\n')
}
