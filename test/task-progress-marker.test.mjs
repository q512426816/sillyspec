/**
 * task 进行中状态标记（2026-09-12 驾驭第十四批②，用户实证「中断续跑半成品无主、主代理
 * 接管审查负担重」）：start/finish/list 三态 + >2h 陈旧标红。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const binCLI = join(fileURLToPath(import.meta.url).replace(/[^/\\]+$/, ''), '..', 'bin', 'sillyspec.js')

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function runCli(cwd, args) {
  const r = spawnSync(process.execPath, [binCLI, ...args], { cwd, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') }
}

function fixture() {
  const proj = mk('tpm-')
  return proj
}

test('start/finish/list 生命周期：标记落盘、finish 清除、list 汇总', () => {
  const proj = fixture()
  const r1 = runCli(proj, ['task', 'start', '--change', 'c1', '--task', 'task-01', '--note', '写接口'])
  assert.equal(r1.status, 0, 'start exit 0')
  const marker = join(proj, '.sillyspec', '.runtime', 'task-progress', 'c1', 'task-01.json')
  assert.ok(existsSync(marker), '标记文件落盘')

  const r2 = runCli(proj, ['task', 'list', '--change', 'c1'])
  assert.ok(r2.out.includes('task-01') && r2.out.includes('写接口'), 'list 汇总含 task 与 note')

  const r3 = runCli(proj, ['task', 'finish', '--change', 'c1', '--task', 'task-01'])
  assert.ok(r3.out.includes('已清除'), 'finish 清除')
  assert.ok(!existsSync(marker), '标记文件删除')

  const r4 = runCli(proj, ['task', 'list', '--change', 'c1'])
  assert.ok(r4.out.includes('无') || r4.out.includes('全部完工'), 'list 空态')
})

test('list：>2h 标红中断遗留（接管审查点名）', () => {
  const proj = fixture()
  const dir = join(proj, '.sillyspec', '.runtime', 'task-progress', 'c1')
  mkdirSync(dir, { recursive: true })
  // 3 小时前开始（中断遗留）+ 刚开始（活跃）
  const stale = new Date(Date.now() - 3 * 3600_000).toISOString()
  writeFileSync(join(dir, 'task-01.json'), JSON.stringify({ task: 'task-01', note: '中断前', startedAt: stale }))
  writeFileSync(join(dir, 'task-02.json'), JSON.stringify({ task: 'task-02', note: '进行中', startedAt: new Date().toISOString() }))
  const r = runCli(proj, ['task', 'list', '--change', 'c1'])
  assert.ok(r.out.includes('🔴') && r.out.includes('中断遗留'), '陈旧标红 + 接管提示')
  assert.ok(r.out.includes('🟢'), '活跃标记绿')
  assert.ok(r.out.includes('1 个疑似中断遗留'), '汇总计数')
})

test('参数校验：list 缺 change / start 缺 task 报错', () => {
  const proj = fixture()
  assert.notEqual(runCli(proj, ['task', 'list']).status, 0, '缺 --change 报错')
  assert.notEqual(runCli(proj, ['task', 'start', '--change', 'c1']).status, 0, '缺 --task 报错')
})
