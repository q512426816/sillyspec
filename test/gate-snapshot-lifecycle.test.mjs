/**
 * gate 快照生命周期账本测试（2026-09-24-gate-snapshot-lifecycle，task-01）
 *
 * 覆盖 D-004@v2（幂等账本+双清确认销账）/ D-005@v1（路径与条目 fail-closed 守卫）/
 * D-003@v2（TTL×pid 三态保守判定）——全部注入 runtimeRoot/时钟/pid 探针/git 与删目录原语，
 * 单测不依赖真实 %TEMP% 残留与真实 git 仓（真实 worktree 集成面见本文件后半 task-03 段）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import {
  gateSnapshotLedgerPath,
  registerGateSnapshot,
  unregisterGateSnapshot,
  readGateSnapshotLedger,
  isSafeSnapshotRoot,
  isSafeLedgerEntry,
  selectStaleSnapshots,
  reclaimStaleGateSnapshots,
  resolveStaleHours,
} from '../src/run/gate-snapshot-ledger.js'

const roots = []
function mkRuntime() {
  const d = mkdtempSync(join(tmpdir(), 'gateledger-'))
  roots.push(d)
  return d
}
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) } catch { /* Windows EPERM best-effort */ } } })

const HOUR = 3600_000
const NOW = 1_800_000_000_000

// ── 账本路径与读写幂等 ──
test('账本路径落在 runtimeRoot 下（active-gate-snapshots.json）', () => {
  assert.equal(gateSnapshotLedgerPath('C:/x/.runtime'), join('C:/x/.runtime', 'active-gate-snapshots.json'))
})

test('register 同 root 重复调用幂等（一条目）', () => {
  const rt = mkRuntime()
  registerGateSnapshot({ runtimeRoot: rt, snapshotRoot: join(tmpdir(), 'sillyspec-gate-aaa'), pid: 111 })
  registerGateSnapshot({ runtimeRoot: rt, snapshotRoot: join(tmpdir(), 'sillyspec-gate-aaa'), pid: 111 })
  assert.equal(readGateSnapshotLedger(rt).length, 1)
})

test('unregister 幂等且缺失不抛', () => {
  const rt = mkRuntime()
  const root = join(tmpdir(), 'sillyspec-gate-bbb')
  registerGateSnapshot({ runtimeRoot: rt, snapshotRoot: root, pid: 222 })
  unregisterGateSnapshot({ runtimeRoot: rt, snapshotRoot: root })
  unregisterGateSnapshot({ runtimeRoot: rt, snapshotRoot: root })
  assert.deepEqual(readGateSnapshotLedger(rt), [])
})

test('账本损坏退空数组（fail-open 零阻断）', () => {
  const rt = mkRuntime()
  mkdirSync(rt, { recursive: true })
  writeFileSync(gateSnapshotLedgerPath(rt), '{ 这不是 JSON')
  assert.deepEqual(readGateSnapshotLedger(rt), [])
  // 损坏态下 register 吞异常不抛
  assert.doesNotThrow(() => registerGateSnapshot({ runtimeRoot: rt, snapshotRoot: join(tmpdir(), 'sillyspec-gate-ccc'), pid: 1 }))
})

test('runtimeRoot 缺失退 no-op（不猜路径）', () => {
  assert.doesNotThrow(() => registerGateSnapshot({ runtimeRoot: null, snapshotRoot: 'x', pid: 1 }))
  assert.deepEqual(readGateSnapshotLedger(null), [])
})

// ── isSafeSnapshotRoot：路径守卫 ──
test('路径守卫：tmpdir 直接子目录 + sillyspec-gate- 前缀放行', () => {
  assert.equal(isSafeSnapshotRoot(join(tmpdir(), 'sillyspec-gate-ok')), true)
})

test('路径守卫：非前缀/嵌套/.. /非直接子目录/非字符串一律拒', () => {
  assert.equal(isSafeSnapshotRoot(join(tmpdir(), 'evil-dir')), false, '非 sillyspec-gate- 前缀')
  assert.equal(isSafeSnapshotRoot(join(tmpdir(), 'sillyspec-gate-ok', 'nested')), false, '嵌套子目录')
  assert.equal(isSafeSnapshotRoot(join(tmpdir(), '..', 'sillyspec-gate-ok')), false, '.. 逃逸')
  assert.equal(isSafeSnapshotRoot(resolve(tmpdir(), 'sub', 'sillyspec-gate-ok')), false, '非直接子目录')
  assert.equal(isSafeSnapshotRoot(null), false, '非字符串')
})

// ── isSafeLedgerEntry：结构守卫 ──
test('条目守卫：pid 正整数 + createdAt 有限值', () => {
  const root = join(tmpdir(), 'sillyspec-gate-ok')
  assert.equal(isSafeLedgerEntry({ snapshotRoot: root, pid: 1, createdAt: NOW }), true)
  assert.equal(isSafeLedgerEntry({ snapshotRoot: root, pid: 0, createdAt: NOW }), false, 'pid=0')
  assert.equal(isSafeLedgerEntry({ snapshotRoot: root, pid: -3, createdAt: NOW }), false, 'pid<0')
  assert.equal(isSafeLedgerEntry({ snapshotRoot: root, pid: 1.5, createdAt: NOW }), false, 'pid 非整数')
  assert.equal(isSafeLedgerEntry({ snapshotRoot: root, pid: 1, createdAt: NaN }), false, 'createdAt NaN')
  assert.equal(isSafeLedgerEntry({ snapshotRoot: root, pid: 1, createdAt: Infinity }), false, 'createdAt 无限')
  assert.equal(isSafeLedgerEntry({ snapshotRoot: join(tmpdir(), 'bad'), pid: 1, createdAt: NOW }), false, '根不过路径守卫')
  assert.equal(isSafeLedgerEntry(null), false)
})

// ── selectStaleSnapshots：TTL×pid 三态（D-003@v2）──
test('判定：超期+明确死→stale；未超期/存活/守卫不过→保留', () => {
  const base = join(tmpdir(), 'sillyspec-gate-')
  const old = (pid) => ({ snapshotRoot: `${base}${pid}`, pid, createdAt: NOW - 30 * HOUR })
  const fresh = { snapshotRoot: `${base}fresh`, pid: 5, createdAt: NOW - 1 * HOUR }
  const dead = () => false
  const alive = () => true
  const r = selectStaleSnapshots([old(1), fresh, old(2)], { now: NOW, staleHours: 24, isProcessAlive: (pid) => (pid === 1 ? dead() : alive()) })
  assert.equal(r.stale.length, 1)
  assert.equal(r.stale[0].pid, 1)
  assert.equal(r.alive.length, 2, '未超期与存活各自保留')
})

test('判定：staleHours 非法值回退 24h（NaN/0/负/缺省）', () => {
  const e = { snapshotRoot: join(tmpdir(), 'sillyspec-gate-h'), pid: 9, createdAt: NOW - 25 * HOUR }
  for (const hours of [NaN, 0, -5, undefined]) {
    const r = selectStaleSnapshots([e], { now: NOW, staleHours: hours, isProcessAlive: () => false })
    assert.equal(r.stale.length, 1, `staleHours=${hours} 应回退 24h 并判 stale`)
  }
})

test('resolveStaleHours 值域：有限正数透传，其余（含缺省/env）回退 24', () => {
  assert.equal(resolveStaleHours(6), 6)
  assert.equal(resolveStaleHours(0.5), 0.5)
  for (const bad of [NaN, Infinity, 0, -1, 'abc', null, undefined]) {
    assert.equal(resolveStaleHours(bad), 24, `resolveStaleHours(${String(bad)}) 回退 24`)
  }
})

test('判定：守卫不过的条目零删除原语（计入保留）', () => {
  const tampered = { snapshotRoot: 'C:/Windows/System32/foo', pid: 1, createdAt: NOW - 99 * HOUR }
  const r = selectStaleSnapshots([tampered], { now: NOW, staleHours: 24, isProcessAlive: () => false })
  assert.equal(r.stale.length, 0)
  assert.equal(r.alive.length, 1)
})

// ── reclaimStaleGateSnapshots：双清确认销账（D-004@v2）──
test('回收：remove+rmSync 双成功→销号（reclaimed）', () => {
  const rt = mkRuntime()
  const root = join(tmpdir(), 'sillyspec-gate-r1')
  registerGateSnapshot({ runtimeRoot: rt, snapshotRoot: root, pid: 1 })
  // 改 createdAt 为超期（register 写的是 Date.now）
  const p = gateSnapshotLedgerPath(rt)
  const data = JSON.parse(readFileSync(p, 'utf8'))
  data[0].createdAt = NOW - 30 * HOUR
  writeFileSync(p, JSON.stringify(data))
  const calls = []
  const res = reclaimStaleGateSnapshots({
    runtimeRoot: rt, cwd: 'C:/repo', now: NOW, staleHours: 24, isProcessAlive: () => false,
    runGit: (cwd, args) => { calls.push(args.join(' ')); return '' },
    removeDir: (p2) => { calls.push(`rm:${p2}`) },
    worktreeRegistered: () => false,
  })
  assert.deepEqual(res.reclaimed, [root])
  assert.deepEqual(res.skipped, [])
  assert.ok(calls.some(c => c.includes('worktree remove')), 'remove 被调')
  assert.ok(calls.some(c => c.startsWith('rm:')), 'rmSync 被调')
  assert.deepEqual(readGateSnapshotLedger(rt), [], '双清后条目销号')
})

test('回收：双失败（remove 抛+rmSync 抛）→条目保留且 skipped', () => {
  const rt = mkRuntime()
  const root = join(tmpdir(), 'sillyspec-gate-r2')
  registerGateSnapshot({ runtimeRoot: rt, snapshotRoot: root, pid: 1 })
  const p = gateSnapshotLedgerPath(rt)
  const data = JSON.parse(readFileSync(p, 'utf8'))
  data[0].createdAt = NOW - 30 * HOUR
  writeFileSync(p, JSON.stringify(data))
  const res = reclaimStaleGateSnapshots({
    runtimeRoot: rt, cwd: 'C:/repo', now: NOW, staleHours: 24, isProcessAlive: () => false,
    runGit: () => { throw new Error('remove failed') },
    removeDir: () => { throw new Error('rm failed') },
    worktreeRegistered: () => true,
  })
  assert.deepEqual(res.reclaimed, [])
  assert.deepEqual(res.skipped, [root])
  assert.equal(readGateSnapshotLedger(rt).length, 1, '删不掉必须留账本（不销号）')
})

test('回收：目录已删但 worktree 注册仍在（prune 失败）→保留条目', () => {
  const rt = mkRuntime()
  const root = join(tmpdir(), 'sillyspec-gate-r3')
  registerGateSnapshot({ runtimeRoot: rt, snapshotRoot: root, pid: 1 })
  const p = gateSnapshotLedgerPath(rt)
  const data = JSON.parse(readFileSync(p, 'utf8'))
  data[0].createdAt = NOW - 30 * HOUR
  writeFileSync(p, JSON.stringify(data))
  const res = reclaimStaleGateSnapshots({
    runtimeRoot: rt, cwd: 'C:/repo', now: NOW, staleHours: 24, isProcessAlive: () => false,
    runGit: () => { throw new Error('remove failed') },
    removeDir: () => {}, // 目录真删了（existsSync 为真时仍返回 false 需注意——本例用 worktreeRegistered=true 模拟注册残留）
    worktreeRegistered: () => true,
  })
  assert.deepEqual(res.reclaimed, [])
  assert.equal(readGateSnapshotLedger(rt).length, 1, '注册未清→不销号')
})

test('回收：runtimeRoot 缺失/异常→零副作用', () => {
  assert.deepEqual(reclaimStaleGateSnapshots({ runtimeRoot: null, cwd: 'x' }), { reclaimed: [], skipped: [] })
  assert.deepEqual(reclaimStaleGateSnapshots({ runtimeRoot: 'C:/nope-404', cwd: 'x', isProcessAlive: () => false }), { reclaimed: [], skipped: [] })
})

// ───────────────────────────────────────────────────────────────────────────
// task-03 段：真实临时仓集成（create→cleanup 双清销账 / 崩溃残留自愈 / 活跃零回收）
// ───────────────────────────────────────────────────────────────────────────
import { execFileSync, spawnSync } from 'node:child_process'
import { createGateSnapshot } from '../src/run/gate-snapshot.js'

const repos = []
function sh(cwd, args) { return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
function makeRepo() {
  const d = mkdtempSync(join(tmpdir(), 'gatesnap-repo-'))
  repos.push(d)
  sh(d, ['init', '-q', '-b', 'main'])
  sh(d, ['config', 'user.email', 't@t.com'])
  sh(d, ['config', 'user.name', 't'])
  sh(d, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(d, 'README.md'), 'x\n')
  sh(d, ['add', '-A'])
  sh(d, ['commit', '-q', '-m', 'init'])
  return d
}
test.after(() => { for (const d of repos) { try { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) } catch { /* best-effort */ } } })

function deadPid() {
  const r = spawnSync(process.execPath, ['-e', '0'])
  return r.pid // 已退出并被回收的进程 → ESRCH
}
function worktreeListHas(cwd, root) {
  const norm = (s) => String(s).replace(/\\/g, '/')
  return sh(cwd, ['worktree', 'list', '--porcelain']).split('\n')
    .some((line) => line.startsWith('worktree ') && norm(line.slice(9)) === norm(root))
}

test('集成：create→cleanup 全程后账本归零且 worktree 注册双清', () => {
  const repo = makeRepo()
  const rt = mkRuntime()
  const snap = createGateSnapshot({ cwd: repo, files: [], runtimeRoot: rt })
  assert.ok(snap && snap.snapshotRoot, '快照建成')
  assert.equal(readGateSnapshotLedger(rt).length, 1, '建快照后账本一条')
  assert.ok(existsSync(snap.snapshotRoot), '快照目录存在')
  assert.ok(worktreeListHas(repo, snap.snapshotRoot), 'worktree 注册存在')
  snap.cleanup()
  assert.deepEqual(readGateSnapshotLedger(rt), [], '双清确认后销号')
  assert.equal(existsSync(snap.snapshotRoot), false, '快照目录已删')
  assert.equal(worktreeListHas(repo, snap.snapshotRoot), false, 'worktree 注册已清')
})

test('集成：崩溃残留自愈——死 pid+超期条目在下个 create 前被回收', () => {
  const repo = makeRepo()
  const rt = mkRuntime()
  const snap1 = createGateSnapshot({ cwd: repo, files: [], runtimeRoot: rt })
  assert.ok(snap1)
  // 模拟崩溃：条目改成死 pid + 超期（不调 cleanup——目录与注册俱在）
  const p = gateSnapshotLedgerPath(rt)
  const data = JSON.parse(readFileSync(p, 'utf8'))
  data[0].pid = deadPid()
  data[0].createdAt = Date.now() - 48 * HOUR
  writeFileSync(p, JSON.stringify(data))
  const savedEnv = process.env.SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS
  process.env.SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS = '1'
  let snap2
  try {
    snap2 = createGateSnapshot({ cwd: repo, files: [], runtimeRoot: rt })
  } finally {
    if (savedEnv === undefined) delete process.env.SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS
    else process.env.SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS = savedEnv
  }
  assert.ok(snap2, '残留被回收后新快照照常建成')
  assert.equal(existsSync(snap1.snapshotRoot), false, '崩溃残留目录已回收')
  assert.equal(worktreeListHas(repo, snap1.snapshotRoot), false, '崩溃残留注册已回收')
  const entries = readGateSnapshotLedger(rt)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].snapshotRoot, snap2.snapshotRoot, '账本只剩新快照条目（旧的已销号）')
  snap2.cleanup()
})

test('集成：活跃条目（pid=本进程）零回收', () => {
  const repo = makeRepo()
  const rt = mkRuntime()
  const snap1 = createGateSnapshot({ cwd: repo, files: [], runtimeRoot: rt })
  // 条目超期但 pid 是活着的本进程
  const p = gateSnapshotLedgerPath(rt)
  const data = JSON.parse(readFileSync(p, 'utf8'))
  data[0].pid = process.pid
  data[0].createdAt = Date.now() - 999 * HOUR
  writeFileSync(p, JSON.stringify(data))
  const savedEnv = process.env.SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS
  process.env.SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS = '1'
  let snap2
  try { snap2 = createGateSnapshot({ cwd: repo, files: [], runtimeRoot: rt }) } finally {
    if (savedEnv === undefined) delete process.env.SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS
    else process.env.SILLYSPEC_GATE_SNAPSHOT_STALE_HOURS = savedEnv
  }
  assert.ok(existsSync(snap1.snapshotRoot), '活跃快照零误删')
  assert.ok(worktreeListHas(repo, snap1.snapshotRoot), '活跃注册零误删')
  snap1.cleanup()
  snap2.cleanup()
})

test('集成：账本空时 create 零回收输出（正常路径逐字节不变）', () => {
  const repo = makeRepo()
  const rt = mkRuntime()
  const lines = []
  const origLog = console.log
  console.log = (...a) => { lines.push(a.join(' ')) }
  let snap
  try { snap = createGateSnapshot({ cwd: repo, files: [], runtimeRoot: rt }) } finally { console.log = origLog }
  assert.ok(!lines.some((l) => l.includes('自愈')), '无残留时无自愈输出行')
  snap.cleanup()
})

test('接线钉：runtimeRoot 形参/回收调用/登记/双清销账/quick 透传均在源码', () => {
  const gs = readFileSync(new URL('../src/run/gate-snapshot.js', import.meta.url), 'utf8')
  const qa = readFileSync(new URL('../src/run/quick-audit.js', import.meta.url), 'utf8')
  assert.ok(/createGateSnapshot\(\{[^}]*runtimeRoot = null/.test(gs), 'createGateSnapshot 显式 runtimeRoot 形参')
  assert.ok(gs.includes('reclaimStaleGateSnapshots({ runtimeRoot, cwd })'), '建快照前回收调用')
  assert.ok(gs.includes('registerGateSnapshot({ runtimeRoot, snapshotRoot })'), 'worktree add 后登记')
  assert.ok(/if \(dirRemoved && worktreeCleaned\) unregisterGateSnapshot/.test(gs), 'cleanup/失败路径双清确认才销账')
  assert.ok(/createGateSnapshot\(\{ cwd, files, runtimeRoot \}\)/.test(qa), 'quick 调用点透传 runtimeRoot')
  assert.ok(qa.includes('resolveRuntimeRoot(null, specBase)'), 'quick 侧 runtimeRoot 解析口径同 test-ledger')
})

// ───────────────────────────────────────────────────────────────────────────
// task-04 段：doctor 泄漏维度（warning 级三态）
// ───────────────────────────────────────────────────────────────────────────
import { detectGateSnapshotLeak } from '../src/doctor-diagnostics.js'

test('doctor 维度：账本空/runtimeRoot 缺失→pass 零 findings', () => {
  const rt = mkRuntime()
  const d = detectGateSnapshotLeak({ runtimeRoot: rt, now: NOW, staleHours: 24, isProcessAlive: () => false })
  assert.equal(d.name, 'gate_snapshot_leak')
  assert.equal(d.pass, true)
  assert.deepEqual(d.findings, [])
  assert.equal(d.severity, null)
  assert.deepEqual(detectGateSnapshotLeak({ runtimeRoot: null }).pass, true, 'runtimeRoot 缺失退 ok')
})

test('doctor 维度：超期失活条目→pass=false+WARNING+root/账龄列示', () => {
  const rt = mkRuntime()
  const root = join(tmpdir(), 'sillyspec-gate-doc')
  registerGateSnapshot({ runtimeRoot: rt, snapshotRoot: root, pid: 1 })
  const p = gateSnapshotLedgerPath(rt)
  const data = JSON.parse(readFileSync(p, 'utf8'))
  data[0].createdAt = NOW - 50 * HOUR
  writeFileSync(p, JSON.stringify(data))
  const d = detectGateSnapshotLeak({ runtimeRoot: rt, now: NOW, staleHours: 24, isProcessAlive: () => false })
  assert.equal(d.pass, false)
  assert.equal(d.severity, 'warning')
  assert.equal(d.findings.length, 1)
  assert.ok(d.findings[0].includes(root), 'finding 含 root')
  assert.ok(d.findings[0].includes('50h'), 'finding 含账龄')
})

test('doctor 维度：账本损坏/守卫不过→ok（fail-open 零误报）', () => {
  const rt = mkRuntime()
  mkdirSync(rt, { recursive: true })
  writeFileSync(gateSnapshotLedgerPath(rt), '{{{ 坏 JSON')
  assert.equal(detectGateSnapshotLeak({ runtimeRoot: rt, now: NOW, staleHours: 24, isProcessAlive: () => false }).pass, true)
  const p = gateSnapshotLedgerPath(rt)
  writeFileSync(p, JSON.stringify([{ snapshotRoot: 'C:/evil/dir', pid: 1, createdAt: NOW - 99 * HOUR }]))
  assert.equal(detectGateSnapshotLeak({ runtimeRoot: rt, now: NOW, staleHours: 24, isProcessAlive: () => false }).pass, true, '守卫不过的条目零误报')
})
