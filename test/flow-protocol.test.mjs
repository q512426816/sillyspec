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
  // flow: mode: thin——2026-09-22-stage-burst-fold 缺省翻 legacy 后薄跑道测试需显式声明（①②③⑤⑥ 共用本造法；④ 另行整文件覆写 legacy）
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "' + testCmd + '"\nflow:\n  mode: thin\n')
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

/** agent 例行动作（2026-09-24 设计记录全档化契约）：给 design.md 四个 AGENT 槽各写一行作答。 */
function fillDesignSlots(cwd, change) {
  const p = join(cwd, '.sillyspec', 'changes', change, 'design.md')
  writeFileSync(p, readFileSync(p, 'utf8').replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：协议测试夹具——一行作答即合规'))
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
  fillDesignSlots(cwd, change)

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
  fillDesignSlots(cwd, change)
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

test('⑥ FR 索引提炼接线：薄变更 flow done 后 requirements 进 knowledge/fr（无 design.md 走交付文件伪域）', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t6'
  const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input',
    'backend 守护任务\n成功标准：\n- backend 守护行为 X 发生'])
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  const specBase = join(cwd, '.sillyspec')
  const reqs = readFileSync(join(specBase, 'changes', change, 'requirements.md'), 'utf8')
  assert.match(reqs, /### FR-01:/, '机器稿 requirements 含 FR 块（供索引解析）')

  // agent 干活：交付文件落在 backend/ 目录（伪域路由信号；用 .txt——.py 交付物会触发门禁
  // python 环境探测族（P17 同族预存行为，无解释器即挂），与本测试目的无关）
  mkdirSync(join(cwd, 'backend', 'app'), { recursive: true })
  writeFileSync(join(cwd, 'backend', 'app', 'deliv.txt'), 'x\n')
  execFileSync('git', ['add', 'backend'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'deliv'], { cwd, stdio: 'pipe' })
  fillDesignSlots(cwd, change)

  const s2 = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(s2.status, 0, `done 失败: ${s2.stdout}\n${s2.stderr}`)
  const frFile = join(specBase, 'knowledge', 'fr', 'auto-backend.md')
  assert.ok(existsSync(frFile), 'FR 索引条目落盘（auto-backend 伪域——无 design.md 时按交付文件路由）')
  const frText = readFileSync(frFile, 'utf8')
  assert.match(frText, new RegExp(`FR-auto-backend-001`))
  assert.match(frText, new RegExp(`变更：${change}`))
  rmSync(cwd, { recursive: true, force: true })
})

test('⑥b 设计记录空槽拒收（CLI 级）：不填 design 槽 → done exit 1 点名空槽；填后放行归档', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t6b'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change]).status, 0)
  writeFileSync(join(cwd, 'work.txt'), 'done\n')
  execFileSync('git', ['add', 'work.txt'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work'], { cwd, stdio: 'pipe' })
  const specBase = join(cwd, '.sillyspec')

  // 空槽 → artifacts 子步拒收 exit 1，点名四个槽，change 仍 active
  const fail = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(fail.status, 1, `空槽应拒收: ${fail.stdout}\n${fail.stderr}`)
  assert.match(fail.stdout + fail.stderr, /设计记录未作答/)
  assert.match(fail.stdout + fail.stderr, /中断于子步「artifacts」/)
  assert.ok(existsSync(join(specBase, 'changes', change)), '未归档')

  // 补答（不适用+理由）→ done 全绿归档 + 实测面对账行（2026-09-25 修复③）
  fillDesignSlots(cwd, change)
  const ok = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(ok.status, 0, `补答后应通过: ${ok.stdout}\n${ok.stderr}`)
  assert.match(ok.stdout, /实测面对账/, '实测面对账行输出（test/lint 命令与结果路径）')
  assert.equal(existsSync(join(specBase, 'changes', change)), false, '归档搬走')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑥c 重入补起草：删 design.md 后重入 start → 幂等补生成 + 恢复简报前执行', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t6c'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change]).status, 0)
  rmSync(join(cwd, '.sillyspec', 'changes', change, 'design.md'), { force: true }) // 模拟工具升级前的在途变更
  const r = cli(cwd, ['flow', 'start', '--change', change])
  assert.equal(r.status, 0)
  assert.match(r.stdout, /重入补生成缺失机器稿 1 件：design\.md/, '补生成提示点名')
  assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', change, 'design.md')), '骨架已补回')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑧ 归属收窄接线钉（文本级，防回潮）：ledger 门与 distill 单源走 attributedChangedFiles', () => {
  const src = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.match(src, /splitOwnVsForeignDiffFiles/, '复用他侧声明切分器')
  const uses = src.split('attributedChangedFiles()').length - 1
  assert.ok(uses >= 2, `ledger 门与 distill 双消费（实测 ${uses} 处）——distill 不得直取 git diff`)
})

test('⑦ 平台同步接线登记钉：flow start 与 flow done 尾部各一次 triggerSync（文本级，防回潮）', () => {
  const src = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  const hits = src.split('await triggerSync(cwd, change)').length - 1
  assert.ok(hits >= 2, `flow.js 应在 start/done 两处尾部触发 triggerSync（实际 ${hits} 处）`)
})
