// R5-L verify 卡点探查：execute/verify 步骤时间线 + 质量扫描记录 + 失败签名
import { DatabaseSync } from 'node:sqlite'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const WT = 'C:/Users/qinyi/IdeaProjects/multi-agent-platform/.sillyspec/.runtime/worktrees/2026-09-21-r5-session-replay'
const db = new DatabaseSync(join(WT, '.sillyspec/.runtime/sillyspec.db'), { readOnly: true })
const rows = db.prepare(`SELECT s.ordering,s.name,s.status,s.completed_at,st.stage FROM steps s JOIN stages st ON s.stage_id=st.id WHERE st.change_id=(SELECT id FROM changes WHERE name='2026-09-21-r5-session-replay') AND st.stage IN ('execute','verify') ORDER BY st.stage,s.ordering`).all()
let prev = null
for (const r of rows) {
  let t = '--'
  try { const v = r.completed_at; t = new Date(typeof v === 'number' ? v : Date.parse(v)).toTimeString().slice(0, 8) } catch { }
  const ts = r.completed_at ? (typeof r.completed_at === 'number' ? r.completed_at : Date.parse(r.completed_at)) : null
  const gap = prev && ts ? ((ts - prev) / 60000).toFixed(1) + '′' : ''
  if (ts) prev = ts
  console.log(r.stage.padEnd(8), String(r.ordering).padStart(2), r.status.padEnd(9), t.padEnd(9), gap.padStart(6), String(r.name).slice(0, 34))
}
// 质量扫描记录（失败签名/复用）
const qsp = join(WT, '.sillyspec/.runtime', 'verify-quality-scan-2026-09-21-r5-session-replay.json')
try {
  const j = JSON.parse(readFileSync(qsp, 'utf8'))
  console.log('\n质量扫描记录:', j.testResult?.status, '| 命令:', j.testResult?.command, '|', j.testResult?.exitCode, '| ranAt:', j.ranAt)
} catch (e) { console.log('\n质量扫描记录: 无（' + e.code + '）') }
// verify-runs 目录最近 gate 落盘
const vr = join(WT, '.sillyspec/.runtime', 'verify-runs')
try {
  for (const f of readdirSync(vr).sort().slice(-4)) {
    const st = statSync(join(vr, f))
    console.log('verify-run:', f, st.mtime.toTimeString().slice(0, 8))
  }
} catch { }
// lint 台账尾部
try {
  const lt = JSON.parse(readFileSync(join(WT, '.sillyspec/.runtime', 'verify-lint-tally.json'), 'utf8'))
  console.log('lint 台账: 总', lt.totalRuns, '败', lt.failedRuns, '| 最近 6 条:')
  for (const h of (lt.history || []).slice(-6)) console.log('  ', h.at.slice(11, 19), h.status, h.reason || '')
} catch { }
