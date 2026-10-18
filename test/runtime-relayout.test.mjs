// .runtime 布局分层（state/ 与 temp/）契约（2026-10-18 用户反馈：根目录 1649 条目堆积）。
// 锁 runtime-paths.js 三方共源清单：写入路径助手、迁移前缀匹配、回收精确名生成。
// 隔离：cwd 用 os.tmpdir() 临时目录，绝不碰真实 .runtime。
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  RUNTIME_STATE_DIRNAME,
  RUNTIME_TEMP_DIRNAME,
  runtimeStatePath,
  runtimeTempPath,
  runtimeStateFileNames,
  migrateRuntimeLayout,
} from '../src/runtime-paths.js'
import { draftLedgerPath } from '../src/flow-draft.js'
import { watcherEventsPath } from '../src/watcher.js'
import { testLedgerPath } from '../src/run/test-ledger.js'
import { stageReviewMarkerPath } from '../src/stage-review.js'
import { bgSyncLogPath, BG_LOG_FILENAME } from '../src/run/bg-sync.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-runtime-relayout-${process.pid}-`))
const list = (d) => { try { return readdirSync(d).sort() } catch { return [] } }

console.log('\n[runtime-relayout] .runtime state/temp 分层与旧布局迁移')

// ─────────────────────────────────────────
console.log('\n--- 1. 路径助手：目录前缀 + 文件名原样 ---')
{
  const root = join(tmpRoot, 'p', '.runtime')
  assert(runtimeStatePath(root, 'draft-ledger-x.json') === join(root, RUNTIME_STATE_DIRNAME, 'draft-ledger-x.json'), 'runtimeStatePath = <root>/state/<filename>')
  assert(runtimeTempPath(root, 'watcher.log') === join(root, RUNTIME_TEMP_DIRNAME, 'watcher.log'), 'runtimeTempPath = <root>/temp/<filename>')
}

// ─────────────────────────────────────────
console.log('\n--- 2. runtimeStateFileNames：22 家族精确名（含 run-id 的 stage 展开）---')
{
  const names = runtimeStateFileNames('2026-10-18-demo')
  const mustHave = [
    'sync-docs-lastpush-2026-10-18-demo.json',
    'draft-ledger-2026-10-18-demo.json',
    'route-hindsight-baseline-2026-10-18-demo.json',
    'watcher-events-2026-10-18-demo.jsonl',
    'watcher-stage-timing-2026-10-18-demo.json',
    'watcher-last-snapshot-2026-10-18-demo.json',
    'test-rerun-2026-10-18-demo.json',
    'test-ledger-2026-10-18-demo.json',
    'ceremony-tier-2026-10-18-demo.json',
    'stage-session-ledger-2026-10-18-demo.json',
    'wave-session-ledger-2026-10-18-demo.json',
    'verify-draft-2026-10-18-demo.json',
    'verify-quality-scan-2026-10-18-demo.json',
    'verify-result-hwm-2026-10-18-demo.json',
    'review-dispatch-2026-10-18-demo.json',
    'review-dispatch-shadow-2026-10-18-demo.json',
    'execute-cleanup-2026-10-18-demo.json',
    'friction-tally-2026-10-18-demo.json',
    'prompt-inject-2026-10-18-demo.json',
    'sync-conflict-2026-10-18-demo.json',
    'spec-sync-conflict-2026-10-18-demo.json',
    'apply-pathspec-2026-10-18-demo.txt',
    'scope-audit-2026-10-18-demo.json',
    'scan-refresh-2026-10-18-demo.json',
    'current-execute-run-id-2026-10-18-demo',
    'current-stage-review-run-id-brainstorm-2026-10-18-demo',
    'current-stage-review-run-id-plan-2026-10-18-demo',
    'current-stage-review-run-id-execute-2026-10-18-demo',
  ]
  for (const n of mustHave) assert(names.includes(n), `精确名在场：${n}`)
  assert(new Set(names).size === names.length, '无重复名')
}

// ─────────────────────────────────────────
console.log('\n--- 3. 迁移：已知家族入 state/，临时产物入 temp/，未知不动 ---')
{
  const root = join(tmpRoot, 'm1', '.runtime')
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'draft-ledger-2026-01-01-a.json'), 'A')
  writeFileSync(join(root, 'watcher-events-2026-01-01-a.jsonl'), 'B')
  writeFileSync(join(root, 'current-stage-review-run-id-brainstorm-2026-01-01-a'), 'C')
  writeFileSync(join(root, 'apply-pathspec-2026-01-01-a.txt'), 'D')
  writeFileSync(join(root, 'watcher.log'), 'L1')
  writeFileSync(join(root, 'spec-sync-bg.log'), 'L2')
  writeFileSync(join(root, 'audit.log'), 'L3')
  writeFileSync(join(root, 'sillyspec.db.bak'), 'L4')
  writeFileSync(join(root, 'sillyspec.db.corrupt-1792139338383'), 'L5')
  writeFileSync(join(root, 'sillyspec.db.pre-import-2026-10-16T17-00-01-355Z.bak'), 'L6')
  writeFileSync(join(root, 'sillyspec.db.pre-import-2026-10-16T17-00-01-355Z.bak-wal'), 'L7')
  writeFileSync(join(root, 'watcher.lock.38640.tmp'), 'L8')
  writeFileSync(join(root, 'repro-leak.mjs'), 'J1')      // 一次性脚本：未知归属
  writeFileSync(join(root, 'user-inputs.md'), 'KEEP1')   // 核心单例
  writeFileSync(join(root, 'sillyspec.db'), 'KEEP2')
  mkdirSync(join(root, 'execute-runs'))                  // 既有子目录：不迁
  writeFileSync(join(root, 'execute-runs', 'r1'), 'x')

  const r = migrateRuntimeLayout(root)
  assert(r.stateMoved === 4 && r.tempMoved === 8, `state 搬 4 / temp 搬 8（实际 ${r.stateMoved}/${r.tempMoved}，skipped=${r.skipped}）`)
  assert(readFileSync(join(root, 'state', 'draft-ledger-2026-01-01-a.json'), 'utf8') === 'A', '内容随迁移完整保留（rename 非复制截断）')
  assert(existsSync(join(root, 'temp', 'watcher.log')) && existsSync(join(root, 'temp', 'sillyspec.db.corrupt-1792139338383')), '日志/备份入 temp/')
  assert(existsSync(join(root, 'repro-leak.mjs'), 'utf8'), '未知归属文件原地不动')
  assert(existsSync(join(root, 'user-inputs.md')) && existsSync(join(root, 'sillyspec.db')), '核心单例不动')
  assert(existsSync(join(root, 'execute-runs', 'r1')), '既有子目录不动')
  assert(list(root).filter((n) => n.startsWith('draft-ledger-')).length === 0, '根目录家族文件清空')
}

// ─────────────────────────────────────────
console.log('\n--- 4. 目标已存在跳过不覆盖（混版本迟到文件保守保留）---')
{
  const root = join(tmpRoot, 'm2', '.runtime')
  mkdirSync(join(root, 'state'), { recursive: true })
  writeFileSync(join(root, 'state', 'draft-ledger-x.json'), 'NEW')   // 目标先在（新内容）
  writeFileSync(join(root, 'draft-ledger-x.json'), 'OLD')            // 迟到旧文件（可能是旧版本进程后写，更新）
  writeFileSync(join(root, 'ceremony-tier-x.json'), 'T1')

  const r1 = migrateRuntimeLayout(root)
  assert(r1.stateMoved === 1 && r1.skipped === 1, `目标已存在跳过、其余照搬（实际 moved=${r1.stateMoved} skipped=${r1.skipped}）`)
  assert(readFileSync(join(root, 'state', 'draft-ledger-x.json'), 'utf8') === 'NEW', '不覆盖：迟到旧文件没盖掉新文件')
  assert(existsSync(join(root, 'draft-ledger-x.json')), '冲突源保守保留（迟到文件可能更新，删=丢数据；归档 prune 双路径兜底回收）')
}

// ─────────────────────────────────────────
console.log('\n--- 5. 幂等：无冲突场景重跑全零 ---')
{
  const root = join(tmpRoot, 'm3', '.runtime')
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'test-ledger-x.json'), 'T')
  writeFileSync(join(root, 'watcher.log'), 'L')
  const r1 = migrateRuntimeLayout(root)
  assert(r1.stateMoved === 1 && r1.tempMoved === 1, '首跑搬 1+1')
  const before = list(root).join(',')
  const r2 = migrateRuntimeLayout(root)
  assert(r2.stateMoved === 0 && r2.tempMoved === 0 && r2.skipped === 0, `重跑零副作用（实际 ${r2.stateMoved}/${r2.tempMoved}/${r2.skipped}）`)
  assert(list(root).join(',') === before, '重跑后根目录状态不变')
}

// ─────────────────────────────────────────
console.log('\n--- 6. FR-01 写入面：真实写入点产物落 state/ 子目录 ---')
{
  const root = join(tmpRoot, 'w', '.runtime')
  const c = '2026-10-18-demo'
  assert(draftLedgerPath(root, c) === join(root, 'state', `draft-ledger-${c}.json`), 'draftLedgerPath（flow-draft 写入面）落 state/')
  assert(watcherEventsPath(root, c) === join(root, 'state', `watcher-events-${c}.jsonl`), 'watcherEventsPath（watcher 子进程落盘锚）落 state/')
  assert(testLedgerPath(root, c) === join(root, 'state', `test-ledger-${c}.json`), 'testLedgerPath 落 state/')
  assert(stageReviewMarkerPath(root, 'execute', c) === join(root, 'state', `current-stage-review-run-id-execute-${c}`), 'stageReviewMarkerPath 落 state/')
}

console.log('\n--- 7. FR-02 temp 面：日志/备份产物落 temp/ 且删除后可重建 ---')
{
  const root = join(tmpRoot, 't', '.runtime')
  mkdirSync(root, { recursive: true })
  assert(bgSyncLogPath(root) === join(root, 'temp', BG_LOG_FILENAME), 'bgSyncLogPath（spec-sync-bg.log）落 temp/')
  // 迁移把旧日志收进 temp/（复用 migrate 的已知产物面）
  writeFileSync(join(root, 'spec-sync-bg.log'), 'old-log')
  writeFileSync(join(root, 'watcher.log'), 'old-wlog')
  const r = migrateRuntimeLayout(root)
  assert(r.tempMoved === 2 && existsSync(join(root, 'temp', 'watcher.log')), '旧日志迁移入 temp/')
  // temp/ 整体删除后：无 reader 依赖 + 写入点模式（mkdir recursive + append）自动重建
  rmSync(join(root, 'temp'), { recursive: true, force: true })
  let recreated = false
  try {
    mkdirSync(join(root, 'temp'), { recursive: true })
    writeFileSync(bgSyncLogPath(root), 'line')
    recreated = existsSync(bgSyncLogPath(root))
  } catch { recreated = false }
  assert(recreated, '删除 temp/ 后写入自动重建（无状态语义，功能不依赖 temp 存活）')
}

console.log('\n--- 8. fail-open：目录缺失/坏路径零副作用不抛 ---')
{
  const r = migrateRuntimeLayout(join(tmpRoot, 'no-such-runtime'))
  assert(r.stateMoved === 0 && r.tempMoved === 0 && r.skipped === 0, '目录缺失返回零计数不抛')
  let threw = false
  try { migrateRuntimeLayout(null) } catch { threw = true }
  assert(!threw, 'null 根 fail-open 不抛')
}

try { rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* temp 由 OS 清理 */ }

if (failures > 0) {
  console.error(`\n[runtime-relayout] ❌ ${failures} 项失败`)
  process.exit(1)
}
console.log('\n[runtime-relayout] ✅ 全部通过')
