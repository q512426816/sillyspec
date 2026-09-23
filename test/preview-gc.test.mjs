/**
 * preview-gc（task-04 / FR-06）：归档收尾清 watcher 预览行。
 * 契约：unregisterChange 后该 change 的 authority='watcher' 行清零；cli 行（含归档终态行）保留；
 * 归档 upsert 归章（authority='cli'，fail① 同族防御钉）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { ProgressManager } from '../src/progress.js'
import { writePreviewStages } from '../src/preview-progress.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('T1 归档 GC：watcher 行清零 / cli 行保留 / 归档行归章', () => {
  const fx = mk('pv-gc-')
  const spec = join(fx, '.sillyspec')
  mkdirSync(spec)
  const pm = new ProgressManager({ specDir: spec })
  pm.initChange(fx, 'gc-change')
  // 预览认领 brainstorm（pending 未触碰）+ 刷一条 execute 预览
  writePreviewStages({ specDir: spec, changeName: 'gc-change', rows: [
    { stage: 'brainstorm', status: 'in-progress', startedAt: '2026-09-23T09:00:00.000Z', evidence: { ts: 1, files: ['proposal.md'] } },
    { stage: 'execute', status: 'in-progress', startedAt: '2026-09-23T09:01:00.000Z', evidence: { ts: 1, files: ['tasks.md'] } },
  ] })
  const db0 = new DatabaseSync(join(spec, '.runtime', 'sillyspec.db'))
  assert.equal(db0.prepare("SELECT count(*) c FROM stages WHERE authority='watcher'").get().c, 2, '前置：两行预览在场')
  db0.close()
  // 归档收尾（带 archiveStepNames 走完整终态链）
  pm.unregisterChange(fx, 'gc-change', { archiveStepNames: ['确认归档'] })
  const db = new DatabaseSync(join(spec, '.runtime', 'sillyspec.db'))
  assert.equal(db.prepare("SELECT count(*) c FROM stages WHERE authority='watcher'").get().c, 0, '归档后 watcher 行清零（GC）')
  const arch = db.prepare("SELECT status, authority FROM stages WHERE stage='archive'").get()
  assert.ok(arch && arch.status === 'completed' && arch.authority === 'cli', '归档终态行在场且归章 cli')
  db.close()
})
