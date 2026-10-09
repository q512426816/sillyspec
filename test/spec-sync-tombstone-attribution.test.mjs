// 纯墓碑拒收归因记账矩阵（2026-10-09-tombstone-conflict-root-fix FR-01）
//
// 背景（91 条实证）：整树同步被墓碑整批拒收时按「当轮同步标签」落冲突文件——一个
// 根因伪装成 91 个变更的冲突，归档后记录永无人清。修复断言（src/spec-sync.js）：
// ① 归因落盘——按被删变更名（从 platform_deleted 路径剥）落 spec-sync-conflict-<被删变更>.json，
//    不再用当轮同步标签；kind='tombstone'；
// ② 幂等合并——同被删变更多轮拒只维护一条，created_at 首见保持、路径并集、last_seen 刷新；
// ③ 归档区前缀（changes/archive/<name>/）同归因到 <name>；剥不出归 __unattributed__；
// ④ 全绿同步清陈旧纯墓碑记录——判定式 conflicting_paths 空 + platform_deleted 非空
//    （kind 无关：新 'tombstone'、现行 'spec-tree' 存量、无 kind 旧格式全命中）；
//    混合形态（conflicting_paths 非空）永不清理；
// ⑤ progress show 的 pending_conflicts 透传 type='tombstone'（kind 优先，前缀兜底）。
//
// 隔离：tmpdir fixture + mock globalThis.fetch + 捕获 console，不碰真实 .sillyspec。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { syncSpecTree, extractTombstonedChanges, writeTombstoneAttribution, clearStaleTombstoneMarkers } from '../src/spec-sync.js'

const tmpRoots = []
function makeFixture() {
  const fx = mkdtempSync(join(tmpdir(), `sillyspec-tombattrib-${process.pid}-`))
  tmpRoots.push(fx)
  return fx
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

function mockFetch({ manifest = {}, postResponse }) {
  const impl = async (url, options = {}) => {
    if (String(url).endsWith('/spec-manifest')) {
      return { ok: true, status: 200, json: async () => ({ files: manifest }) }
    }
    if (String(url).endsWith('/spec-sync') && (options.method || '') === 'POST') {
      return { ok: true, status: 200, json: async () => postResponse }
    }
    return { ok: true, status: 200, json: async () => ({}) }
  }
  const saved = globalThis.fetch
  globalThis.fetch = impl
  return { restore: () => { globalThis.fetch = saved } }
}

async function capture(fn) {
  const lines = []
  const savedWarn = console.warn
  const savedLog = console.log
  console.warn = (...a) => { lines.push(a.map(String).join(' ')) }
  console.log = (...a) => { lines.push(a.map(String).join(' ')) }
  try { return { result: await fn(), lines } } finally { console.warn = savedWarn; console.log = savedLog }
}

const LABEL = 'sync-label-chg'   // 当轮同步标签（≠被删变更名，防巧合遮蔽归因断言）
const DELETED = 'deleted-target' // 被删变更（真凶）

function makeFixtureWithTombstone() {
  const fx = makeFixture()
  const specRoot = join(fx, '.sillyspec')
  mkdirSync(join(specRoot, 'changes', DELETED, 'tasks'), { recursive: true })
  const p1 = `changes/${DELETED}/tasks/task-01.md`
  const p2 = `changes/${DELETED}/verify-result.md`
  const manifest = { [p1]: { hash: 'S1', version: 2, exists: true }, [p2]: { hash: 'S2', version: 1, exists: true } }
  writeFileSync(join(specRoot, p1), 'local\n', 'utf8')
  writeFileSync(join(specRoot, p2), 'local\n', 'utf8')
  return { specRoot, manifest, paths: [p1, p2] }
}

test('① 归因落盘：按被删变更名（非当轮标签）+ kind=tombstone + 横幅单根因叙事', async () => {
  const { specRoot, manifest, paths } = makeFixtureWithTombstone()
  const m = mockFetch({
    manifest,
    postResponse: { ok: true, new_versions: {}, conflict: true, server_versions: {}, platform_deleted: paths },
  })
  try {
    const { result, lines } = await capture(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, LABEL))
    assert.equal(result.conflict, true)
    assert.deepEqual(result.tombstonedChanges, [DELETED], '回执透传归因名单')
    const cfPath = join(specRoot, '.runtime', `spec-sync-conflict-${DELETED}.json`)
    assert.ok(existsSync(cfPath), '记录落在被删变更名下')
    assert.ok(!existsSync(join(specRoot, '.runtime', `spec-sync-conflict-${LABEL}.json`)), '不落当轮标签名')
    const cf = JSON.parse(readFileSync(cfPath, 'utf8'))
    assert.equal(cf.change, DELETED)
    assert.equal(cf.kind, 'tombstone')
    assert.deepEqual(cf.platform_deleted, paths)
    assert.equal(cf.conflicting_paths.length, 0)
    assert.ok(lines.some((l) => l.includes(`变更 ${DELETED} 被平台删除墓碑拒收`)), '横幅指向真凶（被删变更）')
  } finally { m.restore() }
})

test('② 幂等合并：同被删变更多轮拒一条记录，created_at 首见保持、路径并集', async () => {
  const { specRoot } = makeFixtureWithTombstone()
  const first = writeTombstoneAttribution(specRoot, [`changes/${DELETED}/a.md`])
  assert.equal(first.byChange.size, 1)
  // 时间戳分辨：二次写入的 created_at 必须等于首见
  const firstCf = JSON.parse(readFileSync(join(specRoot, '.runtime', `spec-sync-conflict-${DELETED}.json`), 'utf8'))
  const second = writeTombstoneAttribution(specRoot, [`changes/${DELETED}/a.md`, `changes/${DELETED}/b.md`])
  assert.equal(second.byChange.size, 1)
  const secondCf = JSON.parse(readFileSync(join(specRoot, '.runtime', `spec-sync-conflict-${DELETED}.json`), 'utf8'))
  assert.equal(secondCf.created_at, firstCf.created_at, 'created_at 首见保持')
  assert.deepEqual([...secondCf.platform_deleted].sort(), [`changes/${DELETED}/a.md`, `changes/${DELETED}/b.md`], '路径并集')
})

test('③ 剥名矩阵：归档区前缀归因同名 / 剥不出归 __unattributed__', () => {
  const by = extractTombstonedChanges([
    'changes/active-x/f.md',
    'changes/archive/arch-y/g.md',
    'weird/path.txt',
  ])
  assert.deepEqual([...by.keys()].sort(), ['__unattributed__', 'active-x', 'arch-y'])
  assert.deepEqual(by.get('active-x'), ['changes/active-x/f.md'])
  assert.deepEqual(by.get('arch-y'), ['changes/archive/arch-y/g.md'])
  assert.deepEqual(by.get('__unattributed__'), ['weird/path.txt'])
})

test('④ 全绿清理矩阵：三种纯墓碑格式清零，混合形态保留', () => {
  const fx = makeFixture()
  const runtime = join(fx, '.runtime')
  mkdirSync(runtime, { recursive: true })
  const mk = (name, obj) => writeFileSync(join(runtime, name), JSON.stringify(obj), 'utf8')
  mk('spec-sync-conflict-new-form.json', { change: 'new-form', kind: 'tombstone', conflicting_paths: [], platform_deleted: ['changes/new-form/a.md'] })
  mk('spec-sync-conflict-current-form.json', { change: 'current-form', kind: 'spec-tree', conflicting_paths: [], platform_deleted: ['changes/current-form/a.md'] })
  mk('spec-sync-conflict-legacy-no-kind.json', { change: 'legacy', created_at: '2026-09-29T00:00:00Z', conflicting_paths: [], platform_deleted: ['changes/legacy/a.md'] })
  mk('spec-sync-conflict-mixed.json', { change: 'mixed', kind: 'tombstone', conflicting_paths: ['changes/mixed/real.md'], platform_deleted: ['changes/mixed/tomb.md'] })
  mk('spec-sync-conflict-version-only.json', { change: 'ver', kind: 'spec-tree', conflicting_paths: ['changes/ver/x.md'], platform_deleted: [] })
  const cleared = clearStaleTombstoneMarkers(fx)
  assert.equal(cleared, 3, '三种纯墓碑格式（tombstone/spec-tree 纯墓碑/无 kind 旧格式）全清')
  assert.ok(!existsSync(join(runtime, 'spec-sync-conflict-new-form.json')))
  assert.ok(!existsSync(join(runtime, 'spec-sync-conflict-current-form.json')))
  assert.ok(!existsSync(join(runtime, 'spec-sync-conflict-legacy-no-kind.json')))
  assert.ok(existsSync(join(runtime, 'spec-sync-conflict-mixed.json')), '混合形态永不清理')
  assert.ok(existsSync(join(runtime, 'spec-sync-conflict-version-only.json')), '纯版本冲突不受影响')
})

test('⑤ 全绿同步链路挂点：无差异轮清理陈旧墓碑记录（集成）', async () => {
  const { specRoot, manifest, paths } = makeFixtureWithTombstone()
  // manifest 换成本地真实 hash → ops 为空 → 无差异全绿分支（挂点②；挂点①成功分支
  // 同函数，单元矩阵见用例④）
  const { walkSpecTree, hashFiles } = await import('../src/spec-sync.js')
  const realHash = Object.fromEntries(hashFiles(walkSpecTree(specRoot)).map((f) => [f.path, f]))
  for (const p of paths) manifest[p] = { hash: realHash[p].hash, version: 2, exists: true }
  // 预置一条陈旧纯墓碑记录（旧格式，无 kind——模拟存量 91 条形态）
  const runtime = join(specRoot, '.runtime')
  mkdirSync(runtime, { recursive: true })
  const stalePath = join(runtime, 'spec-sync-conflict-stale-old.json')
  writeFileSync(stalePath, JSON.stringify({ change: 'stale-old', created_at: '2026-09-29T00:00:00Z', conflicting_paths: [], platform_deleted: ['changes/stale-old/x.md'] }), 'utf8')
  const m = mockFetch({ manifest, postResponse: { ok: true, new_versions: {}, conflict: false } })
  try {
    const { result, lines } = await capture(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, LABEL))
    assert.equal(result.synced, 0, '无差异跳过')
    assert.ok(!existsSync(stalePath), '陈旧纯墓碑记录被全绿清理')
    assert.ok(lines.some((l) => l.includes('全绿同步清理 1 条陈旧墓碑冲突记录')), '清理有单行提示')
  } finally { m.restore() }
})

test('⑥ progress show 透传：kind=tombstone → type=tombstone；前缀兜底不变', async () => {
  const { StageMachine } = await import('../src/progress/stage-machine.js')
  const fx = makeFixture()
  const specRoot = join(fx, '.sillyspec')
  const runtime = join(specRoot, '.runtime')
  mkdirSync(runtime, { recursive: true })
  writeFileSync(join(runtime, 'spec-sync-conflict-tomb-kind.json'), JSON.stringify({ change: 'tomb-kind', kind: 'tombstone', created_at: '2026-10-09T00:00:00Z', platform_deleted: ['changes/tomb-kind/a.md'] }), 'utf8')
  writeFileSync(join(runtime, 'spec-sync-conflict-old-nokind.json'), JSON.stringify({ change: 'old-nokind', created_at: '2026-09-29T00:00:00Z', conflicting_paths: [], platform_deleted: ['changes/old-nokind/a.md'] }), 'utf8')
  writeFileSync(join(runtime, 'sync-conflict-prog-one.json'), JSON.stringify({ change: 'prog-one', created_at: '2026-10-01T00:00:00Z' }), 'utf8')
  const sm = new StageMachine({ specDir: specRoot })
  const conflicts = sm._listPendingConflicts(specRoot)
  const byName = Object.fromEntries(conflicts.map((c) => [c.change, c]))
  assert.equal(byName['tomb-kind'].type, 'tombstone', 'kind 优先透传')
  assert.equal(byName['old-nokind'].type, 'spec-tree', '无 kind 走前缀兜底（值域不乱标 tombstone）')
  assert.equal(byName['prog-one'].type, 'progress', '进度冲突前缀判定不变')
})
