/**
 * checkpoint.js — 任务级影子提交存档（tick 即快照，2026-10-28-shadow-checkpoint）
 *
 * 定位：断点恢复从「进度级」（tasks.md 记做到哪）升级到「内容级」（工作区长什么样）——
 * task tick 成功翻格后落一个 git 影子提交到 refs/sillyspec/checkpoints/<change>，agent
 * 跑歪/改崩时 git restore --source 一键读档。git 对象库本身是内容寻址存储：增量成本=
 * 只哈希变化文件，相同内容全局一份——零新依赖即得 CAS 快照性质。
 *
 * 机制（多 agent 共享仓安全是第一约束）：
 *   - 临时索引 GIT_INDEX_FILE=.git/sillyspec-cp-index-<session>（会话隔离）——read-tree HEAD
 *     起底 → add -A（硬排除清单）→ write-tree → commit-tree 成链（父=上一存档，首档父=
 *     当时 HEAD）→ update-ref。共享 index 全程零读写（staged 面不可能被卷走，规则 11 纪律）。
 *   - 无变化 no-op：write-tree 结果与现 ref 树 SHA 相同即跳过（零对象零 ref 翻转）。
 *   - fail-open 铁律：本模块任何失败只返回 skipped（reason 留痕），绝不抛出阻断 tick。
 *
 * 边界：worktree 会话跳过（v1 主仓形态——git-dir ≠ common-dir 判定）；未忽略 untracked
 * 总量超阈值（缺省 200MB，checkpoint.maxUntrackedMB）早停跳过；.sillyspec/.runtime 与
 * 常见产物目录/.env* 硬排除不进快照（gitignore 之外的第二道防线）。
 */
import { existsSync, readFileSync, rmSync, statSync } from 'fs'
import { join, resolve as resolvePath } from 'path'
import { git, gitQuiet } from './git-helper.js'

const REF_PREFIX = 'refs/sillyspec/checkpoints/'
const DEFAULT_MAX_UNTRACKED_MB = 200
const SUBJECT_PREFIX = 'sillyspec-cp: '
const NOOP_GUARD_TREE_TIMEOUT_MS = 60000

/** 硬排除清单（add 后在临时索引上 reset 的路径）。目录名匹配任意深度段；.env* 限根级。 */
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', 'target', '.venv', 'venv', '__pycache__', '.next', '.cache', 'coverage']
const RESET_SPECS = [...EXCLUDE_DIRS, '.env', '.env.*', '.sillyspec/.runtime']

/** 与 EXCLUDE_SPECS 同口径的 JS 判定（体积护栏用——只计真会进快照的文件）。 */
function isHardExcluded(p) {
  const segs = p.split('/')
  if (segs.some((s) => EXCLUDE_DIRS.includes(s))) return true
  const root = segs[0]
  if (root === '.env' || /^\.env\..+$/.test(root)) return true
  if (p === '.sillyspec/.runtime' || p.startsWith('.sillyspec/.runtime/')) return true
  return false
}

const SAFE_CHANGE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * 读 .sillyspec/local.yaml 的 checkpoint 块（手解析单一键路径，沿 worktree supplyFiles
 * 先例零 yaml 依赖）。fail-open：文件缺失/解析异常一律返回缺省（enabled=true）。
 * @returns {{enabled: boolean, maxUntrackedMB: number}}
 */
export function readCheckpointConfig(repoRoot) {
  const defaults = { enabled: true, maxUntrackedMB: DEFAULT_MAX_UNTRACKED_MB }
  try {
    const p = join(repoRoot, '.sillyspec', 'local.yaml')
    if (!existsSync(p)) return defaults
    const vals = {}
    let inBlock = false
    for (const rawLine of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const line = rawLine.replace(/\t/g, '  ')
      if (/^checkpoint:\s*(#.*)?$/.test(line)) { inBlock = true; continue }
      if (!inBlock) continue
      if (/^\S/.test(line)) break // 出块：下一个顶层键
      const m = line.match(/^\s+([\w.-]+):\s*(.*?)\s*(#.*)?$/)
      if (m && m[2] !== '') vals[m[1]] = m[2]
    }
    const enabled = vals.enabled === undefined ? true : !/^(false|off|no|0)$/i.test(String(vals.enabled))
    const mb = Number(vals.maxUntrackedMB)
    return { enabled, maxUntrackedMB: Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_MAX_UNTRACKED_MB }
  } catch {
    return defaults
  }
}

/** 主仓判定：worktree 会话（git-dir ≠ common-dir）v1 跳过存档。 */
function isWorktreeSession(repoRoot) {
  const gitDir = gitQuiet(repoRoot, ['rev-parse', '--absolute-git-dir'])
  const commonDir = gitQuiet(repoRoot, ['rev-parse', '--git-common-dir'])
  if (!gitDir || !commonDir) return false // 探测失败不拦（留给后续 git 调用自然 fail-open）
  if (commonDir === '.git') return false // 主仓：两者同指
  try {
    return resolvePath(repoRoot, gitDir) !== resolvePath(repoRoot, commonDir)
  } catch {
    return gitDir !== commonDir
  }
}

/**
 * 落一个影子提交（fail-open：任何失败返回 {kind:'skipped', reason}，绝不抛出）。
 * @param {{repoRoot: string, changeName: string, session?: string, taskId?: string}} opts
 * @returns {Promise<{kind:'created'|'noop'|'skipped', sha?: string, treeSha?: string,
 *   parent?: string, files?: number, reason?: string, detail?: string}>}
 */
export async function createCheckpoint({ repoRoot, changeName, session, taskId }) {
  const name = String(changeName || '')
  if (!SAFE_CHANGE_NAME_RE.test(name)) return { kind: 'skipped', reason: 'invalid-change-name', detail: name }
  const cfg = readCheckpointConfig(repoRoot)
  if (!cfg.enabled) return { kind: 'skipped', reason: 'checkpoint-disabled' }
  if (isWorktreeSession(repoRoot)) return { kind: 'skipped', reason: 'worktree-session' }

  const ref = REF_PREFIX + name
  const gitDir = gitQuiet(repoRoot, ['rev-parse', '--absolute-git-dir'])
  if (!gitDir) return { kind: 'skipped', reason: 'not-a-git-repo' }
  const sessionId = String(session || process.env.SILLYSPEC_SESSION_ID || 'anon').replace(/[^A-Za-z0-9._-]/g, '_')
  const tmpIndex = join(gitDir, `sillyspec-cp-index-${sessionId}`)
  // env 展开铁律（git-helper 终批-③）：裸替换丢 SystemRoot/TEMP 在 Windows 必炸
  const idxEnv = { ...process.env, GIT_INDEX_FILE: tmpIndex }
  const head = gitQuiet(repoRoot, ['rev-parse', 'HEAD'])
  if (!head) return { kind: 'skipped', reason: 'no-head-commit' }

  try {
    rmSync(tmpIndex, { force: true }) // 清上次中断残留（同会话同路径幂等）
    git(repoRoot, ['read-tree', 'HEAD'], { env: idxEnv })

    // 体积护栏：只计真会进快照的 untracked（硬排除同口径），累计超限早停
    const maxBytes = cfg.maxUntrackedMB * 1024 * 1024
    const othersRaw = gitQuiet(repoRoot, ['ls-files', '--others', '--exclude-standard', '-z'])
    if (othersRaw) {
      let bytes = 0
      for (const p of othersRaw.split('\0')) {
        if (!p || isHardExcluded(p)) continue
        try {
          bytes += statSync(join(repoRoot, p)).size
        } catch { /* 文件瞬失：计 0 不拦 */}
        if (bytes > maxBytes) return { kind: 'skipped', reason: 'untracked-size-over-limit', detail: `${Math.round(bytes / 1048576)}MB > ${cfg.maxUntrackedMB}MB` }
      }
    }

    // 裸 add -A（无 pathspec）：ignored 文件静默跳过——显式 pathspec 形态遇 gitignored
    // 候选会整体报错拒加（"paths are ignored by .gitignore"，.sillyspec/ 被忽略的仓必炸）。
    // 硬排除随后以 reset 收窄：临时索引上把排除路径退回 HEAD 态（不在 HEAD 的即整条移出）。
    git(repoRoot, ['add', '-A'], { env: idxEnv, timeout: NOOP_GUARD_TREE_TIMEOUT_MS })
    git(repoRoot, ['reset', '-q', '--', ...RESET_SPECS], { env: idxEnv })
    const treeSha = git(repoRoot, ['write-tree'], { env: idxEnv })

    const current = gitQuiet(repoRoot, ['rev-parse', '--verify', ref])
    if (current) {
      const currentTree = gitQuiet(repoRoot, ['rev-parse', `${ref}^{tree}`])
      if (currentTree === treeSha) return { kind: 'noop', treeSha } // 无变化：零对象零翻转
    }

    const parent = current || head
    const subject = `${SUBJECT_PREFIX}${name} ${taskId || '-'} ${new Date().toISOString()}`
    const message = `${subject}\n\nshadow checkpoint for ${name}\ntask: ${taskId || '-'}\nsession: ${sessionId}\n`
    // 身份兜底（沿 worktree baseline checkpoint 先例）：未配置 user.email 时注入临时身份，
    // 已配置则用真实身份——存档提交可归属
    const cpEnv = { ...process.env }
    if (!gitQuiet(repoRoot, ['config', 'user.email'])) {
      cpEnv.GIT_AUTHOR_NAME = 'sillyspec-checkpoint'
      cpEnv.GIT_AUTHOR_EMAIL = 'checkpoint@sillyspec.local'
      cpEnv.GIT_COMMITTER_NAME = 'sillyspec-checkpoint'
      cpEnv.GIT_COMMITTER_EMAIL = 'checkpoint@sillyspec.local'
    }
    const sha = git(repoRoot, ['commit-tree', treeSha, '-p', parent, '-F', '-'], { input: message, env: cpEnv })
    git(repoRoot, ['update-ref', ref, sha])

    let files = 0
    const changed = gitQuiet(repoRoot, ['diff-tree', '--no-commit-id', '--name-only', '-r', sha])
    if (changed) files = changed.split('\n').filter(Boolean).length
    return { kind: 'created', sha, treeSha, parent, files }
  } catch (e) {
    return { kind: 'skipped', reason: 'git-error', detail: e && e.message ? e.message : String(e) }
  } finally {
    try { rmSync(tmpIndex, { force: true }) } catch { /* 清理失败：同会话下次覆盖 */ }
  }
}

/**
 * 列出变更的存档链（按时间倒序；链尾混入主历史，按 subject 前缀过滤）。
 * @returns {Promise<Array<{sha: string, taskId: string|null, ts: number, files: number}>>}
 */
export async function listCheckpoints({ repoRoot, changeName }) {
  const name = String(changeName || '')
  if (!SAFE_CHANGE_NAME_RE.test(name)) return []
  const ref = REF_PREFIX + name
  const log = gitQuiet(repoRoot, ['log', '--format=%H%x09%at%x09%s', '-n', '200', ref])
  if (!log) return []
  const out = []
  for (const line of log.split('\n')) {
    if (!line) continue
    const [sha, at, subject] = line.split('\t')
    if (!subject || !subject.startsWith(SUBJECT_PREFIX)) continue // 链尾以下的主历史止步
    const m = /^sillyspec-cp: \S+ (task-\d+|-) /.exec(subject)
    const files = gitQuiet(repoRoot, ['diff-tree', '--no-commit-id', '--name-only', '-r', sha])
    out.push({ sha, taskId: m && m[1] !== '-' ? m[1] : null, ts: Number(at) * 1000, files: files ? files.split('\n').filter(Boolean).length : 0 })
  }
  return out
}

/**
 * 恢复预览：工作区 vs 存档点的 diff（patch 与 stat 各一份）。
 * @returns {Promise<{stat: string, patch: string}>}
 */
export async function previewRestore({ repoRoot, sha, paths = [] }) {
  const spec = ['--', ...(paths && paths.length ? paths : ['.'])]
  const stat = git(repoRoot, ['diff', '--stat', sha, ...spec])
  const patch = git(repoRoot, ['diff', sha, ...spec])
  return { stat, patch }
}

/**
 * 读档：git restore --source（仅写工作区，零触碰 index）。调用方负责 --yes 确认纪律。
 * @param {{repoRoot: string, sha: string, paths?: string[], all?: boolean}} opts
 * @returns {Promise<{ok: boolean, reason?: string, restored: string[]}>}
 */
export async function restoreCheckpoint({ repoRoot, sha, changeName, paths = [], all = false }) {
  const list = await listCheckpoints({ repoRoot, changeName: changeName || '' })
  if (!list.some((c) => c.sha === sha)) return { ok: false, reason: 'sha 不在该变更存档链中（用 checkpoint --change 列出可用 SHA）', restored: [] }
  const target = (all || !paths.length) ? ['.'] : paths
  try {
    git(repoRoot, ['restore', `--source=${sha}`, '--', ...target])
    return { ok: true, restored: target }
  } catch (e) {
    return { ok: false, reason: e && e.message ? e.message : String(e), restored: [] }
  }
}

/** 删除变更的存档 ref（change-delete 清理步用；best-effort 不抛出）。 */
export function deleteCheckpointRef(repoRoot, changeName) {
  const name = String(changeName || '')
  if (!SAFE_CHANGE_NAME_RE.test(name)) return false
  try {
    git(repoRoot, ['update-ref', '-d', REF_PREFIX + name])
    return true
  } catch {
    return false
  }
}

/** ref 存在性探测（dry-run 报告面用）。 */
export function hasCheckpointRef(repoRoot, changeName) {
  const name = String(changeName || '')
  if (!SAFE_CHANGE_NAME_RE.test(name)) return false
  return Boolean(gitQuiet(repoRoot, ['rev-parse', '--verify', REF_PREFIX + name]))
}

export default { createCheckpoint, listCheckpoints, previewRestore, restoreCheckpoint, deleteCheckpointRef, hasCheckpointRef, readCheckpointConfig }
