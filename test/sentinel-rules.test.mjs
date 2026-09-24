/**
 * sentinel-rules.test.mjs — 哨兵规则引擎 + L0 纯函数 + 水位回补（2026-09-23-sentinel-rules）
 *
 * 覆盖验收面（fixture 快照直构，零 CLI 依赖零真 git；fs 面仅限 tmpdir fixture）：
 *   ① R1 假勾选：正（翻格零证据）/负（commit 证据）/负（review mtime 证据）/token 边界钉；
 *   ② R2 改测试凑绿：正（FAIL→新测试脏→PASS）/负（FAIL 前遗留脏面）/负（src-only 改动）；
 *   ③ R3 范围漂移：正（声明外脏文件）/负（面内）/负（无声明面 fail-open）/去重/glob 容差/基线豁免（并行会话先在脏面不归因）＋SILLYSPEC_SENTINEL=0 总阀；
 *   ④ R4 停滞：early 20min 与 execute 15min 阈值正负例+episode 去重+活动复位+相位锁存；
 *   ⑤ warning 事件形态（kind/rule/severity/provisional/stage:null）；
 *   ⑥ L0 三态（complete/fake/none）+token 边界+无 id 行不入判+review 注入证据；
 *   ⑦ 水位回补：写读往返/内容去重/损坏 null/同水位二次 diff 零事件（幂等锚）；
 *   ⑧ 快照解析器：git log 段式聚合/porcelain 代码面/设计清单双形态。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const {
  applySentinelRules, createSentinelState, inferEvents, buildSnapshot,
  parseGitLogWithFiles, parsePorcelainCodePaths, parseDesignListText,
  mergeCommitEvidence,
  loadSnapshotWatermark, writeSnapshotWatermark, watcherSnapshotPath,
  STALL_EARLY_MS, STALL_EXECUTE_MS,
} = await import('../src/watcher.js')
const { detectFakeCheckCompletion } = await import('../src/sentinel-assertions.js')

function snap(over = {}) {
  return {
    ts: 1700000000000, archived: false, head: 'aaa1111', files: {}, scan: null,
    commits: [], dirtyCode: [], scanStatus: null, reviews: {}, ...over,
  }
}

/** 引擎直驱：默认 baseEvents=inferEvents（与子进程循环同源），state 默认新初值。 */
function run(prev, next, { state, now, baseEvents, changeDir, readImpl, readdirImpl, bindResolveImpl } = {}) {
  return applySentinelRules({
    prev, next,
    baseEvents: baseEvents === undefined ? inferEvents(prev, next) : baseEvents,
    state: state || createSentinelState(prev.ts),
    now: now === undefined ? next.ts : now,
    changeDir, readImpl, readdirImpl, bindResolveImpl,
  })
}

const rulesOf = (warnings) => warnings.map((w) => w.rule)

// ───────────────────────────── R1 假勾选 ─────────────────────────────

test('R1 假勾选 正例：翻格零证据 → fake-check warning', () => {
  const prev = snap({ files: { 'tasks.md': { hash: 'h1', stage: 'tasks', checked: 1, total: 2, checkedTasks: ['task-01'] } } })
  const next = snap({ ts: prev.ts + 3000, files: { 'tasks.md': { hash: 'h2', stage: 'tasks', checked: 2, total: 2, checkedTasks: ['task-01', 'task-02'] } } })
  const { warnings } = run(prev, next)
  const w = warnings.find((x) => x.rule === 'fake-check')
  assert.ok(w, '应有 fake-check warning')
  assert.match(w.detail, /task-02/)
})

test('R1 负例：区间新提交 subject 含 task-02 → 不告警', () => {
  const prev = snap({ files: { 'tasks.md': { hash: 'h1', stage: 'tasks', checked: 1, total: 2, checkedTasks: ['task-01'] } }, commits: [{ hash: 'aaa1111', subject: 'old', files: [] }] })
  const next = snap({
    ts: prev.ts + 3000, head: 'bbb2222',
    files: { 'tasks.md': { hash: 'h2', stage: 'tasks', checked: 2, total: 2, checkedTasks: ['task-01', 'task-02'] } },
    commits: [{ hash: 'bbb2222', subject: 'fix: task-02 watcher 接线', files: ['src/watcher.js'] }, { hash: 'aaa1111', subject: 'old', files: [] }],
  })
  const { warnings } = run(prev, next)
  assert.equal(rulesOf(warnings).includes('fake-check'), false)
})

test('R1 负例：review.json mtime 变更构成证据 → 不告警', () => {
  const prev = snap({ files: { 'tasks.md': { hash: 'h1', stage: 'tasks', checked: 1, total: 2, checkedTasks: ['task-01'] } }, reviews: { 'exec-1/tasks/task-02/review.json': 100 } })
  const next = snap({ ts: prev.ts + 3000, files: { 'tasks.md': { hash: 'h2', stage: 'tasks', checked: 2, total: 2, checkedTasks: ['task-01', 'task-02'] } }, reviews: { 'exec-1/tasks/task-02/review.json': 200 } })
  const { warnings } = run(prev, next)
  assert.equal(rulesOf(warnings).includes('fake-check'), false)
})

test('R1 token 边界钉：subject 含 task-020 不构成 task-02 证据', () => {
  const prev = snap({ files: { 'tasks.md': { hash: 'h1', stage: 'tasks', checked: 0, total: 1, checkedTasks: [] } }, commits: [{ hash: 'aaa1111', subject: 'old', files: [] }] })
  const next = snap({
    ts: prev.ts + 3000,
    files: { 'tasks.md': { hash: 'h2', stage: 'tasks', checked: 1, total: 1, checkedTasks: ['task-02'] } },
    commits: [{ hash: 'bbb2222', subject: 'fix: task-020 typo', files: [] }, { hash: 'aaa1111', subject: 'old', files: [] }],
  })
  const { warnings } = run(prev, next)
  assert.ok(warnings.some((x) => x.rule === 'fake-check' && /task-02/.test(x.detail)), 'task-020 不得误证 task-02')
})

test('R1 负例：无翻格（checkedTasks 不变）零告警', () => {
  const s = snap({ files: { 'tasks.md': { hash: 'h1', stage: 'tasks', checked: 1, total: 2, checkedTasks: ['task-01'] } } })
  const { warnings } = run(s, snap({ ...s, ts: s.ts + 3000 }))
  assert.equal(rulesOf(warnings).includes('fake-check'), false)
})

// ───────────────────────────── R2 改测试凑绿 ─────────────────────────────

const scanFail = { mtimeMs: 1, size: 10 }
const scanPass = { mtimeMs: 2, size: 12 }

test('R2 正例：FAIL → 窗口内新测试脏 → PASS → test-tamper warning', () => {
  const s1 = snap({ scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: [] })
  let st = createSentinelState(s1.ts)
  st = run(snap(), s1, { state: st }).state
  const s2 = snap({ ts: s1.ts + 3000, scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: ['test/foo.test.mjs'] })
  st = run(s1, s2, { state: st }).state
  const s3 = snap({ ts: s2.ts + 3000, scanStatus: { status: 'passed', ranAt: 't2' }, scan: scanPass, dirtyCode: ['test/foo.test.mjs'] })
  const { warnings } = run(s2, s3, { state: st })
  assert.ok(warnings.some((x) => x.rule === 'test-tamper'))
})

test('R2 负例：FAIL 前遗留的测试脏面不算窗口内改动', () => {
  const s1 = snap({ scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: ['test/legacy.test.mjs'] })
  let st = createSentinelState(s1.ts)
  st = run(snap(), s1, { state: st }).state
  const s2 = snap({ ts: s1.ts + 3000, scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: ['test/legacy.test.mjs'] })
  st = run(s1, s2, { state: st }).state
  const s3 = snap({ ts: s2.ts + 3000, scanStatus: { status: 'passed', ranAt: 't2' }, scan: scanPass, dirtyCode: ['test/legacy.test.mjs'] })
  const { warnings } = run(s2, s3, { state: st })
  assert.equal(rulesOf(warnings).includes('test-tamper'), false)
})

test('R2 负例：窗口内只改 src 不改测试 → 不告警', () => {
  const s1 = snap({ scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: [] })
  let st = createSentinelState(s1.ts)
  st = run(snap(), s1, { state: st }).state
  const s2 = snap({ ts: s1.ts + 3000, scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: ['src/fix.js'] })
  st = run(s1, s2, { state: st }).state
  const s3 = snap({ ts: s2.ts + 3000, scanStatus: { status: 'passed', ranAt: 't2' }, scan: scanPass, dirtyCode: [] })
  const { warnings } = run(s2, s3, { state: st })
  assert.equal(rulesOf(warnings).includes('test-tamper'), false)
})

test('R2 负例：无 FAIL 锚的 PASS 不告警', () => {
  const s = snap({ scanStatus: { status: 'passed', ranAt: 't' }, scan: scanPass, dirtyCode: ['test/x.test.mjs'] })
  const { warnings } = run(snap(), s)
  assert.equal(rulesOf(warnings).includes('test-tamper'), false)
})

test('R2 正例：锚定后新提交触及 test/ 同样构成窗口内改动', () => {
  const s1 = snap({ scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, commits: [{ hash: 'aaa1111', subject: 'old', files: [] }] })
  let st = createSentinelState(s1.ts)
  st = run(snap(), s1, { state: st }).state
  const s2 = snap({ ts: s1.ts + 3000, scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, commits: [{ hash: 'bbb2222', subject: 'tweak', files: ['test/foo.test.mjs'] }, { hash: 'aaa1111', subject: 'old', files: [] }] })
  st = run(s1, s2, { state: st }).state
  const s3 = snap({ ts: s2.ts + 3000, scanStatus: { status: 'passed', ranAt: 't2' }, scan: scanPass })
  const { warnings } = run(s2, s3, { state: st })
  assert.ok(warnings.some((x) => x.rule === 'test-tamper'))
})

// ───────────────────────────── R3 范围漂移 ─────────────────────────────

function fixtureChangeDir() {
  const changeDir = mkdtempSync(join(tmpdir(), 'sentinel-'))
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '---', 'id: task-01', 'allowed_paths:', '  - src/ok.js', '  - `src/gen/*.js`', '---', '',
  ].join('\n'), 'utf8')
  writeFileSync(join(changeDir, 'design.md'), [
    '# d', '', '## 文件变更清单', '', '| 操作 | 文件路径 | 说明 |', '|---|---|---|',
    '| 修改 | src/design-declared.js | x |', '', '## 接口定义', '', '(end)', '',
  ].join('\n'), 'utf8')
  return changeDir
}

test('R3 正例：声明面外脏文件 → scope-drift warning；面内文件不点名', () => {
  const changeDir = fixtureChangeDir()
  try {
    const prev = snap({ dirtyCode: [] })
    const next = snap({ ts: prev.ts + 3000, dirtyCode: ['src/ok.js', 'src/other.js'] })
    const { warnings } = run(prev, next, { changeDir })
    const w = warnings.find((x) => x.rule === 'scope-drift')
    assert.ok(w, '应有 scope-drift warning')
    assert.match(w.detail, /src\/other\.js/)
    assert.doesNotMatch(w.detail, /src\/ok\.js/)
  } finally { rmSync(changeDir, { recursive: true, force: true }) }
})

test('R3 负例：全部在声明面内（含 glob 容差与 design 清单条目）→ 不告警', () => {
  const changeDir = fixtureChangeDir()
  try {
    const prev = snap({ dirtyCode: [] })
    const next = snap({ ts: prev.ts + 3000, dirtyCode: ['src/ok.js', 'src/gen/x.js', 'src/design-declared.js'] })
    const { warnings } = run(prev, next, { changeDir })
    assert.equal(rulesOf(warnings).includes('scope-drift'), false)
  } finally { rmSync(changeDir, { recursive: true, force: true }) }
})

test('R3 负例：无声明面（空 changeDir）→ fail-open 跳过', () => {
  const prev = snap({ dirtyCode: [] })
  const next = snap({ ts: prev.ts + 3000, dirtyCode: ['src/whatever.js'] })
  const { warnings } = run(prev, next, { changeDir: null })
  assert.equal(rulesOf(warnings).includes('scope-drift'), false)
})

test('R3 去重钉：同一漂移文件第二次不再告警', () => {
  const changeDir = fixtureChangeDir()
  try {
    const prev = snap({ dirtyCode: [] })
    const drift1 = snap({ ts: prev.ts + 3000, dirtyCode: ['src/other.js'] })
    const r1 = run(prev, drift1, { changeDir })
    assert.ok(r1.warnings.some((x) => x.rule === 'scope-drift'))
    const drift2 = snap({ ts: drift1.ts + 3000, dirtyCode: ['src/other.js'] })
    const r2 = run(drift1, drift2, { changeDir, state: r1.state })
    assert.equal(rulesOf(r2.warnings).includes('scope-drift'), false, '已告警集合不重复点名')
  } finally { rmSync(changeDir, { recursive: true, force: true }) }
})

// ───────────────────────────── R4 停滞 ─────────────────────────────

test('R4 阈值正负例：early 期 21min 告警 / 19min 不告警', () => {
  assert.equal(STALL_EARLY_MS, 20 * 60_000)
  const s = snap()
  const quiet = (over) => snap({ ...s, ...over })
  const neg = run(s, quiet({ ts: s.ts + 19 * 60_000 }), { baseEvents: [], now: s.ts + 19 * 60_000 })
  assert.equal(rulesOf(neg.warnings).includes('stall'), false)
  const pos = run(s, quiet({ ts: s.ts + 21 * 60_000 }), { baseEvents: [], now: s.ts + 21 * 60_000 })
  const w = pos.warnings.find((x) => x.rule === 'stall')
  assert.ok(w)
  assert.match(w.detail, /brainstorm\/plan/)
})

test('R4 execute 期 15min 阈值：16min 告警 / 14min 不告警', () => {
  assert.equal(STALL_EXECUTE_MS, 15 * 60_000)
  const tasksFile = { 'tasks.md': { hash: 'h', stage: 'tasks', checked: 0, total: 1, checkedTasks: [] } }
  const s = snap({ files: tasksFile })
  // 相位锁存：task-done 事件
  const latched = run(s, snap({ ...s, files: { 'tasks.md': { hash: 'h2', stage: 'tasks', checked: 1, total: 1, checkedTasks: ['task-01'] } }, ts: s.ts + 1000 }), { baseEvents: [{ ts: s.ts + 1000, kind: 'task-done', stage: 'tasks', detail: 'x', provisional: true }] })
  assert.equal(latched.state.phase, 'execute')
  const neg = run(s, snap({ ...s, ts: s.ts + 14 * 60_000 }), { state: latched.state, baseEvents: [], now: s.ts + 14 * 60_000 })
  assert.equal(rulesOf(neg.warnings).includes('stall'), false)
  const pos = run(s, snap({ ...s, ts: s.ts + 16 * 60_000 }), { state: latched.state, baseEvents: [], now: s.ts + 16 * 60_000 })
  const w = pos.warnings.find((x) => x.rule === 'stall')
  assert.ok(w)
  assert.match(w.detail, /execute/)
})

test('R4 episode 去重：同一停滞期只发一次；活动恢复后允许下一发', () => {
  const s = snap()
  const idle = (t) => snap({ ...s, ts: s.ts + t })
  const fired = run(s, idle(21 * 60_000), { baseEvents: [], now: s.ts + 21 * 60_000 })
  assert.ok(fired.warnings.some((x) => x.rule === 'stall'))
  const still = run(idle(21 * 60_000), idle(25 * 60_000), { state: fired.state, baseEvents: [], now: s.ts + 25 * 60_000 })
  assert.equal(rulesOf(still.warnings).includes('stall'), false, 'episode 未关闭不重发')
  const resumed = run(idle(25 * 60_000), idle(25 * 60_000 + 10), { state: still.state, baseEvents: [{ ts: 1, kind: 'file', stage: 'plan', detail: 'x', provisional: true }], now: s.ts + 25 * 60_000 + 10 })
  assert.equal(resumed.state.stallOpen, false, '活动复位 episode')
  const again = run(idle(25 * 60_000 + 10), idle(25 * 60_000 + 10 + 21 * 60_000), { state: resumed.state, baseEvents: [], now: s.ts + 25 * 60_000 + 10 + 21 * 60_000 })
  assert.ok(again.warnings.some((x) => x.rule === 'stall'), '新一轮停滞可再发')
})

// ───────────────────────────── 事件形态 ─────────────────────────────

test('warning 事件形态钉：kind/severity/provisional/rule/stage', () => {
  const prev = snap({ files: { 'tasks.md': { hash: 'h1', stage: 'tasks', checked: 0, total: 1, checkedTasks: [] } } })
  const next = snap({ ts: prev.ts + 3000, files: { 'tasks.md': { hash: 'h2', stage: 'tasks', checked: 1, total: 1, checkedTasks: ['task-09'] } } })
  const { warnings } = run(prev, next)
  for (const w of warnings) {
    assert.equal(w.kind, 'warning')
    assert.equal(w.severity, 'warning')
    assert.equal(w.provisional, true)
    assert.equal(w.stage, null)
    assert.equal(typeof w.rule, 'string')
    assert.equal(typeof w.detail, 'string')
    assert.equal(typeof w.ts, 'number')
  }
})

test('引擎 fail-open：prev 缺哨兵字段（旧水位）零异常', () => {
  const legacyPrev = { ts: 1, archived: false, head: 'a', files: { 'tasks.md': { hash: 'h1', stage: 'tasks', checked: 0, total: 1 } }, scan: null }
  const next = snap({ ts: 4, files: { 'tasks.md': { hash: 'h2', stage: 'tasks', checked: 1, total: 1, checkedTasks: ['task-01'] } } })
  const { warnings } = run(legacyPrev, next)
  assert.ok(Array.isArray(warnings))
  // 旧水位无 commits → 全部视为新提交（无证据差集）——R1 按 fail-open 判（不抛错即可）
})

// ───────────────────────────── L0 三态 ─────────────────────────────

test('L0 三态：complete / fake / none', () => {
  const md = '- [x] task-01: a\n- [x] task-02: b\n- [ ] task-03: c\n'
  const none = detectFakeCheckCompletion({ tasksMd: md, commits: [] })
  assert.equal(none.status, 'none')
  assert.equal(none.claimTotal, 3)
  assert.equal(none.checked, 2)

  const all = '- [x] task-01: a\n- [x] task-02: b\n'
  const fake = detectFakeCheckCompletion({ tasksMd: all, commits: ['fix: task-01 done'] })
  assert.equal(fake.status, 'fake')
  assert.deepEqual(fake.missing, ['task-02'])

  const complete = detectFakeCheckCompletion({ tasksMd: all, commits: ['task-01 x', { subject: 'feat: task-02' }] })
  assert.equal(complete.status, 'complete')
  assert.deepEqual(complete.missing, [])

  assert.equal(detectFakeCheckCompletion({ tasksMd: null, commits: [] }).status, 'none')
})

test('L0 token 边界：task-010 不证 task-01；无 id 勾选行不入判', () => {
  const r = detectFakeCheckCompletion({ tasksMd: '- [x] task-01: a', commits: ['task-010 typo'] })
  assert.equal(r.status, 'fake')
  const noId = detectFakeCheckCompletion({ tasksMd: '- [x] 普通行\n- [x] 无 id\n', commits: [] })
  assert.equal(noId.status, 'none')
  assert.equal(noId.claimTotal, 0)
})

test('L0 review 证据：注入 listReviewsImpl 在场即证据；异常按空', () => {
  const r = detectFakeCheckCompletion({
    tasksMd: '- [x] task-01: a', commits: [],
    opts: { listReviewsImpl: () => ['execute-runs/r1/tasks/task-01/review.json'] },
  })
  assert.equal(r.status, 'complete')
  const boom = detectFakeCheckCompletion({ tasksMd: '- [x] task-01: a', commits: [], opts: { listReviewsImpl: () => { throw new Error('x') } } })
  assert.equal(boom.status, 'fake')
})

// ───────────────────────────── 水位回补 ─────────────────────────────

test('水位：写读往返+内容去重+损坏 null', () => {
  const root = mkdtempSync(join(tmpdir(), 'wm-'))
  try {
    const s = snap()
    assert.equal(watcherSnapshotPath(root, 'c1'), join(root, 'watcher-last-snapshot-c1.json'))
    assert.equal(writeSnapshotWatermark(root, 'c1', s, null).written, true)
    const cache = { last: JSON.stringify(s) }
    assert.equal(writeSnapshotWatermark(root, 'c1', s, cache).written, false, '同内容跳过写')
    const wm = loadSnapshotWatermark(root, 'c1')
    assert.equal(wm.ts, s.ts)
    writeFileSync(join(root, 'watcher-last-snapshot-c1.json'), '{broken', 'utf8')
    assert.equal(loadSnapshotWatermark(root, 'c1'), null, '损坏水位 → null 全新启动')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('回补幂等钉：同水位二次 diff 零事件；水位后新产物 → 补发事件（回补面）', () => {
  const wm = snap()
  assert.equal(inferEvents(wm, snap({ ...wm, ts: wm.ts + 60_000 })).length, 0, '幂等：状态未变零事件')
  const moved = snap({ ...wm, ts: wm.ts + 60_000, files: { 'proposal.md': { hash: 'x', stage: 'proposal', checked: 0, total: 0, checkedTasks: [] } } })
  const ev = inferEvents(wm, moved)
  assert.equal(ev.length, 1)
  assert.equal(ev[0].kind, 'file')
  assert.equal(ev[0].provisional, true, '回补事件恒 provisional')
})

// ───────────────────────────── 快照解析器与注入面 ─────────────────────────────

test('parseGitLogWithFiles：hash|subject+文件行段式聚合', () => {
  const commits = parseGitLogWithFiles('abc1234|fix: x\nsrc/a.js\ntest/b.js\n\ndef5678|feat: y\ntest/c.js\n')
  assert.equal(commits.length, 2)
  assert.equal(commits[0].subject, 'fix: x')
  assert.deepEqual(commits[0].files, ['src/a.js', 'test/b.js'])
  assert.deepEqual(commits[1].files, ['test/c.js'])
  assert.deepEqual(parseGitLogWithFiles(''), [])
})

test('parsePorcelainCodePaths：重命名取新路径、剔非代码面、去重排序', () => {
  const paths = parsePorcelainCodePaths(' M src/a.js\n M src/a.js\nR  "old.js" -> "new.js"\n?? notes/x.md\n M .sillyspec/changes/c1/design.md\n A docs/d.md\n')
  assert.deepEqual(paths, ['new.js', 'src/a.js'])
})

test('parseDesignListText：表格与列表双形态+NEW: 剥离', () => {
  const text = [
    '# d', '## 文件变更清单', '',
    '| 操作 | 文件路径 | 说明 |', '|---|---|---|',
    '| 新增 | NEW:src/new-file.js | x |', '| 修改 | src/old.js（注释） | y |',
    '- src/listed.js', '', '## 下一节', '（截断后续）',
  ].join('\n')
  const list = parseDesignListText(text)
  assert.ok(list.includes('src/new-file.js'))
  assert.ok(list.includes('src/old.js'))
  assert.ok(list.includes('src/listed.js'))
  assert.equal(list.some((p) => p.includes('下一节')), false, '章节截断')
})

test('buildSnapshot 注入面：gitLogImpl/porcelainImpl 产出哨兵字段（零真 git）', () => {
  const root = mkdtempSync(join(tmpdir(), 'bs-'))
  try {
    const changeDir = join(root, 'changes', 'c1')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'tasks.md'), '- [x] task-01: a\n- [ ] task-02: b\n', 'utf8')
    const runtimeRoot = join(root, '.runtime')
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(join(runtimeRoot, 'verify-quality-scan-c1.json'), JSON.stringify({ testResult: { status: 'passed', ranAt: 't' } }), 'utf8')
    const s = buildSnapshot({
      changeDir, cwd: root, runtimeRoot, changeName: 'c1',
      gitHeadImpl: () => 'abc1234',
      gitLogImpl: () => 'abc1234|fix: task-01\nsrc/a.js\n',
      porcelainImpl: () => ' M src/a.js\n',
    })
    assert.equal(s.head, 'abc1234')
    assert.deepEqual(s.commits, [{ hash: 'abc1234', subject: 'fix: task-01', files: ['src/a.js'] }])
    assert.deepEqual(s.dirtyCode, ['src/a.js'])
    assert.deepEqual(s.scanStatus, { status: 'passed', ranAt: 't' })
    assert.deepEqual(s.files['tasks.md'].checkedTasks, ['task-01'])
    assert.deepEqual(s.reviews, {})
    // git 失败（impl 返回 null）→ commits/dirtyCode null（fail-open 可区分）
    const fail = buildSnapshot({ changeDir, cwd: root, runtimeRoot, changeName: 'c1', gitHeadImpl: () => null, gitLogImpl: () => null, porcelainImpl: () => null })
    assert.equal(fail.commits, null)
    assert.equal(fail.dirtyCode, null)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('mergeCommitEvidence：hash 判重并集（apply 后同提交两面可达不双计）', () => {
  const a = [{ hash: 'h1', subject: 's1', files: ['a.js'] }, { hash: 'h2', subject: 's2', files: [] }]
  const b = [{ hash: 'h2', subject: 's2-rewrite', files: ['x.js'] }, { hash: 'h3', subject: 's3', files: ['b.js'] }]
  const merged = mergeCommitEvidence(a, b)
  assert.deepEqual(merged.map((c) => c.hash), ['h1', 'h2', 'h3'])
  assert.equal(merged[1].subject, 's2', 'hash 已见保 base 原样（先到为准）')
  assert.deepEqual(mergeCommitEvidence(null, b).map((c) => c.hash), ['h2', 'h3'])
  assert.deepEqual(mergeCommitEvidence(a, null).map((c) => c.hash), ['h1', 'h2'])
  assert.deepEqual(mergeCommitEvidence(null, null), [])
})

test('buildSnapshot worktree 分支证据并入：task 提交在分支上不再漏判假勾选（2026-09-23 误报实证）', () => {
  const root = mkdtempSync(join(tmpdir(), 'bs-wt-'))
  try {
    const changeDir = join(root, 'changes', 'c1')
    mkdirSync(changeDir, { recursive: true })
    const runtimeRoot = join(root, '.runtime')
    mkdirSync(runtimeRoot, { recursive: true })
    const base = { changeDir, cwd: root, runtimeRoot, changeName: 'c1', gitHeadImpl: () => 'aaa1111' }
    // 主仓 log 只有一个无关提交；worktree 分支上挂着 task-01 提交 → 并入后 R1 有证据
    const s = buildSnapshot({
      ...base,
      gitLogImpl: () => 'aaa1111|chore: 无关提交\nsrc/x.js\n',
      gitLogWorktreeImpl: () => 'fff0001|task-01 平台事件表\nbackend/a.py\n\nfff0002|task-02 service\nbackend/b.py\n',
      porcelainImpl: () => '',
    })
    assert.deepEqual(s.commits.map((c) => c.hash), ['aaa1111', 'fff0001', 'fff0002'])
    assert.ok(s.commits[1].subject.startsWith('task-01'))
    // 分支缺失（git 失败 null）/空输出 → 主仓结果原样（fail-open）
    const miss = buildSnapshot({ ...base, gitLogImpl: () => 'aaa1111|chore: 无关提交\n', gitLogWorktreeImpl: () => null, porcelainImpl: () => '' })
    assert.deepEqual(miss.commits.map((c) => c.hash), ['aaa1111'])
    const empty = buildSnapshot({ ...base, gitLogImpl: () => 'aaa1111|chore: 无关提交\n', gitLogWorktreeImpl: () => '', porcelainImpl: () => '' })
    assert.deepEqual(empty.commits.map((c) => c.hash), ['aaa1111'])
    // 只注入 gitLogImpl（未注入 worktree 面）→ 不追真 git，主仓结果原样（测试零真仓约定）
    const solo = buildSnapshot({ ...base, gitLogImpl: () => 'aaa1111|chore: 无关提交\n', porcelainImpl: () => '' })
    assert.deepEqual(solo.commits.map((c) => c.hash), ['aaa1111'])
    // 主源失败 null → commits 保持 null（fail-open 语义不因分支面改变）
    const failMain = buildSnapshot({ ...base, gitLogImpl: () => null, gitLogWorktreeImpl: () => 'fff0001|task-01 x\n', porcelainImpl: () => '' })
    assert.equal(failMain.commits, null)
    // 端到端：翻格 task-01 + 证据仅在并入的分支提交里 → R1 静默
    const prev = snap({ ts: 1, files: { 'tasks.md': { hash: 'x', checked: 0, total: 2, checkedTasks: [] } } })
    const next = snap({ ts: 2, head: 'fff0001', commits: s.commits, files: { 'tasks.md': { hash: 'y', checked: 1, total: 2, checkedTasks: ['task-01'] } } })
    const warnings = applySentinelRules({ prev, next, baseEvents: [], state: createSentinelState(1), now: 2 }).warnings
      .filter((w) => w.rule === 'fake-check')
    assert.equal(warnings.length, 0, '分支提交并入后假勾选不再误报')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

// ── R3 基线豁免 + 哨兵总阀（2026-09-23 哨兵降噪：闪窗与误归因修复）──

test('R3 基线豁免：观测起点已在脏面的并行会话文件不告警，其后新文件才告警', () => {
  const changeDir = fixtureChangeDir()
  try {
    const prev = snap({ dirtyCode: ['parallel/x.js', 'parallel/y.test.ts'] })
    const next = snap({ ts: prev.ts + 3000, dirtyCode: ['parallel/x.js', 'parallel/y.test.ts', 'src/ok.js'] })
    const r1 = run(prev, next, { changeDir })
    assert.equal(rulesOf(r1.warnings).includes('scope-drift'), false, '基线脏面（并行会话先在途）不归因本变更')
    const next2 = snap({ ts: next.ts + 3000, dirtyCode: ['parallel/x.js', 'parallel/y.test.ts', 'src/ok.js', 'src/new-drift.js'] })
    const r2 = run(next, next2, { changeDir, state: r1.state })
    const w = r2.warnings.find((x) => x.rule === 'scope-drift')
    assert.ok(w, '基线之后新出现的声明面外文件仍告警')
    assert.match(w.detail, /src\/new-drift\.js/)
    assert.doesNotMatch(w.detail, /parallel\//, '基线文件不点名')
  } finally { rmSync(changeDir, { recursive: true, force: true }) }
})

test('哨兵总阀：SILLYSPEC_SENTINEL=0 → stall/drift 双条件在场零告警', () => {
  const changeDir = fixtureChangeDir()
  try {
    const prev = snap({ dirtyCode: [] })
    const next = snap({ ts: prev.ts + STALL_EARLY_MS + 60_000, dirtyCode: ['src/x.js'] })
    const { warnings } = applySentinelRules({
      prev, next, baseEvents: [], state: createSentinelState(prev.ts), now: next.ts, changeDir,
      env: { SILLYSPEC_SENTINEL: '0' },
    })
    assert.equal(warnings.length, 0, '总阀关 → 四规则零告警（watcher 仍记录中性事件）')
  } finally { rmSync(changeDir, { recursive: true, force: true }) }
})

// ───────────────────── R2 定向化（2026-09-24 fr-test-binding §1.1，ql-20260924-006）─────────────────────

test('R2 定向正例：被改测试文件绑定 FR 且场景正文未改 → test-tamper-bound 点名锚', () => {
  const bind = (files) => new Map(files.map((f) => [f, [{ anchor: 'FR-core-001', row_id: 'chg-a:task-01:acc-0-11111111', source_change: 'chg-a' }]]))
  const s1 = snap({ scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: [] })
  let st = createSentinelState(s1.ts)
  st = run(snap(), s1, { state: st }).state
  const s2 = snap({ ts: s1.ts + 3000, scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: ['test/a.test.mjs'] })
  st = run(s1, s2, { state: st }).state
  const s3 = snap({ ts: s2.ts + 3000, scanStatus: { status: 'passed', ranAt: 't2' }, scan: scanPass, dirtyCode: ['test/a.test.mjs'] })
  const { warnings } = run(s2, s3, { state: st, bindResolveImpl: bind })
  const w = warnings.find((x) => x.rule === 'test-tamper-bound')
  assert.ok(w, '应有定向 warning')
  assert.match(w.detail, /FR-core-001/, '点名锚')
  assert.match(w.detail, /场景正文未改/, '三联证据文案')
  assert.equal(rulesOf(warnings).includes('test-tamper'), false, '全归属时无 generic')
})

test('R2 定向抑制：来源变更 requirements.md 同窗改动 → 定向不成立，窗口级 generic 保留（永不比旧版安静）', () => {
  const bind = (files) => new Map(files.map((f) => [f, [{ anchor: 'FR-core-001', row_id: 'r', source_change: 'chg-a' }]]))
  const s1 = snap({ scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: [] })
  let st = createSentinelState(s1.ts)
  st = run(snap(), s1, { state: st }).state
  const s2 = snap({ ts: s1.ts + 3000, scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: ['test/a.test.mjs', '.sillyspec/changes/chg-a/requirements.md'] })
  st = run(s1, s2, { state: st }).state
  const s3 = snap({ ts: s2.ts + 3000, scanStatus: { status: 'passed', ranAt: 't2' }, scan: scanPass, dirtyCode: ['test/a.test.mjs', '.sillyspec/changes/chg-a/requirements.md'] })
  const { warnings } = run(s2, s3, { state: st, bindResolveImpl: bind })
  assert.equal(rulesOf(warnings).includes('test-tamper-bound'), false, '定向被抑制')
  assert.ok(warnings.some((x) => x.rule === 'test-tamper'), '窗口级 generic 保留')
})

test('R2 定向无归属：绑定解析空 → generic（注记无绑定锚）', () => {
  const s1 = snap({ scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: [] })
  let st = createSentinelState(s1.ts)
  st = run(snap(), s1, { state: st }).state
  const s2 = snap({ ts: s1.ts + 3000, scanStatus: { status: 'failed', ranAt: 't1' }, scan: scanFail, dirtyCode: ['test/x.test.mjs'] })
  st = run(s1, s2, { state: st }).state
  const s3 = snap({ ts: s2.ts + 3000, scanStatus: { status: 'passed', ranAt: 't2' }, scan: scanPass, dirtyCode: ['test/x.test.mjs'] })
  const { warnings } = run(s2, s3, { state: st, bindResolveImpl: () => new Map() })
  const w = warnings.find((x) => x.rule === 'test-tamper')
  assert.ok(w, 'generic 保留')
  assert.match(w.detail, /无绑定锚/, '注记归属缺口')
  assert.equal(rulesOf(warnings).includes('test-tamper-bound'), false)
})
