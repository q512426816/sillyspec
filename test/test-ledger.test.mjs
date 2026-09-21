/**
 * P2 测试结果记账（2026-09-21-r5-efficiency-batch3 task-01，FR-02 / D-001@v1）
 *
 * 锁死契约（fail-closed 红线四态）：
 * 1. 同码同环境二次查询 → 复用（免重跑）
 * 2. 改一行源码 → 代码指纹变 → 不复用（宁假红不假绿的「假红」侧——变化必重跑）
 * 3. worktree 与主仓 cwd → envProfile 分键 → 互不复用（13 环境族测试判定信号同源）
 * 4. git 不可达 → 键分量不可得 → 不记不复用；失败结果永不记账
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import {
  computeTestLedgerKey, computeTestFaceDigest, computeCodeFingerprint, consultTestLedger, recordTestLedger, computeEnvProfile, testLedgerPath,
} from '../src/run/test-ledger.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function initRepo(dir) {
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t', { cwd: dir })
  execSync('git config user.name t', { cwd: dir })
}

function makeFixture() {
  const repo = mk('ledger-')
  initRepo(repo)
  mkdirSync(join(repo, 'test'), { recursive: true })
  writeFileSync(join(repo, 'src-app.js'), 'export const a = 1\n')
  writeFileSync(join(repo, 'test', 't.test.mjs'), 'import { test } from "node:test"\ntest("x", () => {})\n')
  execSync('git add -A && git commit -qm base', { cwd: repo })
  return repo
}

test('L1 复用态：同码同环境记录后二次查询 → reuse=true；查询毫秒级（<5s）', () => {
  const repo = makeFixture()
  const runtimeRoot = join(repo, '.rt')
  mkdirSync(runtimeRoot, { recursive: true })
  const args = { runtimeRoot, changeName: 'c-l1', projectRoot: repo, testRoot: join(repo, 'test'), command: 'npm test', cwd: repo, env: {} }

  const before = consultTestLedger(args)
  assert.equal(before.reuse, false, 'L1: 无记录不复用')

  const t0 = Date.now()
  const recorded = recordTestLedger({ ...args, result: { pass: true, total: 100, durationMs: 95000 } })
  const hit = consultTestLedger(args)
  const elapsed = Date.now() - t0
  assert.equal(recorded, true, 'L1: 通过结果落账')
  assert.equal(hit.reuse, true, 'L1: 同码同环境复用')
  assert.ok(elapsed < 5000, `L1: 记账+查询 <5s（实际 ${elapsed}ms）`)
  assert.equal(hit.result.total, 100, 'L1: 结果字段原样回放')
  assert.ok(typeof computeTestFaceDigest(join(repo, 'test')) === 'string', 'L1: 测试面摘要可独立计算（键分量②）')
  assert.ok(computeCodeFingerprint(repo) && computeCodeFingerprint(repo).head, 'L1: 代码指纹可独立计算（键分量①）')
})

test('L2 指纹变：改一行 src（已提交）/新增未提交文件 → 代码指纹变 → 不复用', () => {
  const repo = makeFixture()
  const runtimeRoot = join(repo, '.rt')
  mkdirSync(runtimeRoot, { recursive: true })
  const args = { runtimeRoot, changeName: 'c-l2', projectRoot: repo, testRoot: join(repo, 'test'), command: 'npm test', cwd: repo, env: {} }
  assert.equal(recordTestLedger({ ...args, result: { pass: true } }), true)

  writeFileSync(join(repo, 'src-app.js'), 'export const a = 2\n')
  execSync('git add -A && git commit -qm change', { cwd: repo })
  let miss = consultTestLedger(args)
  assert.equal(miss.reuse, false, 'L2: HEAD 变化 → key-mismatch')

  writeFileSync(join(repo, 'uncommitted.js'), 'dirty\n') // 未提交脏文件也换键
  miss = consultTestLedger(args)
  assert.equal(miss.reuse, false, 'L2: porcelain 脏变化 → 换键')
})

test('L3 环境分键：worktree 形态 cwd 与主仓 cwd 互不复用（detectCwdInsideWorktree 同源信号）', () => {
  const repo = makeFixture()
  // worktree 形态路径：.sillyspec/.runtime/worktrees/<change>/…（detectCwdInsideWorktree 判定段）
  const wtCwd = join(repo, '.sillyspec', '.runtime', 'worktrees', 'demo-change', 'repo')
  mkdirSync(wtCwd, { recursive: true })
  const p1 = computeEnvProfile({ cwd: repo, env: {} })
  const p2 = computeEnvProfile({ cwd: wtCwd, env: {} })
  assert.equal(p1.cwdInsideWorktree, false, 'L3: 主仓 cwd 非 worktree')
  assert.equal(p2.cwdInsideWorktree, true, 'L3: worktree 段路径命中（13 环境族测试的判定信号）')

  const runtimeRoot = join(repo, '.rt')
  mkdirSync(runtimeRoot, { recursive: true })
  const mainArgs = { runtimeRoot, changeName: 'c-l3', projectRoot: repo, testRoot: join(repo, 'test'), command: 'npm test', cwd: repo, env: {} }
  const wtArgs = { ...mainArgs, cwd: wtCwd }
  assert.equal(recordTestLedger({ ...mainArgs, result: { pass: true } }), true)
  assert.equal(consultTestLedger(mainArgs).reuse, true, 'L3: 主仓键内自洽复用')
  assert.equal(consultTestLedger(wtArgs).reuse, false, 'L3: worktree 键不同 → 互不复用')

  // 行为开关 env 变化（P4 翻默认后的输出形态族）同样换键
  const envArgs = { ...mainArgs, env: { SILLYSPEC_STEP_GUIDE: '0' } }
  assert.equal(consultTestLedger(envArgs).reuse, false, 'L3: 行为开关 env 变化 → 换键')
})

test('L4 fail-closed：git 不可达不记不复用；失败结果永不记账', () => {
  const notGit = mk('nogit-')
  mkdirSync(join(notGit, 'test'), { recursive: true })
  writeFileSync(join(notGit, 'test', 't.test.mjs'), 'x\n')
  const runtimeRoot = join(notGit, '.rt')
  mkdirSync(runtimeRoot, { recursive: true })
  const args = { runtimeRoot, changeName: 'c-l4', projectRoot: notGit, testRoot: join(notGit, 'test'), command: 'npm test', cwd: notGit, env: {} }

  const miss = consultTestLedger(args)
  assert.equal(miss.reuse, false, 'L4: git 不可达 → 不复用')
  assert.match(miss.reason, /fail-closed/, 'L4: 失因显式 fail-closed')

  // 失败结果记账尝试 → 拒绝且账本不落
  const recordedFail = recordTestLedger({ ...args, result: { pass: false, failedFiles: ['x.test.mjs'] } })
  assert.equal(recordedFail, false, 'L4: 失败结果拒绝记账')
  assert.equal(existsSync(testLedgerPath(runtimeRoot, 'c-l4')), false, 'L4: 账本未落盘')

  // 正常仓内失败同样拒记
  const repo = makeFixture()
  const rt2 = join(repo, '.rt'); mkdirSync(rt2, { recursive: true })
  const ok = { runtimeRoot: rt2, changeName: 'c-l4b', projectRoot: repo, testRoot: join(repo, 'test'), command: 'npm test', cwd: repo, env: {} }
  assert.equal(recordTestLedger({ ...ok, result: { pass: false } }), false, 'L4: 通过仓失败结果拒记')
  assert.equal(consultTestLedger(ok).reuse, false, 'L4: 无账可复用（失败后必须真跑修复——假绿源封死）')
})
