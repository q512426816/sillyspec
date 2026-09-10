/**
 * 变更范围对账纯函数模块（变更 2026-09-10-change-scope-audit task-01，design §总体方案 Wave 1）。
 *
 * 「计划改动 × 实际改动」机械对账的单一数据源（D-003 同源）：scope-audit 命令（task-03）与
 * execute --done / verify --done / archive --confirm / quick --done 四处注入（task-04 至 task-06）
 * 全部只 import 本模块三个导出，禁止各自实现采集。
 *
 * 双模式自动判定（design 接口定义）：
 *   - quick：changeName 匹配 quick-<8hex> 且 locateQuickSessionGuard 命中 → 重跑
 *     auditQuickCompletion 同款窗口归属（baseline 剔除/他者退栈/软归属），行数对未提交
 *     工作区采集（git diff HEAD --numstat + untracked wc-l），baseAnchor='quick-window:<id>'。
 *   - full-flow：resolveReconcileActualFiles（verify-postcheck.js，task-02 已 export+baseAnchor）
 *     出实际文件集与 diff 基点锚；计划侧解析 design.md 文件清单复用 change-list.js（零自研）。
 *
 * 行数三档（D-002）：tracked → numstat；untracked 新文件 → wc-l 记全 + 行；binary（numstat
 * 两列 '-'）→ additions/deletions=null。三态（full-flow）：planned / unplanned / untouched。
 *
 * 全 advisory（D-006）：不抛错阻断、不写门禁状态；任何异常 catch 后并入 degradedReason。
 * 纯读：不落盘、不改 guard/进度库。Windows 路径 \\→/ 归一，ESM-only，零新依赖。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { locateQuickSessionGuard, auditQuickCompletion, resolveRuntimeRoot, collectOtherQuickSessionDeclarations } from './run/shared.js'
import { safeGit } from './git-helper.js'
import { parseFileChangeListDetailed, pathMatches } from './change-list.js'

/** quick 会话 id 形态（与 run/command.js :652 QUICK_SID_RE 同款——crypto.randomUUID 前 8 hex） */
const QUICK_SID_RE = /^quick-[0-9a-f]{8}$/

/** 归一：git/porcelain/numstat 产物与调用方入参统一正斜杠（Windows 兼容） */
function toPosix(p) {
  return String(p || '').replace(/\\/g, '/')
}

/**
 * numstat rename 路径提取：`old => new`（整段）或 `prefix/{old => new}/suffix`（花括号折叠）
 * 两种形态都取 rename 后的新路径；非 rename 原样返回。
 * @param {string} raw numstat 第三列原文
 * @returns {string}
 */
function extractRenameTarget(raw) {
  const brace = raw.match(/^(.*)\{([^{}]*)=>([^{}]*)\}(.*)$/)
  if (brace) {
    const merged = brace[1] + brace[3] + brace[4]
    return merged.replace(/\/{2,}/g, '/')
  }
  const arrow = raw.indexOf(' => ')
  if (arrow >= 0) return raw.slice(arrow + 4).trim()
  return raw
}

/**
 * wc -l 语义计行（untracked 新文件档）：统计 \n 字符数，末行无换行符也计一行（逻辑行口径，
 * advisory 展示够用）。0x0A 在合法 UTF-8 多字节序列中不出现，String 解码后计数等价于字节扫描。
 * 读失败返回 null（不出伪数据）。
 * @param {string} absPath
 * @returns {number|null}
 */
function countLinesOnDisk(absPath) {
  try {
    const buf = readFileSync(absPath)
    if (buf.length === 0) return 0
    const text = buf.toString('utf8')
    let n = 0
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++
    return text.charCodeAt(text.length - 1) === 10 ? n : n + 1
  } catch {
    return null
  }
}

/**
 * 行数三档采集（quick 与 full-flow 共用，D-002 / R-03 单次 git 调用非逐文件）。
 *
 *   - tracked 改动：`git diff --numstat <baseRef>` 单次调用（不带 pathspec：数百文件 pathspec
 *     会超 Windows CreateProcess 命令行长度上限，全量输出后按 paths 过滤等价且更稳）。
 *   - numstat 不含 untracked：paths 中不在 numstat 输出的文件按盘上存在性走 wc-l 档
 *     （additions=全 + 行 / deletions=0 / kind='new'）或 deleted 兜底（0/0）。
 *   - binary（numstat 两列 '-'）：additions/deletions=null，kind='binary'。
 *   - numstat 命中且盘上已不存在 → kind='deleted'（tracked 删除）；存在 → 'modified'。
 *
 * 降级：baseRef 缺失 / git 调用失败 → 空 Map（调用方按「行数列不可得」降级，不出伪数据）。
 *
 * @param {string} cwd git 调用与文件读取根（仓库根；full-flow 形态 A 传 worktree 根）
 * @param {string[]} paths 仓库根相对路径（反斜杠自动归一）
 * @param {{ baseRef?: string }} [opts] diff 基点（full-flow=baseAnchor hash；quick='HEAD'）
 * @returns {Map<string, {additions: number|null, deletions: number|null, kind: 'binary'|'new'|'modified'|'deleted'}>}
 */
export function collectNumstatByPath(cwd, paths, { baseRef } = {}) {
  const result = new Map()
  const wanted = [...new Set((Array.isArray(paths) ? paths : []).map(toPosix).filter(Boolean))]
  if (!cwd || wanted.length === 0 || !baseRef) return result

  const numstatIndex = new Map()
  const r = safeGit(cwd, ['diff', '--numstat', baseRef], { timeout: 30 * 1000 })
  if (!r.error && typeof r.value === 'string') {
    for (const line of r.value.split('\n')) {
      if (!line) continue
      const cols = line.split('\t')
      if (cols.length < 3) continue
      const additions = cols[0]
      const deletions = cols[1]
      const rawPath = cols.slice(2).join('\t')
      const path = toPosix(extractRenameTarget(rawPath.trim()))
      if (!path) continue
      if (additions === '-' && deletions === '-') {
        numstatIndex.set(path, { additions: null, deletions: null, kind: 'binary' })
      } else {
        const a = /^\d+$/.test(additions) ? Number(additions) : null
        const d = /^\d+$/.test(deletions) ? Number(deletions) : null
        // kind 由 addedSet/deletedSet 精判（下方采集），先占位 modified
        numstatIndex.set(path, { additions: a, deletions: d, kind: 'modified' })
      }
    }
  }

  // 相对基点的新增/删除集合（kind 精判：已提交/已暂存的新 tracked 文件 numstat 命中但语义是
  // 'new' 档）。固定常数次 git 调用（非逐文件，R-03 不破坏）；失败 → 空 Set 走盘面兜底。
  const listedSet = (filter) => {
    const out = new Set()
    const lr = safeGit(cwd, ['diff', '--name-only', '--diff-filter=' + filter, baseRef], { timeout: 30 * 1000 })
    if (!lr.error && typeof lr.value === 'string') {
      for (let p of lr.value.split('\n')) {
        p = toPosix(p.replace(/^"|"$/g, '').trim())
        if (p) out.add(p)
      }
    }
    return out
  }
  const addedSet = listedSet('A')
  const deletedSet = listedSet('D')

  for (const [path, entry] of numstatIndex) {
    if (entry.kind === 'binary') continue
    if (addedSet.has(path)) entry.kind = 'new'
    else if (deletedSet.has(path)) entry.kind = 'deleted'
    else entry.kind = existsSync(join(cwd, path)) ? 'modified' : 'deleted'
  }

  for (const p of wanted) {
    const hit = numstatIndex.get(p)
    if (hit) { result.set(p, hit); continue }
    // numstat 不含 untracked（git diff 只看 tracked）：盘上存在 → 新文件 wc-l 档；不存在 → 删除兜底
    if (existsSync(join(cwd, p))) {
      const lines = countLinesOnDisk(join(cwd, p))
      result.set(p, { additions: lines, deletions: 0, kind: 'new' })
    } else {
      result.set(p, { additions: 0, deletions: 0, kind: 'deleted' })
    }
  }
  return result
}

/**
 * QUICKLOG 是否已落该会话条目（「quick 已提交」降级判定）：guard.quicklogId 在
 * <specBase>/quicklog/*.md 中有条目头（`## <qlId> | ...`，quicklog.js allocateQuicklogEntry 契约）。
 * @param {string} guardSpecBase guard 锚定的 spec 根（locateQuickSessionGuard 产物）
 * @param {string|null} qlId guard.quicklogId
 * @returns {boolean}
 */
function quicklogHasEntry(guardSpecBase, qlId) {
  if (!guardSpecBase || !qlId) return false
  const dir = join(guardSpecBase, 'quicklog')
  let files
  try {
    files = readdirSync(dir).filter(f => f.endsWith('.md'))
  } catch {
    return false
  }
  const marker = `## ${qlId} `
  for (const f of files) {
    try {
      if (readFileSync(join(dir, f), 'utf8').includes(marker)) return true
    } catch { /* 单文件读失败跳过 */ }
  }
  return false
}

/** 三态行数兜底档（baseAnchor=null / numstat 不可得时）：不出伪行数，kind 从盘面可判则判 */
function degradedStat(root, path) {
  return { additions: null, deletions: null, kind: existsSync(join(root, path)) ? 'modified' : 'deleted' }
}

/** 汇总非 null 行数（binary 与降级 null 不计入，不出伪数据） */
function sumTotals(rows) {
  let additions = 0
  let deletions = 0
  for (const r of rows) {
    if (Number.isFinite(r.additions)) additions += r.additions
    if (Number.isFinite(r.deletions)) deletions += r.deletions
  }
  return { additions, deletions }
}

/**
 * quick 模式对账：重跑 auditQuickCompletion 同款窗口归属（不改其判定语义，只消费结果）。
 * 他者会话声明索引与 --done 收尾同源实时采集（complete-handlers :1050 同款 merge），保证
 * foreignDeclared 豁免面与门禁口径一致（R-04：行数只对归属本会话的文件采集）。
 */
async function computeQuickAudit({ cwd, platformOpts, sessionId, located }) {
  const guardSpecBase = located.specBase
  const guard = located.guard
  // 审计在「创建会话的项目根」跑（located.specBase 父目录）：cd 漂移后 cwd 可能是子目录，
  // git 状态对根/子目录等价（同仓），但 wc-l / existsSync 需要仓库根。
  const sessionRoot = dirname(guardSpecBase)

  let audit = null
  let auditFailure = null
  try {
    const mergedGuard = {
      ...guard,
      otherSessionsDeclared: collectOtherQuickSessionDeclarations(platformOpts, guardSpecBase, sessionId),
    }
    audit = await auditQuickCompletion(sessionRoot, mergedGuard, {})
  } catch (e) {
    auditFailure = e && e.message ? String(e.message).split('\n')[0] : String(e)
  }

  const base = {
    mode: 'quick',
    ok: true,
    degradedReason: null,
    baseAnchor: `quick-window:${sessionId}`,
    totals: { files: 0, additions: 0, deletions: 0 },
    rows: [],
    excluded: { foreignDeclared: [] },
    note: null,
  }

  if (!audit || typeof audit !== 'object') {
    return { ...base, ok: false, degradedReason: `quick 窗口审计不可用: ${auditFailure || '未知异常'}` }
  }
  // auditQuickCompletion 的 git 锚点失败（status 读不到）会把「审计失败」推入 reasons——此时
  // changedFiles 空是「读不到」不是「没改动」，不可当空表冒充实时。
  const hardFailure = (audit.reasons || []).find(r => typeof r === 'string' && r.startsWith('审计失败'))
  if (hardFailure) {
    return { ...base, ok: false, degradedReason: `quick 窗口审计失败: ${hardFailure}` }
  }

  // 归属切分（消费 auditQuickCompletion 产物，不重算）：attributedFiles（含 sameFileHits）→
  // declared；undeclaredFiles − softTestFiles → undeclared；softTestFiles → soft。
  const attributed = Array.isArray(audit.attributedFiles) ? audit.attributedFiles.map(toPosix) : []
  const undeclared = Array.isArray(audit.undeclaredFiles) ? audit.undeclaredFiles.map(toPosix) : []
  const softSet = new Set((Array.isArray(audit.softTestFiles) ? audit.softTestFiles : []).map(toPosix))
  const attrSet = new Set(attributed)

  const rowFiles = [...new Set([...attributed, ...undeclared])]
  const stats = collectNumstatByPath(sessionRoot, rowFiles, { baseRef: 'HEAD' })

  const rows = rowFiles.map(f => {
    const st = stats.get(f) || degradedStat(sessionRoot, f)
    const attribution = attrSet.has(f) ? 'declared' : (softSet.has(f) ? 'soft' : 'undeclared')
    return {
      path: f,
      declared: attribution === 'declared',
      additions: st.additions,
      deletions: st.deletions,
      kind: st.kind,
      attribution,
    }
  })

  const totals = { files: rows.length, ...sumTotals(rows) }

  // 「quick 已提交」降级（design 总体方案）：窗口空（changedFiles 空）且 QUICKLOG 已有该会话
  // 条目 → 记录态提示读 QUICKLOG，不以空表冒充实时。
  let note = null
  if (rowFiles.length === 0) {
    const qlId = guard.quicklogId || null
    if (quicklogHasEntry(guardSpecBase, qlId)) {
      note = `quick 会话无未提交改动（窗口已提交）——记录态请读 QUICKLOG 条目 ${qlId}（${toPosix(join(guardSpecBase, 'quicklog'))}/）`
    } else {
      note = 'quick 会话当前无未提交改动（QUICKLOG 亦无该会话条目——会话未产生改动或已被清理）'
    }
  }

  return {
    ...base,
    totals,
    rows,
    excluded: {
      foreignDeclared: Array.isArray(audit.foreignSessionDeclared)
        ? audit.foreignSessionDeclared.filter(x => x && typeof x === 'object')
        : [],
    },
    note,
  }
}

/**
 * full-flow 模式对账：design.md 清单（change-list.js 解析）× resolveReconcileActualFiles
 * 实际文件集 → 三态 + 行数。三条降级路径见 design（清单解析失败 / baseAnchor=null / quick
 * 已提交归 quick 模式），全带 degradedReason 或 note。
 */
async function computeFullFlowAudit({ cwd, specBase, changeName, platformOpts }) {
  const sb = specBase || join(cwd, '.sillyspec')

  // —— 计划侧（单一真相：change-list.js，禁自研表格解析）——
  const designMdPath = join(sb, 'changes', changeName, 'design.md')
  let plannedEntries = []
  let planDegraded = null
  try {
    // keepSillyspecDocs=true：与 actual 侧 filterDeliverableFiles 保留 .sillyspec/docs/** 交付物
    // 的口径对齐（dogfood 模块文档=交付物）
    plannedEntries = parseFileChangeListDetailed(designMdPath, { keepSillyspecDocs: true })
  } catch (e) {
    planDegraded = `design.md 清单解析异常: ${e && e.message ? String(e.message).split('\n')[0] : e}`
  }
  if (!planDegraded && plannedEntries.length === 0) {
    planDegraded = existsSync(designMdPath)
      ? 'design.md 无「文件变更清单」章节或清单为空——降级实际侧 only 视图（不出三态列）'
      : `design.md 不存在（${toPosix(designMdPath)}）——降级实际侧 only 视图（不出三态列）`
  }

  // —— 实际侧（verify-postcheck.js task-02 契约：files + baseAnchor；动态 import 隔离
  //    并行时序——task-02 未落地时降级说明而非炸）——
  let actual = null
  let actualFailure = null
  try {
    const mod = await import('./verify-postcheck.js')
    if (typeof mod.resolveReconcileActualFiles !== 'function') {
      throw new Error('resolveReconcileActualFiles 未导出（依赖契约未就绪）')
    }
    const runtimeRoot = resolveRuntimeRoot(platformOpts, sb)
    actual = mod.resolveReconcileActualFiles({ cwd, specBase: sb, runtimeRoot, changeName })
  } catch (e) {
    actualFailure = e && e.message ? String(e.message).split('\n')[0] : String(e)
  }

  const base = {
    mode: 'full-flow',
    ok: false,
    degradedReason: null,
    baseAnchor: null,
    totals: { files: 0, additions: 0, deletions: 0 },
    rows: [],
    excluded: { foreignDeclared: [] },
    note: null,
  }

  if (!actual || actual.ok === false) {
    // 实际侧整体失败：三态无锚不出表（fail-soft 单行提示由注入点兑现），计划侧降级信息一并带出
    const reason = actualFailure
      || (actual && actual.degradedReason)
      || '实际侧文件集解析失败'
    return { ...base, degradedReason: [reason, planDegraded].filter(Boolean).join('；') }
  }

  // —— 行数采集根与基点 ——
  // 形态 A（worktree 存活）：改动在 worktree 工作树，baseAnchor 是 meta 锚 commit——numstat
  // 必须对 worktree 跑（worktree 共享主仓对象库可解析锚 commit；对主仓跑会把主仓工作树当对比面）。
  // 判定与 resolveVerifyChangedFiles :1048 同款（读同一份 meta，非另造口径）。
  let numstatRoot = cwd
  if (actual.form === 'worktree') {
    try {
      const meta = JSON.parse(readFileSync(join(sb, '.runtime', 'worktrees', changeName, 'meta.json'), 'utf8'))
      if (meta.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath)) {
        numstatRoot = meta.worktreePath
      }
    } catch { /* meta 读失败 → 主仓根兜底（advisory） */ }
  }

  const degraded = []
  if (planDegraded) degraded.push(planDegraded)
  if (!actual.baseAnchor) {
    degraded.push(`baseAnchor=null（${actual.form} 形态无 diff 锚点）——行数列不可得，不出伪行数`)
  }

  const stats = actual.baseAnchor
    ? collectNumstatByPath(numstatRoot, actual.files, { baseRef: actual.baseAnchor })
    : new Map()

  // —— 三态判定 ——
  const rows = []
  const matchedPlanned = new Set()
  for (const f of (Array.isArray(actual.files) ? actual.files : [])) {
    const path = toPosix(f)
    const st = stats.get(path) || degradedStat(numstatRoot, path)
    const row = { path, additions: st.additions, deletions: st.deletions, kind: st.kind }
    if (!planDegraded) {
      // 双向容差匹配（change-list.js pathMatches：相等/目录前缀/glob——design 清单可写 glob）
      const entry = plannedEntries.find(e => pathMatches(path, e.path))
      if (entry) {
        matchedPlanned.add(entry.path)
        row.planned = entry.operation || null
        row.verdict = 'planned'
      } else {
        row.planned = null
        row.verdict = 'unplanned'
      }
    }
    rows.push(row)
  }
  // 计划未动：清单文件无实际改动 → 补行（行数 0/0）；计划侧降级时不产（plannedEntries 为空天然不跑）
  for (const e of plannedEntries) {
    if (matchedPlanned.has(e.path)) continue
    rows.push({ path: e.path, planned: e.operation || null, additions: 0, deletions: 0, kind: 'modified', verdict: 'untouched' })
  }

  return {
    ...base,
    ok: true,
    degradedReason: degraded.length > 0 ? degraded.join('；') : null,
    baseAnchor: actual.baseAnchor || null,
    totals: { files: rows.length, ...sumTotals(rows) },
    rows,
    excluded: { foreignDeclared: [] },
    note: null,
  }
}

/**
 * 变更范围对账纯函数（scope-audit 命令与三处阶段注入的唯一数据源，D-003）。
 *
 * 模式自动判定：changeName 匹配 quick-<8hex> 且 locateQuickSessionGuard 命中 → quick；
 * 形态命中但 guard 缺失 → ok=false（命令层 exit 1 提示会话不存在）；否则 full-flow。
 *
 * 全 advisory（D-006）：不抛错、不写门禁状态；任何内部异常 catch 后并入 degradedReason。
 * 纯读无落盘。返回结构见 design.md 接口定义（--json 直接序列化）。
 *
 * @param {{ cwd: string, specBase?: string|null, changeName: string, platformOpts?: object|null }} opts
 *   - cwd：仓库根（git 调用根；quick 模式实际用会话创建根——祖先链定位防 cd 漂移）
 *   - specBase：.sillyspec 根（缺省 join(cwd,'.sillyspec')；平台模式传 specRoot）
 *   - platformOpts：{ runtimeRoot?, specDriftAnchor? }（resolveRuntimeRoot 消费，可 null）
 * @returns {Promise<{
 *   mode: 'quick'|'full-flow', ok: boolean, degradedReason: string|null, baseAnchor: string|null,
 *   totals: { files: number, additions: number, deletions: number },
 *   rows: Array<{ path: string, planned?: string|null, declared?: boolean,
 *                 additions: number|null, deletions: number|null,
 *                 kind: 'binary'|'new'|'modified'|'deleted',
 *                 verdict?: 'planned'|'unplanned'|'untouched', attribution?: 'declared'|'soft'|'undeclared' }>,
 *   excluded: { foreignDeclared: Array<{ file: string, sessions: string[] }> },
 *   note?: string|null }>}
 */
export async function computeChangeScopeAudit({ cwd, specBase, changeName, platformOpts } = {}) {
  const empty = {
    mode: 'full-flow', ok: false, degradedReason: null, baseAnchor: null,
    totals: { files: 0, additions: 0, deletions: 0 },
    rows: [], excluded: { foreignDeclared: [] }, note: null,
  }
  try {
    if (!cwd || !changeName) {
      return { ...empty, degradedReason: '参数缺失：cwd 与 changeName 必填' }
    }
    // quick 模式判定（pattern + guard 双条件，与 run/command.js :140/:652 口径一致）
    if (QUICK_SID_RE.test(changeName)) {
      const located = locateQuickSessionGuard(cwd, changeName)
      if (located) {
        return await computeQuickAudit({ cwd, platformOpts, sessionId: changeName, located })
      }
      return {
        ...empty,
        mode: 'quick',
        degradedReason: `quick 会话 ${changeName} 不存在（祖先链各 specBase 下均无 guard.json——会话已清理或从未创建）`,
      }
    }
    return await computeFullFlowAudit({ cwd, specBase, changeName, platformOpts })
  } catch (e) {
    // fail-soft 兜底（D-006 / 兼容策略）：注入点只打一行提示，不阻断阶段完成
    return {
      ...empty,
      degradedReason: `scope-audit 内部异常: ${e && e.message ? String(e.message).split('\n')[0] : e}`,
    }
  }
}

/** verdict / attribution → 展示标记（人类可读面；BIN 为 binary 行数占位，— 为降级占位） */
const VERDICT_LABEL = {
  planned: '✓ 计划内',
  unplanned: '⚠️ 计划外',
  untouched: '⚠️ 计划未动',
}
const ATTRIBUTION_LABEL = {
  declared: '✓ 已声明',
  soft: '🔍 软归属',
  undeclared: '⚠️ 未声明',
}

function fmtCount(n) {
  if (Number.isFinite(n)) return String(n)
  return null // binary / 降级 → 由调用侧定占位
}

/**
 * 人类可读表渲染（含汇总行与 ⚠️ 标记；design 接口定义 renderScopeAuditTable）。
 *
 * 防御式：result 任意字段缺失/畸形不抛（advisory 展示层）。opts.maxRows 截断 + 指引行
 * （R-03：大表注入场景由调用方传 60，命令直跑缺省全表）。
 *
 * @param {object} result computeChangeScopeAudit 返回值
 * @param {{ maxRows?: number }} [opts] 可选截断（缺省不截）
 * @returns {string}
 */
export function renderScopeAuditTable(result, opts = {}) {
  const r = result && typeof result === 'object' ? result : {}
  const rows = Array.isArray(r.rows) ? r.rows : []
  const totals = r.totals && typeof r.totals === 'object' ? r.totals : {}
  const excluded = r.excluded && typeof r.excluded === 'object' ? r.excluded : {}
  const foreignDeclared = Array.isArray(excluded.foreignDeclared) ? excluded.foreignDeclared : []
  const lines = []

  const modeLabel = r.mode === 'quick' ? `quick 会话（${r.baseAnchor || 'quick-window'}）` : 'full-flow 变更'
  lines.push(`📋 变更范围对账（${modeLabel}）`)

  if (r.ok === false) {
    lines.push(`   ⚠️ ${r.degradedReason || '对账不可用'}`)
    return lines.join('\n')
  }

  lines.push(`   基点: ${r.baseAnchor || '（无锚点——行数列降级）'}`)
  if (r.degradedReason) lines.push(`   ⚠️ 降级: ${r.degradedReason}`)

  if (rows.length === 0) {
    lines.push('   （无对账行）')
    if (r.note) lines.push(`   ℹ️ ${r.note}`)
    return lines.join('\n')
  }

  // 表头：full-flow 出三态列（计划侧降级时 rows 无 verdict → 走归属列兜底展示路径）
  const hasVerdict = rows.some(x => x && x.verdict)
  const hasAttribution = rows.some(x => x && x.attribution)
  if (hasVerdict) lines.push('   文件                                    三态          +行   -行   类型')
  else if (hasAttribution) lines.push('   文件                                    归属          +行   -行   类型')
  else lines.push('   文件                                                  +行   -行   类型')

  const maxRows = Number.isFinite(opts.maxRows) && opts.maxRows > 0 ? opts.maxRows : Infinity
  const shown = rows.slice(0, maxRows)
  for (const row of shown) {
    if (!row || typeof row !== 'object') continue
    const stat = row.kind === 'binary'
      ? { a: 'BIN', d: 'BIN' }
      : { a: fmtCount(row.additions) ?? '—', d: fmtCount(row.deletions) ?? '—' }
    const label = VERDICT_LABEL[row.verdict] || ATTRIBUTION_LABEL[row.attribution] || ''
    lines.push(`   ${row.path || '(未知路径)'}${' '.repeat(Math.max(1, 40 - String(row.path || '').length))}${label}${' '.repeat(Math.max(1, 12 - label.length))}${String(stat.a).padStart(5)} ${String(stat.d).padStart(5)}   ${row.kind || ''}`)
  }
  if (rows.length > shown.length) {
    lines.push(`   …（其余 ${rows.length - shown.length} 行截断——完整表跑 sillyspec scope-audit --change <name>）`)
  }

  lines.push(`   合计：${totals.files ?? rows.length} 文件  +${totals.additions ?? 0} / -${totals.deletions ?? 0}`)

  // ⚠️ 出口指引（full-flow 三态面）：计划外补声明、计划未动确认遗漏
  const unplanned = rows.filter(x => x && x.verdict === 'unplanned').length
  const untouched = rows.filter(x => x && x.verdict === 'untouched').length
  if (unplanned > 0 || untouched > 0) {
    const parts = []
    if (unplanned > 0) parts.push(`计划外 ${unplanned} 文件`)
    if (untouched > 0) parts.push(`计划未动 ${untouched} 文件`)
    lines.push(`   ⚠️ ${parts.join('、')}——计划外请补 design.md 声明或 --output 注明原因；计划未动请确认是否遗漏`)
  }
  const undeclared = rows.filter(x => x && x.attribution === 'undeclared').length
  if (undeclared > 0) lines.push(`   ⚠️ 未声明 ${undeclared} 文件——超出 allowedFiles 声明面，补 --files 声明或注明原因`)

  // 他者会话声明排除面（R-04：不进 rows，单列可见）
  if (foreignDeclared.length > 0) {
    lines.push(`   他者会话声明（不进上表，归属对应会话审计）：`)
    for (const x of foreignDeclared) {
      if (!x || typeof x !== 'object') continue
      const sessions = Array.isArray(x.sessions) ? x.sessions.join(', ') : String(x.sessions || '')
      lines.push(`   - ${x.file || '(未知文件)'}（${sessions}）`)
    }
  }

  if (r.note) lines.push(`   ℹ️ ${r.note}`)
  return lines.join('\n')
}
