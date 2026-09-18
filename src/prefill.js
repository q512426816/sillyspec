/**
 * prefill.js — 三槽预填引擎（change: 2026-09-18-artifact-prefill，task-01，FR-01/FR-02，
 * D-001@v1 / D-003@v1 / D-005@v1）
 *
 * 背景：verify-result 已实证的「机械预填模式」（预填≠结论，agent 逐格核对改写）推广到
 * design/tasks/taskcard 三产物——agent 从「从零写」变「核对改写」。本模块是预填的单点
 * 推导引擎：三个纯函数 + 注检测 + refresh 重放，供生成器接线（design-init/taskcard，
 * Phase 2）与 prefill-refresh 命令（Phase 3）复用，禁止两处各自重写推导漂移。
 *
 * 来源注协议（D-003）：所有预填输出行尾附加 PREFILL_NOTE。注在场 = 未确认（--done 门
 * advisory warning / refresh 可重放）；删注 = 确认动作（人工内容，refresh 不覆盖——
 * D-005 已确认跳过）。非白名单槽零触碰（D-001 红线）：本模块只产出行/值，落槽范围由
 * 调用方（生成器/refresh）限定在三槽内——①design.md 文件变更清单表、②design.md 决策
 * 追踪表、③task 卡 frontmatter requirement_ids/decision_ids。
 *
 * 解析对齐（零外部依赖手写，不引 js-yaml——decisions-io/change-list 家族先例）：
 *   - task 卡 target_files：语义对齐 src/stages/plan-postcheck.js parseTargetFiles——
 *     inline [] + 块列表双形态、NEW: 前缀拆剥、严格口径非法判定（glob/目录前缀/引号/
 *     绝对路径），但为守「零依赖手写」不做跨模块 import（该模块顶层 import js-yaml）；
 *   - decisions.md 标题：对齐 src/decisions-io.js 单一写入者的 canonical 形态
 *     （`## D-xxx@vN 标题` / 整行恰为 `## D-xxx@vN`，版本必在、无版本不收）；
 *   - requirements.md FR：对齐 src/fr-index.js 的标题式形态（`### FR-NN: 标题`，
 *     放宽标题级 #2~#6 容手写漂移）；
 *   - design.md 章节定位：对齐 src/change-list.js FILE_LIST_SECTION_RE 同义词集
 *     （该常量未导出，此处带出处复制，改一处须同步另一处）。
 *
 * 纯度口径（task-01 constraints「三纯函数与 hasUnconfirmedPrefill 纯函数零 IO」）：
 * 签名即含目录/文件入参，读取是推导的固有部分——此四函数只读不写（无副作用、同输入
 * 同输出）；runPrefillRefresh 是唯一写入口（writeAtomicSync 原子落盘，fs-atomic 先例）。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { writeAtomicSync } from './fs-atomic.js'

/**
 * 来源注协议常量（D-003）：所有预填值行尾附加的本注。
 * hasUnconfirmedPrefill 按此字面检测；门禁（Phase 4 gates/verify-probes）同源引用。
 * @type {string}
 */
export const PREFILL_NOTE = '(预填：核对后删本注)'

/** decisions.md canonical 决策标题（decisions-io 单一写入者唯一产出形态）：`## D-xxx@vN 标题` 或整行恰为 `## D-xxx@vN`（后随标题须有空白分隔，与 hasDecisionId 的双形态匹配逐字同源）。 */
const DECISION_HEADING_RE = /^## (D-\d+)@v(\d+)(?:\s.*)?$/

/** requirements.md 功能需求标题（fr-index 先例 `### FR-NN: 标题`，放宽标题级 #2~#6；FR-<域>-NNN 全局 id 无「FR-紧邻数字」形态，天然不误收）。 */
const FR_HEADING_RE = /^#{2,6}\s+(FR-\d+)\s*[:：]/

/** design.md「文件变更清单」章节标题同义词集——逐字复制自 change-list.js FILE_LIST_SECTION_RE（该常量未导出；两处须同步）。 */
const FILE_LIST_SECTION_RE = /^#{2,3}\s*(?:\d+[.)]\s*)?(文件变更清单|变更文件清单|文件清单|File Changes|Files to Change)/

/** design.md「决策追踪」章节标题（design-facts 骨架形态，容忍可选编号前缀）。 */
const DECISION_SECTION_RE = /^#{2,3}\s*(?:\d+[.)]\s*)?决策追踪/

/**
 * 读文件并归一 CRLF；文件不存在 / 不可读 / 入参非法 → null（调用方按空源处理：
 * 预填留空、现状骨架行为不变——design 兼容策略）。所有只读路径共用此入口。
 * @param {string} filePath
 * @returns {string|null}
 */
function readTextIfExists(filePath) {
  if (typeof filePath !== 'string' || filePath === '') return null
  if (!existsSync(filePath)) return null
  try {
    return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n')
  } catch {
    return null // 目录 / 权限等读失败按空源降级（fail-soft，预填是 advisory 能力）
  }
}

/**
 * 解析 task 卡 frontmatter target_files 条目（手写零依赖，语义对齐
 * stages/plan-postcheck.js parseTargetFiles：inline [] + 块列表双形态、NEW: 前缀拆剥、
 * 反斜杠与 ./ 前缀归一、严格口径非法判定）。
 * @param {string} content task 卡全文（自提取 frontmatter）
 * @returns {Array<{ raw: string, isNew: boolean, path: string, invalid: string|null }>}
 */
function parseTargetFileEntries(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return []
  const fm = fmMatch[1]
  let raws = null
  const inlineMatch = fm.match(/target_files:[ \t]*\[([^\]]*)\]/)
  if (inlineMatch) {
    raws = inlineMatch[1].split(',').map((s) => s.trim()).filter(Boolean)
  } else {
    // 块列表：[ \t]*\n 不吃换行（parseTargetFiles 坑6① 家族教训——\s* 贪婪吞顶格列表静默判空）
    const blockMatch = fm.match(/target_files:[ \t]*\n((?:[ \t]*-[ \t]+.+\n?)+)/)
    if (blockMatch) {
      raws = blockMatch[1].match(/[ \t]*-[ \t]+(.+)/g)
        ?.map((s) => s.replace(/^[ \t]*-[ \t]+/, '').trim()).filter(Boolean) || []
    }
  }
  if (raws === null || raws.length === 0) return []
  return raws.map((raw) => {
    let path = raw
    let isNew = false
    if (path.startsWith('NEW:')) { isNew = true; path = path.slice('NEW:'.length).trim() }
    path = path.replace(/\\/g, '/').replace(/^(\.\/)+/, '')
    let invalid = null
    if (path === '') invalid = '剥 NEW: / ./ 前缀后为空'
    else if (/[*?]/.test(path)) invalid = '含通配符（禁 glob）'
    else if (path.endsWith('/')) invalid = '目录前缀（须精确到文件）'
    else if (/["'`]/.test(path)) invalid = '含引号/反引号（须裸路径书写）'
    else if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) invalid = '绝对路径（须仓根相对）'
    return { raw, isNew, path, invalid }
  })
}

/**
 * 槽一（纯函数）：扫 tasksDir 下 task-*.md 的 frontmatter target_files，并集去重排序，
 * 产出 design.md 文件变更清单表行。
 *
 * 语义：
 *   - 去重键 = 剥 NEW: 后的归一路径；任一卡声明 NEW: → 输出保形 NEW: 前缀（待建文件
 *     标记不因他卡无前缀声明而丢失），操作列按 NEW: 推导（NEW:→新增，其余→修改——
 *     target_files 语义 = 本 task 计划改动的文件）。
 *   - 排序 = 归一路径码点升序（跨平台确定序，多 agent 并行下重放结果稳定）。
 *   - 非法条目（glob/目录前缀/引号/绝对路径——parseTargetFiles 同款严格口径）跳过
 *     不进清单：预填行会被 agent 核对后转正，带非法形态只会把 gate 错误提前嫁接。
 *   - 无 tasksDir / 无 task 卡 / 全空声明 → []（槽留空，生成器侧给提示行，骨架行为不变）。
 *
 * @param {{ tasksDir?: string }} opts
 * @returns {string[]} design 清单表行（形如 `| 新增 | NEW:src/foo.js | 预填自 task 卡 target_files 并集 (预填：核对后删本注) |`）
 */
export function prefillFileChangeList({ tasksDir } = {}) {
  if (typeof tasksDir !== 'string' || tasksDir === '' || !existsSync(tasksDir)) return []
  let files
  try {
    files = readdirSync(tasksDir).filter((f) => /^task-.+\.md$/.test(f)).sort()
  } catch {
    return []
  }
  // 归一路径 → { isNew }；同路径多卡声明时 NEW: 取并（任一声明待建即待建）
  const union = new Map()
  for (const f of files) {
    const text = readTextIfExists(join(tasksDir, f))
    if (!text) continue
    for (const e of parseTargetFileEntries(text)) {
      if (e.invalid) continue
      const prev = union.get(e.path)
      if (!prev) union.set(e.path, { isNew: e.isNew })
      else if (e.isNew) prev.isNew = true
    }
  }
  return [...union.keys()]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((p) => {
      const isNew = union.get(p).isNew
      return `| ${isNew ? '新增' : '修改'} | ${isNew ? 'NEW:' : ''}${p} | 预填自 task 卡 target_files 并集 ${PREFILL_NOTE} |`
    })
}

/**
 * 槽二（纯函数）：解析 changeDir/decisions.md 的 canonical 决策标题（## D-xxx@vN，
 * decisions-io 单一写入者形态），产出 design.md 决策追踪表行（状态列「待确认」）。
 *
 * 排序 = D 编号数字升序、同号版本升序；重复标题去重。无 decisions.md / 无 canonical
 * 标题（扁平列表、### 级手写漂移形态不收——对齐 hasDecisionId 的 fail-closed 口径）
 * → []。
 * @param {{ changeDir?: string }} opts
 * @returns {string[]} 决策追踪表行（形如 `| D-001@v1 | （待填覆盖点） | 待确认 (预填：核对后删本注) |`——三列对齐 design-facts 骨架「决策|覆盖点|状态」，待确认落状态列）
 */
export function prefillDecisionTable({ changeDir } = {}) {
  const text = readTextIfExists(typeof changeDir === 'string' ? join(changeDir, 'decisions.md') : null)
  if (!text) return []
  const seen = new Set()
  const entries = []
  for (const line of text.split('\n')) {
    const m = line.match(DECISION_HEADING_RE)
    if (!m) continue
    const id = `${m[1]}@v${m[2]}`
    if (seen.has(id)) continue
    seen.add(id)
    entries.push({ id, number: parseInt(m[1].slice(2), 10), version: parseInt(m[2], 10) })
  }
  entries.sort((a, b) => a.number - b.number || a.version - b.version || (a.id < b.id ? -1 : 1))
  return entries.map((e) => `| ${e.id} | （待填覆盖点） | 待确认 ${PREFILL_NOTE} |`)
}

/**
 * 槽三（纯函数）：从 changeDir 的 requirements.md（标题式 FR-NN）与 decisions.md
 * （canonical D-xxx@vN）抽取 TaskCard frontmatter 的 requirement_ids / decision_ids。
 *
 * 各自去重排序（FR 按数字升序、D 按编号+版本升序）；源文件缺失 → 对应数组留空
 * （生成器侧按在场文件预填、缺则留空数组+提示行——design Phase 2 语义）。
 * @param {{ changeDir?: string }} opts
 * @returns {{ requirementIds: string[], decisionIds: string[] }}
 */
export function prefillCardIds({ changeDir } = {}) {
  const requirementIds = []
  const decisionIds = []
  const base = typeof changeDir === 'string' ? changeDir : null
  const reqText = readTextIfExists(base ? join(base, 'requirements.md') : null)
  if (reqText) {
    const seen = new Set()
    for (const line of reqText.split('\n')) {
      const m = line.match(FR_HEADING_RE)
      if (m) seen.add(m[1])
    }
    requirementIds.push(...[...seen].sort((a, b) =>
      parseInt(a.slice(3), 10) - parseInt(b.slice(3), 10) || (a < b ? -1 : 1)))
  }
  const decText = readTextIfExists(base ? join(base, 'decisions.md') : null)
  if (decText) {
    const seen = new Set()
    for (const line of decText.split('\n')) {
      const m = line.match(DECISION_HEADING_RE)
      if (m) seen.add(`${m[1]}@v${m[2]}`)
    }
    decisionIds.push(...[...seen].sort((a, b) => {
      const [an, av] = a.slice(2).split('@v')
      const [bn, bv] = b.slice(2).split('@v')
      return parseInt(an, 10) - parseInt(bn, 10) || parseInt(av, 10) - parseInt(bv, 10) || (a < b ? -1 : 1)
    }))
  }
  return { requirementIds, decisionIds }
}

/**
 * 预填注在场检测（门禁与 refresh 共用的确认判据，D-003/D-005）：文件内容含 PREFILL_NOTE
 * 即存在未确认预填。文件不存在 / 不可读 → false（无注可删即无未确认项，不误报）。
 * @param {string} filePath
 * @returns {boolean}
 */
export function hasUnconfirmedPrefill(filePath) {
  const text = readTextIfExists(filePath)
  return text !== null && text.includes(PREFILL_NOTE)
}

/* ---------------------------------------------------------------------------
 * runPrefillRefresh —— 三槽重放（唯一写入口；D-005：已确认跳过，注已删=人工内容不覆盖）
 * ------------------------------------------------------------------------- */

/**
 * design.md 表格槽重放：在章节表格的内容区尾部追加预填行（查重——已在位的行不重复追加）。
 * 有人工内容（内容行含未带注行，或章节内有非表格非注释非空的正文/列表行——分类列表
 * 写法的人类产出同样受保护）→ confirmed 跳过；无源可预填 → skipped；预填就位
 * （本次写入或已在位）→ filled。
 *
 * 行坐标视角约定：章节内首个表格行视为表头（骨架与 brainstorm 模板的既定形态），
 * 表头与分隔行不参与人工判定，内容行 = 表头之后的表格行。
 * @param {string[]} lines 全文行（已归一 \n）
 * @param {{ slotLabel: string, sectionRe: RegExp, headerLines: string[], prefillRows: string[] }} opts
 * @param {{ filled: number, skipped: number, confirmed: number, lines: string[] }} result
 * @returns {boolean} 是否发生写入（调用方统一落盘）
 */
function refreshDesignTableSlot(lines, opts, result) {
  const { slotLabel, sectionRe, headerLines, prefillRows } = opts
  const start = lines.findIndex((l) => sectionRe.test(l))
  if (start === -1) {
    result.skipped += 1
    result.lines.push(`⏭️ ${slotLabel}：design.md 无该章节，跳过（现状骨架行为不变）`)
    return false
  }
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { end = i; break }
  }
  // 表格行定位（含表头；分隔行排除——change-list 同款判定）
  const tableRowIdxs = []
  for (let i = start + 1; i < end; i++) {
    if (lines[i].startsWith('|') && !/^\|[-:\s|]+\|$/.test(lines[i])) tableRowIdxs.push(i)
  }
  const contentRowIdxs = tableRowIdxs.slice(1) // 首表格行 = 表头
  const hasHumanContent = contentRowIdxs.some((i) => !lines[i].includes(PREFILL_NOTE))
    || lines.slice(start + 1, end).some((l) => {
      const t = l.trim()
      return t !== '' && !t.startsWith('<!--') && !t.startsWith('|') // 散文/分类列表 = 人工产出
    })
  if (hasHumanContent) {
    result.confirmed += 1
    result.lines.push(`🔒 ${slotLabel}：已有人工内容（预填注已删/非预填行），确认态跳过不覆盖`)
    return false
  }
  if (prefillRows.length === 0) {
    result.skipped += 1
    result.lines.push(`⏭️ ${slotLabel}：无源可预填（推导为空），跳过`)
    return false
  }
  const existing = new Set(contentRowIdxs.map((i) => lines[i].trim()))
  const toAdd = prefillRows.filter((r) => !existing.has(r.trim()))
  if (toAdd.length === 0) {
    result.filled += 1
    result.lines.push(`✅ ${slotLabel}：预填 ${prefillRows.length} 行已在位（幂等，0 追加，注在场待核对）`)
    return false
  }
  if (tableRowIdxs.length > 0) {
    // 追加位置：最后一个内容行后；无内容行（仅表头）则表头/分隔行后
    let insertAt
    if (contentRowIdxs.length > 0) {
      insertAt = contentRowIdxs[contentRowIdxs.length - 1] + 1
    } else {
      insertAt = tableRowIdxs[0] + 1
      if (insertAt < end && /^\|[-:\s|]+\|$/.test(lines[insertAt])) insertAt += 1
    }
    lines.splice(insertAt, 0, ...toAdd)
  } else {
    // 章节内全无表格（兜底）：表头 + 预填行整体插在标题行后
    lines.splice(start + 1, 0, '', ...headerLines, ...toAdd)
  }
  result.filled += 1
  result.lines.push(`✅ ${slotLabel}：预填追加 ${toAdd.length} 行（未确认——注在场，核对后删注）`)
  return true
}

/**
 * task 卡 ids 槽重放（requirement_ids / decision_ids 各计一槽）：
 *   - 值非空且注在场 → 未确认预填 → 按最新推导重放（源更新语义，R-01：requirements/
 *     decisions 变更后 refresh 刷新值；与在位值一致则零写入）；
 *   - 值非空且无注 → 人工内容（确认态）→ confirmed 跳过不覆盖；
 *   - 值空/占位（[] 或 taskcard 骨架 [FR-XX]/[D-XXX@vN]）且推导非空 → 直填+注；
 *   - 值空且推导为空（源缺失）→ 留空跳过。
 * @param {string[]} lines task 卡全文行（已归一 \n）
 * @param {number} fmEnd frontmatter 闭合 --- 的行下标
 * @param {string} field 字段名（requirement_ids / decision_ids）
 * @param {string[]} derived 预填值（prefillCardIds 对应数组）
 * @param {string} basename 文件名（advisory 行标注用）
 * @param {{ filled: number, skipped: number, confirmed: number, lines: string[] }} result
 * @returns {boolean} 是否发生写入
 */
function refreshTaskIdSlot(lines, fmEnd, field, derived, basename, result) {
  const slotLabel = `${basename} ${field}`
  const fieldRe = new RegExp(`^${field}:`)
  let fi = -1
  for (let i = 0; i < fmEnd; i++) {
    if (fieldRe.test(lines[i])) { fi = i; break }
  }
  let fe = fi + 1
  if (fi >= 0) {
    while (fe < fmEnd && /^\s*-[ \t]/.test(lines[fe])) fe++ // 块列表形态占用区
  }
  const valueText = fi >= 0 ? lines.slice(fi, fe).join('\n') : ''
  // 值条目收集（inline [] / 块列表 / 标量兜底；注释不入条目）
  const entries = []
  const firstLine = valueText.split('\n', 1)[0] || ''
  const inline = firstLine.match(new RegExp(`^${field}:\\s*\\[([^\\]]*)\\]`))
  if (inline) {
    entries.push(...inline[1].split(',').map((s) => s.trim()).filter(Boolean))
  } else {
    const scalar = firstLine.slice(firstLine.indexOf(':') + 1).replace(/#.*$/, '').trim().replace(/^\[|\]$/g, '')
    if (scalar) entries.push(scalar)
  }
  for (const l of valueText.split('\n').slice(1)) {
    const m = l.match(/^\s*-\s+(.+)/)
    if (m) entries.push(m[1].trim())
  }
  const placeholderRe = field === 'requirement_ids' ? /^FR-XX$/i : /^D-XXX@vN$/i
  const isEmptyValue = entries.length === 0 || entries.every((e) => placeholderRe.test(e))

  if (!isEmptyValue) {
    if (!valueText.includes(PREFILL_NOTE)) {
      result.confirmed += 1
      result.lines.push(`🔒 ${slotLabel}：人工值在场（注已删），确认态跳过不覆盖`)
      return false
    }
    if (derived.length === 0) {
      result.skipped += 1
      result.lines.push(`⏭️ ${slotLabel}：注在场但源缺失（无可推导值），保留原预填值跳过`)
      return false
    }
    const newline = `${field}: [${derived.join(', ')}]  # ${PREFILL_NOTE}`
    if (fi >= 0 && fe - fi === 1 && lines[fi] === newline) {
      result.filled += 1
      result.lines.push(`✅ ${slotLabel}：预填值已在位（幂等，0 改写，注在场待核对）`)
      return false
    }
    lines.splice(fi, fe - fi, newline)
    result.filled += 1
    result.lines.push(`✅ ${slotLabel}：未确认（注在场），按最新源重放预填`)
    return true
  }
  if (derived.length === 0) {
    result.skipped += 1
    result.lines.push(`⏭️ ${slotLabel}：无可预填源（推导为空），留空跳过`)
    return false
  }
  const newline = `${field}: [${derived.join(', ')}]  # ${PREFILL_NOTE}`
  if (fi >= 0) lines.splice(fi, fe - fi, newline)
  else lines.splice(fmEnd, 0, newline) // 字段缺失（存量卡）→ 闭合 --- 前补写
  result.filled += 1
  result.lines.push(`✅ ${slotLabel}：空/占位 → 预填 ${derived.length} 项（注在场，核对后删注）`)
  return true
}

/**
 * 三槽重放（唯一 IO 写入口；D-005）：对 changeDir 的 design.md 两表槽（文件变更清单 /
 * 决策追踪——均「在表后追加预填行，有人工行=已确认跳过」）与 tasks/*.md ids 槽执行预填。
 *
 * 计数语义（advisory，每槽累计；lines 每槽一行结果供 CLI 透出）：
 *   - filled：槽未确认（无人工内容）且预填内容就位——含幂等重放时「已在位零改写」的槽，
 *     保证同输入二次重放 { filled, skipped, confirmed } 逐字段一致（幂等契约）；
 *   - skipped：槽无源可预填（源文件/章节缺失、推导为空、注在场但源缺失保留原值）；
 *   - confirmed：槽有人工内容（预填注已删 / 非预填行 / 人工值）→ 保护跳过不覆盖。
 *
 * 写入：writeAtomicSync 原子落盘（fs-atomic 先例）；仅在内容变化时写；文件 EOL 跟随原文件。
 * 变更目录不存在：三计数归零 + 一行告警（fail-soft，CLI 侧自行决定 exit code）。
 *
 * @param {{ cwd?: string, specBase?: string, changeName?: string }} opts
 *   cwd/specBase 同 change-delete/archive-delta 口径：specBase 缺省 = join(cwd, '.sillyspec')
 * @returns {Promise<{ filled: number, skipped: number, confirmed: number, lines: string[] }>}
 */
export async function runPrefillRefresh({ cwd, specBase, changeName } = {}) {
  const base = specBase || join(cwd || process.cwd(), '.sillyspec')
  const changeDir = join(base, 'changes', String(changeName || ''))
  const result = { filled: 0, skipped: 0, confirmed: 0, lines: [] }
  if (!changeName || !existsSync(changeDir)) {
    result.lines.push(`⚠️ 变更目录不存在: ${changeDir}（三槽均无法预填）`)
    return result
  }

  // 槽一/槽二：design.md 文件变更清单 + 决策追踪（单次读盘，两槽共一份行数组后统一落盘）
  const designPath = join(changeDir, 'design.md')
  const designRaw = readTextIfExists(designPath)
  if (designRaw === null) {
    result.skipped += 2
    result.lines.push('⏭️ design.md 文件变更清单：design.md 不存在，跳过')
    result.lines.push('⏭️ design.md 决策追踪：design.md 不存在，跳过')
  } else {
    // EOL 探测回读原文（readTextIfExists 返回的是 CRLF 归一文本，探测不了原始 EOL——
    // upsertDecision 同款「原文探测 + 归一编辑 + 原 EOL 回写」口径）
    let eolProbe = '\n'
    try { eolProbe = readFileSync(designPath, 'utf8').includes('\r\n') ? '\r\n' : '\n' } catch { /* 保持 \n */ }
    const lines = designRaw.split('\n')
    const listRows = prefillFileChangeList({ tasksDir: join(changeDir, 'tasks') })
    const decisionRows = prefillDecisionTable({ changeDir })
    let dirty = false
    dirty = refreshDesignTableSlot(lines, {
      slotLabel: 'design.md 文件变更清单',
      sectionRe: FILE_LIST_SECTION_RE,
      headerLines: ['| 操作 | 文件路径 | 说明 |', '|---|---|---|'],
      prefillRows: listRows,
    }, result) || dirty
    dirty = refreshDesignTableSlot(lines, {
      slotLabel: 'design.md 决策追踪',
      sectionRe: DECISION_SECTION_RE,
      headerLines: ['| 决策 | 覆盖点 | 状态 |', '|---|---|---|'],
      prefillRows: decisionRows,
    }, result) || dirty
    if (dirty) writeAtomicSync(designPath, lines.join(eolProbe))
  }

  // 槽三：tasks/*.md 的 requirement_ids / decision_ids
  const tasksDir = join(changeDir, 'tasks')
  if (!existsSync(tasksDir)) {
    result.skipped += 1
    result.lines.push('⏭️ tasks/*.md ids 槽：tasks 目录不存在，跳过')
    return result
  }
  const { requirementIds, decisionIds } = prefillCardIds({ changeDir })
  let taskFiles = []
  try {
    taskFiles = readdirSync(tasksDir).filter((f) => /^task-.+\.md$/.test(f)).sort()
  } catch {
    taskFiles = []
  }
  for (const f of taskFiles) {
    const taskPath = join(tasksDir, f)
    const raw = readTextIfExists(taskPath)
    if (raw === null) continue
    // frontmatter 边界：首行 --- 与其闭合 ---（无 frontmatter 的存量文件跳过——两槽各计 skipped）
    const lines = raw.split('\n')
    let fmEnd = -1
    if (lines[0] !== undefined && lines[0].trim() === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') { fmEnd = i; break }
      }
    }
    if (fmEnd === -1) {
      result.skipped += 2
      result.lines.push(`⏭️ ${f} requirement_ids：无 frontmatter，跳过`)
      result.lines.push(`⏭️ ${f} decision_ids：无 frontmatter，跳过`)
      continue
    }
    let eolProbe = '\n'
    try { eolProbe = readFileSync(taskPath, 'utf8').includes('\r\n') ? '\r\n' : '\n' } catch { /* 保持 \n */ }
    let dirty = false
    dirty = refreshTaskIdSlot(lines, fmEnd, 'requirement_ids', requirementIds, f, result) || dirty
    // decision_ids 插行可能移动 fmEnd（字段缺失时在 fmEnd 处插入）——插入点在 fmEnd 本身，闭合 --- 后移，重定位
    let fmEndNow = fmEnd
    if (dirty) {
      fmEndNow = -1
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') { fmEndNow = i; break }
      }
      if (fmEndNow === -1) fmEndNow = lines.length
    }
    dirty = refreshTaskIdSlot(lines, fmEndNow, 'decision_ids', decisionIds, f, result) || dirty
    if (dirty) writeAtomicSync(taskPath, lines.join(eolProbe))
  }
  return result
}
