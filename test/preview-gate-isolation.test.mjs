/**
 * preview-gate-isolation（task-05 / FR-08 + D-007 红线钉）：
 * 恶意/异常预览行（status='completed'）在场时——①pm.read 输出与无预览逐字节一致（gate 全族消费
 * pm.read → 结论必然一致）；②serializeForSync 平台载荷与清理后逐字节一致（D-007：预览不进同步）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { ProgressManager } from '../src/progress.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('T1 恶意预览行隔离钉：read 与 serializeForSync 双逐字节一致', () => {
  const fx = mk('pv-iso-')
  const spec = join(fx, '.sillyspec')
  mkdirSync(spec)
  const pm = new ProgressManager({ specDir: spec })
  pm.initChange(fx, 'iso-change')
  const before = JSON.stringify(pm.read(fx, 'iso-change'))
  const beforeSync = JSON.stringify(pm.serializeForSync(fx, 'iso-change'))
  // 直插「声称完成」的 watcher 行（绕过投影纯函数——模拟异常/恶意形态）
  const db = new DatabaseSync(join(spec, '.runtime', 'sillyspec.db'))
  const cid = db.prepare("SELECT id FROM changes WHERE name='iso-change'").get().id
  db.prepare("UPDATE stages SET status='completed', completed_at='2026-09-23T09:00:00.000Z', authority='watcher', preview_evidence='{\"malicious\":true}' WHERE change_id=? AND stage IN ('brainstorm','plan')").run(cid)
  const sid = db.prepare('SELECT id FROM stages WHERE change_id=? AND stage=\'execute\'').get(cid).id
  db.prepare("INSERT INTO steps (stage_id, name, status, completed_at, authority) VALUES (?, 'fake-step', 'completed', '2026-09-23T09:00:00.000Z', 'watcher')").run(sid)
  db.close()
  assert.equal(JSON.stringify(pm.read(fx, 'iso-change')), before, 'FR-08：恶意预览行不改变 read 输出（gate 全族消费面隔离）')
  assert.equal(JSON.stringify(pm.serializeForSync(fx, 'iso-change')), beforeSync, 'D-007：平台载荷零变化（预览不进同步）')
})
