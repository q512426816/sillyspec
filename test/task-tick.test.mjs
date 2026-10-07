/**
 * task-tick.test.mjs — 轻量勾选动词 + 事件直写 + 收口不代勾（2026-10-07-thin-tasks-v3）
 *
 * 验收面：
 *   ① tickTasksMd 纯函数：翻格保字节（含 CRLF）/幂等/未知 id 列可选/进度与下一任务指针；
 *   ② CLI 端到端：task tick 翻格+回显+幂等（exit 0）+未知 id（exit 2）+已归档拒收；
 *   ③ 事件直写：翻格成功向 watcher 事件流追加精确 task-done 事件（source:'task-tick'，
 *      checked N→M 单格口径）；幂等重勾零事件；
 *   ④ 节奏门去重：CLI 连续两 tick + watcher 采样合并跳（0→2）同流 → detectBatchCheckCadence
 *      判 null（不再误伤快速逐格勾）；纯 Edit 一把勾（无 CLI 事件）仍检出；
 *   ⑤ done 全勾硬门（2026-10-07-allticked-gate，openspec all_done 对齐）：不勾/部分勾 → 拒收，
 *      补齐 token 提交并 tick 后放行（完成状态机——旧 advisory 放行与收口代勾均已退役）；
 *   ⑥ 工件即时重推（2026-10-07-allticked-gate-docs-resync）：shouldResyncDocs 纯函数判定
 *      四工件内容变更；task tick 后 best-effort triggerSync；watcher 循环防抖消费接线钉。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { tickTasksMd } from '../src/task-tick.js'
import { detectBatchCheckCadence } from '../src/sentinel-assertions.js'
import { readWatcherEvents } from '../src/watcher.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'vtt-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 120_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
  return { cwd, cli }
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
  // spec 断点批准（v2 起草变更的 done 前提）
  const ap = spawnSync(process.execPath, [CLI, 'flow', 'approve', '--change', change], { cwd, encoding: 'utf8', timeout: 120_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
  assert.equal(ap.status, 0, `flow approve 失败: ${ap.stdout}\n${ap.stderr}`)
}

// ── ① tickTasksMd 纯函数 ──

test('①a 翻格保字节：只动 checkbox 态字符，CRLF/其余行逐字保留', () => {
  const md = ['# 头', '', '- [ ] task-01: 甲', '- [ ] task-02: 乙', '', '> 注：`- [ ]` 示例'].join('\r\n')
  const r = tickTasksMd({ tasksMd: md, taskId: 'task-01' })
  assert.equal(r.kind, 'ticked')
  assert.match(r.tasksMd, /^- \[x\] task-01: 甲\r$/m)
  assert.match(r.tasksMd, /^- \[ \] task-02: 乙\r$/m)
  assert.equal(r.checked, 1); assert.equal(r.total, 2)
  assert.equal(r.next.id, 'task-02')
})

test('①b 幂等：已勾再勾走 already、零写盘差异', () => {
  const md = '- [x] task-01: 甲\n- [ ] task-02: 乙\n'
  const r = tickTasksMd({ tasksMd: md, taskId: 'task-01' })
  assert.equal(r.kind, 'already')
  assert.equal(r.tasksMd, md, 'already 分支原样返回')
  assert.equal(r.next.id, 'task-02')
})

test('①c 未知 id：列可选 id；末格勾完 next=null', () => {
  const md = '- [ ] task-01: 甲\n- [ ] task-02: 乙\n'
  const u = tickTasksMd({ tasksMd: md, taskId: 'task-09' })
  assert.equal(u.kind, 'unknown')
  assert.deepEqual(u.available, ['task-01', 'task-02'])
  const last = tickTasksMd({ tasksMd: '- [x] task-01: 甲\n', taskId: 'task-1' })
  assert.equal(last.kind, 'already')
  assert.equal(last.next, null)
  assert.equal(last.total, 1)
})

// ── ② CLI 端到端 ──

test('②a task tick：翻格+进度回显+下一任务指针；幂等 exit 0', () => {
  const { cwd, cli } = makeRepo()
  const change = '2026-10-01-vtt-1'
  assert.equal(cli(['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为甲\n- 行为乙\n- 行为丙']).status, 0)
  const t1 = cli(['task', 'tick', '--change', change, '--task', 'task-01'])
  assert.equal(t1.status, 0, t1.stderr)
  assert.match(t1.stdout, /已勾（1\/3）/, '进度回显')
  assert.match(t1.stdout, /下一任务：task-02/, '下一任务指针')
  const md1 = readFileSync(join(cwd, '.sillyspec', 'changes', change, 'tasks.md'), 'utf8')
  assert.match(md1, /^- \[x\] task-01:/m)
  assert.match(md1, /^- \[ \] task-02:/m)
  const again = cli(['task', 'tick', '--change', change, '--task', 'task-01'])
  assert.equal(again.status, 0, '幂等不报错')
  assert.match(again.stdout, /已是勾选态/)
  const bad = cli(['task', 'tick', '--change', change, '--task', 'task-09'])
  assert.equal(bad.status, 2)
  assert.match(bad.stderr, /task-01、task-02、task-03/, '未知 id 列可选')
  rmSync(cwd, { recursive: true, force: true })
})

// ── ③ 事件直写（2026-10-07-thin-tasks-v3）──

test('③ tick 事件直写：翻格追加精确 task-done（source:task-tick，单格跳）；幂等重勾零新事件', () => {
  const { cwd, cli } = makeRepo()
  const change = '2026-10-01-vtt-4'
  assert.equal(cli(['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为甲\n- 行为乙\n- 行为丙']).status, 0)
  const evPath = join(cwd, '.sillyspec', '.runtime', `watcher-events-${change}.jsonl`)
  assert.equal(cli(['task', 'tick', '--change', change, '--task', 'task-01']).status, 0)
  assert.equal(cli(['task', 'tick', '--change', change, '--task', 'task-02']).status, 0)
  const stream = readWatcherEvents({ path: evPath })
  assert.equal(stream.exists, true, '事件流文件在场')
  const ticks = stream.events.filter((e) => e.kind === 'task-done' && e.source === 'task-tick')
  assert.deepEqual(ticks.map((e) => e.detail), ['checked 0→1', 'checked 1→2'], '逐格精确事件（watcher 进程缺席，事件全部来自 CLI 直写）')
  const before = readWatcherEvents({ path: evPath }).events.length
  assert.equal(cli(['task', 'tick', '--change', change, '--task', 'task-01']).status, 0, '幂等重勾')
  const after = readWatcherEvents({ path: evPath }).events.length
  assert.equal(after, before, '幂等分支零新事件')
  rmSync(cwd, { recursive: true, force: true })
})

// ── ④ 节奏门去重（纯函数）──

test('④a CLI 连续 tick 的采样合并跳被去重 → 无单拍多格判定', () => {
  const events = [
    { ts: 1, kind: 'task-done', stage: 'tasks', detail: 'checked 0→1', source: 'task-tick' },
    { ts: 1.1, kind: 'task-done', stage: 'tasks', detail: 'checked 1→2', source: 'task-tick' },
    { ts: 2, kind: 'task-done', stage: 'tasks', detail: 'checked 0→2' }, // watcher 3s 采样合并
  ]
  assert.equal(detectBatchCheckCadence(events), null, 'CLI 精确序列在案，采样合并跳剔除')
})

test('④b 纯 Edit 一把勾（无 CLI 事件）→ 仍检出最大跳', () => {
  const events = [
    { ts: 1, kind: 'task-done', stage: 'tasks', detail: 'checked 0→1' },
    { ts: 5, kind: 'task-done', stage: 'tasks', detail: 'checked 1→4' }, // 采样：一次翻三格
  ]
  const worst = detectBatchCheckCadence(events)
  assert.equal(worst.from, 1); assert.equal(worst.to, 4)
})

test('④c 混合面：CLI 勾 1 格 + Edit 一把翻 2 格 → 跳幅按 CLI 落点折算后仍检出 Edit 批量', () => {
  const events = [
    { ts: 1, kind: 'task-done', stage: 'tasks', detail: 'checked 0→1', source: 'task-tick' },
    { ts: 2, kind: 'task-done', stage: 'tasks', detail: 'checked 0→3' }, // 采样：含 CLI 那格 + Edit 两格
  ]
  const worst = detectBatchCheckCadence(events)
  assert.ok(worst, '仍有不可解释的批量跳')
  assert.equal(worst.from, 1, '起点按 CLI 落点抬高（CLI 已勾的 1 格不重复计入跳幅）')
  assert.equal(worst.to, 3)
})

// ── ⑤ done 全勾硬门（2026-10-07-allticked-gate：openspec all_done 对齐）──

test('⑤a 不勾+有交付 → 拒收（未全勾不放行——完成状态机）', () => {
  const { cwd, cli } = makeRepo()
  const change = '2026-10-01-vtt-2'
  assert.equal(cli(['flow', 'start', '--change', change, '--no-review', '--input', '任务\n成功标准：\n- 行为甲\n- 行为乙']).status, 0)
  fillSlots(cwd, change)
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work（不勾选——懒路径同型场景）'], { cwd, stdio: 'pipe' })
  const d = cli(['flow', 'done', '--change', change])
  assert.equal(d.status, 1, '未全勾应拒收')
  assert.match(d.stdout + d.stderr, /任务未全勾（0\/2）/, '全勾硬门文案（进度面）')
  assert.match(d.stdout + d.stderr, /task tick/, '出口指引含 tick 动词')
  assert.equal(existsSync(join(cwd, '.sillyspec', 'changes', change)), true, 'change 保持 active（断点续）')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑤b 部分勾选（认领面勾一半）→ 同样拒收；补齐 token 提交后放行', () => {
  const { cwd, cli } = makeRepo()
  const change = '2026-10-01-vtt-3'
  assert.equal(cli(['flow', 'start', '--change', change, '--no-review', '--input', '任务\n成功标准：\n- 行为甲\n- 行为乙']).status, 0)
  fillSlots(cwd, change)
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'feat: 行为甲 (task-01)'], { cwd, stdio: 'pipe' })
  const t1 = cli(['task', 'tick', '--change', change, '--task', 'task-01'])
  assert.equal(t1.status, 0, 'tick task-01（有 token 证据）')
  const d = cli(['flow', 'done', '--change', change])
  assert.equal(d.status, 1, '部分勾选拒收（1/2）')
  assert.match(d.stdout + d.stderr, /任务未全勾（1\/2）/, '进度面文案')
  // 出口走通：补第二格的 token 提交 → tick → 放行
  writeFileSync(join(cwd, 'work2.js'), 'export const b = 2\n')
  execFileSync('git', ['add', 'work2.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'feat: 行为乙 (task-02)'], { cwd, stdio: 'pipe' })
  assert.equal(cli(['task', 'tick', '--change', change, '--task', 'task-02']).status, 0)
  const ok = cli(['flow', 'done', '--change', change])
  assert.equal(ok.status, 0, `补齐后放行: ${ok.stdout}\n${ok.stderr}`)
  rmSync(cwd, { recursive: true, force: true })
})

// ── ⑥ 工件即时重推接线钉（2026-10-07-allticked-gate-docs-resync）──

test('⑥a shouldResyncDocs 纯函数：四工件内容变更触发、无关事件不触发', async () => {
  const { shouldResyncDocs } = await import('../src/watcher.js')
  assert.equal(shouldResyncDocs([{ kind: 'file-update', detail: 'tasks.md 内容变更' }]), true, 'tasks 变更')
  assert.equal(shouldResyncDocs([{ kind: 'file', detail: 'design.md 出现' }]), true, 'design 出现')
  assert.equal(shouldResyncDocs([{ kind: 'file-update', detail: 'requirements.md 内容变更' }]), true)
  assert.equal(shouldResyncDocs([{ kind: 'file-update', detail: 'proposal.md 内容变更' }]), true)
  assert.equal(shouldResyncDocs([{ kind: 'task-done', detail: 'checked 0→1' }]), false, '勾选事件不是文档变更')
  assert.equal(shouldResyncDocs([{ kind: 'file-update', detail: 'tasks/task-01.md 内容变更' }]), false, '任务卡文件不在四工件面（卡内容走既有事件链）')
  assert.equal(shouldResyncDocs([{ kind: 'commit', detail: 'abc' }, { kind: 'file-update', detail: 'src/x.js 内容变更' }]), false, '代码/提交事件不触发')
  assert.equal(shouldResyncDocs([]), false)
  assert.equal(shouldResyncDocs(null), false)
})

test('⑥b 重推接线钉：task tick 后触发 triggerSync；watcher 循环消费 shouldResyncDocs+防抖', () => {
  const tickSrc = readFileSync(join(ROOT, 'src', 'task-tick.js'), 'utf8')
  assert.ok(tickSrc.includes('triggerSync(cwd, changeName'), 'task tick 翻格后 best-effort triggerSync')
  assert.ok(tickSrc.includes('2026-10-07-allticked-gate-docs-resync'), '留痕注释')
  const watcherSrc = readFileSync(join(ROOT, 'src', 'watcher.js'), 'utf8')
  assert.ok(watcherSrc.includes('shouldResyncDocs(events)'), 'watcher 主循环消费判定函数')
  assert.ok(watcherSrc.includes('DOCS_RESYNC_COOLDOWN_MS'), '防抖冷却在场')
  const flowSrc = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.ok(flowSrc.includes('任务未全勾'), 'flow done 全勾硬门文案在场')
  assert.ok(flowSrc.includes("sentinel: 'incomplete-tasks'"), '拒收落遥测')
})
