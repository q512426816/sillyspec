/**
 * TAP 结构化判账单测（2026-09-28-tap-judge / P2 一期 FR）。
 *
 * 覆盖：非 TAP 回退 null、全过计数、失败用例豁免判定（锚定式命中/未命中）、全豁免通过披露、
 * 真实双报告器命令集成（stdout 纯 TAP + judgeTapOutput 判 passed）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

import { judgeTapOutput } from '../src/verify-postcheck.js'

// 仓根锚定（run-tests.mjs 以 cwd=test/ 起本文件——相对路径夹具会解析到 test/test/…，
// 套件内恒挂快速 exit 1 而单跑恒过；夹具路径与 cwd 一律从 import.meta.url 推导）
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const TAP_FAIL = [
  'TAP version 13',
  '# Subtest: ① 通过用例',
  'ok 1 - ① 通过用例',
  '# Subtest: ⑮ 承诺词必评全链',
  'not ok 2 - ⑮ 承诺词必评全链：任务书下发',
  '  ---',
  '  error: 预期错误文案 fixture（通过用例故意打印）',
  '  ...',
  'not ok 3 - 真实失败用例甲',
  '1..3',
  '# tests 3',
  '# fail 2',
].join('\n')

test('非 TAP 输出 → null（回退 legacy）', () => {
  assert.equal(judgeTapOutput(1, '✖ some fail\nAssertionError boom', null, ['x']), null)
  assert.equal(judgeTapOutput(0, '普通 stdout', null, []), null)
})

test('TAP 全过 exit 0 → passed 带计数', () => {
  const tap = ['TAP version 13', 'ok 1 - a', 'ok 2 - b', '1..2'].join('\n')
  const j = judgeTapOutput(0, tap, 'deps(auto-js)', [])
  assert.equal(j.status, 'passed')
  assert.deepEqual(j.tap, { total: 2, failed: 0 })
})

test('TAP 失败：锚定式豁免 1 条 + 未豁免 1 条 → failed 且 remaining 精确到用例行', () => {
  const j = judgeTapOutput(1, TAP_FAIL, 'deps(auto-js)', ['^not ok 2 - ⑮ 承诺词必评全链'])
  assert.equal(j.status, 'failed')
  assert.equal(j.tap.failed, 2)
  assert.equal(j.exemptedLines.length, 1)
  assert.equal(j.remainingLines.length, 1)
  assert.ok(j.remainingLines[0].includes('真实失败用例甲'))
  // fixture 正文行（error: 预期错误文案）不再参与判账——自由文本误计对 TAP 路径消失
  assert.ok(!j.remainingLines.some(l => l.includes('fixture')))
})

test('TAP 全豁免 → passed 带锚定式披露', () => {
  const j = judgeTapOutput(1, TAP_FAIL, 'deps(auto-js)', ['^not ok 2 - ⑮', '^not ok 3 - 真实失败'])
  assert.equal(j.status, 'passed')
  assert.ok(j.reason.includes('全部命中'))
  assert.ok(j.reason.includes('全部锚定式命中'))
})

test('TAP 失败无清单 → failed 且 not-ok 行全量入 remaining', () => {
  const j = judgeTapOutput(1, TAP_FAIL, 'deps(auto-js)', [])
  assert.equal(j.status, 'failed')
  assert.equal(j.remainingLines.length, 2)
})

test('集成：双报告器命令 stdout 为纯 TAP 且可判账', () => {
  const args = ['--test', '--test-reporter=spec', '--test-reporter-destination=stderr', '--test-reporter=tap', '--test-reporter-destination=stdout',
    join(REPO_ROOT, 'test', 'fr-compound-split.test.mjs'), join(REPO_ROOT, 'test', 'ui-visual-guidance.test.mjs')]
  let out = ''
  let code = 0
  // 嵌套坑：父 node:test 进程带 NODE_TEST_CONTEXT env，子 node --test 会误入 child 模式
  // （stdout 空）——剥掉该键再 spawn（与门进程 spawn 测试同族的嵌套隔离先例）。
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  try {
    out = execFileSync(process.execPath, args, { encoding: 'utf8', timeout: 120000, cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'], env })
  } catch (e) {
    code = e.status ?? 1
    out = e.stdout?.toString() || ''
  }
  assert.equal(code, 0)
  assert.match(out.split('\n')[0], /^TAP version \d+/)
  const j = judgeTapOutput(code, out, 'deps(auto-js)', [])
  assert.equal(j.status, 'passed')
  assert.ok(j.tap.total >= 2)
})
