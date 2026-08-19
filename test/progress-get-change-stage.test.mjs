/**
 * ProgressManager.getChangeStage 单元测试（quick 轻量归档阶段闸的查询接口）。
 *
 * 覆盖（真实 DB，不用 mock——facade 转发 + ChangeRegistry 查询一起验）：
 *   - 未注册变更 → null（未注册目录桩，调用方按轻量场景放行）
 *   - registerChange 新行 → { current_stage: 'scan', status: 'active' }（表默认值）
 *   - stage 推进到 verify 后查询 → current_stage='verify'（阶段闸的判定输入）
 *   - unregisterChange（archived）后查询仍返回行（status='archived'，stage 保留）
 *
 * quick-close-midflight：closeQuickLinkedChanges 靠此接口区分「完整流程中途变更」与
 * 「small 逃生通道僵尸变更」，见 quick-close-linked-changes.test.mjs 阶段闸用例。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { ProgressManager } from '../src/progress.js'

test('getChangeStage：未注册 → null；注册 → scan/active；推进 → verify；归档 → status 翻转', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'pm-stage-'))
  const specBase = join(tmp, '.sillyspec')
  try {
    const pm = new ProgressManager({ specDir: specBase })
    pm.init(tmp)
    const dbPath = join(specBase, '.runtime', 'sillyspec.db')
    const changeName = '2026-08-19-stage-gate'

    // 未注册 → null
    assert.equal(pm.getChangeStage(tmp, changeName), null, '未注册变更应返回 null')

    // registerChange → 表默认 scan/active（无 stages 行 → stage_status=null，ql-20260819-010）
    pm.registerChange(tmp, changeName)
    assert.deepEqual(
      pm.getChangeStage(tmp, changeName),
      { current_stage: 'scan', status: 'active', stage_status: null },
      '注册后应返回默认 scan/active + stage_status null',
    )

    // stage 推进（直接 SQL 模拟 verify 停留，不依赖 initChange 的阶段编排）
    const db = new DatabaseSync(dbPath)
    try {
      db.prepare("UPDATE changes SET current_stage = 'verify' WHERE name = ?").run(changeName)
    } finally { db.close() }
    assert.equal(pm.getChangeStage(tmp, changeName).current_stage, 'verify', '推进后应读到 verify')

    // unregisterChange → status='archived'，行仍在（stage 保留供追溯）
    pm.unregisterChange(tmp, changeName)
    const archived = pm.getChangeStage(tmp, changeName)
    assert.equal(archived.status, 'archived', '归档后 status 应为 archived')
    assert.equal(archived.current_stage, 'verify', '归档后 current_stage 保留')
  } finally {
    try { rmSync(tmp, { recursive: true, force: true }) } catch {}
  }
})

test('getChangeStage：stages 行带出 stage_status（brainstorm completed 空窗可判）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'pm-stage2-'))
  const specBase = join(tmp, '.sillyspec')
  try {
    const pm = new ProgressManager({ specDir: specBase })
    pm.init(tmp)
    const dbPath = join(specBase, '.runtime', 'sillyspec.db')
    const changeName = '2026-08-19-stage-completed'

    pm.registerChange(tmp, changeName)
    // 模拟 brainstorm 完成但 current_stage 尚未推进到 plan 的空窗（事故现场形态）：
    // changes.current_stage='brainstorm' + stages 里 brainstorm 行 status='completed'
    const db = new DatabaseSync(dbPath)
    try {
      const changeId = db.prepare('SELECT id FROM changes WHERE name = ?').get(changeName).id
      db.prepare(
        "INSERT INTO stages (change_id, stage, status) VALUES (?, 'brainstorm', 'completed')"
      ).run(changeId)
      db.prepare("UPDATE changes SET current_stage = 'brainstorm' WHERE id = ?").run(changeId)
    } finally { db.close() }

    const info = pm.getChangeStage(tmp, changeName)
    assert.equal(info.current_stage, 'brainstorm', 'current_stage 读 brainstorm')
    assert.equal(info.stage_status, 'completed', '空窗期应读出 stage_status=completed')
  } finally {
    try { rmSync(tmp, { recursive: true, force: true }) } catch {}
  }
})
