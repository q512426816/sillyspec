/**
 * flow-tick-prototype.test.mjs — 任务勾选纪律 + adopt 产物必读（2026-09-25-flow-tick-prototype）
 *
 * 验收面：
 *   ① fresh 简报含任务勾选纪律；
 *   ② adopt 简报动态枚举变更目录产物（design/decisions/原型 HTML）并显式点名原型必看；
 *   ③ flow status 显示任务勾选进度；
 *   ④ flow done 勾选缺失 advisory（不阻断）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'ftp-'))
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
  writeFileSync(dp, readFileSync(dp, 'utf8').replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：夹具'))
  const rp = join(base, 'requirements.md')
  writeFileSync(rp, readFileSync(rp, 'utf8')
    .replace(/(<!--AGENT:FR区[^\n]*-->)/g, '$1\n### FR-01: 夹具行为\nGiven x\nWhen y\nThen z')
    .replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：夹具'))
}

test('① fresh 简报含勾选纪律 + ③ status 显示勾选进度', () => {
  const { cwd, cli } = makeRepo()
  const s = cli(['flow', 'start', '--change', 'ftp-1', '--input', '任务\n成功标准：\n- 行为 X'])
  assert.equal(s.status, 0)
  assert.match(s.stdout, /任务勾选纪律/, 'fresh 勾选纪律')
  assert.match(s.stdout, /完成一条勾一条/, '动作说明')
  const st = cli(['flow', 'status', '--change', 'ftp-1'])
  assert.match(st.stdout, /任务勾选：0\/1/, 'status 显示勾选进度')
  rmSync(cwd, { recursive: true, force: true })
})

test('② adopt 简报枚举产物 + 原型点名', () => {
  const { cwd, cli } = makeRepo()
  const change = 'ftp-2'
  const cd = join(cwd, '.sillyspec', 'changes', change)
  mkdirSync(join(cd, 'prototypes'), { recursive: true })
  writeFileSync(join(cd, 'proposal.md'), '# 提案\n## 成功标准\n- 行为甲\n')
  writeFileSync(join(cd, 'design.md'), '# 设计\n交互流程：见原型\n')
  writeFileSync(join(cd, 'decisions.md'), '# 决策\n## D-001@v1: 取舍\n- 决策：甲\n')
  writeFileSync(join(cd, 'prototypes', 'ui-mock.html'), '<html>mock</html>\n')
  const s = cli(['flow', 'start', '--change', change])
  assert.equal(s.status, 0, s.stderr)
  assert.match(s.stdout, /必读（头脑风暴产出/, '必读段')
  assert.match(s.stdout, /design\.md/, '列 design')
  assert.match(s.stdout, /decisions\.md/, '列 decisions')
  assert.match(s.stdout, /ui-mock\.html/, '列原型文件')
  assert.match(s.stdout, /原型在场（1 个 HTML）|原型/, '原型点名')
  assert.match(s.stdout, /任务勾选纪律/, 'adopt 也有勾选纪律')
  rmSync(cwd, { recursive: true, force: true })
})

test('④ 勾选缺失 advisory：有提交未勾任务 → 警告不阻断', () => {
  const { cwd, cli } = makeRepo()
  const change = 'ftp-3'
  assert.equal(cli(['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X']).status, 0)
  fillSlots(cwd, change)
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work（不勾选）'], { cwd, stdio: 'pipe' })
  const d = cli(['flow', 'done', '--change', change])
  assert.equal(d.status, 0, `不阻断: ${d.stdout}\n${d.stderr}`)
  assert.match(d.stdout + d.stderr, /任务勾选缺失/, 'advisory 在场')
  assert.match(d.stdout + d.stderr, /逐条勾选/, '指引')
  rmSync(cwd, { recursive: true, force: true })
})
