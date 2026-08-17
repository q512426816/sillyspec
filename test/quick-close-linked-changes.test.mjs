/**
 * quick --done 关联真实变更轻量归档单元测试
 *
 * 覆盖 closeQuickLinkedChanges 行为：
 *   - 关联变更 tasks.md 全勾选 → closed + 目录归档 + unregisterChange 调用
 *   - 关联变更 tasks.md 有未勾选项 → skipped + 目录保持原位 + unregisterChange 未调用
 *   - 目标归档目录已存在 → 幂等跳过，不抛错
 *   - linkedChanges 为空数组 → 空结果，无副作用
 *   - linkedChanges 包含 quick-<8hex> sessionId → 过滤掉，不处理
 *
 * 用 os.tmpdir() + mkdtempSync 隔离 specDir，mock ProgressManager（只 spy unregisterChange），
 * 不依赖真实 DB / git / worktree。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { closeQuickLinkedChanges } from '../src/run/complete-handlers.js'
import { archiveDestDirName } from '../src/stage-contract.js'

function makeSpecBase(prefix = 'qclc-') {
  return mkdtempSync(join(tmpdir(), prefix))
}

function makeChange(specBase, changeName, tasksContent) {
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  if (tasksContent !== undefined) {
    writeFileSync(join(changeDir, 'tasks.md'), tasksContent)
  }
  return changeDir
}

function makePm() {
  const calls = []
  return {
    unregisterChange: (cwd, changeName) => { calls.push({ cwd, changeName }) },
    _calls: calls,
  }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function cleanup(specBase) {
  try { rmSync(specBase, { recursive: true, force: true }) } catch {}
}

test('关联变更 tasks.md 全勾选 → closed 含该变更，目录移到 archive/，unregisterChange 被调用', async () => {
  const specBase = makeSpecBase('qclc-closed-')
  const cwd = specBase
  const changeName = '2026-08-17-auto-sync'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] ql-xxx 完成任务 A\n- [x] ql-yyy 完成任务 B\n')
    const pm = makePm()

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [changeName], 'closed 应含该变更')
    assert.deepEqual(result.skipped, [], 'skipped 应为空')
    assert.equal(pm._calls.length, 1, 'unregisterChange 应被调用 1 次')
    assert.equal(pm._calls[0].cwd, cwd, 'unregisterChange cwd 正确')
    assert.equal(pm._calls[0].changeName, changeName, 'unregisterChange changeName 正确')

    const destName = archiveDestDirName(todayIsoDate(), changeName)
    const archivedDir = join(specBase, 'changes', 'archive', destName)
    assert.ok(!existsSync(changeDir), '源目录应被移走')
    assert.ok(existsSync(archivedDir), '归档目录应存在')
    assert.ok(existsSync(join(archivedDir, 'tasks.md')), '归档目录应保留 tasks.md')
  } finally {
    cleanup(specBase)
  }
})

test('关联变更 tasks.md 有未勾选项 → skipped 且目录保持原位，unregisterChange 未被调用', async () => {
  const specBase = makeSpecBase('qclc-skipped-')
  const cwd = specBase
  const changeName = '2026-08-17-pending-tasks'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] ql-xxx 已完成任务\n- [ ] ql-yyy 未完成任务\n')
    const pm = makePm()

    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [], 'closed 应为空')
    assert.equal(result.skipped.length, 1, 'skipped 应含 1 条')
    assert.equal(result.skipped[0].name, changeName, 'skipped name 正确')
    assert.match(result.skipped[0].reason, /未全勾选或不存在/, 'skipped reason 提示未全勾选或不存在')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
    assert.ok(existsSync(changeDir), '源目录应保持原位')
  } finally {
    cleanup(specBase)
  }
})

test('目标归档目录已存在 → 幂等跳过，不抛错', async () => {
  const specBase = makeSpecBase('qclc-idempotent-')
  const cwd = specBase
  const changeName = '2026-08-17-existing-archive'
  try {
    const changeDir = makeChange(specBase, changeName, '- [x] ql-xxx 已完成任务\n')
    const destName = archiveDestDirName(todayIsoDate(), changeName)
    const archiveDir = join(specBase, 'changes', 'archive')
    const destDir = join(archiveDir, destName)
    mkdirSync(destDir, { recursive: true })
    writeFileSync(join(destDir, 'plan.md'), '# Plan\n')

    const pm = makePm()
    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [changeName] })

    assert.deepEqual(result.closed, [], 'closed 应为空')
    assert.equal(result.skipped.length, 1, 'skipped 应含 1 条')
    assert.equal(result.skipped[0].name, changeName, 'skipped name 正确')
    assert.match(result.skipped[0].reason, /目标目录已存在/, 'skipped reason 提示目标目录已存在')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
    assert.ok(existsSync(changeDir), '源目录应保持原位')
    assert.ok(existsSync(destDir), '已有归档目录应保持')
  } finally {
    cleanup(specBase)
  }
})

test('linkedChanges 为空数组 → 返回空 closed/skipped，无副作用', async () => {
  const specBase = makeSpecBase('qclc-empty-')
  const cwd = specBase
  try {
    const pm = makePm()
    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [] })

    assert.deepEqual(result.closed, [], 'closed 应为空')
    assert.deepEqual(result.skipped, [], 'skipped 应为空')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
  } finally {
    cleanup(specBase)
  }
})

test('linkedChanges 包含 quick-<8hex> sessionId → 过滤掉，不处理', async () => {
  const specBase = makeSpecBase('qclc-session-')
  const cwd = specBase
  const sessionId = 'quick-a1b2c3d4'
  try {
    const sessionDir = makeChange(specBase, sessionId, '- [x] ql-xxx 已完成任务\n')
    const pm = makePm()
    const result = await closeQuickLinkedChanges({ pm, cwd, specBase, linkedChanges: [sessionId] })

    assert.deepEqual(result.closed, [], 'closed 应为空')
    assert.deepEqual(result.skipped, [], 'skipped 应为空（sessionId 被过滤）')
    assert.equal(pm._calls.length, 0, 'unregisterChange 不应被调用')
    assert.ok(existsSync(sessionDir), 'session 目录应保持原位')
  } finally {
    cleanup(specBase)
  }
})
