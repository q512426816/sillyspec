/**
 * done-heartbeat（2026-10-21-p0-p1-hardening FR-03）
 *
 * dsh z2 实证：verify 纯文档步骤 --done 静默挂起 >5 分钟，agent 无从分辨在跑还是死锁。
 * 锁死契约（withDoneHeartbeat，completeStep/completeStepBurst 外层薄 wrapper）：
 *   H1 快路径零输出（<interval 完成 → 无心跳行，返回值透传）
 *   H2 慢路径心跳行（>2×interval → ≥2 行 stderr 进度行，含 label；结束后不再打印）
 *   H3 异常路径清理（fn throw → 心跳清除 + 异常透传）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withDoneHeartbeat } from '../src/run/complete.js'

/** 捕获 console.error 全程（含 fn 内部的异步期）——restore 必须在 await 完成之后 */
async function withCapturedStderr(fn) {
  const orig = console.error
  const lines = []
  console.error = (...a) => lines.push(a.join(' '))
  try {
    const value = await fn()
    return { lines, value }
  } finally {
    console.error = orig
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

test('H1 快路径：interval 内完成 → 零心跳输出，返回值透传', async () => {
  const { lines, value } = await withCapturedStderr(() => withDoneHeartbeat('test --done', async () => 'ret-value', { intervalMs: 200 }))
  assert.equal(value, 'ret-value', '返回值透传')
  await sleep(230) // 结束后不再打印
  assert.deepEqual(lines, [], `快路径零输出：${lines}`)
})

test('H2 慢路径：超 interval → stderr 心跳行（含 label 与时长），结束即停', async () => {
  const { lines } = await withCapturedStderr(() => withDoneHeartbeat('verify --done', () => sleep(150), { intervalMs: 40 }))
  const beats = lines.filter((l) => l.includes('verify --done') && l.includes('收口链仍在执行'))
  assert.ok(beats.length >= 2, `≥2 行心跳：${lines}`)
  assert.ok(beats.every((l) => l.includes('旁路核对')), '心跳行含旁路核对建议')
  const count = lines.length
  await sleep(120)
  assert.equal(lines.length, count, '结束后不再打印（finally 清理）')
})

test('H3 异常路径：fn throw → 异常透传 + 心跳清理', async () => {
  const fast = await withCapturedStderr(async () => {
    try { return await withDoneHeartbeat('boom --done', async () => { await sleep(50); throw new Error('boom') }, { intervalMs: 500 }) }
    catch (e) { return e }
  })
  assert.match(String(fast.value?.message || fast.value), /boom/, '异常透传（不吞）')
  assert.deepEqual(fast.lines, [], 'interval 未到即抛 → 无心跳行')
  const slow = await withCapturedStderr(async () => {
    try { return await withDoneHeartbeat('boom2 --done', async () => { await sleep(100); throw new Error('boom2') }, { intervalMs: 30 }) }
    catch (e) { return e }
  })
  assert.match(String(slow.value?.message || slow.value), /boom2/)
  assert.ok(slow.lines.length >= 1, `throw 前心跳已打：${slow.lines}`)
  const n = slow.lines.length
  await sleep(120)
  assert.equal(slow.lines.length, n, '抛出后心跳停止')
})
