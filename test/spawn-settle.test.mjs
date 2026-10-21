/**
 * spawn-settle（2026-10-21-p0-p1-hardening FR-08）
 *
 * dsh z1/z2 各实证一次：Windows 下父进程 spawn detached 子进程后立即退出触发 libuv
 * 断言崩溃（async.c）污染 exit code。awaitSpawnSettled 契约：
 *   S1 'spawn' 事件 → 立即 resolve（不等兜底上限）
 *   S2 'error' 事件 → 立即 resolve（孵化失败也算稳定）
 *   S3 事件均不发 → timeoutMs 兜底 resolve
 *   S4 已退出 child（exitCode/signalCode 已定）→ 零等待立即 resolve
 *   S5 非法入参（null/非 EventEmitter）→ 不抛
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { awaitSpawnSettled, fakeChildForTest } from '../src/spawn-settle.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

test('S1 spawn 事件即 resolve（远早于兜底上限）', async () => {
  const c = fakeChildForTest()
  setTimeout(() => c.emit('spawn'), 10)
  const t0 = Date.now()
  await awaitSpawnSettled(c, 1000)
  assert.ok(Date.now() - t0 < 500, 'spawn 事件驱动，未等满 1000ms 上限')
})

test('S2 error 事件即 resolve', async () => {
  const c = fakeChildForTest()
  setTimeout(() => c.emit('error', new Error('spawn ENOENT')), 5)
  const t0 = Date.now()
  await awaitSpawnSettled(c, 1000)
  assert.ok(Date.now() - t0 < 500, 'error 事件驱动')
})

test('S3 两事件均不发 → timeoutMs 兜底 resolve', async () => {
  const c = fakeChildForTest()
  const t0 = Date.now()
  await awaitSpawnSettled(c, 60)
  const dt = Date.now() - t0
  assert.ok(dt >= 50 && dt < 400, `兜底时长合理（${dt}ms）`)
})

test('S4 已退出 child → 零等待立即 resolve', async () => {
  const exited = fakeChildForTest({ exitCode: 1 })
  const t0 = Date.now()
  await awaitSpawnSettled(exited, 5000)
  assert.ok(Date.now() - t0 < 50, 'exitCode 已定不等待')
  const signaled = fakeChildForTest({ signalCode: 'SIGKILL' })
  await awaitSpawnSettled(signaled, 5000)
  assert.ok(Date.now() - t0 < 100, 'signalCode 已定不等待')
})

test('S5 非法入参不抛', async () => {
  await awaitSpawnSettled(null, 50)
  await awaitSpawnSettled(undefined, 50)
  await awaitSpawnSettled({}, 50)
})
