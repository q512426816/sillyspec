// PI 会话工具坑②③修复回归（2026-09-10 用户反馈）：
//   ②a worktree **已提交**改动进 diff 集（「先提交则 diff 空」半边）：meta 无 baselineCommit/
//      baseHash 时主仓 diff 与 status 双盲区 → merge-base(主仓 HEAD, worktree HEAD)..worktree HEAD 补入
//   ②b evidence mtime 锚点数据面：getStageStartedAt DB roundtrip（gates 接线 execute started_at
//      优先、completed_at 兜底——锚「完成时刻」会把 execute 期间产的证据判旧，时序两难）
//   ③ verify-result.md 内容回退检测：高水位指纹（hash+mtime）检出「内容变且 mtime 回退」
//      （平台/daemon 回写旧版的确定性指纹）→ regressed=true；正常前进不误报
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, utimesSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'child_process'
import { resolveVerifyChangedFiles, trackVerifyResultRegression } from '../src/verify-postcheck.js'
import { makeRepo, initChange, cleanup } from './_complete-step-harness.mjs'

function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

test('②a worktree 已提交改动（status 干净）进 diff 集——merge-base 补齐', () => {
  const main = mkdtempSync(join(tmpdir(), 'vwt-main-'))
  const wt = join(dirname(main), 'vwt-wt-' + Date.now())
  try {
    sh('git init -q -b main && git config user.email t@t && git config user.name t', main)
    mkdirSync(join(main, 'src'), { recursive: true })
    writeFileSync(join(main, 'src', 'a.js'), 'base\n')
    sh('git add -A && git commit -qm base', main)
    // worktree 分支 + 在 worktree 内提交新文件（status 干净 = 用户「先提交」形态）
    sh(`git worktree add "${wt}" -b wtb`, main)
    writeFileSync(join(wt, 'src', 'b.js'), 'wt committed\n')
    sh('git add -A && git commit -qm wt-change', wt)
    // meta 无 baselineCommit/baseHash（用户踩坑形态：主仓 diff 与 status 双盲区）
    const specBase = join(main, '.sillyspec')
    mkdirSync(join(specBase, '.runtime', 'worktrees', 'c1'), { recursive: true })
    writeFileSync(join(specBase, '.runtime', 'worktrees', 'c1', 'meta.json'),
      JSON.stringify({ worktreePath: wt, mode: 'worktree' }))
    const files = resolveVerifyChangedFiles(main, 'c1', null, { includeWorkingTree: true, specBase })
    assert.ok(Array.isArray(files) && files.includes('src/b.js'),
      `已提交的 worktree 改动应进 diff 集（实际：${JSON.stringify(files)}——修复前此处为空，「先提交则 diff 空」）`)
  } finally {
    try { sh(`git worktree remove --force "${wt}"`, main) } catch {}
    rmSync(main, { recursive: true, force: true })
    try { rmSync(wt, { recursive: true, force: true }) } catch {}
  }
})

test('②b getStageStartedAt：DB roundtrip 优先 started_at，缺列回退语义', async () => {
  const { cwd, specBase } = makeRepo('vsa-')
  try {
    const pm = await initChange(cwd, specBase, 'c1')
    // 无 execute 行 → null（调用方走 getStageCompletedAt → R-05，容错链）
    assert.equal(pm.getStageStartedAt(cwd, 'c1', 'execute'), null, '无阶段行 → null 不抛')
    // 种一行 execute：started_at 早于 completed_at（证据窗口下界应取早者）。
    // initChange 已按 STAGE_ORDER 播种阶段行 → ON CONFLICT upsert（与 change-registry archive 行同款）。
    const db = pm._ensureDB(cwd).getDb()
    const row = db.prepare('SELECT id FROM changes WHERE name = ?').get('c1')
    db.prepare(`INSERT INTO stages (change_id, stage, status, started_at, completed_at)
                VALUES (?, 'execute', 'completed', ?, ?)
                ON CONFLICT(change_id, stage) DO UPDATE SET status = 'completed', started_at = excluded.started_at, completed_at = excluded.completed_at`)
      .run(row.id, '2026-09-09T01:00:00.000Z', '2026-09-09T05:00:00.000Z')
    assert.equal(pm.getStageStartedAt(cwd, 'c1', 'execute'), '2026-09-09T01:00:00.000Z',
      'started_at 读回精确值（gates 接线：execute 期间产的证据 mtime ≥ 此刻即入窗，不再判旧）')
    assert.equal(pm.getStageCompletedAt(cwd, 'c1', 'execute'), '2026-09-09T05:00:00.000Z',
      'completed_at 既有语义不变（旧行无 started_at 时仍可兜底）')
  } finally { cleanup() }
})

test('③ verify-result.md 回退检测：内容变+mtime 回退 → regressed；正常前进不误报', () => {
  const specBase = mkdtempSync(join(tmpdir(), 'vreg-'))
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  const vr = join(changeDir, 'verify-result.md')
  try {
    const d0 = new Date(Date.now() - 60_000)
    writeFileSync(vr, 'v1 报告\n')
    utimesSync(vr, d0, d0)
    // 首见：记高水位，不报警
    assert.equal(trackVerifyResultRegression(specBase, 'c1', vr).regressed, false, '首见 → false')
    // 正常前进：内容改 + mtime 更新 → 高水位刷新，不报警
    const t1 = Date.now() - 30_000
    writeFileSync(vr, 'v2 完整报告\n')
    utimesSync(vr, new Date(t1), new Date(t1))
    assert.equal(trackVerifyResultRegression(specBase, 'c1', vr).regressed, false, '前进 → false')
    // 回退：旧内容复活 + mtime 倒流（服务端回写指纹）→ 报警
    writeFileSync(vr, 'v1 报告\n')
    utimesSync(vr, d0, d0)
    const r = trackVerifyResultRegression(specBase, 'c1', vr)
    assert.equal(r.regressed, true, '内容回退+mtime 倒流 → true')
    assert.equal(r.prevMtime, t1, 'prevMtime 带回高水位时刻（告警文案用）')
    // 回退态不覆盖高水位；agent 重写（内容新+mtime 新）后恢复正常
    const t2 = Date.now()
    writeFileSync(vr, 'v3 重写报告\n')
    utimesSync(vr, new Date(t2), new Date(t2))
    assert.equal(trackVerifyResultRegression(specBase, 'c1', vr).regressed, false, '重写后 → false')
    // 文件不存在 → false 不抛（删档场景）
    assert.equal(trackVerifyResultRegression(specBase, 'c1', join(changeDir, 'ghost.md')).regressed, false, '不存在 → false')
  } finally { rmSync(specBase, { recursive: true, force: true }) }
})
