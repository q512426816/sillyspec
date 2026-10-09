/**
 * trace 行 repo 归属回归锁（2026-10-09-verify-reuse-friction FR-06 / D-005@v1）。
 *
 * 2026-10-09 取证：跨仓 task 卡（repo: sillyspec）的 tests 路径（仓根相对）被抄进 trace 行，
 * 悬空判定与残差执行用主仓 cwd 解析 → 跨仓路径恒悬空 fail-fast（连烧 4 轮实测）。修复：
 * 行携 repo 字段（写侧自 task 卡透传，additive 缺省主仓）；读侧悬空判定/残差执行按行 repo
 * 经 repos 注册表换根；未注册 repo 回退主仓（现状行为）且 dangling 消息带 repo: 前缀可见。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, isAbsolute, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { normalizeRow, writeChangeTrace, readChangeTrace } from '../src/test-bindings.js'
import { resolveTraceResidual, applyTraceResidual } from '../src/verify-postcheck.js'

function fixture() {
  const main = mkdtempSync(join(tmpdir(), 'crossrow-main-'))
  const cross = mkdtempSync(join(tmpdir(), 'crossrow-cross-'))
  const specBase = join(main, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'c1', 'tasks'), { recursive: true })
  mkdirSync(join(cross, 'test'), { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), `repos:\n  sillyspec: ${isAbsolute(cross) ? cross.replace(/\\/g, '/') : cross}\n`)
  // 锚点集：task 卡 requirement_ids
  writeFileSync(join(specBase, 'changes', 'c1', 'tasks', 'task-01.md'), '---\nid: task-01\nrequirement_ids: [FR-01]\n---\n')
  return { main, cross, specBase }
}

test('normalizeRow：repo 字段 additive 保留；main/缺省不落键（存量零迁移）', () => {
  const kept = normalizeRow({ anchor: 'FR-01', row_id: 'r1', tests: ['test/a.test.mjs'], reason: 'spec', state: 'candidate', repo: 'sillyspec' })
  assert.equal(kept.repo, 'sillyspec', '跨仓 repo 保留')
  assert.equal(normalizeRow({ ...kept, repo: 'main' }).repo, undefined, 'repo: main 不落键（=主仓缺省）')
  assert.equal(normalizeRow({ ...kept, repo: null }).repo, undefined, '无 repo 行为零变化')
  // 写读回环
  const dir = mkdtempSync(join(tmpdir(), 'crossrow-io-'))
  try {
    writeChangeTrace(dir, 'c1', [kept])
    const rows = readChangeTrace(dir)
    assert.equal(rows[0].repo, 'sillyspec', 'test-trace.json 回环保留 repo')
  } finally { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
})

test('悬空判定按行 repo 换根：跨仓文件在注册仓根存在 → 不悬空；未注册回退主仓且可见', () => {
  const { main, cross, specBase } = fixture()
  try {
    // 跨仓仓根有文件、主仓没有——修复前主仓解析必悬空
    writeFileSync(join(cross, 'test', 'cross.test.mjs'), "import { test } from 'node:test'\nimport assert from 'node:assert/strict'\ntest('c', () => { assert.ok(true) })\n")
    const rows = [
      { anchor: 'FR-01', row_id: 'r-cross', tests: ['test/cross.test.mjs'], reason: 'spec', state: 'active', confirmed_by: 'agent', repo: 'sillyspec' },
      { anchor: 'FR-01', row_id: 'r-unknown', tests: ['test/ghost.test.mjs'], reason: 'spec', state: 'active', confirmed_by: 'agent', repo: 'unregistered-repo' },
      { anchor: 'FR-01', row_id: 'r-main-miss', tests: ['test/main-missing.test.mjs'], reason: 'spec', state: 'active', confirmed_by: 'agent' },
    ]
    writeChangeTrace(join(specBase, 'changes', 'c1'), 'c1', rows)
    const tr = resolveTraceResidual({ specBase, changeName: 'c1', cwd: main })
    assert.equal(tr.dangling.length, 2, `仅未注册回退与主仓缺失悬空（实得 ${JSON.stringify(tr.dangling)}）`)
    assert.ok(tr.dangling.includes('sillyspec:test/cross.test.mjs') === false, '注册仓根命中不悬空')
    assert.ok(tr.dangling.includes('unregistered-repo:test/ghost.test.mjs'), '未注册回退主仓悬空且带 repo: 前缀可见')
    assert.ok(tr.dangling.includes('test/main-missing.test.mjs'), '无 repo 行主仓行为零变化')
  } finally {
    try { rmSync(main, { recursive: true, force: true }) } catch {}
    try { rmSync(cross, { recursive: true, force: true }) } catch {}
  }
})

test('残差执行按行 repo 分组：跨仓文件在跨仓根真跑（marker oracle），主仓文件主仓跑', async () => {
  const { main, cross, specBase } = fixture()
  delete process.env.NODE_TEST_CONTEXT
  try {
    writeFileSync(join(cross, 'test', 'cross.test.mjs'), [
      "import { test } from 'node:test'",
      "import assert from 'node:assert/strict'",
      "import { writeFileSync } from 'node:fs'",
      "test('cross-marker', () => { writeFileSync('cross-ran.marker', 'ran'); assert.ok(true) })",
      '',
    ].join('\n'))
    mkdirSync(join(main, 'test'), { recursive: true })
    writeFileSync(join(main, 'test', 'main.test.mjs'), [
      "import { test } from 'node:test'",
      "import assert from 'node:assert/strict'",
      "import { writeFileSync } from 'node:fs'",
      "test('main-marker', () => { writeFileSync('main-ran.marker', 'ran'); assert.ok(true) })",
      '',
    ].join('\n'))
    const rows = [
      { anchor: 'FR-01', row_id: 'r-cross', tests: ['test/cross.test.mjs'], reason: 'spec', state: 'active', confirmed_by: 'agent', repo: 'sillyspec' },
      { anchor: 'FR-01', row_id: 'r-main', tests: ['test/main.test.mjs'], reason: 'spec', state: 'active', confirmed_by: 'agent' },
    ]
    writeChangeTrace(join(specBase, 'changes', 'c1'), 'c1', rows)
    const out = applyTraceResidual({
      mainResult: { status: 'passed', command: 'stub', exitCode: 0, durationMs: 1, outputTail: '', reason: null, resultPath: null, mode: 'x' },
      action: 'dynamic-subset', cwd: main, specBase, changeName: 'c1', depsAutoFiles: [], hits: [], knownFailures: [],
    })
    assert.equal(out.status, 'passed', `残差两仓全绿（实得 status=${out.status}, reason=${out.reason}）`)
    assert.ok(existsSync(join(cross, 'cross-ran.marker')), '跨仓文件在跨仓根真跑（marker 在跨仓根）')
    assert.ok(existsSync(join(main, 'main-ran.marker')), '主仓文件主仓跑')
    assert.ok(String(out.mode).includes('trace'), 'mode 携 trace 残差标记')
  } finally {
    try { rmSync(main, { recursive: true, force: true }) } catch {}
    try { rmSync(cross, { recursive: true, force: true }) } catch {}
  }
})
