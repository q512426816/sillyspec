/**
 * P1 gate --full 只读预检档（2026-09-21-r5-efficiency-batch3 task-03，FR-01 / D-002@v1）
 *
 * 锁死契约（batch2 实证四类 --done 盲区中的两类主犯：reconcile×2 + stage review 缺失）：
 * F1 verify --full：task 卡声明未交付 → full-target-files-reconcile ok=false（同回合暴露）
 * F2 verify --full：无 stage review → full-stage-review ok=false（含指引文案）
 * F3 默认档：envelope.checks 无 full-* 条目（零行为变化钉）
 * F4 就绪态：交付在场 + review 在场 → 两 full 检查 ok；execute --full 亦有 stage-review 检查
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

async function fixture({ declareMissing = true, deliverFile = false, withReview = false, reviewStage = 'verify' } = {}) {
  const proj = mk('fullgate-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'main.js'), 'console.log(1)\n')
  git(proj, ['init', '-q']); git(proj, ['add', '.']); git(proj, ['commit', '-qm', 'init'])
  const baseHash = git(proj, ['rev-parse', 'HEAD']).trim()
  const wtMeta = join(specBase, '.runtime', 'worktrees', 'c1')
  mkdirSync(wtMeta, { recursive: true })
  writeFileSync(join(wtMeta, 'meta.json'), JSON.stringify({ changeName: 'c1', baseHash, mode: 'in-place-fallback', worktreePath: proj }))
  if (deliverFile) writeFileSync(join(proj, 'src-deliv.js'), 'export const ok = 1\n')

  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(proj)
  await pm.initChange(proj, 'c1')

  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  mkdirSync(join(changeDir, 'src-work'), { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '---\nplan_level: full\n---\n\n# 计划\n\n## Wave 1\n- task-01\n')
  writeFileSync(join(changeDir, 'tasks.md'), '- [x] task-01: t\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '---', 'id: task-01', 'title: t', 'title_zh: t', 'author: t',
    'created_at: 2026-09-21 00:00:00', 'priority: P0', 'depends_on: []', 'blocks: []',
    'requirement_ids: [FR-1]', 'decision_ids: []', 'allowed_paths:', '  - src-deliv.js',
    'target_files:', ...(declareMissing ? ['  - src-deliv.js'] : []),
    'goal: >', '  g', 'implementation:', '  - i', 'acceptance:', '  - a',
    'verify:', '  - node --version', 'constraints:', '  - c', '---', '',
  ].join('\n'))

  if (withReview) {
    const rt = join(specBase, '.runtime')
    mkdirSync(join(rt, 'stage-reviews', `${reviewStage}-review-run1`), { recursive: true })
    writeFileSync(join(rt, 'stage-reviews', `${reviewStage}-review-run1`, 'review.json'), JSON.stringify({
      schemaVersion: 1, reviewType: 'acceptance', specVerdict: 'pass', qualityVerdict: 'pass',
      reviewedFiles: [`changes/c1/design.md`], docHash: 'deadbeef', requiredEvidence: [],
      reviewer: { channel: 'main-agent-self-review' }, reviewerNotes: 'fixture',
    }))
    writeFileSync(join(rt, `current-stage-review-run-id-${reviewStage}-c1`), 'review-run1')
  }
  return { cwd: proj, specBase, changeName: 'c1' }
}

const checkById = (envelope, id) => (envelope.checks || []).find(c => c.id === id)

test('F1+F2 verify --full：声明未交付→reconcile 红；无 review→stage-review 红（同回合双报）', async () => {
  const { cwd, specBase, changeName } = await fixture({ declareMissing: true, deliverFile: false, withReview: false })
  const { envelope } = await runGate('verify', changeName, { cwd, specBase, full: true })
  const rec = checkById(envelope, 'full-target-files-reconcile')
  const sr = checkById(envelope, 'full-stage-review')
  assert.ok(rec, 'F1: full-target-files-reconcile 检查在场')
  assert.equal(rec.ok, false, 'F1: 声明未交付 → reconcile 红（--done 同因将拦，预检同回合暴露）')
  assert.ok((rec.errors || []).some(e => e.includes('src-deliv.js')), 'F1: 错误点名缺交付文件')
  assert.ok(sr, 'F2: full-stage-review 检查在场')
  assert.equal(sr.ok, false, 'F2: 无 review → stage-review 红')
  assert.ok((sr.errors || []).some(e => e.includes('register-stage-review')), 'F2: 错误含生成骨架指引')
})

test('F3 默认档：无 --full → envelope.checks 无 full-* 条目（零行为变化钉）', async () => {
  const { cwd, specBase, changeName } = await fixture({})
  const { envelope } = await runGate('verify', changeName, { cwd, specBase })
  assert.ok(!(envelope.checks || []).some(c => String(c.id).startsWith('full-')), 'F3: 默认档零 full-* 检查')
})

test('F4 就绪态：交付在场+review 在场 → 双 full 检查 ok；execute --full 含 stage-review', async () => {
  const { cwd, specBase, changeName } = await fixture({ declareMissing: true, deliverFile: true, withReview: true })
  const v = await runGate('verify', changeName, { cwd, specBase, full: true })
  const rec = checkById(v.envelope, 'full-target-files-reconcile')
  const sr = checkById(v.envelope, 'full-stage-review')
  assert.equal(rec && rec.ok, true, 'F4: 交付在场（porcelain 未跟踪文件）→ reconcile ok')
  assert.equal(sr && sr.ok, true, 'F4: review 在场（marker+review.json）→ stage-review ok')

  const e = await runGate('execute', changeName, { cwd, specBase, full: true })
  const esr = checkById(e.envelope, 'full-stage-review')
  assert.ok(esr && esr.ok === false || esr, 'F4: execute --full 亦有 stage-review 检查（verify 态 review 不属于 execute——不 ok 属预期，检查在场即钉）')
})
