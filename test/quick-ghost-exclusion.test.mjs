/**
 * quick 会话行 ghost 误判排除测试（ql-20260907-002-b9d4，2026-09-07）
 *
 * 背景（multi-agent-platform/docs/sillyspec/2026-09-07-quick-inflight-ghost-misjudge.md 实证）：
 * initChange 对 quick-<hex8> 会话行特意不建 changes/ 目录（progress.js 注释明示「进度存 SQL
 * 不需要实体 change 目录」），而 ghost 判定 = 「DB active 且 changes/ 无同名目录」未排除
 * quick 行——进行中的 quick 任务从写库那一刻起即命中 ghost，面板「清了又长」（每次清理
 * 都成功，新 ghost 是清理后才启动的 quick）。
 *
 * 修法（该文档「建议修法」）：
 *   - ghost 判定排除 quick 会话行（QUICK_SID_RE 同形正则）——stage-machine overview/show
 *     与 doctor-diagnostics D4 ghostRows 两处同源修；
 *   - doctor --cleanup-ghosts 保留 quick 行归档能力（「QUICKLOG 已完成但 DB 行仍 active」
 *     收尾中断的兜底出口，实测有效）——本文件把它钉成回归契约。
 *
 * 覆盖矩阵（同一 fixture 三行对照，证明排除精确作用于 quick 行而非放宽判定）：
 *   c-live          active + 有目录        → 非幽灵（既有行为回归）
 *   c-ghost         active + 目录被删      → 真幽灵（既有判定不放宽）
 *   quick-ab12cd34  active + 无目录(设计)  → 判定层豁免（overview/show/D4），清理层保留归档
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { DatabaseSync } from 'node:sqlite'

const QUICK_NAME = 'quick-ab12cd34'

function createTempProject() {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-quick-ghost-'))
  mkdirSync(join(cwd, '.sillyspec', '.runtime'), { recursive: true })
  mkdirSync(join(cwd, '.sillyspec', 'changes'), { recursive: true })
  return cwd
}

async function setupFixture(cwd) {
  const { ProgressManager } = await import('../src/progress.js')
  const pm = new ProgressManager()
  pm.init(cwd)
  pm.initChange(cwd, 'c-live')
  pm.initChange(cwd, 'c-ghost')
  // quick 会话行：initChange 按设计不建 changes/ 目录（progress.js 同源行为，不手搓 SQL）
  pm.initChange(cwd, QUICK_NAME)
  // c-ghost：删目录 → 真幽灵（SS-2 原有形态，对照组）
  rmSync(join(cwd, '.sillyspec', 'changes', 'c-ghost'), { recursive: true, force: true })
  // c-live 放个文件，避免空壳判定掺入（本测试只关心 ghost 维度）
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'c-live', 'proposal.md'), '# x\n')
  return pm
}

function readStatus(cwd, name) {
  const db = new DatabaseSync(join(cwd, '.sillyspec', '.runtime', 'sillyspec.db'), { readOnly: true })
  try {
    return db.prepare('SELECT status FROM changes WHERE name = ?').get(name)?.status
  } finally {
    db.close()
  }
}

test('overview（runStatusOverview envelope）：quick 行 ghost=false 且不升 warnings，真幽灵照旧', async () => {
  const cwd = createTempProject()
  let pm
  try {
    pm = await setupFixture(cwd)
    // 注意不关 pm._db：ProgressManager._dbPool 模块级单例缓存连接，关实例会把已关闭连接
    // 留在池里，同进程后续 new ProgressManager（runStatusOverview 内部）拿到死连接崩 prepare。

    const { runStatusOverview } = await import('../src/machine-interface.js')
    const { envelope, exitCode } = runStatusOverview({ cwd, specBase: join(cwd, '.sillyspec') })

    assert.equal(exitCode, 0, '总览成功（ghost 是待清理事实非阻断）')
    assert.equal(envelope.data.active_changes, 3, 'quick 行仍计入活跃列表（只豁免 ghost 标记，不隐藏行）')
    const quick = envelope.data.changes.find(c => c.name === QUICK_NAME)
    assert.ok(quick, 'quick 行在总览中可见')
    assert.equal(quick.ghost, false, 'quick 行无目录属设计形态 → ghost=false（修复点）')
    assert.equal(quick.readable, true, 'quick 行 progress 可读')
    const ghost = envelope.data.changes.find(c => c.name === 'c-ghost')
    assert.ok(ghost && ghost.ghost === true, '非 quick 行目录缺失仍 ghost=true（判定未放宽）')
    assert.ok(!envelope.warnings.some(w => w.includes(QUICK_NAME)), 'quick 行不升 ghost warnings')
    assert.ok(envelope.warnings.some(w => w.includes('c-ghost')), '真幽灵照旧升 warnings')
  } finally {
    try { if (pm && pm._db) pm._db.close() } catch { /* noop */ }
    try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 偶发 EPERM 不阻断 */ }
  }
})

test('show 人类可读汇总：quick 行不带「目录缺失」⚠️，真幽灵行照旧提示', async () => {
  const cwd = createTempProject()
  let pm
  try {
    pm = await setupFixture(cwd)

    let showOut = ''
    const origLog = console.log
    console.log = (...a) => { showOut += a.join(' ') + '\n' }
    try {
      pm.show(cwd)
    } finally {
      console.log = origLog
    }

    const quickLine = showOut.split('\n').find(l => l.includes(QUICK_NAME))
    assert.ok(quickLine, 'show 汇总含 quick 行')
    assert.ok(!quickLine.includes('目录缺失'), 'quick 行不渲染目录缺失 ⚠️（修复点）')
    const ghostLine = showOut.split('\n').find(l => l.includes('c-ghost'))
    assert.ok(ghostLine && ghostLine.includes('目录缺失'), '真幽灵行照旧渲染目录缺失提示')
  } finally {
    try { if (pm && pm._db) pm._db.close() } catch { /* noop */ }
    try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 偶发 EPERM 不阻断 */ }
  }
})

test('doctor D4 change_db_consistency：ghost_rows 排除 quick 行、保留真幽灵', async () => {
  const cwd = createTempProject()
  let pm
  try {
    pm = await setupFixture(cwd)
    pm._db.close()

    const { runDoctorDiagnostics } = await import('../src/doctor-diagnostics.js')
    const dim = (await runDoctorDiagnostics({ cwd })).dimensions.find(d => d.name === 'change_db_consistency')

    assert.ok(dim, 'D4 维度存在')
    assert.ok(!dim.ghost_rows.includes(QUICK_NAME), 'ghost_rows 不含 quick 行（修复点）')
    assert.ok(dim.ghost_rows.includes('c-ghost'), 'ghost_rows 仍含真幽灵（判定未放宽）')
    assert.equal(dim.pass, false, '真幽灵在场 → 维度仍 WARNING 不粉饰')
    assert.equal(dim.db_active_count, 3, 'active 计数含 quick 行（豁免的是判定不是计数）')
  } finally {
    try { if (pm && pm._db) pm._db.close() } catch { /* noop */ }
    try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 偶发 EPERM 不阻断 */ }
  }
})

test('cleanup-ghosts 保留 quick 行归档能力：dry-run 列出、confirm 归档（收尾中断兜底出口）', async () => {
  const cwd = createTempProject()
  let pm
  try {
    pm = await setupFixture(cwd)
    pm._db.close()

    const { cleanupGhostChanges } = await import('../src/doctor-diagnostics.js')
    const dry = await cleanupGhostChanges({ cwd, confirm: false })
    assert.equal(dry.action, 'dry_run')
    assert.ok(dry.ghosts.includes(QUICK_NAME), 'dry-run 仍列 quick 行（归档能力保留，文档明示）')
    assert.ok(dry.ghosts.includes('c-ghost'), 'dry-run 列真幽灵')
    assert.equal(readStatus(cwd, QUICK_NAME), 'active', 'dry-run 零写入')

    const r = await cleanupGhostChanges({ cwd, confirm: true })
    assert.equal(r.action, 'archived')
    assert.ok(r.archived.includes(QUICK_NAME), 'confirm 归档 quick 行（收尾中断的兜底出口）')
    assert.equal(readStatus(cwd, QUICK_NAME), 'archived', 'quick 行 status=archived')
    assert.equal(readStatus(cwd, 'c-ghost'), 'archived', '真幽灵归档')
    assert.equal(readStatus(cwd, 'c-live'), 'active', '正常变更不受影响')
  } finally {
    try { if (pm && pm._db) pm._db.close() } catch { /* noop */ }
    try { rmSync(cwd, { recursive: true, force: true }) } catch { /* Windows 偶发 EPERM 不阻断 */ }
  }
})
