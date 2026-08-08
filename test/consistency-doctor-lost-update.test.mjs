/**
 * ConsistencyDoctor.detectLostUpdateSignals 测试（task-12 / FR-07 / AC-03 / design §7 / D-02）
 *
 * 覆盖 lost-update 间接信号对账判据：
 *   .runtime/worktrees/<change> 目录存在 + DB current_stage ≠ 'execute' → 报 1 条 issue
 *   .runtime/worktrees/<change> 目录存在 + DB current_stage = 'execute' → 不报（空数组）
 *
 * 边界（constraints）：
 *   - worktrees 目录不存在 → 空数组（零信号兼容既有 fixture）
 *   - DB 无对应行（data=null）的 worktree 目录 → 不算信号
 *   - 只读诊断：不写 DB、不删 worktree 目录
 *   - checkConsistency 正确把信号并入 issues 报告
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// ── 辅助：创建临时项目（含 .sillyspec/.runtime + changes） ──
function createTempProject() {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-lost-update-'))
  const specDir = join(cwd, '.sillyspec')
  mkdirSync(join(specDir, '.runtime'), { recursive: true })
  mkdirSync(join(specDir, 'changes'), { recursive: true })
  return { cwd, specDir }
}

// ── 辅助：初始化 PM + change ──
async function setupProgress(cwd, changeName) {
  const { ProgressManager } = await import('../src/progress.js')
  const pm = new ProgressManager()
  pm.init(cwd)
  pm.initChange(cwd, changeName)
  return pm
}

// ── 辅助：设置 change 的 current_stage（写 DB） ──
function setCurrentStage(pm, cwd, changeName, stage) {
  const data = pm.read(cwd, changeName)
  data.currentStage = stage
  pm._write(cwd, data, changeName)
}

// ── 辅助：构造 worktree 残留目录 ──
function makeWorktreeDir(cwd, changeName) {
  const dir = join(cwd, '.sillyspec', '.runtime', 'worktrees', changeName)
  mkdirSync(dir, { recursive: true })
  return dir
}

// ── 辅助：清理（先关 DB 释放 Windows 文件句柄，再删目录） ──
function cleanup(pm, cwd) {
  try { if (pm && pm._db) pm._db.close() } catch { /* noop */ }
  try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 偶发 EPERM 不阻断断言 */ }
}

test('detectLostUpdateSignals：worktree 存在 + current_stage=execute → 空数组（不报）', async () => {
  const { cwd } = createTempProject()
  let pm
  try {
    const changeName = 'lu-exec-ok'
    pm = await setupProgress(cwd, changeName)
    setCurrentStage(pm, cwd, changeName, 'execute')
    const worktreeDir = makeWorktreeDir(cwd, changeName)

    const signals = pm._consistency.detectLostUpdateSignals(cwd)
    assert.equal(signals.length, 0, 'execute 阶段的 worktree 残留不是信号')
    // 只读：worktree 目录仍在
    assert.ok(existsSync(worktreeDir), 'worktree 目录未被改动（只读诊断）')
  } finally {
    cleanup(pm, cwd)
  }
})

test('detectLostUpdateSignals：worktree 残留 + current_stage≠execute → 报 1 条 issue', async () => {
  const { cwd } = createTempProject()
  let pm
  try {
    const changeName = 'lu-reverted'
    pm = await setupProgress(cwd, changeName)
    // 进度被回退到 plan（worktree 残留但非 execute）
    setCurrentStage(pm, cwd, changeName, 'plan')
    const worktreeDir = makeWorktreeDir(cwd, changeName)

    const signals = pm._consistency.detectLostUpdateSignals(cwd)
    assert.equal(signals.length, 1, '应报 1 条 lost-update 信号')
    const issue = signals[0]
    // issue 含 change 名、实际 current_stage、worktree 目录路径
    assert.ok(issue.includes(changeName), `issue 应含 change 名（实际: ${issue}）`)
    assert.ok(issue.includes('plan'), `issue 应含实际 current_stage（实际: ${issue}）`)
    assert.ok(issue.includes(worktreeDir), `issue 应含 worktree 目录路径（实际: ${issue}）`)
    // 只读：worktree 目录仍在
    assert.ok(existsSync(worktreeDir), 'worktree 目录未被删除（只读诊断）')
  } finally {
    cleanup(pm, cwd)
  }
})

test('detectLostUpdateSignals：worktrees 目录不存在 → 空数组（零信号兼容）', async () => {
  const { cwd } = createTempProject()
  let pm
  try {
    pm = await setupProgress(cwd, 'lu-no-wt-root')
    // 不创建 .runtime/worktrees 目录
    const worktreesRoot = join(cwd, '.sillyspec', '.runtime', 'worktrees')
    assert.ok(!existsSync(worktreesRoot), '前置：worktrees 目录不存在')

    const signals = pm._consistency.detectLostUpdateSignals(cwd)
    assert.equal(signals.length, 0, '无 worktrees 目录应返回空数组')
  } finally {
    cleanup(pm, cwd)
  }
})

test('detectLostUpdateSignals：DB 无对应行（data=null）的 worktree 目录 → 不算信号', async () => {
  const { cwd } = createTempProject()
  let pm
  try {
    pm = await setupProgress(cwd, 'lu-registered')
    // 只初始化 registered，但 worktrees 目录下多一个 DB 无记录的 change
    makeWorktreeDir(cwd, 'lu-registered')
    makeWorktreeDir(cwd, 'lu-ghost-no-db-row')

    const signals = pm._consistency.detectLostUpdateSignals(cwd)
    // lu-registered 刚 initChange，current_stage='scan'（≠execute）→ 报 1 条
    // lu-ghost-no-db-row 无 DB 行（data=null）→ 不算信号
    assert.equal(signals.length, 1, '仅 registered 报 1 条，ghost 无 DB 行不报')
    assert.ok(signals[0].includes('lu-registered'), '应报 registered change')
    assert.ok(!signals.some(s => s.includes('lu-ghost-no-db-row')), 'ghost 无 DB 行不算信号')
  } finally {
    cleanup(pm, cwd)
  }
})

test('checkConsistency：lost-update 信号并入 issues 报告（只读）', async () => {
  const { cwd } = createTempProject()
  let pm
  try {
    const changeName = 'lu-integration'
    pm = await setupProgress(cwd, changeName)
    setCurrentStage(pm, cwd, changeName, 'verify')
    const worktreeDir = makeWorktreeDir(cwd, changeName)

    const result = pm.checkConsistency(cwd, changeName)
    // lost-update 信号应出现在 issues 里（含 change 名与实际 stage）
    assert.ok(result.issues.some(i => i.includes('lost-update') && i.includes(changeName) && i.includes('verify')),
      `issues 应含 lost-update 信号（实际 issues: ${JSON.stringify(result.issues)}）`)
    // 只读：worktree 目录仍在
    assert.ok(existsSync(worktreeDir), 'checkConsistency 全程只读，不删 worktree 目录')
  } finally {
    cleanup(pm, cwd)
  }
})
