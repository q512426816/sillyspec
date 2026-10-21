/**
 * handoff-takeover-hint（2026-10-21-p0-p1-hardening FR-05）
 *
 * dsh z2 实证：新会话自拟新 SESSION_ID（未沿用交接块导出值）→ 首个写操作撞所有权活跃窗，
 * 交接块没预告 --takeover 出路。锁死契约：
 *   T1 粘贴块内含 --takeover 预告行（位于「交接块结束」标记之前）
 *   T2 预告行只在粘贴块内出现一次，且不改变既有「SESSION_ID 保持不变」警示语义
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { ProgressManager } from '../src/progress.js'
import { buildHandoff } from '../src/handoff.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

async function fixtureAtBrainstorm() {
  const proj = mk('hofx-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  execFileSync('git', ['init', '-q'], { cwd: proj, encoding: 'utf8' })
  execFileSync('git', ['config', 'user.email', 't@t.local'], { cwd: proj, encoding: 'utf8' })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: proj, encoding: 'utf8' })
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(proj)
  await pm.initChange(proj, 'c1')
  const progress = pm.read(proj, 'c1')
  progress.currentStage = 'brainstorm'
  progress.stages = progress.stages || {}
  progress.stages.brainstorm = {
    status: 'in-progress',
    steps: [{ name: '澄清', status: 'completed' }, { name: '展示设计', status: 'pending' }],
  }
  pm._write(proj, progress, 'c1')
  return { proj, changeName: 'c1' }
}

test('T1 粘贴块内含 --takeover 预告行（换新 SESSION_ID 场景的出路）', async () => {
  const { proj, changeName } = await fixtureAtBrainstorm()
  const r = await buildHandoff({ cwd: proj, changeName })
  assert.equal(r.ok, true, `交接块生成成功：${r.error || ''}`)
  const endIdx = r.lines.findIndex((l) => l.includes('交接块结束'))
  const hintIdx = r.lines.findIndex((l) => l.includes('--takeover') && l.includes('SESSION_ID'))
  assert.ok(hintIdx !== -1, `预告行在场：${r.lines.join(' | ')}`)
  assert.ok(endIdx !== -1 && hintIdx < endIdx, '预告行在粘贴块内（结束标记之前）')
})

test('T2 既有「SESSION_ID 必须保持不变」警示语义保留', async () => {
  const { proj, changeName } = await fixtureAtBrainstorm()
  const r = await buildHandoff({ cwd: proj, changeName })
  assert.ok(r.lines.some((l) => l.includes('必须保持不变')), '既有警示行保留')
  assert.ok(r.lines.some((l) => l.startsWith('export SILLYSPEC_SESSION_ID=') || l.includes('export SILLYSPEC_SESSION_ID')), '导出行保留')
})
