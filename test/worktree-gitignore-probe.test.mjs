/**
 * worktree-gitignore-probe（2026-10-21-p0-p1-hardening FR-06）
 *
 * dsh z2 实证：沙箱下 spawnSync git 抛 EPERM 被旧实现当成「未忽略」，阻断 worktree 创建
 * 27 分钟并迫使用户提权。锁死契约（checkWorktreeDirIgnored 三态）：
 *   G1 真仓已忽略 → ignored:true；真仓未忽略 → ignored:false（git 判定，exit 1）
 *   G2 注入 runner 两次抛 EPERM（无 status）→ ignored:null + probeError + retried（fail-open 信号）
 *   G3 runner 首次 EPERM 二次成功 → 按第二次真实判定 + retried:true
 *   G4 runner 抛 exit 1（有 status）→ 立即 ignored:false（是判定结果不是故障，不重试）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { checkWorktreeDirIgnored } from '../src/worktree.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
const gitInit = (d) => {
  execFileSync('git', ['init', '-q'], { cwd: d, encoding: 'utf8' })
  execFileSync('git', ['config', 'user.email', 't@t.local'], { cwd: d, encoding: 'utf8' })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: d, encoding: 'utf8' })
}

test('G1 真仓：已忽略 → true；未忽略 → false（git 判定分流）', () => {
  const d = mk('gi-')
  gitInit(d)
  writeFileSync(join(d, '.gitignore'), '.sillyspec/.runtime/worktrees\n')
  const ok = checkWorktreeDirIgnored(d)
  assert.equal(ok.ignored, true, 'gitignore 在场 → 已忽略')
  assert.equal(ok.path, '.sillyspec/.runtime/worktrees')
  const d2 = mk('gn-')
  gitInit(d2)
  writeFileSync(join(d2, '.gitignore'), 'node_modules\n')
  const no = checkWorktreeDirIgnored(d2)
  assert.equal(no.ignored, false, '确实未忽略 → false（调用方照旧阻断）')
  assert.equal(no.probeError, undefined, '判定结果不带 probeError')
})

test('G2 探测失败（EPERM×2）→ ignored:null + probeError + retried（fail-open 信号）', () => {
  const eperm = Object.assign(new Error('spawnSync git EPERM'), { code: 'EPERM' })
  let calls = 0
  const runner = () => { calls++; throw eperm }
  const r = checkWorktreeDirIgnored('x', runner)
  assert.equal(r.ignored, null, '无法证实未忽略 → null（非 false）')
  assert.match(r.probeError, /EPERM/, `probeError 含异常码：${r.probeError}`)
  assert.equal(r.retried, true, '内置一次重试已发生')
  assert.equal(calls, 2, '共尝试 2 次（首试 + 重试 1 次）')
})

test('G3 首次 EPERM 二次成功 → 按第二次真实判定 + retried', () => {
  const eperm = Object.assign(new Error('spawnSync git EPERM'), { code: 'EPERM' })
  let calls = 0
  const runner = () => { calls++; if (calls === 1) throw eperm; return '' }
  const r = checkWorktreeDirIgnored('x', runner)
  assert.deepEqual({ ignored: r.ignored, retried: r.retried }, { ignored: true, retried: true }, '重试成功按真实判定（exit 0=已忽略）')
})

test('G4 git 判定 exit 1（有 status）→ 立即 false 不重试', () => {
  const exit1 = Object.assign(new Error('git exit 1'), { status: 1 })
  let calls = 0
  const runner = () => { calls++; throw exit1 }
  const r = checkWorktreeDirIgnored('x', runner)
  assert.deepEqual({ ignored: r.ignored, retried: r.retried, probeError: r.probeError }, { ignored: false, retried: undefined, probeError: undefined }, '判定结果≠探测故障，不重试')
  assert.equal(calls, 1, '仅 1 次调用')
})
