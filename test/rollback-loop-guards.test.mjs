// 回滚环/DB 损坏三护栏回归（docs/sillyspec/platform-sync-progress-rollback-and-db-corruption 坑1②③/坑2②）
//
// 坑1②：resolve 无冲突文件时 keep-local 降级为「无冲突强推」（拉平台 last_pushed_at 推进
//        base_ts + 自动重推）——回滚环中间态（冲突文件被静默清除）的收敛出口；
// 坑1③：disconnect --keep-pointer 只清 local.yaml platform 段保留指针/声明；默认模式在
//        daemon 主目录存在时打醒目警告（daemon 内嵌 CLI 失锚会推空状态放大回滚）；
// 坑2②：_write 前 5 分钟龄控 VACUUM INTO .bak 快照——db.js _openWithFallback 的既有
//        回退链获得新鲜恢复源（损坏最坏回退 ≤5min，而非删库重放）。
//
// 隔离：tmpdir fixture + mock globalThis.fetch，不碰真实 .sillyspec/.runtime/daemon home。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, statSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { homedir } from 'os'
import { SyncManager } from '../src/sync.js'
import { ProgressManager } from '../src/progress.js'

const tmpRoots = []
function makeFixture(name = 'fx') {
  const cwd = mkdtempSync(join(tmpdir(), `rbguard-${name}-${process.pid}-`))
  tmpRoots.push(cwd)
  mkdirSync(join(cwd, '.sillyspec', '.runtime'), { recursive: true })
  return cwd
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

function mockFetch(progressBody = null) {
  const calls = []
  const body = progressBody || { last_pushed_at: '2026-09-12T10:00:00Z', project: 'p', changes: [] }
  const text = JSON.stringify(body)
  // fetchJson 形状契约：headers.get / text / json 三件（缺 headers.get 会在分支内抛成「拉取失败」）
  const makeRes = () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => text, json: async () => body })
  const impl = async (url, options = {}) => {
    calls.push(`${options.method || 'GET'} ${url}`)
    return makeRes()
  }
  const saved = globalThis.fetch
  globalThis.fetch = impl
  return { calls, restore: () => { globalThis.fetch = saved } }
}

// ── 坑2②：.bak 快照 ──

test('坑2②：首次 _write 落 .bak 快照；5 分钟内二次写不重建（mtime 稳定）', async () => {
  const cwd = makeFixture('bak')
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  await pm.init(cwd)
  await pm.initChange(cwd, 'bak-change')
  pm._write(cwd, { currentChange: 'bak-change', currentStage: 'brainstorm', stages: {} }, 'bak-change')
  const bak = join(cwd, '.sillyspec', '.runtime', 'sillyspec.db.bak')
  assert.ok(existsSync(bak), '首次写后 .bak 存在（_openWithFallback 获得恢复源）')
  const m1 = statSync(bak).mtimeMs
  pm._write(cwd, { currentChange: 'bak-change', currentStage: 'brainstorm', stages: {} }, 'bak-change')
  const m2 = statSync(bak).mtimeMs
  assert.equal(m1, m2, '5 分钟窗口内不重建（节流生效）')
})

// ── 坑1③：disconnect 保指针 ──

test('坑1③：disconnect --keep-pointer 只清 local.yaml platform 段，指针/声明保留', () => {
  const cwd = makeFixture('disc')
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
    '# 连接配置\nplatform:\n  url: http://127.0.0.1:9\n  token: t\n', 'utf8')
  writeFileSync(join(cwd, '.sillyspec-platform.json'), '{"specRoot":"x"}', 'utf8')
  writeFileSync(join(cwd, '.sillyspec-platform-managed'), 'declared', 'utf8')
  new SyncManager(cwd).disconnect({ keepPointer: true })
  const yaml = readFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'utf8')
  assert.ok(!/^\s*platform:/m.test(yaml), 'local.yaml platform 段已清（自己 CLI 同步断开）')
  assert.ok(yaml.includes('# 连接配置'), '注释保留')
  assert.ok(existsSync(join(cwd, '.sillyspec-platform.json')), '指针保留（daemon 内嵌 CLI 锚点健在）')
  assert.ok(existsSync(join(cwd, '.sillyspec-platform-managed')), '接管声明保留')
})

test('坑1③：默认 disconnect 三清照旧（本地模式可达性不回归）', () => {
  const cwd = makeFixture('disc2')
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'platform:\n  url: http://x\n  token: t\n', 'utf8')
  writeFileSync(join(cwd, '.sillyspec-platform.json'), '{}', 'utf8')
  new SyncManager(cwd).disconnect()
  assert.ok(!existsSync(join(cwd, '.sillyspec-platform.json')), '默认模式指针照删（三清语义不变）')
})

// ── 坑1②：resolve 无冲突 keep-local ──

test('坑1②：无冲突文件 + keep-local → 降级强推：拉平台 ts 推进 base_ts + 重推', async () => {
  const cwd = makeFixture('res')
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
    'platform:\n  url: http://127.0.0.1:9\n  token: t\n', 'utf8')
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  await pm.init(cwd)
  await pm.initChange(cwd, 'loop-change')
  const db = pm._ensureDB(cwd).getDb()
  db.prepare("UPDATE changes SET last_synced_platform_ts = '2026-09-01T00:00:00Z' WHERE name = ?").run('loop-change')

  const m = mockFetch({ last_pushed_at: '2026-09-12T10:00:00Z', project: 'p', changes: [] })
  try {
    const sm = new SyncManager(cwd)
    const r = await sm.resolve('loop-change', 'keep-local')
    assert.equal(r.ok, true, `无冲突 keep-local 成功（实际 ${JSON.stringify(r)}）`)
    assert.equal(r.mode, 'keep-local-noconflict', '模式标记为无冲突强推')
    const row = db.prepare('SELECT last_synced_platform_ts FROM changes WHERE name = ?').get('loop-change')
    assert.equal(row.last_synced_platform_ts, '2026-09-12T10:00:00Z', 'base_ts 对齐平台 last_pushed_at（回滚环收敛）')
    assert.ok(m.calls.some(c => c.includes('/loop-change/progress')), '有平台交互（拉 ts + 重推）')
  } finally { m.restore() }
})

test('坑1②：无冲突文件 + take-platform → 仍拒绝（依赖冲突文件快照，无可覆盖源）', async () => {
  const cwd = makeFixture('res2')
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
    'platform:\n  url: http://127.0.0.1:9\n  token: t\n', 'utf8')
  const sm = new SyncManager(cwd)
  const r = await sm.resolve('ghost-change', 'take-platform')
  assert.equal(r.ok, false, 'take-platform 无文件仍拒绝')
  assert.match(r.reason, /无可解决冲突/, '拒绝理由明确')
})
