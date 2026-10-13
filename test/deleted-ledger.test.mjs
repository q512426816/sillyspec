/**
 * 删除台账 + 台账墓碑测试（2026-10-13-sync-ledger-tombstone）。
 *
 * 事故背景：multi-agent-platform 仓 2026-10-13-new-change-e5a27813 幽灵变更——DB 行被
 * 外部物理清除后 platform sync --change「变更无进度数据」空转且 CLI 假成功（exit 0），
 * 平台行永挂 in_progress/active。覆盖矩阵：
 *   FR-01  deleteChange / unregisterChange 落台账；台账路径不可写 fail-open 不阻断
 *   FR-02  行清除后 deleted / archived 终态补推墓碑；never-existed 不发墓碑
 *   FR-03  CLI platform sync --change 失败退出码 1
 *   FR-04  坏行容错、latest-wins、quick-* 豁免
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'

import { appendDeletedLedger, lookupDeletedLedger } from '../src/deleted-ledger.js'
import { ProgressManager } from '../src/progress.js'
import { SyncManager } from '../src/sync.js'

const TEST_ROOT = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(TEST_ROOT, '..')

// ── fixture（套件级 TEMP/HOME 隔离由 run-tests.mjs 统一提供）──

function createTempProject(sub) {
  const cwd = mkdtempSync(join(tmpdir(), `sillyspec-ledger-${sub}-`))
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

function ledgerPathOf(cwd) {
  return join(cwd, '.sillyspec', '.runtime', 'deleted-changes.jsonl')
}

function readLedgerLines(cwd) {
  return readFileSync(ledgerPathOf(cwd), 'utf8').split('\n').filter((l) => l.trim())
}

// 外部物理清行（事故形态复现：裸 SQL DELETE，行+目录全清）
function purgeChangeRow(cwd, changeName) {
  const db = new DatabaseSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'))
  try {
    db.prepare('DELETE FROM changes WHERE name = ?').run(changeName)
  } finally { db.close() }
  rmSync(join(cwd, '.sillyspec', 'changes', changeName), { recursive: true, force: true })
}

// ── mock 平台（hub09 同款：本地 http server 记录 progress POST）──

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

test('FR-01: deleteChange / unregisterChange 落台账（deleted / archived）', async (t) => {
  const cwd = createTempProject('fr1')
  t.after(() => cleanupProject(cwd))
  const pm = new ProgressManager()
  await pm.init(cwd)
  pm.initChange(cwd, '2026-10-13-x-del')
  pm.initChange(cwd, '2026-10-13-y-arc')
  pm.deleteChange(cwd, '2026-10-13-x-del')
  pm.unregisterChange(cwd, '2026-10-13-y-arc')

  const lines = readLedgerLines(cwd).map((l) => JSON.parse(l))
  const del = lines.find((l) => l.name === '2026-10-13-x-del')
  const arc = lines.find((l) => l.name === '2026-10-13-y-arc')
  assert.equal(del && del.status, 'deleted', 'deleteChange 落 deleted 台账行')
  assert.equal(arc && arc.status, 'archived', 'unregisterChange 落 archived 台账行')
  assert.ok(del.at && arc.at, '台账行带 ISO 时间戳')

  // DB 语义不变：行保留、status 即终态
  const db = new DatabaseSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'), { readOnly: true })
  try {
    const rows = db.prepare("SELECT name, status FROM changes WHERE name IN ('2026-10-13-x-del','2026-10-13-y-arc')").all()
    assert.deepEqual(
      rows.map((r) => `${r.name}:${r.status}`).sort(),
      ['2026-10-13-x-del:deleted', '2026-10-13-y-arc:archived'],
      'DB 行保留且 status 为终态（原语义不变）',
    )
  } finally { db.close() }
})

test('FR-01: 台账路径不可写 fail-open 不阻断删除主流程', async (t) => {
  const cwd = createTempProject('fr1-fo')
  t.after(() => cleanupProject(cwd))
  const pm = new ProgressManager()
  await pm.init(cwd)
  pm.initChange(cwd, '2026-10-13-fo-del')
  // 用同名目录占住台账路径（三平台一致的确定性写失败；Windows 目录 chmod 不可靠）
  mkdirSync(ledgerPathOf(cwd))
  pm.deleteChange(cwd, '2026-10-13-fo-del')

  const db = new DatabaseSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'), { readOnly: true })
  try {
    const row = db.prepare('SELECT status FROM changes WHERE name = ?').get('2026-10-13-fo-del')
    assert.equal(row && row.status, 'deleted', '台账写失败不阻断：DB 状态照常翻 deleted')
  } finally { db.close() }
})

test('FR-02: 行被外部清除后 sync 补推 deleted 墓碑（合成载荷）', async (t) => {
  const cwd = makePlatformCwd('fr2-del')
  t.after(() => cleanupProject(cwd))
  const CN = '2026-10-13-ghost-del'
  const pm = new ProgressManager()
  await pm.init(cwd)
  pm.initChange(cwd, CN)
  pm.deleteChange(cwd, CN) // 台账落 deleted
  purgeChangeRow(cwd, CN) // 事故形态：外部物理清行

  posts.length = 0
  const sm = new SyncManager(cwd)
  const r = await sm.sync(CN, { manual: true })
  assert.deepEqual(r.errors, [], '台账墓碑分支返回零 errors')
  assert.equal(r.ledgerTombstone, 'pushed', '墓碑已推送')
  assert.equal(posts.length, 1, '恰一笔 progress POST')
  const first = posts[0].body.changes[0]
  assert.equal(first.status, 'deleted', '载荷携带 deleted 终态')
  assert.equal(first.current_stage, 'archive', '合成载荷 current_stage=archive')
})

test('FR-02: archived 终态行清除后补推 archived 墓碑', async (t) => {
  const cwd = makePlatformCwd('fr2-arc')
  t.after(() => cleanupProject(cwd))
  const CN = '2026-10-13-ghost-arc'
  const pm = new ProgressManager()
  await pm.init(cwd)
  pm.initChange(cwd, CN)
  pm.unregisterChange(cwd, CN)
  purgeChangeRow(cwd, CN)

  posts.length = 0
  const sm = new SyncManager(cwd)
  const r = await sm.sync(CN, { manual: true })
  assert.deepEqual(r.errors, [])
  assert.equal(posts[0].body.changes[0].status, 'archived', '载荷携带 archived 终态')
})

test('FR-02/FR-04: never-existed 无台账不发墓碑；quick-* 豁免', async (t) => {
  const cwd = makePlatformCwd('fr2-never')
  t.after(() => cleanupProject(cwd))
  // 手工造一条 quick 台账行（正常流程不产生——豁免面测试用）
  appendDeletedLedger(join(cwd, '.sillyspec'), 'quick-12345678', 'deleted')

  posts.length = 0
  const sm = new SyncManager(cwd)
  const r1 = await sm.sync('2026-10-13-never-existed', { manual: true })
  assert.ok(r1.errors.length > 0, '无台账变更返回 errors（非假成功）')
  assert.match(r1.errors[0], /变更无进度数据/, '错误信息可见')

  const r2 = await sm.sync('quick-12345678', { manual: true })
  assert.ok(r2.errors.length > 0, 'quick 会话不走台账墓碑分支')
  assert.equal(posts.length, 0, '两例均未发起墓碑 POST')
})

test('FR-04: 台账坏行容错 + latest-wins', async (t) => {
  const cwd = createTempProject('fr4')
  t.after(() => cleanupProject(cwd))
  const specDir = join(cwd, '.sillyspec')
  appendDeletedLedger(specDir, '2026-10-13-a', 'deleted')
  // 半写截断行 + 外部编辑坏行
  writeFileSync(ledgerPathOf(cwd), '{"name":"broken-no-close\nnot-json\n', { flag: 'a' })
  appendDeletedLedger(specDir, '2026-10-13-a', 'archived') // 同名第二条 → latest-wins

  const hit = lookupDeletedLedger(specDir, '2026-10-13-a')
  assert.equal(hit && hit.status, 'archived', '坏行不拖垮读取且同名取最后一条')
  assert.equal(lookupDeletedLedger(specDir, '2026-10-13-none'), null, '未命中返回 null')
  assert.equal(lookupDeletedLedger(specDir, ''), null, '空参数安全返回 null')
})

test('FR-03: CLI platform sync --change 失败退出码 1（未连接平台）', async (t) => {
  const cwd = createTempProject('fr3-cli')
  t.after(() => cleanupProject(cwd))
  const r = spawnSync(
    process.execPath,
    [join(REPO_ROOT, 'bin', 'sillyspec.js'), 'platform', 'sync', '--change', '2026-10-13-nope'],
    { cwd, encoding: 'utf8', timeout: 60_000 },
  )
  assert.notEqual(r.status, 0, '失败路径退出码非 0')
  const errText = `${r.stderr || ''}${r.stdout || ''}`
  assert.match(errText, /未连接平台|变更无进度数据/, `stderr 错误信息可见（实得：${errText.slice(-200)}）`)
})

// mock 平台生命周期挂 after() 钩子（模块尾直接 close 会抢在未跑完的用例前关端口——
// node:test 顶层 test() 注册即开跑，与模块体后续语句交错）
after(async () => {
  server.closeAllConnections?.()
  await new Promise((r) => server.close(r))
})
