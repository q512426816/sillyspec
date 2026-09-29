/**
 * flow-status-heartbeat.test.mjs — 执行期任务心跳（2026-09-29-flow-task-heartbeat）
 *
 * openspec apply 轮询形状移植：②执行阶段 flow status 当场重读 tasks.md（唯一进度源），
 * 由机器给「下一个未勾任务」指针 + 进度 + 循环协议指引；全勾改指 flow done。
 *
 * 覆盖：
 *   ① ②执行阶段：下一任务=第一个 - [ ] 行（id+标题截断）+ 进度 N/M + 协议指引行
 *   ② 全勾：心跳改指 flow done（含逐 task 证据口径提示）
 *   ③ ①阶段（槽未填）：不刷心跳（spec 期无任务面）
 *   ④ 源码钉：简报/tasks.md 头部/AGENTS.md 三处协议文案同步（tick-loop-nudge ①③ 的接续）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { cmdFlow } = await import(pathToFileURL(join(ROOT, '..', 'src', 'flow.js')).href)

const CHANGE = '2026-09-29-hb'

function fixture({ ticked = ['task-01', 'task-02'], specReady = true } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'fshb-'))
  const dir = join(cwd, '.sillyspec', 'changes', CHANGE)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'flow-state.yaml'), 'tier: thin\nsubsteps: {}\n')
  writeFileSync(join(dir, 'design.md'), specReady ? [
    '# D', '',
    '<!--AGENT:槽1 -->', '答一', '',
    '<!--AGENT:槽2 -->', '答二', '',
    '<!--AGENT:槽3 -->', '答三', '',
    '<!--AGENT:槽4 -->', '答四', '',
  ].join('\n') : '# D\n')
  writeFileSync(join(dir, 'requirements.md'), specReady ? [
    '# R', '',
    '<!--AGENT:FR区 -->', '### FR-01: 某需求', '- 场景：x', '',
    '<!--AGENT:测试绑定FR-01 -->', 'test/a.test.mjs「用例」', '',
  ].join('\n') : '# R\n')
  const tick = (id) => (ticked.includes(id) ? 'x' : ' ')
  writeFileSync(join(dir, 'tasks.md'), [
    '---', 'author: t', '---', '# T', '',
    `- [${tick('task-01')}] task-01: 第一件`, '',
    `- [${tick('task-02')}] task-02: 第二件`, '',
    `- [${tick('task-03')}] task-03: 第三件要做的下一件事`, '',
    `- [${tick('task-04')}] task-04: 第四件`, '',
  ].join('\n'))
  return { cwd, dir }
}

async function runStatus(cwd) {
  const orig = console.log
  let out = ''
  console.log = (...a) => { out += a.join('\n') + '\n' }
  try {
    await cmdFlow(['status', '--change', CHANGE], cwd, null)
  } finally {
    console.log = orig
  }
  return out
}

test('① ②执行阶段：下一任务指针 + 进度 + 循环协议指引', async () => {
  const { cwd } = fixture()
  try {
    const out = await runStatus(cwd)
    assert.ok(out.includes('阶段：②'), `应判②执行阶段，实际：${out}`)
    assert.ok(out.includes('⏭️ 下一任务：task-03 第三件要做的下一件事'), '下一任务=第一个未勾行（id+标题）')
    assert.ok(out.includes('进度：2/4'), '进度 N/M 在场')
    assert.ok(out.includes('做一件 → 勾一格') && out.includes('重跑本命令取下一个'), '循环协议指引在场')
    assert.ok(out.includes('勿攒一把勾'), '纪律提示在场')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('② 全勾：心跳改指 flow done（含逐 task 证据口径）', async () => {
  const { cwd } = fixture({ ticked: ['task-01', 'task-02', 'task-03', 'task-04'] })
  try {
    const out = await runStatus(cwd)
    assert.ok(out.includes('任务全勾（4/4）'), '全勾态提示在场')
    assert.ok(out.includes('flow done'), '改指 flow done 收口')
    assert.ok(!out.includes('⏭️ 下一任务'), '全勾时无下一任务指针')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('③ ①阶段（spec 槽未填）：不刷心跳', async () => {
  const { cwd } = fixture({ specReady: false })
  try {
    const out = await runStatus(cwd)
    assert.ok(out.includes('阶段：①'), `应判①spec阶段，实际：${out}`)
    assert.ok(!out.includes('⏭️ 下一任务'), '①阶段不刷心跳')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('③b 行形态漂移（未勾行缺 task-NN 前缀）：不误刷「任务全勾」（评审 P3 钉）', async () => {
  const { cwd, dir } = fixture({ ticked: ['task-01', 'task-02'] })
  try {
    // 把 task-03 的未勾行改成无前缀形态（行形态漂移模拟）
    const p = join(dir, 'tasks.md')
    writeFileSync(p, readFileSync(p, 'utf8').replace('- [ ] task-03: 第三件要做的下一件事', '- [ ] 第三件（前缀漂移）'))
    const out = await runStatus(cwd)
    assert.ok(!out.includes('⏭️ 下一任务'), '漂移行不进下一任务指针')
    assert.ok(!out.includes('任务全勾'), 'c<tot 不得误刷任务全勾（2/4≠全勾）')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('④ 协议文案三处同步钉（简报/tasks 头/AGENTS.md）', () => {
  const flowSrc = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  assert.ok(flowSrc.includes('heartbeat'), '心跳变量在场')
  assert.ok(flowSrc.includes('执行期节拍器'), '简报协议文案（fresh+resume 两路其一）')
  assert.ok(flowSrc.includes('做一件 → 勾一格'), '循环协议文案')
  const draftSrc = readFileSync(join(ROOT, '..', 'src', 'flow-draft.js'), 'utf8')
  assert.ok(draftSrc.includes('每勾一格重跑 `sillyspec flow status --change <名>` 取下一个任务'), 'tasks.md 头部节拍器指引')
  const agents = readFileSync(join(ROOT, '..', 'AGENTS.md'), 'utf8')
  assert.ok(agents.includes('执行期节拍器'), 'AGENTS.md 恢复与查看段协议行')
})
