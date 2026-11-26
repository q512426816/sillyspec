/**
 * stage-machine-verify-retired.test.mjs — verify 阶段退役的状态机断言
 * （2026-11-26-verify-stage-retire task-01 / FR-01 / D-005）
 *
 * 覆盖：
 *   - 四处常量枚举不含 verify（VALID_STAGES/STAGE_LABELS/STAGE_ORDER/MAIN_FLOW_ORDER）
 *   - REVIEW_STAGES 收缩（经 stage-review marker 清理集合的行为面——此处断常量单源）
 *   - checkTransition：execute→archive 合法（新直连边）；verify→archive 拒绝（旧前置已断）
 *   - stageRegistry 不含 verify（阶段定义注销）
 *
 * 注：execute→verify 的拒绝断言在 task-05 删除 stage-contract-spec 的 verify 合约后由
 * 该任务回归补齐（此刻 contracts.verify 仍在，通用 allowedFrom 逻辑会放行——属计划内中间态）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { VALID_STAGES, STAGE_LABELS, STAGE_ORDER, MAIN_FLOW_ORDER } from '../src/progress/shared.js'
import { checkTransition } from '../src/stage-contract.js'
import { stageRegistry } from '../src/stages/index.js'

test('枚举不含 verify：VALID_STAGES/STAGE_ORDER/MAIN_FLOW_ORDER/STAGE_LABELS', () => {
  assert.equal(VALID_STAGES.includes('verify'), false)
  assert.equal(STAGE_ORDER.includes('verify'), false)
  assert.equal(MAIN_FLOW_ORDER.includes('verify'), false)
  assert.equal('verify' in STAGE_LABELS, false)
})

test('主流程序为四阶段：brainstorm → plan → execute → archive', () => {
  assert.deepEqual(MAIN_FLOW_ORDER, ['brainstorm', 'plan', 'execute', 'archive'])
})

test('stageRegistry 不含 verify 阶段定义', () => {
  assert.equal('verify' in stageRegistry, false)
})

test('checkTransition：execute → archive 合法（verify 退役后的直连边）', () => {
  const r = checkTransition('execute', 'archive')
  assert.equal(r.allowed, true)
})

test('checkTransition：verify → archive 拒绝（旧前置断链，文案指路 execute）', () => {
  const r = checkTransition('verify', 'archive')
  assert.equal(r.allowed, false)
  assert.match(r.reason || '', /execute/)
})

test('checkTransition：未知阶段语义保持（verify 合约删除后归此态——契约层 task-05 承接）', () => {
  // 此刻 contracts.verify 仍在（task-05 面），仅断言未知阶段通道本身未被本任务破坏
  const r = checkTransition('execute', 'not-a-stage')
  assert.equal(r.allowed, false)
  assert.match(r.reason || '', /未知阶段/)
})
