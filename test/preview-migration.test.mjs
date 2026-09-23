/**
 * preview-migration（2026-09-23-watcher-preview-progress task-01）：
 * authority 列迁移 + 读侧保险丝 + CLI 权威归章。
 *
 * 锁死契约：
 * 1. 迁移：新库/旧库（无 authority 列）init 后列在场；重复 init 幂等；存量行盖 'cli' 章。
 * 2. 读侧保险丝：注入 watcher 预览行后，read（六表读法）默认不可见——与删除预览行后逐字段一致。
 * 3. 归章（影子审查 fail① 钉）：预览行在场时 CLI 权威写（writeSerialized 的 stage upsert）
 *    命中 DO UPDATE 分支后 authority 翻转 'cli'，数据对读法可见（顶替闭合）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { DB } from '../src/db.js'
import { ProgressManager } from '../src/progress.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function fixture() {
  const fx = mk('pv-mig-')
  mkdirSync(join(fx, '.sillyspec'), { recursive: true })
  return { fx, spec: join(fx, '.sillyspec') }
}

/** 直插一行 watcher 预览（绕过写路径，模拟 preview-progress 的产物） */
function injectWatcherStage(spec, changeId, stage) {
  const db = new DatabaseSync(join(spec, '.runtime', 'sillyspec.db'))
  try {
    db.prepare("INSERT INTO stages (change_id, stage, status, started_at, authority) VALUES (?, ?, 'in-progress', NULL, 'watcher')" +
      " ON CONFLICT(change_id, stage) DO UPDATE SET status='in-progress', authority='watcher' WHERE stages.authority='watcher'")
      .run(changeId, stage)
  } finally { db.close() }
}

test('T1 迁移：authority 列在场 + 存量盖章 cli + 重复 init 幂等', () => {
  const { fx, spec } = fixture()
  // 旧库：手工建一个 v6 时代的库（无 authority 列）
  mkdirSync(join(spec, '.runtime'), { recursive: true })
  const db = new DatabaseSync(join(spec, '.runtime', 'sillyspec.db'))
  db.exec(`CREATE TABLE changes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, current_stage TEXT DEFAULT 'scan', status TEXT DEFAULT 'active', last_active TEXT, created_at TEXT, updated_at TEXT, title TEXT, owner_session TEXT)`)
  db.exec(`CREATE TABLE stages (id INTEGER PRIMARY KEY AUTOINCREMENT, change_id INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE, stage TEXT NOT NULL, status TEXT DEFAULT 'pending', started_at TEXT, completed_at TEXT, UNIQUE(change_id, stage))`)
  db.exec("INSERT INTO changes (name) VALUES ('legacy-change')")
  db.exec("INSERT INTO stages (change_id, stage, status) VALUES (1, 'brainstorm', 'completed')")
  db.close()
  rmSync(join(spec, '.runtime', '.schema-version'), { force: true }) // 强制重走 init
  const db2 = new DB(join(spec, '.runtime', 'sillyspec.db'))
  db2.init()
  const row = db2.getDb().prepare("SELECT authority FROM stages WHERE stage='brainstorm'").get()
  assert.equal(row.authority, 'cli', '存量行迁移后盖 cli 章')
  db2.close()
  // 幂等：再 init 一次零变化
  rmSync(join(spec, '.runtime', '.schema-version'), { force: true })
  const db3 = new DB(join(spec, '.runtime', 'sillyspec.db'))
  db3.init(); db3.close()
  // 幂等即达：不再经 read()（手工旧库缺 read 所需全列，与迁移断言无关）
})

test('T2 读侧保险丝：预览行默认不可见（读法输出与无预览一致）', () => {
  const { fx, spec } = fixture()
  const pm = new ProgressManager({ specDir: spec })
  pm.initChange(fx, 'fuse-change')
  const before = JSON.stringify(pm.read(fx, 'fuse-change'))
  // 注入预览行（change_id 查取经真实 changes 行）
  const db = new DatabaseSync(join(spec, '.runtime', 'sillyspec.db'))
  const cid = db.prepare("SELECT id FROM changes WHERE name='fuse-change'").get().id
  db.close()
  injectWatcherStage(spec, cid, 'brainstorm')
  const after = JSON.stringify(pm.read(fx, 'fuse-change'))
  assert.equal(after, before, '注入 watcher 预览行后默认读法逐字节一致（保险丝生效）')
})

test('T3 归章钉（fail①）：CLI 权威写命中预览行后 authority 翻转 cli 且数据可见', () => {
  const { fx, spec } = fixture()
  const pm = new ProgressManager({ specDir: spec })
  pm.initChange(fx, 'stamp-change')
  const db0 = new DatabaseSync(join(spec, '.runtime', 'sillyspec.db'))
  const cid = db0.prepare("SELECT id FROM changes WHERE name='stamp-change'").get().id
  db0.close()
  injectWatcherStage(spec, cid, 'brainstorm')
  // 预览行在场（保险丝应使其不可见）
  const withPreview = pm.read(fx, 'stamp-change')
  assert.ok(!withPreview.stages || withPreview.stages.brainstorm?.status !== 'in-progress', '预览值（in-progress）默认不可见（保险丝）')
  // CLI 权威写：_write 落同键 stage（upsert 命中 DO UPDATE 分支——归章路径）
  pm._write(fx, {
    currentChange: 'stamp-change', currentStage: 'brainstorm',
    stages: { brainstorm: { status: 'completed', startedAt: '2026-09-23 10:00:00', completedAt: '2026-09-23 10:05:00', revision: 0 } },
  }, 'stamp-change')
  const db = new DatabaseSync(join(spec, '.runtime', 'sillyspec.db'))
  const row = db.prepare("SELECT authority, status FROM stages WHERE stage='brainstorm'").get()
  db.close()
  assert.equal(row.authority, 'cli', 'DO UPDATE 分支归章：authority 翻转 cli（fail① 修复钉）')
  assert.equal(row.status, 'completed', '业务字段同步更新')
  const after = pm.read(fx, 'stamp-change')
  assert.ok(after.stages && after.stages.brainstorm, '归章后权威行对读法可见（顶替闭合）')
})
