/**
 * flow-checkpoints.test.mjs — 三断点纪律 + flow status（2026-09-25-flow-checkpoints）
 *
 * 验收面：
 *   ① flow start 简报含三断点纪律文案；
 *   ② flow status 三态：不存在/进行中（阶段+槽位）/已归档。
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
  const cwd = mkdtempSync(join(tmpdir(), 'fc-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' } })
  return { cwd, cli }
}

test('① 简报含三断点纪律', () => {
  const { cwd, cli } = makeRepo()
  const s = cli(['flow', 'start', '--change', 'fc-1', '--input', '任务\n成功标准：\n- 行为 X'])
  assert.equal(s.status, 0)
  assert.match(s.stdout, /三断点纪律/, '三断点标题')
  assert.match(s.stdout, /spec 断点/, '① spec 断点')
  assert.match(s.stdout, /执行断点/, '② 执行断点')
  assert.match(s.stdout, /归档断点/, '③ 归档断点')
  assert.match(s.stdout, /flow status/, 'status 命令指引')
  rmSync(cwd, { recursive: true, force: true })
})

test('② flow status 三态：不存在/进行中/已归档', () => {
  const { cwd, cli } = makeRepo()
  // 不存在
  const none = cli(['flow', 'status', '--change', 'fc-none'])
  assert.equal(none.status, 0)
  assert.match(none.stdout, /不存在/)
  // 进行中
  assert.equal(cli(['flow', 'start', '--change', 'fc-2', '--input', '任务\n成功标准：\n- 行为 X']).status, 0)
  const active = cli(['flow', 'status', '--change', 'fc-2'])
  assert.equal(active.status, 0)
  assert.match(active.stdout, /📋/, '标题')
  assert.match(active.stdout, /spec.*填 FR/, '阶段=spec')
  assert.match(active.stdout, /design.*未填/, 'design 未填')
  rmSync(cwd, { recursive: true, force: true })
})
