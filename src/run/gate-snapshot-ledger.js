/**
 * gate-snapshot-ledger.js — 门禁隔离快照的生命周期账本与陈旧回收
 * （2026-09-24-gate-snapshot-lifecycle，task-01；D-003@v2 / D-004@v2 / D-005@v1）
 *
 * 存在理由：门禁快照（%TEMP%/sillyspec-gate-*，src/run/gate-snapshot.js 建、quick/verify
 * 门 finally 清）在三条路径必然泄漏——进程被杀（cleanup 根本没跑）、Windows rmSync 无重试
 * 遇 EPERM/junction 锁、git worktree remove 失败留 prunable 注册。实证攒到 41 个目录+2 个
 * prunable 注册且全仓无清扫机制。本模块提供：
 *   ①账本（create 登记 / cleanup 销账，幂等原子写）——崩溃残留的可追踪凭据；
 *   ②路径与条目 fail-closed 守卫——账本是可变 JSON，删除原语调用前必过（D-005@v1）；
 *   ③TTL×pid 三态保守判定（D-003@v2）与「目录+worktree 注册双清」回收执行（D-004@v2）：
 *     双清确认才销号——删不掉的残留必须留在账本里等下一轮，否则永久失追踪。
 *
 * 信任边界：删除原语仅由本模块的回收路径调用，且每个条目先过 isSafeLedgerEntry；
 * gate-snapshot.js 自身 cleanup 的 root 来自 mkdtemp（生成即受信）不经过账本。
 * 异常面：全部 fail-open 吞掉（账本/回收任一异常零阻断，退现状残留）。
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { writeAtomicSync } from '../fs-atomic.js'

const LEDGER_FILE = 'active-gate-snapshots.json'
const HOUR_MS = 3600_000
const STALE_HOURS_DEFAULT = 24

/** 账本文件路径（runtime 域：.sillyspec/.runtime/active-gate-snapshots.json） */
export function gateSnapshotLedgerPath(runtimeRoot) {
  return join(runtimeRoot, LEDGER_FILE)
}

/** 读账本（损坏/缺失/非数组 → 空数组，fail-open） */
export function readGateSnapshotLedger(runtimeRoot) {
  if (!runtimeRoot) return []
  try {
    const p = gateSnapshotLedgerPath(runtimeRoot)
    if (!existsSync(p)) return []
    const data = JSON.parse(readFileSync(p, 'utf8'))
    if (!Array.isArray(data)) return []
    return data.filter((e) => e && typeof e === 'object' && typeof e.snapshotRoot === 'string')
  } catch {
    return []
  }
}

function writeLedger(runtimeRoot, entries) {
  mkdirSync(runtimeRoot, { recursive: true })
  writeAtomicSync(gateSnapshotLedgerPath(runtimeRoot), JSON.stringify(entries, null, 2))
}

/** 登记快照（幂等：同 root 重复调用不追加；runtimeRoot 缺失退 no-op） */
export function registerGateSnapshot({ runtimeRoot, snapshotRoot, pid = process.pid }) {
  if (!runtimeRoot || !snapshotRoot) return
  try {
    const entries = readGateSnapshotLedger(runtimeRoot)
    if (entries.some((e) => e.snapshotRoot === snapshotRoot)) return
    entries.push({ snapshotRoot, pid, createdAt: Date.now() })
    writeLedger(runtimeRoot, entries)
  } catch { /* fail-open：登记失败仅退化为残留不可追踪，不阻断门禁 */ }
}

/** 销账（幂等：缺失不抛；调用方负责先确认双清——本函数不判目录/注册状态） */
export function unregisterGateSnapshot({ runtimeRoot, snapshotRoot }) {
  if (!runtimeRoot || !snapshotRoot) return
  try {
    const entries = readGateSnapshotLedger(runtimeRoot)
    const next = entries.filter((e) => e.snapshotRoot !== snapshotRoot)
    if (next.length === entries.length) return
    writeLedger(runtimeRoot, next)
  } catch { /* fail-open：销账失败保留条目，下轮重试 */ }
}

/**
 * 路径守卫（D-005@v1）：必须是 tmpdir 的**直接子目录**且 basename 严格匹配
 * sillyspec-gate-* ——账本可被篡改，删除原语调用前唯一路径闸门。
 */
export function isSafeSnapshotRoot(snapshotRoot, { tmpBase = tmpdir() } = {}) {
  if (typeof snapshotRoot !== 'string' || !snapshotRoot) return false
  if (snapshotRoot.includes('..')) return false
  // 路径比较口径：win32 不区分大小写（TEMP/TMP 跨进程大小写漂移会让合法残留永不满足守卫）
  const fold = (p) => (process.platform === 'win32' ? p.toLowerCase() : p)
  const norm = resolve(snapshotRoot)
  if (fold(dirname(norm)) !== fold(resolve(tmpBase))) return false
  return /^sillyspec-gate-/.test(basename(norm))
}

/** 条目结构守卫：根过路径守卫 ∧ pid 正整数 ∧ createdAt 有限毫秒值 */
export function isSafeLedgerEntry(entry, opts) {
  return !!entry
    && isSafeSnapshotRoot(entry.snapshotRoot, opts)
    && Number.isInteger(entry.pid) && entry.pid > 0
    && Number.isFinite(entry.createdAt)
}

/** staleHours 值域：非有限/非正 → 回退 24h（D-003@v2 单一入口） */
export function resolveStaleHours(value = process.env.SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : STALE_HOURS_DEFAULT
}

/**
 * pid 活性三态（D-003@v2，破坏性场景从严）：成功/EPERM=活，ESRCH=死，
 * 无效 pid/其他异常=按活跳过。与 bg-sync 终止扫描口径（无效 pid 按死）有意分歧——
 * 那边误判代价=进程残留，这边误判代价=删掉活跃快照目录。
 */
function defaultIsProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return true
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return !(e && e.code === 'ESRCH')
  }
}

/**
 * 纯判定：守卫 ∧ 超 TTL ∧ 明确死 三合取才 stale；其余（未超期/存活/守卫不过/
 * 异常）一律保留。staleHours 非法值回退 24h。
 */
export function selectStaleSnapshots(entries, { now = Date.now(), staleHours, isProcessAlive = defaultIsProcessAlive } = {}) {
  const hours = resolveStaleHours(staleHours)
  const probe = typeof isProcessAlive === 'function' ? isProcessAlive : defaultIsProcessAlive
  const stale = []
  const alive = []
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!isSafeLedgerEntry(e)) { alive.push(e); continue }
    if ((now - e.createdAt) / HOUR_MS <= hours) { alive.push(e); continue }
    let isAlive
    try { isAlive = !!probe(e.pid) } catch { isAlive = true }
    if (isAlive) { alive.push(e); continue }
    stale.push(e)
  }
  return { stale, alive }
}

function defaultRunGit(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000, windowsHide: true }).trim()
}

function defaultRemoveDir(p) {
  rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}

/** worktree 注册是否仍登记该 root（跨平台路径归一 + win32 大小写不敏感） */
function defaultWorktreeRegistered(cwd, snapshotRoot) {
  const out = defaultRunGit(cwd, ['worktree', 'list', '--porcelain'])
  const norm = (s) => {
    const v = String(s).replace(/\\/g, '/')
    return process.platform === 'win32' ? v.toLowerCase() : v
  }
  const target = norm(snapshotRoot)
  return out.split('\n').some((line) => line.startsWith('worktree ') && norm(line.slice('worktree '.length)) === target)
}

/**
 * 回收执行（D-004@v2）：逐条 remove → rmSync（remove 失败补 prune），双清确认
 * （目录不存在 ∧ worktree list 无注册）才销号；删不掉的计入 skipped 保留条目。
 * 返回 {reclaimed, skipped}；异常全吞退零副作用。
 */
export function reclaimStaleGateSnapshots({
  runtimeRoot,
  cwd,
  now = Date.now(),
  staleHours,
  isProcessAlive = defaultIsProcessAlive,
  runGit = defaultRunGit,
  removeDir = defaultRemoveDir,
  worktreeRegistered = defaultWorktreeRegistered,
} = {}) {
  if (!runtimeRoot || !cwd) return { reclaimed: [], skipped: [] }
  try {
    const { stale } = selectStaleSnapshots(readGateSnapshotLedger(runtimeRoot), { now, staleHours, isProcessAlive })
    const reclaimed = []
    const skipped = []
    for (const e of stale) {
      const root = e.snapshotRoot
      let removeFailed = false
      try { runGit(cwd, ['worktree', 'remove', '--force', root]) } catch { removeFailed = true }
      try { removeDir(root) } catch { /* 目录删不掉→下方双清判定保留条目 */ }
      if (removeFailed) { try { runGit(cwd, ['worktree', 'prune']) } catch { /* prune 失败→下方判定保留 */ } }
      let dirGone = false
      let regGone = false
      try { dirGone = !existsSync(root) } catch { dirGone = false }
      try { regGone = !worktreeRegistered(cwd, root) } catch { regGone = false }
      if (dirGone && regGone) {
        unregisterGateSnapshot({ runtimeRoot, snapshotRoot: root })
        reclaimed.push(root)
      } else {
        skipped.push(root)
      }
    }
    return { reclaimed, skipped }
  } catch {
    return { reclaimed: [], skipped: [] }
  }
}
