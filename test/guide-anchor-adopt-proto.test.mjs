/**
 * guide-anchor-adopt-proto.test.mjs — 截断丢规则面的三处尾部锚（2026-10-14-guide-anchor-adopt-proto）
 *
 * sess_fb51d988 实证：CLI 已把含原型分级/真码五要素的步骤指引落盘 step-guides（全文在场），
 * 但工具结果被 harness 尾部截断（agent 只收到 1896 字符、从 ### 铁律 起）——决策关键节整段
 * 丢失，agent 临场发明跳过理由并手绘原型。本测试锁三处尾部锚：
 *   ① outputStep 渲染末尾带 step-guides 全文路径锚行（guide 关闭零输出回归）；
 *   ② flow adopt 尾部材料清单重列变更原型（中部 🖼️ 行的截断保险）；
 *   ③ 恢复简报对含原型变更补尾部必看行（无原型零输出）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'gap-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args, extraEnv = {}) => spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 120_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0', ...extraEnv },
  })
  return { cwd, cli }
}

test('① outputStep 首见渲染末尾带 step-guides 全文锚行', () => {
  const { cwd, cli } = makeRepo()
  const s = cli(['run', 'brainstorm', '--change', '2026-10-14-gap-1', '--input', '需求 X\n成功标准：\n- 行为 A'])
  assert.equal(s.status, 0, s.stderr)
  assert.match(s.stdout, /📄 指引全文锚：.*step-guides[\\/].*\.md（本输出被截断或上下文丢失时 Read 此文件拿回完整步骤规则——决策关键节都在内）/,
    '锚行在场且带 step-guides 文件路径与恢复指引')
  // 位置契约：锚行在 SS-META/完成命令块之后（outputStep 打印序列末尾——尾部截断幸存位）
  const anchorIdx = s.stdout.lastIndexOf('📄 指引全文锚')
  const tailIdx = Math.max(s.stdout.lastIndexOf('--output'), s.stdout.lastIndexOf('SS-META'))
  assert.ok(anchorIdx > tailIdx, `锚行须在输出尾部（anchor=${anchorIdx}, tail=${tailIdx}）`)
  // 锚行路径真实存在（agent 照路径真能 Read 回全文）
  const m = s.stdout.match(/📄 指引全文锚：(.+?)（本输出被截断/)
  assert.ok(m, '锚行可提取路径')
  assert.ok(spawnSync(process.execPath, ['-e', `require('fs').accessSync(${JSON.stringify(m[1].trim())})`]).status === 0,
    `guide 文件真实在场：${m[1].trim()}`)
  rmSync(cwd, { recursive: true, force: true })
})

test('① 回归：SILLYSPEC_STEP_GUIDE=0 时零锚行（确定性测试面不变）', () => {
  const { cwd, cli } = makeRepo()
  const s = cli(['run', 'brainstorm', '--change', '2026-10-14-gap-2', '--input', '需求 X\n成功标准：\n- 行为 A'], { SILLYSPEC_STEP_GUIDE: '0' })
  assert.equal(s.status, 0, s.stderr)
  assert.ok(!s.stdout.includes('📄 指引全文锚'), 'guide 关闭时不得出现锚行')
  assert.ok(!s.stdout.includes('步骤指引未变'), 'guide 关闭时复入短输出也不出现（首见即无 guide 面）')
  rmSync(cwd, { recursive: true, force: true })
})

test('① 复入短输出分支同样带尾部锚行（评审 P3-1 清偿）', () => {
  const { cwd, cli } = makeRepo()
  const args = ['run', 'brainstorm', '--change', '2026-10-14-gap-1b', '--input', '需求 X\n成功标准：\n- 行为 A']
  assert.equal(cli(args).status, 0)
  const s = cli(args) // 第二次渲染同指纹 → 复入短输出分支
  assert.equal(s.status, 0, s.stderr)
  assert.match(s.stdout, /📄 步骤指引未变/, '走复入短输出分支')
  assert.match(s.stdout, /📄 指引全文锚：.*step-guides[\\/].*\.md/, '复入分支尾部锚行同样在场')
  rmSync(cwd, { recursive: true, force: true })
})

test('① --json 劫持态不打印锚行（单测复现 withJsonOutput 劫持形态；评审 P3-1 清偿）', async () => {
  const { outputStep } = await import('../src/run/prompt.js')
  const root = mkdtempSync(join(tmpdir(), 'gap-json-'))
  const specBase = join(root, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  const origLog = console.log
  const origErr = process.stderr.write.bind(process.stderr)
  let captured = ''
  // 与 src/index.js withJsonOutput 同款劫持形态（outputStep 以 String(console.log).includes('stderr.write') 探测）
  console.log = (...a) => process.stderr.write(a.map(String).join(' ') + '\n')
  process.stderr.write = (chunk) => { captured += String(chunk); return true }
  try {
    const steps = [{ name: '确认执行范围', prompt: '解析任务。\n' }]
    await outputStep('execute', 0, steps, root, 'gap-json-1', null, { specRoot: specBase })
  } finally {
    console.log = origLog
    process.stderr.write = origErr
  }
  assert.ok(!captured.includes('📄 指引全文锚'), '--json 劫持态不得打印锚行')
  assert.ok(captured.includes('解析任务'), '劫持态输出本体照常（探测形态正确复现）')
  rmSync(root, { recursive: true, force: true })
})

test('② adopt 尾部材料清单重列变更原型（截断保险）', () => {
  const { cwd, cli } = makeRepo()
  const change = '2026-10-14-gap-3'
  const cd = join(cwd, '.sillyspec', 'changes', change)
  mkdirSync(join(cd, 'prototypes'), { recursive: true })
  writeFileSync(join(cd, 'proposal.md'), '# 提案\n## 成功标准\n- 行为甲\n')
  writeFileSync(join(cd, 'design.md'), '# 设计\n交互流程：见原型\n')
  writeFileSync(join(cd, 'decisions.md'), '# 决策\n## D-001@v1: 取舍\n- 决策：甲\n')
  writeFileSync(join(cd, 'prototypes', 'ui-mock.html'), '<html>mock</html>\n')
  const s = cli(['flow', 'start', '--change', change])
  assert.equal(s.status, 0, s.stderr)
  assert.match(s.stdout, /变更原型（头脑风暴产出，UI 实现前必看——中部 🖼️ 行的绝对尾部重列，防长输出截断丢指针）/, '尾部重列表头在场')
  const occurrences = s.stdout.split('ui-mock.html').length - 1
  assert.ok(occurrences >= 2, `原型路径至少出现两次（中部必读 + 尾部重列），实际 ${occurrences}`)
  // 绝对尾部契约（评审 P3-2 清偿）：重列是最后一个非空内容行——任何截断保尾都幸存
  const contentLines = s.stdout.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '' && !/^\[.*sync/i.test(l))
  const lastRelevant = contentLines[contentLines.length - 1]
  assert.ok(/ui-mock\.html/.test(lastRelevant) || contentLines.slice(-3).some((l) => /ui-mock\.html/.test(l)),
    `重列须在输出绝对尾部（最后内容行：${lastRelevant}）`)
  rmSync(cwd, { recursive: true, force: true })
})

test('③ 恢复简报对含原型变更补尾部必看行（无原型零输出）', () => {
  const { cwd, cli } = makeRepo()
  const change = '2026-10-14-gap-4'
  assert.equal(cli(['flow', 'start', '--change', change, '--input', '需求 X\n成功标准：\n- 行为 A']).status, 0)
  // 首进无原型：恢复简报零新增
  const r0 = cli(['flow', 'start', '--change', change])
  assert.equal(r0.status, 0, r0.stderr)
  assert.match(r0.stdout, /恢复简报/, '走恢复简报路径')
  assert.ok(!r0.stdout.includes('变更原型在场'), '无原型变更恢复简报零新增行')
  // 落一个原型（模拟头脑风暴产物被收编后重入）：尾部必看行在场
  writeFileSync(join(cwd, '.sillyspec', 'changes', change, 'prototype-ui.html'), '<html>p</html>\n')
  const r1 = cli(['flow', 'start', '--change', change])
  assert.equal(r1.status, 0, r1.stderr)
  assert.match(r1.stdout, /- 变更原型在场（UI 实现前必看，界面\/交互\/流程按原型对齐）/,'恢复简报尾部原型行在场')
  assert.match(r1.stdout, /prototype-ui\.html/, '原型路径列出')
  rmSync(cwd, { recursive: true, force: true })
})
