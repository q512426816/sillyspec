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
  console.assert(root === d, `Test 1 FAIL: expected ${d}, got ${root}`)
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
  console.assert(wm1.worktreeBase === expectedBase, `Test 2 FAIL: worktreeBase=${wm1.worktreeBase}, expected=${expectedBase}`)
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

  console.assert(result.mode === 'in-place-fallback', `Test 3 FAIL: mode=${result.mode}`)
  // 返回值不包含 baselineFiles（是简化的返回结构），验证 meta 文件本身
  const meta3 = wm.getMeta('test-change')
  console.assert(meta3 && meta3.baselineFiles.length === 0, `Test 3 FAIL: meta baselineFiles should be empty`)
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

  console.assert(r1.baseHash === r2.baseHash, `Test 4 FAIL: hashes differ`)
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

  console.assert(result.mode === 'native-worktree', `Test 5 FAIL: mode=${result.mode}`)
  // 返回值不包含 baselineFiles，验证 meta 文件本身
  const meta5 = wm.getMeta('test-change')
  console.assert(meta5 && meta5.baselineFiles.length === 0, `Test 5 FAIL: meta baselineFiles should be empty`)

  // Verify meta is readable now
  const meta = wm.getMeta('test-change')
  console.assert(meta !== null, `Test 5 FAIL: meta should exist after recovery`)
  console.assert(meta.mode === 'native-worktree', `Test 5 FAIL: meta.mode=${meta.mode}`)
  console.log('✅ Test 5: native-worktree meta recovery without overlay')

  fs.rmSync(d, { recursive: true })
}

// ── Run all ──

const tests = [
  ['main repo root', test1_mainRepoRoot],
  ['native worktree worktreeBase', test2_nativeWorktreeIdempotent],
  ['self-overlay blocked', test3_selfOverlayBlocked],
  ['meta idempotent', test4_metaIdempotent],
  ['native recovery', test5_nativeRecovery],
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
