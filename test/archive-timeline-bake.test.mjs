/**
 * archive-timeline-bake.test.mjs — 归档时间线烤制（2026-09-28-archive-timeline-bake）。
 *
 * 覆盖面（零真仓零真 git——gitLook 注入、fs 用 tmpdir fixture）：
 *   ① renderBakedTimeline：快照头注记、事件副本两态注记、透传 renderTimeline 主体；
 *   ② bakeArchiveTimeline：fixture 端到端（events jsonl × tasks.md × flow-state）→
 *      timeline.md + watcher-events.jsonl 双落盘、副本与源字节一致；
 *   ③ bakeArchiveTimeline：无事件流跳过（零文件产出带原因）；写失败 fail-open 返回 {ok:false} 不抛；
 *   ④ readWatcherEvents path 直读形态：归档副本解析、坏行容忍、path 优先于 runtimeRoot、缺失 exists:false；
 *   ⑤ 尺寸帽：超帽只烤 timeline.md，副本跳过且头注记在场。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { renderBakedTimeline, parseTaskLines, resolveCommitAnchors } = await import('../src/timeline.js')
const { readWatcherEvents } = await import('../src/watcher.js')
const { bakeArchiveTimeline, BAKE_EVENTS_COPY_MAX_BYTES } = await import('../src/run/complete-handlers.js')

const CHANGE = 'fixture-bake-change'

// ───────────────────── fixture 组装 ─────────────────────

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'bake-'))
  const specBase = join(root, '.sillyspec')
  const runtimeRoot = join(specBase, '.runtime')
  const destDir = join(specBase, 'changes', 'archive', CHANGE)
  mkdirSync(runtimeRoot, { recursive: true })
  mkdirSync(destDir, { recursive: true })
  const eventsJsonl = [
    `{"ts":1695800000000,"kind":"born","stage":"brainstorm","detail":"变更诞生"}`,
    `{"ts":1695800010000,"kind":"task-done","stage":"tasks","detail":"checked 0→2","provisional":true}`,
    `{"ts":1695800020000,"kind":"commit","stage":"tasks","detail":"abc1234 fix: 甲（task-01）"}`,
  ].join('\n') + '\n'
  writeFileSync(join(runtimeRoot, `watcher-events-${CHANGE}.jsonl`), eventsJsonl)
  writeFileSync(join(destDir, 'tasks.md'), [
    '---',
    'author: test',
    'created_at: 2026-09-28T09:00:00.000Z',
    '---',
    '# 任务注册表',
    '- [x] task-01: 甲单元',
    '- [x] task-02: 乙单元',
    '',
  ].join('\n'))
  writeFileSync(join(destDir, 'flow-state.yaml'), 'tier: thin\n')
  return { root, specBase, runtimeRoot, destDir, eventsJsonl }
}

const fakeGitLook = (hash) => ({
  hash,
  dateISO: '2026-09-28T10:00:00+08:00',
  message: 'fix: 甲单元落地（task-01）',
})

const fakeEvents = [
  { ts: 1695800000000, kind: 'born', stage: 'brainstorm', detail: '变更诞生' },
  { ts: 1695800010000, kind: 'task-done', stage: 'tasks', detail: 'checked 0→2', provisional: true },
  { ts: 1695800020000, kind: 'commit', stage: 'tasks', detail: 'abc1234 fix: 甲（task-01）' },
]

// ───────────────────── ① renderBakedTimeline ─────────────────────

test('尺寸帽缺省值钉 2MiB（防巨型事件流污染 git 的契约面）', () => {
  assert.equal(BAKE_EVENTS_COPY_MAX_BYTES, 2 * 1024 * 1024)
})

test('renderBakedTimeline：快照头注记 + 事件副本在场注记 + 透传主体三段', () => {
  const anchors = resolveCommitAnchors(fakeEvents, fakeGitLook)
  const md = renderBakedTimeline({
    change: CHANGE, events: fakeEvents, tasks: parseTaskLines('- [x] task-01: 甲单元\n- [x] task-02: 乙单元'),
    anchors, birthTs: 1695800000000, tier: 'thin', bakedAtIso: '2026-09-28T12:00:00.000Z',
  })
  assert.ok(md.includes(`# 合成时间线快照 — ${CHANGE}`))
  assert.ok(md.includes('2026-09-28T12:00:00.000Z'))
  assert.ok(md.includes('烤制于归档链'))
  assert.ok(md.includes('末尾事件'))
  assert.ok(md.includes('watcher-events.jsonl'))
  assert.ok(md.includes('── 事件时间轴 ──'))
  assert.ok(md.includes('── 任务面'))
  assert.ok(md.includes('task-01'))
  assert.ok(md.includes('注：'))
})

test('renderBakedTimeline：eventsCopySkipped=true 头注记改「尺寸超帽」不提副本文件', () => {
  const md = renderBakedTimeline({
    change: CHANGE, events: [], tasks: null, anchors: [], birthTs: null, tier: null,
    bakedAtIso: '2026-09-28T12:00:00.000Z', eventsCopySkipped: true,
  })
  assert.ok(md.includes('尺寸超帽'))
  assert.ok(!md.includes('本目录 watcher-events.jsonl'))
  assert.ok(md.includes('（无事件——watcher 未观测到活动）'))
})

// ───────────────────── ② bakeArchiveTimeline 端到端 ─────────────────────

test('bakeArchiveTimeline：fixture 端到端双落盘，副本与源字节一致', async () => {
  const fx = makeFixture()
  try {
    const r = await bakeArchiveTimeline({
      cwd: fx.root, specBase: fx.specBase, changeName: CHANGE, destDir: fx.destDir,
      gitLook: fakeGitLook, nowIso: '2026-09-28T12:00:00.000Z',
    })
    assert.equal(r.ok, true)
    assert.equal(r.skipped, false)
    assert.deepEqual(r.files, ['timeline.md', 'watcher-events.jsonl'])
    const md = readFileSync(join(fx.destDir, 'timeline.md'), 'utf8')
    assert.ok(md.includes(`# 合成时间线快照 — ${CHANGE}`))
    assert.ok(md.includes('task-01'))
    assert.ok(md.includes('abc1234'))
    assert.equal(readFileSync(join(fx.destDir, 'watcher-events.jsonl'), 'utf8'), fx.eventsJsonl)
  } finally {
    rmSync(fx.root, { recursive: true, force: true })
  }
})

// ───────────────────── ③ 跳过态与 fail-open ─────────────────────

test('bakeArchiveTimeline：无事件流跳过，零文件产出带原因', async () => {
  const fx = makeFixture()
  rmSync(join(fx.runtimeRoot, `watcher-events-${CHANGE}.jsonl`))
  try {
    const r = await bakeArchiveTimeline({
      cwd: fx.root, specBase: fx.specBase, changeName: CHANGE, destDir: fx.destDir, gitLook: fakeGitLook,
    })
    assert.equal(r.ok, true)
    assert.equal(r.skipped, true)
    assert.ok(r.reason.includes('无事件流'))
    assert.equal(existsSync(join(fx.destDir, 'timeline.md')), false)
    assert.equal(existsSync(join(fx.destDir, 'watcher-events.jsonl')), false)
  } finally {
    rmSync(fx.root, { recursive: true, force: true })
  }
})

test('bakeArchiveTimeline：写失败 fail-open 返回 {ok:false} 不抛', async () => {
  const fx = makeFixture()
  try {
    const r = await bakeArchiveTimeline({
      cwd: fx.root, specBase: fx.specBase, changeName: CHANGE, destDir: fx.destDir,
      gitLook: fakeGitLook,
      writeImpl: () => { throw new Error('disk full') },
    })
    assert.equal(r.ok, false)
    assert.ok(String(r.error).includes('disk full'))
  } finally {
    rmSync(fx.root, { recursive: true, force: true })
  }
})

// ───────────────────── ④ readWatcherEvents path 直读 ─────────────────────

test('readWatcherEvents：path 直读归档副本，坏行容忍计数，path 优先于 runtimeRoot', async () => {
  const fx = makeFixture()
  try {
    const copyPath = join(fx.destDir, 'watcher-events.jsonl')
    writeFileSync(copyPath, fx.eventsJsonl + '{bad line\n\n' + fx.eventsJsonl.split('\n')[0] + '\n')
    const r = readWatcherEvents({ path: copyPath })
    assert.equal(r.exists, true)
    assert.equal(r.events.length, 4)
    assert.equal(r.badLines, 1)
    // path 优先：runtimeRoot 指向空目录仍读 path
    const r2 = readWatcherEvents({ runtimeRoot: join(fx.root, 'nowhere'), change: CHANGE, path: copyPath })
    assert.equal(r2.exists, true)
    assert.equal(r2.events.length, 4)
    // 缺失路径 → exists:false 空集（既有语义）
    const r3 = readWatcherEvents({ path: join(fx.destDir, 'nope.jsonl') })
    assert.equal(r3.exists, false)
    assert.equal(r3.events.length, 0)
  } finally {
    rmSync(fx.root, { recursive: true, force: true })
  }
})

// ───────────────────── ⑤ 尺寸帽 ─────────────────────

test('bakeArchiveTimeline：事件副本超帽只烤 timeline.md，头注记「尺寸超帽」', async () => {
  const fx = makeFixture()
  try {
    const r = await bakeArchiveTimeline({
      cwd: fx.root, specBase: fx.specBase, changeName: CHANGE, destDir: fx.destDir,
      gitLook: fakeGitLook, eventsCopyMaxBytes: 10,
    })
    assert.equal(r.ok, true)
    assert.deepEqual(r.files, ['timeline.md'])
    assert.equal(r.eventsCopySkipped, true)
    assert.equal(existsSync(join(fx.destDir, 'timeline.md')), true)
    assert.equal(existsSync(join(fx.destDir, 'watcher-events.jsonl')), false)
    const md = readFileSync(join(fx.destDir, 'timeline.md'), 'utf8')
    assert.ok(md.includes('尺寸超帽'))
  } finally {
    rmSync(fx.root, { recursive: true, force: true })
  }
})
