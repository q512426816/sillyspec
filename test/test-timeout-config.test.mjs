/**
 * test-timeout-config（verify 畅通批①，2026-09-23）：测试/lint 超时配置链。
 *
 * 锁死契约：resolveTestTimeoutMs 三级链 local.yaml commands.test_timeout_sec >
 * env SILLYSPEC_TEST_TIMEOUT_MS > 缺省 600s；非法值（0/负/非数字）逐级下落；
 * 行内注释容忍。R9 实证背景：change-events-r9 后端全量 8181 例实测 27:03，
 * 固定 600s 帽把真慢套件当超时失败（verify --done R1 轮 10 分钟损失）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveTestTimeoutMs } from '../src/verify-postcheck.js'

test('T1 resolveTestTimeoutMs：yaml 键最高优先生效', () => {
  assert.equal(resolveTestTimeoutMs('commands:\n  test: npm test\n  test_timeout_sec: 2400\n', {}), 2_400_000)
  assert.equal(resolveTestTimeoutMs('commands:\n  test_timeout_sec: 90 # 行内注释\n', {}), 90_000, '行内注释容忍')
})

test('T2 非法 yaml 值逐级下落：env > 缺省', () => {
  assert.equal(resolveTestTimeoutMs('commands:\n  test_timeout_sec: 0\n', { SILLYSPEC_TEST_TIMEOUT_MS: '900' }), 900_000, '0 忽略落 env')
  assert.equal(resolveTestTimeoutMs('commands:\n  test_timeout_sec: -5\n', {}), 600_000, '负数忽略落缺省')
  assert.equal(resolveTestTimeoutMs('commands:\n  test: npm test\n', { SILLYSPEC_TEST_TIMEOUT_MS: 'abc' }), 600_000, 'env 非数字落缺省')
})

test('T3 缺省与空参容忍', () => {
  assert.equal(resolveTestTimeoutMs(null, {}), 600_000, '无 yaml 无 env → 600s')
  assert.equal(resolveTestTimeoutMs('', undefined), 600_000, 'env 缺省参数容忍')
})
