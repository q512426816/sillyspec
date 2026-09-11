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
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { locateQuickSessionGuard, auditQuickCompletion, resolveRuntimeRoot, collectOtherQuickSessionDeclarations, ancestorSpecDirs } from './run/shared.js'
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
    // git 花括号形态 `src/{old => new}.js`：组3 带前导对齐空格须剥（审查 C-F03——
    // 不剥则拼出 `src/ new.js` 键错，改名文件落 untracked wc-l 档记成整文件新增）
    const merged = brace[1] + brace[3].replace(/^ /, '') + brace[4]
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

/**
 * 变更目录解析（活跃 → 归档两形态）：归档后目录在 changes/archive/<名>/，计划侧 design.md
 * 与「已归档」判定都从这里取（quick-8aa52289：归档变更 scope-audit 可查）。
 * @returns {{ dir: string, archived: boolean }|null}
 */
function resolveChangeDir(sb, changeName) {
  const active = join(sb, 'changes', changeName)
  if (existsSync(active)) return { dir: active, archived: false }
  const archived = join(sb, 'changes', 'archive', changeName)
  if (existsSync(archived)) return { dir: archived, archived: true }
  return null
}

/**
 * diff 执行根解析（computeFullFlowAudit 行数采集与 getFileDiff 单文件 diff 共用，防双实现）：
 * 形态 A（worktree 存活）→ worktree 工作树（改动在那、主仓工作树不是对比面）；其余 → cwd。
 */
function resolveDiffRoot(sb, changeName, form, cwd) {
  if (form === 'worktree') {
    try {
      const meta = JSON.parse(readFileSync(join(sb, '.runtime', 'worktrees', changeName, 'meta.json'), 'utf8'))
      if (meta.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath)) {
        return meta.worktreePath
      }
    } catch { /* 读失败 → cwd 兜底（advisory） */ }
  }
  return cwd
}

/**
 * execute --done 时点快照读取（归档记录态数据源）：结构即 computeFullFlowAudit 返回值 +
 * savedAt。读取链（quick-359a48f1）：变更目录 scope-audit.json（审计级，随归档入库）→
 * .runtime/scope-audit-<change>.json（存量兼容）→ null（调用方降级，不出伪数据）。
 */
function readScopeSnapshot(changeDir, runtimeRoot, changeName) {
  if (changeDir) {
    try {
      const snap = JSON.parse(readFileSync(join(changeDir, 'scope-audit.json'), 'utf8'))
      if (snap && typeof snap === 'object' && Array.isArray(snap.rows)) return snap
    } catch { /* 缺失/损坏 → 下一源 */ }
  }
  try {
    const snap = JSON.parse(readFileSync(join(runtimeRoot, `scope-audit-${changeName}.json`), 'utf8'))
    if (snap && typeof snap === 'object' && Array.isArray(snap.rows)) return snap
  } catch { /* 缺失/损坏 → null */ }
  return null
}

/**
 * 冻结 patch 读取（审计级存储，--file 已收尾切片的数据源）：变更目录 scope-audit.patch。
 * @returns {string|null}
 */
function readFrozenPatch(changeDir) {
  if (!changeDir) return null
  try {
    const text = readFileSync(join(changeDir, 'scope-audit.patch'), 'utf8')
    return text && text.trim() ? text : null
  } catch { return null }
}

/**
 * patch 段过滤（quick-90015473）：全量 diff 按 `diff --git a/<old> b/<new>` 段头切分，
 * 只保留 files 集合内的段——json rows（退栈归属集）与 patch 同口径，多会话仓不把并行
 * 会话改动重复冻结进每份 patch（实测 341KB 中 98% 为并行文件）。
 */
function filterPatchForFiles(patchText, filesSet) {
  if (!patchText) return ''
  const lines = patchText.split('\n')
  const out = []
  let capturing = false
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      const m = line.match(/^diff --git a\/(.+) b\/(.+)$/)
      const p = m ? toPosix(m[2]) : null
      capturing = !!(p && filesSet.has(p))
    }
    if (capturing) out.push(line)
  }
  return out.join('\n')
}

/**
/** patch 内容 sha256（A-F01 防篡改锚——写入方存 json.patchSha256，读取方校验） */
function sha256Text(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/**
 * 冻结 patch 完整性校验（A-F01）：json 记录的 patchSha256 与 patch 实文比对。
 * @returns {boolean|null} true=一致；false=不匹配（可能被篡改）；null=未记录 hash（旧记录）
 */
function verifyPatchIntegrity(recordedSha, patchText) {
  if (!recordedSha || typeof recordedSha !== 'string') return null
  return sha256Text(patchText) === recordedSha
}

/**
 * 冻结 patch 生成（quick-359a48f1 审计级 / quick-90015473 归属口径修正）：tracked 改动 =
 * `git diff --no-color <baseRef>` 后**按 files 过滤段**（与 rows 同归属口径，不含并行会话
 * 文件）；untracked 新文件（git diff 天然不含）自拼 new file hunk（避 `diff --no-index`
 * exit 1 坑），binary 只记标记行（防 base64 体积爆炸）。
 * @param {string} root diff 执行根（execute=worktree 根 / quick=会话根 / 主仓根）
 * @param {string[]} files 归属文件集（tracked 段过滤 + untracked 判定双重来源）
 * @param {{ baseRef: string }} opts
 * @returns {string|null} null=采集失败（调用方 fail-soft 不落伪 patch）
 */
export function buildFrozenPatch(root, files, { baseRef } = {}) {
  if (!root || !baseRef) return null
  const wanted = new Set((Array.isArray(files) ? files : []).map(toPosix).filter(Boolean))
  const parts = []
  try {
    const r = safeGit(root, ['diff', '--no-color', baseRef], { timeout: 60 * 1000 })
    const filtered = filterPatchForFiles(r.error ? null : r.value, wanted)
    if (filtered) parts.push(filtered)
    const trackedOut = safeGit(root, ['ls-files'], { timeout: 30 * 1000 })
    const trackedSet = new Set(String(trackedOut.value || '').split('\n').map(toPosix).filter(Boolean))
    for (const f of (Array.isArray(files) ? files : []).map(toPosix).filter(Boolean)) {
      if (trackedSet.has(f)) continue
      const abs = join(root, f)
      if (!existsSync(abs)) continue
      let buf
      try { buf = readFileSync(abs) } catch { continue }
      if (buf.includes(0)) {
        parts.push(`diff --git a/${f} b/${f}\nnew file mode 100644\nBinary file ${f} differs\n`)
        continue
      }
      const lines = buf.toString('utf8').split('\n')
      if (lines.length && lines[lines.length - 1] === '') lines.pop()
      const body = lines.map(l => '+' + l).join('\n')
      parts.push(`diff --git a/${f} b/${f}\nnew file mode 100644\n--- /dev/null\n+++ b/${f}\n@@ -0,0 +1,${lines.length} @@\n${body}\n`)
    }
  } catch {
    return null
  }
  return parts.length > 0 ? parts.join('\n') : ''
}

/**
 * patch 切片（--file 已收尾优先路径）：从全量 patch 文本切出目标文件的 hunk 段
 * （`diff --git a/<old> b/<new>` 到下一个 diff 头）。按 b/ 新路径匹配（rename 兼容旧路径）。
 * @returns {string|null}
 */
function slicePatchForFile(patchText, filePath) {
  if (!patchText || !filePath) return null
  const norm = toPosix(filePath)
  const lines = patchText.split('\n')
  const out = []
  let capturing = false
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      const m = line.match(/^diff --git a\/(.+) b\/(.+)$/)
      capturing = !!(m && (toPosix(m[2]) === norm || toPosix(m[1]) === norm))
    }
    if (capturing) out.push(line)
  }
  return out.length > 0 ? out.join('\n') : null
}

/**
 * quick 记录态反查（guard 清理后）：扫祖先链各 specBase 的 quicklog/patches/*.json，
 * 按 json 内冗余的 sessionId 匹配。返回记录 + patch 路径（--file 切片源）。
 */
function findQuickPatchRecord(cwd, sessionId) {
  for (const sb of ancestorSpecDirs(cwd)) {
    const dir = join(sb, 'quicklog', 'patches')
    let files
    try { files = readdirSync(dir) } catch { continue }
    for (const f of files.filter(x => x.endsWith('.json'))) {
      try {
        const j = JSON.parse(readFileSync(join(dir, f), 'utf8'))
        if (j && j.sessionId === sessionId && Array.isArray(j.rows)) {
          return { record: j, patchPath: join(dir, f.replace(/\.json$/, '.patch')), qlId: j.qlId || f.replace(/\.json$/, '') }
        }
      } catch { /* 单文件损坏跳过 */ }
    }
  }
  return null
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
async function computeQuickAudit({ cwd, platformOpts, sessionId, located, collectPatch }) {
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

  // 审查 C-F05：patch 文件集对齐落盘 rows（declared+soft）——undeclared 可能是并行会话的
  // 改动，冻结进本会话审计 patch 违背 filterPatchForFiles 的归属契约（json rows 落盘时
  // complete-handlers 滤 undeclared，patch 必须同口径）
  const patchFiles = [...new Set([...attributed, ...softSet])]
  const frozenPatch = collectPatch
    ? buildFrozenPatch(sessionRoot, patchFiles, { baseRef: 'HEAD' })
    : undefined

  return {
    ...base,
    totals,
    rows,
    excluded: {
      foreignDeclared: Array.isArray(audit.foreignSessionDeclared)
        ? audit.foreignSessionDeclared.filter(x => x && typeof x === 'object')
        : [],
    },
    frozenPatch,
    note,
  }
}

/**
 * full-flow 模式对账：design.md 清单（change-list.js 解析，活跃/归档目录均可）×
 * resolveReconcileActualFiles 实际文件集 → 三态 + 行数。降级路径：清单解析失败 → 实际侧
 * only；baseAnchor 缺失 → 行数按 HEAD 未提交窗口兜底（quick 模式同口径，不再恒 —）；
 * 归档且实时窗口空 → execute 时点快照记录态（快照也缺 → 空表诚实说明）。
 */
async function computeFullFlowAudit({ cwd, specBase, changeName, platformOpts, collectPatch, freshActual }) {
  const sb = specBase || join(cwd, '.sillyspec')
  const runtimeRoot = resolveRuntimeRoot(platformOpts, sb)
  const changeDirInfo = resolveChangeDir(sb, changeName)

  // —— 预执行形态（quick-bbb5037c）：执行证据三信号（worktree meta / 分支 sillyspec/<名> /
  // 审计 tag）全无 = 尚未进入 execute——实际侧不存在（B2 会吞整个工作区脏文件误归属本变更，
  // 2026-09-11-cross-change-decision-guard 实证 28 个「计划外」全是并行在途）。出计划清单
  // 视图：rows=design 清单 untouched（待实现），工作区改动归属各自会话不进表。
  const hasWorktreeMeta = existsSync(join(sb, '.runtime', 'worktrees', changeName, 'meta.json'))
  const hasBranch = !!safeGit(cwd, ['rev-parse', '--verify', '--quiet', `sillyspec/${changeName}^{commit}`], { timeout: 15 * 1000 }).value
  const hasAuditTag = !!safeGit(cwd, ['rev-parse', '--verify', '--quiet', `sillyspec-audit/sillyspec/${changeName}^{commit}`], { timeout: 15 * 1000 }).value
  // 审查 C-F02：预执行判定必须排除归档（归档=流程走完，58/77 归档变更三信号全缺被误判
  // 「未执行」实证——tag 只在分支被 review 引用时才打）+ 补四类证据：快照文件本身 /
  // execute-runs change 戳（task-review readExecuteRunChangeStamp 同口径）/ apply-pathspec /
  // execute-cleanup 回执。任一命中 = 进过 execute。
  const hasSnapshotFile = changeDirInfo
    ? existsSync(join(changeDirInfo.dir, 'scope-audit.json')) || existsSync(join(runtimeRoot, `scope-audit-${changeName}.json`))
    : existsSync(join(runtimeRoot, `scope-audit-${changeName}.json`))
  const hasApplyPathspec = existsSync(join(runtimeRoot, `apply-pathspec-${changeName}.txt`))
  const hasCleanupReceipt = existsSync(join(runtimeRoot, `execute-cleanup-${changeName}.json`))
  let hasExecuteRunStamp = false
  if (!hasWorktreeMeta && !hasBranch && !hasAuditTag && !hasSnapshotFile && !hasApplyPathspec && !hasCleanupReceipt) {
    try {
      const runsDir = join(runtimeRoot, 'execute-runs')
      if (existsSync(runsDir)) {
        for (const e of readdirSync(runsDir)) {
          try {
            if (readFileSync(join(runsDir, e, 'change'), 'utf8').trim() === changeName) { hasExecuteRunStamp = true; break }
          } catch { /* 无戳 run 跳过 */ }
        }
      }
    } catch { /* 扫描失败视为无证据（fail-open 到预执行视图，note 有 hedge） */ }
  }
  const isArchived = !!(changeDirInfo && changeDirInfo.archived)
  if (!isArchived && !hasWorktreeMeta && !hasBranch && !hasAuditTag && !hasSnapshotFile && !hasApplyPathspec && !hasCleanupReceipt && !hasExecuteRunStamp) {
    const emptyBase = {
      mode: 'full-flow', ok: true, degradedReason: null, baseAnchor: null,
      totals: { files: 0, additions: 0, deletions: 0 }, rows: [],
      excluded: { foreignDeclared: [] }, frozenPatch: undefined,
    }
    let prePlanned = []
    try {
      prePlanned = parseFileChangeListDetailed(
        join(changeDirInfo ? changeDirInfo.dir : join(sb, 'changes', changeName), 'design.md'),
        { keepSillyspecDocs: true })
    } catch { /* 清单解析失败 → 空清单 + 说明 */ }
    const preRows = prePlanned.map(e => ({
      path: e.path, planned: e.operation || null, additions: 0, deletions: 0,
      kind: 'modified', verdict: 'untouched',
    }))
    return {
      ...emptyBase,
      totals: { files: preRows.length, additions: 0, deletions: 0 },
      rows: preRows,
      note: preRows.length > 0
        ? '变更尚未进入 execute（无 worktree/分支/审计 tag/快照/execute-run 戳/apply 记录）——下表为 design 清单（全部待实现）；工作区其他未提交改动归属各自会话/变更，不在本表（若确已执行过但全部执行证据被清理，此处会误判——git log 核实）'
        : '变更尚未进入 execute（无 worktree/分支/审计 tag/快照/execute-run 戳/apply 记录）且 design 无可解析清单——暂无可对账内容',
    }
  }

  // —— 计划侧（单一真相：change-list.js，禁自研表格解析；归档形态目录兼容）——
  const designMdPath = join(changeDirInfo ? changeDirInfo.dir : join(sb, 'changes', changeName), 'design.md')
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
  let noSnapshotDrift = false

  if (!actual || actual.ok === false) {
    // 实际侧整体失败：三态无锚不出表（fail-soft 单行提示由注入点兑现），计划侧降级信息一并带出
    const reason = actualFailure
      || (actual && actual.degradedReason)
      || '实际侧文件集解析失败'
    return { ...base, degradedReason: [reason, planDegraded].filter(Boolean).join('；') }
  }

  // —— 已收尾变更·冻结快照优先（真实 > 冻结记录 > 实时开放区间）：归档变更的范围应封闭在
  // apply 时点，不随后续主仓改动漂移（quick-f5acdeeb）；quick-bd84b852 放宽——**post-apply
  // （分支已删 = execute 已 apply 收尾）的活跃变更同样收尾**，此后实时区间只会被并行演进泡大
  // （multi-agent-platform 2026-09-04 滞留变更实证：741 文件零提示刷屏）。execute --done 落的
  // 快照即冻结记录（含行数）——已收尾一律先出快照；实时窗口（开放区间）只作快照缺失的兜底，
  // note 明示会漂。tag 封闭区间不可用：分支上仅 baseline checkpoint（并行 WIP 快照），本变更
  // 改动经工作树 apply 从未 commit 到分支。 ——
  // freshActual（审查 C-F01）：verify 漂移 current 侧走快照捷径会变成快照比快照恒「一致」
  // （假阴性）；execute --done 采集重跑也会陈旧回写——两处传 true 绕过，快照捷径只留给查询面
  const settled = !freshActual && changeDirInfo && (changeDirInfo.archived || actual.form === 'post-apply')
  if (settled) {
    const snap = readScopeSnapshot(changeDirInfo.dir, runtimeRoot, changeName)
    if (snap && snap.rows.length > 0) {
      const settleLabel = changeDirInfo.archived ? '已归档' : 'execute 已收尾（分支已清理，待 verify/archive）'
      // 行数补采：快照可能落盘于 apply 后、tag 锚落地前的窗口（行数列全 —）；tag 锚
      // （quick-df1fed77）恢复 merge-base 后，对冻结文件集按锚补采行数——文件集不重算
      // （冻结语义不变），仅行数从 — 复活；含主仓后续演进（同文件被再改会计入），口径标注。
      let rows = snap.rows
      let snapDegraded = snap.degradedReason || null
      const needsStats = rows.some(r => r && !Number.isFinite(r.additions) && r.kind !== 'binary')
      if (needsStats && actual && actual.ok && actual.baseAnchor) {
        const paths = rows.map(r => (r && r.path ? toPosix(r.path) : '')).filter(Boolean)
        // 审查 C-F04：补采执行根走共享 resolveDiffRoot（form=worktree 时必须对 worktree 跑，
        // 与主链路 :629/:636 同源配对——直用 cwd 会基点×根错位）
        const stats = collectNumstatByPath(resolveDiffRoot(sb, changeName, actual.form, cwd), paths, { baseRef: actual.baseAnchor })
        let recovered = 0
        rows = rows.map(r => {
          if (!r || !r.path || Number.isFinite(r.additions) || r.kind === 'binary') return r
          const st = stats.get(toPosix(r.path))
          if (!st) return r
          recovered++
          return { ...r, additions: st.additions, deletions: st.deletions, kind: st.kind }
        })
        if (recovered > 0) snapDegraded = null
        return {
          ...base,
          ok: true,
          degradedReason: snapDegraded,
          baseAnchor: actual.baseAnchor,
          totals: { files: rows.length, ...sumTotals(rows) },
          rows,
          excluded: snap.excluded && Array.isArray(snap.excluded.foreignDeclared)
            ? snap.excluded
            : { foreignDeclared: [] },
          patchSha256: snap.patchSha256 || null,
          patchStatus: snap.patchStatus || null,
          note: `${settleLabel}——execute --done 时点冻结快照${snap.savedAt ? '（' + String(snap.savedAt).replace('T', ' ').slice(0, 19) + ' 落盘）' : ''}：文件集封闭在 apply 时点，主仓后续新文件不进表；行数按锚 ${actual.baseAnchor.slice(0, 7)}→当前工作树 补采（同文件后续演进会计入）`,
        }
      }
      return {
        ...base,
        ok: true,
        degradedReason: snapDegraded,
        baseAnchor: typeof snap.baseAnchor === 'string' ? snap.baseAnchor : null,
        totals: snap.totals && typeof snap.totals === 'object'
          ? snap.totals
          : { files: snap.rows.length, ...sumTotals(snap.rows) },
        rows: snap.rows,
        excluded: snap.excluded && Array.isArray(snap.excluded.foreignDeclared)
          ? snap.excluded
          : { foreignDeclared: [] },
        patchSha256: snap.patchSha256 || null,
        patchStatus: snap.patchStatus || null,
        note: `${settleLabel}——execute --done 时点冻结快照${snap.savedAt ? '（' + String(snap.savedAt).replace('T', ' ').slice(0, 19) + ' 落盘）' : ''}：范围封闭在 apply 时点，主仓后续改动不反映到本表；需要看当前工作区实时状态请跑 git status`,
      }
    }
    // 快照缺失 → 实时开放区间兜底（下方主链路），note 追加漂移警告
    noSnapshotDrift = true
  }

  const degraded = []
  if (planDegraded) degraded.push(planDegraded)
  const notes = []
  // 已收尾但快照缺失（上方分支置位）：实时开放区间兜底，明示漂移语义——快照机制上线
  // （2026-09-10）前收尾的旧变更冻结记录无法重建，如实告知替代渠道。
  if (noSnapshotDrift) {
    notes.push('快照缺失（变更已收尾——已归档或 execute 分支已清理；快照机制上线前收尾的变更无法重建冻结记录）——下表为实时开放区间（基点→当前工作树，含并行会话与后续演进，随主仓改动漂移），非本变更冻结范围；记录态参考 verify-result.md / git log')
  }

  // —— 行数采集根与基点 ——
  // 形态 A（worktree 存活）：改动在 worktree 工作树，baseAnchor 是 meta 锚 commit——numstat
  // 必须对 worktree 跑（worktree 共享主仓对象库可解析锚 commit；对主仓跑会把主仓工作树当对比面）。
  // 判定与 resolveVerifyChangedFiles :1048 同款（读同一份 meta，非另造口径）。
  const numstatRoot = resolveDiffRoot(sb, changeName, actual.form, cwd)

  // 无锚点兜底（post-apply 分支已清理 / 归档形态）：行数按 HEAD 未提交窗口采集——与 quick 模式
  // 同口径（git diff HEAD --numstat 只含未提交改动，untracked 走 wc-l 档）；不再恒降级 —。
  let stats = new Map()
  let usedHeadFallback = false
  if (actual.baseAnchor) {
    stats = collectNumstatByPath(numstatRoot, actual.files, { baseRef: actual.baseAnchor })
  } else if ((actual.files || []).length > 0) {
    stats = collectNumstatByPath(numstatRoot, actual.files, { baseRef: 'HEAD' })
    usedHeadFallback = true
    notes.push('baseAnchor 缺失——行数按 HEAD 未提交窗口采集（不含已提交改动，quick 模式同口径；numstat 采集失败时行列为 —）')
  }

  // 他者声明排除面可见（R-04 同精神）：resolveReconcileActualFiles 只回计数不回名单，退栈的
  // 计划内文件会误显「计划未动」——note 点破归属重叠可能性，让 ⚠️ 行可解释。
  if (actual.foreignExcluded > 0) {
    notes.push(`实际侧另有 ${actual.foreignExcluded} 个文件按他者会话声明退栈未进本表——「计划未动」行先怀疑归属重叠（声明即归属，git diff 核实）`)
  }

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

  // 冻结 patch（collectPatch，execute --done 落盘方消费）：与行数同根同锚（numstatRoot +
  // baseAnchor；无锚 HEAD 兜底同口径），全窗口 diff + untracked 自拼 hunk（buildFrozenPatch）
  const frozenPatch = collectPatch
    ? buildFrozenPatch(numstatRoot, actual.files, { baseRef: actual.baseAnchor || 'HEAD' })
    : undefined

  return {
    ...base,
    ok: true,
    degradedReason: degraded.length > 0 ? degraded.join('；') : null,
    baseAnchor: actual.baseAnchor || (usedHeadFallback ? 'head-uncommitted-window' : null),
    totals: { files: rows.length, ...sumTotals(rows) },
    rows,
    excluded: { foreignDeclared: [] },
    frozenPatch,
    note: notes.length > 0 ? notes.join('；') : null,
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
export async function computeChangeScopeAudit({ cwd, specBase, changeName, platformOpts, collectPatch, freshActual } = {}) {
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
        return await computeQuickAudit({ cwd, platformOpts, sessionId: changeName, located, collectPatch })
      }
      // guard 已清理（会话收尾）→ quicklog/patches/ 记录态反查（quick-359a48f1）：
      // 命中出冻结记录（行数为 --done 时点真值），patch 可供 --file 切片
      const rec = findQuickPatchRecord(cwd, changeName)
      if (rec) {
        return {
          mode: 'quick', ok: true, degradedReason: null,
          baseAnchor: rec.record.baseAnchor || `quick-window:${changeName}`,
          totals: rec.record.totals && typeof rec.record.totals === 'object'
            ? rec.record.totals
            : { files: rec.record.rows.length, ...sumTotals(rec.record.rows) },
          rows: rec.record.rows,
          excluded: rec.record.excluded && Array.isArray(rec.record.excluded.foreignDeclared)
            ? rec.record.excluded
            : { foreignDeclared: [] },
          frozenPatchPath: rec.patchPath,
          patchSha256: rec.record.patchSha256 || null,
          patchStatus: rec.record.patchStatus || null,
          note: `quick 会话已收尾——记录态（quicklog/patches/${rec.qlId}，${rec.record.savedAt ? String(rec.record.savedAt).replace('T', ' ').slice(0, 19) + ' 落盘' : '--done 时点冻结'}）`,
        }
      }
      return {
        ...empty,
        mode: 'quick',
        degradedReason: `quick 会话 ${changeName} 不存在（guard 已清理且 quicklog/patches/ 无记录——会话未产生改动或早于记录机制）`,
      }
    }
    return await computeFullFlowAudit({ cwd, specBase, changeName, platformOpts, collectPatch, freshActual })
  } catch (e) {
    // fail-soft 兜底（D-006 / 兼容策略）：注入点只打一行提示，不阻断阶段完成
    return {
      ...empty,
      degradedReason: `scope-audit 内部异常: ${e && e.message ? String(e.message).split('\n')[0] : e}`,
    }
  }
}

/**
 * 单文件 diff 内容查看（quick-63776328）：按对账同源锚点跑 `git diff --no-color <baseRef> -- <file>`
 * 出完整变化内容（git 原生 diff 格式）。锚点/执行根与表格行数同口径——worktree 形态 A 对
 * worktree 工作树跑、quick 对会话根跑、归档冻结形态用快照补采基点；无锚时 HEAD 未提交窗口兜底。
 *
 * untracked 新文件不在 git diff 内（整个文件都是新增）→ note 提示看文件本体；该锚点窗口
 * 无改动 → diff 空串 + note。纯读 fail-soft。
 *
 * @param {{ cwd: string, specBase?: string|null, changeName: string, platformOpts?: object|null, filePath: string }} opts
 * @returns {Promise<{ ok: boolean, mode: string, root: string, baseRef: string|null,
 *   anchorLabel: string|null, diff: string|null, note: string|null }>}
 */
export async function getFileDiff({ cwd, specBase, changeName, platformOpts, filePath } = {}) {
  if (!cwd || !changeName || !filePath) {
    return { ok: false, mode: 'full-flow', root: cwd || '', baseRef: null, anchorLabel: null, diff: null, note: '参数缺失：cwd / changeName / filePath 必填' }
  }
  try {
    const result = await computeChangeScopeAudit({ cwd, specBase, changeName, platformOpts })
    const norm = toPosix(filePath)
    const sb = specBase || join(cwd, '.sillyspec')

    // —— 真·当时内容比对（quick-359a48f1）：已收尾变更优先冻结 patch 切片 ——
    // ① quick 记录态自带 frozenPatchPath；② full-flow 变更目录 scope-audit.patch。
    // patch 冻结在收尾时点，不含后续演进——实时锚 diff 只作 patch 缺失的兜底（口径标注）。
    // A-F01：读取时按 json 记录的 patchSha256 校验，不匹配显式告警（防低级篡改）。
    const patchRecord = result.frozenPatchPath
      ? { path: result.frozenPatchPath, sha: result.patchSha256 || null }
      : (() => { const d = resolveChangeDir(sb, changeName); return d ? { path: join(d.dir, 'scope-audit.patch'), sha: null } : null })()
    let recordedSha = patchRecord ? patchRecord.sha : null
    if (patchRecord && !recordedSha && result.rows) {
      // json 里未直接带回 hash（记录态捷径不透传）→ 读 json 原文取（快照/quick 记录都存该字段）
      try {
        const snapRaw = JSON.parse(readFileSync(result.frozenPatchPath
          ? result.frozenPatchPath.replace(/\.patch$/, '.json')
          : join(resolveChangeDir(sb, changeName).dir, 'scope-audit.json'), 'utf8'))
        recordedSha = snapRaw.patchSha256 || null
      } catch { /* json 不可读 → 无 hash 可校验（null=不校验） */ }
    }
    const frozenPatch = (patchRecord
        && (() => { try { return readFileSync(patchRecord.path, 'utf8') } catch { return null } })())
    if (frozenPatch !== null && frozenPatch !== undefined && patchRecord) {
      const integrity = verifyPatchIntegrity(recordedSha, frozenPatch)
      if (integrity === false) {
        return { ok: false, mode: result.mode, root: cwd, baseRef: null, anchorLabel: '冻结 patch', diff: null, note: '⚠️ 冻结 patch 与快照记录的 patchSha256 不匹配——记录可能被篡改，审计前人工核验（git 历史比对）' }
      }
      const sliced = slicePatchForFile(frozenPatch, norm)
      if (sliced) {
        return { ok: true, mode: result.mode, root: cwd, baseRef: null, anchorLabel: '冻结 patch（收尾时点内容，无后续演进混入）', diff: sliced, note: null }
      }
      return { ok: true, mode: result.mode, root: cwd, baseRef: null, anchorLabel: '冻结 patch', diff: null, note: '该文件不在冻结 patch 内（窗口外文件）' }
    }
    if (result.patchStatus === 'failed') {
      return { ok: true, mode: result.mode, root: cwd, baseRef: null, anchorLabel: '冻结记录', diff: null, note: '冻结 patch 当时采集失败（非无改动）——退实时锚比对' }
    }

    // 锚点解析（语义锚 head-uncommitted-window → 实际 baseRef 'HEAD'；无锚同兜底并标注）
    let baseRef = 'HEAD'
    let anchorLabel = 'HEAD 未提交窗口（无锚点兜底）'
    if (result.baseAnchor && /^[0-9a-f]{7,40}$/.test(result.baseAnchor)) {
      baseRef = result.baseAnchor
      anchorLabel = result.baseAnchor
    } else if (result.baseAnchor === 'head-uncommitted-window') {
      anchorLabel = 'HEAD 未提交窗口'
    }

    // 执行根：quick=会话创建根（防 cd 漂移）；full-flow=resolveDiffRoot 共享口径
    let root = cwd
    if (result.mode === 'quick') {
      const located = locateQuickSessionGuard(cwd, changeName)
      if (located) root = dirname(located.specBase)
    } else {
      const form = existsSync(join(sb, '.runtime', 'worktrees', changeName, 'meta.json')) ? 'worktree' : 'post-apply'
      root = resolveDiffRoot(sb, changeName, form, cwd)
    }

    const r = safeGit(root, ['diff', '--no-color', baseRef, '--', norm], { timeout: 30 * 1000 })
    if (r.error) {
      return { ok: false, mode: result.mode, root, baseRef, anchorLabel, diff: null, note: `git diff 执行失败: ${r.error}` }
    }
    const diff = r.value || ''
    if (diff) return { ok: true, mode: result.mode, root, baseRef, anchorLabel, diff, note: null }
    // 空 diff：窗口内未改 / untracked 新文件（git diff 不含 untracked）
    if (existsSync(join(root, norm))) {
      const tracked = safeGit(root, ['ls-files', '--', norm], { timeout: 15 * 1000 })
      if (!tracked || !tracked.value || !tracked.value.trim()) {
        return { ok: true, mode: result.mode, root, baseRef, anchorLabel, diff: null, note: '未跟踪新文件——不在 git diff 内，文件全部行为新增；直接查看文件本体' }
      }
    }
    return { ok: true, mode: result.mode, root, baseRef, anchorLabel, diff: '', note: '该文件在此锚点窗口内无 diff（未改动）' }
  } catch (e) {
    return { ok: false, mode: 'full-flow', root: cwd, baseRef: null, anchorLabel: null, diff: null, note: `getFileDiff 内部异常: ${e && e.message ? String(e.message).split('\n')[0] : e}` }
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
