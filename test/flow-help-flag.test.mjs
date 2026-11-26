/**
 * 2026-11-26-flow-help-flag-shortcircuit 回归：flow 帮助旗标短路。
 *
 * 背景（坑：multi-agent-platform 仓 docs/sillyspec/2026-11-25-flow-start-help-as-start-call）：cmdFlow 只按 args[0] 分发，`--help` 留在
 * rest 里无人消费——`flow start --help` 被当作缺 --input 的立项：以 `<日期>-flow-<随机>`
 * 兜底变更名一路走到需求清晰度门，提示里带一个看似真实却从未落盘的临时变更名；其余
 * 子命令带 --help 报「需 --change <名>」。
 *
 * 锁定：
 *   ① 帮助旗标形态判定（子命令带 --help/-h、flow 自身带、flow help [子命令]）与参数值误判面；
 *   ② 用法列出八个子命令，旗标集合与 cmdFlow 实际消费集合双向相等（防用法与代码脱节）；
 *   ③ 短路先于平台 spec 根解析与任何落盘（指针损坏的 cwd 下仍打印用法，不调 process.exit）；
 *   ④ 未知/空子命令的兜底行为不变（stderr 用法 + exit 2）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { cmdFlow } from '../src/flow.js'

const ROOT = join(import.meta.dirname, '..')
const flowSrc = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')

const FLOW_SUBCOMMANDS = ['start', 'done', 'status', 'verify-drafts', 'diff', 'approve', 'reject', 'amend-draft']
const INPUT_FORM_HEAD = '--input "<一句 10-30 字中文概括'

/** cmdFlow 源码段（帮助纯函数在其外，不计入消费面）。 */
function cmdFlowRegion() {
  const start = flowSrc.indexOf('export async function cmdFlow(')
  assert.ok(start !== -1, 'cmdFlow 在场')
  const next = flowSrc.indexOf('\nexport ', start + 1)
  return flowSrc.slice(start, next === -1 ? undefined : next)
}

/** cmdFlow 实际消费的旗标集合（getFlag/hasFlag 调用点）。 */
function consumedFlags() {
  const out = new Set()
  for (const m of cmdFlowRegion().matchAll(/(?:getFlag|hasFlag)\('(--[a-z-]+)'\)/g)) out.add(m[1])
  return [...out].sort()
}

/** 用法行里列出的旗标集合（只扫子命令用法行与通用旗标行，不扫详注教学行）。 */
function listedFlags(lines) {
  const out = new Set()
  for (const l of lines) {
    if (!/^  (?:sillyspec flow |通用旗标)/.test(l)) continue
    for (const m of l.matchAll(/--[a-z-]+/g)) out.add(m[0])
  }
  return [...out].sort()
}

/** 进程内调用 cmdFlow：截获 stdout/stderr 与 process.exit（exit 被调即抛哨兵，测试不退出）。 */
async function runInProcess(args, cwd) {
  const out = []
  const err = []
  const exitCodes = []
  const orig = { log: console.log, error: console.error, exit: process.exit }
  console.log = (...a) => { out.push(a.map(String).join(' ')) }
  console.error = (...a) => { err.push(a.map(String).join(' ')) }
  process.exit = (code) => { exitCodes.push(code); throw new Error(`process.exit(${code})`) }
  try {
    let result = null
    let thrown = null
    try {
      result = await cmdFlow(args, cwd, null)
    } catch (e) {
      thrown = e
    }
    return { result, thrown, out: out.join('\n'), err: err.join('\n'), exitCodes }
  } finally {
    console.log = orig.log
    console.error = orig.error
    process.exit = orig.exit
  }
}

function tmpCwd() {
  return mkdtempSync(join(tmpdir(), 'flow-help-'))
}

test('帮助旗标形态判定：子命令带帮助旗标与 flow help 均判为帮助，正常调用不误判', async () => {
  const { isFlowHelpInvocation, flowHelpTarget } = await import('../src/flow.js')
  assert.equal(typeof isFlowHelpInvocation, 'function', 'isFlowHelpInvocation 导出在场')
  assert.equal(typeof flowHelpTarget, 'function', 'flowHelpTarget 导出在场')

  const yes = [
    ['--help', []], ['-h', []], ['help', []], ['help', ['done']],
    ['start', ['--help']], ['start', ['-h']], ['done', ['--help']],
    ['start', ['--change', 'x', '--input', 'y', '--help']],
  ]
  for (const [sub, rest] of yes) {
    assert.equal(isFlowHelpInvocation(sub, rest), true, `flow ${sub} ${rest.join(' ')} 应判为帮助`)
  }
  const no = [
    ['', []], ['start', []], ['start', ['--input', 'x']], ['status', ['--change', 'x']],
    // 参数值位置的 help 不是帮助请求
    ['start', ['--input', 'help']], ['start', ['--change', 'help']], ['done', ['--reason', 'help']],
    // 相近词不是子命令位 help
    ['helping', []],
  ]
  for (const [sub, rest] of no) {
    assert.equal(isFlowHelpInvocation(sub, rest), false, `flow ${sub} ${rest.join(' ')} 不应判为帮助`)
  }

  assert.equal(flowHelpTarget('help', ['done']), 'done')
  assert.equal(flowHelpTarget('help', []), null)
  assert.equal(flowHelpTarget('start', ['--help']), 'start')
  assert.equal(flowHelpTarget('--help', []), null)
  assert.equal(flowHelpTarget('help', ['no-such-sub']), null)
})

test('用法内容：八个子命令与代码内实际消费旗标齐备，含 --input 照抄形态', async () => {
  const { flowHelpLines } = await import('../src/flow.js')
  assert.equal(typeof flowHelpLines, 'function', 'flowHelpLines 导出在场')
  const lines = flowHelpLines(null)
  assert.ok(Array.isArray(lines) && lines.length > 0, '用法行非空')
  const text = lines.join('\n')
  for (const sub of FLOW_SUBCOMMANDS) {
    assert.ok(lines.some((l) => l.startsWith(`  sillyspec flow ${sub} --change`)), `用法列出子命令 ${sub}`)
  }
  assert.ok(text.includes(INPUT_FORM_HEAD), 'start 的 --input 照抄形态在场')
  assert.ok(text.includes('--no-prestage'), '预段同意门提示在场')

  // 双向相等：用法列出的旗标 == cmdFlow 实际消费的旗标（不多列、不漏列）
  const consumed = consumedFlags()
  assert.ok(consumed.length >= 20, `消费面提取正常（实际 ${consumed.length} 个旗标）`)
  assert.deepEqual(listedFlags(lines), consumed)
})

test('目标定位：start 目标输出照抄详注，非 start 目标不输出', async () => {
  const { flowHelpLines } = await import('../src/flow.js')
  assert.equal(typeof flowHelpLines, 'function', 'flowHelpLines 导出在场')
  assert.ok(flowHelpLines('start').some((l) => l.includes(INPUT_FORM_HEAD)), 'start 目标含照抄详注')
  assert.ok(flowHelpLines(null).some((l) => l.includes(INPUT_FORM_HEAD)), '无目标默认含 start 照抄详注')
  for (const sub of ['done', 'status', 'verify-drafts', 'diff', 'approve', 'reject', 'amend-draft']) {
    assert.ok(!flowHelpLines(sub).some((l) => l.includes(INPUT_FORM_HEAD)), `${sub} 目标不输出 start 照抄详注`)
    assert.ok(flowHelpLines(sub).some((l) => l.startsWith(`  sillyspec flow ${sub} --change`)), `${sub} 目标仍列全部用法`)
  }
})

test('进程内调用 flow start 帮助旗标：打印用法并正常返回且零落盘', async () => {
  const cwd = tmpCwd()
  try {
    const r = await runInProcess(['start', '--help'], cwd)
    assert.equal(r.thrown, null, `不应抛出（实际 ${r.thrown && r.thrown.message}）`)
    assert.deepEqual(r.exitCodes, [], '不调用 process.exit')
    assert.deepEqual(r.result, { help: true })
    assert.ok(r.out.includes('sillyspec flow start --change'), 'stdout 打印用法')
    assert.ok(!r.out.includes('需求不够清晰'), '不走需求清晰度提示')
    assert.ok(!/-flow-[0-9a-f]{4}/.test(r.out), '不输出任何生成的临时变更名')
    assert.ok(!existsSync(join(cwd, '.sillyspec')), '不创建 .sillyspec 目录')
    assert.ok(!existsSync(join(cwd, '.sillyspec-platform.json')), '不创建平台指针')

    // 其余子命令同理：不再报「需 --change <名>」
    const d = await runInProcess(['done', '--help'], cwd)
    assert.equal(d.thrown, null)
    assert.deepEqual(d.result, { help: true })
    assert.ok(d.out.includes('sillyspec flow done --change'))
    assert.ok(!d.err.includes('需 --change'), '不再报需 --change')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('短路先于平台 spec 根解析：指针损坏的 cwd 下仍打印用法', async () => {
  const cwd = tmpCwd()
  try {
    // 非法 JSON 的平台指针：resolvePlatformSpecDir 必抛 PointerUnreachableError，
    // cmdFlow 的 fail-closed 分支会 process.exit(2)——帮助短路必须先于它。
    writeFileSync(join(cwd, '.sillyspec-platform.json'), '{not json')
    const r = await runInProcess(['start', '--help'], cwd)
    assert.equal(r.thrown, null, `不应触发 fail-closed（实际 ${r.thrown && r.thrown.message}）`)
    assert.deepEqual(r.exitCodes, [], '不调用 process.exit')
    assert.deepEqual(r.result, { help: true })
    assert.ok(r.out.includes('sillyspec flow start --change'), '仍打印用法')
    assert.ok(!r.err.includes('平台 spec 根解析失败'), '未进入平台 spec 根解析的失败分支')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('未知子命令兜底不变：stderr 用法并 exit 2', async () => {
  const cwd = tmpCwd()
  try {
    for (const args of [['no-such-sub'], []]) {
      const r = await runInProcess(args, cwd)
      assert.deepEqual(r.exitCodes, [2], `flow ${args.join(' ')} 以退出码 2 结束`)
      assert.ok(r.err.includes('用法: sillyspec flow start --change <名>'), 'stderr 打印既有用法首行')
      assert.ok(r.err.includes('--input 可照抄形态'), 'stderr 保留照抄形态教学')
      assert.equal(r.out, '', '兜底不写 stdout')
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})
