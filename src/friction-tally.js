/**
 * friction-tally.js — 摩擦信号计数数据层（friction-signal-hint Phase 1）
 *
 * 定位：gate 失败回滚 / verify 实测失败 / 审查打回三类摩擦事件全部流经 CLI 自身
 * 状态机，但此前没有任何计数与消费——是否值得 postmortem 全凭 agent 自觉判断。
 * 本模块用确定性代码做结构化计数（立场照抄 teamai-cli 摩擦触发器：顺利会话零
 * 打扰、每次收尾最多提示一次、可配置关闭），收尾时计数非零才由调用方输出一行
 * advisory，引导按 现象/根因/护栏/证据 补 postmortem。
 *
 * 落点红线（D-002/R-04）：计数文件只落 .runtime 树（平台同步排除区）——quick
 * 会话落 quick-sessions/<sessionId>/friction-tally.json（session 目录收尾整体删除，
 * 天然二次保险清零），真实变更落 <runtimeRoot>/friction-tally-<changeName>.json
 * （归档时由 pruneArchivedChangeRuntime 一并清理）。**永不落 changes/ 目录**——
 * 变更目录上平台同步，计数是本机行为数据，污染他机即事故。路径解析统一走
 * shared.js 的 resolveRuntimeRoot/resolveQuickSessionsDir（比 verify-lint-tally
 * 的 specBase 直拼更对齐平台模式，Grill CC-09）。
 *
 * 隐私红线（D-005）：落盘字段只含 count/lastAt/at/type/detail——type ∈ 三值枚举、
 * detail ∈ 预定义标签集（gate 来源/测试类型），永不接触提示词与对话原文。
 *
 * 静默降级立场（同 verify-lint-tally「计数器不许反向阻断」）：读写全程 try/catch，
 * 任何异常（只读目录/损坏 JSON/非法路径）吞掉返回 null/空 hint——埋点都在 gate
 * 回滚、verify 失败这些已出错路径上，计数自身再抛异常只会火上浇油。本模块自身
 * 不打印任何输出，提示何时打印由调用方决定。
 */
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { writeAtomicSync } from './fs-atomic.js'
import { withFileLock } from './quicklog.js'
import { resolveRuntimeRoot, resolveQuickSessionsDir } from './run/shared.js'

/** 摩擦事件类型枚举（D-004）：审查打回走专属 review_rejected，不与 gate_rollback 重复计 */
const FRICTION_TYPES = new Set(['gate_rollback', 'verify_run_failed', 'review_rejected'])

/** history 截尾上限（同 verify-lint-tally 的 20 条口径——台账防病态体量，不承载完整审计） */
const FRICTION_HISTORY_CAP = 20

/** quick 会话 id 形态：quick-<8 位 hex>（stage.js 建 session 目录的同一命名约定） */
const QUICK_SESSION_ID_RE = /^quick-[0-9a-f]{8}$/i

/** 提示文案的类型→中文标签映射（数组序即输出枚举序，固定 gate 回滚→验证失败→审查打回） */
const FRICTION_LABELS = [
  ['gate_rollback', 'gate 回滚'],
  ['verify_run_failed', '验证失败'],
  ['review_rejected', '审查打回'],
]

/**
 * specBase 模块内部推导（D-006 CC-04）：gates.js 的 rollbackCompletionAndReturn
 * 等埋点签名里没有 specBase，调用方只传 cwd/platformOpts。推导序与 complete.js:125
 * 收尾落盘同序（specRoot(平台) > specDriftAnchor(worktree 漂移锚定主仓) >
 * cwd/.sillyspec(本地)），否则 quick 会话计到 worktree 副本、收尾从主仓读不到。
 */
function deriveSpecBase(cwd, platformOpts) {
  return platformOpts?.specRoot || platformOpts?.specDriftAnchor || join(cwd || process.cwd(), '.sillyspec')
}

/**
 * changeName 安全校验：必须是单段文件名成分。含路径分隔符或「.」「..」会在拼
 * friction-tally-<changeName>.json 时逃出 .runtime 树，违反 D-002 落点红线。
 */
function isSafeChangeSegment(name) {
  return typeof name === 'string' && name !== '' && name !== '.' && name !== '..' && !/[\\/]/.test(name)
}

/**
 * 计数文件路径的单一路由出口（D-002/R-04：路由单一出口 + 单测断言两类路径都在
 * .runtime 树内）：quick-<8hex> 会话形态 → <sessionsDir>/<changeName>/friction-tally.json；
 * 真实变更 → <runtimeRoot>/friction-tally-<changeName>.json。返回 null = 无有效
 * 路径，调用方按 no-op 处理（空/非法 changeName 不记不消）。
 */
function frictionTallyPath({ cwd, platformOpts, changeName }) {
  if (!isSafeChangeSegment(changeName)) return null
  const specBase = deriveSpecBase(cwd, platformOpts)
  if (QUICK_SESSION_ID_RE.test(changeName)) {
    return join(resolveQuickSessionsDir(platformOpts, specBase), changeName, 'friction-tally.json')
  }
  return join(resolveRuntimeRoot(platformOpts, specBase), `friction-tally-${changeName}.json`)
}

/** YAML 布尔值宽松解析：仅显式 false（含引号形态）为关，其余值一律默认开（R-05） */
function parseEnabledValue(raw) {
  const v = String(raw || '').trim().replace(/^['"]|['"]$/g, '')
  return v.toLowerCase() !== 'false'
}

/**
 * 读 local.yaml 的 friction_hint.enabled（R-05：读失败=默认开，与「未配置=默认
 * true」走同一条兜底路径——配置读取异常不该把提示误判为关）。
 * 不引 yaml 依赖，行/正则解析（先例：extractTestCommand/extractLintCommand 同
 * 风格）；兼容嵌套（friction_hint:\n  enabled: false）与 flat
 * （friction_hint.enabled: false）两种写法；行尾先归一（坑
 * verify-modules-crlf-blanket-fallback：Windows CRLF 残留致行式正则整体失配）。
 * @param {string} specBase - spec 根（local.yaml 所在目录）
 * @returns {boolean} false 仅当显式配了 false；缺键/文件缺失/解析异常/其它值 → true
 */
function readFrictionHintEnabled(specBase) {
  try {
    const yamlPath = join(specBase, 'local.yaml')
    if (!existsSync(yamlPath)) return true
    const text = String(readFileSync(yamlPath, 'utf8')).replace(/\r\n?/g, '\n')
    let inSection = false
    let sectionIndent = -1
    for (const line of text.split('\n')) {
      // flat 形态优先：键名带点，不与嵌套段头冲突
      const flat = line.match(/^\s*friction_hint\.enabled\s*:\s*(.*?)\s*(?:#.*)?$/)
      if (flat) return parseEnabledValue(flat[1])
      const section = line.match(/^(\s*)friction_hint\s*:\s*(?:#.*)?$/)
      if (section) {
        inSection = true
        sectionIndent = section[1].length
        continue
      }
      if (!inSection) continue
      if (line.trim() === '' || line.trim().startsWith('#')) continue
      // 缩进回落到段头层级（或更浅）= friction_hint 段结束，之后的 enabled 不属于它
      if (/^\s*/.exec(line)[0].length <= sectionIndent) {
        inSection = false
        continue
      }
      const kv = line.match(/^\s*enabled\s*:\s*(.*?)\s*(?:#.*)?$/)
      if (kv) return parseEnabledValue(kv[1])
    }
    return true
  } catch {
    return true
  }
}

/**
 * 读旧计数并归一成 { events, history } 骨架：缺失/损坏 JSON/字段脏型按零计重新
 * 累计（同 recordVerifyLintTally 立场——旁路计数器对脏数据从零重来，不修复不报错）。
 */
function readFrictionTally(tallyPath) {
  const tally = { events: {}, history: [] }
  try {
    const raw = JSON.parse(readFileSync(tallyPath, 'utf8'))
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      if (raw.events && typeof raw.events === 'object' && !Array.isArray(raw.events)) tally.events = raw.events
      if (Array.isArray(raw.history)) tally.history = raw.history
    }
  } catch { /* 首记/文件损坏 → 重置重新累计 */ }
  return tally
}

/**
 * 纯渲染（单测用）：counts（type→count 平面映射）→ 一行提示文案；空/全零 → null。
 * 只枚举非零段（三类不必同时出现）；措辞条件式（「若其中有」）防 agent 为消除
 * 提示而灌水记录（R-03 三重防线之一）。
 */
export function renderFrictionHintLine(counts) {
  const segments = []
  for (const [type, label] of FRICTION_LABELS) {
    const n = Number(counts ? counts[type] : null)
    if (Number.isFinite(n) && n > 0) segments.push(`${label} ${n} 次`)
  }
  if (segments.length === 0) return null
  return `🩹 本次会话累计摩擦信号：${segments.join('、')}——若其中有值得沉淀的坑，建议按 现象/根因/护栏/证据 补一条 postmortem（QUICKLOG 条目或正文核对）；护栏结论经人工确认后归入 knowledge/known-issues.md`
}

/**
 * 记一次摩擦事件。全静默降级：非法类型/无有效路径/enabled=false/读写异常一律
 * 返回 null，绝不抛（埋点位于已出错路径，见文件头「静默降级立场」）。写走
 * writeAtomicSync（计数文件会被收尾进程并发读，半截 JSON 会让 consume 误判全零）。
 * @param {object} p
 * @param {string} [p.cwd] 调用方 cwd（specBase 兜底推导用）
 * @param {object} [p.platformOpts] 平台选项（runtimeRoot/specRoot/specDriftAnchor）
 * @param {string} p.changeName 变更名或 quick 会话 id（空/非法段 → no-op）
 * @param {string} p.type 摩擦类型，必须 ∈ FRICTION_TYPES
 * @param {string} [p.detail] 预定义来源标签（如 verify-test/quick-audit），非字符串落 null
 * @returns {{ type: string, count: number } | null} 落盘成功返回新计数；null = 未落盘
 */
export async function recordFrictionEvent({ cwd, platformOpts, changeName, type, detail }) {
  try {
    if (!FRICTION_TYPES.has(type)) return null
    const tallyPath = frictionTallyPath({ cwd, platformOpts, changeName })
    if (!tallyPath) return null
    // enabled=false 直通：record/consume 双 no-op，.runtime 零写入（D-003 一键全关）
    if (!readFrictionHintEnabled(deriveSpecBase(cwd, platformOpts))) return null
    return await withFileLock(tallyPath + ".lock", async () => {
    const tally = readFrictionTally(tallyPath)
    const at = new Date().toISOString()
    const prev = Number(tally.events[type] && tally.events[type].count)
    const count = (Number.isFinite(prev) ? prev : 0) + 1
    tally.events[type] = { count, lastAt: at }
    tally.history = [
      ...tally.history,
      { at, type, detail: typeof detail === 'string' && detail ? detail : null },
    ].slice(-FRICTION_HISTORY_CAP)
    mkdirSync(dirname(tallyPath), { recursive: true })
    writeAtomicSync(tallyPath, JSON.stringify(tally, null, 2))
    return { type, count }
    })
  } catch {
    return null
  }
}

/**
 * 读计数并消费（D-003 清零语义）：非零 → { hint: 一行提示, counts } 且删除计数
 * 文件（提示后清零，防同一批摩擦在每个收尾点反复提示）；全零/缺文件/读失败/
 * enabled=false → { hint: null, counts: {} }。counts 只含 count>0 的枚举类型
 * （未知类型/脏数据不进提示）。删文件失败不影响 hint 返回——残留计数下次收尾
 * 会再消费一次，advisory 容忍重复，不因删失败丢提示。
 * @returns {{ hint: string | null, counts: Record<string, number> }}
 */
export async function consumeFrictionHint({ cwd, platformOpts, changeName }) {
  try {
    const tallyPath = frictionTallyPath({ cwd, platformOpts, changeName })
    if (!tallyPath || !existsSync(tallyPath)) return { hint: null, counts: {} }
    if (!readFrictionHintEnabled(deriveSpecBase(cwd, platformOpts))) return { hint: null, counts: {} }
    return await withFileLock(tallyPath + ".lock", async () => {
    const tally = readFrictionTally(tallyPath)
    const counts = {}
    for (const type of FRICTION_TYPES) {
      const n = Number(tally.events[type] && tally.events[type].count)
      if (Number.isFinite(n) && n > 0) counts[type] = n
    }
    if (Object.keys(counts).length === 0) return { hint: null, counts }
    try { rmSync(tallyPath, { force: true }) } catch { /* 删失败不吞提示 */ }
    return { hint: renderFrictionHintLine(counts), counts }
    })
  } catch {
    return { hint: null, counts: {} }
  }
}
