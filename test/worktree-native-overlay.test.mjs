/**
 * worktree native-worktree overlay regression tests
 *
 * 验证 Bug 1 + Bug 2 修复：
 * 1. worktreeBase 固定到主仓库路径，不跟着 cwd 变化
 * 2. 禁止 self-overlay（source === target 时）
 * 3. native-worktree meta 缺失时 recover，不 overlay
 * 4. meta 已存在时幂等返回，不重建
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { strict as assert } from 'node:assert'
import { pathEq } from './_path-eq.mjs'

// ── Test 1: _resolveMainRepoRoot 在主仓库内返回 cwd ──

async function test1_mainRepoRoot() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-'))
  execSync('git init', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name "test"', { cwd: d, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: d, stdio: 'pipe' })

  // Add .gitignore to allow worktreeBase path
  fs.mkdirSync(path.join(d, '.sillyspec'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')

  const { WorktreeManager } = await import('../src/worktree.js')
  const wm = new WorktreeManager({ cwd: d })
  const root = wm._resolveMainRepoRoot()
  // git 输出（realpath 形态）与 join 拼路径（symlink 形态）在 macOS 上字面不等——pathEq 归一比较
  assert(pathEq(root, d), `Test 1 FAIL: expected ${d}, got ${root}`)
  console.log('✅ Test 1: main repo root resolves to cwd')

  fs.rmSync(d, { recursive: true })
}

// ── Test 2: native-worktree 检测 + 幂等守卫 ──

async function test2_nativeWorktreeIdempotent() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-'))
  execSync('git init', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name "test"', { cwd: d, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: d, stdio: 'pipe' })

  const wtDir = path.join(d, 'wt')
  execSync(`git worktree add ${wtDir} -b test-branch`, { cwd: d, stdio: 'pipe' })

  // wtDir is a linked worktree
  const { WorktreeManager } = await import('../src/worktree.js')

  // First: create meta from inside worktree (simulating native-worktree mode)
  const wm1 = new WorktreeManager({ cwd: wtDir })
  // This simulates what happens when Claude Code runs in the worktree
  // and SillySpec calls create() — detectIsolation should return inWorktree=true
  // and meta should be written to main repo's worktreeBase, not worktree's

  // Verify worktreeBase points to main repo
  const expectedBase = path.join(d, '.sillyspec', '.runtime', 'worktrees')
  assert(pathEq(wm1.worktreeBase, expectedBase), `Test 2 FAIL: worktreeBase=${wm1.worktreeBase}, expected=${expectedBase}`)
  console.log('✅ Test 2: worktreeBase fixed to main repo path')

  fs.rmSync(d, { recursive: true })
}

// ── Test 3: self-overlay 禁止 ──

async function test3_selfOverlayBlocked() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-'))
  execSync('git init', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name "test"', { cwd: d, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: d, stdio: 'pipe' })
  fs.mkdirSync(path.join(d, '.sillyspec'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')

  const { WorktreeManager } = await import('../src/worktree.js')
  const wm = new WorktreeManager({ cwd: d })

  // Create with in-place-fallback mode (source === target)
  const result = wm._createInPlaceMeta('test-change', {
    worktreePath: d,
    branch: 'test-branch',
    mode: 'in-place-fallback',
  })

  assert(result.mode === 'in-place-fallback', `Test 3 FAIL: mode=${result.mode}`)
  // 返回值不包含 baselineFiles（是简化的返回结构），验证 meta 文件本身
  const meta3 = wm.getMeta('test-change')
  assert(meta3 && meta3.baselineFiles.length === 0, `Test 3 FAIL: meta baselineFiles should be empty`)
  console.log('✅ Test 3: self-overlay blocked, baselineFiles empty')

  fs.rmSync(d, { recursive: true })
}

// ── Test 4: meta 幂等，不重复 overlay ──

async function test4_metaIdempotent() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-'))
  execSync('git init', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name "test"', { cwd: d, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: d, stdio: 'pipe' })
  fs.mkdirSync(path.join(d, '.sillyspec'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')

  const { WorktreeManager } = await import('../src/worktree.js')
  const wm = new WorktreeManager({ cwd: d })

  // First create
  const r1 = wm._createInPlaceMeta('test-change', {
    worktreePath: d,
    branch: 'test-branch',
    mode: 'in-place-fallback',
  })

  // Second create (should return existing, not re-overlay)
  const r2 = wm._createInPlaceMeta('test-change', {
    worktreePath: d,
    branch: 'test-branch',
    mode: 'in-place-fallback',
  })

  assert(r1.baseHash === r2.baseHash, `Test 4 FAIL: hashes differ`)
  console.log('✅ Test 4: _createInPlaceMeta idempotent')

  fs.rmSync(d, { recursive: true })
}

// ── Test 5: native-worktree meta 恢复 ──

async function test5_nativeRecovery() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-'))
  execSync('git init', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name "test"', { cwd: d, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: d, stdio: 'pipe' })

  const wtDir = path.join(d, 'wt')
  execSync(`git worktree add ${wtDir} -b test-branch`, { cwd: d, stdio: 'pipe' })

  const { WorktreeManager } = await import('../src/worktree.js')
  const wm = new WorktreeManager({ cwd: wtDir })

  // Simulate meta missing in native-worktree (should recover, not overlay)
  const result = wm._recoverNativeWorktreeMeta('test-change', {
    worktreePath: wtDir,
    branch: 'test-branch',
  })

  assert(result.mode === 'native-worktree', `Test 5 FAIL: mode=${result.mode}`)
  // 返回值不包含 baselineFiles，验证 meta 文件本身
  const meta5 = wm.getMeta('test-change')
  assert(meta5 && meta5.baselineFiles.length === 0, `Test 5 FAIL: meta baselineFiles should be empty`)

  // Verify meta is readable now
  const meta = wm.getMeta('test-change')
  assert(meta !== null, `Test 5 FAIL: meta should exist after recovery`)
  assert(meta.mode === 'native-worktree', `Test 5 FAIL: meta.mode=${meta.mode}`)
  console.log('✅ Test 5: native-worktree meta recovery without overlay')

  fs.rmSync(d, { recursive: true })
}

// ── Test 6: linked worktree 内 create 幂等复用（2026-10-21-brainstorm-proto-worktree FR-02）──
// 「如果本身就在工作树里了，就不用再创建了」：头脑风暴原型协议下 agent 进驻 linked worktree
// 后再次 create（如 run execute 触发）——meta 已存在必须原样返回，不 overlay 不重建。

async function test6_createInsideWorktreeIdempotent() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-'))
  execSync('git init', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name "test"', { cwd: d, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: d, stdio: 'pipe' })

  const wtDir = path.join(d, 'wt')
  execSync(`git worktree add ${wtDir} -b test-branch`, { cwd: d, stdio: 'pipe' })

  const { WorktreeManager } = await import('../src/worktree.js')

  // 预登记 native meta（模拟此前已在 worktree 内 create 过一次）
  const changeName = 'proto-change'
  const metaDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', changeName)
  fs.mkdirSync(metaDir, { recursive: true })
  const metaPath = path.join(metaDir, 'meta.json')
  const meta = {
    changeName,
    worktreePath: wtDir,
    branch: 'test-branch',
    baseHash: 'deadbeefdeadbeef',
    mode: 'native-worktree',
  }
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
  const before = fs.readFileSync(metaPath, 'utf8')

  // 在 linked worktree 内再次 create → 幂等返回既有，不 overlay/重建
  const wm = new WorktreeManager({ cwd: wtDir })
  const r = wm.create(changeName)

  assert(pathEq(r.worktreePath, wtDir), `Test 6 FAIL: worktreePath=${r.worktreePath}, expected ${wtDir}`)
  assert.equal(r.branch, 'test-branch', 'Test 6 FAIL: branch mismatch')
  assert.equal(r.baseHash, 'deadbeefdeadbeef', 'Test 6 FAIL: baseHash mismatch')
  assert.equal(r.mode, 'native-worktree', 'Test 6 FAIL: mode mismatch')
  assert.strictEqual(fs.readFileSync(metaPath, 'utf8'), before, 'Test 6 FAIL: meta.json should be untouched on idempotent reuse')

  console.log('✅ Test 6: create inside linked worktree is idempotent (meta untouched)')

  fs.rmSync(d, { recursive: true, force: true })
}

// ── Run all ──

const tests = [
  ['main repo root', test1_mainRepoRoot],
  ['native worktree worktreeBase', test2_nativeWorktreeIdempotent],
  ['self-overlay blocked', test3_selfOverlayBlocked],
  ['meta idempotent', test4_metaIdempotent],
  ['native recovery', test5_nativeRecovery],
  ['create-inside-worktree idempotent', test6_createInsideWorktreeIdempotent],
]

let passed = 0, failed = 0
for (const [name, fn] of tests) {
  try {
    await fn()
    passed++
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`)
    failed++
  }
}

console.log(`\n${passed}/${tests.length} passed`)
if (failed) process.exit(1)
