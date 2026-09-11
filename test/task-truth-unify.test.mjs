/**
 * task 真源归一（P2-f，noai-ir-roadmap §5）：review.json verdict 是唯一真源，tasks.md
 * checkbox 是它的显示态——CLI 唯一勾选者。锁定：
 *   - autoCheckPlanFromReviews（review write 落盘即勾 / --done 兜底同函数）导出可调：
 *     marker + review.json pass → checkbox 勾上；fail 不勾；
 *   - prompt 契约：execute/verify 步骤 prompt 禁止「手动勾选」指引、声明 CLI 唯一勾选者。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import { autoCheckPlanFromReviews } from '../src/run/complete.js'
import { definition as verifyDef } from '../src/stages/verify.js'
import { readFileSync as rf } from 'fs'

function makeFixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'ttu-'))
  execSync('git init -q', { cwd })
  execSync('git config user.email t@t.local', { cwd })
  execSync('git config user.name t', { cwd })
  writeFileSync(join(cwd, 'README.md'), 'init\n')
  execSync('git add -A && git commit -qm init', { cwd })
  const specBase = join(cwd, '.sillyspec')
  return { cwd, specBase }
}

test('autoCheck：review pass 勾 / fail 不勾（真源 = review.json verdict）', async () => {
  const { cwd, specBase } = makeFixture()
  try {
    const changeDir = join(specBase, 'changes', 'c1')
    const rt = join(specBase, '.runtime')
    mkdirSync(join(changeDir, 'tasks'), { recursive: true })
    mkdirSync(join(rt, 'execute-runs', 'exec-2026-09-11-000000-x1', 'tasks', 'task-01'), { recursive: true })
    mkdirSync(join(rt, 'execute-runs', 'exec-2026-09-11-000000-x1', 'tasks', 'task-02'), { recursive: true })
    writeFileSync(join(rt, 'current-execute-run-id-c1'), 'exec-2026-09-11-000000-x1\n')
    writeFileSync(join(changeDir, 'tasks.md'), '# tasks\n\n- [ ] task-01: 甲\n- [ ] task-02: 乙\n')
    // task-01 pass（schemaVersion/verdicts 最小形）→ 勾；task-02 fail → 不勾
    writeFileSync(join(rt, 'execute-runs', 'exec-2026-09-11-000000-x1', 'tasks', 'task-01', 'review.json'),
      JSON.stringify({ schemaVersion: 1, task: 'task-01', base: 'a', head: 'b', changedFiles: ['src/a.js'], specVerdict: 'pass', qualityVerdict: 'pass' }))
    writeFileSync(join(rt, 'execute-runs', 'exec-2026-09-11-000000-x1', 'tasks', 'task-02', 'review.json'),
      JSON.stringify({ schemaVersion: 1, task: 'task-02', base: 'a', head: 'b', changedFiles: [], specVerdict: 'fail', qualityVerdict: 'fail' }))
    const r = await autoCheckPlanFromReviews({ stageName: 'execute', changeName: 'c1', cwd, platformOpts: {} })
    const after = readFileSync(join(changeDir, 'tasks.md'), 'utf8')
    assert.ok(/- \[x\] task-01/.test(after), 'pass → 勾选')
    assert.ok(/- \[ \] task-02/.test(after), 'fail → 不勾')
    assert.ok(r.autoChecked, 'autoChecked 置位')
  } finally { try { rmSync(cwd, { recursive: true, force: true }) } catch {} }
})

test('prompt 契约：verify 逐项检查步声明 CLI 唯一勾选者、无手动勾选指引', async () => {
  const step = verifyDef.steps.find(s => s.name === '逐项检查任务')
  assert.ok(step, '步骤在场')
  assert.ok(step.prompt.includes('勾选唯一写入者是 CLI'), '声明单写者')
  assert.ok(!step.prompt.includes('agent 按 review gate 手动勾'), '旧双路说明退役')
  // execute 的 task review 协议条目
  const { execSync: es } = await import('node:child_process')
  const src = rf(join(process.cwd(), 'src', 'stages', 'execute.js'), 'utf8')
  assert.ok(src.includes('禁止手动勾选 tasks.md 的 checkbox'), 'execute 协议：禁止手动勾选')
  assert.ok(!src.includes('才允许勾选 tasks.md 中对应任务的 checkbox'), '旧「先写 review 再允许勾」退役')
})
