/**
 * worktree ensure 幂等语义回归（2026-10-21-brainstorm-proto-worktree FR-03）
 *
 * 「变更 key 产生后建的 worktree，后续 run execute 幂等复用不重建」：
 * WorktreeManager.ensure 是该语义的收敛点（stage.js execute 分支原 getMeta 短路提取而来）。
 *  1. meta 已登记 → ensure 返回完整 meta + existing=true，不触发 create 重建路径
 *  2. 连续两次 ensure 结果一致（baseHash 不变、meta.json 不被改写）
 *  3. meta 未登记 → ensure 走 create（existing=false），之后 ensure 再调即复用
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { strict as assert } from 'node:assert'
import { pathEq } from './_path-eq.mjs'

function makeRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-ensure-'))
  execSync('git init', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email "test@test.com"', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name "test"', { cwd: d, stdio: 'pipe' })
  execSync('git commit --allow-empty -m "init"', { cwd: d, stdio: 'pipe' })
  fs.mkdirSync(path.join(d, '.sillyspec'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  return d
}

// ── Case 1+2: meta 已登记 → ensure 幂等复用，两次一致、meta 不改写 ──
async function test_existingMetaIdempotent() {
  const d = makeRepo()
  const { WorktreeManager } = await import('../src/worktree.js')
  const wm = new WorktreeManager({ cwd: d })

  const changeName = 'proto-change'
  const metaDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', changeName)
  fs.mkdirSync(metaDir, { recursive: true })
  const metaPath = path.join(metaDir, 'meta.json')
  const meta = {
    changeName,
    worktreePath: path.join(d, 'elsewhere'),
    branch: 'sillyspec/proto-change',
    baseHash: 'deadbeefdeadbeef',
    mode: 'worktree',
    baselineCommit: 'cafebabecafebabe',
    depsStatus: 'fresh',
  }
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
  const before = fs.readFileSync(metaPath, 'utf8')

  const r1 = wm.ensure(changeName)
  assert.equal(r1.existing, true, 'Case 1 FAIL: existing should be true when meta present')
  assert.equal(r1.branch, meta.branch, 'Case 1 FAIL: branch mismatch')
  assert.equal(r1.baseHash, meta.baseHash, 'Case 1 FAIL: baseHash mismatch')
  assert.equal(r1.baselineCommit, meta.baselineCommit, 'Case 1 FAIL: full meta should pass through (baselineCommit lost)')

  const r2 = wm.ensure(changeName)
  assert.equal(r2.existing, true, 'Case 2 FAIL: second ensure should also be existing')
  assert.equal(r2.baseHash, r1.baseHash, 'Case 2 FAIL: baseHash changed between ensure calls')
  assert.strictEqual(fs.readFileSync(metaPath, 'utf8'), before, 'Case 2 FAIL: meta.json should be untouched by ensure')

  console.log('✅ Case 1+2: ensure with existing meta is idempotent (full meta passthrough, file untouched)')
  fs.rmSync(d, { recursive: true, force: true })
}

// ── Case 3: meta 未登记 → ensure 首建（existing=false），再 ensure 即复用 ──
async function test_missingMetaCreatesThenReuses() {
  const d = makeRepo()
  const { WorktreeManager } = await import('../src/worktree.js')
  const wm = new WorktreeManager({ cwd: d })

  const changeName = 'fresh-change'
  const r1 = wm.ensure(changeName)
  assert.equal(r1.existing, false, 'Case 3 FAIL: first ensure should create (existing=false)')
  assert.ok(r1.branch === 'sillyspec/' + changeName, `Case 3 FAIL: branch=${r1.branch}`)
  assert.ok(fs.existsSync(r1.worktreePath), 'Case 3 FAIL: worktree dir should exist after create')

  const r2 = wm.ensure(changeName)
  assert.equal(r2.existing, true, 'Case 3 FAIL: second ensure should reuse')
  assert.ok(pathEq(r2.worktreePath, r1.worktreePath), 'Case 3 FAIL: worktreePath differs on reuse')
  assert.equal(r2.baseHash, r1.baseHash, 'Case 3 FAIL: baseHash differs on reuse')

  console.log('✅ Case 3: ensure creates when missing, then reuses idempotently')
  fs.rmSync(d, { recursive: true, force: true })
}

// ── Run all ──

const tests = [
  ['existing meta idempotent', test_existingMetaIdempotent],
  ['missing meta creates then reuses', test_missingMetaCreatesThenReuses],
]

let passed = 0, failed = 0
for (const [name, fn] of tests) {
  try {
    await fn()
    passed++
  } catch (e) {
    failed++
    console.error(`❌ ${name}: ${e.message}`)
  }
}

console.log(`\n${passed}/${tests.length} passed`)
if (failed > 0) process.exit(1)
