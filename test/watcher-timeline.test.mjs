/**
 * watcher-timeline.test.mjs — 合成时间线纯函数组（2026-09-26-watcher-timeline）。
 *
 * 覆盖面（零真仓零真 fs——git 经注入面、其余纯数据直构）：
 *   ① parseTaskLines：勾选/未勾/无冒号/无 id 行不入判；
 *   ② inferFlipTimes：多拍衔接赋值、逐拍、计数链断裂标 broken、链未全覆盖标 broken、空输入；
 *   ③ resolveCommitAnchors：注入 gitLook 解析/失联、token 提取（含正文）与去重；
 *   ④ renderTimeline：三段齐备渲染、任务面缺失降级、hash 失联标注、勾选时刻 ≈ 与 ? 形态。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const {
  parseTaskLines, inferFlipTimes, resolveCommitAnchors, renderTimeline, loadChangeTasks,
} = await import('../src/timeline.js')

// ───────────────────── parseTaskLines ─────────────────────

test('parseTaskLines：勾选/未勾/无冒号描述/无 id 行不入判', () => {
  const md = [
    '# 任务注册表',
    '- [x] task-01: 完成甲单元',
    '- [ ] task-02 乙单元无冒号',
    '- [X] task-03: 大写 X',
    '- [x] 无 id 的勾选行',
    '- 普通列表行',
  ].join('\n')
  const rows = parseTaskLines(md)
  assert.equal(rows.length, 3)
  assert.deepEqual(rows[0], { id: 'task-01', checked: true, desc: '完成甲单元' })
  assert.deepEqual(rows[1], { id: 'task-02', checked: false, desc: '乙单元无冒号' })
  assert.deepEqual(rows[2], { id: 'task-03', checked: true, desc: '大写 X' })
  assert.equal(parseTaskLines(null).length, 0)
})

// ───────────────────── inferFlipTimes ─────────────────────

const td = (from, to, ts, stage = 'tasks') => ({ ts, kind: 'task-done', stage, detail: `checked ${from}→${to}`, provisional: true })

test('inferFlipTimes：0→2、2→5 衔接多拍按序赋值', () => {
  const r = inferFlipTimes([td(0, 2, 111), td(2, 5, 222)], 5)
  assert.equal(r.broken, false)
  assert.deepEqual(r.times, [111, 111, 222, 222, 222])
})

test('inferFlipTimes：逐拍 0→1、1→2、2→3 各自时刻', () => {
  const r = inferFlipTimes([td(0, 1, 111), td(1, 2, 222), td(2, 3, 333)], 3)
  assert.equal(r.broken, false)
  assert.deepEqual(r.times, [111, 222, 333])
})

test('inferFlipTimes：计数链断裂（0→2 后 3→5）标 broken 且不再赋值', () => {
  const r = inferFlipTimes([td(0, 2, 111), td(3, 5, 222)], 5)
  assert.equal(r.broken, true)
  assert.deepEqual(r.times, [111, 111, null, null, null])
})

test('inferFlipTimes：链完整但未覆盖全部任务（在途未勾完）不标 broken（P2 语义收窄）', () => {
  const r = inferFlipTimes([td(0, 2, 111)], 4)
  assert.equal(r.broken, false)
  assert.deepEqual(r.times, [111, 111, null, null])
})

test('inferFlipTimes：design 阶段翻格不入任务面推断；空输入/零任务不抛', () => {
  const r = inferFlipTimes([td(0, 1, 111, 'design'), td(0, 1, 222)], 1)
  assert.equal(r.broken, false)
  assert.deepEqual(r.times, [222])
  assert.deepEqual(inferFlipTimes([], 3), { times: [null, null, null], broken: false })
  assert.deepEqual(inferFlipTimes([td(0, 1, 1)], 0), { times: [], broken: false })
})

// ───────────────────── resolveCommitAnchors ─────────────────────

test('resolveCommitAnchors：注入 gitLook 解析 subject/token（含正文 token 去重）', () => {
  const gitLook = (h) => h === 'aaa1111'
    ? { hash: h, dateISO: '2026-09-25T15:33:51Z', message: 'fix(cli): 标题行\n\n正文提到 task-01 与 task-02，task-01 重复\n' }
    : null
  const anchors = resolveCommitAnchors([
    { ts: 111, kind: 'commit', stage: null, detail: 'aaa1111', provisional: true },
    { ts: 222, kind: 'commit', stage: null, detail: 'fff9999', provisional: true },
    { ts: 333, kind: 'file-update', stage: 'design', detail: 'design.md 内容变更', provisional: true },
  ], gitLook)
  assert.equal(anchors.length, 2)
  assert.equal(anchors[0].resolvable, true)
  assert.equal(anchors[0].subject, 'fix(cli): 标题行')
  assert.deepEqual(anchors[0].tokens, ['task-01', 'task-02'])
  assert.equal(anchors[1].resolvable, false)
  assert.equal(anchors[1].subject, null)
})

test('resolveCommitAnchors：gitLook 抛异常按失联容错', () => {
  const anchors = resolveCommitAnchors([{ ts: 1, kind: 'commit', stage: null, detail: 'abc1234', provisional: true }], () => { throw new Error('boom') })
  assert.equal(anchors[0].resolvable, false)
})

// ───────────────────── renderTimeline ─────────────────────

test('renderTimeline：三段齐备——诞生/时间轴/任务面/墙钟/诚实注', () => {
  const events = [
    { ts: new Date('2026-09-25T23:24:49').getTime(), kind: 'file', stage: 'requirements', detail: 'requirements.md 出现', provisional: true },
    td(0, 3, new Date('2026-09-25T23:33:51').getTime()),
    { ts: new Date('2026-09-25T23:33:52').getTime(), kind: 'warning', stage: null, rule: 'fake-check', severity: 'warning', detail: 'task-03 无对应提交', provisional: true },
    { ts: new Date('2026-09-25T23:34:14').getTime(), kind: 'commit', stage: null, detail: 'aaa1111', provisional: true },
    { ts: new Date('2026-09-26T00:03:20').getTime(), kind: 'archived', stage: 'archive', detail: 'change 目录已移入 archive', provisional: true },
  ]
  const anchors = resolveCommitAnchors(events, () => ({ hash: 'aaa1111', dateISO: '', message: 'fix: 标题（task-01 task-02）' }))
  const tasks = [
    { id: 'task-01', checked: true, desc: '甲单元' },
    { id: 'task-02', checked: true, desc: '乙单元' },
    { id: 'task-03', checked: true, desc: '丙单元无锚' },
  ]
  const out = renderTimeline({ change: 'demo', events, tasks, anchors, birthTs: new Date('2026-09-25T23:24:49').getTime(), tier: 'thin' })
  assert.match(out, /📅 demo — 合成时间线（thin/);
  assert.match(out, /🁢 变更诞生/);
  assert.match(out, /✅ checked 0→3/);
  assert.match(out, /⚠️ fake-check/);
  assert.match(out, /aaa1111  fix: 标题/);
  assert.match(out, /📦 change 目录已移入 archive/);
  assert.match(out, /task-01\s+≈23:33.*甲单元.*aaa1111/);
  assert.match(out, /task-03\s+≈23:33.*丙单元无锚.*无提交锚⚠️/);
  assert.match(out, /勾选时刻为顺序推断/);
  assert.match(out, /事件 5 条｜提交 1｜任务 3\/3/);
  assert.match(out, /阶段墙钟：.*requirements.*tasks.*archive/, '逐阶段墙钟（aggregateStageTiming 复用）');
  assert.match(out, /墙钟：38min/, '总墙钟 fmtDur 格式（取整分）');
})

test('renderTimeline：已勾任务缺推断时刻 → ? 与专门注记（非笼统断裂注）', () => {
  const events = [td(0, 2, new Date('2026-09-25T23:33:51').getTime())]
  const tasks = [
    { id: 'task-01', checked: true, desc: '甲' },
    { id: 'task-02', checked: true, desc: '乙' },
    { id: 'task-03', checked: true, desc: '丙——观测盲窗内勾选' },
  ]
  const out = renderTimeline({ change: 'demo', events, tasks, anchors: [], birthTs: null, tier: 'thin' })
  assert.match(out, /已勾任务缺推断时刻——观测盲窗\/水位丢失/);
  assert.doesNotMatch(out, /计数链中段断裂/);
  assert.match(out, /task-03\s+\?/);
})

test('renderTimeline：任务面缺失降级标注；hash 失联只显 hash', () => {
  const events = [{ ts: new Date('2026-09-25T23:33:51').getTime(), kind: 'commit', stage: null, detail: 'fff9999', provisional: true }]
  const anchors = resolveCommitAnchors(events, () => null)
  const out = renderTimeline({ change: 'demo', events, tasks: null, anchors, birthTs: null, tier: null })
  assert.match(out, /任务面缺失/);
  assert.match(out, /fff9999（subject 不可解析/);
  assert.match(out, /tier 未知/);
  assert.match(out, /墙钟：未知/);
})

test('renderTimeline：无事件流空态不抛', () => {
  const out = renderTimeline({ change: 'demo', events: [], tasks: [{ id: 'task-01', checked: false, desc: 'x' }], anchors: [], birthTs: null, tier: 'thin' })
  assert.match(out, /无事件——watcher 未观测到活动/);
  assert.match(out, /task-01\s+未勾/);
})

// ───────────────────── loadChangeTasks（tmpdir 双路径探测） ─────────────────────

test('loadChangeTasks：活跃优先于归档', () => {
  const root = mkdtempSync(join(tmpdir(), 'wt-tl-'))
  try {
    writeFileSync(join(root, 'active.md'), 'x', 'utf8') // 占位防误删空目录
    const active = join(root, 'changes', 'demo')
    const archived = join(root, 'changes', 'archive', 'demo')
    mkdirSync(active, { recursive: true })
    mkdirSync(archived, { recursive: true })
    writeFileSync(join(active, 'tasks.md'), '- [ ] task-01: 活跃面\n', 'utf8')
    writeFileSync(join(archived, 'tasks.md'), '- [ ] task-01: 归档面\n', 'utf8')
    const r = loadChangeTasks(root, 'demo')
    assert.equal(r.changeDir, active)
    assert.match(r.tasksMd, /活跃面/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('loadChangeTasks：仅归档在场时回退归档', () => {
  const root = mkdtempSync(join(tmpdir(), 'wt-tl-'))
  try {
    const archived = join(root, 'changes', 'archive', 'demo')
    mkdirSync(archived, { recursive: true })
    writeFileSync(join(archived, 'tasks.md'), '- [ ] task-01: 归档面\n', 'utf8')
    const r = loadChangeTasks(root, 'demo')
    assert.equal(r.changeDir, archived)
    assert.match(r.tasksMd, /归档面/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('loadChangeTasks：双缺失返回 null', () => {
  const root = mkdtempSync(join(tmpdir(), 'wt-tl-'))
  try {
    const r = loadChangeTasks(root, 'nope')
    assert.equal(r.changeDir, null)
    assert.equal(r.tasksMd, null)
  } finally { rmSync(root, { recursive: true, force: true }) }
})
