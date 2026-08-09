/**
 * stage-completion-atomicity.test.mjs — task-05 / FR-06
 *
 * 锁住 completeStageGates 整体 try/catch 异常兜底（review-2026-08-09 #2 / task-01~04）：
 *   - src/run/gates.js 的 completeStageGates 在 :554-626 收尾段外层 try/catch；任一段抛非结构化异常
 *     → catch → rollbackCompletionAndReturn（回滚 in-progress + 落盘 + 返回未完成对象），不冒顶 exit 1。
 *   - 三处 persist（pm._write）从 gate 前移到 gate 成功后（complete.js completeStep/continueStep +
 *     stage.js noAI 末步）→ gate 异常/失败时 DB 不留「假 completed」（原子性）。
 *
 * 用例（≥4）：
 *   a) runStageCompletionGates 内 runValidators 抛非结构化异常 → catch rollback。
 *   b) validateMetadata 抛异常（fixture：changes 改普通文件 → readdirSync ENOTDIR）→ catch rollback，
 *      验证整体 try 覆盖 validateMetadata（:597），不只是 runStageCompletionGates（:622）。
 *   c) handleScanStageCompleted 抛异常（scan 阶段）→ catch rollback。
 *   d) 原子性：gate 抛异常后 DB（pm.read）stageData.status !== 'completed'（persist 移后 + rollback 落盘）。
 *   e)（bonus，覆盖 task-05.md acceptance）runVerifyTestCheck 抛异常（verify 阶段）→ catch rollback。
 *
 * mock 策略（ESM 同模块函数不可直接赋值 mock）：
 *   - runValidators / handleScanStageCompleted / runVerifyTestCheck 各来自独立模块（stage-contract.js /
 *     complete-handlers.js / verify-postcheck.js）→ node:test 的 mock.module。Node v24 签名为
 *     `mock.module(specifier, { exports })`（导出在 options.exports；旧 namedExports 已废弃，且无 factory），
 *     传 `{ exports: { ...realNamespace, <target>: wrapper } }`（spread 真实命名导出 + 覆盖目标）。
 *   - wrapper 闭包到模块级「可变 impl」（let），每用例切换 impl（默认委托真实函数）→ 既能在用例间
 *     切换「抛/不抛」，又不破坏其他命名导出（archiveDestDirName / checkExecuteCodeEvidence 等
 *     被 progress / complete-handlers 传递依赖的导出保留真实值，避免 link-time 缺失导出）。
 *   - 关键时序：先 `await import` 捕获真实命名空间（缓存 real），再 `await mock.module` 注册 mock，
 *     最后 `await import` gates.js + harness（此后解析到的 stage-contract/complete-handlers/verify-postcheck
 *     走 mock cache）。gates.js 内的 runValidators 绑定到 mock wrapper。
 *   - 每用例返回全新 steps 数组：rollback 会 mutate steps[i].status，跨用例复用同一数组会让后续用例
 *     settledCount 计数偏低 → runStageCompletionGates 守卫（settledCount===total）误跳过。(d) 的 DB
 *     steps 断言需 seedStage 与 completeStageGates 共用同一 steps 引用（与 noai 测试同套路）。
 *   - (b) 用 fixture（无 mock）：把 <specBase>/changes 改成普通文件 → validateMetadata 的 walk 顶层
 *     readdirSync 抛 ENOTDIR；triggerSync({}) 因 changes/<cn> 不存在提前 return（shared.js:334），
 *     不污染 rollback 路径。
 *
 * 运行：`node test/stage-completion-atomicity.test.mjs`（裸跑）。
 * mock.module 在 Node v22+ 需 `--experimental-test-module-mocks` 旗标；本文件若发现 mock.module
 * 不可用，则用该旗标自举 respawn 自己一次（env sentinel 防循环），使裸跑命令与 npm test（run-tests.mjs
 * 不带旗标 spawn）均能正常工作，无需改 run-tests.mjs。
 */
import { mock } from 'node:test'
import { spawnSync } from 'node:child_process'

// 自举：mock.module 需 --experimental-test-module-mocks，裸跑时 respawn 自己一次
if (typeof mock.module !== 'function') {
  if (process.env.SILLYSPEC_MOCK_RESPAWNED === '1') {
    console.error('mock.module 在加旗标 respawn 后仍不可用，放弃')
    process.exit(1)
  }
  const r = spawnSync(process.execPath,
    ['--experimental-test-module-mocks', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)],
    { stdio: 'inherit', env: { ...process.env, SILLYSPEC_MOCK_RESPAWNED: '1' } })
  process.exit(r.status ?? 0)
}

import { writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

// ── 1. 捕获真实命名空间（先缓存 real，供 mock factory spread + 默认委托）──
const realStageContract = await import('../src/stage-contract.js')
const realCompleteHandlers = await import('../src/run/complete-handlers.js')
const realVerifyPostcheck = await import('../src/verify-postcheck.js')

// ── 2. 模块级可变 impl（默认委托真实函数；每用例切换为 throw / pass）──
let runValidatorsImpl = (...a) => realStageContract.runValidators(...a)
let handleScanImpl = async (...a) => realCompleteHandlers.handleScanStageCompleted(...a)
let runVerifyTestCheckImpl = (...a) => realVerifyPostcheck.runVerifyTestCheck(...a)

// ── 3. 注册 mock（exports：spread real 命名导出 + 覆盖目标为 wrapper）──
//  Node v24 mock.module 签名 mock.module(specifier, { exports, cache? })，导出在 options.exports
//  （namedExports 已废弃）。wrapper 每次调用读当前 impl 变量 → 用例间切换生效，
//  绕开 ESM 同模块绑定不可变限制。
await mock.module('../src/stage-contract.js', {
  exports: { ...realStageContract, runValidators: (...a) => runValidatorsImpl(...a) },
})
await mock.module('../src/run/complete-handlers.js', {
  exports: { ...realCompleteHandlers, handleScanStageCompleted: (...a) => handleScanImpl(...a) },
})
await mock.module('../src/verify-postcheck.js', {
  exports: { ...realVerifyPostcheck, runVerifyTestCheck: (...a) => runVerifyTestCheckImpl(...a) },
})

// ── 4. mock 注册后再 import gates + harness（解析到 mock，gates.js 绑定 wrapper）──
const { completeStageGates } = await import('../src/run/gates.js')
const { runCapturing, makeRepo, initChange, seedStage, cleanup, report } = await import('./_complete-step-harness.mjs')

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => {
  cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`))
       : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`))
}

// 每用例前重置三个 impl 为「委托真实」，隔离用例间副作用
function resetImpls() {
  runValidatorsImpl = (...a) => realStageContract.runValidators(...a)
  handleScanImpl = async (...a) => realCompleteHandlers.handleScanStageCompleted(...a)
  runVerifyTestCheckImpl = (...a) => realVerifyPostcheck.runVerifyTestCheck(...a)
}

// 每用例返回全新 steps 数组：rollback 会 mutate steps[i].status（completed→pending），
// 若跨用例复用同一数组，后续用例 settledCount 计数偏低 → runStageCompletionGates 守卫误跳过。
const planSteps = () => [
  { name: '复杂度分类与上下文加载', status: 'completed' },
  { name: '生成分级计划', status: 'completed' },
  { name: '审查计划', status: 'completed' },
]
const scanSteps = () => [
  { name: '探测项目结构并建议子项目', status: 'completed' },
  { name: '构建扫描项目列表', status: 'completed' },
  { name: '自检和提交', status: 'completed' },
]

console.log('=== completeStageGates 异常兜底 rollback + persist 原子性 ===\n')

// ── (a) runStageCompletionGates 内 runValidators 抛非结构化异常 → catch rollback ──
console.log('--- (a) plan + runValidators throw Error("boom-plan") → catch rollback ---')
{
  resetImpls()
  runValidatorsImpl = () => { throw new Error('boom-plan') }
  const { cwd, specBase } = makeRepo('sca-a-')
  const cn = 'sca-a-rv-throw'
  const pm = await initChange(cwd, specBase, cn)
  // 写合法 plan.md（隔离：若 mock 未生效，real runValidators(plan) 通过 → 后续 gate 也通过 →
  // completeStageGates 返回 null，本用例 stageCompleted:false 断言失败，可识别 mock 未注入）
  writeFileSync(join(specBase, 'changes', cn, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [ ] task-01: a\n- [ ] task-02: b\n')
  const progress = await seedStage(pm, cwd, cn, 'plan', planSteps(), 'completed')

  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'plan', cwd, changeName: cn, platformOpts: {}, specBase, progress, pm, stageData: progress.stages.plan, steps: planSteps(), currentIdx: 2, outputText: null }))

  assert(!r.error, '(a) 异常被 catch，不冒顶（无 r.error / 非 exit）')
  assert(r.result && r.result.stageCompleted === false, '(a) stageCompleted:false（rollback 对象）')
  assert(r.result && r.result.currentIdx === 2, '(a) currentIdx=2（末步）')
  assert(r.result && r.result.nextPendingIdx === 2, '(a) nextPendingIdx=2=currentIdx（回退末步重做）')
  assert(r.stdout.includes('boom-plan'), '(a) stdout 含 mock 注入的 boom-plan（证明 runValidators 抛非结构化异常）')
  assert(r.stdout.includes('阶段完成收尾异常'), '(a) stdout 含 catch 块「阶段完成收尾异常」提示')

  const after = await pm.read(cwd, cn)
  assert(after.stages.plan.status === 'in-progress', `(a) DB: plan status 回滚 in-progress（实际 ${after.stages.plan.status}）`)
}

// ── (b) validateMetadata 抛异常（fixture）→ catch rollback（验证整体 try 覆盖 :597）──
// 把 <specBase>/changes 改成普通文件 → validateMetadata 的 walk 顶层 readdirSync 抛 ENOTDIR
// （walk 内部 per-entry try/catch 只兜底层读，顶层 readdirSync 的 ENOTDIR 直穿到 completeStageGates try）。
console.log('\n--- (b) plan + changes 改普通文件 → validateMetadata readdirSync ENOTDIR → catch rollback ---')
{
  resetImpls()
  const { cwd, specBase } = makeRepo('sca-b-')
  const cn = 'sca-b-validate-meta'
  const pm = await initChange(cwd, specBase, cn)
  const progress = await seedStage(pm, cwd, cn, 'plan', planSteps(), 'completed')
  // fixture：changes 整树换成普通文件（pm 进度在 SQLite，不受影响；triggerSync({}) 因 changes/<cn>
  // 不存在提前 return，rollback 路径不被污染）
  rmSync(join(specBase, 'changes'), { recursive: true, force: true })
  writeFileSync(join(specBase, 'changes'), 'not a directory\n')

  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'plan', cwd, changeName: cn, platformOpts: {}, specBase, progress, pm, stageData: progress.stages.plan, steps: planSteps(), currentIdx: 2, outputText: null }))

  assert(!r.error, '(b) validateMetadata 异常被 catch，不冒顶')
  assert(r.result && r.result.stageCompleted === false, '(b) stageCompleted:false（rollback 对象）')
  assert(r.result && r.result.nextPendingIdx === 2, '(b) nextPendingIdx=2（回退末步重做）')
  assert(r.stdout.includes('阶段完成收尾异常'), '(b) stdout 含 catch 块提示（证明 :597 validateMetadata 在整体 try 内）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.plan.status !== 'completed', `(b) DB: plan status 非 completed（实际 ${after.stages.plan.status}）`)
  assert(after.stages.plan.status === 'in-progress', '(b) DB: plan status 回滚 in-progress')
}

// ── (c) handleScanStageCompleted 抛异常（scan 阶段）→ catch rollback ──
console.log('\n--- (c) scan + handleScanStageCompleted throw Error("boom-scan") → catch rollback ---')
{
  resetImpls()
  handleScanImpl = async () => { throw new Error('boom-scan') }
  const { cwd, specBase } = makeRepo('sca-c-')
  const cn = 'sca-c-scan-throw'
  const pm = await initChange(cwd, specBase, cn)
  const progress = await seedStage(pm, cwd, cn, 'scan', scanSteps(), 'completed')

  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'scan', cwd, changeName: cn, platformOpts: {}, specBase, progress, pm, stageData: progress.stages.scan, steps: scanSteps(), currentIdx: 2, outputText: null }))

  assert(!r.error, '(c) handleScanStageCompleted 异常被 catch，不冒顶')
  assert(r.result && r.result.stageCompleted === false, '(c) stageCompleted:false（rollback 对象）')
  assert(r.result && r.result.currentIdx === 2, '(c) currentIdx=2（末步）')
  assert(r.result && r.result.nextPendingIdx === 2, '(c) nextPendingIdx=2（回退末步重做）')
  assert(r.stdout.includes('boom-scan'), '(c) stdout 含 mock 注入的 boom-scan')
  assert(r.stdout.includes('阶段完成收尾异常'), '(c) stdout 含 catch 块提示')

  const after = await pm.read(cwd, cn)
  assert(after.stages.scan.status === 'in-progress', `(c) DB: scan status 回滚 in-progress（实际 ${after.stages.scan.status}）`)
}

// ── (d) 原子性：gate 抛异常后 DB 不留假 completed（persist 移后保证）──
console.log('\n--- (d) 原子性：runValidators throw 后 DB 非 completed（persist 移后 + rollback 落盘）---')
{
  resetImpls()
  runValidatorsImpl = () => { throw new Error('boom-atomicity') }
  const { cwd, specBase } = makeRepo('sca-d-')
  const cn = 'sca-d-atomicity'
  const pm = await initChange(cwd, specBase, cn)
  writeFileSync(join(specBase, 'changes', cn, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [ ] task-01: a\n- [ ] task-02: b\n')
  // 同一 steps 引用传 seedStage + completeStageGates：rollback mutate steps[i] 后，progress 落盘
  // 的 steps（=== 本数组）也带 pending，DB 断言 steps[2].status 才成立（与 noai 测试同套路）。
  const steps = planSteps()
  const progress = await seedStage(pm, cwd, cn, 'plan', steps, 'completed')
  const stageDataRef = progress.stages.plan

  // 前置：seedStage 已把 status='completed' 落盘到 DB（模拟调用方 gate 前 marking）
  const before = await pm.read(cwd, cn)
  assert(before.stages.plan.status === 'completed', '(d) 前置：seedStage 已把 completed 写入 DB')

  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'plan', cwd, changeName: cn, platformOpts: {}, specBase, progress, pm, stageData: stageDataRef, steps, currentIdx: 2, outputText: null }))

  assert(r.stdout.includes('boom-atomicity'), '(d) runValidators 注入异常被 catch')
  assert(r.result && r.result.stageCompleted === false, '(d) stageCompleted:false')

  // 原子性核心：DB 不留「假 completed」——rollback 的 pm._write 把 in-progress 落盘盖掉
  const after = await pm.read(cwd, cn)
  assert(after.stages.plan.status !== 'completed',
    `(d) 原子性：DB status 非 completed（persist 移后 + rollback 落盘；实际 ${after.stages.plan.status}）`)
  assert(after.stages.plan.status === 'in-progress', '(d) DB status 回滚为 in-progress')
  assert(stageDataRef.status === 'in-progress', '(d) 入参 stageData 对象也被回滚（调用方引用一致，后续 persist 不会写回 completed）')
  assert(after.stages.plan.steps[2].status === 'pending', '(d) 末步回退 pending（可重新 --done）')
  assert(r.result && r.result.nextPendingIdx === 2, '(d) nextPendingIdx=2（重做入口）')
}

// ── (e) bonus：runVerifyTestCheck 抛异常（verify 阶段）→ catch rollback ──
// runStageCompletionGates verify 分支先 runValidators(verify)（mock 设 pass），再 runVerifyTestCheck（mock 抛）。
console.log('\n--- (e) verify + runVerifyTestCheck throw Error("boom-verify") → catch rollback ---')
{
  resetImpls()
  runValidatorsImpl = () => ({ ok: true, errors: [], warnings: [] }) // 让 runValidators 通过，进 verify 分支
  runVerifyTestCheckImpl = () => { throw new Error('boom-verify') }
  const VERIFY_STEPS = [{ name: '验证实现并跑测试', status: 'completed' }]
  const { cwd, specBase } = makeRepo('sca-e-')
  const cn = 'sca-e-verify-throw'
  const pm = await initChange(cwd, specBase, cn)
  const progress = await seedStage(pm, cwd, cn, 'verify', VERIFY_STEPS, 'completed')

  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'verify', cwd, changeName: cn, platformOpts: {}, specBase, progress, pm, stageData: progress.stages.verify, steps: VERIFY_STEPS, currentIdx: 0, outputText: null }))

  assert(!r.error, '(e) runVerifyTestCheck 异常被 catch，不冒顶')
  assert(r.result && r.result.stageCompleted === false, '(e) stageCompleted:false（rollback 对象）')
  assert(r.result && r.result.nextPendingIdx === 0, '(e) nextPendingIdx=0（回退末步重做）')
  assert(r.stdout.includes('boom-verify'), '(e) stdout 含 mock 注入的 boom-verify')
  assert(r.stdout.includes('阶段完成收尾异常'), '(e) stdout 含 catch 块提示')

  const after = await pm.read(cwd, cn)
  assert(after.stages.verify.status === 'in-progress', `(e) DB: verify status 回滚 in-progress（实际 ${after.stages.verify.status}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
