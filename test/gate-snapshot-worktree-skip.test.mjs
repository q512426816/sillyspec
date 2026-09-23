/**
 * gate-snapshot worktree 跳过钉（2026-09-23 R9/R10 根治）：
 * cwd 在会话专属 execute worktree（.sillyspec/.runtime/worktrees/<change>）→ 快照跳过判定 true；
 * 主仓/普通目录/空 → false（原行为：主仓共享面快照照建）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldSkipGateSnapshotForWorktree } from '../src/run/gate-snapshot.js'

test('T1 判定：worktree 路径 true（正反斜杠/深层子目录），主仓与空 false', () => {
  assert.equal(shouldSkipGateSnapshotForWorktree('C:/x/.sillyspec/.runtime/worktrees/2026-09-23-a'), true)
  assert.equal(shouldSkipGateSnapshotForWorktree('C:/x/.sillyspec/.runtime/worktrees/abc/backend'), true)
  assert.equal(shouldSkipGateSnapshotForWorktree('C:\\Users\\q\\repo\\.sillyspec\\.runtime\\worktrees\\abc\\backend'), true)
  assert.equal(shouldSkipGateSnapshotForWorktree('C:/Users/qinyi/IdeaProjects/sillyspec'), false)
  assert.equal(shouldSkipGateSnapshotForWorktree('C:/Users/q/IdeaProjects/mp/backend'), false)
  assert.equal(shouldSkipGateSnapshotForWorktree('C:/x/.sillyspec/.runtime/other/abc'), false, 'runtime 下非 worktrees 不误伤')
  assert.equal(shouldSkipGateSnapshotForWorktree(''), false)
  assert.equal(shouldSkipGateSnapshotForWorktree(null), false)
})
