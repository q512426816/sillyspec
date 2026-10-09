/**
 * 快照口径复用闸「实际口径」收敛回归锁（2026-10-09-verify-reuse-friction FR-01 / D-003@v1）。
 *
 * 死循环机制（multi-agent-platform 2026-10-09 tombstone 取证）：executeVerifyQualityScan
 * 原先在快照创建**之前**以 plannedSnapshot（env 常量，默认 true）判复用，而快照创建慢性
 * 失败时记录 usedSnapshot 恒 false → `snapshot-scope-changed` 永久失配 → 每次 step --done
 * 全量重跑（4 轮 × 3.5min 纯浪费）。修复：先建快照后判复用，plannedSnapshot 参数接收
 * Boolean(snap)（本轮实际口径）——连续失败 false==false 收敛命中；口径真实切换仍失配。
 *
 * oracle：计数测试文件（flip.test.mjs 追加计数到 gitignored counter.log）——复用命中轮
 * 计数不增（零执行）；真跑轮计数 +1。慢性快照失败由 `.git/worktrees` 同名文件制造
 * （git worktree add 必败「Not a directory」，其余 git 操作不受影响）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import {
  executeVerifyQualityScan,
  loadLastQualityScanRecord,
  storeQualityScan,
} from '../src/run/verify-quality-scan.js'

function makeFixtureRepo(tag) {
  const dir = mkdtempSync(join(tmpdir(), `vqs-scope-${tag}-`))
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t.local', { cwd: dir })
  execSync('git config user.name t', { cwd: dir })
  // 计数测试：动态子集面发现它（基线提交 + 未提交触碰入 diff），每次真跑给 counter.log +1
  writeFileSync(join(dir, 'flip.test.mjs'), [
    "import { test } from 'node:test'",
    "import assert from 'node:assert/strict'",
    "import { appendFileSync } from 'node:fs'",
    "test('counter', () => { appendFileSync('counter.log', 'x'); assert.ok(true) })",
    '',
  ].join('\n'))
  writeFileSync(join(dir, 'exit0.js'), 'process.exit(0)\n')
  writeFileSync(join(dir, '.gitignore'), 'counter.log\n')
  execSync('git add -A', { cwd: dir })
  execSync('git commit -qm init', { cwd: dir })
  mkdirSync(join(dir, '.sillyspec', 'changes', 'c1'), { recursive: true })
  mkdirSync(join(dir, '.sillyspec', '.runtime'), { recursive: true })
  // 命令用裸值形态（extractTestCommand 裸值正则排除引号——node -e "…" 解析不到，实测坑）
  writeFileSync(join(dir, '.sillyspec', 'local.yaml'), 'commands:\n  test: node exit0.js\n  lint: node exit0.js\n')
  // 慢性快照失败：.git/worktrees 放同名文件 → git worktree add 必败（路径冲突），
  // 其余 git 操作（status/diff/ls-tree/commit）不受影响——每轮 createVerifyGateSnapshot
  // 都 fail-soft 回退主仓（usedSnapshot 恒 false），复现取证现场的慢性失败态。
  writeFileSync(join(dir, '.git', 'worktrees'), 'blocked-by-test')
  return dir
}

function counterOf(dir) {
  try { return readFileSync(join(dir, 'counter.log'), 'utf-8').length } catch { return 0 }
}

function touchFlip(dir) {
  writeFileSync(join(dir, 'flip.test.mjs'), readFileSync(join(dir, 'flip.test.mjs'), 'utf-8') + '// touched\n')
}

const PASSED_TEST = { status: 'passed', command: 'x', exitCode: 0, durationMs: 12, outputTail: '', reason: null, resultPath: null }
const PASSED_LINT = { status: 'passed', command: 'y', exitCode: 0, durationMs: 3, outputTail: '', reason: null }
const FAILED_TEST = { status: 'failed', command: 'x', exitCode: 1, durationMs: 12, outputTail: 'boom', reason: '测试失败 boom', resultPath: null }

test('快照慢性失败（usedSnapshot=false）下 passed 幂等闸第二轮收敛：零执行免重跑（死循环断根）', async () => {
  const dir = makeFixtureRepo('pass')
  delete process.env.NODE_TEST_CONTEXT
  try {
    const specBase = join(dir, '.sillyspec')
    touchFlip(dir)
    // 第一轮：真跑（绿）→ 记录落盘
    await executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    const rec = loadLastQualityScanRecord({ specBase, changeName: 'c1' })
    assert.ok(rec, '第一轮记录落盘')
    assert.ok(rec.testResult.status === 'passed', '第一轮绿')
    assert.equal(rec.usedSnapshot, false, '前置：worktrees 拦截器使快照建不成（主仓口径）——前提不成立说明拦截失效，需修 fixture')
    const c1 = counterOf(dir)
    assert.ok(c1 >= 1, '第一轮真跑计数')
    // 第二轮：码态零变化 + 快照再次失败（同 fixture）→ 实际口径 false == 记录 false → 必须命中复用
    await executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    assert.equal(counterOf(dir), c1, '第二轮零执行（死循环断根——旧代码此处 snapshot-scope-changed 永久失配必真跑）')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

test('口径真实切换（记录 usedSnapshot=true vs 本轮实际 false）仍失配真跑（防作弊语义不变）', async () => {
  const dir = makeFixtureRepo('switch')
  delete process.env.NODE_TEST_CONTEXT
  try {
    const specBase = join(dir, '.sillyspec')
    touchFlip(dir)
    // 种一枚「快照口径」的绿记录（keys 由 storeQualityScan 按当前码态算——与执行时一致）
    storeQualityScan({ specBase, cwd: dir, changeName: 'c1', testResult: PASSED_TEST, lintResult: PASSED_LINT, usedSnapshot: true })
    const c0 = counterOf(dir)
    // 本轮快照建不成（实际 false）≠ 记录 true → 必须真跑
    await executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    assert.equal(counterOf(dir), c0 + 1, '口径切换失配 → 真跑一次（不得吞口径差异）')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

test('failed 失败签名去重闸同口径收敛：快照慢性失败下命中复用直接 throw（零执行）', async () => {
  const dir = makeFixtureRepo('fail')
  delete process.env.NODE_TEST_CONTEXT
  try {
    const specBase = join(dir, '.sillyspec')
    touchFlip(dir)
    // 种失败记录（rerunSignature/dedupKey 由 store 按当前码态算）
    storeQualityScan({ specBase, cwd: dir, changeName: 'c1', testResult: FAILED_TEST, lintResult: PASSED_LINT })
    const c0 = counterOf(dir)
    // 码态零变化 + 实际口径 false == 记录 usedSnapshot=false → 失败签名闸命中：throw 且零执行
    await assert.rejects(
      () => executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} }),
      (e) => String(e.message).includes('复用上次失败'),
    )
    assert.equal(counterOf(dir), c0, '失败签名闸命中轮零执行（旧代码同死循环：口径失配必重跑失败）')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})
