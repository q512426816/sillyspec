/**
 * watcher-alerts.test.mjs — watcher alerts 查询命令（2026-09-23 quick：哨兵告警可视化出口）
 *
 * 覆盖验收面：
 *   ① readWatcherEvents 纯读函数：fixture jsonl（warning/normal/backfill 混合+坏行）→
 *      events 全量 / warnings 子集（kind/severity 双字段容差）/ badLines 计数；
 *   ② CLI 缺省只出 warning、--all 全出；统计行「N 条告警 / M 条事件」；detail 截 80；
 *      坏行跳过注记；--change 缺失/未知子命令 → exit 2；
 *   ③ 文件缺失 / 目录缺失 two-case 友好退出码 0；
 *   ④ --follow 子进程真轮询：追加行后打印新 warning 行（杀超时验证，warnings-only 过滤钉）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'child_process'
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

const { readWatcherEvents } = await import('../src/watcher.js')

// ── fixture：mkWarning 真实形态（kind/severity 双写）+ 基础事件 + backfill 变体 + 坏行 ──
const EV = {
  file: { ts: 1740000000000, kind: 'file', stage: 'proposal', detail: 'proposal.md 出现', provisional: true },
  fakeCheck: { ts: 1740000001000, kind: 'warning', stage: null, rule: 'fake-check', severity: 'warning', detail: 'tasks 勾选 task-01 无对应提交（消息不含该 task id）且无 review.json 变更——假勾选嫌疑，人判', provisional: true },
  taskDoneBackfill: { ts: 1740000002000, kind: 'task-done', stage: 'tasks', detail: 'checked 0→1', provisional: true, backfill: true },
  stallBackfill: { ts: 1740000003000, kind: 'warning', stage: null, rule: 'stall', severity: 'warning', detail: 'execute 期已 15 分钟无提交无事件——停滞嫌疑（区分在想/死了，人判）', provisional: true, backfill: true },
  longDetail: { ts: 1740000004000, kind: 'warning', stage: null, rule: 'scope-drift', severity: 'warning', detail: 'x'.repeat(120), provisional: true },
}

function writeFixture(runtimeRoot, change, records) {
  mkdirSync(runtimeRoot, { recursive: true })
  const lines = records.map((r) => (typeof r === 'string' ? r : JSON.stringify(r)))
  writeFileSync(join(runtimeRoot, `watcher-events-${change}.jsonl`), lines.join('\n') + '\n', 'utf8')
}

function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, ...args], {
    cwd, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'],
  })
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status }
}

// ───────────────────────── ① readWatcherEvents 纯读函数 ─────────────────────────

test('readWatcherEvents: 混合 fixture → events 全量 / warnings 子集 / badLines 计数', () => {
  const root = mkdtempSync(join(tmpdir(), 'wa-fn-'))
  writeFixture(root, '2026-09-23-x', [
    EV.file, EV.fakeCheck, EV.taskDoneBackfill, EV.stallBackfill, EV.longDetail,
    '{"broken":', 'garbage line', '["array"]',
  ])
  const r = readWatcherEvents({ runtimeRoot: root, change: '2026-09-23-x' })
  assert.equal(r.exists, true)
  assert.equal(r.events.length, 5)
  assert.equal(r.warnings.length, 3)
  assert.deepEqual(r.warnings.map((w) => w.rule).sort(), ['fake-check', 'scope-drift', 'stall'])
  assert.equal(r.badLines, 3)
})

test('readWatcherEvents: severity-only 容差（kind 非 warning 但 severity=warning 仍入告警集）', () => {
  const root = mkdtempSync(join(tmpdir(), 'wa-fn2-'))
  writeFixture(root, 'c1', [
    { ts: 1, kind: 'notice', stage: null, severity: 'warning', detail: '容差形态', provisional: true },
    { ts: 2, kind: 'file', stage: null, detail: '普通', provisional: true },
  ])
  const r = readWatcherEvents({ runtimeRoot: root, change: 'c1' })
  assert.equal(r.warnings.length, 1)
  assert.equal(r.warnings[0].detail, '容差形态')
})

test('readWatcherEvents: 文件缺失/目录缺失 → exists:false 零事件（two-case 同形）', () => {
  const root = mkdtempSync(join(tmpdir(), 'wa-fn3-'))
  assert.deepEqual(readWatcherEvents({ runtimeRoot: root, change: 'nope' }), { exists: false, events: [], warnings: [], badLines: 0 })
  assert.deepEqual(readWatcherEvents({ runtimeRoot: join(root, 'no-such-dir'), change: 'nope' }), { exists: false, events: [], warnings: [], badLines: 0 })
})

// ───────────────────────── ② CLI 一次性查询 ─────────────────────────

const FIX = [EV.file, EV.fakeCheck, EV.taskDoneBackfill, EV.stallBackfill, EV.longDetail, '{"broken":', 'garbage line', '["array"]']

test('CLI 缺省: 只出 warning 行 + 统计「3 条告警 / 5 条事件」+ 坏行注记', () => {
  const root = mkdtempSync(join(tmpdir(), 'wa-cli-'))
  writeFixture(root, '2026-09-23-y', FIX)
  const r = runCLI(['watcher', 'alerts', '--change', '2026-09-23-y', '--runtime-root', root], root)
  assert.equal(r.status, 0)
  assert.match(r.stdout, /fake-check/)
  assert.match(r.stdout, /stall/)
  assert.match(r.stdout, /scope-drift/)
  assert.doesNotMatch(r.stdout, /proposal\.md 出现/)
  assert.doesNotMatch(r.stdout, /checked 0→1/)
  assert.match(r.stdout, /3 条告警 \/ 5 条事件/)
  assert.match(r.stdout, /跳过 3 坏行/)
})

test('CLI --all: 全事件出（kind 入 rule 列）+ 统计行同口径', () => {
  const root = mkdtempSync(join(tmpdir(), 'wa-cli2-'))
  writeFixture(root, '2026-09-23-z', FIX)
  const r = runCLI(['watcher', 'alerts', '--change', '2026-09-23-z', '--runtime-root', root, '--all'], root)
  assert.equal(r.status, 0)
  assert.match(r.stdout, /proposal\.md 出现/)
  assert.match(r.stdout, /task-done/)
  assert.match(r.stdout, /3 条告警 \/ 5 条事件/)
})

test('CLI detail 截 80（含省略号恰好 80 列）+ 本地时间列', () => {
  const root = mkdtempSync(join(tmpdir(), 'wa-cli3-'))
  writeFixture(root, 'c-long', [EV.longDetail])
  const r = runCLI(['watcher', 'alerts', '--change', 'c-long', '--runtime-root', root], root)
  assert.equal(r.status, 0)
  const row = r.stdout.split('\n').find((l) => l.includes('scope-drift'))
  assert.ok(row, 'scope-drift 行存在')
  const cell = row.split('|')[2].trim()
  assert.equal(cell.length, 80)
  assert.ok(cell.endsWith('…'))
  assert.match(row, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
})

test('CLI two-case 友好退出: 目录缺失 / 文件缺失 → exit 0 + 无事件流提示', () => {
  const root = mkdtempSync(join(tmpdir(), 'wa-cli4-'))
  const dirMissing = runCLI(['watcher', 'alerts', '--change', 'a1', '--runtime-root', join(root, 'gone')], root)
  assert.equal(dirMissing.status, 0)
  assert.match(dirMissing.stdout, /a1 无事件流（未跑过 watcher）/)

  mkdirSync(root, { recursive: true })
  const fileMissing = runCLI(['watcher', 'alerts', '--change', 'a1', '--runtime-root', root], root)
  assert.equal(fileMissing.status, 0)
  assert.match(fileMissing.stdout, /a1 无事件流（未跑过 watcher）/)
})

test('CLI 用法面: 未知子命令 / 缺 --change → exit 2', () => {
  const root = mkdtempSync(join(tmpdir(), 'wa-cli5-'))
  const sub = runCLI(['watcher', 'tail', '--change', 'a1'], root)
  assert.equal(sub.status, 2)
  assert.match(sub.stderr, /未知子命令/)

  const noChange = runCLI(['watcher', 'alerts'], root)
  assert.equal(noChange.status, 2)
  assert.match(noChange.stderr, /--change/)
})

test('CLI 路径穿越守卫: --change 含分隔符 → 非零退出', () => {
  const root = mkdtempSync(join(tmpdir(), 'wa-cli6-'))
  const r = runCLI(['watcher', 'alerts', '--change', '..\\evil', '--runtime-root', root], root)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /路径穿越|非法字符|含路径分隔符/)
})

// ───────────────────────── ④ --follow 子进程轮询 ─────────────────────────

test('CLI --follow: 追加行后打印新 warning 行（缺省过滤 normal 不打印），杀超时验证', { timeout: 30000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), 'wa-follow-'))
  const eventsPath = join(root, 'watcher-events-follow-change.jsonl')
  writeFixture(root, 'follow-change', [EV.fakeCheck])

  const child = spawn(process.execPath, [cliBin, 'watcher', 'alerts', '--change', 'follow-change', '--runtime-root', root, '--follow'], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
  })
  let out = ''
  child.stdout.on('data', (d) => { out += d })
  let err = ''
  child.stderr.on('data', (d) => { err += d })

  try {
    // 首屏（1 warning）落定后追加 1 warning + 1 normal——下一轮 2s 轮询只应补打 warning 行
    await new Promise((r) => setTimeout(r, 1500))
    appendFileSync(eventsPath, JSON.stringify(EV.stallBackfill) + '\n' + JSON.stringify(EV.file) + '\n', 'utf8')
    await new Promise((r) => setTimeout(r, 4500))
    assert.match(out, /fake-check/, '首屏已有初始 warning')
    assert.match(out, /stall/, '追加的 warning 行被打印')
    assert.doesNotMatch(out, /proposal\.md 出现/, '追加的 normal 事件不打印（缺省 warnings-only）')
    assert.equal(err, '')
  } finally {
    child.kill()
    await new Promise((resolveExit) => {
      child.once('exit', resolveExit)
      setTimeout(resolveExit, 3000)
    })
  }
})
