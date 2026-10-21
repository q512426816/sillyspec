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
    mkdirSync(join(rt, 'state'), { recursive: true })
    writeFileSync(join(rt, 'state', `current-stage-review-run-id-${stage}-c1`), 'review-run1')
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

test('H1b 默认档 verify 不产 hint（期望面对齐：Gate 只拦 brainstorm/plan/execute）', async () => {
  // 坑 stage-review-verify-enum-gap（2026-10-11）：verify 的 hint 给出的修复命令
  // register-stage-review --stage verify 在枚举校验处必炸，且指称的门禁不存在——期望面收敛。
  const { cwd, specBase, changeName } = await fixture({ withReview: false, stage: 'verify' })
  const v = await runGate('verify', changeName, { cwd, specBase })
  assert.equal(checkById(v.envelope, 'stage-review-hint'), undefined, 'verify 默认档无 stage-review-hint（提示命令不可执行，不再误导）')
})

test('H2 --full 档 full-stage-review 的 id 与 error 语义不变', async () => {
  const { cwd, specBase, changeName } = await fixture({ withReview: false })
  const f = await runGate('execute', changeName, { cwd, specBase, full: true })
  const full = checkById(f.envelope, 'full-stage-review')
  assert.ok(full, 'full-stage-review 检查在场（id 不变）')
  assert.equal(full.informational, undefined, '非 informational（error 语义）')
  assert.equal(full.ok, false, '缺 review → error（--done 将拦）')
})

test('H1c 默认档 brainstorm/plan 产 hint 且文案按 stage 参数化（2026-10-21-p0-p1-hardening FR-04 扩面——dsh z1 实证 brainstorm 收口被伏击 46 分钟）', async () => {
  for (const st of ['brainstorm', 'plan']) {
    const { cwd, specBase, changeName } = await fixture({ withReview: false, stage: st })
    const g = await runGate(st, changeName, { cwd, specBase })
    const hint = checkById(g.envelope, 'stage-review-hint')
    assert.ok(hint, `${st} 默认档 stage-review-hint 在场`)
    assert.equal(hint.informational, true, `${st} informational（不改变 gate 结论）`)
    assert.ok((hint.warnings || []).some((w) => w.includes(`${st} --done`)), `${st} 文案按 stage 参数化：${hint.warnings}`)
    assert.ok((hint.warnings || []).some((w) => w.includes('register-stage-review')), `${st} warning 含 register 指引`)
    assert.ok(!(hint.warnings || []).some((w) => w.includes('execute --done')), `${st} 文案不写死 execute`)
  }
})

test('H2b --full 档 brainstorm/plan 的 full-stage-review 在场（与 gates.js 拦截面三阶段对齐）', async () => {
  for (const st of ['brainstorm', 'plan']) {
    const { cwd, specBase, changeName } = await fixture({ withReview: false, stage: st })
    const f = await runGate(st, changeName, { cwd, specBase, full: true })
    const chk = checkById(f.envelope, 'full-stage-review')
    assert.ok(chk, `${st} --full 档探测在场`)
    assert.equal(chk.ok, false, `${st} 缺 review → error 语义（--done 将拦）`)
    assert.ok((chk.errors || []).some((e) => e.includes(`${st} --done`) && e.includes('register-stage-review')), `${st} 错误文案按 stage 参数化：${chk.errors}`)
  }
  // review 在场 → --full 探测静默 ok（brainstorm 形态）
  const present = await fixture({ withReview: true, stage: 'brainstorm' })
  const fp = await runGate('brainstorm', present.changeName, { cwd: present.cwd, specBase: present.specBase, full: true })
  const chkP = checkById(fp.envelope, 'full-stage-review')
  assert.ok(chkP && chkP.ok === true, 'review 在场 → --full 探测 ok 零 error')
})
