/**
 * runtime-paths.js — .runtime 布局分层（state/ 与 temp/）与旧布局一次性迁移。
 *
 * 背景（2026-10-18 用户反馈）：.runtime 根目录堆积 1649 个条目——22 类按 change 命名
 * 等 24 类散文件不在归档回收名单、日志/db 备份与核心
 * 状态混放。分野沿用 runtime-hygiene.js 的定界思路，按「删除是否安全」切两层：
 * - **state/**：按 change 命名的派生状态（watcher 事件流、draft ledger、冲突标记…）。
 *   活跃变更在读，归档/删除后无读者——由 pruneArchivedChangeRuntime 精确回收。
 * - **temp/**：可随时整体删除的产物（watcher.log / spec-sync-bg.log / audit.log /
 *   db 备份 .bak|.corrupt-*|.pre-import-* / 锁残留 *.tmp）。无不可再生的状态语义。
 *
 * 家族表是唯一清单源（写入点路径助手 + 归档回收精确名 + 迁移前缀匹配三方共源，
 * 防三处清单漂移）。契约：
 * - 迁移幂等：目标已存在则跳过（不覆盖——混版本窗口防旧进程迟到文件盖掉新文件）；
 *   逐条 try/catch fail-open，绝不抛（卫生动作不阻断主流程，与 runtime-hygiene 同族）。
 * - 迁移只动已知家族与已知临时产物，未知文件一律不动（用户/工具自置文件无归属语义）。
 * - 文件名一概保持原样，仅目录前缀变化——写入点改动=一行 join 换助手，读写面零重命名。
 */
import { existsSync, mkdirSync, readdirSync, renameSync } from 'fs'
import { join } from 'path'

export const RUNTIME_STATE_DIRNAME = 'state'
export const RUNTIME_TEMP_DIRNAME = 'temp'

/**
 * state/ 家族表：prefix 用于迁移匹配与回收名生成；ext 是文件名后缀；
 * stages 特例仅 current-stage-review-run-id（无扩展名且内嵌 stage 枚举
 * brainstorm|plan|execute——stage-review.js stageReviewMarkerPath 的构造形态）。
 */
const STATE_FAMILIES = [
  { prefix: 'sync-docs-lastpush-', ext: '.json' },
  { prefix: 'draft-ledger-', ext: '.json' },
  { prefix: 'route-hindsight-baseline-', ext: '.json' },
  { prefix: 'watcher-events-', ext: '.jsonl' },
  { prefix: 'watcher-stage-timing-', ext: '.json' },
  { prefix: 'watcher-last-snapshot-', ext: '.json' },
  { prefix: 'test-rerun-', ext: '.json' },
  { prefix: 'test-ledger-', ext: '.json' },
  { prefix: 'ceremony-tier-', ext: '.json' },
  { prefix: 'stage-session-ledger-', ext: '.json' },
  { prefix: 'wave-session-ledger-', ext: '.json' },
  { prefix: 'verify-draft-', ext: '.json' },
  { prefix: 'verify-quality-scan-', ext: '.json' },
  { prefix: 'verify-result-hwm-', ext: '.json' },
  { prefix: 'review-dispatch-', ext: '.json' },
  { prefix: 'review-dispatch-shadow-', ext: '.json' },
  { prefix: 'execute-cleanup-', ext: '.json' },
  { prefix: 'friction-tally-', ext: '.json' },
  { prefix: 'prompt-inject-', ext: '.json' },
  { prefix: 'sync-conflict-', ext: '.json' },
  { prefix: 'spec-sync-conflict-', ext: '.json' },
  { prefix: 'apply-pathspec-', ext: '.txt' },
  { prefix: 'scope-audit-', ext: '.json' },
  { prefix: 'scan-refresh-', ext: '.json' },
  { prefix: 'current-execute-run-id-', ext: '' },
  { prefix: 'current-stage-review-run-id-', ext: '', stages: ['brainstorm', 'plan', 'execute'] },
]

/**
 * 全局面单例（无 change 归属但有读者）→ state/（2026-10-18 二轮收敛：根目录只留
 * db/锁/会话身份/global/spec-version/user-inputs 六件核心）。迁移精确名匹配。
 */
export const RUNTIME_STATE_SINGLETONS = [
  'friction-ledger.json',
  'deleted-changes.jsonl',
  'active-gate-snapshots.json',
  'scan-guard.json',
  'verify-lint-tally.json',
  'decision-hits.json',
  'knowledge-hits.jsonl',
  'knowledge-hit-report.json',
  'vector-capability.json',
  'spec-sync-base.json',
  'spec-sync-last-success.json',
  'spec-sync-fail-streak.json',
  'spec-sync-follow-reported.json',
  // 2026-10-21-cli-manifest-since-cache：spec-manifest 增量游标缓存（有读者、
  // 不可再生前同步全量代价高——state/ 语义）
  'spec-manifest-cache.json',
  'sync-noise-self-heal.json',
  'last-delta.json',
]

/** 可再生全局单例产物（删后可重建、无不可再生状态）→ temp/。 */
export const RUNTIME_TEMP_SINGLETONS = [
  'doctor-diagnosis.json',
  'flow-telemetry.jsonl',
  'write-audit.jsonl',
  'anon-session-warn.json',
  'selfref-pointer-warn.json',
  'auto-pull-throttle.json',
]

/** temp/ 侧已知产物：精确名 + 带时间戳/pid 尾的正则（corrupt/pre-import/lock-tmp）。 */
const TEMP_EXACT = new Set(['watcher.log', 'spec-sync-bg.log', 'audit.log', 'sillyspec.db.bak'])
const TEMP_PATTERNS = [
  /^sillyspec\.db\.corrupt-/,
  /^sillyspec\.db\.pre-import-/,
  /^watcher\.lock\.\d+\.tmp$/,
]

/**
 * state/ 下某变更的全家族精确文件名清单（归档/删除回收用；禁 glob 的精确名形态）。
 * @param {string} changeName
 * @returns {string[]}
 */
export function runtimeStateFileNames(changeName) {
  const names = []
  for (const f of STATE_FAMILIES) {
    if (f.stages) {
      for (const s of f.stages) names.push(`${f.prefix}${s}-${changeName}`)
    } else {
      names.push(`${f.prefix}${changeName}${f.ext}`)
    }
  }
  return names
}

/**
 * 路径助手自带目录保证（mkdir -p 语义，幂等 fail-open）：库级直调（测试/embedded）不经
 * CLI 入口迁移，裸 writeFileSync/appendFileSync 落 state|temp 会 ENOENT——写点分散逐个补
 * mkdir 是打地鼠（2026-10-18 实证四起），在唯一路径构造点收口。读检查顺带建空目录无害
 * （init 预建面与入口迁移本就常态建这两层）。
 */
function _pathWithDir(runtimeRoot, dirname_, filename) {
  const p = join(runtimeRoot, dirname_, filename)
  try { mkdirSync(join(runtimeRoot, dirname_), { recursive: true }) } catch { /* fail-open：写入侧自抛真实原因 */ }
  return p
}

/** @param {string} runtimeRoot @param {string} filename @returns {string} */
export function runtimeStatePath(runtimeRoot, filename) {
  return _pathWithDir(runtimeRoot, RUNTIME_STATE_DIRNAME, filename)
}

/** @param {string} runtimeRoot @param {string} filename @returns {string} */
export function runtimeTempPath(runtimeRoot, filename) {
  return _pathWithDir(runtimeRoot, RUNTIME_TEMP_DIRNAME, filename)
}

function _isTempArtifact(name) {
  return TEMP_EXACT.has(name) || TEMP_PATTERNS.some((re) => re.test(name))
}

/**
 * 旧布局一次性迁移：把 .runtime 根目录下已知家族文件移动到 state/ 或 temp/。
 * 幂等（目标存在跳过）、fail-open（单条失败/目录缺失零副作用）、未知文件不动。
 * @param {string} runtimeRoot .runtime 绝对路径
 * @returns {{ stateMoved: number, tempMoved: number, skipped: number }}
 */
export function migrateRuntimeLayout(runtimeRoot) {
  const out = { stateMoved: 0, tempMoved: 0, skipped: 0 }
  let entries
  try {
    entries = readdirSync(runtimeRoot, { withFileTypes: true })
  } catch {
    return out // 目录缺失（该仓库从未跑过流程）= 无可迁
  }
  const prefixes = STATE_FAMILIES.map((f) => f.prefix)
  const stateSingletons = new Set(RUNTIME_STATE_SINGLETONS)
  const tempSingletons = new Set(RUNTIME_TEMP_SINGLETONS)
  const moves = [] // { name, dest }
  for (const e of entries) {
    if (!e.isFile()) continue
    const name = e.name
    if (prefixes.some((p) => name.startsWith(p)) || stateSingletons.has(name)) moves.push({ name, dest: RUNTIME_STATE_DIRNAME })
    else if (_isTempArtifact(name) || tempSingletons.has(name)) moves.push({ name, dest: RUNTIME_TEMP_DIRNAME })
    // 未知归属：不动（用户/工具自置文件无生命周期语义，迁移不猜）
  }
  // 无条件预建两层目录（幂等廉价）：CLI 入口路径保证 state/ 在一切写入前就位——
  // 新仓首跑无文件可搬，靠这里兜住「迁移零动作、写入点裸写 ENOENT」的窗口
  for (const d of [RUNTIME_STATE_DIRNAME, RUNTIME_TEMP_DIRNAME]) {
    try { mkdirSync(join(runtimeRoot, d), { recursive: true }) } catch { /* fail-open */ }
  }
  const madeDirs = new Set()
  for (const { name, dest } of moves) {
    const dst = join(runtimeRoot, dest, name)
    try {
      if (existsSync(dst)) { out.skipped++; continue } // 不覆盖：防旧进程迟到文件盖新文件
      if (!madeDirs.has(dest)) {
        mkdirSync(join(runtimeRoot, dest), { recursive: true }) // 并发 mkdir recursive 不抛
        madeDirs.add(dest)
      }
      renameSync(join(runtimeRoot, name), dst) // 同卷原子；跨进程竞争失败即跳过下次再收
      if (dest === RUNTIME_STATE_DIRNAME) out.stateMoved++
      else out.tempMoved++
    } catch {
      out.skipped++
    }
  }
  return out
}
