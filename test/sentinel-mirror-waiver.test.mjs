/**
 * sentinel-mirror-waiver.test.mjs — 哨兵任务来源感知证据判据
 * （2026-09-28-sentinel-mirror-waiver）
 *
 * 覆盖验收面：
 *   ① 镜像勾选豁免：与机器稿基线逐字相同的任务全勾、零提交 token/review → complete（不 fake），
 *      mirrored 列出豁免 id——修「验一个 agent 从未认领的任务面」的假阳性拒收；
 *   ② 覆写守卫不弱化：agent 改写过的任务勾选无证据 → 仍 fake 拒收；
 *   ③ 无基线 fail-safe：baselineTasksMd=null → 全部按覆写任务判（旧行为）；
 *   ④ mirroredTaskIds 边界：改写文本/重编号/基线缺该行 → 不算镜像。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectFakeCheckCompletion, mirroredTaskIds } from '../src/sentinel-assertions.js'

const BASELINE = [
  '---',
  'author: flow-machine-draft',
  '---',
  '# 任务注册表（Tasks）',
  '',
  '- [ ] task-01: 注入段渲染正确',
  '- [ ] task-02: 门回显可见',
  '- [ ] task-03: 精度不回归',
].join('\n')

function checkedMd(mutate = (l) => l) {
  return BASELINE.split('\n').map((l) => mutate(l)).map((l) => l.replace(/^- \[ \] /, '- [x] ')).join('\n')
}

test('① 镜像全勾零证据 → complete＋mirrored 列出（假阳性拒收修复）', () => {
  const r = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: checkedMd(),
    commits: ['chore: 交付（无任务 token）'],
    baselineTasksMd: BASELINE,
    opts: { listReviewsImpl: () => [] },
  })
  assert.equal(r.status, 'complete', `镜像勾选应豁免（实际 ${r.status}，missing=${JSON.stringify(r.missing)}）`)
  assert.deepEqual(r.mirrored.sort(), ['task-01', 'task-02', 'task-03'])
})

test('② 覆写任务无证据 → 仍 fake（守卫不弱化）', () => {
  const rewritten = checkedMd((l) => (l.includes('task-02:') ? '- [ ] task-02: 接线 flow.js 注入段与门回显' : l))
  const r = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: rewritten,
    commits: ['chore: 交付'],
    baselineTasksMd: BASELINE,
    opts: { listReviewsImpl: () => [] },
  })
  assert.equal(r.status, 'fake')
  assert.deepEqual(r.missing, ['task-02'], '只有覆写任务进 missing')
  assert.equal(r.mirrored.length, 2, '镜像两处仍豁免')
})

test('②-b 覆写任务带提交 token → complete', () => {
  const rewritten = checkedMd((l) => (l.includes('task-02:') ? '- [ ] task-02: 接线 flow.js 注入段与门回显' : l))
  const r = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: rewritten,
    commits: ['fix: 接线交付 (task-02)'],
    baselineTasksMd: BASELINE,
    opts: { listReviewsImpl: () => [] },
  })
  assert.equal(r.status, 'complete')
})

test('③ 无基线 fail-safe：null → 全部要求证据（旧行为）', () => {
  const r = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: checkedMd(),
    commits: ['chore: 交付'],
    baselineTasksMd: null,
    opts: { listReviewsImpl: () => [] },
  })
  assert.equal(r.status, 'fake')
  assert.deepEqual(r.missing.sort(), ['task-01', 'task-02', 'task-03'])
})

test('④ mirroredTaskIds 边界：改写文本/重编号/基线缺行 → 非镜像', () => {
  const cur = [
    '- [x] task-01: 注入段渲染正确（补了细节）', // 文本改写 → 非镜像
    '- [x] task-02: 门回显可见',                  // 逐字相同 → 镜像
    '- [x] task-05: 新增任务',                    // 基线无该行 → 非镜像
  ].join('\n')
  const m = mirroredTaskIds({ tasksMd: cur, baselineTasksMd: BASELINE })
  assert.deepEqual([...m], ['task-02'])
  assert.deepEqual([...mirroredTaskIds({ tasksMd: cur, baselineTasksMd: null })], [], '无基线 → 空集（从严）')
})

test('⑤ watcher R1 已退役（2026-09-29-watcher-fakecheck-retire）：镜像/覆写/无 changeDir 翻格均零实时嫌疑', async () => {
  const { applySentinelRules } = await import('../src/watcher.js')
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs')
  const spec = mkdtempSync(join(tmpdir(), 'ss-w-r1-'))
  const change = '2026-09-28-w-drill'
  const changeDir = join(spec, 'changes', change)
  mkdirSync(join(spec, '.runtime'), { recursive: true })
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(spec, '.runtime', `route-hindsight-baseline-${change}.json`),
    JSON.stringify({ schemaVersion: 1, change, design: null, tasks: BASELINE }))
  const snap = (checked) => ({ ts: 1, archived: false, files: { 'tasks.md': { checkedTasks: checked } }, commits: [], reviews: {}, dirtyCode: [] })
  const NL = String.fromCharCode(10)
  const run = (tasksMdText) => {
    writeFileSync(join(changeDir, 'tasks.md'), tasksMdText)
    return applySentinelRules({ prev: snap([]), next: snap(['task-01']), state: null, changeDir })
  }
  // 实时嫌疑警告已整体退役：勾选先于提交是协议正常时序，真裁决在收口哨兵（镜像豁免单源）+ 单拍门
  const mirror = run(['- [x] task-01: 注入段渲染正确', '- [ ] task-02: 门回显可见', '- [ ] task-03: 精度不回归'].join(NL))
  assert.ok(!mirror.warnings.some((w) => w.rule === 'fake-check'), '镜像翻格零警告')
  const rewritten = run(['- [x] task-01: 实现行为 X 的真实工作单元', '- [ ] task-02: 门回显可见', '- [ ] task-03: 精度不回归'].join(NL))
  assert.ok(!rewritten.warnings.some((w) => w.rule === 'fake-check'), '覆写翻格也零实时警告（终态由收口哨兵判）')
  writeFileSync(join(changeDir, 'tasks.md'), '- [x] task-01: 注入段渲染正确' + NL)
  const nocd = applySentinelRules({ prev: snap([]), next: snap(['task-01']), state: null, changeDir: null })
  assert.ok(!nocd.warnings.some((w) => w.rule === 'fake-check'), '无 changeDir 同样零实时警告')
})

test('⑥ 零提交不豁免（角度 A）：镜像全勾＋commits=[] → fake（空转变更不许过门）', () => {
  const r = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: checkedMd(),
    commits: [],
    baselineTasksMd: BASELINE,
    opts: { listReviewsImpl: () => [] },
  })
  assert.equal(r.status, 'fake', '零交付时镜像豁免不生效')
  assert.deepEqual(r.missing.sort(), ['task-01', 'task-02', 'task-03'])
  assert.deepEqual(r.mirrored, [], '零提交时 mirrored 不报告')
})

test('⑦ 基线锚定验证读取器（F2）：无锚信任/锚符放行/锚不符从严＋篡改标记', async () => {
  const { baselineSha256, readBaselineTasksVerified } = await import('../src/route-hindsight.js')
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs')
  const spec = mkdtempSync(join(tmpdir(), 'ss-anchor-'))
  const change = '2026-09-28-anchor'
  mkdirSync(join(spec, '.runtime'), { recursive: true })
  const bp = join(spec, '.runtime', 'route-hindsight-baseline-2026-09-28-anchor.json')
  const payload = { schemaVersion: 1, change, design: null, tasks: BASELINE }
  const dump = () => writeFileSync(bp, JSON.stringify(payload, null, 2) + String.fromCharCode(10))
  dump()
  const h = baselineSha256({ specBase: spec, change })
  assert.ok(/^[0-9a-f]{64}$/.test(h), 'sha256 形态')
  assert.equal(baselineSha256({ specBase: spec, change: 'no-such' }), null, '缺文件 null')
  let v = readBaselineTasksVerified({ specBase: spec, change, anchoredSha256: null })
  assert.equal(v.tampered, false, '无锚（过渡期）信任')
  assert.equal(v.tasksMd, BASELINE)
  v = readBaselineTasksVerified({ specBase: spec, change, anchoredSha256: h })
  assert.equal(v.tampered, false, '锚符放行')
  payload.tasks = BASELINE.replace('task-01', 'task-99')
  dump()
  v = readBaselineTasksVerified({ specBase: spec, change, anchoredSha256: h })
  assert.equal(v.tampered, true, '篡改检出')
  assert.equal(v.tasksMd, null, '按无基线从严')
})
