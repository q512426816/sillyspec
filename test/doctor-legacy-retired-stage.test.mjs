/**
 * doctor-legacy-retired-stage.test.mjs — verify 退役后的存量在途 legacy 盖戳
 * （2026-11-26-verify-stage-retire task-09 / FR-05 / D-004）
 *
 * 覆盖：
 *   ① ProgressManager.legacyCompleteRetiredStage：一次写两态（verify 行 completed + current_stage→archive），
 *      绕过 VALID_STAGES 拦截（verify 已不在枚举内）；
 *   ② 幂等：二跑 applied=false reason='already-completed'；
 *   ③ 无 verify 行：applied=false reason='no-verify-stage-row'（新变更按四阶段流转零打扰）；
 *   ④ doctor 维度：停在 verify 的活跃变更被点名（retired-verify-in-flight WARNING）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ProgressManager } from '../src/progress.js'
import { runDoctorDiagnostics } from '../src/doctor-diagnostics.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

async function makeRepoWithVerifyInFlight(name = '2026-11-01-legacy-verify') {
  const root = mkdtempSync(join(tmpdir(), 'dlrs-'))
  const spec = join(root, '.sillyspec')
  const pm = new ProgressManager({ specDir: spec })
  await pm.init(root)
  await pm.initChange(root, name)
  const progress = pm.read(root, name) || { currentStage: 'verify', stages: {} }
  progress.currentStage = 'verify'
  progress.stages = {
    ...(progress.stages || {}),
    execute: { status: 'completed', steps: [{ name: 'x', status: 'completed' }] },
    verify: { status: 'in-progress', steps: [{ name: '进度确认', status: 'completed' }, { name: '对照设计检查', status: 'pending' }] },
  }
  await pm._write(root, progress, name)
  return { root, spec, name, pm }
}

test('legacyCompleteRetiredStage：一次写两态 + 幂等', async () => {
  const fx = await makeRepoWithVerifyInFlight()
  try {
    const r = fx.pm.legacyCompleteRetiredStage(fx.root, fx.name)
    assert.equal(r.applied, true, `应盖戳（实际 ${JSON.stringify(r)}）`)
    const after = fx.pm.read(fx.root, fx.name)
    assert.equal(after.stages.verify.status, 'completed', 'verify 行 completed')
    assert.ok(after.stages.verify.steps.every(s => s.status === 'completed'), 'verify 全步 completed')
    assert.equal(after.currentStage, 'archive', 'current_stage → archive')

    const again = fx.pm.legacyCompleteRetiredStage(fx.root, fx.name)
    assert.equal(again.applied, false, '二跑不重复写')
    assert.equal(again.reason, 'already-completed', '幂等理由')
  } finally { try { rmSync(fx.root, { recursive: true, force: true }) } catch { /* Windows */ } }
})

test('legacyCompleteRetiredStage：无 verify 行 → 不动（新变更零打扰）', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dlrs2-'))
  try {
    const pm = new ProgressManager({ specDir: join(root, '.sillyspec') })
    await pm.init(root)
    const name = '2026-11-02-fresh'
    await pm.initChange(root, name)
    await pm._write(root, { currentStage: 'execute', stages: { execute: { status: 'in-progress', steps: [] } } }, name)
    const r = pm.legacyCompleteRetiredStage(root, name)
    assert.equal(r.applied, false)
    assert.equal(r.reason, 'no-verify-stage-row')
  } finally { try { rmSync(root, { recursive: true, force: true }) } catch { /* Windows */ } }
})

test('doctor 维度：停在 verify 的活跃变更被点名 WARNING', async () => {
  const fx = await makeRepoWithVerifyInFlight('2026-11-03-stuck')
  try {
    const diag = await runDoctorDiagnostics({ cwd: fx.root })
    const dim = (diag.dimensions || []).find(d => d.name === 'retired-verify-in-flight')
    assert.ok(dim, '维度在场')
    assert.equal(dim.pass, false, '停在 verify → 不通过（点名）')
    assert.match(dim.findings.join(' '), /2026-11-03-stuck/)
    assert.match(dim.safe_actions.join(' '), /--legacy-complete-verify/)
  } finally { try { rmSync(fx.root, { recursive: true, force: true }) } catch { /* Windows */ } }
})

test('CLI 实弹：--legacy-complete-verify 默认 dry-run 不写盘', async () => {
  const fx = await makeRepoWithVerifyInFlight('2026-11-04-cli')
  try {
    const res = spawnSync(process.execPath, [CLI, 'doctor', '--legacy-complete-verify', '--change', '2026-11-04-cli'], {
      cwd: fx.root, encoding: 'utf8', timeout: 90_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' },
    })
    const out = (res.stdout || '') + (res.stderr || '')
    assert.match(out, /dry-run/, '输出 dry-run 提示')
    const prog = fx.pm.read(fx.root, '2026-11-04-cli')
    assert.equal(prog.stages.verify.status, 'in-progress', 'dry-run 未写盘')
    assert.ok(existsSync(join(fx.root, '.sillyspec')), 'spec 目录仍在')
  } finally { try { rmSync(fx.root, { recursive: true, force: true }) } catch { /* Windows */ } }
})
