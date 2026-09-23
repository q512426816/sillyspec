/**
 * spec-sync-terminal-sweep.test.mjs — 归档终态补推扫描（2026-09-23 quick ql-20260923-007）
 *
 * 背景（2026-09-22 session-fork-continuation 实证）：终态推送依赖归档后还有一轮
 * triggerSync——bg 子进程 best-effort，最后一轮被吞（spawn 失败/会话戛然而止）后本地
 * 已归档而平台镜像停在旧阶段，此后再无命令碰该变更即永久滞后。collectTerminalSyncPending
 * 按 DB 脏度谓词（last_local_modified_ts > last_synced_platform_ts，或从未同步）找出
 * 待补推变更，bg 子进程主轮收尾后顺带补推（sync 对 archived/deleted 推终态+墓碑，幂等）。
 *
 * 覆盖面（真 sqlite fixture 于 tmpdir，零网络零真仓）：
 *   ① 谓词：archived+脏 → pending；archived+干净 → 不入；active+脏 → 不入（状态过滤）；
 *      deleted+从未同步 → pending；
 *   ② 排序与上限：多缺位按 last_active 倒序取前 3（TERMINAL_SWEEP_MAX）；
 *   ③ DB 缺失（无 .sillyspec）→ 空集不创建库；
 *   ④ 库发现：cwd 在 spec 根子目录仍向上解析到同库（与 sync() 内 ProgressManager 同源，
 *      bg 子进程 cwd 变体场景）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectTerminalSyncPending, TERMINAL_SWEEP_MAX } from '../src/run/bg-sync.js'
import { ProgressManager } from '../src/progress.js'

const rm = (p) => rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })

/** 关静态连接池再删目录（Windows sqlite 句柄未关 → rmSync EPERM）。 */
function closePooledAndRm(p) {
  for (const db of ProgressManager._dbPool.values()) { try { db.close() } catch { /* 已关/损坏忽略 */ } }
  ProgressManager._dbPool.clear()
  rm(p)
}

/** 建带库 fixture，返回 { root, insert }——insert(name, status, lastActive, synced, local)。
 *  specDir 语义 = .sillyspec 目录本身（ProgressManager 构造约定），库落
 *  root/.sillyspec/.runtime/sillyspec.db——与 resolveSpecDir 向上发现的真实结构一致。 */
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'term-sweep-'))
  const pm = new ProgressManager({ specDir: join(root, '.sillyspec') })
  const db = pm._ensureDB(root).getDb()
  const insert = db.prepare(
    `INSERT INTO changes (name, status, last_active, created_at, last_synced_platform_ts, last_local_modified_ts)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  return { root, insert }
}

test('collectTerminalSyncPending 谓词面：archived/deleted 终态脏于镜像才入列', async () => {
  const { root, insert } = makeFixture()
  try {
    insert.run('chg-arch-dirty', 'archived', '2026-09-22T20:22:00Z', '2026-09-22T10:00:00Z', '2026-09-22T20:20:00Z', '2026-09-22T20:22:00Z')
    insert.run('chg-arch-clean', 'archived', '2026-09-22T19:00:00Z', '2026-09-22T10:00:00Z', '2026-09-22T20:30:00Z', '2026-09-22T19:00:00Z')
    insert.run('chg-active-dirty', 'active', '2026-09-22T21:00:00Z', '2026-09-22T10:00:00Z', '2026-09-22T20:00:00Z', '2026-09-22T21:00:00Z')
    insert.run('chg-del-neversynced', 'deleted', '2026-09-22T18:00:00Z', '2026-09-22T10:00:00Z', null, '2026-09-22T18:00:00Z')
    insert.run('chg-arch-nolocal', 'archived', '2026-09-22T17:00:00Z', '2026-09-22T10:00:00Z', null, null)
    const pending = await collectTerminalSyncPending(root, {})
    assert.ok(pending.includes('chg-arch-dirty'), '归档+终态脏 → 补推')
    assert.ok(pending.includes('chg-del-neversynced'), '删除+从未同步 → 补推')
    assert.equal(pending.includes('chg-arch-clean'), false, '镜像已覆盖 → 不补')
    assert.equal(pending.includes('chg-active-dirty'), false, '非终态不扫（active 留给常规推送）')
    assert.equal(pending.includes('chg-arch-nolocal'), false, '从未同步且无脏度戳 → 无从判滞后，不补（fail-closed）')
  } finally { closePooledAndRm(root) }
})

test('collectTerminalSyncPending 上限与排序：last_active 倒序取前 TERMINAL_SWEEP_MAX', async () => {
  const { root, insert } = makeFixture()
  try {
    for (let i = 0; i < TERMINAL_SWEEP_MAX + 2; i++) {
      insert.run(`chg-pending-${i}`, 'archived', `2026-09-22T2${i}:00:00Z`, '2026-09-22T10:00:00Z', '2026-09-22T10:00:00Z', '2026-09-22T2${i}:00:30Z')
    }
    const pending = await collectTerminalSyncPending(root, {})
    assert.equal(pending.length, TERMINAL_SWEEP_MAX, `上限 ${TERMINAL_SWEEP_MAX} 条防风暴`)
    assert.deepEqual(pending, ['chg-pending-4', 'chg-pending-3', 'chg-pending-2'], 'last_active 倒序（最新缺位优先）')
  } finally { closePooledAndRm(root) }
})

test('collectTerminalSyncPending DB 缺失：空集不创建库（无 .sillyspec 环境）', async () => {
  const root = mkdtempSync(join(tmpdir(), 'term-sweep-nodb-'))
  try {
    const pending = await collectTerminalSyncPending(root, {})
    assert.deepEqual(pending, [])
  } finally { closePooledAndRm(root) }
})

test('collectTerminalSyncPending 库发现：cwd 在 spec 根子目录仍解析到同库（与 sync() 同源）', async () => {
  const { root, insert } = makeFixture()
  const subCwd = join(root, 'sub', 'project')
  mkdirSync(subCwd, { recursive: true })
  try {
    insert.run('chg-walkup', 'archived', '2026-09-22T20:22:00Z', '2026-09-22T10:00:00Z', null, '2026-09-22T20:22:00Z')
    const pending = await collectTerminalSyncPending(subCwd)
    assert.deepEqual(pending, ['chg-walkup'], '向上发现 .sillyspec（bg 子进程 cwd 变体场景）')
  } finally { closePooledAndRm(root) }
})
