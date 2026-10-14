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
  assert.match(out, /勾选时刻精确值=task tick 侧车留痕/);
  assert.match(out, /≈=事件流顺序推断/);
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

// ───────────────────── 侧车精确时刻 + 锚收敛（2026-10-14-timeline-ticktime-anchor-scope） ─────────────────────

test('renderTimeline：侧车精确时刻优先（无 ≈），缺行回退推断 ≈，双盲回退 ?', () => {
  const t1 = new Date('2026-09-25T23:30:05').getTime() // 无时区后缀=本地时刻，断言与 TZ 无关
  const events = [td(0, 1, new Date('2026-09-25T23:31:00').getTime()), td(1, 2, new Date('2026-09-25T23:33:51').getTime())]
  const tasks = [
    { id: 'task-01', checked: true, desc: '甲' },
    { id: 'task-02', checked: true, desc: '乙' },
    { id: 'task-03', checked: true, desc: '丙——双盲' },
  ]
  const out = renderTimeline({ change: 'demo', events, tasks, anchors: [], birthTs: null, tier: 'thin', tickLog: [{ ts: t1, task: 'task-01' }] })
  assert.match(out, /task-01\s+23:30:05\s/, '侧车精确时刻无 ≈ 前缀')
  assert.doesNotMatch(out, /task-01\s+≈/)
  assert.match(out, /task-02\s+≈23:33:51\s/, '侧车缺行回退事件流推断（≈ 保留）')
  assert.match(out, /task-03\s+\?/, '侧车与推断双盲回退 ?')
  assert.match(out, /精确=task tick 侧车留痕/, '任务面表头诚实注同步')
  assert.match(out, /已勾任务缺推断时刻/, '双盲位仍是 ?——缺时刻注保留（注解释的是 ? 位）')
  // 全覆盖形态：侧车+推断补齐全部已勾位 → 无 ? 也无缺时刻注
  const outAll = renderTimeline({ change: 'demo', events, tasks, anchors: [], birthTs: null, tier: 'thin', tickLog: [{ ts: t1, task: 'task-01' }, { ts: t1, task: 'task-03' }] })
  assert.doesNotMatch(outAll, /已勾任务缺推断时刻/, '侧车补齐双盲位后注随 ? 一起消失')
  assert.match(outAll, /task-03\s+23:30:05\s/)
  // 断裂注按需打：watcher 重复采样（0→1 双拍）撞断游标，但侧车覆盖全部已勾位时不打断裂注
  const dupEvents = [td(0, 1, new Date('2026-09-25T23:31:00').getTime()), td(0, 1, new Date('2026-09-25T23:31:03').getTime())]
  const outDupCovered = renderTimeline({ change: 'demo', events: dupEvents, tasks: [{ id: 'task-01', checked: true, desc: '甲' }], anchors: [], birthTs: null, tier: 'thin', tickLog: [{ ts: t1, task: 'task-01' }] })
  assert.doesNotMatch(outDupCovered, /计数链中段断裂/, '侧车全覆盖时推断断裂是展示噪音')
  const outDupPartial = renderTimeline({ change: 'demo', events: dupEvents, tasks: [{ id: 'task-01', checked: true, desc: '甲' }, { id: 'task-02', checked: true, desc: '乙' }], anchors: [], birthTs: null, tier: 'thin', tickLog: [{ ts: t1, task: 'task-01' }] })
  assert.match(outDupPartial, /计数链中段断裂/, '还有无侧车的已勾位时断裂注保留')
  // 优先级钉：同任务侧车与推断齐备时显侧车
  const out2 = renderTimeline({ change: 'demo', events, tasks, anchors: [], birthTs: null, tier: 'thin', tickLog: [{ ts: t1, task: 'task-01' }, { ts: new Date('2026-09-25T23:59:00').getTime(), task: 'task-02' }] })
  assert.match(out2, /task-02\s+23:59:00\s/, '侧车优先于推断')
  assert.doesNotMatch(out2, /task-02\s+≈/)
})

test('resolveCommitAnchors：change 参算 sameChange（全消息含正文）；缺省恒 true 向后兼容', () => {
  const events = [{ ts: 1, kind: 'commit', stage: null, detail: 'aaa1111', provisional: true }]
  const look = () => ({ hash: 'aaa1111', dateISO: '', message: 'build: 他变更标题 task-01\n\n正文补记提及 other-note' })
  assert.equal(resolveCommitAnchors(events, look)[0].sameChange, true, '缺省不过滤（既有调用面零破坏）')
  assert.equal(resolveCommitAnchors(events, look, 'other-change')[0].sameChange, false, '消息不含变更名 → false')
  const look2 = () => ({ hash: 'aaa1111', dateISO: '', message: 'build: 标题\n\n正文（2026-09-25-demo-change）补记 task-01' })
  assert.equal(resolveCommitAnchors(events, look2, '2026-09-25-demo-change')[0].sameChange, true, '正文含变更名也算同变更')
  assert.equal(resolveCommitAnchors(events, () => null, 'x')[0].sameChange, false, '失联提交无从验证 → 不锚')
})

test('renderTimeline：跨变更误锚回归——他变更提交含同 token 不锚定（litellm-retire 案例形态）', () => {
  const events = [
    { ts: new Date('2026-09-25T23:10:00').getTime(), kind: 'commit', stage: null, detail: '6c49032', provisional: true },
    { ts: new Date('2026-09-25T23:12:00').getTime(), kind: 'commit', stage: null, detail: 'ab87d6a', provisional: true },
  ]
  const look = (h) => ({
    '6c49032': { hash: h, dateISO: '', message: 'build(deploy): litellm 技术栈整体退役——…（task-01）（task-04）' },
    'ab87d6a': { hash: h, dateISO: '', message: 'docs(spec): litellm 坑记录退役闭坑（2026-09-25-litellm-retire，证据见上一笔）(task-05)' },
  })[h]
  const anchors = resolveCommitAnchors(events, look, '2026-09-25-deploy-release-notes')
  const tasks = [
    { id: 'task-01', checked: true, desc: '甲单元' },
    { id: 'task-05', checked: true, desc: '乙单元' },
  ]
  const out = renderTimeline({ change: '2026-09-25-deploy-release-notes', events, tasks, anchors, birthTs: null, tier: 'thin' })
  assert.match(out, /task-01\s+\?\s*.*甲单元.*无提交锚⚠️/, '他变更提交含 task-01 token 不得锚定')
  assert.match(out, /task-05\s+\?\s*.*乙单元.*无提交锚⚠️/, '他变更提交含 task-05 token 不得锚定')
  assert.match(out, /6c49032  build\(deploy\): litellm 技术栈整体退役/, '事件时间轴 commit 行展示面不变（锚收敛不缩事件轴）')
  // 本变更提交正常锚定（消息含变更名 + token）
  const look2 = (h) => h === 'ok00001'
    ? { hash: h, dateISO: '', message: 'feat: 版本发布记录功能 (2026-09-25-deploy-release-notes) (task-01) (task-05)' }
    : look(h)
  const events2 = [...events, { ts: new Date('2026-09-25T23:16:00').getTime(), kind: 'commit', stage: null, detail: 'ok00001', provisional: true }]
  const anchors2 = resolveCommitAnchors(events2, look2, '2026-09-25-deploy-release-notes')
  const out2 = renderTimeline({ change: '2026-09-25-deploy-release-notes', events: events2, tasks, anchors: anchors2, birthTs: null, tier: 'thin' })
  assert.match(out2, /task-01\s+.*甲单元.*ok00001/, '本变更提交按 token 正常锚定')
  assert.match(out2, /task-05\s+.*乙单元.*ok00001/)
})

test('loadChangeTasks：侧车 tickLog 解析（坏行跳过/id 归一/同任务取最早/归档路径同读）', () => {
  const root = mkdtempSync(join(tmpdir(), 'wt-tl-'))
  try {
    const dir = join(root, 'changes', 'demo')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'tasks.md'), '- [x] task-01: 甲\n', 'utf8')
    writeFileSync(join(dir, 'task-ticks.jsonl'), [
      JSON.stringify({ ts: 200, task: 'task-01', source: 'task-tick' }),
      'not-json 坏行',
      JSON.stringify({ ts: 100, task: 'task-01', source: 'task-tick' }),
      JSON.stringify({ ts: 300, task: 'task-2', source: 'task-tick' }),
      JSON.stringify({ ts: 'bad', task: 'task-03' }),
      '',
    ].join('\n'), 'utf8')
    const r = loadChangeTasks(root, 'demo')
    const m = Object.fromEntries(r.tickLog.map((x) => [x.task, x.ts]))
    assert.equal(m['task-01'], 100, '同任务取最早留痕（时钟回拨/重复容错）')
    assert.equal(m['task-02'], 300, 'id 归一 task-2→task-02')
    assert.equal(m['task-03'], undefined, '非法 ts 行跳过')
    rmSync(dir, { recursive: true, force: true })
    const adir = join(root, 'changes', 'archive', 'demo')
    mkdirSync(adir, { recursive: true })
    writeFileSync(join(adir, 'tasks.md'), '- [x] task-01: 甲\n', 'utf8')
    writeFileSync(join(adir, 'task-ticks.jsonl'), JSON.stringify({ ts: 42, task: 'task-01', source: 'task-tick' }) + '\n', 'utf8')
    assert.deepEqual(loadChangeTasks(root, 'demo').tickLog, [{ ts: 42, task: 'task-01' }], '归档路径同读侧车')
  } finally { rmSync(root, { recursive: true, force: true }) }
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
