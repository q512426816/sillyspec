/**
 * 原子抢占式建变更测试（2026-10-13-autocreate-atomic-claim）。
 *
 * 背景：run brainstorm / run auto 无 --change 的自动建名此前「listChanges 查零活跃 →
 * initChange 插行」两步非原子，并行进程同过检查各建一行（2026-10-13-new-change-e5a27813
 * 幽灵变更事故源头）。覆盖矩阵：
 *   FR-01  零活跃抢占成功（行+stages+目录）/ 已有活跃拒绝附清单 / 同名拒绝不改写
 *   FR-02  CLI 裸 run brainstorm 于有活跃项目 exit 2 且列名
 *   FR-03  败者零残留（无目录、无行）
 *   FR-04  initChange 显式路径语义不变（重名跳过插入、目录先建仍可重入）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'

import { ProgressManager } from '../src/progress.js'

const TEST_ROOT = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(TEST_ROOT, '..')

function createTempProject() {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-ifnoactive-'))
  mkdirSync(join(cwd, '.sillyspec', '.runtime'), { recursive: true })
  mkdirSync(join(cwd, '.sillyspec', 'changes'), { recursive: true })
  return cwd
}

async function cleanupProject(cwd) {
  try {
    const key = join(cwd, '.sillyspec', '.runtime', 'sillyspec.db')
    const db = ProgressManager._dbPool.get(key)
    if (db) { try { db.close() } catch {} ProgressManager._dbPool.delete(key) }
  } catch { /* 池里无实例则无需处理 */ }
  try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 句柄竞态容忍 */ }
}

function dbRows(cwd, sql, ...params) {
  const db = new DatabaseSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'), { readOnly: true })
  try { return db.prepare(sql).all(...params) } finally { db.close() }
}

test('FR-01: 零活跃抢占成功（行 + stages + 目录 + 返回 progress）', async (t) => {
  const cwd = createTempProject()
  t.after(() => cleanupProject(cwd))
  const pm = new ProgressManager()
  await pm.init(cwd)
  const r = pm.initChangeIfNoActive(cwd, '2026-10-13-claim-a', { title: '抢占标题' })
  assert.equal(r.created, true, '零活跃抢占成功')
  assert.ok(r.progress, '返回 progress（形态与 initChange 一致）')
  const row = dbRows(cwd, 'SELECT current_stage, status, title FROM changes WHERE name = ?', '2026-10-13-claim-a')[0]
  assert.equal(row.status, 'active', 'DB 行 status=active')
  assert.equal(row.current_stage, 'brainstorm', '出生阶段 brainstorm')
  assert.equal(row.title, '抢占标题', 'meta.title 透传')
  const stages = dbRows(cwd, 'SELECT COUNT(*) AS n FROM stages s JOIN changes c ON s.change_id = c.id WHERE c.name = ?', '2026-10-13-claim-a')[0]
  assert.ok(stages.n > 0, 'stages 已种行')
  assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', '2026-10-13-claim-a')), '抢占成功后目录已建')
})

test('FR-01/FR-03: 已有活跃拒绝 + 败者零残留', async (t) => {
  const cwd = createTempProject()
  t.after(() => cleanupProject(cwd))
  const pm = new ProgressManager()
  await pm.init(cwd)
  pm.initChange(cwd, '2026-10-13-holder')

  const r = pm.initChangeIfNoActive(cwd, '2026-10-13-loser')
  assert.equal(r.created, false, '有活跃时拒绝')
  assert.equal(r.reason, 'active_exists', '拒绝原因带 active_exists')
  assert.deepEqual(r.activeChanges, ['2026-10-13-holder'], '附活跃变更清单')
  assert.equal(dbRows(cwd, 'SELECT id FROM changes WHERE name = ?', '2026-10-13-loser').length, 0, '败者零 DB 行')
  assert.ok(!existsSync(join(cwd, '.sillyspec', 'changes', '2026-10-13-loser')), '败者零目录残留')
})

test('FR-01: 同名行已存在（任意 status）拒绝且不改写', async (t) => {
  const cwd = createTempProject()
  t.after(() => cleanupProject(cwd))
  const pm = new ProgressManager()
  await pm.init(cwd)
  pm.initChange(cwd, '2026-10-13-same')
  pm.unregisterChange(cwd, '2026-10-13-same') // 翻 archived（保持零活跃）

  const r = pm.initChangeIfNoActive(cwd, '2026-10-13-same')
  assert.equal(r.created, false, '同名拒绝')
  assert.equal(r.reason, 'name_exists', '拒绝原因 name_exists')
  const row = dbRows(cwd, 'SELECT status FROM changes WHERE name = ?', '2026-10-13-same')[0]
  assert.equal(row.status, 'archived', '既有行状态不被改写')
})

test('FR-02: CLI 裸 run brainstorm 于多活跃项目 exit 2 且列名（单活跃由上游 pm.read 自动定位，不进本分支）', async (t) => {
  const cwd = createTempProject()
  t.after(() => cleanupProject(cwd))
  const pm = new ProgressManager()
  await pm.init(cwd)
  pm.initChange(cwd, '2026-10-13-active-one')
  pm.initChange(cwd, '2026-10-13-active-two')

  const r = spawnSync(
    process.execPath,
    [join(REPO_ROOT, 'bin', 'sillyspec.js'), 'run', 'brainstorm', '--input', '动机\n\n成功标准：\n- 标准 A'],
    { cwd, encoding: 'utf8', timeout: 120_000 },
  )
  assert.equal(r.status, 2, `退出码 2（实得 ${r.status}）`)
  const out = `${r.stderr || ''}${r.stdout || ''}`
  assert.match(out, /已存在 2 个活跃变更/, '引导文案带活跃计数')
  assert.match(out, /2026-10-13-active-one/, '引导文案列出活跃变更名')
  assert.equal(dbRows(cwd, "SELECT id FROM changes WHERE name LIKE '%new-change%'").length, 0, '未产生自动命名变更')
})

test('FR-04: initChange 显式路径语义不变（重名跳过插入、目录先建可重入）', async (t) => {
  const cwd = createTempProject()
  t.after(() => cleanupProject(cwd))
  const pm = new ProgressManager()
  await pm.init(cwd)
  // 重名重入：二次 initChange 同名不报错、不重复插行
  pm.initChange(cwd, '2026-10-13-explicit')
  pm.initChange(cwd, '2026-10-13-explicit')
  assert.equal(dbRows(cwd, 'SELECT id FROM changes WHERE name = ?', '2026-10-13-explicit').length, 1, '重名跳过插入（单行）')
  assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', '2026-10-13-explicit')), '显式路径目录照建')
})
