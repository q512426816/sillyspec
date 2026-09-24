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

/** agent 例行动作（2026-09-24 设计记录契约 + 09-25 测试绑定契约）：design 四槽与 requirements
 *  每条 FR 的测试绑定槽各写一行作答。 */
function fillDesignSlots(cwd, change) {
  const base = join(cwd, '.sillyspec', 'changes', change)
  const dp = join(base, 'design.md')
  writeFileSync(dp, readFileSync(dp, 'utf8').replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：协议测试夹具——一行作答即合规'))
  const rp = join(base, 'requirements.md')
  writeFileSync(rp, readFileSync(rp, 'utf8').replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：协议测试夹具——无独立测试面'))
}

test('① 机械 harness 2 调用走通薄跑道：start→干活→done，仅两次协议调用，归档注销', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t1'

  // 协议调用 1/2：flow start
  const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '加一个文件\n成功标准：\n- work.txt 生成且 flow done 全绿'])
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  assert.match(s1.stdout, /协议调用 1\/2/)
  assert.match(s1.stdout, /交付纪律/, '先提交后 done 纪律行')
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
  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '成功标准：\n- 夹具标准 A（清晰度门契约）']).status, 0)
  writeFileSync(join(cwd, 'wip.txt'), 'wip\n')
  const r = cli(cwd, ['flow', 'start', '--change', change, '--input', '成功标准：\n- 夹具标准 A（清晰度门契约）'])
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
  // --no-review：本用例测 fail-closed 测试门，非评审面——声明一票豁免评审（名字撞 1/4 采样桶）
  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '成功标准：\n- 夹具标准 A（清晰度门契约）', '--no-review']).status, 0)
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

test('⑤ 混跑回退写读两侧 + 升厚同意门：无 --upgrade-thick 拒跑；带 flag 落 legacy_fallback 留痕；flow done 拒裁 exit 2', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t5'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '成功标准：\n- 夹具标准 A（清晰度门契约）']).status, 0)
  // 同意门（2026-09-25-thin-upgrade-consent）：agent 不得自行升厚
  const blocked = cli(cwd, ['run', 'brainstorm', '--change', change])
  assert.equal(blocked.status, 2, '无同意 flag 应拒跑')
  assert.match(blocked.stderr, /需用户同意/)
  assert.match(blocked.stderr, /--upgrade-thick/)
  // 用户同意落痕 → 放行并落 legacy_fallback
  const mix = cli(cwd, ['run', 'brainstorm', '--change', change, '--upgrade-thick'])
  assert.equal(mix.status, 0, `带同意 flag 应放行: ${mix.stdout}\n${mix.stderr}`)
  assert.match(mix.stdout + mix.stderr, /经用户同意（--upgrade-thick 落痕）升厚/)
  const st = readFileSync(join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml'), 'utf8')
  assert.match(st, /legacy_fallback: true/)
  assert.match(st, /upgraded_by_consent:/, '同意时点留痕')
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
  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '成功标准：\n- 夹具标准 A（清晰度门契约）']).status, 0)
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

  // 补答（不适用+理由）→ done 全绿归档 + 实测面对账行（2026-09-25 修复③）+ patch 留档 + 绑定链
  fillDesignSlots(cwd, change)
  const ok = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(ok.status, 0, `补答后应通过: ${ok.stdout}\n${ok.stderr}`)
  assert.match(ok.stdout, /实测面对账/, '实测面对账行输出（test/lint 命令与结果路径）')
  assert.match(ok.stdout, /变更 patch 留档/, 'patch 留档行（noAI 冻结）')
  const archDir = join(specBase, 'changes', 'archive')
  const archived = readdirSync(archDir)[0]
  assert.ok(existsSync(join(archDir, archived, 'change.patch')), 'change.patch 随归档留存')
  assert.ok(existsSync(join(archDir, archived, 'change-patch.json')), 'change-patch.json 随归档留存')
  // 零泄漏（2026-09-25-thin-patch-scope-fix）：patch 面 = 提交面 ∪ 本变更目录——非本变更目录的
  // .sillyspec 文件不得入 patch（上变更实测并行会话 WIP 被冻结进来）
  const patchMeta = JSON.parse(readFileSync(join(archDir, archived, 'change-patch.json'), 'utf8'))
  assert.ok(patchMeta.files.includes('work.txt'), '提交面 work.txt 入 patch')
  const leaked = patchMeta.files.filter((f) => f.startsWith('.sillyspec/') && !f.startsWith(`.sillyspec/changes/${change}/`))
  assert.deepEqual(leaked, [], '非本变更目录的 .sillyspec 文件零泄漏')
  assert.ok(patchMeta.files.every((f) => !f.endsWith('change.patch') && !f.endsWith('change-patch.json')), 'patch 不自引用')
  assert.equal(existsSync(join(specBase, 'changes', change)), false, '归档搬走')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑨ 绑定链 e2e：绑定槽写真实测试路径 → test-trace.json 落盘并随发号提升', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t9'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '成功标准：\n- 行为甲发生']).status, 0)
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work'], { cwd, stdio: 'pipe' })
  const base = join(cwd, '.sillyspec', 'changes', change)
  // design 四槽 + 绑定槽写真实测试路径（触发行提取与提升）
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8').replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：绑定链夹具'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8').replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\ntest/flow-protocol.test.mjs ⑨ 绑定链用例'))
  const done = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(done.status, 0, `done 失败: ${done.stdout}\n${done.stderr}`)
  assert.match(done.stdout, /测试绑定行落盘：1 行/, '绑定行落盘输出')
  assert.match(done.stdout, /测试绑定归档提升/, '发号后提升进 knowledge/fr')
  const archDir = join(cwd, '.sillyspec', 'changes', 'archive')
  const archived = readdirSync(archDir)[0]
  const trace = JSON.parse(readFileSync(join(archDir, archived, 'test-trace.json'), 'utf8'))
  assert.equal(trace.rows.length, 1)
  assert.equal(trace.rows[0].anchor, 'FR-01')
  assert.deepEqual(trace.rows[0].tests, ['test/flow-protocol.test.mjs'])
  rmSync(cwd, { recursive: true, force: true })
})

test('⑥c 重入补起草：删 design.md 后重入 start → 幂等补生成 + 恢复简报前执行', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t6c'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '成功标准：\n- 夹具标准 A（清晰度门契约）']).status, 0)
  rmSync(join(cwd, '.sillyspec', 'changes', change, 'design.md'), { force: true }) // 模拟工具升级前的在途变更
  const r = cli(cwd, ['flow', 'start', '--change', change, '--input', '成功标准：\n- 夹具标准 A（清晰度门契约）'])
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

test('⑫ 需求清晰度门：--input 缺失或成功标准 0 条 → exit 2 两选一（不建变更）', () => {
  const { cwd } = makeRepo()
  const r1 = cli(cwd, ['flow', 'start', '--change', 'flow-h2-t12'])
  assert.equal(r1.status, 2)
  assert.match(r1.stderr, /需求不够清晰/, '缺失 input 拦下')
  assert.match(r1.stderr, /头脑风暴预段/, '两选一含预段')
  assert.match(r1.stderr, /成功标准/, '两选一含补输入')
  const r2 = cli(cwd, ['flow', 'start', '--change', 'flow-h2-t12', '--input', '只有动机没有验收条目'])
  assert.equal(r2.status, 2, '有 input 无成功标准同样拦下')
  assert.ok(!existsSync(join(cwd, '.sillyspec', 'changes', 'flow-h2-t12')), '未建变更目录')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑬ adopt 收编：brainstorm 产物目录 → flow start 收编薄道（补缺件+绑定槽+design 豁免）→ done 全绿', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t13'
  // 模拟 brainstorm 预段产物（agent 手写、无 flow-state、无指纹）
  const changeDir = join(cwd, '.sillyspec', 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'proposal.md'), [
    '# 提案书', '', '## 动机', '需要一个守护行为', '',
    '## 成功标准', '- 守护行为 X 发生', '- 崩溃不影响主流程', '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'design.md'), '# 设计\n人机交互产出的完整设计（无骨架槽）\n接口：foo()\n边界：无特殊场景假设\n')
  const s = cli(cwd, ['flow', 'start', '--change', change])
  assert.equal(s.status, 0, `收编失败: ${s.stdout}\n${s.stderr}`)
  assert.match(s.stdout, /头脑风暴产物已收编进薄跑道/, '收编简报')
  const st = readFileSync(join(changeDir, 'flow-state.yaml'), 'utf8')
  assert.match(st, /adopted_from: brainstorm/, 'flow-state 记 adopted_from')
  assert.ok(existsSync(join(changeDir, 'requirements.md')), '缺件 requirements 机器补齐（criteria 回提自 proposal）')
  assert.match(readFileSync(join(changeDir, 'requirements.md'), 'utf8'), /守护行为 X 发生/, 'criteria 回提成功')
  assert.match(readFileSync(join(changeDir, 'requirements.md'), 'utf8'), /<!--AGENT:测试绑定/, '绑定槽收编追加')
  assert.ok(existsSync(join(changeDir, 'tasks.md')), '缺件 tasks 补齐')

  // 干活 + 绑定槽作答 → done（design 四节槽豁免、绑定门生效）
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work'], { cwd, stdio: 'pipe' })
  writeFileSync(join(changeDir, 'requirements.md'), readFileSync(join(changeDir, 'requirements.md'), 'utf8')
    .replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\ntest/flow-protocol.test.mjs ⑬ 收编用例'))
  const done = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(done.status, 0, `done 失败: ${done.stdout}\n${done.stderr}`)
  assert.match(done.stdout, /豁免 design 四节槽门/, 'adopted design 豁免提示')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑭ 入口归一实效：无 flow 配置缺省 thin 可跑；复杂特征命中打升厚建议', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'fp-default-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  // 无 flow 配置——2026-09-25 起缺省即 thin
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const change = 'flow-h2-t14'
  const s = cli(cwd, ['flow', 'start', '--change', change, '--input', '数据库迁移守护\n成功标准：\n- 迁移后数据完整'])
  assert.equal(s.status, 0, `缺省 thin 应可跑: ${s.stdout}\n${s.stderr}`)
  assert.match(s.stdout, /thin 薄跑道/, '缺省走薄跑道')
  assert.match(s.stdout, /复杂变更特征命中/, 'classify 预判提示在场')
  assert.match(s.stdout, /由用户裁决/, '升厚裁决权归用户文案')
  assert.match(s.stdout, /--upgrade-thick/, '同意门指引在场')
  // 无复杂特征输入不打建议（负例）
  const s2 = cli(cwd, ['flow', 'start', '--change', 'flow-h2-t14b', '--input', '小修补\n成功标准：\n- 文案改正'])
  assert.equal(s2.status, 0)
  assert.doesNotMatch(s2.stdout, /复杂变更特征命中/, '无特征不打扰')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑮ 承诺词必评全链：任务书下发→review.json 回收→PASS 归档+遥测', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t15'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '守护任务\n成功标准：\n- 重复写入幂等收敛']).status, 0)
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work'], { cwd, stdio: 'pipe' })
  fillDesignSlots(cwd, change)
  const specBase = join(cwd, '.sillyspec')
  const changeDir = join(specBase, 'changes', change)

  // 首跑：承诺词命中 → 评审任务书下发 exit 1（断点在 review 子步）
  const f1 = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(f1.status, 1, `首跑应在 review 断点: ${f1.stdout}\n${f1.stderr}`)
  assert.match(f1.stdout, /需要独立评审（.*承诺词.*）/, '承诺词定档理由')
  assert.match(f1.stdout, /独立评审任务书/, '任务书渲染')
  assert.match(f1.stdout, /请求预算硬帽 12/, '预算帽在场')
  assert.match(f1.stdout + f1.stderr, /中断于子步「review」/, '断点报位')

  // 子代理产物 review.json（PASS）→ 重跑通过归档
  writeFileSync(join(changeDir, 'review.json'), JSON.stringify({
    schemaVersion: 1, change, reviewer: 'subagent', verdict: 'PASS', findings: [],
    dimensionNotes: { 乱序: 'n/a', 并发: 'n/a', 切换: 'n/a', 作用域: 'n/a' }, reviewedAt: new Date().toISOString(),
  }))
  const ok = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(ok.status, 0, `复跑应通过: ${ok.stdout}\n${ok.stderr}`)
  assert.match(ok.stdout, /独立评审通过（reviewer=subagent）/)
  const archDir = join(specBase, 'changes', 'archive')
  const archived = readdirSync(archDir)[0]
  assert.ok(existsSync(join(archDir, archived, 'review.json')), 'review.json 随归档留档')
  assert.ok(existsSync(join(archDir, archived, 'verify-result.md')), 'verify-result 回执随归档留档')
  assert.match(readFileSync(join(archDir, archived, 'verify-result.md'), 'utf8'), /结论\*\*：PASS/, '回执含结论')
  assert.match(readFileSync(join(archDir, archived, 'verify-result.md'), 'utf8'), /独立评审\*\*：PASS/, '回执含评审结论')
  assert.match(readFileSync(join(archDir, archived, 'verify-result.md'), 'utf8'), /（断点续跑回读最新实测记录）/, '回执实测面回填（ledger skip 后不留占位）')
  const tl = readFileSync(join(specBase, '.runtime', 'flow-telemetry.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.change === change).pop()
  assert.equal(tl.review.verdict, 'PASS', '遥测记评审结论')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑯ 评审 P1 拦截：FAIL+P1 发现 → 拒归档并列明细，修复后删件重评', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t16'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X', '--review']).status, 0)
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work'], { cwd, stdio: 'pipe' })
  fillDesignSlots(cwd, change)
  const changeDir = join(cwd, '.sillyspec', 'changes', change)
  writeFileSync(join(changeDir, 'review.json'), JSON.stringify({
    schemaVersion: 1, change, reviewer: 'subagent', verdict: 'FAIL',
    findings: [{ severity: 'P1', title: '承诺违反：声称的收敛未实现', evidence: 'diff 无重试路径', location: 'work.js:1' }],
    dimensionNotes: {}, reviewedAt: new Date().toISOString(),
  }))
  const f = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(f.status, 1, 'P1 必须拒归档')
  assert.match(f.stdout + f.stderr, /\[P1\] 承诺违反/, 'P1 明细列出')
  assert.match(f.stdout + f.stderr, /修复后删除 review\.json/, '重评指引')
  assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', change)), '未归档')
  const tlFail = readFileSync(join(cwd, '.sillyspec', '.runtime', 'flow-telemetry.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).find((r) => r.change === change && r.review)
  assert.equal(tlFail.review.verdict, 'FAIL', '失败面评审结论已落遥测（修 P2①）')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑰ 声明通道：--review 一票必评 / --no-review 一票豁免', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t17'
  assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X', '--review']).status, 0)
  fillDesignSlots(cwd, change)
  const f = cli(cwd, ['flow', 'done', '--change', change])
  assert.equal(f.status, 1, '无产物无声明外的他信号，--review 单独即必评')
  assert.match(f.stdout, /显式 --review 声明/, '声明一票理由')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑱ 平台参数面：--spec-dir 外置根全链（start→done 归档落外置根，本地 changes 零残留，ENOENT 消失）', () => {
  const { cwd } = makeRepo()
  const plat = mkdtempSync(join(tmpdir(), 'fp-plat-')) + '/spec-root/nested' // 故意不预建嵌套层——旧实现在此 ENOENT
  const change = '2026-09-25-obs-events-ab12cd'
  const s = cli(cwd, ['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X', '--spec-dir', plat])
  assert.equal(s.status, 0, `外置根 start 应通过（旧实现 ENOENT 崩溃）: ${s.stdout}\n${s.stderr}`)
  assert.ok(existsSync(join(plat, 'changes', change, 'flow-state.yaml')), 'flow-state 落外置根（含嵌套目录自动创建）')
  assert.ok(!existsSync(join(cwd, '.sillyspec', 'changes', change)), '本地 changes 零残留（PM 锚定修复）')
  assert.ok(existsSync(join(plat, '.runtime', 'sillyspec.db')), '进度库落外置根（DB 与工件同根）')
  writeFileSync(join(cwd, 'work.js'), 'export const a = 1\n')
  execFileSync('git', ['add', 'work.js'], { cwd, stdio: 'pipe' })
  execFileSync('git', ['commit', '-q', '-m', 'work'], { cwd, stdio: 'pipe' })
  // 外置根无 .sillyspec 层——change 目录直挂 spec 根下，槽位内联填
  const pc = join(plat, 'changes', change)
  writeFileSync(join(pc, 'design.md'), readFileSync(join(pc, 'design.md'), 'utf8').replace(/(<!--AGENT:槽\d+[^\n]*-->)/g, '$1\n不适用：平台参数面夹具'))
  writeFileSync(join(pc, 'requirements.md'), readFileSync(join(pc, 'requirements.md'), 'utf8').replace(/(<!--AGENT:测试绑定FR-\d+[^\n]*-->)/g, '$1\n不适用：平台参数面夹具'))
  const d = cli(cwd, ['flow', 'done', '--change', change, '--spec-dir', plat])
  assert.equal(d.status, 0, `外置根 done 应通过: ${d.stdout}\n${d.stderr}`)
  assert.ok(existsSync(join(plat, 'changes', 'archive')), '归档落外置根')
  rmSync(cwd, { recursive: true, force: true })
  rmSync(plat, { recursive: true, force: true })
})

test('⑲ 预建空目录放行：平台 writer 形态（先建空目录再 spawn）→ 全新 start，非空仍拒', () => {
  const { cwd } = makeRepo()
  const change = 'flow-h2-t19'
  mkdirSync(join(cwd, '.sillyspec', 'changes', change), { recursive: true })
  const s = cli(cwd, ['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X'])
  assert.equal(s.status, 0, `空目录应放行: ${s.stdout}\n${s.stderr}`)
  assert.match(s.stdout, /预建空变更目录放行/)
  assert.ok(existsSync(join(cwd, '.sillyspec', 'changes', change, 'flow-state.yaml')))
  // 非空且无头脑风暴产物 → legacy 拒收维持
  const change2 = 'flow-h2-t19b'
  mkdirSync(join(cwd, '.sillyspec', 'changes', change2), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', change2, 'plan.md'), '# legacy 残留\n')
  const s2 = cli(cwd, ['flow', 'start', '--change', change2, '--input', '任务\n成功标准：\n- 行为 X'])
  assert.equal(s2.status, 2, '非空无产物仍拒')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑳ 变更名白名单：穿越/分隔符/default/quick-hex 拒收，合法名放行', () => {
  const { cwd } = makeRepo()
  for (const bad of ['../evil', 'a/b', 'a\\b', 'default', 'quick-ab12cd34', '..']) {
    const r = cli(cwd, ['flow', 'start', '--change', bad, '--input', '任务\n成功标准：\n- 行为 X'])
    assert.equal(r.status, 2, `非法名「${bad}」应拒`)
    assert.match(r.stderr, /非法变更名/)
  }
  const ok = cli(cwd, ['flow', 'start', '--change', '2026-09-25-中文名-a1b2c3', '--input', '任务\n成功标准：\n- 行为 X'])
  assert.equal(ok.status, 0, '中文与平台键形态合法')
  rmSync(cwd, { recursive: true, force: true })
})

test('㉑ 平台指针恢复 + 清晰度门格式样例', () => {
  const { cwd } = makeRepo()
  const plat = mkdtempSync(join(tmpdir(), 'fp-ptr-'))
  writeFileSync(join(cwd, '.sillyspec-platform.json'), JSON.stringify({ specRoot: plat }))
  const change = 'flow-h2-t21'
  const s = cli(cwd, ['flow', 'start', '--change', change, '--input', '任务\n成功标准：\n- 行为 X'])
  assert.equal(s.status, 0, `指针恢复应落外置根: ${s.stdout}\n${s.stderr}`)
  assert.ok(existsSync(join(plat, 'changes', change, 'flow-state.yaml')), '经 .sillyspec-platform.json 恢复 specRoot')
  rmSync(cwd, { recursive: true, force: true })
  rmSync(plat, { recursive: true, force: true })
  // 格式样例（清晰度门文案）
  const cwd2 = makeRepo().cwd
  const gate = cli(cwd2, ['flow', 'start', '--change', 'x1'])
  assert.match(gate.stderr, /独立一行只写「成功标准：」/, '过门格式样例在场')
  assert.match(gate.stderr, /- <可验证标准>/)
  rmSync(cwd2, { recursive: true, force: true })
})

test('⑦ 平台同步接线登记钉：flow start 与 flow done 尾部各一次 triggerSync（文本级，防回潮）', () => {
  const src = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  const hits = src.split('await triggerSync(cwd, change)').length - 1
  assert.ok(hits >= 2, `flow.js 应在 start/done 两处尾部触发 triggerSync（实际 ${hits} 处）`)
})
