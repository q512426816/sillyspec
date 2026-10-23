/**
 * rename 删除台账墓碑测试（2026-10-23-rename-platform-tombstone）。
 *
 * 事故背景：multi-agent-platform 仓 2026-10-23-new-change-43a74c51 幽灵变更——裸跑
 * run brainstorm 自动建名 16 秒后被 change-rename 改名，平台按 change_key 建键而
 * renameChange 只改本地库行名+目录，平台旧名行无终态凭证永挂 active（坑9 幽灵家族
 * 第三变种：坑9 修物理删除失源、坑10 修并发双建，均不覆盖 rename）。覆盖矩阵：
 *   FR-01  renameChange 成功后旧名落台账 status='deleted'（含目录缺失分支）
 *   FR-02  rename 后旧名 sync 走台账墓碑分支合成 POST（deleted + current_stage=archive）
 *   FR-03  rename 未实际发生（旧名缺失/新名冲突）不落台账
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

import { lookupDeletedLedger } from '../src/deleted-ledger.js'
import { ProgressManager } from '../src/progress.js'
import { SyncManager } from '../src/sync.js'

const TEST_ROOT = dirname(fileURLToPath(import.meta.url))

// ── fixture（套件级 TEMP/HOME 隔离由 run-tests.mjs 统一提供）──

function createTempProject(sub) {
  const cwd = mkdtempSync(join(tmpdir(), `sillyspec-rename-tomb-${sub}-`))
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

function readLedgerLines(cwd) {
  const p = join(cwd, '.sillyspec', '.runtime', 'state', 'deleted-changes.jsonl')
  if (!existsSync(p)) return []
  return readFileSync(p, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
}

function dbRow(cwd, name) {
  const db = new DatabaseSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'), { readOnly: true })
  try {
    return db.prepare('SELECT name, status FROM changes WHERE name = ?').get(name)
  } finally { db.close() }
}

// ── mock 平台（deleted-ledger.test.mjs 同款：本地 http server 记录 progress POST）──

const posts = []
const server = http.createServer((req, res) => {
  if (/\/api\/changes\/[^/]+\/progress$/.test(req.url) && req.method === 'POST') {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      let parsed = null
      try { parsed = JSON.parse(body) } catch { /* 保留 null */ }
      posts.push({ url: req.url, body: parsed })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, last_pushed_at: new Date().toISOString() }))
    })
    return
  }
  res.writeHead(404); res.end()
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const mockUrl = `http://127.0.0.1:${server.address().port}`

function makePlatformCwd(sub) {
  const cwd = createTempProject(sub)
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `platform:\n  url: ${mockUrl}\n  token: tok\n`, 'utf8')
  return cwd
}

async function setupChange(cwd, name) {
  const pm = new ProgressManager()
  await pm.init(cwd)
  pm.initChange(cwd, name)
  return pm
}

test('FR-01: renameChange 成功后旧名落 deleted 台账（含目录缺失分支）', async (t) => {
  const cwd = createTempProject('fr1')
  t.after(() => cleanupProject(cwd))
  const pm = await setupChange(cwd, '2026-10-23-old-name')

  pm.renameChange(cwd, '2026-10-23-old-name', '2026-10-23-new-name')

  const entry = lookupDeletedLedger(join(cwd, '.sillyspec'), '2026-10-23-old-name')
  assert.ok(entry, '台账可查到旧名条目')
  assert.equal(entry.status, 'deleted', '旧名终态凭证为 deleted')
  assert.ok(entry.at, '台账条目带 ISO 时间戳')
  assert.equal(dbRow(cwd, '2026-10-23-old-name'), undefined, '旧名 DB 行已不存在')
  const row = dbRow(cwd, '2026-10-23-new-name')
  assert.equal(row && row.status, 'active', '新名行 active（rename 非 delete）')
  assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', '2026-10-23-new-name')), '目录已搬至新名')

  // 目录缺失分支：DB 行在、目录被外部清掉，rename 仍成功且照常落账
  const pm2 = await setupChange(cwd, '2026-10-23-dirless')
  rmSync(join(cwd, '.sillyspec', 'changes', '2026-10-23-dirless'), { recursive: true, force: true })
  pm2.renameChange(cwd, '2026-10-23-dirless', '2026-10-23-dirless2')
  const entry2 = lookupDeletedLedger(join(cwd, '.sillyspec'), '2026-10-23-dirless')
  assert.ok(entry2 && entry2.status === 'deleted', '目录缺失分支同样落账（目录有无不影响终态凭证）')
})

test('FR-02: rename 后旧名 sync 合成 deleted 墓碑 POST', async (t) => {
  const cwd = makePlatformCwd('fr2')
  t.after(() => cleanupProject(cwd))
  const OLD = '2026-10-23-ghost-old'
  const pm = await setupChange(cwd, OLD)
  pm.renameChange(cwd, OLD, '2026-10-23-live-new')

  posts.length = 0
  const sm = new SyncManager(cwd)
  const r = await sm.sync(OLD, { manual: true })
  assert.deepEqual(r.errors, [], '台账墓碑分支返回零 errors（非假成功形态）')
  assert.equal(r.ledgerTombstone, 'pushed', '墓碑已推送')
  assert.equal(posts.length, 1, '恰一笔 progress POST')
  assert.ok(posts[0].url.endsWith(`/api/changes/${encodeURIComponent(OLD)}/progress`), 'POST 打到旧名端点')
  const first = posts[0].body.changes[0]
  assert.equal(first.status, 'deleted', '载荷携带 deleted 终态')
  assert.equal(first.current_stage, 'archive', '合成载荷 current_stage=archive')
})

test('FR-03: rename 失败路径不落台账', async (t) => {
  const cwd = createTempProject('fr3')
  t.after(() => cleanupProject(cwd))
  const pm = await setupChange(cwd, '2026-10-23-keep-a')
  pm.initChange(cwd, '2026-10-23-keep-b')

  // 旧名缺失
  pm.renameChange(cwd, '2026-10-23-nonexistent', '2026-10-23-any')
  // 新名冲突
  pm.renameChange(cwd, '2026-10-23-keep-a', '2026-10-23-keep-b')

  const lines = readLedgerLines(cwd)
  assert.equal(lines.length, 0, `失败路径零台账条目（实得 ${JSON.stringify(lines)}）`)
  assert.ok(dbRow(cwd, '2026-10-23-keep-a'), '冲突败者原名原行保持')
})

// mock 平台生命周期挂 after() 钩子（同 deleted-ledger.test.mjs：避免模块尾 close 抢跑）
after(async () => {
  server.closeAllConnections?.()
  await new Promise((r) => server.close(r))
})
