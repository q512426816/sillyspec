/**
 * concurrent-detect — 多 agent 并发写预检的纯函数检测核心（design §7）。
 *
 * 单次 git status --porcelain 扫描，复用 isQuickMetadata 的「关联 vs 他者」分类口径，
 * 产出两类并发信号：
 *   - foreignFiles: 脏文件里非 metadata、不在 ownFiles 的真实业务文件（他者未提交改动）
 *   - otherActiveChanges: 脏文件落在 .sillyspec/changes/<他者变更>/ 下去重成的变更名集合
 *
 * 非阻塞 advisory：检测结果仅在调用点本地消费（→ formatConcurrentWarning → console.warn），
 * 不改 audit status / gate 通过性 / isQuickMetadata 语义（design §2/§9）。
 *
 * 纯函数无副作用：不写盘、不 console（console 留给调用点 task-02/03）。
 */
import { safeGit, parsePorcelainPath, isQuickMetadata } from './shared.js'
import { basename } from 'node:path'

/**
 * 内联解析 .sillyspec/changes/<dir>/ 路径取 <dir>。
 * 与 shared.js isQuickMetadata 内部 regex（^\.sillyspec\/changes\/([^/]+)(\/|$)）同源——
 * D-008 deferred：暂不抽 shared.js 公共 helper，改其一改其二。
 * @param {string} file 已归一化（正斜杠）的 git 路径
 * @returns {string|null} 变更目录名，不在 changes/ 下返回 null
 */
function extractChangeDir(file) {
  const m = file.match(/^\.sillyspec\/changes\/([^/]+)(\/|$)/)
  return m ? m[1] : null
}

/** git 路径反斜杠归一（跨平台 Windows 兼容）。 */
function normalizeGitPath(p) {
  return String(p).replace(/\\/g, '/')
}

/**
 * 并发预检 ownFiles 锚点（2026-08-18 误归属修复）。
 *
 * 未声明会话（allowedFiles 空）维持旧口径 changedFiles ∪ baselineFiles——无声明即无归属信息，
 * 收窄锚点会把本会话每次未声明的自身改动全误报他者。声明会话锚点 = baselineFiles ∪ allowedFiles
 * （声明即归属）：窗口 diff（changedFiles）在多 agent 并发仓库可能含他者污染（ql-20260818-003
 * 实证：并行会话窗口内改的文件被算进本会话 changedFiles 再被 ownFiles 自吞），超出声明集的
 * 窗口新脏文件才作为 foreign 信号报出（= 他者或漏声明，歧义由 advisory 文案兜住）。
 *
 * 纯函数：不查盘不调 git，调用点（complete-handlers task-02 钩子）传入三个列表。
 * @param {{ changedFiles?: string[], baselineFiles?: string[], allowedFiles?: string[] }} opts
 * @returns {string[]} ownFiles 锚点集合（去重）
 */
export function resolveConcurrentAnchor({ changedFiles = [], baselineFiles = [], allowedFiles = [] } = {}) {
  const arr = (x) => (Array.isArray(x) ? x : [])
  const declared = arr(allowedFiles).map(normalizeGitPath).filter(Boolean)
  if (declared.length === 0) {
    return [...arr(changedFiles).map(normalizeGitPath), ...arr(baselineFiles).map(normalizeGitPath)]
  }
  return [...new Set([...arr(baselineFiles).map(normalizeGitPath), ...declared])]
}

/**
 * 检测工作树里的并发他者改动（非阻塞 advisory 用）。
 *
 * @param {string} cwd 主仓库根
 * @param {{ changeName: string, linkedChanges?: string[], ownFiles?: string[], specDir?: string }} opts
 *   - changeName: 当前变更名（排除自身变更目录）
 *   - linkedChanges: 关联变更（透传给 isQuickMetadata 的关联归类，同时从 otherActiveChanges 排除）
 *   - ownFiles: 本 --done 负责的文件（从 foreignFiles 排除，避免把自己当他者）
 *   - specDir: 规范目录（保留参数，当前实现用 .sillyspec/ 前缀 regex 定位，暂未使用）
 * @returns {{ hasForeign: boolean, foreignFiles: string[], otherActiveChanges: string[], gitError: string|null }}
 *   - foreignFiles: 脏文件里非 metadata、不在 ownFiles 的真实业务文件
 *   - otherActiveChanges: 脏文件落在 .sillyspec/changes/<他者变更>/ 下，去重成的变更名集合
 *   - gitError: git status 读失败时填错误串，hasForeign=false（FR-04 fail-open，不抛异常）
 */
export function detectConcurrentChanges(cwd, { changeName, linkedChanges = [], ownFiles = [], specDir } = {}) {
  // safeGit 必传 trim:false（D-004）：porcelain 首行前导空格是状态码一部分，trim 会削掉致
  // parsePorcelainPath 丢首字符（坑见 shared.js auditQuickCompletion :448 注释）。
  const statusResult = safeGit(cwd, ['status', '--porcelain'], { trim: false })

  // FR-04 fail-open：git status 读不到不崩、不阻断、不误报（advisory 漏报可接受，最坏漏报而非误阻）。
  if (statusResult.error) {
    return { hasForeign: false, foreignFiles: [], otherActiveChanges: [], gitError: statusResult.error }
  }

  const gitStatus = statusResult.value || ''
  // 不整段 trim：同 auditQuickCompletion :455 注释，会削首行前导空格致首文件路径丢首字符。
  const entries = gitStatus.split('\n').filter(Boolean)

  // 本变更 + 关联变更目录集合：rule1 据此把「自己/关联」从他者变更中排除。
  const ownChangeSet = new Set(
    (Array.isArray(linkedChanges) ? linkedChanges : [])
      .map(normalizeGitPath)
      .filter(Boolean)
  )
  if (changeName) ownChangeSet.add(normalizeGitPath(changeName))

  // ownFiles 归一化集合：rule3 据此把本会话产出从他者业务文件中排除。
  const ownFileSet = new Set(
    (Array.isArray(ownFiles) ? ownFiles : [])
      .map(normalizeGitPath)
      .filter(Boolean)
  )

  const foreignFiles = []
  const otherActiveSet = new Set()

  for (const line of entries) {
    // parsePorcelainPath：去引号 / 处理 rename / 归一化反斜杠（跨平台）。
    const file = parsePorcelainPath(line)
    if (!file) continue

    // rule1：落 .sillyspec/changes/<dir>/ 且 <dir> 非本变更非关联 → otherActiveChanges 去重。
    // 'archive' 排除（坑 archive-dir-as-other-change）：归档移动产生 .sillyspec/changes/archive/...
    // 脏路径，extractChangeDir 返回 'archive'，不排除会把归档动作误报成「他者活跃变更: archive」。
    const dir = extractChangeDir(file)
    if (dir && dir !== 'archive' && !ownChangeSet.has(normalizeGitPath(dir))) {
      otherActiveSet.add(dir)
      continue
    }

    // rule2：isQuickMetadata 为 true（quick 元数据 / 关联变更目录 / quicklog/.runtime/modules 等）→ 跳过。
    // 注意：当前变更自己的 changes/<changeName>/ 也走这里——changeName 通常不在 linkedChanges，
    // isQuickMetadata 视为元数据放行，与本变更自身目录不该当他者的语义一致。
    if (isQuickMetadata(file, linkedChanges)) continue

    // rule3：真实业务文件 → 不在 ownFiles 则归入他者 foreignFiles。
    if (!ownFileSet.has(file)) {
      foreignFiles.push(file)
    }
  }

  const otherActiveChanges = [...otherActiveSet]
  const hasForeign = foreignFiles.length > 0 || otherActiveChanges.length > 0
  return { hasForeign, foreignFiles, otherActiveChanges, gitError: null }
}

/**
 * 把检测结果格式化为多行 ⚠️ 警告串。
 * @param {{ hasForeign: boolean, foreignFiles?: string[], otherActiveChanges?: string[], gitError?: string|null }|null} detected
 * @returns {string|null} 无他者并发（hasForeign 为 false / null 输入）返回 null，调用点据此跳过 console.warn
 */
export function formatConcurrentWarning(detected) {
  if (!detected || !detected.hasForeign) return null
  const foreignFiles = Array.isArray(detected.foreignFiles) ? detected.foreignFiles : []
  const otherActiveChanges = Array.isArray(detected.otherActiveChanges) ? detected.otherActiveChanges : []

  const lines = ['⚠️ 检测到工作树存在并发他者改动（非阻断 advisory，请人工确认）：']

  if (foreignFiles.length > 0) {
    lines.push('他者业务文件（git-dirty，可能非本变更产出）：')
    for (const f of foreignFiles) lines.push(`  - ${f}`)
  }

  if (otherActiveChanges.length > 0) {
    // D-005：文案用「脏变更目录」+ git-dirty 标注，勿用「活跃」防与 DB active 状态混淆。
    lines.push('他者脏变更目录（git-dirty，非 DB active）：')
    for (const c of otherActiveChanges) lines.push(`  - ${c}`)
  }

  lines.push('提交请用显式 pathspec 隔离本变更文件，勿 git add . 扫入他者工作（execute task 内建议 sillyspec wt-commit 串行提交）。')
  return lines.join('\n')
}

// ── 坑 mixed-baseline-drift-hint（ql-20260915-004）committed-drift 混合基线检测 ──
// 背景（用户 2026-09-15 实证）：并行会话合并断言不同步——worktree 内基于旧快照写的测试断言
// （旧 id），主仓已合入 id 统一修复 → verify 测试门红——测试源=worktree 快照、被测源=主仓
// HEAD 的混合基线漂移此前无任何提示。本函数算「主仓自本变更基点后的已提交推进 ∩ 本变更
// 相关文件」，交两挂点（worktree-apply 成功尾声 / gates.js verify 测试门前）advisory 提示。

/** 测试形态文件名：foo.test.mjs / foo.spec.js（与探针 7 isProbe7TestPath 的 .test. 口径同族） */
const DRIFT_TEST_FORM_RE = /\.(?:test|spec)\.[A-Za-z0-9]+$/

/** git 路径反斜杠归一（detectCommittedDrift 内部用，与 normalizeGitPath 同义独立小函数） */
function toPosix(p) {
  return String(p || '').replace(/\\/g, '/')
}

/**
 * 文件名 stem 键：剥扩展名与 .test./.spec. 中缀（foo.js → foo；foo.test.mjs → foo；
 * foo_test.js → foo_test——下划线形不在变体口径内，仅精确匹配兜底）。小写归一。
 */
function driftStemKey(p) {
  const name = basename(toPosix(p))
  const m = name.match(/^(.+?)\.(?:test|spec)\.[A-Za-z0-9]+$/)
  if (m) return m[1].toLowerCase()
  const dot = name.lastIndexOf('.')
  return (dot > 0 ? name.slice(0, dot) : name).toLowerCase()
}

/**
 * 检测混合基线漂移（非阻断 advisory 用）：主仓 `git diff --name-only <baseHash>..<head>`
 * （基点后已提交推进面）∩ 本变更 touchedFiles（或其同 basename 的 .test./.spec. 变体）非空
 * → drift。变体口径：stem 相同且至少一侧为测试形态（src/foo.js ↔ test/foo.test.mjs）——
 * 换位覆盖两方向（他者推进我的源文件的测试变体 / 他者推进我测试文件对应的源文件）。
 *
 * fail-open：baseHash 缺失 / git 异常 → 返回 null（调用方视为未检测，零输出零阻断）；
 * diff 空（基点后无推进）→ { drift:false, files:[] }。
 *
 * @param {{ projectRoot: string, baseHash: string, touchedFiles: string[],
 *           excludeFiles?: string[], head?: string }} opts
 *   - baseHash：worktree 基点（meta.baselineCommit || baseHash）
 *   - touchedFiles：本变更交付文件面（apply-manifest files / changedFiles）
 *   - excludeFiles：从推进面剔除的文件（verify 挂点传本变更自身面——apply 已提交时
 *     baseHash..HEAD 含自身交付，不剔会把「自己合自己」误报成他者推进；apply 挂点用
 *     精确 preMergeHead，无需剔除）
 *   - head：推进面终点 ref（缺省 HEAD；merge 路径传 merge 前 HEAD）
 * @returns {{ drift: boolean, files: string[], hint?: string }|null}
 */
export function detectCommittedDrift({ projectRoot, baseHash, touchedFiles, excludeFiles = [], head = 'HEAD' }) {
  if (!projectRoot || !baseHash) return null
  const touched = (Array.isArray(touchedFiles) ? touchedFiles : []).map(toPosix).filter(Boolean)
  if (touched.length === 0) return null
  // FR fail-open（与 detectConcurrentChanges 同族）：git 读不到不崩不误报
  const diff = safeGit(projectRoot, ['diff', '--name-only', `${baseHash}..${head}`], { timeout: 30000 })
  if (diff.error) return null
  if (!diff.value) return { drift: false, files: [] }

  const excl = new Set((Array.isArray(excludeFiles) ? excludeFiles : []).map(toPosix).filter(Boolean))
  const touchedSet = new Set(touched)
  const touchedStems = new Set(touched.map(driftStemKey).filter(Boolean))
  const touchedHasTestForm = touched.some(f => DRIFT_TEST_FORM_RE.test(basename(f)))

  const files = []
  for (const raw of diff.value.split('\n').map(s => s.trim()).filter(Boolean)) {
    const p = toPosix(raw)
    if (excl.has(p)) continue
    const exact = touchedSet.has(p)
    // 变体：非精确命中时，stem 相同且至少一侧为测试形态（防 docs/foo.md ↔ test/foo.test.mjs
    // 之外的松散同名误报——两侧都非测试形态的不同目录同名不算相关）
    const variant = !exact
      && touchedStems.has(driftStemKey(p))
      && (DRIFT_TEST_FORM_RE.test(basename(p)) || touchedHasTestForm)
    if (exact || variant) files.push(p)
  }
  if (files.length === 0) return { drift: false, files: [] }
  return {
    drift: true,
    files,
    hint: `主仓自基点 ${String(baseHash).slice(0, 8)} 后已合入触及 ${files.length} 个本变更相关文件的推进（${files.slice(0, 5).join('、')}${files.length > 5 ? ' 等' : ''}）——worktree 快照内验证过的断言可能漂移，建议合并态复跑相关测试`,
  }
}

/**
 * committed-drift 检测结果 → 多行 ⚠️ 提示串（两挂点共用文案，与 formatConcurrentWarning 同族）。
 * @param {{ drift: boolean, files?: string[], hint?: string }|null} drift detectCommittedDrift 产物
 * @param {{ tailNote?: string }} [opts] tailNote 追加在首行末的挂点语境注（如 verify 挂点的
 *   「实测若红先做合并态归因」）；缺省无
 * @returns {string|null} 无漂移/未检测返回 null
 */
export function formatCommittedDriftWarning(drift, opts = {}) {
  if (!drift || !drift.drift) return null
  const files = Array.isArray(drift.files) ? drift.files : []
  const note = opts.tailNote ? `（${opts.tailNote}）` : ''
  return [
    '⚠️ 混合基线提示：主仓自本变更基点后已合入触及以下本变更相关文件的推进'
      + `（${files.length} 个）——worktree 快照内验证过的断言可能漂移，建议合并态复跑相关测试${note}：`,
    ...files.map(f => `  - ${f}`),
  ].join('\n')
}
