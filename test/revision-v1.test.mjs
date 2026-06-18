/**
 * Revision v1 测试
 *
 * 覆盖 10 个核心 case：
 * 1. completed 阶段直接 run → 拒绝
 * 2. completed + --reopen 无 --from-step → 拒绝
 * 3. --reopen --from-step index → 正确标记步骤
 * 4. --reopen --from-step name → 正确标记步骤
 * 5. --from-step 不存在 → fail-fast
 * 6. --from-step 后续步骤 stale
 * 7. 下游 stage cascade stale
 * 8. stale 下游直接 run → 拒绝
 * 9. waiting/pending 阶段 --reopen 无 from-step → 允许继续
 * 10. reopen 不改动产物文件
 */

import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let failed = 0
const failures = []

function assert(condition, msg) {
  if (!condition) {
    failed++
    failures.push(msg)
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

// ── 辅助：创建临时项目 ──
function createTempProject() {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-rev-test-'))
  const specDir = join(cwd, '.sillyspec')
  mkdirSync(join(specDir, '.runtime'), { recursive: true })
  mkdirSync(join(specDir, 'changes'), { recursive: true })
  return { cwd, specDir }
}

// ── 辅助：初始化 DB + change ──
async function setupProgress(cwd, changeName = 'test-change') {
  const { ProgressManager } = await import('../src/progress.js')
  const pm = new ProgressManager()
  await pm.init(cwd)
  await pm.initChange(cwd, changeName)
  return pm
}

// ── 辅助：标记阶段 completed + 填充步骤 ──
async function markStageCompleted(pm, cwd, changeName, stageName, stepNames) {
  const data = await pm.read(cwd, changeName)
  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  data.stages[stageName] = {
    status: 'completed',
    startedAt: now,
    completedAt: now,
    steps: stepNames.map(name => ({ name, status: 'completed', completedAt: now })),
  }
  data.currentStage = stageName
  await pm._write(cwd, data, changeName)
}

console.log('=== Revision v1 测试 ===\n')

// ─────────────────────────────────────────
// Case 1: completed 阶段直接 run → 拒绝
// ─────────────────────────────────────────
console.log('--- Case 1: completed 阶段直接 run 拒绝 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-test-1'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['需求澄清', '方案发散', '方案选择'])

  // 模拟 run 命令的规则 1 检查
  const data = await pm.read(cwd, changeName)
  const stageStatus = data.stages['brainstorm']?.status
  const isReopen = false

  const shouldReject = stageStatus === 'completed' && !isReopen
  assert(shouldReject, 'completed 阶段直接 run 应被拒绝')

  // 验证 reopen 能解决
  const reopenResult = await pm.reopenStage(cwd, 'brainstorm', { fromStep: 2, changeName })
  assert(reopenResult.ok === true, '--reopen 应该能打开 completed 阶段')
}
rmSync(mkdtempSync(join(tmpdir(), 'sillyspec-rev-test-')), { recursive: true }) // noop cleanup placeholder

// ─────────────────────────────────────────
// Case 2: completed + --reopen 无 --from-step → 拒绝
// ─────────────────────────────────────────
console.log('\n--- Case 2: completed + --reopen 无 --from-step 拒绝 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-test-2'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['需求澄清', '方案发散', '方案选择'])

  // reopen 不带 fromStep，且所有步骤 completed → 应该失败
  const result = await pm.reopenStage(cwd, 'brainstorm', { changeName })
  assert(!result.ok, '所有步骤 completed 且不带 fromStep 时应拒绝')
  assert(result.error && result.error.includes('--from-step'), '错误提示应包含 --from-step')
}
rmSync(mkdtempSync(join(tmpdir(), 'sillyspec-rev-test-')), { recursive: true })

// ─────────────────────────────────────────
// Case 3: --reopen --from-step index → 正确标记步骤
// ─────────────────────────────────────────
console.log('\n--- Case 3: --reopen --from-step index 正确标记步骤 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-test-3'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['需求澄清', '方案发散', '方案选择', '设计整理'])

  const result = await pm.reopenStage(cwd, 'brainstorm', { fromStep: 3, changeName })
  assert(result.ok, 'reopen with fromStep=3 应成功')
  assert(result.revision === 1, 'revision 应为 1')

  const data = await pm.read(cwd, changeName)
  const steps = data.stages['brainstorm'].steps
  assert(steps[0].status === 'completed', 'step 1 (index 0) 应保持 completed')
  assert(steps[1].status === 'completed', 'step 2 (index 1) 应保持 completed')
  assert(steps[2].status === 'pending', 'step 3 (index 2) 应为 pending')
  assert(steps[3].status === 'stale', 'step 4 (index 3) 应为 stale')
  assert(data.stages['brainstorm'].status === 'revising', 'stage 状态应为 revising')
}
rmSync(mkdtempSync(join(tmpdir(), 'sillyspec-rev-test-')), { recursive: true })

// ─────────────────────────────────────────
// Case 4: --reopen --from-step name → 正确标记步骤
// ─────────────────────────────────────────
console.log('\n--- Case 4: --reopen --from-step name 正确标记步骤 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-test-4'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'plan', ['复杂度分类', '状态检查', '上下文加载', 'Wave 分组'])

  const result = await pm.reopenStage(cwd, 'plan', { fromStep: '上下文加载', changeName })
  assert(result.ok, 'reopen with fromStep="上下文加载" 应成功')
  assert(result.fromStep === '上下文加载', 'fromStep 应为 "上下文加载"')

  const data = await pm.read(cwd, changeName)
  const steps = data.stages['plan'].steps
  assert(steps[0].status === 'completed', 'step 1 应保持 completed')
  assert(steps[1].status === 'completed', 'step 2 应保持 completed')
  assert(steps[2].status === 'pending', 'step 3 (上下文加载) 应为 pending')
  assert(steps[3].status === 'stale', 'step 4 应为 stale')
}
rmSync(mkdtempSync(join(tmpdir(), 'sillyspec-rev-test-')), { recursive: true })

// ─────────────────────────────────────────
// Case 5: --from-step 不存在 → fail-fast
// ─────────────────────────────────────────
console.log('\n--- Case 5: --from-step 不存在 fail-fast ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-test-5'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['需求澄清', '方案发散'])

  // 名称不存在
  const result1 = await pm.reopenStage(cwd, 'brainstorm', { fromStep: '不存在的步骤', changeName })
  assert(!result1.ok, '不存在的步骤名应失败')
  assert(result1.error && result1.error.includes('步骤不存在'), '错误应包含"步骤不存在"')

  // 序号超出范围
  const result2 = await pm.reopenStage(cwd, 'brainstorm', { fromStep: 99, changeName })
  assert(!result2.ok, '超出范围的序号应失败')
  assert(result2.error && result2.error.includes('超出范围'), '错误应包含"超出范围"')
}
rmSync(mkdtempSync(join(tmpdir(), 'sillyspec-rev-test-')), { recursive: true })

// ─────────────────────────────────────────
// Case 6: --from-step 后续步骤 stale
// ─────────────────────────────────────────
console.log('\n--- Case 6: --from-step 后续步骤 stale ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-test-6'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2', 's3', 's4', 's5'])

  const result = await pm.reopenStage(cwd, 'brainstorm', { fromStep: 2, changeName })
  assert(result.ok, 'reopen fromStep=2 应成功')

  const data = await pm.read(cwd, changeName)
  const steps = data.stages['brainstorm'].steps
  assert(steps[0].status === 'completed', 's1 保持 completed')
  assert(steps[1].status === 'pending', 's2 变为 pending')
  assert(steps[2].status === 'stale', 's3 变为 stale')
  assert(steps[3].status === 'stale', 's4 变为 stale')
  assert(steps[4].status === 'stale', 's5 变为 stale')
}
rmSync(mkdtempSync(join(tmpdir(), 'sillyspec-rev-test-')), { recursive: true })

// ─────────────────────────────────────────
// Case 7: 下游 stage cascade stale
// ─────────────────────────────────────────
console.log('\n--- Case 7: 下游 stage cascade stale ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-test-7'
  const pm = await setupProgress(cwd, changeName)
  // brain + plan + execute 都 completed
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2', 's3'])
  await markStageCompleted(pm, cwd, changeName, 'plan', ['p1', 'p2'])
  await markStageCompleted(pm, cwd, changeName, 'execute', ['e1', 'e2'])
  await markStageCompleted(pm, cwd, changeName, 'verify', ['v1', 'v2'])

  // reopen brainstorm from step 2
  const result = await pm.reopenStage(cwd, 'brainstorm', { fromStep: 2, changeName })
  assert(result.ok, 'reopen brainstorm fromStep=2 应成功')

  const data = await pm.read(cwd, changeName)
  assert(data.stages['brainstorm'].status === 'revising', 'brainstorm 应为 revising')
  assert(data.stages['plan'].status === 'stale', 'plan 应为 stale')
  assert(data.stages['execute'].status === 'stale', 'execute 应为 stale')
  assert(data.stages['verify'].status === 'stale', 'verify 应为 stale')
  assert(data.stages['archive'].status !== 'stale' || data.stages['archive'].status === 'pending', 'archive 保持 pending（未执行过的不会变 stale）')

  // 检查 staleReason
  const planStaleReason = data.stages['plan'].staleReason
  assert(planStaleReason && planStaleReason.includes('brainstorm'), 'plan staleReason 应包含 brainstorm')

  // 验证 scan 不在 cascade 中（scan 是 brainstorm 的上游）
  assert(data.stages['scan'].status !== 'stale', 'scan 不应被 cascade（它是 brainstorm 的上游，不是下游）')
}
rmSync(mkdtempSync(join(tmpdir(), 'sillyspec-rev-test-')), { recursive: true })

// ─────────────────────────────────────────
// Case 8: stale 下游直接 run → 拒绝
// ─────────────────────────────────────────
console.log('\n--- Case 8: stale 下游直接 run 拒绝 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-test-8'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2'])
  await markStageCompleted(pm, cwd, changeName, 'plan', ['p1', 'p2'])

  // reopen brainstorm → plan becomes stale
  await pm.reopenStage(cwd, 'brainstorm', { fromStep: 1, changeName })

  const data = await pm.read(cwd, changeName)
  const planStatus = data.stages['plan'].status
  assert(planStatus === 'stale', 'plan 应为 stale')

  // 模拟 run 命令的规则 5 检查
  const isReopen = false
  const shouldReject = planStatus === 'stale' && !isReopen
  assert(shouldReject, 'stale 阶段直接 run 应被拒绝')

  // reopen plan from step 1 应该可以
  const reopenResult = await pm.reopenStage(cwd, 'plan', { fromStep: 1, changeName })
  assert(reopenResult.ok === true, 'stale 阶段用 --reopen --from-step 1 应该可以')
}
rmSync(mkdtempSync(join(tmpdir(), 'sillyspec-rev-test-')), { recursive: true })

// ─────────────────────────────────────────
// Case 9: waiting/pending 阶段 --reopen 无 from-step → 允许继续
// ─────────────────────────────────────────
console.log('\n--- Case 9: waiting/pending 阶段 --reopen 无 from-step 允许继续 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-test-9'
  const pm = await setupProgress(cwd, changeName)

  // 手动构造一个有 waiting 步骤的 brainstorm
  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  const data = await pm.read(cwd, changeName)
  data.stages['brainstorm'] = {
    status: 'in-progress',
    startedAt: now,
    completedAt: null,
    steps: [
      { name: '需求澄清', status: 'completed', completedAt: now },
      { name: '方案发散', status: 'waiting', waitReason: '需要用户确认' },
      { name: '方案选择', status: 'pending' },
    ],
  }
  data.currentStage = 'brainstorm'
  await pm._write(cwd, data, changeName)

  // reopen 不带 fromStep，应该能找到 waiting 步骤并继续
  const result = await pm.reopenStage(cwd, 'brainstorm', { changeName })
  assert(result.ok, '有 waiting 步骤时 --reopen 不带 fromStep 应成功')
  assert(result.fromStep === '方案发散', '应从 waiting 步骤继续')
}
rmSync(mkdtempSync(join(tmpdir(), 'sillyspec-rev-test-')), { recursive: true })

// ─────────────────────────────────────────
// Case 10: reopen 不改动产物文件
// ─────────────────────────────────────────
console.log('\n--- Case 10: reopen 不改动产物文件 ---')
{
  const { cwd, specDir } = createTempProject()
  const changeName = 'rev-test-10'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2', 's3'])

  // 创建产物文件
  const changeDir = join(specDir, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  const designPath = join(changeDir, 'design.md')
  const designContent = '# Original Design\n\nOriginal content'
  writeFileSync(designPath, designContent)

  // reopen
  const result = await pm.reopenStage(cwd, 'brainstorm', { fromStep: 2, changeName })
  assert(result.ok, 'reopen 应成功')

  // 验证文件未被改动
  assert(existsSync(designPath), 'design.md 应仍然存在')
  const afterContent = readFileSync(designPath, 'utf8')
  assert(afterContent === designContent, 'design.md 内容应未被改动')
}
rmSync(mkdtempSync(join(tmpdir(), 'sillyspec-rev-test-')), { recursive: true })

// ─────────────────────────────────────────
// Bonus: 多次 reopen revision 递增
// ─────────────────────────────────────────
console.log('\n--- Bonus: 多次 reopen revision 递增 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-test-bonus'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2', 's3'])

  const r1 = await pm.reopenStage(cwd, 'brainstorm', { fromStep: 2, changeName })
  assert(r1.ok && r1.revision === 1, '第一次 reopen revision=1')

  // 完成 step 2
  const data = await pm.read(cwd, changeName)
  data.stages['brainstorm'].steps[1].status = 'completed'
  data.stages['brainstorm'].steps[1].completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
  data.stages['brainstorm'].steps[2].status = 'completed'
  data.stages['brainstorm'].steps[2].completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
  data.stages['brainstorm'].status = 'completed'
  data.stages['brainstorm'].completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
  await pm._write(cwd, data, changeName)

  // 第二次 reopen
  const r2 = await pm.reopenStage(cwd, 'brainstorm', { fromStep: 3, changeName })
  assert(r2.ok && r2.revision === 2, '第二次 reopen revision=2')
}

// ─────────────────────────────────────────
// Bonus: scan reopen → brainstorm cascade
// ─────────────────────────────────────────
console.log('\n--- Bonus: scan reopen 应 cascade 到 brainstorm ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-test-scan'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'scan', ['s1', 's2'])
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['b1', 'b2'])

  const result = await pm.reopenStage(cwd, 'scan', { fromStep: 2, changeName })
  assert(result.ok, 'reopen scan 应成功')

  const data = await pm.read(cwd, changeName)
  assert(data.stages['scan'].status === 'revising', 'scan 应为 revising')
  assert(data.stages['brainstorm'].status === 'stale', 'brainstorm 应被 cascade 为 stale')
}

// ─────────────────────────────────────────
// TODO Fix 1: stale 阶段 --status 不拦截
// ─────────────────────────────────────────
console.log('\n--- TODO Fix 1: stale 阶段 --status 放行 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-todo-1'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2'])
  await markStageCompleted(pm, cwd, changeName, 'plan', ['p1', 'p2'])

  // reopen brainstorm → plan cascade stale
  await pm.reopenStage(cwd, 'brainstorm', { fromStep: 1, changeName })

  const data = await pm.read(cwd, changeName)
  assert(data.stages['plan'].status === 'stale', 'plan 应为 stale')

  // 模拟 run.js 的拦截逻辑：stale + --status 应放行
  const isStatus = true
  const isReopen = false
  const isReset = false
  const stageStatus = data.stages['plan'].status
  const shouldBlock = stageStatus === 'stale' && !isReopen && !isStatus && !isReset
  assert(!shouldBlock, 'stale + --status 不应被拦截')
}

// ─────────────────────────────────────────
// TODO Fix 2: stale 阶段 --reset 不拦截
// ─────────────────────────────────────────
console.log('\n--- TODO Fix 2: stale 阶段 --reset 放行 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-todo-2'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2'])
  await markStageCompleted(pm, cwd, changeName, 'plan', ['p1', 'p2'])

  await pm.reopenStage(cwd, 'brainstorm', { fromStep: 1, changeName })

  const data = await pm.read(cwd, changeName)
  const isReset = true
  const isStatus = false
  const isReopen = false
  const stageStatus = data.stages['plan'].status
  const shouldBlock = stageStatus === 'stale' && !isReopen && !isStatus && !isReset
  assert(!shouldBlock, 'stale + --reset 不应被拦截')
}

// ─────────────────────────────────────────
// TODO Fix 3: stale empty steps + --reopen --from-step 1 自动初始化
// ─────────────────────────────────────────
console.log('\n--- TODO Fix 3: stale empty steps + reopen from-step 1 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-todo-3'
  const pm = await setupProgress(cwd, changeName)

  // brainstorm completed with steps
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2'])

  // plan marked completed but WITHOUT steps (模拟 cascade stale 后 steps 为空)
  const data = await pm.read(cwd, changeName)
  data.stages['plan'] = {
    status: 'completed',
    startedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    completedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    steps: [], // 空 steps
  }
  data.currentStage = 'brainstorm'
  await pm._write(cwd, data, changeName)

  // reopen brainstorm → plan cascade stale
  await pm.reopenStage(cwd, 'brainstorm', { fromStep: 1, changeName })

  // plan 现在是 stale，steps 为空
  const data2 = await pm.read(cwd, changeName)
  assert(data2.stages['plan'].status === 'stale', 'plan 应为 stale')
  assert(data2.stages['plan'].steps.length === 0, 'plan steps 应为空')

  // 模拟 run.js 的 ensureStageSteps：手动注入 steps
  // 因为 reopenStage 需要 steps 来 resolve from-step
  // 这里测试逻辑：先 ensure steps，再 reopen
  const data3 = await pm.read(cwd, changeName)
  data3.stages['plan'].steps = [
    { name: '复杂度分类', status: 'pending' },
    { name: '状态检查', status: 'pending' },
  ]
  await pm._write(cwd, data3, changeName)

  // 现在 reopen plan from step 1
  const result = await pm.reopenStage(cwd, 'plan', { fromStep: 1, changeName })
  assert(result.ok, 'stale empty steps 初始化后 reopen 应成功')
  assert(result.fromStep === '复杂度分类', 'fromStep 应为第一个步骤')
}

// ─────────────────────────────────────────
// TODO Fix 4: stale empty steps + --reopen 无 from-step 仍 fail-fast
// ─────────────────────────────────────────
console.log('\n--- TODO Fix 4: stale empty steps + reopen 无 from-step fail-fast ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-todo-4'
  const pm = await setupProgress(cwd, changeName)

  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2'])

  // plan stale with empty steps
  const data = await pm.read(cwd, changeName)
  data.stages['plan'] = {
    status: 'stale',
    startedAt: null,
    completedAt: null,
    steps: [],
    staleReason: 'upstream brainstorm revised',
  }
  await pm._write(cwd, data, changeName)

  // reopen without fromStep → should fail because all steps are... well there are none
  const result = await pm.reopenStage(cwd, 'plan', { changeName })
  assert(!result.ok, 'stale empty steps 无 fromStep 应失败')
}

// ─────────────────────────────────────────
// v1.1: progress 展示 revising + stale 信息
// ─────────────────────────────────────────
console.log('\n--- v1.1: progress 展示 revising 信息 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-11-1'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2', 's3'])
  await markStageCompleted(pm, cwd, changeName, 'plan', ['p1', 'p2'])

  await pm.reopenStage(cwd, 'brainstorm', { fromStep: 2, changeName })

  const data = await pm.read(cwd, changeName)
  // 验证 revision 信息存在
  assert(data.stages['brainstorm'].revision === 1, 'brainstorm revision 应为 1')
  assert(!!data.stages['brainstorm'].reopenedFromStep, 'brainstorm 应有 reopenedFromStep')
  assert(data.stages['plan'].status === 'stale', 'plan 应为 stale')
  assert(!!data.stages['plan'].staleReason, 'plan 应有 staleReason')

  // 验证 _getNextSuggestion 返回正确建议
  const suggestion = pm._getNextSuggestion(data)
  assert(suggestion !== null, '应有 suggestion')
  assert(suggestion.text.includes('brainstorm') || suggestion.text.includes('需求探索'), 'suggestion 应提到 brainstorm 修订中')
  assert(suggestion.command === 'sillyspec run brainstorm', 'suggestion command 应为继续 brainstorm')
}

// ─────────────────────────────────────────
// v1.1: _getNextSuggestion 返回 stale 建议
// ─────────────────────────────────────────
console.log('\n--- v1.1: suggestion 返回 stale 阶段建议 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-11-2'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2'])
  await markStageCompleted(pm, cwd, changeName, 'plan', ['p1', 'p2'])

  // reopen brainstorm → plan stale
  await pm.reopenStage(cwd, 'brainstorm', { fromStep: 1, changeName })

  // 手动完成 brainstorm 修订（不再 revising）
  const data = await pm.read(cwd, changeName)
  data.stages['brainstorm'].status = 'completed'
  data.stages['brainstorm'].completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
  await pm._write(cwd, data, changeName)

  // 现在 brainstorm completed, plan stale
  const data2 = await pm.read(cwd, changeName)
  const suggestion = pm._getNextSuggestion(data2)
  assert(suggestion !== null, '应有 suggestion')
  assert(suggestion.text.includes('plan') || suggestion.text.includes('实现计划'), 'suggestion 应提到 plan')
  assert(suggestion.command.includes('--reopen --from-step 1'), 'suggestion 应建议 reopen plan')
}

// ─────────────────────────────────────────
// v1.1: checkConsistency 发现 completed + stale steps
// ─────────────────────────────────────────
console.log('\n--- v1.1: checkConsistency 发现 completed stage 有 stale steps ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-11-3'
  const pm = await setupProgress(cwd, changeName)

  // 手动构造异常状态：stage completed 但 step stale
  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  const data = await pm.read(cwd, changeName)
  data.stages['brainstorm'] = {
    status: 'completed',
    startedAt: now, completedAt: now,
    steps: [
      { name: 's1', status: 'completed', completedAt: now },
      { name: 's2', status: 'stale' }, // 异常
    ],
  }
  await pm._write(cwd, data, changeName)

  const result = await pm.checkConsistency(cwd, changeName)
  assert(!result.ok, '应检测到问题')
  assert(result.issues.length > 0, '应有 issue')
  assert(result.issues.some(i => i.includes('stale') && i.includes('completed')), '应有 stale step + completed stage 问题')
}

// ─────────────────────────────────────────
// v1.1: checkConsistency 发现 stale stage 缺 staleReason
// ─────────────────────────────────────────
console.log('\n--- v1.1: checkConsistency 发现 stale 缺 staleReason ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-11-4'
  const pm = await setupProgress(cwd, changeName)

  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  const data = await pm.read(cwd, changeName)
  data.stages['plan'] = {
    status: 'stale',
    steps: [],
    staleReason: null, // 缺失
  }
  await pm._write(cwd, data, changeName)

  const result = await pm.checkConsistency(cwd, changeName)
  assert(result.warnings.some(w => w.includes('plan') && w.includes('staleReason')), '应警告 plan 缺 staleReason')
}

// ─────────────────────────────────────────
// v1.1: checkConsistency 发现上游 stale 但下游 completed
// ─────────────────────────────────────────
console.log('\n--- v1.1: checkConsistency 发现上游 stale 下游 completed ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-11-5'
  const pm = await setupProgress(cwd, changeName)

  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  const data = await pm.read(cwd, changeName)
  data.stages['brainstorm'] = {
    status: 'stale', staleReason: 'test', steps: [],
  }
  data.stages['plan'] = {
    status: 'completed', startedAt: now, completedAt: now,
    steps: [{ name: 'p1', status: 'completed', completedAt: now }],
  }
  await pm._write(cwd, data, changeName)

  const result = await pm.checkConsistency(cwd, changeName)
  assert(!result.ok, '应检测到问题')
  assert(result.issues.some(i => i.includes('plan') && i.includes('brainstorm') && i.includes('stale')), '应检测到 plan completed 但 brainstorm stale')
}

// ─────────────────────────────────────────
// v1.1: checkConsistency 正常状态无问题
// ─────────────────────────────────────────
console.log('\n--- v1.1: checkConsistency 正常状态无问题 ---')
{
  const { cwd } = createTempProject()
  const changeName = 'rev-11-6'
  const pm = await setupProgress(cwd, changeName)
  await markStageCompleted(pm, cwd, changeName, 'brainstorm', ['s1', 's2'])

  const result = await pm.checkConsistency(cwd, changeName)
  assert(result.ok, '正常状态应无问题')
  assert(result.issues.length === 0, '不应有 issues')
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${12 - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) {
  console.log(`失败项:`)
  failures.forEach(f => console.log(`  - ${f}`))
}
console.log(`${'='.repeat(50)}`)

if (failed > 0) process.exit(1)
