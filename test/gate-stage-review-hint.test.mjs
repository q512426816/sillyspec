/**
 * 2026-10-07-flow-friction-batch3 — gate 默认档 stage-review 提示回归
 *
 * postmortem（sess_4769fd5d / provider-model-list）：gate execute 默认档不含 Stage Review 检查
 * （在 --full 档），agent 跑 gate 见 ok、--done 却被 Stage Review Gate 拦。锁死契约：
 *   H1 默认档（execute/verify）：缺 review.json → informational 'stage-review-hint' 检查 + warning
 *      含 register-stage-review 指引；在场 → 静默 ok。
 *   H2 --full 档 'full-stage-review' 的 id 与 error 语义不变（默认档独立 id 不碰撞）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runGate } from '../src/machine-interface.js'
import { ProgressManager } from '../src/progress.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })

async function fixture({ withReview = false, stage = 'execute' } = {}) {
  const proj = mk('srhint-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'main.js'), 'console.log(1)\n')
  git(proj, ['init', '-q']); git(proj, ['add', '.']); git(proj, ['commit', '-qm', 'init'])
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(proj)
  await pm.initChange(proj, 'c1')
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '---\nplan_level: full\n---\n\n# 计划\n\n## Wave 1\n- task-01\n')
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: t\n')
  if (withReview) {
    const rt = join(specBase, '.runtime')
    mkdirSync(join(rt, 'stage-reviews', `${stage}-review-run1`), { recursive: true })
    writeFileSync(join(rt, 'stage-reviews', `${stage}-review-run1`, 'review.json'), JSON.stringify({
      schemaVersion: 1, reviewType: 'acceptance', specVerdict: 'pass', qualityVerdict: 'pass',
      reviewedFiles: ['changes/c1/design.md'], docHash: 'deadbeef', requiredEvidence: [],
      reviewer: { channel: 'main-agent-self-review' }, reviewerNotes: 'fixture',
    }))
    writeFileSync(join(rt, `current-stage-review-run-id-${stage}-c1`), 'review-run1')
  }
  return { cwd: proj, specBase, changeName: 'c1' }
}

const checkById = (envelope, id) => (envelope.checks || []).find(c => c.id === id)

test('H1 默认档：缺 review → stage-review-hint informational + register 指引；在场 → 静默 ok', async () => {
  const missing = await fixture({ withReview: false })
  const m = await runGate('execute', missing.changeName, { cwd: missing.cwd, specBase: missing.specBase })
  const hint = checkById(m.envelope, 'stage-review-hint')
  assert.ok(hint, '默认档 stage-review-hint 检查在场')
  assert.equal(hint.informational, true, 'informational（不改变 gate 结论）')
  assert.equal(hint.ok, true, 'ok=true（提示不拦截）')
  assert.ok((hint.warnings || []).some(w => w.includes('register-stage-review')), `warning 含 register 指引：${hint.warnings}`)

  const present = await fixture({ withReview: true })
  const p = await runGate('execute', present.changeName, { cwd: present.cwd, specBase: present.specBase })
  const hint2 = checkById(p.envelope, 'stage-review-hint')
  assert.ok(hint2, '检查在场')
  assert.deepEqual(hint2.warnings || [], [], 'review 在场 → 静默零 warning')
})

test('H1b 默认档 verify 同款提示', async () => {
  const { cwd, specBase, changeName } = await fixture({ withReview: false, stage: 'verify' })
  const v = await runGate('verify', changeName, { cwd, specBase })
  assert.ok(checkById(v.envelope, 'stage-review-hint'), 'verify 默认档同样有提示')
})

test('H2 --full 档 full-stage-review 的 id 与 error 语义不变', async () => {
  const { cwd, specBase, changeName } = await fixture({ withReview: false })
  const f = await runGate('execute', changeName, { cwd, specBase, full: true })
  const full = checkById(f.envelope, 'full-stage-review')
  assert.ok(full, 'full-stage-review 检查在场（id 不变）')
  assert.equal(full.informational, undefined, '非 informational（error 语义）')
  assert.equal(full.ok, false, '缺 review → error（--done 将拦）')
})
