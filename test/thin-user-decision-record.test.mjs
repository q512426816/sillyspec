/**
 * thin-user-decision-record.test.mjs — 执行期用户决策落盘三触点（2026-10-20-thin-user-decision-record）
 *
 * 轻量道执行期用户口头决策无落盘纪律——会话内容不可审计，漏记是静默价值漏损。
 * 三触点文案注入（零新机制，通道复用既有 decisions add → upsertDecision）：
 *   ① flow start 全新横幅：执行期用户决策落盘纪律行（命令样例 + 承诺面同步提示）；
 *     重入恢复简报不注入（恢复面读盘面）。
 *   ② 断点②行文追加汇报对账半句（保留「执行断点」关键词与既有句）。
 *   ③ task tick 回显 decisions.md 存在性 gating 提示（advisory：不改 exit code、
 *     在场分支零新增行）——同 approve-gate-tick 现场提醒形态。
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
  const cwd = mkdtempSync(join(tmpdir(), 'udr-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0', SILLYSPEC_SESSION_ID: 'udr-test' } })
  return { cwd, cli }
}

const INPUT = '执行期用户决策落盘提示三触点\n成功标准：\n- 行为 X\n- 行为 Y'
const CHANGE = '2026-09-01-udr-1'

test('① 横幅纪律行：全新 start 含 decisions add 样例与承诺面提示；重入恢复简报不注入', () => {
  const { cwd, cli } = makeRepo()
  const s = cli(['flow', 'start', '--change', CHANGE, '--input', INPUT])
  assert.equal(s.status, 0, `start exit 0（实际 ${s.status}）`)
  assert.match(s.stdout, /decisions add --change/, '纪律行含命令样例')
  assert.match(s.stdout, /承诺面/, '纪律行含承诺面同步提示')
  // 重入恢复简报：恢复面读盘面，禁止注入新纪律行
  const r = cli(['flow', 'start', '--change', CHANGE])
  assert.equal(r.status, 0, `resume exit 0（实际 ${r.status}）`)
  assert.ok(!/decisions add/.test(r.stdout), `恢复简报不含纪律行，实际尾部：${r.stdout.slice(-400)}`)
  rmSync(cwd, { recursive: true, force: true })
})

test('② 断点②对账半句：保留「执行断点」关键词，追加汇报对账', () => {
  const { cwd, cli } = makeRepo()
  const s = cli(['flow', 'start', '--change', CHANGE, '--input', INPUT])
  assert.equal(s.status, 0)
  assert.match(s.stdout, /执行断点/, '断点②关键词保留（flow-checkpoints 断言兼容）')
  assert.match(s.stdout, /等用户确认再跑收口/, '既有句逐字保留')
  assert.match(s.stdout, /汇报顺带对账/, '追加对账半句')
  rmSync(cwd, { recursive: true, force: true })
})

test('③ tick 条件提示：decisions.md 缺席附提示行；在场零新增（exit code 不变）', () => {
  const { cwd, cli } = makeRepo()
  cli(['flow', 'start', '--change', CHANGE, '--input', INPUT])
  const t1 = cli(['task', 'tick', '--change', CHANGE, '--task', 'task-01'])
  assert.equal(t1.status, 0, 'advisory 不阻断勾选')
  assert.match(t1.stdout, /已勾/, '既有回显行在场')
  assert.match(t1.stdout, /decisions add --change/, '缺席分支附落盘提示')
  // 决策落盘后 → 提示消失，翻格行为与 exit code 不变
  writeFileSync(join(cwd, '.sillyspec', 'changes', CHANGE, 'decisions.md'), '# 决策记录\n\n## D-001@v1 样例\n- 状态：confirmed\n')
  const t2 = cli(['task', 'tick', '--change', CHANGE, '--task', 'task-02'])
  assert.equal(t2.status, 0)
  assert.match(t2.stdout, /已勾/, '在场分支既有回显不变')
  assert.ok(!/decisions add/.test(t2.stdout), `在场分支零新增提示行，实际：${t2.stdout.slice(-400)}`)
  rmSync(cwd, { recursive: true, force: true })
})

test('④ 既有套件零回归：approve-gate-tick / task-tick / flow-checkpoints / flow-order-canon 全绿', () => {
  // 剥离 NODE_TEST_CONTEXT：外层 node --test 注入的该变量会让内层 node --test 把自己
  // 当成 reporter 子进程秒退（stdout 零摘要、exit 0）——嵌套跑测试套件的已知坑。
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  const s = spawnSync(process.execPath, [
    '--test',
    'test/approve-gate-tick.test.mjs',
    'test/task-tick.test.mjs',
    'test/flow-checkpoints.test.mjs',
    'test/flow-order-canon.test.mjs',
  ], { cwd: ROOT, encoding: 'utf8', timeout: 300_000, env })
  assert.equal(s.status, 0, `四套件全绿（实际 exit ${s.status}）\n${(s.stdout + s.stderr).slice(-1500)}`)
  const failMatch = /ℹ fail (\d+)/.exec(s.stdout)
  assert.ok(failMatch, 'TAP 摘要在场')
  assert.equal(failMatch[1], '0', 'fail 计数为 0')
})
