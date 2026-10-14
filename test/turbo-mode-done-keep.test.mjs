/**
 * turbo-mode-done-keep.test.mjs — 极速模式必留面照常（FR-03，2026-10-14-thin-turbo-mode）
 *
 * 覆盖验收面：
 *   ① tasks 全勾门不放松：turbo 变更存在未勾任务 → flow done 照常拒收（exit≠0）；
 *   ② design 空槽拒收不放松：turbo 变更 design 四节未作答 → artifacts 子步照常拒收；
 *   ③ 非 turbo done 输出无极速面痕迹（缺省零回归）。
 * 夹具配方对齐 flow-protocol.test.mjs。
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
  const cwd = mkdtempSync(join(tmpdir(), 'turbo-keep-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return cwd
}

function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
}

function startTurbo(cwd, change) {
  const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成', '--autopilot', '--turbo'])
  assert.equal(s1.status, 0, `start 失败: ${s1.stdout}\n${s1.stderr}`)
  return s1
}

test('① tasks 全勾门不放松：turbo 变更未勾任务 → done 照常拒收', () => {
  const cwd = makeRepo()
  const change = '2026-10-14-turbo-keep-t1'
  startTurbo(cwd, change)
  // 追加一个不勾的任务——全勾硬门（必留面）在 turbo 下必须照常拦截
  const tp = join(cwd, '.sillyspec', 'changes', change, 'tasks.md')
  writeFileSync(tp, readFileSync(tp, 'utf8').replace(/\n$/, '') + '\n- [ ] task-02: 夹具附加任务（故意不勾）\n')
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  execFileSync('git', ['add', 'work.txt'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work (task-01)'], { cwd, stdio: 'pipe' })
  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.notEqual(s2.status, 0, `未勾任务应拒收（exit=${s2.status}）: ${s2.stdout}\n${s2.stderr}`)
  assert.doesNotMatch(s2.stdout, /flow done 完成/, '未完成收口')
  rmSync(cwd, { recursive: true, force: true })
})

test('② design 空槽拒收不放松：turbo 变更四节未作答 → artifacts 子步照常拒收', () => {
  const cwd = makeRepo()
  const change = '2026-10-14-turbo-keep-t2'
  startTurbo(cwd, change)
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  execFileSync('git', ['add', 'work.txt'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work (task-01)'], { cwd, stdio: 'pipe' })
  // 故意不作答 design 四节/FR 槽——文档先行校验（必留面）在 turbo 下必须照常拦截
  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.notEqual(s2.status, 0, `design 空槽应拒收（exit=${s2.status}）: ${s2.stdout}\n${s2.stderr}`)
  assert.doesNotMatch(s2.stdout, /flow done 完成/, '未完成收口')
  rmSync(cwd, { recursive: true, force: true })
})

test('③ 非 turbo done：输出无极速面痕迹（缺省零回归）', () => {
  const cwd = makeRepo()
  const change = '2026-10-14-turbo-keep-t3'
  const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成', '--autopilot'])
  assert.equal(s1.status, 0)
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  execFileSync('git', ['add', 'work.txt'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work (task-01)'], { cwd, stdio: 'pipe' })
  const dp = join(cwd, '.sillyspec', 'changes', change, 'design.md')
  const rp = join(cwd, '.sillyspec', 'changes', change, 'requirements.md')
  writeFileSync(dp, readFileSync(dp, 'utf8').replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：夹具——一行作答即合规'))
  writeFileSync(rp, readFileSync(rp, 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：夹具——无独立测试面'))
  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(s2.status, 0, `done 失败: ${s2.stdout}\n${s2.stderr}`)
  assert.doesNotMatch(s2.stdout, /⚡极速模式/, '无极速标注')
  assert.doesNotMatch(s2.stdout, /评审子步豁免（用户显式极速声明/, '无 turbo 豁免行')
  assert.match(s2.stdout, /test: —｜lint: —/, '实测门照常真跑（纯文档面走 gate 既有 skip 形态，非 turbo 合成对象）')
  rmSync(cwd, { recursive: true, force: true })
})
