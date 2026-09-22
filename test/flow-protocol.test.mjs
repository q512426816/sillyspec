/**
 * flow-protocol.test.mjs — 2-调用协议（R7 切片二 task-03 / D-002 D-003 D-007 / FR-03~06）
 *
 * 覆盖验收面：
 *   ① 机械 harness 2 调用走通薄跑道：flow start → 造改动物 → flow done——全程仅两次 CLI
 *      协议调用（中间零协议必需交互），flow done exit 0 且 change 归档注销；
 *   ② flow start 重入 → 恢复简报（checkbox/提交/账本/dirty files 盘面状态→做到哪/剩什么/下一步）；
 *   ③ fail-closed 三句：实测失败=整单 FAIL exit≠0（不归档）；修复后重入断点续（已完成子步幂等跳过）
 *      ——翻转用 pass.flag 代码文件（local.yaml 是 gitignored 配置，改它不进门禁快照 overlay）；
 *   ④ flow.mode=legacy → flow start 拒跑 exit 2 指路 run <stage>（回滚一行 yaml）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const { cmdFlowStart, cmdFlowDone, readFlowState, writeFlowState } = await import('../src/flow.js')
// CLI 子进程消费形态（index.js case 'flow' → cmdFlow），静态零引用属预期——锚定存在性
if (typeof cmdFlowStart !== 'function' || typeof cmdFlowDone !== 'function' || typeof readFlowState !== 'function' || typeof writeFlowState !== 'function') throw new Error('flow.js 导出面缺失')

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

/** 造临时 git 仓 + local.yaml（test/lint 命令可注入）+ 基线提交。 */
function makeRepo({ testCmd = 'node -e "0"' } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'fp-'))
  const run = (args) => execFileSync('git', args, { cwd, stdio: 'pipe' }).toString().trim()
  run(['init', '-q'])
  run(['config', 'user.email', 't@t'])
  run(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "' + testCmd + '"\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.'])
  run(['commit', '-q', '-m', 'base'])
  return { cwd, run }
}

/** 跑一次 CLI（计一次协议调用）。 */
function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 180_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
}

test('① 机械 harness 2 调用走通薄跑道：start→干活→done，仅两次协议调用，归档注销', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t1'

  // 协议调用 1/2：flow start
  const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件'])
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  assert.match(s1.stdout, /协议调用 1\/2/)
  assert.match(s1.stdout, /flow done/)
  assert.match(s1.stdout, /材料路径清单/)
  const specBase = join(cwd, '.sillyspec')
  assert.ok(existsSync(join(specBase, 'changes', change, 'flow-state.yaml')), 'flow-state 落盘')
  const st = readFileSync(join(specBase, 'changes', change, 'flow-state.yaml'), 'utf8')
  assert.match(st, /baseline_commit:/)
  assert.match(st, /tier: thin/)

  // agent 干活（非协议调用：纯文件+git）
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  execFileSync('git', ['add', 'work.txt'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work'], { cwd, stdio: 'pipe' })

  // 协议调用 2/2：flow done
  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(s2.status, 0, `done 失败: ${s2.stdout}\n${s2.stderr}`)
  assert.match(s2.stdout, /flow done 完成（2\/2 协议调用收口）/)
  assert.equal(existsSync(join(specBase, 'changes', change)), false, '源目录已归档搬走')
  assert.ok(existsSync(join(specBase, 'changes', 'archive')), '归档目录在')
  rmSync(cwd, { recursive: true, force: true })
})

test('② flow start 重入 → 恢复简报（盘面状态信号：dirty/子步标记/下一步）', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t2'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change]).status, 0)
  writeFileSync(join(cwd, 'wip.txt'), 'wip\n')
  const r = cli(cwd, ['flow', 'start', '--change', change])
  assert.equal(r.status, 0)
  assert.match(r.stdout, /恢复简报/)
  assert.match(r.stdout, /dirty 文件 1 个/)
  assert.match(r.stdout, /活未干完/)
  assert.match(r.stdout, /flow done/)
  rmSync(cwd, { recursive: true, force: true })
})

test('③ fail-closed：实测失败=整单 FAIL exit≠0 不归档；修复后重入断点续（子步幂等跳过）', () => {
  const { cwd } = makeRepo({ testCmd: 'node check.js' })
  // 可翻转测试命令：pass.flag 在场→过（local.yaml gitignored 不进快照 overlay，故用代码文件翻转）
  writeFileSync(join(cwd, 'check.js'), "const { existsSync } = require('node:fs'); process.exit(existsSync('pass.flag') ? 0 : 1)\n")
  execFileSync('git', ['add', 'check.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'check'], { cwd, stdio: 'pipe' })
  const change = 'flow-h2-t3'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change]).status, 0)
  writeFileSync(join(cwd, 'work.js'), 'export const x = 1\n')
  const specBase = join(cwd, '.sillyspec')

  // 实测失败 → 整单 FAIL exit 1，change 仍 active（不可假绿）
  const fail = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(fail.status, 1, `首跑应整单 FAIL: ${fail.stdout}\n${fail.stderr}`)
  assert.match(fail.stdout + fail.stderr, /整单 FAIL/)
  assert.ok(existsSync(join(specBase, 'changes', change)), '未归档（归档子步未执行）')

  // 修复（pass.flag 进会话 overlay）后重入：artifacts 已完成幂等跳过，从 ledger 断点续
  writeFileSync(join(cwd, 'pass.flag'), '1\n')
  const retry = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(retry.status, 0, `重入失败: ${retry.stdout}\n${retry.stderr}`)
  assert.match(retry.stdout, /artifacts\(skip\)/, '已完成子步幂等跳过')
  assert.equal(existsSync(join(specBase, 'changes', change)), false, '重入后归档完成')
  // FR-10 失败升厚在案：tier=thick+upgrade_reason（born_face=thin 保归档不死锁）
  const archDir = readdirSync(join(specBase, 'changes', 'archive'))[0]
  const stFinal = readFileSync(join(specBase, 'changes', 'archive', archDir, 'flow-state.yaml'), 'utf8')
  assert.match(stFinal, /tier: thick/)
  assert.match(stFinal, /upgrade_reason: .*失败自动升厚/)
  assert.match(stFinal, /born_face: thin/)
  rmSync(cwd, { recursive: true, force: true })
})

test('④ flow.mode=legacy → flow start 拒跑 exit 2 指路 run <stage>（回滚一行）', () => {
  const { cwd } = makeRepo()
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\nflow:\n  mode: legacy\n')
  const r = cli(cwd, ['flow', 'start', '--change', 'flow-h2-t4'])
  assert.equal(r.status, 2)
  assert.match(r.stderr, /legacy/)
  assert.match(r.stderr, /run <stage>/)
  rmSync(cwd, { recursive: true, force: true })
})

test('⑤ 混跑回退写读两侧：thin change 跑 run <stage> → legacy_fallback 落档；flow done 拒裁 exit 2', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t5'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change]).status, 0)
  // 混跑：run brainstorm 渲染一步（真实 run <stage> 路径）
  const mix = cli(cwd, ['run', 'brainstorm', '--change', change])
  assert.equal(mix.status, 0, `run 应正常: ${mix.stdout}\n${mix.stderr}`)
  assert.match(mix.stdout + mix.stderr, /混跑回退 legacy/)
  const st = readFileSync(join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml'), 'utf8')
  assert.match(st, /legacy_fallback: true/)
  // 读侧：flow done 拒裁并指路
  const done = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(done.status, 2)
  assert.match(done.stderr, /混跑回退 legacy/)
  rmSync(cwd, { recursive: true, force: true })
})
