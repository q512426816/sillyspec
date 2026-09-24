/**
 * trace residual adapter 单测（2026-09-24-fr-test-readside task-01~06）
 *
 * 红线（fr-test-binding §3.3/§3.6 读侧契约）：
 * 1. 锚点集=task 卡 requirement_ids；active·非 superseded·锚命中行才进残差（candidate/orphan 不进）
 * 2. 悬空 fail-fast：active 行引用文件缺失 → failed 且零执行
 * 3. trace 空 → 现选测零漂移；skip+trace 非空 → 跑 trace（mode=trace-residual）
 * 4. 保守差集：仅 deps-auto-subset 文件集可证；命令型全补
 * 5. 披露 sidecar 机械可算、幂等覆盖写
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import {
  resolveVerifyAnchorSet, resolveTraceResidual, applyTraceResidual, writeTraceDisclosure,
} from '../src/verify-postcheck.js'
import { writeChangeTrace, normalizeRow } from '../src/test-bindings.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

/** fixture：仓（package.json+两个真测试文件）+ specBase（changes/c1 含 task 卡与 trace） */
function makeFixture(traceRows, { strategy = null } = {}) {
  const repo = mk('rs-')
  mkdirSync(join(repo, 'test'), { recursive: true })
  writeFileSync(join(repo, 'package.json'), JSON.stringify({ name: 'fx', scripts: { test: 'node --test test/a.test.mjs' } }, null, 2))
  writeFileSync(join(repo, 'test', 'a.test.mjs'), 'import { test } from "node:test"\ntest("a", () => {})\n')
  writeFileSync(join(repo, 'test', 'b.test.mjs'), 'import { test } from "node:test"\ntest("b", () => {})\n')
  execSync('git init -q && git config user.email t@t && git config user.name t && git add -A && git commit -qm base', { cwd: repo })
  const specBase = join(repo, '.sillyspec')
  const chgDir = join(specBase, 'changes', 'c1')
  mkdirSync(join(chgDir, 'tasks'), { recursive: true })
  writeFileSync(join(chgDir, 'tasks', 'task-01.md'), '---\nid: task-01\nrequirement_ids: [FR-01]\n---\n# t\n')
  if (strategy) writeFileSync(join(specBase, 'local.yaml'), `test_strategy: ${strategy}\ncommands:\n  test: npm test\n`)
  if (traceRows) writeChangeTrace(chgDir, 'c1', traceRows)
  return { repo, specBase, chgDir }
}

const activeRow = (over = {}) => normalizeRow({
  anchor: 'FR-01', row_id: 'c1:task-01:acc-0-11111111', tests: ['test/a.test.mjs', 'test/b.test.mjs'],
  reason: 'spec', state: 'active', discovery: 'machine', confirmed_by: 'agent', confirmed_at: 'h',
  source_change: 'c1', ...over,
})

test('R1 残差解析：active·锚命中行进；candidate/orphan/superseded 不进；锚点集来自 task 卡', () => {
  const { repo, specBase } = makeFixture([
    activeRow(),
    activeRow({ row_id: 'c1:task-01:acc-1-22222222', state: 'candidate', confirmed_by: null }),
    activeRow({ anchor: null, row_id: 'c1:task-02:acc-0-33333333' }),
    activeRow({ row_id: 'c1:task-01:acc-2-44444444', status: 'superseded' }),
  ])
  assert.deepEqual(resolveVerifyAnchorSet({ specBase, changeName: 'c1' }), ['FR-01'], 'R1: 锚点集=requirement_ids 并集')
  const tr = resolveTraceResidual({ specBase, changeName: 'c1', cwd: repo })
  assert.equal(tr.rows.length, 1, 'R1: 仅 active+非 superseded+锚命中行')
  assert.deepEqual(tr.files, ['test/a.test.mjs', 'test/b.test.mjs'], 'R1: 文件并集')
  assert.deepEqual(tr.dangling, [], 'R1: 无悬空')
})

test('R2 悬空 fail-fast：active 行引用缺失文件 → failed 且零执行', () => {
  const { repo, specBase } = makeFixture([
    activeRow({ tests: ['test/missing.test.mjs'] }),
  ])
  const tr = resolveTraceResidual({ specBase, changeName: 'c1', cwd: repo })
  assert.deepEqual(tr.dangling, ['test/missing.test.mjs'], 'R2: 悬空清单')
  const out = applyTraceResidual({ mainResult: { status: 'passed', mode: 'full', command: 'npm test' }, action: 'full', cwd: repo, specBase, changeName: 'c1', depsAutoFiles: [], hits: [], knownFailures: [] })
  assert.equal(out.status, 'failed', 'R2: 悬空硬拦')
  assert.equal(out.mode, 'trace-dangling', 'R2: mode 标识')
  assert.match(out.reason, /tests --unbind/, 'R2: 修复指引在场')
  assert.match(out.reason, /missing\.test\.mjs/, 'R2: 缺失清单点名')
})

test('R3 trace 空 → 零行为漂移（原样透传）', () => {
  const { repo, specBase } = makeFixture(null)
  const main = { status: 'skipped', mode: 'strategy-skip', command: null, reason: 'r' }
  const out = applyTraceResidual({ mainResult: main, action: 'skip', cwd: repo, specBase, changeName: 'c1', depsAutoFiles: [], hits: [], knownFailures: [] })
  assert.deepEqual(out, main, 'R3: trace 空对象引用级透传（零漂移）')
})

test('R4 保守差集+残差并入：full 全补；deps-auto-subset 剔除已证文件；skip+trace 跑 trace', () => {
  const { repo, specBase } = makeFixture([activeRow()])
  // full：残差=全部 trace 文件（命令型不可证）
  const outFull = applyTraceResidual({ mainResult: { status: 'passed', mode: 'full', command: 'npm test', durationMs: 5 }, action: 'full', cwd: repo, specBase, changeName: 'c1', depsAutoFiles: [], hits: [], knownFailures: [] })
  assert.equal(outFull.status, 'passed', 'R4: 主跑+残差双绿')
  assert.match(outFull.mode, /\+trace\(2\)/, 'R4: mode 附 +trace(N)（全补 2 文件）')
  // deps-auto-subset：a 已在 deps 文件集 → 残差只补 b
  const outDeps = applyTraceResidual({ mainResult: { status: 'passed', mode: 'module-subset', command: 'deps' }, action: 'deps-auto-subset', cwd: repo, specBase, changeName: 'c1', depsAutoFiles: ['test/a.test.mjs'], hits: [], knownFailures: [] })
  assert.match(outDeps.mode, /\+trace\(1\)/, 'R4: deps 可证文件被剔除（残差 1）')
  // skip+trace 非空 → 跑 trace
  const outSkip = applyTraceResidual({ mainResult: { status: 'skipped', mode: 'strategy-skip', command: null, reason: '按配置跳过' }, action: 'skip', cwd: repo, specBase, changeName: 'c1', depsAutoFiles: [], hits: [], knownFailures: [] })
  assert.equal(outSkip.status, 'passed', 'R4: skip+trace → 残差执行替代')
  assert.equal(outSkip.mode, 'trace-residual', 'R4: mode=trace-residual')
  // 残差段失败 → 整体失败（b 改成必挂）
  writeFileSync(join(repo, 'test', 'b.test.mjs'), 'import { test } from "node:test"\nimport assert from "node:assert/strict"\ntest("boom", () => { assert.fail("x") })\n')
  const outFail = applyTraceResidual({ mainResult: { status: 'passed', mode: 'full', command: 'npm test' }, action: 'full', cwd: repo, specBase, changeName: 'c1', depsAutoFiles: [], hits: [], knownFailures: [] })
  assert.equal(outFail.status, 'failed', 'R4: 残差段失败透传整体 failed')
  assert.match(outFail.reason, /trace 残差段失败/, 'R4: reason 点名残差段')
})

test('R5 披露 sidecar：字段机械可断言 + 幂等覆盖写', () => {
  const { repo, specBase } = makeFixture([activeRow()])
  applyTraceResidual({ mainResult: { status: 'passed', mode: 'full', command: 'npm test' }, action: 'full', cwd: repo, specBase, changeName: 'c1', depsAutoFiles: [], hits: [], knownFailures: [] })
  const p = join(specBase, 'changes', 'c1', 'verify-trace-disclosure.json')
  assert.ok(existsSync(p), 'R5: sidecar 在场')
  const j1 = JSON.parse(readFileSync(p, 'utf8'))
  assert.deepEqual(j1.anchors, ['FR-01'], 'R5: 锚点集')
  assert.equal(j1.rows.length, 1, 'R5: 行映射')
  assert.equal(j1.provableSource, 'none(command-shaped)', 'R5: 命令型不可枚举声明')
  assert.equal(j1.residualFiles.length, 2, 'R5: 残差清单（全补）')
  const before = readFileSync(p, 'utf8')
  writeTraceDisclosure({ specBase, changeName: 'c1', payload: { anchors: ['FR-01'], rows: [], provableSource: 'none(command-shaped)', residualFiles: [] } })
  const j2 = JSON.parse(readFileSync(p, 'utf8'))
  assert.equal(j2.rows.length, 0, 'R5: 覆盖式重写（幂等可复跑）')
  assert.notEqual(before, readFileSync(p, 'utf8'), 'R5: 内容变化如实反映')
})

test('R6 端到端：runVerifyTestCheck 全链（full 主跑+残差并入+披露落盘）', () => {
  const { verifyPostcheck } = { verifyPostcheck: null }
  const vp = import('../src/verify-postcheck.js')
  return vp.then(({ runVerifyTestCheck }) => {
    const { repo, specBase } = makeFixture([activeRow()])
    // local.yaml 配 full + commands.test 指向 a（主跑面不含 b → 残差必须补 b）
    writeFileSync(join(specBase, 'local.yaml'), 'test_strategy: full\ncommands:\n  test: "node --test test/a.test.mjs"\n')
    const r = runVerifyTestCheck({ cwd: repo, specBase, changeName: 'c1' })
    assert.equal(r.status, 'passed', 'R6: 主跑（a）+残差（a,b）双绿')
    assert.match(r.mode, /\+trace\(2\)/, 'R6: 残差并入 mode')
    assert.ok(existsSync(join(specBase, 'changes', 'c1', 'verify-trace-disclosure.json')), 'R6: 披露落盘')
    return null
  })
})
