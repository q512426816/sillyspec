/**
 * preview-progress（task-02）：投影纯函数 + 短连接写纪律。
 * 契约：粒度=阶段级（工件映射）；archived 不投影；changed 差分信号；
 * 写纪律=无 cli 干扰（DO UPDATE WHERE authority='watcher'）/maxRows 截断/库缺失与未注册 fail-open。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { projectPreviewStages, writePreviewStages, PREVIEW_STAGE_SOURCES } from '../src/preview-progress.js'
import { ProgressManager } from '../src/progress.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function fixture() {
  const fx = mk('pv-proj-')
  mkdirSync(join(fx, '.sillyspec'), { recursive: true })
  return { fx, spec: join(fx, '.sillyspec') }
}
function snap(over = {}) {
  return { ts: 1790150000000, archived: false, head: 'aaa', files: {}, ...over }
}

test('T1 投影纯函数：工件→阶段映射 / 出现与变更差分 / archived 不投影', () => {
  const s1 = snap({ files: { 'proposal.md': { stage: 'proposal' }, 'tasks.md': { checked: 2 } } })
  const rows = projectPreviewStages({ snapshot: s1, prevSnapshot: snap() })
  assert.deepEqual(rows.map(r => r.stage).sort(), ['brainstorm', 'execute'], '工件映射到阶段')
  assert.ok(rows.every(r => r.status === 'in-progress'))
  assert.ok(rows.find(r => r.stage === 'execute').evidence.changed, '新出现工件 changed=true')
  const s2 = snap({ ts: s1.ts + 1000, files: { 'proposal.md': { stage: 'proposal' }, 'tasks.md': { checked: 2 } } })
  const rows2 = projectPreviewStages({ snapshot: s2, prevSnapshot: s1 })
  assert.equal(rows2.find(r => r.stage === 'execute').evidence.changed, false, '无变化差分 changed=false')
  assert.equal(projectPreviewStages({ snapshot: snap({ archived: true, files: { 'proposal.md': {} } }) }).length, 0, 'archived 不投影')
  assert.equal(projectPreviewStages({ snapshot: null }).length, 0, '空快照容忍')
})

test('T2 写纪律：无行写入 watcher 行 / cli 行不被触碰 / maxRows 截断 / fail-open', () => {
  const { fx, spec } = fixture()
  const pm = new ProgressManager({ specDir: spec })
  pm.initChange(fx, 'w-change')
  const db0 = new DatabaseSync(join(spec, '.runtime', 'sillyspec.db'))
  const cid = db0.prepare("SELECT id FROM changes WHERE name='w-change'").get().id
  // initChange 已预建全套 cli/pending 行（执行期发现）：verify 行改为「已触碰」形态作不可认领对象
  db0.prepare("UPDATE stages SET status='completed', started_at='2026-09-23T08:00:00.000Z' WHERE stage='verify'").run()
  db0.close()
  const rows = [
    { stage: 'brainstorm', status: 'in-progress', startedAt: '2026-09-23T09:00:00.000Z', evidence: { ts: 1, files: ['proposal.md'] } },
    { stage: 'verify', status: 'in-progress', startedAt: '2026-09-23T09:01:00.000Z', evidence: { ts: 1, files: ['verify-result.md'] } },
    { stage: 'execute', status: 'in-progress', startedAt: '2026-09-23T09:02:00.000Z', evidence: { ts: 1, files: ['tasks.md'] } },
  ]
  assert.equal(writePreviewStages({ specDir: spec, changeName: 'w-change', rows }), true, '正常写入返回 true')
  const db = new DatabaseSync(join(spec, '.runtime', 'sillyspec.db'))
  const w = db.prepare("SELECT authority, status, preview_evidence FROM stages WHERE stage='brainstorm'").get()
  assert.equal(w.authority, 'watcher', 'pending 未触碰行被预览认领（D-005@v2：initChange 预建行不死锁）')
  assert.ok(JSON.parse(w.preview_evidence).files.includes('proposal.md'), 'evidence 落库')
  const cli = db.prepare("SELECT authority, status FROM stages WHERE stage='verify'").get()
  assert.equal(cli.authority, 'cli', '既有 cli 行不被触碰（fail① 反向钉）')
  assert.equal(cli.status, 'completed', 'cli 行业务字段原样')
  db.close()
  // 再次写入同键（watcher 行 DO UPDATE 分支更新 evidence）
  writePreviewStages({ specDir: spec, changeName: 'w-change', rows: [{ stage: 'brainstorm', status: 'in-progress', startedAt: '2026-09-23T09:05:00.000Z', evidence: { ts: 2, files: ['proposal.md'], changed: true } }] })
  const db2 = new DatabaseSync(join(spec, '.runtime', 'sillyspec.db'))
  const w2 = db2.prepare("SELECT preview_evidence FROM stages WHERE stage='brainstorm' AND authority='watcher'").get()
  assert.equal(JSON.parse(w2.preview_evidence).ts, 2, 'watcher 行可自更新')
  db2.close()
  // maxRows 截断
  const many = Array.from({ length: 12 }, (_, i) => ({ stage: `s${i}`, status: 'in-progress', startedAt: 'x', evidence: {} }))
  const { spec: spec2, fx: fx2 } = fixture()
  const pm2 = new ProgressManager({ specDir: spec2 })
  pm2.initChange(fx2, 'm-change')
  writePreviewStages({ specDir: spec2, changeName: 'm-change', rows: many })
  const db3 = new DatabaseSync(join(spec2, '.runtime', 'sillyspec.db'))
  assert.equal(db3.prepare("SELECT count(*) c FROM stages WHERE authority='watcher'").get().c, 8, 'maxRows=8 截断')
  db3.close()
  // fail-open：库缺失 / 变更未注册
  assert.equal(writePreviewStages({ specDir: join(mk('pv-none-'), 'x'), changeName: 'nope', rows }), false, '库缺失 false')
  assert.equal(writePreviewStages({ specDir: spec, changeName: '未注册变更', rows }), false, '未注册 false')
  assert.equal(writePreviewStages({ specDir: spec, changeName: 'w-change', rows: [] }), false, '空行集 false')
})

// ── 步骤级投影（预览账本 v2，D-004 兑现）──

test('T3 步骤投影（import 后）：工件→步骤行 / archived 不投影 / 差分 changed', async () => {
  const { projectPreviewSteps, PREVIEW_STEP_SOURCES } = await import('../src/preview-progress.js')
  const snap1 = { ts: 1000, archived: false, files: { 'proposal.md': { stage: 'proposal' }, 'plan.md': {} } }
  const rows = projectPreviewSteps({ snapshot: snap1, prevSnapshot: { ts: 500, archived: false, files: {} } })
  assert.ok(rows.length >= 2, `proposal+plan 至少两行（${rows.length}）`)
  const prop = rows.find(r => r.step === '写设计文档并自审')
  assert.ok(PREVIEW_STEP_SOURCES['proposal.md'] && PREVIEW_STEP_SOURCES['proposal.md'].stage === 'brainstorm', '映射表导出被引用')
  assert.ok(prop && prop.stage === 'brainstorm' && prop.status === 'in-progress', 'proposal→brainstorm/写设计文档')
  assert.ok(rows.find(r => r.step === '生成分级计划'), 'plan→plan/生成分级计划')
  assert.equal(rows.every(r => r.evidence.changed), true, '首现 changed=true')
  const snap2 = { ts: 2000, archived: false, files: { 'proposal.md': { stage: 'proposal' }, 'plan.md': {} } }
  const rows2 = projectPreviewSteps({ snapshot: snap2, prevSnapshot: snap1 })
  assert.equal(rows2.find(r => r.step === '写设计文档并自审').evidence.changed, false, '无变化 changed=false')
  assert.equal(projectPreviewSteps({ snapshot: { ts: 1, archived: true, files: { 'proposal.md': {} } } }).length, 0, 'archived 不投影')
  assert.equal(projectPreviewSteps({ snapshot: null }).length, 0, '空容忍')
})
