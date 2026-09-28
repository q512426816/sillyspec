/**
 * route-hindsight.test.mjs — 轻量道事后闭环指标（2026-09-28-unclear-req-to-brainstorm task-01 / FR-02）
 *
 * 覆盖验收面：
 *   ① 指标计算正反例：首版快照→终稿行级 diff 比例（正例）；agent 只填槽/轻微编辑的
 *      真实形态回放 FP=0（反例）；无快照=零信号；CRLF/LF 归一不虚增比例；
 *   ② 阈值边界：designRewriteRatio >0.5（等于不过）/ tasksRewriteRatio >0.6 /
 *      blindDims ≥2 / testFailures ≥2 四路常量边界；
 *   ③ 落库幂等：超阈整文件覆盖（per-repo 单条），无超阈不落库（marked:false）；
 *   ④ readHindsightHint：无文件/损坏 JSON → null；有标记 → 含变更名与形态计数的「疑似」提示。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  computeHindsightMetrics, markHindsight, readHindsightHint, snapshotBaseline, HINDSIGHT_THRESHOLDS,
} from '../src/route-hindsight.js'

const CHANGE = '2026-09-28-c-x'

/** root 即 specBase 角色（.runtime/ 与 changes/ 的父目录——与 flow.js 真实布局同构）。 */
function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'rh-'))
  const changeDir = join(root, 'changes', CHANGE)
  mkdirSync(changeDir, { recursive: true })
  return { root, changeDir, runtime: join(root, '.runtime') }
}

function writeBaseline(root, { design = null, tasks = null } = {}) {
  mkdirSync(join(root, '.runtime'), { recursive: true })
  writeFileSync(join(root, '.runtime', `route-hindsight-baseline-${CHANGE}.json`), JSON.stringify({
    schemaVersion: 1, change: CHANGE, capturedAt: '2026-09-28T00:00:00.000Z', design, tasks,
  }))
}

function writeRun(root, dir, fields) {
  const d = join(root, '.runtime', 'verify-runs', dir)
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'test-result.json'), JSON.stringify({ command: 'npm test', exit_code: 1, ...fields }))
}

const REVIEW_OK = { dimensionNotes: { 乱序: 'ok', 并发: 'ok', 切换: 'n/a', 作用域: 'n/a' } }
const REVIEW_2FINDING = { dimensionNotes: { 乱序: 'finding', 并发: 'finding', 切换: 'ok', 作用域: 'n/a' } }

test('① 快照：首写捕获＋首写者胜（幂等，R-04）', () => {
  const { root, changeDir } = makeRepo()
  writeFileSync(join(changeDir, 'design.md'), '# 设计\nv1\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# 任务\nv1\n')
  const r1 = snapshotBaseline({ specBase: root, change: CHANGE, changeDir })
  assert.equal(r1.captured, true, `首次捕获: ${JSON.stringify(r1)}`)
  const r2 = snapshotBaseline({ specBase: root, change: CHANGE, changeDir })
  assert.equal(r2.captured, false, '二次调用不覆盖（首写者胜）')
  const j = JSON.parse(readFileSync(join(root, '.runtime', `route-hindsight-baseline-${CHANGE}.json`), 'utf8'))
  assert.equal(j.design, '# 设计\nv1\n')
  rmSync(root, { recursive: true, force: true })
})

test('① 指标计算正例：四元组各就各位', () => {
  const { root, changeDir } = makeRepo()
  // design：4 行改 3 行 → LCS=1 → (4-1)/4 = 0.75
  writeBaseline(root, { design: 'a\nb\nc\nd', tasks: 't1\nt2\nt3\nt4\nt5' })
  writeFileSync(join(changeDir, 'design.md'), 'a\nx\ny\nz')
  writeFileSync(join(changeDir, 'tasks.md'), 't1\nt2\nT3\nt4\nt5') // 5 行改 1 行 → 0.2
  writeRun(root, '20260928T000001', { change: CHANGE, status: 'failed' })
  writeRun(root, '20260928T000002', { change: CHANGE, status: 'failed' })
  writeRun(root, '20260928T000003', { change: CHANGE, status: 'passed' }) // 通过不计
  writeRun(root, '20260928T000004', { change: '别的变更', status: 'failed' }) // 他变更不计
  const m = computeHindsightMetrics({ changeDir, reviewJson: REVIEW_2FINDING, flowState: { tier: 'thin' } })
  assert.equal(m.designRewriteRatio, 0.75)
  assert.equal(m.tasksRewriteRatio, 0.2)
  assert.equal(m.blindDims, 2)
  assert.equal(m.testFailures, 2)
  assert.equal(m.raw.baselinePresent, true)
  assert.equal(m.raw.flowTier, 'thin')
  rmSync(root, { recursive: true, force: true })
})

test('① 反例（真实形态回放 FP=0）：agent 只填 AGENT 槽（纯增行）＋评审全 ok＋零实测失败 → 不标记', () => {
  const { root, changeDir } = makeRepo()
  const designV1 = [
    '# 设计记录',
    '<!--AGENT:槽1 做法 -->',
    '<!--AGENT:槽2 接口契约 -->',
    '<!--AGENT:槽3 盲维四问作答 -->',
    '<!--AGENT:槽4 风险 -->',
  ].join('\n')
  // 终稿＝首版逐字保留＋槽下追加作答行（computeEditRatio 口径：纯增行不改写原文不计入）
  const designFinal = designV1 + '\n复用既有模块，无新接口。\n不适用：单仓单进程\n不适用：无并发面\n风险低'
  const tasksV1 = '- [ ] task-01: 初始草稿'
  writeBaseline(root, { design: designV1, tasks: tasksV1 })
  writeFileSync(join(changeDir, 'design.md'), designFinal)
  writeFileSync(join(changeDir, 'tasks.md'), tasksV1 + '\n- [x] task-01: 已完成')
  writeRun(root, '20260928T000009', { change: CHANGE, status: 'passed' })
  const m = computeHindsightMetrics({ changeDir, reviewJson: REVIEW_OK, flowState: { tier: 'thin' } })
  assert.equal(m.designRewriteRatio, 0)
  assert.equal(m.tasksRewriteRatio, 0)
  assert.equal(m.blindDims, 0)
  assert.equal(m.testFailures, 0)
  const mk = markHindsight({ cwd: root, specBase: root, change: CHANGE, metrics: m })
  assert.equal(mk.marked, false)
  assert.equal(existsSync(join(root, '.runtime', 'route-hindsight.json')), false, '无超阈不落库')
  rmSync(root, { recursive: true, force: true })
})

test('① 无快照（旧变更/起草失败）→ 比例零信号，不误标', () => {
  const { root, changeDir } = makeRepo()
  writeFileSync(join(changeDir, 'design.md'), 'x\n')
  const m = computeHindsightMetrics({ changeDir, reviewJson: null, flowState: null })
  assert.equal(m.designRewriteRatio, 0)
  assert.equal(m.tasksRewriteRatio, 0)
  assert.equal(m.blindDims, 0)
  assert.equal(m.raw.baselinePresent, false)
  rmSync(root, { recursive: true, force: true })
})

test('① CRLF 归一：首版 LF、终稿 CRLF，内容相同 → 比例 0（跨平台不虚增）', () => {
  const { root, changeDir } = makeRepo()
  writeBaseline(root, { design: 'l1\nl2\nl3' })
  writeFileSync(join(changeDir, 'design.md'), 'l1\r\nl2\r\nl3')
  const m = computeHindsightMetrics({ changeDir, reviewJson: null, flowState: null })
  assert.equal(m.designRewriteRatio, 0)
  rmSync(root, { recursive: true, force: true })
})

test('② 阈值边界：等于不过（> 口径）／超过即过——四路常量', () => {
  assert.equal(HINDSIGHT_THRESHOLDS.designRewriteRatio, 0.5)
  assert.equal(HINDSIGHT_THRESHOLDS.tasksRewriteRatio, 0.6)
  assert.equal(HINDSIGHT_THRESHOLDS.blindDims, 2)
  assert.equal(HINDSIGHT_THRESHOLDS.testFailures, 2)
  const mk = (root, metrics) => markHindsight({ cwd: root, specBase: root, change: CHANGE, metrics })
  const cases = [
    [{ designRewriteRatio: 0.5 }, false], [{ designRewriteRatio: 0.51 }, true],
    [{ tasksRewriteRatio: 0.6 }, false], [{ tasksRewriteRatio: 0.61 }, true],
    [{ blindDims: 1 }, false], [{ blindDims: 2 }, true],
    [{ testFailures: 1 }, false], [{ testFailures: 2 }, true],
  ]
  for (const [metrics, expect] of cases) {
    const root = mkdtempSync(join(tmpdir(), 'rh-b-'))
    const r = mk(root, metrics)
    assert.equal(r.marked, expect, `边界 ${JSON.stringify(metrics)} 应 ${expect ? '标记' : '不标记'}`)
    assert.equal(existsSync(join(root, '.runtime', 'route-hindsight.json')), expect)
    rmSync(root, { recursive: true, force: true })
  }
})

test('③ 落库幂等：重复 mark 同内容整文件覆盖，字段齐全（per-repo 单条）', () => {
  const root = mkdtempSync(join(tmpdir(), 'rh-m-'))
  const metrics = { designRewriteRatio: 0.8, tasksRewriteRatio: 0.1, blindDims: 0, testFailures: 0, raw: {} }
  const r1 = markHindsight({ cwd: root, specBase: root, change: CHANGE, metrics })
  assert.equal(r1.marked, true)
  const p = join(root, '.runtime', 'route-hindsight.json')
  const j1 = JSON.parse(readFileSync(p, 'utf8'))
  assert.equal(j1.change, CHANGE)
  assert.ok(j1.marked_at)
  assert.deepEqual(j1.metrics, { designRewriteRatio: 0.8, tasksRewriteRatio: 0.1, blindDims: 0, testFailures: 0 })
  assert.ok(Array.isArray(j1.reasons) && j1.reasons.length === 1 && j1.reasons[0].includes('design'), `reasons: ${JSON.stringify(j1.reasons)}`)
  const r2 = markHindsight({ cwd: root, specBase: root, change: CHANGE, metrics })
  assert.equal(r2.marked, true)
  const j2 = JSON.parse(readFileSync(p, 'utf8'))
  assert.equal(j2.change, CHANGE, '整文件覆盖仍单条')
  rmSync(root, { recursive: true, force: true })
})

test('④ readHindsightHint：无文件/损坏 JSON → null；有标记 → 疑似提示含变更名与计数', () => {
  const root = mkdtempSync(join(tmpdir(), 'rh-h-'))
  assert.equal(readHindsightHint({ specBase: root }), null, '无文件 → null')
  mkdirSync(join(root, '.runtime'), { recursive: true })
  writeFileSync(join(root, '.runtime', 'route-hindsight.json'), '{not json')
  assert.equal(readHindsightHint({ specBase: root }), null, '损坏 JSON → null')
  markHindsight({ cwd: root, specBase: root, change: CHANGE, metrics: { designRewriteRatio: 0.9, tasksRewriteRatio: 0.2, blindDims: 3, testFailures: 2 } })
  const hint = readHindsightHint({ specBase: root })
  assert.ok(typeof hint === 'string' && hint.length > 0, '有标记 → 文案')
  assert.ok(hint.includes(CHANGE), `含变更名: ${hint}`)
  assert.ok(hint.includes('疑似'), '措辞「疑似」非定罪')
  assert.ok(hint.includes('90%'), `含 design 比例: ${hint}`)
  assert.ok(hint.includes('盲维') && hint.includes('3'), `含盲维计数: ${hint}`)
  assert.ok(hint.includes('2'), `含实测失败计数: ${hint}`)
  rmSync(root, { recursive: true, force: true })
})
