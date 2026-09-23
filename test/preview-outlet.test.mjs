/**
 * preview-outlet（task-03）：显式预览出口——readPreviewProgress + handoff 机器预览态段。
 * 契约：出口带证据引用；无预览行零输出（缺省一致性）；fail-open 容忍。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { readPreviewProgress, ProgressManager } from '../src/progress.js'
import { buildHandoff } from '../src/handoff.js'
import { writePreviewStages } from '../src/preview-progress.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function fixture(name = 'o-change') {
  const fx = mk('pv-out-')
  const spec = join(fx, '.sillyspec')
  mkdirSync(spec)
  const pm = new ProgressManager({ specDir: spec })
  pm.initChange(fx, name)
  return { fx, spec, name }
}

test('T1 readPreviewProgress：预览行+证据解析 / 无预览空集 / 未注册与库缺失 fail-open', () => {
  const { fx, spec, name } = fixture()
  writePreviewStages({ specDir: spec, changeName: name, rows: [
    { stage: 'brainstorm', status: 'in-progress', startedAt: '2026-09-23T09:00:00.000Z', evidence: { ts: 1, files: ['proposal.md'], changed: true } },
  ] })
  const pv = readPreviewProgress(spec, name)
  assert.equal(pv.exists, true)
  assert.equal(pv.stages.length, 1)
  assert.equal(pv.stages[0].stage, 'brainstorm')
  assert.deepEqual(pv.stages[0].evidence.files, ['proposal.md'], '证据引用解析')
  const none = readPreviewProgress(spec, name + '-other')
  assert.equal(none.exists, false, '未注册 fail-open 空集')
  assert.deepEqual(readPreviewProgress(join(mk('pv-x-'), 's'), 'nope'), { exists: false, stages: [] }, '库缺失 fail-open')
  void fx
})

test('T2 handoff 机器预览态段：有预览带段与证据 / 无预览零段', async () => {
  const a = fixture('h1')
  writePreviewStages({ specDir: a.spec, changeName: 'h1', rows: [
    { stage: 'execute', status: 'in-progress', startedAt: '2026-09-23T09:30:00.000Z', evidence: { ts: 9, files: ['tasks.md'], changed: true } },
  ] })
  const r1 = await buildHandoff({ cwd: a.fx, specBase: a.spec, changeName: 'h1' })
  assert.ok(r1.ok, 'handoff ok')
  const text1 = r1.lines.join('\n')
  assert.ok(text1.includes('机器预览态'), '预览段在场')
  assert.ok(text1.includes('execute → in-progress') && text1.includes('tasks.md'), '证据引用渲染')

  const b = fixture('h2')
  const r2 = await buildHandoff({ cwd: b.fx, specBase: b.spec, changeName: 'h2' })
  assert.ok(!r2.lines.join('\n').includes('机器预览态'), '无预览行零段（缺省一致性）')
})
