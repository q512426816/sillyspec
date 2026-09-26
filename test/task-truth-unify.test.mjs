/**
 * task 真源归一（P2-f）历史行为锁 + 勾选语义迁移钉（2026-09-26-task-review-retire）：
 *   - autoCheckPlanFromReviews（review write 落盘即勾 / --done 兜底同函数）导出可调（兼容读侧
 *     保留：历史变更残存 review.json 仍可被 review-write 钩子/task-done 消费）；
 *   - prompt 契约（退役后新语义）：勾选回归 agent 手动（完成=实现+测试绿+wt-commit 即勾），
 *     旧「CLI 唯一勾选者/禁止手动勾选」声明随 Task Review 层退役。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { autoCheckPlanFromReviews } from '../src/run/complete.js'
import { definition as verifyDef } from '../src/stages/verify.js'
import { readFileSync as rf } from 'fs'

const ROOT_ttu = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')

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

test('prompt 契约：勾选回归 agent 手动（2026-09-26 Task Review 退役），旧 CLI 单写者声明退役', async () => {
  const step = verifyDef.steps.find(s => s.name === '逐项检查任务')
  assert.ok(step, '步骤在场')
  assert.ok(step.prompt.includes('勾选由 agent 在任务完成（实现+测试绿+wt-commit）时手动写入'), '声明手动勾选语义')
  assert.ok(!step.prompt.includes('勾选唯一写入者是 CLI'), '旧「CLI 唯一勾选者」声明退役（autoCheck 勾选层已退役）')
  // execute 的勾选协议：手动勾在位、禁止手勾旧句退役
  const src = rf(join(ROOT_ttu, 'src', 'stages', 'execute.js'), 'utf8')
  assert.ok(src.includes('手动勾选 tasks.md 对应 checkbox'), 'execute 协议：手动勾选指引在位')
  assert.ok(!src.includes('禁止手动勾选 tasks.md 的 checkbox'), '旧「禁止手动勾选」协议退役')
})
