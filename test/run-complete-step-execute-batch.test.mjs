/**
 * completeStep characterization — execute 批量完成（plan 全勾 + 代码核验通过 → 一次 --done 收尾）
 *
 * 锁住 completeStep 内 execute 批量完成分支（complete.js detectExecuteBatchFinish +
 * autoCheckPlanFromReviews 复用）：
 *   - happy：plan.md 全勾 + 主工作区有未提交改动（checkExecuteCodeEvidence→changed）+
 *     多个 pending execute step → 一次 --done 把剩余 step 批量标 completed，阶段完成
 *     （stageCompleted:true, nextPendingIdx:-1）。治"3 Wave 做完仍逐次 +1、需重走 7 次 --done"。
 *   - 拒绝批量：plan 未全勾 → 不批量，仅当前 step completed，仍 nextPendingIdx 指向下一 pending。
 *   - 拒绝批量：plan 全勾但代码零变更（unchanged）→ 不批量（防手动勾选伪造空完成）。
 *
 * deps gate 绕过：写 worktree meta.json depsStatus:'n/a' 让 enforceDepsGate 放行，
 * 且不含 baseHash 使 checkExecuteCodeEvidence 走路径 3（主工作区未提交改动）。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { _completeStepForTest } from '../src/run.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

// execute 步骤：前 8 个静态步 + Wave 1 执行 + 完成确认。种子为"除当前步外其余 pending"。
const EXEC_STEPS = [
  '状态检查', '加载上下文', '确认 worktree 路径', '确认执行范围',
  '对照设计检查', '运行测试', '代码审查', '知识库审阅',
  'Wave 1 执行', '完成确认',
]
function executeStepsWithCurrentAtPending(currentIdx) {
  return EXEC_STEPS.map((name, i) => ({
    name,
    status: i < currentIdx ? 'completed' : (i === currentIdx ? 'pending' : 'pending'),
  }))
}

function writePlanAllChecked(changeDir) {
  writeFileSync(join(changeDir, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n- [x] task-02: b\n- [x] task-03: c\n', 'utf8')
}
function writePlanPartial(changeDir) {
  writeFileSync(join(changeDir, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n- [x] task-02: b\n- [ ] task-03: c\n', 'utf8')
}
// 让 enforceDepsGate 放行 + checkExecuteCodeEvidence 走路径 3：meta 有 depsStatus:'n/a' 但无 baseHash
function writeWorktreeMeta(specBase, changeName, { withBaseHash = false } = {}) {
  const dir = join(specBase, '.runtime', 'worktrees', changeName)
  mkdirSync(dir, { recursive: true })
  const meta = { depsStatus: 'n/a', mode: 'in-place-fallback' }
  if (withBaseHash) meta.baseHash = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta), 'utf8')
}
// 写 execute run-id marker + 各 task 的 pass review.json，让 Task Review Gate 放行 + plan auto-check 命中。
const FIXED_RUN_ID = 'exec-2026-07-25-100000'
function writePassingTaskReviews(specBase, changeName, gitHead) {
  const runtimeRoot = join(specBase, '.runtime')
  const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
  writeFileSync(runIdFile, FIXED_RUN_ID, 'utf8')
  const tasksDir = join(runtimeRoot, 'execute-runs', FIXED_RUN_ID, 'tasks')
  for (const taskNum of ['01', '02', '03']) {
    const dir = join(tasksDir, `task-${taskNum}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'review.json'), JSON.stringify({
      schemaVersion: 1, task: `task-${taskNum}`,
      base: gitHead,
      head: gitHead,
      // changedFiles 空数组：跳过交叉比对（verifyReviewGitEvidence 在 base=head、working-tree 有改动时
      // 单独判空 diff，warning 不阻断）；真实场景应填交了 diff 的 base..head，此处简化。
      changedFiles: [],
      specVerdict: 'pass', qualityVerdict: 'pass',
      reviewerNotes: 'test review', requiredEvidence: [],
    }), 'utf8')
  }
}

console.log('=== completeStep characterization: execute 批量完成 ===\n')

// ── Case 1: plan 全勾 + 主工作区有未提交改动 → 一次 --done 批量完成 ──
console.log('--- plan 全勾 + 代码未提交改动 → 批量完成剩余 step ---')
{
  const { cwd, specBase } = makeRepo('cs-exec-batch-ok-')
  // WorktreeManager._resolveMainRepoRoot 对裸 init repo 的 `git-common-dir`(=.git) 取 dirname 得 '.',
  // 解析相对进程 cwd。只有 chdir 到临时仓库，enforceDepsGate 内 new WorktreeManager({cwd}) 的
  // worktreeBase 才落到临时仓库的 .sillyspec/.runtime/worktrees（而非真实仓库）。
  process.chdir(cwd)
  const cn = '2026-07-25-exec-batch-ok'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writePlanAllChecked(changeDir)
  writeWorktreeMeta(specBase, cn)
  // 主工作区放一个未提交源码文件 → checkExecuteCodeEvidence 路径 3 changed
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'app.js'), 'module.exports = 1\n')
  // 真实 HEAD 给 review.json 的 base/head（verifyReviewGitEvidence 要求真实 commit）
  const { execFileSync } = await import('node:child_process')
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
  writePassingTaskReviews(specBase, cn, head)
  // 当前 step 在 idx 4（"对照设计检查"），其后还有 5 个 pending
  const currentIdx = 4
  const progress = await seedStage(pm, cwd, cn, 'execute', executeStepsWithCurrentAtPending(currentIdx))

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'execute', cwd, 'step done', null,
      { changeName: cn, printNext: false }))

  assert(!r.error, `批量完成不应 process.exit（error=${r.error?.message}）`)
  assert(r.result && r.result.stageCompleted === true, 'stageCompleted:true（一次 --done 收尾）')
  assert(r.result && r.result.nextPendingIdx === -1, 'nextPendingIdx:-1（无剩余 pending）')
  assert(r.stdout.includes('批量完成'), `stdout 含「批量完成」提示（实际 stdout 片段：${r.stdout.slice(0, 200)}）`)

  const after = await pm.read(cwd, cn)
  assert(after.stages.execute.status === 'completed', 'DB: execute stage status=completed')
  assert(after.stages.execute.steps.every(s => s.status === 'completed'),
    'DB: 所有 execute step status=completed（含原本 pending 的后续 5 步）')
}

// ── Case 2: plan 未全勾 → 不批量，仅当前 step completed，nextPendingIdx 指向下一 pending ──
console.log('\n--- plan 未全勾 → 不批量，单步推进 ---')
{
  const { cwd, specBase } = makeRepo('cs-exec-batch-partial-')
  process.chdir(cwd)
  const cn = '2026-07-25-exec-batch-partial'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writePlanPartial(changeDir)
  writeWorktreeMeta(specBase, cn)
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'app.js'), 'module.exports = 1\n')
  const currentIdx = 4
  const progress = await seedStage(pm, cwd, cn, 'execute', executeStepsWithCurrentAtPending(currentIdx))

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'execute', cwd, 'step done', null,
      { changeName: cn, printNext: false }))

  assert(!r.error, `plan 未全勾不应 process.exit（error=${r.error?.message}）`)
  assert(r.result && r.result.stageCompleted === false, 'stageCompleted:false（未批量收尾）')
  assert(r.result && typeof r.result.nextPendingIdx === 'number' && r.result.nextPendingIdx > currentIdx,
    `nextPendingIdx 仍指向下一 pending（> ${currentIdx}，实际 ${r.result?.nextPendingIdx}）`)
  assert(!r.stdout.includes('批量完成'), 'stdout 不含「批量完成」（条件不满足）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.execute.status !== 'completed', 'DB: execute 未完成')
  assert(after.stages.execute.steps[currentIdx].status === 'completed', 'DB: 当前 step 已 completed')
  assert(after.stages.execute.steps.some(s => s.status === 'pending'), 'DB: 仍有 pending step（未批量）')
}

// ── Case 3: plan 全勾但代码零变更（unchanged）→ 不批量（防伪造）──
console.log('\n--- plan 全勾 + 代码零变更（baseHash 对账无 diff）→ 不批量 ---')
{
  const { cwd, specBase } = makeRepo('cs-exec-batch-unchanged-')
  process.chdir(cwd)
  const cn = '2026-07-25-exec-batch-unchanged'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writePlanAllChecked(changeDir)
  // baseHash 指向当前 HEAD 且主工作区干净 → checkExecuteCodeEvidence 路径 1 unchanged
  const { execFileSync } = await import('node:child_process')
  const realHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim()
  const metaDir = join(specBase, '.runtime', 'worktrees', cn)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'),
    JSON.stringify({ depsStatus: 'n/a', mode: 'in-place-fallback', baseHash: realHead }), 'utf8')
  const currentIdx = 4
  const progress = await seedStage(pm, cwd, cn, 'execute', executeStepsWithCurrentAtPending(currentIdx))

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'execute', cwd, 'step done', null,
      { changeName: cn, printNext: false }))

  assert(!r.error, `代码零变更不应 process.exit（error=${r.error?.message}）`)
  assert(r.result && r.result.stageCompleted === false, 'stageCompleted:false（代码零变更不批量）')
  assert(!r.stdout.includes('批量完成'), 'stdout 不含「批量完成」（代码 zero-change 防伪造）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.execute.status !== 'completed', 'DB: execute 未完成（拒绝空完成）')
  assert(after.stages.execute.steps.some(s => s.status === 'pending'), 'DB: 仍有 pending step')
}

cleanup()
report(count.passed, count.failed, count.failures)