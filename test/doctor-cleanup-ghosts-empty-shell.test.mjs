/**
 * cleanupGhostChanges SS-2b 空壳目录测试（2026-08-20）
 *
 * 背景：「active 行 + 目录存在但 0 文件」逃过 SS-2 的「无目录」判定（2026-08-15
 * 清理 57 个 active 时 6 个空壳漏网，只能手工 SQL 归档）。SS-2b 补空壳形态，
 * 但必须叠加 last_active > 7 天时间门槛——刚创建的合法变更目录本来就是空的
 * （brainstorm 首份产物 proposal.md 落盘前有空窗）。
 *
 * 覆盖矩阵：
 *   ghost-nodir   active 无目录                    → 幽灵（SS-2 原有形态，回归）
 *   shell-stale   active + 空目录 + last_active 8天 → 空壳，归档 + 移除空目录
 *   shell-fresh   active + 空目录 + last_active 刚刚 → 放过（时间门槛）
 *   shell-files   active + 有文件目录 + last_active 8天 → 放过（有内容不删）
 *   live          active + 有文件目录 + 最近        → 放过
 *
 * 安全断言：dry-run 全程零写入；confirm 只归档候选、不碰放过项；
 * 空壳归档后目录被移除、db 行 status='archived'。
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { DatabaseSync } from 'node:sqlite'

const DAY_MS = 24 * 60 * 60 * 1000

function createTempProject() {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-ghost-shell-'))
  mkdirSync(join(cwd, '.sillyspec', '.runtime'), { recursive: true })
  mkdirSync(join(cwd, '.sillyspec', 'changes'), { recursive: true })
  return cwd
}

async function setupFixture(cwd) {
  const { ProgressManager } = await import('../src/progress.js')
  const pm = new ProgressManager()
  pm.init(cwd)
  const names = ['ghost-nodir', 'shell-stale', 'shell-fresh', 'shell-files', 'live']
  for (const n of names) pm.initChange(cwd, n)
  // ghost-nodir：删目录 → db active 无目录（SS-2 原有幽灵形态）
  rmSync(join(cwd, '.sillyspec', 'changes', 'ghost-nodir'), { recursive: true, force: true })
  // 时间门槛素材：shell-stale / shell-files 的 last_active 拨回 8 天前
  const staleTs = new Date(Date.now() - 8 * DAY_MS).toISOString()
  const sqlDb = pm._ensureDB(cwd).getDb()
  for (const n of ['shell-stale', 'shell-files']) {
    sqlDb.prepare('UPDATE changes SET last_active = ? WHERE name = ?').run(staleTs, n)
  }
  // 有内容的目录：各放一个文件
  for (const n of ['shell-files', 'live']) {
    writeFileSync(join(cwd, '.sillyspec', 'changes', n, 'proposal.md'), '# x\n')
  }
  return { pm, names }
}

function readStatuses(cwd) {
  const db = new DatabaseSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'), { readOnly: true })
  try {
    const rows = db.prepare('SELECT name, status FROM changes').all()
    return Object.fromEntries(rows.map((r) => [r.name, r.status]))
  } finally {
    db.close()
  }
}

test('dry-run：空壳（超7天空目录）与无目录幽灵列出，fresh 空壳/有内容目录放过，零写入', async () => {
  const cwd = createTempProject()
  let pm
  try {
    ({ pm } = await setupFixture(cwd))
    pm._db.close()

    const { cleanupGhostChanges } = await import('../src/doctor-diagnostics.js')
    const r = await cleanupGhostChanges({ cwd, confirm: false })

    assert.equal(r.action, 'dry_run')
    assert.deepEqual(r.ghosts, ['ghost-nodir'], '无目录幽灵仅 ghost-nodir')
    assert.deepEqual(r.empty_shells, ['shell-stale'], '空壳仅 shell-stale（fresh 有时间门槛、files 有内容）')
    assert.equal(r.count, 2)
    // 零写入：目录与 db 状态原样
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', 'shell-stale')), 'dry-run 不删空壳目录')
    const st = readStatuses(cwd)
    for (const n of ['ghost-nodir', 'shell-stale', 'shell-fresh', 'shell-files', 'live']) {
      assert.equal(st[n], 'active', `dry-run 不改 ${n} 状态`)
    }
  } finally {
    try { if (pm && pm._db) pm._db.close() } catch { /* noop */ }
    try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 偶发 EPERM 不阻断 */ }
  }
})

test('confirm：幽灵+空壳归档，空壳目录移除；fresh 空壳/有内容目录原样保留', async () => {
  const cwd = createTempProject()
  let pm
  try {
    ({ pm } = await setupFixture(cwd))
    pm._db.close()

    const { cleanupGhostChanges } = await import('../src/doctor-diagnostics.js')
    const r = await cleanupGhostChanges({ cwd, confirm: true })

    assert.equal(r.action, 'archived')
    assert.deepEqual([...r.archived].sort(), ['ghost-nodir', 'shell-stale'])
    assert.deepEqual(r.removed_dirs, ['shell-stale'], '仅空壳目录被移除')
    assert.deepEqual(r.skipped_nonempty, [])
    // 空壳目录已移除；放过项目录原样
    assert.ok(!existsSync(join(cwd, '.sillyspec', 'changes', 'shell-stale')), '空壳目录已移除')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', 'shell-fresh')), 'fresh 空壳目录保留（时间门槛）')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', 'shell-files')), '有内容目录保留')
    // db：候选 archived，放过项仍 active
    const st = readStatuses(cwd)
    assert.equal(st['ghost-nodir'], 'archived')
    assert.equal(st['shell-stale'], 'archived')
    assert.equal(st['shell-fresh'], 'active')
    assert.equal(st['shell-files'], 'active')
    assert.equal(st['live'], 'active')
    assert.deepEqual(r.active_after.sort(), ['live', 'shell-files', 'shell-fresh'])
  } finally {
    try { if (pm && pm._db) pm._db.close() } catch { /* noop */ }
    try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 偶发 EPERM 不阻断 */ }
  }
})
