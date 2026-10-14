/**
 * turbo-mode-start.test.mjs — 极速模式触发与留痕（FR-01，2026-10-14-thin-turbo-mode）
 *
 * 覆盖验收面：
 *   ① flow start --turbo：flow-state.yaml 落 turbo/turbo_since 留痕 + start 输出极速指引行；
 *   ② 无 --turbo：flow-state 无 turbo 字段、输出无极速行（缺省零回归——缺省路径不进新分支）。
 * 夹具配方对齐 flow-protocol.test.mjs（CLI 子进程 e2e + 临时 git 仓）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'turbo-start-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return { cwd }
}

function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
}

test('① flow start --turbo：flow-state 落 turbo/turbo_since 留痕 + 输出极速指引行', () => {
  const { cwd } = makeRepo()
  const change = '2026-10-14-turbo-start-t1'
  const r = cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成', '--autopilot', '--turbo'])
  assert.equal(r.status, 0, `start 失败: ${r.stdout}\n${r.stderr}`)
  assert.match(r.stdout, /⚡ 极速模式（用户显式触发）/, '极速指引行在场')
  const stPath = join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml')
  assert.ok(existsSync(stPath), 'flow-state 落盘')
  const st = readFileSync(stPath, 'utf8')
  assert.match(st, /^turbo: true$/m, 'turbo 留痕字段')
  assert.match(st, /^turbo_since: '?\d{4}-\d{2}-\d{2}T/m, 'turbo_since ISO 时间戳留痕')
  rmSync(cwd, { recursive: true, force: true })
})

test('② 无 --turbo：flow-state 无 turbo 字段、输出无极速行（缺省零回归）', () => {
  const { cwd } = makeRepo()
  const change = '2026-10-14-turbo-start-t2'
  const r = cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成', '--autopilot'])
  assert.equal(r.status, 0, `start 失败: ${r.stdout}\n${r.stderr}`)
  assert.doesNotMatch(r.stdout, /极速模式/, '无极速指引行')
  const st = readFileSync(join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml'), 'utf8')
  assert.doesNotMatch(st, /^turbo:/m, '无 turbo 字段')
  assert.doesNotMatch(st, /^turbo_since:/m, '无 turbo_since 字段')
  rmSync(cwd, { recursive: true, force: true })
})
