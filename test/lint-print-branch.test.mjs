/**
 * lint 打印文案随门禁档位分支（复核修正 P2，ql-20260909-007）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { printVerifyLintCheck } from '../src/verify-postcheck.js'

function capture(fn, env) {
  const lines = []
  const orig = { error: console.error, warn: console.warn, log: console.log }
  const push = (...a) => lines.push(a.join(' '))
  console.error = push; console.warn = push; console.log = push
  const origEnv = process.env.SILLYSPEC_VERIFY_LINT_GATE
  if (env === undefined) delete process.env.SILLYSPEC_VERIFY_LINT_GATE
  else process.env.SILLYSPEC_VERIFY_LINT_GATE = env
  try { fn() } finally {
    console.error = orig.error; console.warn = orig.warn; console.log = orig.log
    if (origEnv === undefined) delete process.env.SILLYSPEC_VERIFY_LINT_GATE
    else process.env.SILLYSPEC_VERIFY_LINT_GATE = origEnv
  }
  return lines.join('\n')
}

const failed = { status: 'failed', command: 'npm run lint', reason: '退出码 1', tally: { failedRuns: 6, totalRuns: 15 } }

test('硬门档（默认）：「已阻断」文案 + 逃生 env；无「不阻断/观察期」旧措辞', () => {
  const out = capture(() => printVerifyLintCheck(failed))
  assert.ok(out.includes('已阻断'), '已阻断字样在场')
  assert.ok(out.includes('SILLYSPEC_VERIFY_LINT_GATE=advisory'), '逃生指引在场')
  assert.ok(!out.includes('不阻断本次完成'), '旧 advisory 措辞退场')
  assert.ok(!out.includes('观察期'), '过期观察期指引退场')
})

test('advisory 档：保留「不阻断」措辞（逃生模式语义一致）', () => {
  const out = capture(() => printVerifyLintCheck(failed), 'advisory')
  assert.ok(out.includes('不阻断本次完成'), 'advisory 档措辞保留')
  assert.ok(!out.includes('已阻断'), '不出现硬门字样')
})

test('passed/skipped 不受档位影响', () => {
  assert.ok(capture(() => printVerifyLintCheck({ status: 'passed', command: 'x', durationMs: 10 })).includes('实测通过'))
  assert.ok(capture(() => printVerifyLintCheck({ status: 'skipped', reason: 'r' })).includes('跳过'))
})
