/**
 * execute 阶段批量完成 CLI 行为测试（run execute --done）。
 *
 * 从 _completeStepForTest 内部函数迁移为 CLI 子进程测试。锁住 execute 批量完成分支：
 *   - happy：plan 全勾 + 主工作区未提交改动（checkExecuteCodeEvidence→changed）+ 多个 pending step
 *     → 一次 --done 批量标 completed，阶段完成（治"3 Wave 做完仍逐次 +1、需重走多次 --done"）
 *   - 拒绝批量：plan 未全勾 → 仅当前 step completed，仍有 pending
 *   - 拒绝批量：plan 全勾但代码零变更（unchanged）→ 不批量（防手动勾选伪造空完成）
 *
 * execute 步骤随 plan.md 动态生成（buildExecuteSteps），用 seed-real-steps：init 后读真实步骤，
 * 前 4 步 completed + Wave 1 执行(idx4) pending。deps gate 绕过：写 worktree meta depsStatus:'n/a'。
 * Task Review Gate 放行：写各 task pass review.json + runId marker。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

function writePlan(changeDir, allChecked) {
  const t3 = allChecked ? '[x]' : '[ ]'
  writeFileSync(join(changeDir, 'plan.md'),
    `# Plan\n\n## Wave 1\n\n- [x] task-01: a\n- [x] task-02: b\n- ${t3} task-03: c\n`, 'utf8')
}
// worktree meta：depsStatus:'n/a' 让 enforceDepsGate 放行；无 baseHash → code evidence 走路径 3（working tree）
function writeWorktreeMeta(specBase, cn, baseHash) {
  const dir = join(specBase, '.runtime', 'worktrees', cn)
  mkdirSync(dir, { recursive: true })
  const meta = { depsStatus: 'n/a', mode: 'in-place-fallback' }
  if (baseHash) meta.baseHash = baseHash
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta), 'utf8')
}
const FIXED_RUN_ID = 'exec-2026-07-25-100000'
// taskNums：写哪些 task 的 pass review。省略某 task → 它不会被 autoCheckPlanFromReviews 自动勾选。
function writePassingTaskReviews(specBase, cn, gitHead, taskNums = ['01', '02', '03']) {
  const runtimeRoot = join(specBase, '.runtime')
  writeFileSync(join(runtimeRoot, `current-execute-run-id-${cn}`), FIXED_RUN_ID, 'utf8')
  const tasksDir = join(runtimeRoot, 'execute-runs', FIXED_RUN_ID, 'tasks')
  for (const taskNum of taskNums) {
    const dir = join(tasksDir, `task-${taskNum}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'review.json'), JSON.stringify({
      schemaVersion: 1, task: `task-${taskNum}`, base: gitHead, head: gitHead,
      changedFiles: [], specVerdict: 'pass', qualityVerdict: 'pass', reviewerNotes: 't', requiredEvidence: [],
    }), 'utf8')
  }
}

// init execute + seed 前 N 步 completed、Wave 1 执行 pending。pm 由调用方先 initChange 建好。
async function seedExecuteToWave(pm, cwd, cn) {
  runCLI(['--dir', cwd, 'run', 'execute', '--change', cn], { cwd })
  const realSteps = (await pm.read(cwd, cn)).stages.execute.steps
  const waveIdx = realSteps.findIndex(s => s.name.includes('Wave 1 执行'))
  await seedStage(pm, cwd, cn, 'execute',
    realSteps.map((s, i) => ({ name: s.name, status: i < waveIdx ? 'completed' : 'pending' })))
  return { waveIdx }
}

console.log('=== execute 批量完成 CLI 行为 ===\n')

// ── Case 1: plan 全勾 + 主工作区未提交改动 → 一次 --done 批量完成 ──
console.log('--- plan 全勾 + 代码未提交改动 → 批量完成剩余 step ---')
{
  const { cwd, specBase } = makeRepo('cli-exec-batch-ok-')
  const cn = '2026-07-25-exec-batch-ok'
  const pm = await initChange(cwd, specBase, cn)
  writePlan(join(specBase, 'changes', cn), true)
  writeWorktreeMeta(specBase, cn)  // 无 baseHash → code evidence path 3
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'app.js'), 'module.exports = 1\n')  // 未提交改动 → changed
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
  writePassingTaskReviews(specBase, cn, head)
  await seedExecuteToWave(pm, cwd, cn)

  const r = runStage('execute', cn, cwd, { done: true, output: 'step done' })

  assert(r.status === 0, `exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-100)}）`)
  assert(r.combined.includes('批量完成'), 'stdout 含「批量完成」提示')

  const after = await pm.read(cwd, cn)
  assert(after.stages.execute.status === 'completed', 'DB: execute stage status=completed')
  assert(after.stages.execute.steps.every(s => s.status === 'completed'),
    'DB: 所有 execute step status=completed（含原本 pending 的后续步）')
}

// ── Case 2: plan 未全勾 → 不批量，仅当前 step completed，仍有 pending ──
console.log('\n--- plan 未全勾 → 不批量，单步推进 ---')
{
  const { cwd, specBase } = makeRepo('cli-exec-batch-partial-')
  const cn = '2026-07-25-exec-batch-partial'
  const pm = await initChange(cwd, specBase, cn)
  writePlan(join(specBase, 'changes', cn), false)
  writeWorktreeMeta(specBase, cn)
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'app.js'), 'module.exports = 1\n')
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
  // 只写 task-01/02 的 pass review（task-03 无 review → 不被 autoCheck 自动勾选 → plan 未全勾）
  writePassingTaskReviews(specBase, cn, head, ['01', '02'])
  const { waveIdx } = await seedExecuteToWave(pm, cwd, cn)

  const r = runStage('execute', cn, cwd, { done: true, output: 'step done' })

  // 批量未触发：stdout 含「条件不满足」类提示（非「一次 --done 批量完成」成功语）
  assert(r.combined.includes('条件不满足') || r.combined.includes('未勾') || !r.combined.includes('一次 --done 批量完成'),
    'stdout 反映批量条件不满足（plan 未全勾）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.execute.status !== 'completed', 'DB: execute 未完成')
  assert(after.stages.execute.steps[waveIdx].status === 'completed', 'DB: Wave 1 步已 completed')
  assert(after.stages.execute.steps.some(s => s.status === 'pending'), 'DB: 仍有 pending step（未批量）')
}

// ── Case 3: plan 全勾但代码零变更（unchanged）→ 不批量（防伪造）──
console.log('\n--- plan 全勾 + 代码零变更（baseHash=HEAD + 干净工作树）→ 不批量 ---')
{
  const { cwd, specBase } = makeRepo('cli-exec-batch-unchanged-')
  const cn = '2026-07-25-exec-batch-unchanged'
  const pm = await initChange(cwd, specBase, cn)
  writePlan(join(specBase, 'changes', cn), true)
  const realHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
  // baseHash=HEAD + 不放未提交文件 → 工作树干净 → code evidence path 1 unchanged
  writeWorktreeMeta(specBase, cn, realHead)
  writePassingTaskReviews(specBase, cn, realHead)
  await seedExecuteToWave(pm, cwd, cn)

  const r = runStage('execute', cn, cwd, { done: true, output: 'step done' })

  assert(!r.combined.includes('批量完成'), 'stdout 不含「批量完成」（代码 zero-change 防伪造）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.execute.status !== 'completed', 'DB: execute 未完成（拒绝空完成）')
  assert(after.stages.execute.steps.some(s => s.status === 'pending'), 'DB: 仍有 pending step')
}

cleanup()
report(count.passed, count.failed, count.failures)
