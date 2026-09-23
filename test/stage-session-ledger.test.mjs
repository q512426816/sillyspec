/**
 * stage-session-ledger（token 减负④，2026-09-23）：阶段-会话账本纯函数。
 *
 * 锁死契约：
 * 1. 同会话连续计数：第 2 个阶段起 crossStageAdvisory=true（R9 实证五阶段 53.5M——
 *    肥上下文税随会话内阶段数单调累积，≥2 即该喊）；
 * 2. 会话切换重置（新会话从 1 起数——换瘦会话后不再误报）；
 * 3. stages 尾窗 8 条防账本无限膨胀；空参容忍（anon 缺省）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { updateStageSessionLedger } from '../src/run/complete.js'

test('T1 同会话连续计数：≥2 触发升级告警', () => {
  const r1 = updateStageSessionLedger(null, 'sess-a', 'brainstorm')
  assert.equal(r1.ledger.stageCount, 1)
  assert.equal(r1.crossStageAdvisory, false, '首个阶段不告警（软提示档）')
  assert.deepEqual(r1.ledger.stages, ['brainstorm'])
  const r2 = updateStageSessionLedger(r1.ledger, 'sess-a', 'plan')
  assert.equal(r2.ledger.stageCount, 2)
  assert.equal(r2.crossStageAdvisory, true, '连续第 2 阶段触发')
  assert.deepEqual(r2.ledger.stages, ['brainstorm', 'plan'])
  const r3 = updateStageSessionLedger(r2.ledger, 'sess-a', 'execute')
  assert.equal(r3.ledger.stageCount, 3)
  assert.equal(r3.crossStageAdvisory, true)
})

test('T2 会话切换重置：换瘦会话后从 1 起数', () => {
  const r1 = updateStageSessionLedger(null, 'sess-a', 'brainstorm')
  const r2 = updateStageSessionLedger(r1.ledger, 'sess-a', 'plan')
  const rNew = updateStageSessionLedger(r2.ledger, 'sess-b', 'execute')
  assert.equal(rNew.ledger.sessionId, 'sess-b')
  assert.equal(rNew.ledger.stageCount, 1, '新会话重置计数')
  assert.equal(rNew.crossStageAdvisory, false, '不误报')
  assert.deepEqual(rNew.ledger.stages, ['execute'])
})

test('T3 stages 尾窗 8 条 + 空参容忍', () => {
  let led = null
  for (let i = 0; i < 10; i++) led = updateStageSessionLedger(led, 's', `stage-${i}`).ledger
  assert.equal(led.stageCount, 10, '总计数不截断')
  assert.equal(led.stages.length, 8, 'stages 尾窗 8 条')
  assert.equal(led.stages[7], 'stage-9')
  const anon = updateStageSessionLedger(null, undefined, null)
  assert.equal(anon.ledger.sessionId, 'anon')
  assert.equal(anon.ledger.stageCount, 1)
})
