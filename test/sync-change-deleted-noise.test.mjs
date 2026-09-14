// 变更级 change_deleted 回执噪音闸（2026-09-14 用户反馈②：--done 的真实报错被
// default 墓碑 409 回执刷屏淹没——平台侧已删的变更名每次自动 push 都打同样回执行）。
//
// 覆盖：
//   1. 单元（sync-noise.js）：首报可见 + marker 落盘、进程内逐字重复静默、开窗进程不同行
//      照打、后续进程窗口内静默、窗口过期重报、成功清窗（noteChangeDeletedResolved）、
//      双变更独立窗口、debug env / noMute 旁路、未绑定目录直通
//   2. 集成（sync.js 接线，mock fetch）：
//      a. 本地 active + 平台 409 change_deleted → ⚠️ 可行动回执首报可见，同进程/后续进程静默
//      b. 本地 deleted（A 行 info + B 行 ℹ️ 预期回执）→ 首轮两行都可见，后续进程全静默
//      c. manual（platform sync 手动命令路径）→ 旁路恒可见
//      d. 推送成功 → 清窗 → 下次 409 回执重新首报
//
// 隔离：marker 落 tmpdir 临时目录；console.warn/log 临时拦截后恢复；mock globalThis.fetch。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  bindSyncNoiseRoot, syncChangeDeletedLog, syncChangeDeletedWarn,
  noteChangeDeletedResolved, _resetSyncNoiseForTest,
} from '../src/sync-noise.js'

delete process.env.SILLYSPEC_DEBUG_SYNC

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-sync-deleted-noise-${process.pid}-`))
const roots = []
function freshRoot(label) {
  const rt = join(tmpRoot, label, '.runtime')
  roots.push(join(tmpRoot, label))
  return rt
}
function capture() {
  const warns = [], logs = []
  const ow = console.warn, ol = console.log
  console.warn = (m) => warns.push(String(m))
  console.log = (m) => logs.push(String(m))
  return { warns, logs, restore() { console.warn = ow; console.log = ol } }
}
/** 模拟「下一条 CLI 命令」（新进程）：保 marker 文件，清进程内状态并重绑目录 */
function simulateNextProcess(rt) {
  _resetSyncNoiseForTest()
  bindSyncNoiseRoot(rt)
}

// ─────────────────────────────────────────
// 1. 单元：闸门行为
// ─────────────────────────────────────────
test('单元：首报可见 + marker 落盘 + 进程内重复静默 + 开窗进程不同行照打', () => {
  const rt = freshRoot('u1')
  bindSyncNoiseRoot(rt)

  let cap = capture()
  const shown1 = syncChangeDeletedWarn('c1', '⚠️ [sync] 平台已删除变更「c1」')
  cap.restore()
  assert.equal(shown1, true)
  assert.equal(cap.warns.length, 1, '首报可见（可行动信号不丢）')
  assert.ok(existsSync(join(rt, 'sync-noise-change-deleted.json')), 'marker 已落盘（跨进程窗口）')

  cap = capture()
  const shownDup = syncChangeDeletedWarn('c1', '⚠️ [sync] 平台已删除变更「c1」')
  const shownDiff = syncChangeDeletedLog('c1', 'ℹ️ [sync] c1 预期回执')
  cap.restore()
  assert.equal(shownDup, false, '开窗进程内逐字重复静默')
  assert.equal(shownDiff, true, '开窗进程内不同回执行照打（诊断完整性）')
})

test('单元：后续进程窗口内静默、过期重报', () => {
  const rt = freshRoot('u2')
  bindSyncNoiseRoot(rt)
  syncChangeDeletedWarn('c2', '⚠️ x')

  simulateNextProcess(rt)
  let cap = capture()
  const shownNext = syncChangeDeletedWarn('c2', '⚠️ x')
  cap.restore()
  assert.equal(shownNext, false, '后续进程窗口内静默（每步命令不刷屏）')

  // 窗口过期：手写过去时间戳 → 重报（保活信号）
  writeFileSync(join(rt, 'sync-noise-change-deleted.json'), JSON.stringify({ c2: Date.now() - 11 * 60_000 }) + '\n', 'utf8')
  simulateNextProcess(rt)
  cap = capture()
  const shownExpired = syncChangeDeletedWarn('c2', '⚠️ x')
  cap.restore()
  assert.equal(shownExpired, true, '窗口过期重新首报（不静默死）')
})

test('单元：双变更独立窗口 + 成功清窗（noteChangeDeletedResolved）', () => {
  const rt = freshRoot('u3')
  bindSyncNoiseRoot(rt)
  syncChangeDeletedWarn('a', '⚠️ a')
  syncChangeDeletedWarn('b', '⚠️ b')

  noteChangeDeletedResolved('a')
  const raw = JSON.parse(readFileSync(join(rt, 'sync-noise-change-deleted.json'), 'utf8'))
  assert.equal(raw.a, undefined, 'a 的窗口已清')
  assert.ok(typeof raw.b === 'number', 'b 的窗口不受影响（按变更名精清）')

  simulateNextProcess(rt)
  let cap = capture()
  const shownA = syncChangeDeletedWarn('a', '⚠️ a')
  const shownB = syncChangeDeletedWarn('b', '⚠️ b')
  cap.restore()
  assert.equal(shownA, true, '清窗后 a 重新首报')
  assert.equal(shownB, false, 'b 仍在窗口内静默')
})

test('单元：debug env / noMute / 未绑定目录旁路', () => {
  const rt = freshRoot('u4')
  bindSyncNoiseRoot(rt)
  syncChangeDeletedWarn('c', '⚠️ c') // 开窗

  let cap = capture()
  process.env.SILLYSPEC_DEBUG_SYNC = '1'
  const shownDebug = syncChangeDeletedWarn('c', '⚠️ c')
  delete process.env.SILLYSPEC_DEBUG_SYNC
  const shownNoMute = syncChangeDeletedWarn('c', '⚠️ c', { noMute: true })
  cap.restore()
  assert.ok(shownDebug && shownNoMute, 'debug env 与 noMute（手动 platform sync）全程可见')

  _resetSyncNoiseForTest()
  cap = capture()
  const shownUnbound = syncChangeDeletedWarn('c', '⚠️ c')
  cap.restore()
  assert.equal(shownUnbound, true, '未绑定 runtime 目录时直通（宁多一行不丢信号）')
})

// ─────────────────────────────────────────
// 2. 集成：sync.js 三处接线（mock fetch）
// ─────────────────────────────────────────
const { SyncManager } = await import('../src/sync.js')
const { ProgressManager } = await import('../src/progress.js')

function makeFixture() {
  const cwd = mkdtempSync(join(tmpRoot, `fx-`))
  roots.push(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `platform:\n  url: http://127.0.0.1:9\n  token: test-token\n`, 'utf8')
  return cwd
}
function mockFetch({ progressStatus = 200, progressBody = { ok: true } } = {}) {
  const calls = []
  const impl = async (url, options = {}) => {
    calls.push(`${options.method || 'GET'} ${url}`)
    if (/\/api\/changes\/[^/]+\/progress$/.test(url) && (options.method || 'GET') === 'POST') {
      return {
        ok: progressStatus >= 200 && progressStatus < 300,
        status: progressStatus,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify(progressBody),
      }
    }
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, text: async () => JSON.stringify({ ok: true }) }
  }
  const saved = globalThis.fetch
  globalThis.fetch = impl
  return { calls, restore: () => { globalThis.fetch = saved } }
}
function seedChange(cwd, name) {
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  pm.init(cwd)
  pm.initChange(cwd, name)
  pm._write(cwd, { currentStage: 'plan', stages: { plan: { status: 'in-progress', steps: [{ name: 'a', status: 'completed' }, { name: 'b', status: 'pending' }] } } }, name)
  return pm
}

test('集成：本地 active 撞 409 change_deleted → ⚠️ 首报可见，重复（同进程/后续进程）静默，manual 旁路', async () => {
  const cwd = makeFixture()
  const name = 'plat-deleted-active'
  seedChange(cwd, name)
  _resetSyncNoiseForTest()

  const m = mockFetch({ progressStatus: 409, progressBody: { code: 'change_deleted', message: '该变更已在平台删除', change_name: name } })
  try {
    let cap = capture()
    const r1 = await new SyncManager(cwd).sync(name)
    cap.restore()
    assert.equal(r1.platformDeleted, true, '返回 platformDeleted 标记（接线不变）')
    assert.equal(cap.warns.filter(w => w.includes('平台已删除变更')).length, 1, '首次推送 ⚠️ 可行动回执可见')

    // 同进程第二次推送（同命令多次 triggerSync）：静默
    cap = capture()
    await new SyncManager(cwd).sync(name)
    cap.restore()
    assert.equal(cap.warns.filter(w => w.includes('平台已删除变更')).length, 0, '同进程重复回执静默')

    // 模拟下一条命令（新进程，marker 保留）：仍静默
    _resetSyncNoiseForTest()
    cap = capture()
    await new SyncManager(cwd).sync(name)
    cap.restore()
    assert.equal(cap.warns.filter(w => w.includes('平台已删除变更')).length, 0, '后续进程窗口内静默（不刷屏）')

    // manual（platform sync 手动命令）：旁路可见
    cap = capture()
    await new SyncManager(cwd).sync(name, { manual: true })
    cap.restore()
    assert.equal(cap.warns.filter(w => w.includes('平台已删除变更')).length, 1, 'manual 显式同步回执可见')
  } finally { m.restore() }
})

test('集成：本地 deleted（A 行 info + B 行 ℹ️ 预期回执）→ 首轮两行可见，后续进程全静默', async () => {
  const cwd = makeFixture()
  const name = 'plat-deleted-local-deleted'
  const pm = seedChange(cwd, name)
  pm.deleteChange(cwd, name) // DB status='deleted'（change-delete 收尾态）
  // change-delete 真实流程同步移除实体目录（A 行的触发前提：目录已不在）
  rmSync(join(cwd, '.sillyspec', 'changes', name), { recursive: true, force: true })
  _resetSyncNoiseForTest()

  const m = mockFetch({ progressStatus: 409, progressBody: { code: 'change_deleted', message: '该变更已在平台删除', change_name: name } })
  try {
    let cap = capture()
    await new SyncManager(cwd).sync(name)
    cap.restore()
    assert.ok(cap.logs.some(l => l.includes('继续推送删除终态/墓碑')), '首推 A 行（变更已删除 info）可见')
    assert.ok(cap.logs.some(l => l.includes('属预期回执，无需动作')), '首推 B 行（ℹ️ 预期回执）可见')

    _resetSyncNoiseForTest()
    cap = capture()
    await new SyncManager(cwd).sync(name)
    cap.restore()
    assert.equal(cap.logs.filter(l => l.includes('继续推送删除终态/墓碑') || l.includes('属预期回执')).length, 0, '后续进程 A/B 行均静默')
  } finally { m.restore() }
})

test('集成：推送成功清窗 → 下次 409 回执重新首报', async () => {
  const cwd = makeFixture()
  const name = 'plat-restored'
  seedChange(cwd, name)
  _resetSyncNoiseForTest()

  let m = mockFetch({ progressStatus: 409, progressBody: { code: 'change_deleted', message: 'x', change_name: name } })
  let cap = capture()
  await new SyncManager(cwd).sync(name)
  cap.restore()
  assert.equal(cap.warns.filter(w => w.includes('平台已删除变更')).length, 1, '先吃一次 409 回执（开窗）')
  m.restore()

  // 平台恢复（重放/重建）：推送成功 → 清窗
  m = mockFetch()
  cap = capture()
  await new SyncManager(cwd).sync(name)
  cap.restore()
  assert.ok(cap.logs.some(l => l.includes('已同步变更')), '推送成功照常可见')
  m.restore()

  _resetSyncNoiseForTest()
  m = mockFetch({ progressStatus: 409, progressBody: { code: 'change_deleted', message: 'x', change_name: name } })
  cap = capture()
  await new SyncManager(cwd).sync(name)
  cap.restore()
  assert.equal(cap.warns.filter(w => w.includes('平台已删除变更')).length, 1, '清窗后再次 409 → 重新首报（新故障轮）')
  m.restore()
})

test.after(() => {
  for (const r of roots) { try { rmSync(r, { recursive: true, force: true }) } catch { /* Windows SQLite 句柄延迟释放，best-effort */ } }
  try { rmSync(tmpRoot, { recursive: true, force: true }) } catch {}
})
