/**
 * 安全包五项修复回归（2026-09-11 全仓审查安全包）。
 *
 * 锁行为：
 *  1. worktree-guard 白名单收口：git branch -d/-D/-m/-M/-f（含长形）不再整类只读放行、
 *     进危险表；git worktree 仅 list 放行（remove/prune 进危险表），拦截原因带官方替代路径指引
 *  2. hasUnappliedChanges 无 meta → 保守 true（主断言在 worktree-has-unapplied-changes.test.mjs ⑩，
 *     此处锁 cleanup 不带 --force 拒绝）
 *  3. updateStep id 查找收进同一事务（不存在步骤报错回退；正常完成路径不回归）
 *  4. zh-CN/ISO 混存时 getLatestActivityAt 按解析时间取最新（字符串 MAX 恒取 zh-CN 的缺陷）
 *  5. checkApproval 意外异常 → {status:'unknown'}（不再折叠 null 静默放行）；平台模式 null 不变
 */
import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { shouldBlock } from '../src/hooks/worktree-guard.js'
import { checkApproval } from '../src/run/shared.js'
import { makeRepo, initChange, seedStage, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'
import { DB } from '../src/db.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert2 = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

// ── guard fixture（与 worktree-guard.test.mjs 同款：temp repo + sillyspec.db 种阶段）──
const gRoot = join(tmpdir(), `sillyspec-sec-guard-${Date.now()}`)
const gRuntime = join(gRoot, '.sillyspec', '.runtime')
mkdirSync(gRuntime, { recursive: true })
function setStage(stage) {
  const db = new DB(join(gRuntime, 'sillyspec.db'))
  db.init()
  const sq = db.getDb()
  sq.prepare("INSERT OR IGNORE INTO project (id,name,created_at,updated_at) VALUES (1,'p','t','t')").run()
  sq.prepare('DELETE FROM changes').run()
  sq.prepare("INSERT INTO changes (name,current_stage,status,no_worktree,created_at,last_active) VALUES ('2026-09-11-sec',?,'active',0,'t','t')").run(stage)
  db.close()
}
const bash = (cmd) => shouldBlock({ tool: 'Bash', command: cmd, cwd: gRoot })

console.log('=== ① guard 白名单收口 ===')
console.log('--- ①a 危险形态在 quick/execute 阶段被拦（危险表新条目）---')
for (const stage of ['quick', 'execute']) {
  setStage(stage)
  const r1 = bash('git branch -D sillyspec/2026-09-11-x')
  assert2(r1.blocked && /branch/.test(r1.reason) && /task review/.test(r1.reason),
    `${stage}: git branch -D 拦截 + 指引（reason: ${JSON.stringify((r1.reason || '').slice(0, 80))}）`)
  const r2 = bash('git branch --delete main')
  assert2(r2.blocked, `${stage}: git branch --delete 长形同拦`)
  const r3 = bash('git worktree remove --force /tmp/wt-x')
  assert2(r3.blocked && /worktree cleanup/.test(r3.reason),
    `${stage}: git worktree remove 拦截 + 指引`)
  const r4 = bash('git worktree prune')
  assert2(r4.blocked, `${stage}: git worktree prune 拦截`)
}
console.log('--- ①b 只读形态仍放行（不误杀）---')
{
  setStage('execute')
  for (const cmd of ['git branch', 'git branch -a', 'git branch --show-current', 'git branch new-branch-name',
    'git worktree list', 'git worktree list --porcelain', 'git status', 'git log --oneline -3', 'git stash list']) {
    assert2(bash(cmd).blocked === false, `${cmd} 放行`)
  }
}
console.log('--- ①c 非 execute/quick 阶段：破坏形态不在只读白名单 → 拦 ---')
{
  setStage('brainstorm')
  assert2(bash('git branch -D x').blocked === true, 'brainstorm: git branch -D 拦（不再整类只读放行）')
  assert2(bash('git worktree remove /tmp/x').blocked === true, 'brainstorm: git worktree remove 拦')
  assert2(bash('git branch -a').blocked === false, 'brainstorm: git branch -a 仍放行（只读白名单细化命中）')
}
rmSync(gRoot, { recursive: true, force: true })

console.log('\n=== ② cleanup 无 meta 不带 --force 拒绝（fail-closed）===')
{
  const { cwd } = makeRepo('sec-cleanup-')
  const { WorktreeManager } = await import('../src/worktree.js')
  const wm = new WorktreeManager({ cwd })
  // 无 meta 但 metaDir 在（幽灵残留形态）——cleanup 应 blocked 而非 force-remove
  mkdirSync(join(wm.worktreeBase, 'ghost-change'), { recursive: true })
  const r = wm.cleanup('ghost-change')
  assert2(r.result === 'blocked', `无 meta 幽灵被护栏拦（实际 ${r.result}）`)
  const r2 = wm.cleanup('ghost-change', { force: true })
  assert2(r2.result === 'force-cleaned' || r2.result === 'cleaned', `显式 --force 仍可清（实际 ${r2.result}）`)
}

console.log('\n=== ③ updateStep 事务收口 ===')
{
  const { cwd, specBase } = makeRepo('sec-updstep-')
  const cn = '2026-09-11-sec-upd'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'verify', [
    { name: 'step-a', status: 'pending' },
    { name: 'step-b', status: 'pending' },
  ])
  // 不存在步骤：报错回退（不抛、不改库）
  const log = []
  const ol = console.log; console.log = (...a) => log.push(a.join(' '))
  try { pm.updateStep(cwd, 'verify', 'no-such-step', { status: 'completed' }, cn) } finally { console.log = ol }
  assert2(log.some(l => l.includes('步骤不存在')), `不存在步骤报错（${log[0]}）`)
  // 正常完成路径
  pm.updateStep(cwd, 'verify', 'step-a', { status: 'completed' }, cn)
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert2(after.stages.verify.steps[0].status === 'completed', 'step-a 完成生效')
  assert2(after.stages.verify.steps[1].status === 'pending', 'step-b 不动')
}

console.log('\n=== ④ getLatestActivityAt 混存时间戳按解析取最新 ===')
{
  const { cwd, specBase } = makeRepo('sec-latest-')
  const cn = '2026-09-11-sec-latest'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'verify', [{ name: 'step-a', status: 'completed' }])
  // 直写 DB：stages.completed_at = 存量 zh-CN（旧，2026/9/1）；steps.completed_at = 新 ISO
  const db = pm._ensureDB(cwd); const sq = db.getDb()
  const chId = sq.prepare('SELECT id FROM changes WHERE name = ?').get(cn).id
  sq.prepare(`UPDATE stages SET completed_at = '2026/9/1 10:00:00' WHERE change_id = ?`).run(chId)
  sq.prepare(`UPDATE steps SET completed_at = '2026-09-11T02:00:00.000Z' WHERE stage_id IN (SELECT id FROM stages WHERE change_id = ?)`).run(chId)
  const latest = pm.getLatestActivityAt(cwd, cn)
  // 旧缺陷：SQL 字符串 MAX 返回 '2026/9/1 10:00:00'（'/'>'-'）→ 时近性闸判「8 天前」→ 活跃变更被误归档
  assert2(latest === '2026-09-11T02:00:00.000Z', `解析侧取最新 ISO（实际 ${latest}）`)
}

console.log('\n=== ⑤ checkApproval 异常 → unknown ===')
{
  // 平台模式 null（有意跳过）不变
  const platformNull = await checkApproval('/nonexistent-cwd-x', 'c1', { specRoot: 'C:/definitely/not/a/real/spec-root' })
  assert2(platformNull === null, '平台模式仍返回 null（有意跳过语义）')
  // 注入抛错的 loader → unknown（不再折叠 null 静默放行）
  const r = await checkApproval('/nonexistent-cwd-x', 'c1', {}, { loadSyncMod: async () => { throw new Error('boom-import') } })
  assert2(r && r.status === 'unknown' && /boom-import/.test(r.reason || ''), `意外异常走 unknown（实际 ${JSON.stringify(r)}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
