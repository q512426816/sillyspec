/**
 * ---
 * author: qinyi
 * created_at: 2026-08-16 16:40:00
 * ---
 *
 * 状态机守卫回归测试（子进程驱动 CLI，覆盖 FR-01..FR-05 / 8b）。
 *
 * 依据：change 2026-08-16-state-machine-fail-open design.md（Phase 1-6）+ task-05.md。
 * 用 CLI 子进程（node bin/sillyspec.js run <stage> ...）断言进程级行为（exitCode / stdout），
 * 进度库中间态用 ProgressManager 注入（与 run-complete-step-*.test.mjs 同款模式）。
 *
 * 覆盖场景：
 *   1. FR-02  --done 转换守卫：currentStage=brainstorm 直跑 verify --done → exit 1；
 *              同阶段 brainstorm --done → 放行 exit 0。
 *   2. FR-03  auxiliary 不写 currentStage：brainstorm 启动后跑 status（只读短路路径）与
 *              explore（runStage 写路径）→ currentStage 保持 brainstorm。
 *   3. FR-04/8b status 查询零副作用：空 fixture run status → exit 0 + 不建 changes/default/。
 *   4. FR-01  gate 失败 fail-closed：brainstorm 末步 --done 缺产物 → validator 失败 → exit 1
 *              + 回滚 in-progress 不落假 completed。
 *   5. FR-05  brainstorm auto-create gating：多活跃变更无 --change → exit 2 不建幽灵变更；
 *              0 活跃变更空 fixture → auto-create。
 *
 * 隔离：全部 CLI 调用带 --spec-dir <specBase> 钉死（memory: between-run 清 .sillyspec 撞
 * 文件锁，用独立 temp spec-dir）。--spec-dir 会触发 command.js:361 平台残留清理段
 * （cleanupRuntimeResidue 删 .runtime/ 非 RUNTIME_KEEP 产物），测试 fixture 预写
 * .sillyspec-platform-cleaned marker 显式跳过。
 */
import { writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'
import { definition as brainstormDef } from '../src/stages/brainstorm.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

// 钉死 spec-dir 隔离：--spec-dir <specBase> 让 CLI 读写独立 temp 进度库，不撞 cwd 上溯/home
function runStageSpec(stage, changeName, cwd, specBase, opts = {}) {
  const args = ['--dir', cwd, 'run', stage, '--spec-dir', specBase]
  if (changeName) args.push('--change', changeName)
  if (opts.done) { args.push('--done'); if (opts.output != null) args.push('--output', opts.output) }
  if (opts.answer != null) args.push('--answer', opts.answer)
  return runCLI(args, { cwd, timeout: opts.timeout || 60000 })
}

// --spec-dir 触发 command.js:361 平台残留清理段（cleanupRuntimeResidue 删 .runtime/ 非
// RUNTIME_KEEP 产物）。marker 预写 → 该段整体跳过，测试对 runtime 产物零破坏。
function pinSpecDir(cwd) {
  writeFileSync(join(cwd, '.sillyspec-platform-cleaned'), new Date().toISOString() + '\n')
}

function readProgress(specBase, cwd, changeName) {
  return new ProgressManager({ specDir: specBase }).read(cwd, changeName)
}

console.log('=== 状态机守卫（FR-01..FR-05）===')
console.log('=== 1. FR-02: --done 与 run 同源转换守卫 ===\n')

// ── 1a. 未合法到达的阶段：currentStage=brainstorm 直跑 verify --done → exit 1 ──
console.log('--- 1a. brainstorm 态直跑 verify --done → exit(1) 拦截 ---')
{
  const { cwd, specBase } = makeRepo('guards-fr02-blocked-')
  pinSpecDir(cwd)
  const changeName = '2026-08-16-fr02-blocked'
  const pm = await initChange(cwd, specBase, changeName)
  let progress = await pm.read(cwd, changeName)
  progress.currentStage = 'brainstorm'
  await pm._write(cwd, progress, changeName)

  const r = runStageSpec('verify', changeName, cwd, specBase, { done: true, output: 'x' })

  assert(r.status === 1, `verify --done 从 brainstorm 态被拦 exit(1)（实际 ${r.status}，尾：${r.combined.slice(-100)}）`)
  assert(r.combined.includes('阶段转换不允许'), 'stdout 含「阶段转换不允许」')
  assert(r.combined.includes('前置阶段'), 'stdout 含「前置阶段」（reason 点名前置链）')
  const after = await readProgress(specBase, cwd, changeName)
  assert(after.currentStage === 'brainstorm', 'DB: currentStage 仍 brainstorm（未被 --done 推进）')
  const vSteps = after.stages.verify?.steps || []
  assert(vSteps.length > 0 && vSteps.every(s => s.status !== 'completed'), 'DB: verify 无任何 completed 步骤（守卫在 completeStep 之前拦截）')
}

// ── 1b. 合法同阶段 --done：currentStage=brainstorm 跑 brainstorm --done → 放行 exit 0 ──
console.log('\n--- 1b. 同阶段 brainstorm --done → 放行 exit(0) ---')
{
  const { cwd, specBase } = makeRepo('guards-fr02-legal-')
  pinSpecDir(cwd)
  const changeName = '2026-08-16-fr02-legal'
  const pm = await initChange(cwd, specBase, changeName)
  let progress = await pm.read(cwd, changeName)
  progress.currentStage = 'brainstorm'
  await pm._write(cwd, progress, changeName)

  const r = runStageSpec('brainstorm', changeName, cwd, specBase, { done: true, output: 'x' })

  assert(r.status === 0, `同阶段 brainstorm --done 放行 exit(0)（实际 ${r.status}，尾：${r.combined.slice(-100)}）`)
  const after = await readProgress(specBase, cwd, changeName)
  assert(after.stages.brainstorm.steps[0]?.status === 'completed', 'DB: brainstorm step1 已 completed（放行推进）')
}

// ── 2. FR-03: auxiliary 阶段不写 currentStage ──
console.log('\n=== 2. FR-03: auxiliary 阶段不写 currentStage ===\n')
{
  const { cwd, specBase } = makeRepo('guards-fr03-')
  pinSpecDir(cwd)
  const changeName = '2026-08-16-fr03'
  const pm = await initChange(cwd, specBase, changeName)

  // 正控制：run brainstorm 把 currentStage 置为 brainstorm（主流程阶段写）
  const r1 = runStageSpec('brainstorm', changeName, cwd, specBase, {})
  assert(r1.status === 0, `run brainstorm 启动 exit 0（实际 ${r1.status}，尾：${r1.combined.slice(-80)}）`)
  let after = await readProgress(specBase, cwd, changeName)
  assert(after.currentStage === 'brainstorm', '正控制：brainstorm 启动后 currentStage=brainstorm')

  // status（只读 auxiliary，command.js 只读短路路径）：currentStage 保持
  const r2 = runStageSpec('status', changeName, cwd, specBase, {})
  assert(r2.status === 0, `run status exit 0（实际 ${r2.status}）`)
  after = await readProgress(specBase, cwd, changeName)
  assert(after.currentStage === 'brainstorm', 'FR-03: run status 后 currentStage 仍 brainstorm')

  // explore（非只读 auxiliary，走 runStage 的 currentStage 写路径，stage.js:131-138）：currentStage 保持
  const r3 = runStageSpec('explore', changeName, cwd, specBase, {})
  assert(r3.status === 0, `run explore exit 0（实际 ${r3.status}，尾：${r3.combined.slice(-80)}）`)
  after = await readProgress(specBase, cwd, changeName)
  assert(after.currentStage === 'brainstorm', 'FR-03: run explore 后 currentStage 仍 brainstorm（stage.js auxiliary 守卫）')
}

// ── 3. FR-04/8b: status/doctor 查询零副作用（空 fixture 不建 default）──
console.log('\n=== 3. FR-04/8b: 只读短路不建 default ===\n')
{
  const { cwd, specBase } = makeRepo('guards-fr04-')
  pinSpecDir(cwd)

  const r = runStageSpec('status', null, cwd, specBase, {})

  assert(r.status === 0, `空 fixture run status exit 0（实际 ${r.status}，尾：${r.combined.slice(-100)}）`)
  assert(r.combined.includes('只读查询不建变更'), 'stdout 含「只读查询不建变更」')
  assert(!existsSync(join(specBase, 'changes', 'default')), '不产生 changes/default/ 目录（治 8b）')
  const changes = await new ProgressManager({ specDir: specBase }).listChanges(cwd)
  assert(changes.length === 0 && !changes.includes('default'), 'DB 无 default 变更行（listChanges 为空）')
}

// ── 4. FR-01: --done gate 失败 fail-closed exit 1 ──
console.log('\n=== 4. FR-01: gate 失败 exit code 1（产物缺失）===\n')
{
  const { cwd, specBase } = makeRepo('guards-fr01-')
  pinSpecDir(cwd)
  const changeName = '2026-08-16-fr01'
  const pm = await initChange(cwd, specBase, changeName)
  // brainstorm 全 completed 仅末步 pending：--done 完成末步 → 阶段完成 → runValidators
  // validateBrainstormOutputs 缺 design.md 等四件套 → 校验失败 → rollback + exitCode=1（A5）
  const steps = brainstormDef.steps.map((s, i) => ({
    name: s.name,
    status: i === brainstormDef.steps.length - 1 ? 'pending' : 'completed',
  }))
  await seedStage(pm, cwd, changeName, 'brainstorm', steps, 'in-progress')
  let progress = await pm.read(cwd, changeName)
  progress.currentStage = 'brainstorm'
  await pm._write(cwd, progress, changeName)

  const r = runStageSpec('brainstorm', changeName, cwd, specBase, { done: true, output: 'x' })

  assert(r.status === 1, `缺产物 gate 失败 exit(1)（实际 ${r.status}，尾：${r.combined.slice(-120)}）`)
  assert(r.combined.includes('校验失败') || r.combined.includes('产物缺失'), 'stdout 含校验失败/产物缺失')
  const after = await readProgress(specBase, cwd, changeName)
  assert(after.stages.brainstorm.status === 'in-progress', 'DB: brainstorm 回滚为 in-progress（不落假 completed）')
  assert(after.stages.brainstorm.steps[after.stages.brainstorm.steps.length - 1].status === 'pending', 'DB: 末步回滚为 pending（可修复后重跑）')
}

// ── 5. FR-05: brainstorm auto-create gating ──
console.log('\n=== 5. FR-05: brainstorm auto-create gating ===\n')
// 5a. 多活跃变更仓无 --change → exit 2 + 不建幽灵变更
console.log('--- 5a. 多活跃变更仓无 --change → exit(2) + 不建幽灵变更 ---')
{
  const { cwd, specBase } = makeRepo('guards-fr05-blocked-')
  pinSpecDir(cwd)
  await initChange(cwd, specBase, '2026-08-16-fr05-a')
  await initChange(cwd, specBase, '2026-08-16-fr05-b')
  const changesDir = join(specBase, 'changes')
  const before = readdirSync(changesDir).filter(d => !d.includes('new-change')).sort()

  const r = runStageSpec('brainstorm', null, cwd, specBase, {})

  assert(r.status === 2, `多活跃变更无 --change exit(2)（实际 ${r.status}，尾：${r.combined.slice(-100)}）`)
  assert(r.combined.includes('已存在 2 个活跃变更'), 'stdout 点名活跃变更数')
  assert(r.combined.includes('--change'), 'stdout 引导 --change')
  const afterDirs = readdirSync(changesDir).sort()
  assert(afterDirs.length === before.length, '未创建新变更目录（dirs 数不变）')
  assert(!afterDirs.some(d => d.includes('new-change')), '无 new-change-* 幽灵变更目录')
}

// 5b. 0 活跃变更空 fixture → auto-create（exit 0 正常进入）
console.log('\n--- 5b. 0 活跃变更空 fixture → auto-create ---')
{
  const { cwd, specBase } = makeRepo('guards-fr05-auto-')
  pinSpecDir(cwd)

  const r = runStageSpec('brainstorm', null, cwd, specBase, {})

  assert(r.status === 0, `空 fixture brainstorm auto-create exit 0（实际 ${r.status}，尾：${r.combined.slice(-100)}）`)
  assert(r.combined.includes('自动创建变更'), 'stdout 含「自动创建变更」')
  const created = readdirSync(join(specBase, 'changes')).filter(d => d.includes('new-change'))
  assert(created.length === 1, `auto-create 恰好一个 new-change-*（实际 ${created.join(',')}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
