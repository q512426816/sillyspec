/**
 * 2026-10-06-flow-status-json 回归：flow status --json 机器可读输出
 *
 * 覆盖：
 *   ① 活跃变更 --json：stdout 单对象合法 JSON，九字段齐备（change/phase/designFilled/
 *      frFilled/bindingsFilled/bindingsTotal/tasksChecked/tasksTotal/substeps），
 *      值与人类可读路径同源（同 fixture 两条路径跑出同事实）
 *   ② 前置三形态：missing exit 1（子进程验真退出码——in-process 会杀 runner），与人类
 *      路径退出码一致；archived / dir-no-state exit 0 且 JSON 带对应 status 标记
 *   ③ 人类可读回归：不带 --json 关键行仍在（事实/渲染分离不得改坏渲染面；缺 tasks.md
 *      时不渲染任务勾选行的现状一并钉住）
 *   ④ test:core 清单驻留断言（防移出日常拦截面）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { cmdFlow } = await import(pathToFileURL(join(ROOT, '..', 'src', 'flow.js')).href)
const binCLI = join(ROOT, '..', 'bin', 'sillyspec.js')

const CHANGE = '2026-10-06-fsj'

function fixture({ withTasks = true } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'fsj-'))
  const dir = join(cwd, '.sillyspec', 'changes', CHANGE)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'flow-state.yaml'), 'tier: thin\nsubsteps: {}\n')
  writeFileSync(join(dir, 'design.md'), [
    '# D', '',
    '<!--AGENT:槽1 -->', '答一', '',
    '<!--AGENT:槽2 -->', '答二', '',
    '<!--AGENT:槽3 -->', '答三', '',
    '<!--AGENT:槽4 -->', '答四', '',
  ].join('\n'))
  writeFileSync(join(dir, 'requirements.md'), [
    '# R', '',
    '<!--AGENT:FR区 -->', '### FR-01: 某需求', '- 场景：x', '',
    '<!--AGENT:测试绑定FR-01 -->', 'test/a.test.mjs「用例」', '',
  ].join('\n'))
  if (withTasks) {
    writeFileSync(join(dir, 'tasks.md'), [
      '---', 'author: t', '---', '# T', '',
      '- [x] task-01: 第一件', '',
      '- [ ] task-02: 第二件', '',
      '- [ ] task-03: 第三件', '',
    ].join('\n'))
  }
  return { cwd, dir }
}

async function runStatus(cwd, args = []) {
  const orig = console.log
  let out = ''
  console.log = (...a) => { out += a.join('\n') + '\n' }
  try {
    await cmdFlow(['status', '--change', CHANGE, ...args], cwd, null)
  } finally {
    console.log = orig
  }
  return out
}

test('① 活跃变更 --json：单对象合法 JSON，九字段齐备且与人类路径同源', async () => {
  const { cwd } = fixture()
  try {
    const out = await runStatus(cwd, ['--json'])
    const lines = out.split('\n').filter((l) => l.trim() !== '')
    assert.equal(lines.length, 1, `stdout 应恰一行 JSON，实际：${out}`)
    const j = JSON.parse(lines[0])
    for (const f of ['change', 'phase', 'designFilled', 'frFilled', 'bindingsFilled', 'bindingsTotal', 'tasksChecked', 'tasksTotal', 'substeps']) {
      assert.ok(f in j, `字段 ${f} 缺失：${JSON.stringify(j)}`)
    }
    assert.equal(j.change, CHANGE)
    assert.equal(j.status, 'active')
    assert.ok(j.phase.startsWith('②'), `槽已填应判②执行，实际：${j.phase}`)
    assert.equal(j.designFilled, true)
    assert.equal(j.frFilled, true)
    assert.equal(j.bindingsFilled, 1)
    assert.equal(j.bindingsTotal, 1)
    assert.equal(j.tasksChecked, 1)
    assert.equal(j.tasksTotal, 3)
    assert.deepEqual(j.substeps, [])
    // 同源：同 fixture 人类路径渲染出的事实值与 JSON 字段一致
    const human = await runStatus(cwd)
    assert.ok(human.includes('阶段：②'), '人类路径同判②')
    assert.ok(human.includes('design 槽：✅ 已填') && human.includes('FR 区：✅ 已填'), '人类路径槽位事实一致')
    assert.ok(human.includes('绑定槽：1/1'), '人类路径绑定事实一致')
    assert.ok(human.includes('任务勾选：1/3'), '人类路径勾选事实一致')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('①b 真实 CLI 入口（bin）：--json 经 index.js 全局解析透传进 flow 族（透传钉）', () => {
  const { cwd } = fixture()
  try {
    const r = spawnSync(process.execPath, [binCLI, 'flow', 'status', '--change', CHANGE, '--json'], { cwd, encoding: 'utf8' })
    assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}（stdout=${r.stdout} stderr=${r.stderr}）`)
    const lines = (r.stdout || '').split('\n').filter((l) => l.trim() !== '')
    assert.equal(lines.length, 1, `stdout 应恰一行 JSON，实际：${r.stdout}`)
    const j = JSON.parse(lines[0])
    assert.equal(j.change, CHANGE)
    assert.equal(j.status, 'active')
    assert.equal(j.tasksChecked, 1)
    assert.equal(j.tasksTotal, 3)
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('②a 已归档形态：JSON 标记 archived，exit 0（in-process 正常返回即 0）', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fsj-arc-'))
  try {
    mkdirSync(join(cwd, '.sillyspec', 'changes', 'archive', CHANGE), { recursive: true })
    const out = await runStatus(cwd, ['--json'])
    const j = JSON.parse(out.trim())
    assert.equal(j.change, CHANGE)
    assert.equal(j.status, 'archived')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('②b 目录在场无 flow-state：JSON 标记 dir-no-state，exit 0', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fsj-dir-'))
  try {
    const dir = join(cwd, '.sillyspec', 'changes', CHANGE)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'design.md'), '# D\n')
    const out = await runStatus(cwd, ['--json'])
    const j = JSON.parse(out.trim())
    assert.equal(j.change, CHANGE)
    assert.equal(j.status, 'dir-no-state')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('②c 变更不存在：JSON 标记 missing 且 exit 1——与人类路径退出码一致（子进程验真）', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fsj-miss-'))
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true }) // 过未初始化目录硬拦（2026-10-10-cli-uninit-cwd-gate）：本用例测变更不存在语义
  try {
    const miss = '2099-01-01-no-such-change'
    const jrun = spawnSync(process.execPath, [binCLI, 'flow', 'status', '--change', miss, '--json'], { cwd, encoding: 'utf8' })
    assert.equal(jrun.status, 1, `--json missing 应 exit 1，实际 ${jrun.status}（stdout=${jrun.stdout} stderr=${jrun.stderr}）`)
    const j = JSON.parse(jrun.stdout.trim())
    assert.equal(j.change, miss)
    assert.equal(j.status, 'missing')
    const hrun = spawnSync(process.execPath, [binCLI, 'flow', 'status', '--change', miss], { cwd, encoding: 'utf8' })
    assert.equal(hrun.status, 1, `人类路径 missing 应 exit 1，实际 ${hrun.status}`)
    assert.ok(hrun.stdout.includes('变更不存在'), '人类路径文案在场')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('③ 人类可读回归：不带 --json 关键行未变形；缺 tasks.md 时不渲染勾选行', async () => {
  const { cwd } = fixture({ withTasks: false })
  try {
    const out = await runStatus(cwd)
    assert.ok(out.includes(`📋 ${CHANGE}`), '标题行在场')
    assert.ok(out.includes('阶段：'), '阶段行在场')
    assert.ok(out.includes('design 槽：') && out.includes('FR 区：') && out.includes('绑定槽：'), '槽位行在场')
    assert.ok(!out.includes('任务勾选：'), '缺 tasks.md 时不得渲染任务勾选行（现状钉）')
    assert.ok(out.includes('子步：0/8'), '子步行在场且计数正确')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('④ test:core 清单驻留：本测试文件在 package.json test:core 内（防移出日常拦截面）', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, '..', 'package.json'), 'utf8'))
  assert.ok(
    (pkg.scripts?.['test:core'] || '').includes('test/flow-status-json.test.mjs'),
    'test:core 必须包含 test/flow-status-json.test.mjs',
  )
})
