/**
 * review-rerun-scope.test.mjs — 评审复跑口径 + ledger 测试回执子源（2026-10-21-review-rerun-scope）
 *
 * 四份评审子代会话画像实证：复跑面无口径导致评审内全量套件（最重单次 8.4min×2 轮）。
 * 锁：①任务书复跑口径五要素；②findLatestTestReceipt 取最新匹配/缺席 null/坏 JSON 跳过；
 * ③assembleReviewPack 回执行在场/缺席零注入。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderReviewerTaskbook } from '../src/flow-review.js'
import { findLatestTestReceipt, assembleReviewPack } from '../src/flow-review-pack.js'

test('① 任务书复跑口径五要素锚', () => {
  const tb = renderReviewerTaskbook({ change: '2026-10-21-x', changeDir: 'C:/x', head: 'a'.repeat(40), probeLines: [], packLines: [] })
  assert.ok(tb.includes('【复跑口径（与 AGENTS 自验口径同源——2026-10-21-review-rerun-scope）】'), '节标题在场')
  assert.ok(tb.includes('按「变更测试面」复跑'), '要素①变更测试面')
  assert.ok(tb.includes('多文件合并一次 node --test 跑'), '要素②合并一次')
  assert.ok(tb.includes('全量套件禁止'), '要素③全量禁止')
  assert.ok(tb.includes('ledger 收口实测已跑变更面、pre-push 门会跑全量'), '要素③依据')
  assert.ok(tb.includes('以回执为基线抽验复核，勿整体重跑'), '要素④回执抽验')
  assert.ok(tb.includes('logs/` 日志回看尾部'), '要素⑤日志落盘')
  const idxScope = tb.indexOf('【复跑口径')
  const idxDiscipline = tb.indexOf('【纪律】')
  assert.ok(idxScope > 0 && idxDiscipline > idxScope, '位置：检查单之后、纪律之前')
})

test('② findLatestTestReceipt：取最新匹配 / 缺席 null / 坏 JSON 跳过 / 他变更不串', () => {
  const root = mkdtempSync(join(tmpdir(), 'rrs-'))
  const vr = join(root, 'verify-runs')
  const mk = (runId, obj) => {
    mkdirSync(join(vr, runId), { recursive: true })
    writeFileSync(join(vr, runId, 'test-result.json'), JSON.stringify(obj))
  }
  mk('20261020215900', { change: 'other-change', status: 'passed', exit_code: 0 })
  mk('20261020220000', { change: 'my-change', status: 'failed', exit_code: 1, duration_ms: 62000, command: 'node --test a b', ran_at: 't1' })
  mkdirSync(join(vr, '20261020220500'), { recursive: true }); writeFileSync(join(vr, '20261020220500', 'test-result.json'), '{broken') // 坏 JSON 跳过
  mk('20261020221000', { change: 'my-change', status: 'passed', exit_code: 0, duration_ms: 45000, command: 'node --test c d e', ran_at: 't2' })
  const r = findLatestTestReceipt(vr, 'my-change')
  assert.ok(r && r.ran_at === 't2', `取最新匹配轮（实际 ran_at=${r && r.ran_at}）`)
  assert.equal(findLatestTestReceipt(vr, 'no-such'), null, '无匹配 → null')
  assert.equal(findLatestTestReceipt(join(root, 'absent'), 'my-change'), null, '目录缺席 → null')
  assert.equal(findLatestTestReceipt(null, 'x'), null, '空参安全')
  rmSync(root, { recursive: true, force: true })
})

test('③ assembleReviewPack：回执行在场/缺席零注入', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rrs-p-'))
  const reqPath = join(dir, 'requirements.md')
  writeFileSync(reqPath, '### FR-01: 夹具\n## 测试绑定\nFR-01: test/x「y」\n')
  const packIn = { changeDir: dir, patchText: 'diff --git a/src/a.js b/src/a.js\n@@ -1 +1 @@\n-x\n+y\n' }
  const withR = assembleReviewPack({ ...packIn, testReceipt: { change: 'c', status: 'passed', exit_code: 0, duration_ms: 45000, command: 'node --test c d e', ran_at: '2026-10-21T00:00:00Z' } })
  const textR = withR.lines.join('\n')
  assert.ok(textR.includes('ledger 测试回执（CLI 收口亲测，2026-10-21T00:00:00Z）：passed exit=0 45s ｜ 面：node --test c d e'), '回执行机械渲染')
  assert.ok(textR.includes('评审按复跑口径抽验变更面即可，勿整体重跑'), '抽验指引行')
  const withoutR = assembleReviewPack(packIn)
  assert.ok(!withoutR.lines.join('\n').includes('测试回执'), '缺席零注入')
  rmSync(dir, { recursive: true, force: true })
})
