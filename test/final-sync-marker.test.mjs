/**
 * 终态 marker 生命周期单测（2026-11-09-terminal-sync-background / final-sync.js）。
 *
 * 覆盖：write/read 往返、脏件容错、bg 收敛（finalizePending 按 treeOk 写 ok/failed、
 * 终态已收敛的 marker 不触碰）、命令侧消费（consume：ok 静默清理 / failed 🚨+自救+清理 /
 * pending 未超 TTL 跳过 / 超时 pending 验证 ok 删除 / 验证失败报横幅+清理）。
 */
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import {
  FINAL_SYNC_PENDING_TTL_MS,
  writeFinalSyncMarker,
  readFinalSyncMarkers,
  finalizePendingFinalSyncMarkers,
  consumeFinalSyncMarkers,
} from '../src/final-sync.js'

let cwd
let savedEnv
const errCapture = []

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'sillyspec-final-sync-'))
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  savedEnv = { ...process.env }
  errCapture.length = 0
  console.error = ((...args) => { errCapture.push(args.join(' ')) })
})

afterEach(() => {
  console.error = (() => {})
  process.env = savedEnv
  try { rmSync(cwd, { recursive: true, force: true }) } catch { /* 临时目录清理失败不影响断言 */ }
})

// ── write/read 往返与容错 ───────────────────────────────────────────────────

test('write → read 往返：change/status/ts 齐全，detail 按需携带', async () => {
  await writeFinalSyncMarker(cwd, {}, 'c1', 'pending')
  await writeFinalSyncMarker(cwd, {}, 'c2', 'failed', '同步请求失败 HTTP 504')
  const markers = await readFinalSyncMarkers(cwd, {})
  assert.equal(markers.length, 2)
  const byChange = Object.fromEntries(markers.map((m) => [m.change, m]))
  assert.equal(byChange.c1.status, 'pending')
  assert.equal(byChange.c2.status, 'failed')
  assert.equal(byChange.c2.detail, '同步请求失败 HTTP 504')
  assert.ok(typeof byChange.c1.ts === 'number' && byChange.c1.ts > 0)
})

test('read 容错：目录不存在返回空、脏 json 跳过不抛', async () => {
  assert.deepEqual(await readFinalSyncMarkers(cwd, {}), [])
  await writeFinalSyncMarker(cwd, {}, 'c1', 'pending')
  // 手工写一个脏件（非 json）——与合法 marker 同目录
  const dir = join(cwd, '.sillyspec', '.runtime', 'temp', 'final-sync')
  writeFileSync(join(dir, 'broken.json'), '{not json')
  const markers = await readFinalSyncMarkers(cwd, {})
  assert.equal(markers.length, 1)
  assert.equal(markers[0].change, 'c1')
})

// ── finalizePending（bg 子进程侧收敛）─────────────────────────────────────

test('finalizePending：pending 按 treeOk 收敛 ok/failed（failed 携 detail），已终态 marker 不触碰', async () => {
  await writeFinalSyncMarker(cwd, {}, 'p1', 'pending')
  await writeFinalSyncMarker(cwd, {}, 'p2', 'pending')
  await writeFinalSyncMarker(cwd, {}, 'done', 'ok')
  const syncCalls = []
  await finalizePendingFinalSyncMarkers(cwd, {}, {
    syncImpl: async (name) => {
      syncCalls.push(name)
      return name === 'p1' ? { synced: 1, treeOk: true } : { synced: 0, treeOk: false, errors: ['HTTP 504'] }
    },
  })
  assert.deepEqual(syncCalls.sort(), ['p1', 'p2']) // ok marker 不触发补推
  const byChange = Object.fromEntries((await readFinalSyncMarkers(cwd, {})).map((m) => [m.change, m]))
  assert.equal(byChange.p1.status, 'ok')
  assert.equal(byChange.p2.status, 'failed')
  assert.equal(byChange.p2.detail, 'HTTP 504')
  assert.equal(byChange.done.status, 'ok') // 已终态不动
})

test('finalizePending：syncImpl 抛异常 → failed（detail 携错误消息）', async () => {
  await writeFinalSyncMarker(cwd, {}, 'p1', 'pending')
  await finalizePendingFinalSyncMarkers(cwd, {}, {
    syncImpl: async () => { throw new Error('网络炸了') },
  })
  const markers = await readFinalSyncMarkers(cwd, {})
  assert.equal(markers[0].status, 'failed')
  assert.equal(markers[0].detail, '网络炸了')
})

// ── consume（命令侧补报消费）────────────────────────────────────────────

test('consume：ok marker 静默清理（零输出零残留）', async () => {
  await writeFinalSyncMarker(cwd, {}, 'c1', 'ok')
  await consumeFinalSyncMarkers(cwd, {}, { syncImpl: async () => { throw new Error('不应被调') } })
  assert.deepEqual(await readFinalSyncMarkers(cwd, {}), [])
  assert.equal(errCapture.length, 0)
})

test('consume：failed marker → 🚨 横幅 + 自救命令 + 清理（不重复骚扰）', async () => {
  await writeFinalSyncMarker(cwd, {}, 'c1', 'failed', '同步请求失败 HTTP 504')
  await consumeFinalSyncMarkers(cwd, {}, { syncImpl: async () => { throw new Error('不应被调') } })
  const out = errCapture.join('\n')
  assert.ok(out.includes('终态同步补报'), out)
  assert.ok(out.includes('c1'), out)
  assert.ok(out.includes('sillyspec platform sync --change c1'), out)
  assert.deepEqual(await readFinalSyncMarkers(cwd, {}), []) // 消费即清理
})

test('consume：pending 未超 TTL → 跳过不动（等 bg 子进程收敛）', async () => {
  await writeFinalSyncMarker(cwd, {}, 'c1', 'pending')
  await consumeFinalSyncMarkers(cwd, {}, { now: Date.now(), syncImpl: async () => { throw new Error('不应被调') } })
  const markers = await readFinalSyncMarkers(cwd, {})
  assert.equal(markers.length, 1)
  assert.equal(markers[0].status, 'pending')
})

test('consume：pending 超 TTL + 验证性同步 ok → 静默清理', async () => {
  await writeFinalSyncMarker(cwd, {}, 'c1', 'pending')
  await consumeFinalSyncMarkers(cwd, {}, {
    now: Date.now() + FINAL_SYNC_PENDING_TTL_MS + 1,
    syncImpl: async () => ({ synced: 0, treeOk: true }),
  })
  assert.deepEqual(await readFinalSyncMarkers(cwd, {}), [])
  assert.equal(errCapture.length, 0)
})

test('consume：pending 超 TTL + 验证性同步失败 → 🚨 补报 + 清理（宁可重复不静默）', async () => {
  await writeFinalSyncMarker(cwd, {}, 'c1', 'pending')
  await consumeFinalSyncMarkers(cwd, {}, {
    now: Date.now() + FINAL_SYNC_PENDING_TTL_MS + 1,
    syncImpl: async () => ({ synced: 0, treeOk: false, errors: ['HTTP 504'] }),
  })
  const out = errCapture.join('\n')
  assert.ok(out.includes('终态同步补报'), out)
  assert.ok(out.includes('sillyspec platform sync --change c1'), out)
  assert.deepEqual(await readFinalSyncMarkers(cwd, {}), [])
})
