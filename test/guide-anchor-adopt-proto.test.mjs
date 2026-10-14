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
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n')
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
  assert.match(s.stdout, /变更原型（头脑风暴产出，UI 实现前必看——中部 🖼️ 行的尾部重列，防长输出截断丢指针）/, '尾部重列表头在场')
  const occurrences = s.stdout.split('ui-mock.html').length - 1
  assert.ok(occurrences >= 2, `原型路径至少出现两次（中部必读 + 尾部重列），实际 ${occurrences}`)
  // 尾部重列须在材料路径清单之后（截断幸存位）
  assert.ok(s.stdout.lastIndexOf('ui-mock.html') > s.stdout.indexOf('材料路径清单'), '尾部重列位于材料清单段内')
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
