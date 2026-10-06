/**
 * 2026-10-07-test-incremental-rerun — 实测门失败面增量重跑回归
 *
 * postmortem：verify --done 跑 10 分钟级测试子集 → 挂 N 个 → 修一行 → 重跑 --done 又全量
 * 重跑（green cache 改一行即失效）——每轮返工整轮全跑。锁死契约：
 *   IR1 computeIncrementalFace：失败 ledger + 修复 delta → 增量面 = 失败批 ∪ since，严格小于全量面；
 *   IR2 集成主链路（runVerifyTestCheck）：首跑全子集失败落 ledger → 修复 → 次跑 mode=incremental-rerun
 *      且命令面不含未触碰测试 → 增量绿过门，ledger 清 failedFiles（第三轮回全子集基线）；
 *   IR3 verify: test_rerun: full → 恒全子集（现状行为）；
 *   IR4 无 ledger 首跑 = dynamic-subset 全子集（现状零回归）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  runVerifyTestCheck, computeIncrementalFace, readTestRerunLedger, writeTestRerunLedger,
} from '../src/verify-postcheck.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })

test('IR1 computeIncrementalFace 纯函数三态', () => {
  const face = ['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js']
  const ledger = { head: 'abc123', failedFiles: ['test/a.test.mjs'], inputFiles: face }
  // 失败批 ∪ since 严格小于面 → 增量
  const r1 = computeIncrementalFace({ ledger, filesSince: ['src/b.js'], fullFace: face })
  assert.ok(r1, '有 delta → 增量')
  assert.deepEqual([...r1.files].sort(), ['src/b.js', 'test/a.test.mjs'], '面=失败批∪since')
  assert.ok(r1.note.includes('未触碰绿面复用'), '公告含复用说明')
  // 无 ledger / 无失败文件 / 无 head → null
  assert.equal(computeIncrementalFace({ ledger: null, filesSince: [], fullFace: face }), null)
  assert.equal(computeIncrementalFace({ ledger: { head: 'x', failedFiles: [] }, filesSince: [], fullFace: face }), null)
  assert.equal(computeIncrementalFace({ ledger: { head: null, failedFiles: ['f'] }, filesSince: [], fullFace: face }), null)
  // 增量面 ≥ 全量面 → null（回全子集）
  assert.equal(computeIncrementalFace({ ledger: { head: 'x', failedFiles: face }, filesSince: face, fullFace: face }), null)
})

/**
 * 集成夹具：4 源文件 + 4 测试（b 初始失败）。变更面 = 4 src 文件（faceOverride 权威面）。
 * runVerifyTestCheck 需 specBase local.yaml 可缺省（无 test_strategy → dynamic）。
 */
function integrationFixture({ yaml = null } = {}) {
  const root = mk('ir-')
  const specBase = join(root, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  if (yaml) writeFileSync(join(specBase, 'local.yaml'), yaml)
  writeFileSync(join(root, '.gitignore'), '.sillyspec/\n')
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  for (const n of ['a', 'b', 'c', 'd']) writeFileSync(join(root, 'src', `${n}.js`), 'export const v = 1\n')
  const testBody = (n, ok) => `import { test } from 'node:test'\nimport { v } from '../src/${n}.js'\ntest('${n}', () => { if (v !== ${ok ? 1 : 2}) throw new Error('boom') })\n`
  for (const n of ['a', 'b', 'c', 'd']) writeFileSync(join(root, 'test', `${n}.test.mjs`), testBody(n, n !== 'b'))
  git(root, ['init', '-q']); git(root, ['config', 'user.email', 't@t']); git(root, ['config', 'user.name', 't'])
  git(root, ['add', '.']); git(root, ['commit', '-qm', 'init'])
  return { root, specBase, face: ['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js'] }
}

test('IR2 集成主链路：全子集失败→修复→增量绿→ledger 清账', () => {
  const { root, specBase, face } = integrationFixture()
  const run = () => runVerifyTestCheck({ cwd: root, specBase, changeName: 'c1', faceOverride: face })

  // 首跑：无 ledger → 全子集，b 失败
  const r1 = run()
  assert.equal(r1.status, 'failed', '首跑失败（b 用例挂）')
  assert.equal(r1.mode, 'dynamic-subset', '首跑全子集模式')
  const ledger1 = readTestRerunLedger({ specBase, changeName: 'c1' })
  assert.ok(ledger1, 'ledger 已落')
  assert.ok(ledger1.failedFiles.includes('test/b.test.mjs'), `失败批文件在账：${ledger1.failedFiles}`)

  // 修复：改 test/b.test.mjs（工作树修改 → since delta）
  writeFileSync(join(root, 'test', 'b.test.mjs'), `import { test } from 'node:test'\nimport { v } from '../src/b.js'\ntest('b', () => { if (v !== 1) throw new Error('boom') })\n`)

  // 次跑：增量档
  const r2 = run()
  assert.equal(r2.status, 'passed', '增量面绿过门')
  assert.equal(r2.mode, 'incremental-rerun', '模式=增量重跑')
  const cmd = String(r2.command || '')
  assert.ok(!cmd.includes('a.test.mjs') || !/deps/.test(cmd), `命令面收窄（未触碰测试不重跑）：${cmd}`)
  assert.ok(r2.reason.includes('增量重跑'), 'reason 标注增量')

  // ledger 清账：failedFiles 空 → 下轮回全子集
  const ledger2 = readTestRerunLedger({ specBase, changeName: 'c1' })
  assert.deepEqual(ledger2.failedFiles, [], '增量绿后清账')
})

test('IR3 verify: test_rerun: full → 恒全子集（现状行为）', () => {
  const { root, specBase, face } = integrationFixture({ yaml: 'verify:\n  test_rerun: full\n' })
  const run = () => runVerifyTestCheck({ cwd: root, specBase, changeName: 'c1', faceOverride: face })
  const r1 = run() // 失败
  assert.equal(r1.status, 'failed')
  writeFileSync(join(root, 'test', 'b.test.mjs'), `import { test } from 'node:test'\nimport { v } from '../src/b.js'\ntest('b', () => { if (v !== 1) throw new Error('boom') })\n`)
  const r2 = run()
  assert.equal(r2.mode, 'dynamic-subset', 'config full → 仍全子集（不走增量）')
})

test('IR4 ledger 读写 fail-soft + 首跑前 ledger 读不到', () => {
  const specBase = join(mk('ir4-'), '.sillyspec')
  assert.equal(readTestRerunLedger({ specBase, changeName: 'x' }), null, '无文件 → null')
  writeTestRerunLedger({ specBase, changeName: 'x', head: 'abc', inputFiles: ['a'], failedFiles: ['b'], mode: 'dynamic-subset', status: 'failed' })
  const l = readTestRerunLedger({ specBase, changeName: 'x' })
  assert.equal(l.head, 'abc')
  assert.deepEqual(l.failedFiles, ['b'])
})
