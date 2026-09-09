/**
 * archive-delta — 归档变更 delta 聚合器（Before/Delta/After 三段式 delta.md 纯函数）
 * （change: 2026-09-07-ir-stage-p3d，task-01，D-001@v1/D-002@v1/D-003@v1）
 *
 * 职责（设计文档「总体方案」的五源采集 fail-soft + 三段式渲染，CLI/archive 接线在 task-02）：
 *   1. collectDeltaSources({ changeDir, specRoot, project, runtimeRoot, cwd })：五源采集——
 *      ①reconcile：runtimeRoot/verify-runs/<ts>/reconcile-result.json 按 ts 倒序、change 字段
 *      过滤后取最新（R-01 跨变更串台防护：不同变更的 run 混存于同一 verify-runs/）；
 *      全无命中 → runtimeRoot/apply-pathspec-<change>.txt 逐行交付清单兜底（D-003，reconcile=null）。
 *      ②verifyFacts：changeDir/verify-facts.json（JSON.parse fail-soft → null）。
 *      ③moduleMap：复用 design-facts loadModuleMap；归属推导复用 deriveActualModules（P3d 导出）。
 *      ④decisions：changeDir/decisions.md 文本 → parseDecisionDomains（null-safe，文件缺 → null）。
 *      ⑤endpointBaseline + currentEndpoints（change: 2026-09-07-endpoint-baseline，task-03）：
 *      基线 runtimeRoot/endpoint-baselines/<change>.json（readJsonSafe fail-soft → null）；
 *      现算 scanBackendEndpoints(scanRoot)——capture 同口径但不落盘（scanRoot=cwd 显式传入，
 *      缺省 dirname(specRoot)：本地模式 specRoot=<repoRoot>/.sillyspec → 即主仓根），异常 → null。
 *   2. buildDeltaReport(...)：三段式 md（D-002）——Before（受影响模块 map 注册摘要 + 声明域并集）/
 *      Delta（交付文件×模块归属表 + missing/undeclared 差集附注 + 决策清单 + 探针 metrics 摘要）/
 *      After（module-impact.md「更新结果」表引用 + scan 刷新建议 + 端点基线提示节）。
 *      缺源逐段降级注记（「（无 X：原因）」），不因缺源失败（兼容策略：存量变更仍生成）。
 *
 * 端点基线提示节（2026-09-07-endpoint-baseline Wave2）：门控沿用 probe5 backendEndpoints>0
 * （Gap-4：无端点变更不收噪音注记，条件不动防断言面扩大），节标题沿用「### 端点基线提示」；
 * 节内三态——基线+现算可得 → diffEndpointSets 增删表（added/removed 各自格行，changed 不配对
 * 天然呈独立行；空 → 「无增删」一行）；基线缺失 → 「无基线（变更未拍 baseline）」降级注记
 * （替代 P3d 旧「独立立项」提示行）；基线在但现算不可得 → 现算失败降级注记。
 *
 * 依赖方向（单向防环）：archive-delta → design-facts / modules / endpoint-baseline /
 * endpoint-extractor，被依赖者均不反向 import 本模块。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { parseDecisionDomains, loadModuleMap, deriveActualModules } from './design-facts.js'
import { parseModuleMapSimple } from './modules.js'
import { scanBackendEndpoints } from './endpoint-extractor.js'
import { diffEndpointSets } from './endpoint-baseline.js'
import { resolveVerifyChangedFiles } from './verify-postcheck.js'

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

/** 提取 module-impact.md「## 更新结果」小节正文（不含标题行本身，到下一 `## ` 标题或文末；
 *  引用正文嵌入 After 段 H3 小节下，原 H2 标题混入会破坏标题层级）；无文件/无小节 → null */
function extractUpdateResultSection(mdPath) {
  const text = readTextSafe(mdPath)
  if (text === null) return null
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex(l => /^##\s+更新结果/.test(l))
  if (start < 0) return null
  const out = []
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) break
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
// 五源采集（Gap-2 兜底：deliverables 仅在 reconcile 全无命中时填充；
// ⑤ endpointBaseline/currentEndpoints 为 2026-09-07-endpoint-baseline task-03 第五源）
// ---------------------------------------------------------------------------

/**
 * 纯函数：聚合变更 delta 的五源数据（fail-soft，任一/全部缺源不抛出）。
 * @param {{ changeDir?: string, specRoot?: string, project?: string, runtimeRoot?: string, cwd?: string }} opts
 *   changeDir=变更目录（basename 即 changeName，active changes/ 或 archive/ 下均可）；
 *   specRoot=规范根（.sillyspec）；project=子项目名；runtimeRoot=运行时根（.sillyspec/.runtime）；
 *   cwd=⑤现算扫描根（缺省 dirname(specRoot)——本地模式即主仓根，capture 同口径锚定）
 * @returns {{ reconcile: object|null, verifyFacts: object|null, moduleMap: object|null,
 *             decisions: Array<{id, domains}>|null, deliverables: string[],
 *             endpointBaseline: object|null, currentEndpoints: Array<{method,path,source,line}>|null }}
 *   reconcile=按 change 过滤取最新的对账产物；verifyFacts=探针底稿；moduleMap=loadModuleMap
 *   返回形态；decisions=当前版本 D 条目模块域（decisions.md 缺 → null）；deliverables=
 *   reconcile 全无命中时的 apply-pathspec 兜底清单（否则 []）；endpointBaseline=基线文件
 *   payload（缺/损坏 → null）；currentEndpoints=scanBackendEndpoints 现算端点集（不落盘，
 *   扫描异常/无扫描根 → null）
 */
export function collectDeltaSources({ changeDir, specRoot, project, runtimeRoot, cwd } = {}) {
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

  // ⑤ endpointBaseline（2026-09-07-endpoint-baseline task-03）：基线 JSON fail-soft → null
  const endpointBaseline = (runtimeRoot && change)
    ? readJsonSafe(join(runtimeRoot, 'endpoint-baselines', `${change}.json`))
    : null

  // ⑤ currentEndpoints：归档时现算（capture 同口径 scanBackendEndpoints，不落盘）。
  // 扫描根三择一：显式 cwd > dirname(specRoot)（本地模式 specRoot=<repoRoot>/.sillyspec →
  // 主仓根）> 无（→ null）；扫描异常 fail-soft → null（报告端降级注记，不阻断）。
  const scanRoot = cwd || (specRoot ? dirname(specRoot) : null)
  let currentEndpoints = null
  if (scanRoot) {
    try { currentEndpoints = scanBackendEndpoints(scanRoot) } catch { currentEndpoints = null }
  }

  return { reconcile, verifyFacts, moduleMap, decisions, deliverables, endpointBaseline, currentEndpoints }
}

// ---------------------------------------------------------------------------
// 三段式渲染（Before/Delta/After，缺源逐段降级注记）
// ---------------------------------------------------------------------------

/**
 * 纯函数：生成 delta.md 全文（三段式，D-002；不落盘——写盘/幂等由 CLI task-02 负责）。
 * @param {{ changeDir?: string, specRoot?: string, project?: string, runtimeRoot?: string, cwd?: string, now?: string }} opts
 *   前五项同 collectDeltaSources（cwd=⑤现算扫描根，缺省 dirname(specRoot)）；now=生成时刻
 *   ISO（缺省当前时刻，测试可注入）
 * @returns {string} delta.md 全文（LF 行尾，单一尾换行）
 */
export function buildDeltaReport({ changeDir, specRoot, project, runtimeRoot, cwd, now, withSummary = false } = {}) {
  const change = changeDir ? basename(changeDir) : '<变更名>'
  const {
    reconcile, verifyFacts, moduleMap, decisions, deliverables,
    endpointBaseline, currentEndpoints,
  } = collectDeltaSources({ changeDir, specRoot, project, runtimeRoot, cwd })
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
  // 端点基线提示（2026-09-07-endpoint-baseline task-03）：门控沿用 probe5 backendEndpoints>0
  // 不动（Gap-4：无端点变更不收噪音注记），节标题沿用防断言面扩大；节内三态（基线×现算 →
  // diffEndpointSets 增删表 / 基线缺失 → 降级注记 / 现算不可得 → 降级注记）。
  const backendEndpoints = probe5BackendEndpoints(verifyFacts)
  if (backendEndpoints !== null && backendEndpoints > 0) {
    L.push('### 端点基线提示')
    L.push('')
    const baselineEps = (endpointBaseline && Array.isArray(endpointBaseline.endpoints))
      ? endpointBaseline.endpoints
      : null
    if (!baselineEps) {
      L.push(`- 无基线（变更未拍 baseline）：${join(runtimeRoot || '?', 'endpoint-baselines', `${change}.json`)} 不存在或不可解析——端点增删不可比（backendEndpoints=${backendEndpoints}（>0））`)
    } else {
      const endpointDiff = diffEndpointSets(baselineEps, currentEndpoints)
      if (!endpointDiff) {
        L.push(`- 基线已拍（${baselineEps.length} 端点）但现算不可得（scanBackendEndpoints 扫描失败）——端点增删不可比`)
      } else if (endpointDiff.added.length === 0 && endpointDiff.removed.length === 0) {
        L.push(`- 端点增删：无增删（基线 ${baselineEps.length} 端点 × 现算 ${currentEndpoints.length} 端点，method+归一 path 全一致）`)
      } else {
        L.push(`- 端点 diff：基线 ${baselineEps.length} 端点 × 现算 ${currentEndpoints.length} 端点（method+归一 path 集合运算；changed 不配对，天然呈独立行）`)
        L.push('')
        L.push('| 增删 | method | path | source |')
        L.push('|---|---|---|---|')
        for (const e of endpointDiff.added) L.push(`| + 新增 | ${e.method} | ${e.path} | ${e.source} |`)
        for (const e of endpointDiff.removed) L.push(`| - 删除 | ${e.method} | ${e.path} | ${e.source} |`)
      }
    }
    L.push('')
  }

  // IR 回灌（2026-09-07-ir-hardening D-006@v1）：withSummary=true 返回结构化对象——
  // affectedFiles/affectedModules 复用函数内既有推导（matched+undeclared/deliverables 兜底、
  // module-map 归属），sidecar 写入消费同一份（单一真相源，Grill P2-③采纳）。默认 false 返回
  // 纯字符串（既有调用方零变化）。
  if (withSummary) {
    return {
      markdown: L.join('\n'),
      change,
      affectedFiles: [...affectedFiles],
      affectedModules: affectedModules ? [...affectedModules] : [],
    }
  }
  return L.join('\n')
}


/**
 * writeLastDeltaSidecar —— delta 增量回灌 sidecar（change: 2026-09-07-ir-hardening，D-006@v1，FR-03）。
 *
 * 落 `.runtime/last-delta.json`（无主快照，幂等覆盖）：schema
 * `{ schemaVersion: 1, change, affectedModules: string[], affectedFiles: string[], updatedAt: string(ISO) }`。
 * 消费方：scan 断点续扫步（executeScanResumeCheck）读它打「本轮 scan 优先核对模块」advisory（14 天窗口）。
 * fail-soft：写失败只 console.error 留痕，不阻断 delta.md 生成（advisory 缺席即静默，零影响）。
 *
 * @param {string} runtimeRoot
 * @param {{ change: string, affectedFiles: string[], affectedModules: string[] }} summary - buildDeltaReport({withSummary:true}) 的返回
 */
export function writeLastDeltaSidecar(runtimeRoot, summary) {
  try {
    if (!runtimeRoot || !summary || !summary.change) return { ok: false, reason: '参数缺失' }
    const payload = {
      schemaVersion: 1,
      change: summary.change,
      affectedModules: Array.isArray(summary.affectedModules) ? summary.affectedModules : [],
      affectedFiles: Array.isArray(summary.affectedFiles) ? summary.affectedFiles : [],
      updatedAt: new Date().toISOString(),
    }
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(join(runtimeRoot, 'last-delta.json'), JSON.stringify(payload, null, 2) + '\n')
    return { ok: true, path: join(runtimeRoot, 'last-delta.json') }
  } catch (e) {
    console.error(`[sillyspec] last-delta sidecar 写入失败（advisory 将缺席，不阻断 delta 生成）：${e && e.message ? e.message : e}`)
    return { ok: false, reason: e && e.message ? e.message : String(e) }
  }
}
/**
 * archive 三重核对（2026-09-09 ql-20260909-004，轮次经济学 §3.1 archive 收口机械化）：
 * module-impact.md 矩阵记录 vs 真实变更文件 vs module-map 归属——机械比对 CLI 代算，
 * agent 只裁决不一致项。只读，供 archive extract-module-impact 步 prompt 注入/命令消费。
 * @returns {{ ok: boolean, mismatches: string[], impactFiles: string[], actualFiles: string[], summary: string }}
 */
export function auditModuleImpactAgainstDiff({ cwd, changeName, specDir = null }) {
  const mismatches = []
  const specBase = specDir || join(cwd, '.sillyspec')
  const impactPath = join(specBase, 'changes', changeName, 'module-impact.md')
  let impactText = null
  try { impactText = readFileSync(impactPath, 'utf8') } catch { /* 缺失由降级路径处理 */ }
  const actualFiles = (resolveVerifyChangedFiles(cwd, changeName, null, { includeWorkingTree: true, specBase: specDir || join(cwd, '.sillyspec') }) || [])
    .map(f => String(f).replace(/\\/g, '/'))
    .filter(f => !f.startsWith('.sillyspec/changes/'))
  if (!impactText) {
    return { ok: false, mismatches: ['module-impact.md 不存在（走 --init 降级路径）'], impactFiles: [], actualFiles, summary: `真实变更 ${actualFiles.length} 文件；无 module-impact 可核` }
  }
  // 矩阵反引号路径收集（启发式——advisory 注入用，非硬门真相源：无反引号表格格会漏，外部审核 P3-3）
  const impactFiles = [...impactText.matchAll(/`([^`]+[.](?:js|mjs|ts|py|java|md|yaml))`/g)].map(m => m[1].split(String.fromCharCode(92)).join('/'))
  const impactSet = new Set(impactFiles)
  const actualSet = new Set(actualFiles)
  const inDiffNotDoc = [...actualSet].filter(f => !impactSet.has(f))
  const inDocNotDiff = [...impactSet].filter(f => !actualSet.has(f))
  if (inDiffNotDoc.length > 0) mismatches.push(`diff 有而 module-impact 未列（${inDiffNotDoc.length}）：${inDiffNotDoc.slice(0, 5).join('、')}${inDiffNotDoc.length > 5 ? ' …' : ''}`)
  if (inDocNotDiff.length > 0) mismatches.push(`module-impact 列而 diff 无（${inDocNotDiff.length}）：${inDocNotDiff.slice(0, 5).join('、')}${inDocNotDiff.length > 5 ? ' …' : ''}`)
  // 第三重：module-map 归属一致性（2026-09-09 外部审核 P2-1——「三重核对」此前名实不符：
  // 矩阵行的模块列 vs map 前缀推导——误标模块点名；未命中 map 的归 unmatched 提示不判红）
  const moduleMisattrib = auditImpactModuleAttribution(impactText, actualFiles, specBase)
  mismatches.push(...moduleMisattrib)
  return {
    ok: mismatches.length === 0,
    mismatches,
    impactFiles,
    actualFiles,
    summary: `module-impact ${impactFiles.length} 文件 × 真实 diff ${actualFiles.length} 文件 × map 归属：${mismatches.length === 0 ? '一致 ✓' : mismatches.length + ' 类不一致'}`,
  }
}

/**
 * 第三重核对（P2-1）：矩阵行「| <模块> | `文件` |」的模块列 vs _module-map.yaml 前缀推导。
 * 只读 fail-soft：map 不可得 → 返回 []（前两重仍有效，注入文案会带 map 跳过注记）。
 */
function auditImpactModuleAttribution(impactText, actualFiles, specBase) {
  try {
    // 找 _module-map.yaml（docs/<p>/modules/ 扫描——detectModuleDocHealth 同款）
    let mapText = null
    const docsDir = join(specBase, 'docs')
    if (existsSync(docsDir)) {
      for (const d of readdirSync(docsDir)) {
        const cand = join(docsDir, d, 'modules', '_module-map.yaml')
        if (existsSync(cand)) { mapText = readFileSync(cand, 'utf8'); break }
      }
    }
    if (!mapText) return []
    const { parseModuleMapPaths } = require_module_impact()
    const map = parseModuleMapPaths(mapText)
    const deriveMod = (posixPath) => {
      for (const [id, paths] of map) {
        for (const pp of paths) {
          if (pp.endsWith('/') ? posixPath.startsWith(pp) : (posixPath === pp || posixPath.startsWith(pp + '/'))) return id
        }
      }
      return null
    }
    const out = []
    for (const m of impactText.matchAll(/^\|\s*([^|]+?)\s*\|[^|]*`([^`]+)`/gm)) {
      const recorded = m[1].trim()
      const file = m[2].split(String.fromCharCode(92)).join('/')
      if (recorded.startsWith('---') || recorded.startsWith('模块')) continue
      const derived = deriveMod(file)
      if (derived && recorded !== derived && recorded !== 'unmapped') {
        out.push(`map 归属不一致：${file} 矩阵记「${recorded}」但 map 推导为「${derived}」——修正矩阵模块列或跑 modules rebuild`)
      }
    }
    return out
  } catch { return [] }
}
// 延迟引用（防环：module-impact 不反向依赖本模块）
import * as _moduleImpactMod from './module-impact.js'
function require_module_impact() { return _moduleImpactMod }
