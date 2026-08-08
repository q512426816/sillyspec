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
    const dir = extractChangeDir(file)
    if (dir && !ownChangeSet.has(normalizeGitPath(dir))) {
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

  lines.push('提交请用显式 pathspec 隔离本变更文件，勿 git add . 扫入他者工作。')
  return lines.join('\n')
}
