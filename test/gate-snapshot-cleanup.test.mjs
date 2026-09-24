/**
 * gate 快照 cleanup 硬化测试（2026-09-24-gate-snapshot-lifecycle，task-02；FR-02 / D-001@v1）
 *
 * 覆盖三条实证泄漏路径的成功路径硬化：Windows rmSync 需重试参数（EPERM/junction 锁）、
 * git worktree remove 失败后补 prune 清 prunable 注册、双失败不抛且由调用方按双清结果
 * 决定销账。故障注入（runGit/removeDir 假件）断言真实调用与失败分支，不做源码文本匹配。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanupSnapshot } from '../src/run/gate-snapshot.js'

test('正常路径：remove 成功→不调 prune、返回双清', () => {
  const calls = []
  const r = cleanupSnapshot({
    snapshotRoot: 'C:/wt/snap', cwd: 'C:/repo',
    runGit: (cwd, args) => { calls.push(args.join(' ')); return '' },
    removeDir: (p) => { calls.push(`rm:${p}`) },
    dirExists: () => false,
    worktreeRegistered: () => false,
  })
  assert.ok(calls.some((c) => c.includes('worktree remove')), 'remove 被调')
  assert.ok(!calls.some((c) => c.includes('prune')), '成功路径不调 prune')
  assert.deepEqual(r, { dirRemoved: true, worktreeCleaned: true })
})

test('remove 失败→rmSync 带 maxRetries/retryDelay，并补 prune 清注册', () => {
  const calls = []
  let removeOpts = null
  let dirPresent = true // 删前存在、removeDir 执行后消失
  const r = cleanupSnapshot({
    snapshotRoot: 'C:/wt/snap', cwd: 'C:/repo',
    runGit: (cwd, args) => {
      calls.push(args.join(' '))
      if (args.includes('remove')) throw new Error('remove failed')
      return ''
    },
    removeDir: (p, opts) => { calls.push(`rm:${p}`); removeOpts = opts; dirPresent = false },
    dirExists: () => dirPresent,
    worktreeRegistered: () => false,
  })
  assert.ok(calls.some((c) => c.includes('prune')), 'remove 失败后 prune 被调')
  assert.ok(removeOpts && removeOpts.maxRetries >= 3, `rmSync 带 maxRetries（实际 ${removeOpts && removeOpts.maxRetries}）`)
  assert.ok(removeOpts && removeOpts.retryDelay >= 50, `rmSync 带 retryDelay（实际 ${removeOpts && removeOpts.retryDelay}）`)
  assert.deepEqual(r, { dirRemoved: true, worktreeCleaned: true }, 'prune 后注册已清→双清')
})

test('双失败：remove 抛+rmSync 抛→不抛异常，dirRemoved=false 交调用方留账本', () => {
  assert.doesNotThrow(() => {
    const r = cleanupSnapshot({
      snapshotRoot: 'C:/wt/snap', cwd: 'C:/repo',
      runGit: () => { throw new Error('git dead') },
      removeDir: () => { throw new Error('rm EPERM') },
      dirExists: () => true,
      worktreeRegistered: () => true,
    })
    assert.equal(r.dirRemoved, false, '目录仍在→dirRemoved=false')
    assert.equal(r.worktreeCleaned, false, '注册仍在→worktreeCleaned=false')
  })
})

test('目录仍在但 remove 成功→dirRemoved 反映实际存在性', () => {
  const r = cleanupSnapshot({
    snapshotRoot: 'C:/wt/snap', cwd: 'C:/repo',
    runGit: () => '',
    removeDir: () => {},
    dirExists: () => true, // 注入视角：rmSync 后仍存在
    worktreeRegistered: () => false,
  })
  assert.equal(r.dirRemoved, false)
  assert.equal(r.worktreeCleaned, true)
})

test('remove 返回成功但 worktree list 仍含该 root→worktreeCleaned=false（双清契约 P1-2）', () => {
  const r = cleanupSnapshot({
    snapshotRoot: 'C:/wt/snap', cwd: 'C:/repo',
    runGit: () => '',            // remove 退出码为零
    removeDir: () => {},
    dirExists: () => false,      // 目录已不在
    worktreeRegistered: () => true, // 但注册仍在（如 prune 未生效）
  })
  assert.equal(r.dirRemoved, true)
  assert.equal(r.worktreeCleaned, false, '退出码为零不等于注册已清——不得据此销账')
})

test('worktree list 查询抛异常→worktreeCleaned=false（异常按未清）', () => {
  const r = cleanupSnapshot({
    snapshotRoot: 'C:/wt/snap', cwd: 'C:/repo',
    runGit: () => '',
    removeDir: () => {},
    dirExists: () => false,
    worktreeRegistered: () => { throw new Error('git list failed') },
  })
  assert.equal(r.worktreeCleaned, false)
})
