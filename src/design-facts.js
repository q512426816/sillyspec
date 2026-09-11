/**
 * design-facts — 设计事实核验 + design 骨架渲染纯函数集
 * （change: 2026-09-07-ir-stage-p3c，task-01，FR-01/FR-02，D-001@v1/D-002@v1/D-004@v1）
 *
 * 职责（设计文档 Wave 1 + Wave 2 的纯函数本体，接线在 task-02/03）：
 *   1. parseDecisionDomains(decisionsText)：decisions.md 文本 → 当前版本 D 条目的模块域投影
 *      [{ id, domains }]（NEW: 前缀项原样保留，豁免存在性核验）。
 *   2. loadModuleMap(specRoot, project)：_module-map.yaml → { ids, prefixPairs } | null。
 *   3. validateDecisionModuleRefs({ changeDir, specRoot, project })：模块域分级核验
 *      （ERROR=幻觉模块/书写错误，WARNING=声明域×实改面差异，skipped=无索引/无决策）。
 *   4. generateDesignSkeleton({ changeName, decisionsText, author, now })：design.md 十三章节
 *      骨架字符串（章节标题逐字取自 brainstorm Step 6 模板，R-03——禁止自创措辞）。
 *
 * 依赖方向（R-01 单向防环）：design-facts → decision-distill / change-list / modules，
 * 三者均不反向 import 本模块。条目解析双源说明：distill 的 parseDecisions 只吃 changeDir
 * （内部读盘），故文本入口 parseDecisionDomains 持有其行循环的逐字镜像（正则/字段映射/
 * 列表切分全部同源复制），validateDecisionModuleRefs 则直接复用 parseDecisions 导出——
 * 双解析一致性由 task-04 的同一 fixture 双源测试锁定。
 *
 * 信封 code（task-02 接线层使用，本模块已内嵌在消息前缀）：
 *   decision_module_ref_invalid（ERROR）/ decision_module_domain_gap（WARNING）/
 *   decision_module_check_skipped（skipped 原因字符串，接线层包 code）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseDecisions } from './decision-distill.js'
import { parseFileChangeListDetailed } from './change-list.js'
import { parseModuleMapSimple } from './modules.js'

// ---------------------------------------------------------------------------
// 条目解析（distill parseDecisions 的同源镜像，R-01）
// ---------------------------------------------------------------------------

/** 模块域值解析（decision-distill.js:47 parseListValue 逐字镜像）：`[a, b]` / `a、b` / `a b` → ['a','b'] */
function parseListValue(v) {
  return v.replace(/^\[/, '').replace(/\]$/, '')
    .split(/[,，、\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

/** 模块域字段标签集（decision-distill.js:77 applyField 的 domains 分支同款，中英标签+中英冒号兼容） */
const DOMAIN_LABELS = new Set(['模块域', '模块', 'domains', 'domain'])

/**
 * decisions.md 文本 → 裸条目数组（decision-distill.js:98 parseDecisions 行循环的模块域子集镜像：
 * 头部正则 :114 / 字段行正则 :123 逐字同源；仅解析本模块消费的 id/number/version/domains）。
 * @param {string} content decisions.md 全文
 * @returns {Array<{ id: string, number: string, version: number, domains: string[] }>}
 */
function extractDomainEntries(content) {
  const entries = []
  let cur = null
  const flush = () => {
    if (!cur) return
    entries.push(cur)
    cur = null
  }
  for (const line of String(content ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const h = line.match(/^##\s+(D-\d+)(?:@v(\d+))?\s*(.*)$/)
    if (h) {
      flush()
      const version = h[2] ? parseInt(h[2], 10) : 1
      cur = { id: `${h[1]}@v${version}`, number: h[1], version, domains: [] }
      continue
    }
    if (!cur) continue
    const f = line.match(/^-\s+([^\s：:]+)\s*[：:]\s*(.*)$/)
    if (f && DOMAIN_LABELS.has(f[1].toLowerCase())) cur.domains = parseListValue(f[2].trim())
  }
  flush()
  return entries
}

/**
 * 当前版本过滤（decision-distill.js:462 highestByNumber 同款）：同号只留最高版本
 * （D-xxx@v1 与 @v2 并存时 v1 视为 superseded 旧版剔除）。
 * @template T
 * @param {Array<T & { number: string, version: number }>} entries
 * @returns {T[]}
 */
function currentVersionEntries(entries) {
  const highestByNumber = new Map()
  for (const e of entries) {
    const prev = highestByNumber.get(e.number)
    if (!prev || e.version > prev.version) highestByNumber.set(e.number, e)
  }
  return [...highestByNumber.values()]
}

/**
 * 纯函数：解析 decisions.md 文本的当前版本决策条目模块域（FR-01）。
 * NEW: 前缀项原样保留在 domains 项内（`NEW:foo` 豁免存在性核验；`NEW: foo` 带空格会被
 * parseListValue 切成裸项 'NEW:'/'foo'，由 validateDecisionModuleRefs 报书写错误）。
 * @param {string} decisionsText decisions.md 全文（纯文本入参，不读盘）
 * @returns {Array<{ id: string, domains: string[] }>} 当前版本条目（同号取最高 @vN，首现顺序）
 */
export function parseDecisionDomains(decisionsText) {
  return currentVersionEntries(extractDomainEntries(decisionsText))
    .map(e => ({ id: e.id, domains: [...e.domains] }))
}

// ---------------------------------------------------------------------------
// 模块索引（_module-map.yaml 只读，复用 modules.js canonical 解析避免三写）
// ---------------------------------------------------------------------------

/**
 * 读 docs/<project>/modules/_module-map.yaml → 模块 id 集合 + paths 前缀对（FR-01）。
 * 解析复用 modules.js parseModuleMapSimple（canonical 单一真相源）；prefixPairs 含
 * paths+core_files（与 decision-distill.js:203 matchImpactsToModules 的取并集口径一致），
 * 目录条目去尾斜杠后按「全等或目录前缀」匹配。
 * @param {string} specRoot 规范根目录（如 <repo>/.sillyspec——与 run/prompt.js 的 specBase 同义）
 * @param {string} project 子项目名（docs/ 下第一段目录名）
 * @returns {{ ids: Set<string>, prefixPairs: Array<{ id: string, path: string }> } | null}
 *   无 map / 不可读 / 解析不出任何模块 → null（无索引不误拦，调用方走 skipped）
 */
export function loadModuleMap(specRoot, project) {
  if (!specRoot || !project) return null
  const mapPath = join(specRoot, 'docs', project, 'modules', '_module-map.yaml')
  if (!existsSync(mapPath)) return null
  let content
  try { content = readFileSync(mapPath, 'utf8') } catch { return null }
  let parsed = {}
  try { parsed = parseModuleMapSimple(content) || {} } catch { return null }
  const ids = new Set(Object.keys(parsed))
  if (ids.size === 0) return null // 空/失配 map 视同无索引（fail-open，D-002）
  const prefixPairs = []
  for (const [id, m] of Object.entries(parsed)) {
    for (const p of [...((m && m.paths) || []), ...((m && m.core_files) || [])]) {
      const ps = String(p).replace(/\\/g, '/').replace(/\/+$/, '')
      if (ps) prefixPairs.push({ id, path: ps })
    }
  }
  return { ids, prefixPairs }
}

// ---------------------------------------------------------------------------
// 核验（FR-02 分级：ERROR / WARNING / skipped）
// ---------------------------------------------------------------------------

/**
 * design 文件清单路径 × module-map paths 前缀 → 实改模块集（decision-distill.js:212 同款
 * 匹配语义：全等或目录前缀命中）。未命中任何模块的文件不产生推导（R-02：模块 paths 缺口
 * 不误报，只对命中的做差异）。
 * @param {string[]} filePaths design.md 文件变更清单路径（仓根相对、正斜杠）
 * @param {Array<{ id: string, path: string }>} prefixPairs loadModuleMap 的前缀对
 * @returns {Set<string>} 实改模块 id 集
 */
export function deriveActualModules(filePaths, prefixPairs) {
  const actual = new Set()
  for (const f of filePaths) {
    const t = String(f || '').replace(/\\/g, '/').replace(/\/+$/, '')
    if (!t) continue
    for (const { id, path: p } of prefixPairs) {
      if (t === p || t.startsWith(p + '/')) { actual.add(id); break }
    }
  }
  return actual
}

/**
 * 核验变更决策的模块域引用（FR-02/D-002/D-004；brainstorm「生成规范文件」步 --done gate 本体，
 * 接线在 task-02）。分级：
 *   - ERROR（decision_module_ref_invalid）：
 *     · 模块域项 ∉ _module-map.yaml 且无 NEW: 前缀（模块幻觉）——出路提示二选一；
 *     · 裸项 'NEW:'（`NEW: <名>` 冒号后带空格被列表切分）——书写错误，附正确写法。
 *   - WARNING（decision_module_domain_gap）：
 *     · design.md 文件清单推导的实改模块集 × 声明域并集差异（双向，措辞留人工裁量）；
 *     · 全部条目均未填模块域 → 汇总一条（存量兼容）。
 *   - skipped：decisions.md 不存在 / module-map 缺失（无索引不误拦）→ ok=true + skipped 原因。
 * @param {{ changeDir: string, specRoot: string, project: string }} opts
 *   changeDir=变更目录（含 decisions.md 与 design.md）；specRoot=规范根；project=子项目名
 * @returns {{ ok: boolean, errors: string[], warnings: string[], skipped?: string }}
 *   ok = errors.length === 0（WARNING 不拦）；errors/warnings 每条已内嵌信封 code 前缀，
 *   skipped 为原因字符串（接线层包 decision_module_check_skipped）。
 */
export function validateDecisionModuleRefs({ changeDir, specRoot, project } = {}) {
  const errors = []
  const warnings = []

  if (!changeDir) {
    return { ok: true, errors, warnings, skipped: 'changeDir 未提供——核验跳过' }
  }
  const parsed = parseDecisions(changeDir) // distill 权威条目解析（:98 导出，单向依赖）
  if (parsed.missing) {
    return { ok: true, errors, warnings, skipped: `decisions.md 不存在（${join(changeDir, 'decisions.md')}）——无决策条目可核验，跳过` }
  }
  const moduleMap = loadModuleMap(specRoot, project)
  if (!moduleMap) {
    return { ok: true, errors, warnings, skipped: `_module-map.yaml 不存在或不可解析（${join(specRoot || '?', 'docs', project || '?', 'modules', '_module-map.yaml')}）——无模块索引不误拦，跳过` }
  }

  // ① 存在性核验（ERROR）：NEW: 前缀豁免；∈ ids 通过；否则幻觉 ERROR（附出路）
  const entries = currentVersionEntries(parsed.entries)
    .map(e => ({ id: e.id, domains: e.domains ? [...e.domains] : [] }))
  let anyDeclared = false
  for (const { id, domains } of entries) {
    if (domains.length > 0) anyDeclared = true
    for (const item of domains) {
      if (item === 'NEW:') {
        errors.push(`[decision_module_ref_invalid] ${id} 模块域书写错误：出现裸项 "NEW:"（"NEW: <名>" 冒号后带空格会被列表切分成 "NEW:" 与 "<名>" 两项）——正确写法 NEW:<名>（冒号后不加空格，如 NEW:design-facts）`)
      } else if (item.startsWith('NEW:')) {
        // 新模块声明：豁免存在性核验（D-002/D-004），原样保留
      } else if (!moduleMap.ids.has(item)) {
        errors.push(`[decision_module_ref_invalid] ${id} 模块域含未注册模块 "${item}"——补录 _module-map.yaml 或改用 NEW:${item} 前缀声明新模块`)
      }
    }
  }

  // ② 全部条目无模块域 → 汇总一条 WARNING（存量兼容，零红门禁）
  if (entries.length > 0 && !anyDeclared) {
    warnings.push(`[decision_module_domain_gap] decisions.md 解析出 ${entries.length} 条当前版本决策，均未填写「模块域」可选字段——模块引用核验无对象（存量兼容放行；建议补填：模块 ID 取自 docs/${project}/modules/_module-map.yaml，新模块用 NEW:<名> 前缀声明）`)
  }

  // ③ 实改面 × 声明域差异（WARNING 双向；design.md 缺失/无清单时静默跳过——R-02 不产噪）。
  //    声明侧只计已注册的非 NEW: 域：NEW: 域按定义不在 map 内、未注册域已由 ① 报 ERROR，
  //    纳入只会产生重复噪音。
  if (anyDeclared) {
    const fileList = parseFileChangeListDetailed(join(changeDir, 'design.md')).map(e => e.path)
    if (fileList.length > 0) {
      const actual = deriveActualModules(fileList, moduleMap.prefixPairs)
      const declared = new Set()
      for (const { domains } of entries) {
        for (const d of domains) {
          if (!d.startsWith('NEW:') && moduleMap.ids.has(d)) declared.add(d)
        }
      }
      for (const m of actual) {
        if (!declared.has(m)) warnings.push(`[decision_module_domain_gap] 实改模块 "${m}"（design.md 文件清单命中该模块路径）未出现在任何决策的模块域声明中——请确认是遗漏声明（补填模块域）还是文件清单多列`)
      }
      for (const d of declared) {
        if (!actual.has(d)) warnings.push(`[decision_module_domain_gap] 声明模块域 "${d}" 未命中 design.md 文件清单中的任何文件——可能为纯设计影响/跨模块约束（人工裁量即可），也可能是文件清单遗漏`)
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

// ---------------------------------------------------------------------------
// design.md 骨架渲染（Wave 2；R-03：章节标题逐字取自 brainstorm Step 6 模板，禁止自创）
// ---------------------------------------------------------------------------

/**
 * 生成 design.md 十三章节骨架字符串（纯函数不落盘，写盘/幂等保护由 design-init CLI 负责）。
 * 章节标题与 brainstorm.js「design.md 必须包含的章节」模板逐字对齐（1 背景/2 设计目标/
 * 3 非目标/4 拆分判断/5 总体方案/6 文件变更清单/7 接口定义/7.5 生命周期契约表/8 数据模型/
 * 9 兼容策略/10 风险登记/11 决策追踪/12 自审），满足 stage-contract-spec 的字面命中检查
 * （文件变更清单/风险登记/自审/生命周期豁免）与 plan.design-readiness 六章就绪检查。
 * 决策追踪表从 decisionsText 当前版本 D 条目逐行预填；文件变更清单给表头+示例注释行
 * （注释形态不会被 plan-postcheck 清单解析计入）。
 * @param {{ changeName?: string, decisionsText?: string, author?: string, now?: string }} opts
 *   changeName=变更简述（入标题）；decisionsText=decisions.md 全文；author/now=frontmatter 值
 * @returns {string} design.md 骨架全文（LF 行尾，单一尾换行）
 */
export function generateDesignSkeleton({ changeName, decisionsText, author, now } = {}) {
  const change = String(changeName || '').trim() || '<变更简述>'
  const decisions = parseDecisionDomains(decisionsText || '')

  const lines = []
  lines.push('---')
  lines.push(`author: ${String(author || '').trim() || 'TODO（git 用户名）'}`)
  lines.push(`created_at: ${String(now || '').trim() || 'TODO（ISO 时间）'}`)
  // P2-e provenance 戳（noai-ir-roadmap §5）：CLI 骨架出品的可审计标记——铁律 8 收窄为
  //「骨架优先，仅手写补文档才手填元数据」的依据（validateMetadata 未来可据此只认 CLI 戳）
  lines.push(`generated_by: sillyspec-design-init`)
  lines.push('scale: large')
  lines.push('---')
  lines.push('')
  lines.push(`# 设计文档（Design）— ${change}`)
  lines.push('')
  lines.push(`<!-- 由 sillyspec design-init 生成的骨架（${change}）——逐节填散文后删除本注释；存量手写路径不受影响 -->`)
  lines.push('')

  lines.push('## 背景')
  lines.push('')
  lines.push('<!-- TODO：为什么做、解决什么问题 -->')
  lines.push('')

  lines.push('## 设计目标')
  lines.push('')
  lines.push('<!-- TODO：要达成什么 -->')
  lines.push('')

  lines.push('## 非目标')
  lines.push('')
  lines.push('<!-- TODO：明确不做的事（防止 scope creep） -->')
  lines.push('')

  lines.push('## 拆分判断')
  lines.push('')
  lines.push('<!-- TODO（如适用）：为什么这样组织变更、为什么不走批量模式；不适用可整节删除 -->')
  lines.push('')

  lines.push('## 总体方案')
  lines.push('')
  lines.push('<!-- TODO：技术方案（分 Phase/Wave） -->')
  lines.push('')

  lines.push('## 文件变更清单')
  lines.push('')
  lines.push('| 操作 | 文件路径 | 说明 |')
  lines.push('|---|---|---|')
  lines.push('<!-- 示例行（替换为实际清单后删除本注释）：| 新增 | src/xxx/NewFile.java | 说明（含对外字段时交代 producer→consumer 数据流） | -->')
  lines.push('')

  lines.push('## 接口定义')
  lines.push('')
  lines.push('<!-- TODO（代码类任务必填）：方法签名、数据结构 -->')
  lines.push('')

  lines.push('## 生命周期契约表')
  lines.push('')
  lines.push('<!-- TODO：涉及 session/lease/agent_run/daemon/lifecycle/state transition/claim/heartbeat 等关键词时本表必填（事件×发起方×接收方×必需字段×状态变化 矩阵）；确实不涉及时在紧邻位置写豁免短语——否定词必须紧邻「生命周期契约/lifecycle contract」，宽写法不被识别（写法见 brainstorm 模板） -->')
  lines.push('')

  lines.push('## 数据模型')
  lines.push('')
  lines.push('<!-- TODO（如涉及）：表结构/字段变更；不涉及可整节删除或写明无 schema 变更 -->')
  lines.push('')

  lines.push('## 兼容策略（brownfield 必填）')
  lines.push('')
  lines.push('<!-- TODO（brownfield 必填）：未配置新功能时行为不变 / 新旧逻辑的回退路径 / 不改变的 API 与表结构 -->')
  lines.push('')

  lines.push('## 风险登记')
  lines.push('')
  lines.push('| 编号 | 风险 | 等级 | 应对策略 |')
  lines.push('|---|---|---|---|')
  lines.push('| R-01 | （待填风险） | P1 | （待填应对策略） |')
  lines.push('')

  lines.push('## 决策追踪')
  lines.push('')
  lines.push('| 决策 | 覆盖点 | 状态 |')
  lines.push('|---|---|---|')
  if (decisions.length > 0) {
    for (const { id } of decisions) lines.push(`| ${id} | （待填覆盖点） | 待确认 |`)
  } else {
    lines.push('<!-- 未从 decisions.md 解析出当前版本决策条目——如确无决策可写「无决策记录」 -->')
  }
  lines.push('<!-- TODO：说明每个 D-xxx@vN 被哪些 FR-xxx / 设计章节覆盖；标注仍未解决的 D-xxx@vN 或剩余风险 -->')
  lines.push('')

  lines.push('## 自审')
  lines.push('')
  lines.push('- [ ] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）')
  lines.push('- [ ] frontmatter 字段齐全（author/created_at/scale）')
  lines.push('- [ ] 引用所有当前版本 D-xxx@vN')
  lines.push('- [ ] 涉及生命周期关键词时含「生命周期契约表」或紧邻豁免短语')
  lines.push('- [ ] UI 原型分级核对（涉前端文件时变更目录应有 prototype-*.html 或跳过原因记入风险登记）')
  lines.push('- [ ] 不确定的问题标注「⚠️ 自审存疑」')
  lines.push('')

  return lines.join('\n')
}


// ---------------------------------------------------------------------------
// design.md 文件清单行级核验（change: 2026-09-07-ir-hardening，D-004@v1，FR-02）
// ---------------------------------------------------------------------------

/** 剥路径中的 <...> 占位段（`docs/<project>/scan` → `docs/`；占位形态对齐 collectDocRefs 层1 容差先例） */
function stripPathPlaceholders(p) {
  return String(p || '').replace(/<[^/>]*>/g, '').replace(/\/{2,}/g, '/').replace(/\/$/, '')
}

/**
 * validateDesignFileList —— design.md 文件变更清单逐条存在性核验（幻觉路径 gate）。
 *
 * 分级（design D-004 + Grill P2-⑤）：
 *   - `NEW:` 前缀（解析器不剥前缀，startsWith 直判）→ 通过（计划新建文件豁免）
 *   - 路径存在（cwd 相对 existsSync；判前剥 <...> 占位段）→ 通过
 *   - 含 glob 字符（* / ?）→ warning 跳过（pathMatches 体系本支持 glob 合法形态，existsSync 恒 false 会假 ERROR——fail-soft）
 *   - 其余 → errors { path, message }（信封 code design_file_ref_invalid）
 *   - design.md 不存在/无清单段/解析异常 → warnings（small 变更可无清单；fail-soft 不阻断）
 *
 * 范围：keepSillyspecDocs=true——`.sillyspec/docs/**` 交付物路径在核验范围内（其余 .sillyspec/ 条目解析器本就丢弃）。
 * 纯函数不落盘。
 *
 * @param {{ changeDir: string, cwd: string }} opts
 * @returns {{ ok: boolean, errors: Array<{path, message}>, warnings: string[] }}
 */
export function validateDesignFileList({ changeDir, cwd } = {}) {
  const errors = []
  const warnings = []
  try {
    if (!changeDir || !cwd) {
      return { ok: true, errors, warnings: ['design 清单核验跳过：缺少 changeDir/cwd'] }
    }
    const designPath = join(changeDir, 'design.md')
    if (!existsSync(designPath)) {
      return { ok: true, errors, warnings: ['design 清单核验跳过：design.md 不存在'] }
    }
    const entries = parseFileChangeListDetailed(designPath, { keepSillyspecDocs: true })
    if (!Array.isArray(entries) || entries.length === 0) {
      return { ok: true, errors, warnings: ['design 清单核验跳过：design.md 无文件变更清单段（small 变更可无清单）'] }
    }
    for (const e of entries) {
      const raw = String((e && e.path) || '').trim()
      if (!raw) continue
      if (raw.startsWith('NEW:')) continue // 计划新建豁免（与 validateTargetFiles 同语义）
      if (raw.includes('*') || raw.includes('?')) {
        warnings.push(`design 清单条目含 glob 字符跳过存在性核验：${raw}`)
        continue
      }
      const normalized = stripPathPlaceholders(raw)
      if (!normalized || normalized === '.') continue
      if (!existsSync(join(cwd, normalized))) {
        errors.push({
          path: raw,
          message: `design_file_ref_invalid：文件变更清单条目「${raw}」既不存在也无 NEW: 前缀（幻觉路径/书写错误）——修正路径，或计划新建的文件改为 NEW:${raw} 前缀`,
        })
      }
    }
    return { ok: errors.length === 0, errors, warnings }
  } catch (e) {
    return { ok: true, errors, warnings: [`design 清单核验异常 fail-soft 放行：${e && e.message ? e.message : e}`] }
  }
}
