/**
 * 2026-11-15-change-key-visibility 回归：变更创建时点四入口输出变更身份行
 * （完整 key + 名称 + 必须转述给用户的指令）——agent 读到即可照抄展示，
 * 用户不再「不知道创建的啥变更名」。
 *
 * 四入口：① flow start 新建横幅；② flow start adopt 收编；③ run brainstorm
 * 零活跃自动创建；④ run <stage> --change 净新建（brainstorm 显式入口）。
 * 单一来源：src/change-identity.js renderChangeIdentityLine。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

/** 身份行形态：key 与名称分组捕获（名称推导链归各自变更所有，此处只断言在场与非空）。 */
const IDENTITY_RE = /📣 变更身份（必须原样转述给用户——用户需知道本次创建的变更名）：key：(.+?)｜名称：(.+)/

/** 造临时 git 仓 + local.yaml（thin 轻量跑道，run brainstorm 与 flow 通用）。 */
function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'cil-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e 0"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return { cwd }
}

const cli = (cwd, args) => spawnSync(process.execPath, [CLI, ...args], {
  cwd, encoding: 'utf8', timeout: 180_000,
  env: { ...process.env, SILLYSPEC_WATCHER: '0', SILLYSPEC_SESSION_ID: 'cil-test' },
})

test('单源纯函数：行形态与 title 兜底', async () => {
  const { renderChangeIdentityLine } = await import(pathToFileURL(join(ROOT, 'src', 'change-identity.js')).href)
  const line = renderChangeIdentityLine('2026-11-15-ci-unit', '变更创建时向用户展示完整身份')
  assert.equal(line, '📣 变更身份（必须原样转述给用户——用户需知道本次创建的变更名）：key：2026-11-15-ci-unit｜名称：变更创建时向用户展示完整身份', '行形态逐字')
  assert.equal(renderChangeIdentityLine('2026-11-15-ci-unit'), '📣 变更身份（必须原样转述给用户——用户需知道本次创建的变更名）：key：2026-11-15-ci-unit｜名称：2026-11-15-ci-unit', 'title 缺省兜底 change')
})

test('FR-01 flow start 新建横幅含变更身份行（key+名称+转述指令）', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-01-ci-fresh'
  const r = cli(cwd, ['flow', 'start', '--change', change, '--input', '首行概括合规达标用例\n成功标准：\n- 身份行在场'])
  assert.equal(r.status, 0, `start 应成功: ${r.stdout}\n${r.stderr}`)
  const m = r.stdout.match(IDENTITY_RE)
  assert.ok(m, '变更身份行在场')
  assert.equal(m[1], change, 'key=--change 完整值')
  assert.equal(m[2], '首行概括合规达标用例', '名称=--input 首行提炼标题（合规首行原样）')
  rmSync(cwd, { recursive: true, force: true })
})

test('FR-02 adopt 收编输出含变更身份行', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-01-ci-adopt'
  // 模拟 brainstorm 预段产物（同 flow-protocol ⑬ 造法：agent 手写、无 flow-state）
  const changeDir = join(cwd, '.sillyspec', 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'proposal.md'), [
    '# 提案书', '', '## 动机', '需要一个守护行为', '',
    '## 成功标准', '- 守护行为 X 发生', '',
  ].join('\n'))
  const r = cli(cwd, ['flow', 'start', '--change', change])
  assert.equal(r.status, 0, `收编应成功: ${r.stdout}\n${r.stderr}`)
  const m = r.stdout.match(IDENTITY_RE)
  assert.ok(m, '收编输出含变更身份行')
  assert.equal(m[1], change, 'key=变更名完整值')
  assert.ok(m[2] && m[2].length > 0, '名称非空（收编推导标题）')
  assert.ok(r.stdout.indexOf('📣 变更身份') < r.stdout.indexOf('头脑风暴产物已收编'), '身份行先于收编横幅输出（adopt try 块内接线形态）')
  rmSync(cwd, { recursive: true, force: true })
})

test('FR-03 run brainstorm 自动创建输出含变更身份行', () => {
  const { cwd } = makeRepo()
  const r = cli(cwd, ['run', 'brainstorm'])
  assert.equal(r.status, 0, `自动创建应成功: ${r.stdout.slice(-300)}\n${r.stderr.slice(-300)}`)
  assert.ok(r.stdout.includes('自动创建变更'), '既有行保留（兼容断言面）')
  const m = r.stdout.match(IDENTITY_RE)
  assert.ok(m, '自动创建后输出变更身份行')
  assert.match(m[1], /^\d{4}-\d{2}-\d{2}-new-change-[0-9a-f]{8}$/, 'key=自动生成完整 key')
  assert.ok(m[2] && m[2].length > 0, '名称非空（无 --input 时兜底=key）')
  assert.ok(r.stdout.indexOf('自动创建变更') < r.stdout.indexOf('📣 变更身份'), '身份行在自动创建提示之后')
  rmSync(cwd, { recursive: true, force: true })
})

test('FR-04 run brainstorm 显式 --change 净新建输出含变更身份行', () => {
  const { cwd } = makeRepo()
  const change = '2026-09-01-ci-explicit'
  const r = cli(cwd, ['run', 'brainstorm', '--change', change, '--input', '显式净新建入口用例'])
  assert.equal(r.status, 0, `显式净新建应成功: ${r.stdout.slice(-300)}\n${r.stderr.slice(-300)}`)
  const m = r.stdout.match(IDENTITY_RE)
  assert.ok(m, '净新建注册后输出变更身份行')
  assert.equal(m[1], change, 'key=--change 完整值')
  assert.equal(m[2], '显式净新建入口用例', '名称=--input 首行提炼标题（合规首行原样）')
  rmSync(cwd, { recursive: true, force: true })
})
