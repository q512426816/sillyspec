/**
 * tick-timing-source.test.mjs — 勾选时点判定换源（2026-10-17-tick-timing-source）
 *
 * 验收面：
 *   ① detectTickTiming 纯函数判定序与阈值（FR-01）：no-ticks/single/no-anchor/spread/
 *      concentrated + 挤窗但存活比不足的快变更放行 + opts 阈值覆写 + 乱序输入；
 *   ② flow done 时点判定换源（FR-02）：侧车时戳分散 + tasks.md git 压扁形态 → 不再出
 *      「一把勾」警告、出「边干边勾确认」行；侧车集中短窗 → 末尾集中 advisory；
 *   ④ 教学文案口径断言（FR-04）：flow start 横幅 / 任务未全勾拒收行含「pathspec 带上
 *      本变更 tasks.md（同一提交入库）」口径。
 *
 * 坑背景（multi-agent-platform docs/sillyspec/tick-timing-squash-blindspot）：旧判据读
 * tasks.md git 首提交==HEAD，官方允许的 reset --soft 压扁会无声摧毁该依据（结构性误报）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { detectTickTiming } from '../src/sentinel-assertions.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

// ── ① detectTickTiming 纯函数（FR-01）──────────────────────────────────────────

test('detectTickTiming：no-ticks / single / no-anchor 判定序', () => {
  assert.deepEqual(detectTickTiming({ ticks: [], lifespanMs: 3600_000 }), { status: 'no-ticks', count: 0, spanMs: 0 })
  assert.equal(detectTickTiming({ ticks: [{ ts: 1000, task: 'task-01' }], lifespanMs: 3600_000 }).status, 'single')
  // 缺锚 fail-open：lifespanMs 非有限 / ≤0 → no-anchor（不判，防短变更误报）
  const two = [{ ts: 1000, task: 'task-01' }, { ts: 2000, task: 'task-02' }]
  assert.equal(detectTickTiming({ ticks: two, lifespanMs: NaN }).status, 'no-anchor')
  assert.equal(detectTickTiming({ ticks: two }).status, 'no-anchor')
  assert.equal(detectTickTiming({ ticks: two, lifespanMs: 0 }).status, 'no-anchor')
})

test('detectTickTiming：时戳分散 → spread（跨度超簇窗）', () => {
  const t0 = 1_700_000_000_000
  const ticks = [
    { ts: t0, task: 'task-01' },
    { ts: t0 + 60_000, task: 'task-02' },
    { ts: t0 + 121_000, task: 'task-03' },
  ]
  const r = detectTickTiming({ ticks, lifespanMs: 3600_000 })
  assert.equal(r.status, 'spread')
  assert.equal(r.count, 3)
  assert.equal(r.spanMs, 121_000)
})

test('detectTickTiming：挤尾窗且存活比足 → concentrated；快变更放行 → spread', () => {
  const t0 = 1_700_000_000_000
  const clustered = [
    { ts: t0, task: 'task-01' },
    { ts: t0 + 30_000, task: 'task-02' },
    { ts: t0 + 90_000, task: 'task-03' },
  ]
  // 跨度 90s ≤ 120s，存活 2h ≥ 10×90s → 末尾集中
  assert.equal(detectTickTiming({ ticks: clustered, lifespanMs: 7200_000 }).status, 'concentrated')
  // 同簇但变更只活了 10 分钟 < 10×90s=15 分钟 → 快变更快勾，合法形态放行
  assert.equal(detectTickTiming({ ticks: clustered, lifespanMs: 600_000 }).status, 'spread')
  // 挤窗且跨度极小（1s）：存活 2h ≥ 10×1s → concentrated（一把点形态）
  const burst = [
    { ts: t0, task: 'task-01' },
    { ts: t0 + 500, task: 'task-02' },
    { ts: t0 + 1000, task: 'task-03' },
  ]
  assert.equal(detectTickTiming({ ticks: burst, lifespanMs: 7200_000 }).status, 'concentrated')
})

test('detectTickTiming：opts 阈值覆写与乱序输入', () => {
  const t0 = 1_700_000_000_000
  const ticks = [
    { ts: t0 + 50_000, task: 'task-02' },
    { ts: t0, task: 'task-01' },
  ]
  // 乱序行序：排序后跨度 50s，缺省窗 120s 内、存活 1h ≥ 10×50s → concentrated
  assert.equal(detectTickTiming({ ticks, lifespanMs: 3600_000 }).status, 'concentrated')
  // 窗覆写为 10s：跨度 50s 超窗 → spread
  assert.equal(detectTickTiming({ ticks, lifespanMs: 3600_000, clusterWindowMs: 10_000 }).status, 'spread')
  // ratio 覆写为 100：存活 1h < 100×50s → spread（放行）
  assert.equal(detectTickTiming({ ticks, lifespanMs: 3600_000, ratio: 100 }).status, 'spread')
})

// ── ② flow done 时点判定换源（FR-02）──────────────────────────────────────────

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'ttt-'))
  // 初始提交（=flow start 的 baseline_commit）注入 2h 前时戳：集中形态用例需要
  // 「变更存活 ≥10×时戳跨度」的存活锚（committer date 是 detectTickTiming 的存活源）。
  const OLD = new Date(Date.now() - 2 * 3600_000).toISOString()
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe', env: { ...process.env, GIT_AUTHOR_DATE: OLD, GIT_COMMITTER_DATE: OLD } })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n')
  writeFileSync(join(cwd, 'exit0.js'), 'process.exit(0)\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const g2 = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 180_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
  return { cwd, cli, g: g2 }
}

function fillSlots(cwd, change) {
  const base = join(cwd, '.sillyspec', 'changes', change)
  const dp = join(base, 'design.md')
  const dText = readFileSync(dp, 'utf8')
  if (/<!--AGENT:槽\d+/.test(dText)) {
    writeFileSync(dp, dText.replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：夹具'))
    writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
      .replace(/(<!--AGENT:FR区[^\n]*-->)/g, '$1\n### FR-01: 夹具行为\nGiven x\nWhen y\nThen z')
      .replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：夹具'))
  } else {
    writeFileSync(dp, dText.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：夹具'))
    writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
      .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（夹具行为句）')
      .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：夹具'))
  }
}

test('flow done 换源：侧车分散时戳 + tasks.md 压扁形态 → 无一把勾警告，出边干边勾确认行', () => {
  const { cwd, cli } = makeRepo()
  try {
    const change = '2026-10-17-fx-squash'
    const r = cli(['flow', 'start', '--change', change, '--input', '夹具压扁回归验证变更标题行\n动机\n\n成功标准：\n- 夹具行为'])
    assert.equal(r.status, 0, `start 失败: ${r.stdout}\n${r.stderr}`)
    fillSlots(cwd, change)
    const ap = cli(['flow', 'approve', '--change', change, '--self-approved'])
    assert.equal(ap.status, 0, `approve 失败: ${ap.stdout}\n${ap.stderr}`)
    const base = join(cwd, '.sillyspec', 'changes', change)
    // 勾两格（CLI tick 侧车留痕）；时戳人工分散写侧车（跨 10 分钟 > 120s 簇窗）
    const t0 = Date.now() - 3600_000
    writeFileSync(join(base, 'task-ticks.jsonl'), [
      JSON.stringify({ ts: t0, task: 'task-01', source: 'task-tick' }),
      JSON.stringify({ ts: t0 + 600_000, task: 'task-02', source: 'task-tick' }),
      '',
    ].join('\n'))
    const tm = readFileSync(join(base, 'tasks.md'), 'utf8')
    const ticked = tm.replace(/^- \[ \] (task-\d+:)/gm, '- [x] $1')
    writeFileSync(join(base, 'tasks.md'), ticked)
    // 压扁形态：tasks.md 只在收口前的单笔提交里首现（首提交 == HEAD 形态）——旧判据必误报
    execFileSync('git', ['add', '--', join(base, 'tasks.md'), join(base, 'task-ticks.jsonl')], { cwd, stdio: 'pipe' })
    execFileSync('git', ['commit', '-q', '-m', '交付：夹具勾选与侧车 (task-01/02)'], { cwd, stdio: 'pipe' })
    const done = cli(['flow', 'done', '--change', change])
    const out = `${done.stdout}\n${done.stderr}`
    assert.ok(!out.includes('一把勾模式'), `旧判据误报仍在: ${out}`)
    assert.ok(!out.includes('untracked 直至归档'), `结构性 untracked 警告仍在: ${out}`)
    assert.ok(out.includes('边干边勾确认'), `缺确认行: ${out}`)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('flow done 换源：侧车集中短窗且存活比足 → 末尾集中勾选 advisory（不阻断）', () => {
  const { cwd, cli, g } = makeRepo()
  try {
    const change = '2026-10-17-fx-cluster'
    const r = cli(['flow', 'start', '--change', change, '--input', '夹具末尾集中勾选验证标题\n动机\n\n成功标准：\n- 夹具行为'])
    assert.equal(r.status, 0, `start 失败: ${r.stdout}\n${r.stderr}`)
    fillSlots(cwd, change)
    const ap = cli(['flow', 'approve', '--change', change, '--self-approved'])
    assert.equal(ap.status, 0, `approve 失败: ${ap.stdout}\n${ap.stderr}`)
    const base = join(cwd, '.sillyspec', 'changes', change)
    // 侧车时戳全落在现在-10s..现在的短窗（跨度 10s ≤ 120s 簇窗）；baseline 提交 2h 前
    // （makeRepo 注入）→ 存活 ≈2h ≥ 10×10s → 末尾集中形态
    const now = Date.now()
    writeFileSync(join(base, 'task-ticks.jsonl'), [
      JSON.stringify({ ts: now - 10_000, task: 'task-01', source: 'task-tick' }),
      JSON.stringify({ ts: now, task: 'task-02', source: 'task-tick' }),
      '',
    ].join('\n'))
    const tm = readFileSync(join(base, 'tasks.md'), 'utf8')
    writeFileSync(join(base, 'tasks.md'), tm.replace(/^- \[ \] (task-\d+:)/gm, '- [x] $1'))
    g(['add', '--', join(base, 'tasks.md'), join(base, 'task-ticks.jsonl')])
    g(['commit', '-q', '-m', '交付：夹具勾选与侧车 (task-01/02)'])
    const done = cli(['flow', 'done', '--change', change])
    const out = `${done.stdout}\n${done.stderr}`
    assert.ok(out.includes('末尾集中勾选'), `缺末尾集中 advisory: ${out}`)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── ④ 教学文案口径断言（FR-04）───────────────────────────────────────────────

test('文案口径：flow start 横幅与拒收行含「pathspec 带上本变更 tasks.md（同一提交入库）」', async () => {
  const src = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.ok(src.includes('pathspec 带上本变更 tasks.md'), 'flow.js 教学文案缺同一提交入库口径')
  assert.ok(src.includes('勾选修改与任务交付同一提交入库'), 'flow.js 教学文案缺口径短句')
  assert.ok(src.includes('task tick 回显'), 'flow.js 教学文案缺 task tick 现成命令指引')
})
