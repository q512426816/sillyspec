// 归档后按 change 精确回收 .runtime 取证（ql-20260908-005-7549）：
// handleArchiveConfirmStep 先写 delta.md（已吃 reconcile + apply-pathspec），再 archiveChangeDirectory
// → archiveWorktreeCleanup。归档后 review.json / verify-runs / apply-pathspec 无读者，按 change
// 精确删，不复制进 archive/evidence（review 才几 MB，双写漂移面更大）。
//
// 验收点：
// 1. 本变更的 apply-pathspec / 有戳 execute-runs / 归属明确的 stage-reviews / change 字段唯一的
//    verify-runs 被删
// 2. 他变更同类产物零误伤（含 login vs 2026-08-01-login 后缀陷阱）
// 3. fail-closed：无 change 戳的 execute-runs 不按 mtime 猜删；verify-runs 无 change 字段或
//    同目录混有他变更 change 字段 → 整目录不删
// 4. archiveWorktreeCleanup 无 meta 早退路径仍会回收（接线必须在 worktree return 之前）
// 5. 相邻文件零误伤：sillyspec.db / last-delta.json / endpoint-baselines / contract-artifacts
// 6. friction-tally-<change>.json 随归档精确回收，他变更零误伤（friction-signal-hint FR-05；
//    短名不误伤日期前缀长名，同 apply-pathspec 口径）
//
// 隔离：os.tmpdir()，绝不碰真实 .sillyspec/.runtime。
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { pruneArchivedChangeRuntime, archiveWorktreeCleanup } from '../src/run/complete-handlers.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-arch-prune-${process.pid}-`))
let seq = 0
const makeRt = () => {
  const rt = join(tmpRoot, `rt-${++seq}`, '.runtime')
  mkdirSync(rt, { recursive: true })
  return rt
}
const write = (p, body = 'x') => {
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body, null, 2) + '\n')
}

console.log('\n[archive-runtime-prune] 归档后按 change 精确回收 runtime 取证')

// ─────────────────────────────────────────
// 1. 本变更四类产物回收 + 他变更零误伤
// ─────────────────────────────────────────
console.log('\n--- 1. 本变更回收、他变更保留 ---')
{
  const rt = makeRt()
  const mine = '2026-09-08-session-list-liveness'
  const other = '2026-09-07-pi-task-events'

  write(join(rt, `apply-pathspec-${mine}.txt`), 'src/a.js\n')
  write(join(rt, `apply-pathspec-${other}.txt`), 'src/b.js\n')

  write(join(rt, 'execute-runs', 'exec-mine', 'change'), mine + '\n')
  write(join(rt, 'execute-runs', 'exec-mine', 'tasks', 'task-01', 'review.json'), { verdict: 'pass' })
  write(join(rt, 'execute-runs', 'exec-other', 'change'), other + '\n')
  write(join(rt, 'execute-runs', 'exec-other', 'tasks', 'task-01', 'review.json'), { verdict: 'pass' })

  write(join(rt, 'stage-reviews', 'execute-review-2026-09-08-010000', 'review.json'), {
    verdict: 'pass',
    reviewedFiles: [`changes/${mine}/design.md`],
  })
  write(join(rt, 'stage-reviews', 'plan-review-2026-09-07-010000', 'review.json'), {
    verdict: 'pass',
    reviewedFiles: [`changes/${other}/plan.md`],
  })

  write(join(rt, 'verify-runs', '20260908010101', 'test-result.json'), { change: mine, status: 'passed' })
  write(join(rt, 'verify-runs', '20260908010101', 'reconcile-result.json'), { change: mine, matched: [] })
  write(join(rt, 'verify-runs', '20260907010101', 'test-result.json'), { change: other, status: 'passed' })

  const r = pruneArchivedChangeRuntime(rt, mine)
  assert(r.ok === true, 'prune 返回 ok:true')
  assert(!existsSync(join(rt, `apply-pathspec-${mine}.txt`)), '本变更 apply-pathspec 已删')
  assert(existsSync(join(rt, `apply-pathspec-${other}.txt`)), '他变更 apply-pathspec 保留')
  assert(!existsSync(join(rt, 'execute-runs', 'exec-mine')), '本变更有戳 execute-run 已删')
  assert(existsSync(join(rt, 'execute-runs', 'exec-other')), '他变更 execute-run 保留')
  assert(!existsSync(join(rt, 'stage-reviews', 'execute-review-2026-09-08-010000')), '本变更 stage-review 已删')
  assert(existsSync(join(rt, 'stage-reviews', 'plan-review-2026-09-07-010000')), '他变更 stage-review 保留')
  assert(!existsSync(join(rt, 'verify-runs', '20260908010101')), '本变更 verify-run 已删')
  assert(existsSync(join(rt, 'verify-runs', '20260907010101')), '他变更 verify-run 保留')
}

// ─────────────────────────────────────────
// 2. login 不得误伤 2026-08-01-login（坑 marker-suffix-overmatch 同类）
// ─────────────────────────────────────────
console.log('\n--- 2. 短名 change 不误伤日期前缀长名 ---')
{
  const rt = makeRt()
  write(join(rt, 'apply-pathspec-login.txt'), 'a.js\n')
  write(join(rt, 'apply-pathspec-2026-08-01-login.txt'), 'b.js\n')
  write(join(rt, 'stage-reviews', 'plan-review-short', 'review.json'), {
    reviewedFiles: ['changes/login/plan.md'],
  })
  write(join(rt, 'stage-reviews', 'plan-review-long', 'review.json'), {
    reviewedFiles: ['changes/2026-08-01-login/plan.md'],
  })
  write(join(rt, 'execute-runs', 'exec-short', 'change'), 'login\n')
  write(join(rt, 'execute-runs', 'exec-long', 'change'), '2026-08-01-login\n')

  pruneArchivedChangeRuntime(rt, 'login')
  assert(!existsSync(join(rt, 'apply-pathspec-login.txt')), '短名 apply-pathspec 已删')
  assert(existsSync(join(rt, 'apply-pathspec-2026-08-01-login.txt')), '长名 apply-pathspec 保留（精确文件名，非后缀匹配）')
  assert(!existsSync(join(rt, 'stage-reviews', 'plan-review-short')), '短名 stage-review 已删')
  assert(existsSync(join(rt, 'stage-reviews', 'plan-review-long')), '长名 stage-review 保留（changes/<name>/ 首段精确相等）')
  assert(!existsSync(join(rt, 'execute-runs', 'exec-short')), '短名 execute-run 已删')
  assert(existsSync(join(rt, 'execute-runs', 'exec-long')), '长名 execute-run 保留（戳全等）')
}

// ─────────────────────────────────────────
// 3. fail-closed：无戳 / 无 change 字段 / 同目录混变更
// ─────────────────────────────────────────
console.log('\n--- 3. fail-closed 不猜删 ---')
{
  const rt = makeRt()
  const mine = 'c-mine'
  write(join(rt, 'execute-runs', 'exec-unstamped', 'tasks', 'task-01', 'review.json'), { verdict: 'pass' })
  write(join(rt, 'verify-runs', '20260908000000', 'output.txt'), 'no json\n')
  write(join(rt, 'verify-runs', '20260908000001', 'test-result.json'), { status: 'passed' }) // 无 change 字段
  write(join(rt, 'verify-runs', '20260908000002', 'test-result.json'), { change: mine })
  write(join(rt, 'verify-runs', '20260908000002', 'reconcile-result.json'), { change: 'someone-else' })
  write(join(rt, 'stage-reviews', 'execute-review-orphan', 'notes.txt'), 'no review.json\n')
  write(join(rt, 'stage-reviews', 'execute-review-empty', 'review.json'), { verdict: 'pass' }) // 无 reviewedFiles

  pruneArchivedChangeRuntime(rt, mine)
  assert(existsSync(join(rt, 'execute-runs', 'exec-unstamped')), '无戳 execute-run 不删（禁 mtime 猜归属）')
  assert(existsSync(join(rt, 'verify-runs', '20260908000000')), '无 JSON 的 verify-run 不删')
  assert(existsSync(join(rt, 'verify-runs', '20260908000001')), 'JSON 无 change 字段的 verify-run 不删')
  assert(existsSync(join(rt, 'verify-runs', '20260908000002')), '同目录混有他变更 change 字段 → 整目录不删')
  assert(existsSync(join(rt, 'stage-reviews', 'execute-review-orphan')), '无 review.json 的 stage-review 不删')
  assert(existsSync(join(rt, 'stage-reviews', 'execute-review-empty')), '无 reviewedFiles 的 stage-review 不删')
}

// ─────────────────────────────────────────
// 4. 相邻权威/他类 runtime 文件零误伤
// ─────────────────────────────────────────
console.log('\n--- 4. 相邻文件零误伤 ---')
{
  const rt = makeRt()
  const mine = 'c-adj'
  write(join(rt, 'sillyspec.db'), 'db')
  write(join(rt, 'last-delta.json'), '{}')
  write(join(rt, 'endpoint-baselines', `${mine}.json`), { change: mine })
  write(join(rt, 'contract-artifacts', mine, 'task-01', 'endpoints.json'), { endpoints: [] })
  write(join(rt, `apply-pathspec-${mine}.txt`), 'x.js\n')
  write(join(rt, 'audit.log'), '{}\n')

  pruneArchivedChangeRuntime(rt, mine)
  assert(existsSync(join(rt, 'sillyspec.db')), 'sillyspec.db 未动')
  assert(existsSync(join(rt, 'last-delta.json')), 'last-delta.json 未动（全局 sidecar，非本变更堆积）')
  assert(existsSync(join(rt, 'endpoint-baselines', `${mine}.json`)), 'endpoint-baselines 本轮不扩删')
  assert(existsSync(join(rt, 'contract-artifacts', mine, 'task-01', 'endpoints.json')), 'contract-artifacts 本轮不扩删')
  assert(existsSync(join(rt, 'audit.log')), 'audit.log 未动')
  assert(!existsSync(join(rt, `apply-pathspec-${mine}.txt`)), '同时本变更 apply-pathspec 确实被删（裁剪真生效）')
}

// ─────────────────────────────────────────
// 5. 空参 / 目录不存在 fail-open；archiveWorktreeCleanup 无 meta 早退仍回收
// ─────────────────────────────────────────
console.log('\n--- 5. fail-open + 接线在 worktree 早退之前 ---')
{
  assert(pruneArchivedChangeRuntime(null, 'x').ok === true, 'runtimeRoot 空 → ok（no-op）')
  assert(pruneArchivedChangeRuntime(join(tmpRoot, 'no-such'), 'x').ok === true, '目录不存在 → ok（no-op，不抛）')

  const cwd = join(tmpRoot, 'wt-early')
  const specBase = join(cwd, '.sillyspec')
  const rt = join(specBase, '.runtime')
  const mine = '2026-09-08-early-return'
  mkdirSync(rt, { recursive: true })
  write(join(rt, `apply-pathspec-${mine}.txt`), 'y.js\n')
  write(join(rt, 'execute-runs', 'exec-early', 'change'), mine + '\n')
  // 无 worktrees/<mine>/meta.json → archiveWorktreeCleanup 走孤儿 force cleanup 后 return
  await archiveWorktreeCleanup(cwd, mine, specBase, {})
  assert(!existsSync(join(rt, `apply-pathspec-${mine}.txt`)), '无 meta 早退路径仍删 apply-pathspec（接线在 return 前）')
  assert(!existsSync(join(rt, 'execute-runs', 'exec-early')), '无 meta 早退路径仍删有戳 execute-run')
}

// ─────────────────────────────────────────
// 6. friction tally 随变更归档回收（friction-signal-hint FR-05）
// ─────────────────────────────────────────
console.log('\n--- 6. friction-tally 回收与零误伤 ---')
{
  const rt = makeRt()
  const mine = '2026-09-11-friction-mine'
  const other = '2026-09-11-friction-other'
  write(join(rt, `friction-tally-${mine}.json`), { events: { gate_rollback: { count: 2 } }, history: [] })
  write(join(rt, `friction-tally-${other}.json`), { events: {}, history: [] })

  const r = pruneArchivedChangeRuntime(rt, mine)
  assert(r.ok === true, 'prune 返回 ok:true')
  assert(!existsSync(join(rt, `friction-tally-${mine}.json`)), '本变更 friction-tally 已删')
  assert(existsSync(join(rt, `friction-tally-${other}.json`)), '他变更 friction-tally 保留')
}

// 短名 change 不误伤日期前缀长名（与 apply-pathspec 同款后缀陷阱）
{
  const rt = makeRt()
  write(join(rt, 'friction-tally-login.json'), { events: {}, history: [] })
  write(join(rt, 'friction-tally-2026-08-01-login.json'), { events: {}, history: [] })

  pruneArchivedChangeRuntime(rt, 'login')
  assert(!existsSync(join(rt, 'friction-tally-login.json')), '短名 friction-tally 已删')
  assert(existsSync(join(rt, 'friction-tally-2026-08-01-login.json')), '长名 friction-tally 保留（精确文件名，非后缀匹配）')
}

try { rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* OS 清 */ }

if (failures > 0) {
  console.error(`\n[archive-runtime-prune] ❌ ${failures} 项失败`)
  process.exit(1)
}
console.log('\n[archive-runtime-prune] ✅ 全部通过')
