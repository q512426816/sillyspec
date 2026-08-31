/**
 * change-delete 命令测试（2026-08-30 用户反馈①）
 *
 * 背景：此前删除靠 git rm + 借道 doctor --cleanup-ghosts，且幽灵清理把删除行写成
 * archived——DB 无法区分「归档」与「删除」，事后审计只能回溯 git。change-delete 提供
 * 一等删除路径：status='deleted'（与 archived 语义分离）+ 移目录 + worktree 清理 +
 * git 暂存 + 平台墓碑上行；两段式（默认 dry-run，--confirm 才写）。
 *
 * 覆盖矩阵：
 *   dry-run          零写入（status 不动、目录完好）
 *   confirm 全量     active 行 → deleted（非 archived！）；目录移除；审计落盘
 *   confirm 幽灵行   active 无目录 → 仅翻 deleted（取代 git rm 后借道幽灵清理）
 *   confirm 孤儿目录 无 DB 行 → 仅删目录，不凭空建行
 *   双缺失           → 拒绝（ok:false）
 *   archived 行      → 拒绝（归档历史不适用 change-delete）
 *   deleted+残留目录 → --confirm 清残留目录（幂等）
 *   deleted+无目录   → 拒绝重复删除
 *   路径穿越名        → 拒绝（assertSafeChangeName）
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { DatabaseSync } from 'node:sqlite'

const DAY_MS = 24 * 60 * 60 * 1000

function createTempProject() {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-change-delete-'))
  mkdirSync(join(cwd, '.sillyspec', '.runtime'), { recursive: true })
  mkdirSync(join(cwd, '.sillyspec', 'changes'), { recursive: true })
  return cwd
}

// 收尾：先关 ProgressManager 静态池里该路径的连接（Windows 下打开的 SQLite 句柄锁文件，
// 直接 rmSync 必 EPERM），删除失败仍兜底吞错（断言已过，清理失败不该红）
async function cleanupProject(cwd) {
  try {
    const { ProgressManager } = await import('../src/progress.js')
    const key = join(cwd, '.sillyspec', '.runtime', 'sillyspec.db')
    const db = ProgressManager._dbPool.get(key)
    if (db) { try { db.close() } catch {} ProgressManager._dbPool.delete(key) }
  } catch { /* 池里无实例则无需处理 */ }
  try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 句柄竞态容忍 */ }
}

async function setupChange(cwd, changeName, { withDir = true, status = 'active', lastActive = null } = {}) {
  const { ProgressManager } = await import('../src/progress.js')
  const pm = new ProgressManager()
  await pm.init(cwd)
  await pm.initChange(cwd, changeName)
  if (withDir) {
    writeFileSync(join(cwd, '.sillyspec', 'changes', changeName, 'proposal.md'), '# x\n')
    writeFileSync(join(cwd, '.sillyspec', 'changes', changeName, 'tasks.md'), '- [ ] task-01: 任务 1\n')
  } else {
    rmSync(join(cwd, '.sillyspec', 'changes', changeName), { recursive: true, force: true })
  }
  if (status !== 'active' || lastActive) {
    const sqlDb = pm._ensureDB(cwd).getDb()
    if (status !== 'active') sqlDb.prepare('UPDATE changes SET status = ? WHERE name = ?').run(status, changeName)
    if (lastActive) sqlDb.prepare('UPDATE changes SET last_active = ? WHERE name = ?').run(lastActive, changeName)
  }
  return null
}

function readStatus(cwd, changeName) {
  const db = new DatabaseSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'), { readOnly: true })
  try {
    const row = db.prepare('SELECT status FROM changes WHERE name = ?').get(changeName)
    return row ? row.status : null
  } finally { db.close() }
}

test('dry-run：列出待删项但零写入（status 不动、目录完好）', async () => {
  const cwd = createTempProject()
  try {
    await setupChange(cwd, '2026-08-30-dryrun', { withDir: true })
    const { deleteChange } = await import('../src/change-delete.js')
    const r = await deleteChange({ cwd, changeName: '2026-08-30-dryrun', confirm: false })

    assert.equal(r.ok, true)
    assert.equal(r.action, 'dry_run')
    assert.equal(r.db_row.status, 'active')
    assert.equal(r.dir.files, 2, 'dry-run 报告目录文件数')
    assert.equal(readStatus(cwd, '2026-08-30-dryrun'), 'active', 'dry-run 零 DB 写入')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', '2026-08-30-dryrun', 'proposal.md')), 'dry-run 目录完好')
  } finally { await cleanupProject(cwd) }
})

test('confirm 全量：status=deleted（非 archived）+ 目录移除 + 审计落盘', async () => {
  const cwd = createTempProject()
  try {
    await setupChange(cwd, '2026-08-30-full', { withDir: true })
    const { deleteChange } = await import('../src/change-delete.js')
    const r = await deleteChange({ cwd, changeName: '2026-08-30-full', confirm: true })

    assert.equal(r.ok, true)
    assert.equal(r.action, 'deleted')
    assert.equal(r.db_updated, true)
    assert.equal(r.dir_removed, true)
    assert.equal(readStatus(cwd, '2026-08-30-full'), 'deleted', 'DB status=deleted（与 archived 语义分离——核心断言）')
    assert.ok(!existsSync(join(cwd, '.sillyspec', 'changes', '2026-08-30-full')), '目录已移除')
    const auditPath = join(cwd, '.sillyspec', '.runtime', 'audit.log')
    assert.ok(existsSync(auditPath), '审计日志落盘')
    const audit = readFileSync(auditPath, 'utf8')
    assert.ok(audit.includes('"action":"change-delete"') || audit.includes('"action": "change-delete"'), '审计条目 action=change-delete')
    assert.ok(audit.includes('2026-08-30-full'), '审计条目含变更名')
  } finally { await cleanupProject(cwd) }
})

test('confirm 幽灵行（active 无目录）：仅翻 deleted——取代 git rm 后借道幽灵清理的老路径', async () => {
  const cwd = createTempProject()
  try {
    await setupChange(cwd, '2026-08-30-ghost', { withDir: false })
    const { deleteChange } = await import('../src/change-delete.js')
    const r = await deleteChange({ cwd, changeName: '2026-08-30-ghost', confirm: true })

    assert.equal(r.ok, true)
    assert.equal(r.db_updated, true)
    assert.equal(readStatus(cwd, '2026-08-30-ghost'), 'deleted', '幽灵行翻 deleted（不走 archived）')
  } finally { await cleanupProject(cwd) }
})

test('confirm 孤儿目录（无 DB 行）：仅删目录，不凭空建行', async () => {
  const cwd = createTempProject()
  try {
    await setupChange(cwd, '2026-08-30-orphan', { withDir: true })
    // 删 DB 行留目录 → 孤儿目录形态
    const db = new DatabaseSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'))
    db.prepare('DELETE FROM changes WHERE name = ?').run('2026-08-30-orphan')
    db.close()

    const { deleteChange } = await import('../src/change-delete.js')
    const r = await deleteChange({ cwd, changeName: '2026-08-30-orphan', confirm: true })

    assert.equal(r.ok, true)
    assert.equal(r.db_updated, false)
    assert.equal(r.dir_removed, true)
    assert.ok(!existsSync(join(cwd, '.sillyspec', 'changes', '2026-08-30-orphan')), '孤儿目录已移除')
    assert.equal(readStatus(cwd, '2026-08-30-orphan'), null, '不凭空建 DB 行')
  } finally { await cleanupProject(cwd) }
})

test('双缺失（无行无目录）→ 拒绝', async () => {
  const cwd = createTempProject()
  try {
    const { deleteChange } = await import('../src/change-delete.js')
    const r = await deleteChange({ cwd, changeName: 'no-such-change', confirm: true })
    assert.equal(r.ok, false)
    assert.ok(r.reason.includes('不存在'))
  } finally { await cleanupProject(cwd) }
})

test('archived 行 → 拒绝（归档历史不适用 change-delete，不改状态）', async () => {
  const cwd = createTempProject()
  try {
    await setupChange(cwd, '2026-08-30-archived', { withDir: true, status: 'archived' })
    const { deleteChange } = await import('../src/change-delete.js')
    const r = await deleteChange({ cwd, changeName: '2026-08-30-archived', confirm: true })

    assert.equal(r.ok, false)
    assert.ok(r.reason.includes('archived'))
    assert.equal(readStatus(cwd, '2026-08-30-archived'), 'archived', '归档态不被改写')
    assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', '2026-08-30-archived')), '目录不被误删')
  } finally { await cleanupProject(cwd) }
})

test('deleted + 残留目录 → --confirm 清残留（幂等）；deleted + 无目录 → 拒绝重复删除', async () => {
  const cwd = createTempProject()
  try {
    await setupChange(cwd, '2026-08-30-redelete', { withDir: true, status: 'deleted' })
    const { deleteChange } = await import('../src/change-delete.js')

    const dry = await deleteChange({ cwd, changeName: '2026-08-30-redelete', confirm: false })
    assert.equal(dry.ok, true)
    assert.equal(dry.already_deleted, true, 'dry-run 标注 already_deleted（残留清理语义）')

    const r = await deleteChange({ cwd, changeName: '2026-08-30-redelete', confirm: true })
    assert.equal(r.ok, true)
    assert.equal(r.db_updated, false, '已是 deleted 不重复写')
    assert.equal(r.dir_removed, true, '残留目录被清理')
    assert.equal(readStatus(cwd, '2026-08-30-redelete'), 'deleted')

    const again = await deleteChange({ cwd, changeName: '2026-08-30-redelete', confirm: true })
    assert.equal(again.ok, false, '无残留后重复删除被拒绝')
  } finally { await cleanupProject(cwd) }
})

test('路径穿越名 → 拒绝（assertSafeChangeName 前置）', async () => {
  const cwd = createTempProject()
  try {
    const { deleteChange } = await import('../src/change-delete.js')
    const r = await deleteChange({ cwd, changeName: '../evil', confirm: true })
    assert.equal(r.ok, false)
    assert.ok(r.reason.includes('路径穿越') || r.reason.includes('禁止'))
    assert.ok(!existsSync(join(cwd, 'evil')), '未逃出 changes/ 目录')
  } finally { await cleanupProject(cwd) }
})
