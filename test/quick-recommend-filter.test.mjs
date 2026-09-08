/**
 * §7 债批测试（quick-ca3538ba）：quick-recommend 活跃会话过滤 + 空壳宽限期 + cancel 字段名。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { recommendChanges } from '../src/quick-recommend.js'
import { detectEmptyShellQuickSessions } from '../src/run/shared.js'

function makeSpec() {
  const specDir = mkdtempSync(join(tmpdir(), 'sillyspec-debt-'))
  const c1 = join(specDir, 'changes', '2026-09-01-feature-a')
  mkdirSync(c1, { recursive: true })
  writeFileSync(join(c1, 'design.md'), '---\nauthor: t\ncreated_at: 2026-09-01\n---\n\n## 文件变更清单\n\n- src/login.js\n')
  writeFileSync(join(c1, 'proposal.md'), '# 提案\n\n修复登录限流 INCR 计数误清。\n')
  return specDir
}

test('recommendChanges 过滤 quick 会话（quick-<hex8> 不进关联推荐池）', () => {
  const specDir = makeSpec()
  try {
    const r = recommendChanges({
      activeChanges: ['quick-abcd1234', '2026-09-01-feature-a'],
      specDir,
      dirtyFiles: ['src/login.js'],
      quickFiles: [],
      taskDescription: '修复登录限流',
    })
    assert.ok(r.length >= 1 && r[0].name === '2026-09-01-feature-a', '完整流程变更正常推荐')
    assert.ok(!r.some(x => x.name === 'quick-abcd1234'), 'quick 会话被过滤（无 design 语义不可关联）')
  } finally { rmSync(specDir, { recursive: true, force: true }) }
})

test('detectEmptyShellQuickSessions 宽限期：刚启动的零步骤会话不列（10 分钟内）', () => {
  const specBase = mkdtempSync(join(tmpdir(), 'sillyspec-shell-'))
  const now = Date.now()
  try {
    const sess = join(specBase, '.runtime', 'quick-sessions', 'quick-aaaabbbb')
    mkdirSync(sess, { recursive: true })
    writeFileSync(join(sess, 'guard.json'), JSON.stringify({ sessionId: 'quick-aaaabbbb', quicklogId: 'ql-1', startedAt: new Date(now - 2 * 60_000).toISOString() }))
    const pm = { read: () => ({ stages: { quick: { steps: [{ name: 'a' }] } } }) } // 零完成步骤
    const fresh = detectEmptyShellQuickSessions({}, specBase, null, pm, '/tmp/x', now)
    assert.equal(fresh.length, 0, '2 分钟前启动的进行中会话不点名（宽限 10 分钟）')
    // 超过宽限期 → 列出
    writeFileSync(join(sess, 'guard.json'), JSON.stringify({ sessionId: 'quick-aaaabbbb', quicklogId: 'ql-1', startedAt: new Date(now - 30 * 60_000).toISOString() }))
    const old = detectEmptyShellQuickSessions({}, specBase, null, pm, '/tmp/x', now)
    assert.equal(old.length, 1, '30 分钟零步骤 → 正常点名')
  } finally { rmSync(specBase, { recursive: true, force: true }) }
})
