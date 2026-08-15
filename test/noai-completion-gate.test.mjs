/**
 * noAI 步骤收尾补全阶段完成 gate — completeStageGates 共享收尾管线（S1/S2/S3 修复核心）
 *
 * 修复目标（docs/sillyspec/multi-agent-review-2026-08-08.md §2.1）：阶段完成收尾三处不对称——
 *   S1: runStage noAI 末步（stage.js:349-360）标 completed 后绕过 gate 管线
 *   S2: continueStep 完成分支（complete.js:726-734）绕过 gate 管线
 *   S3: completeStep 旧守卫 actualCompleted===actualTotal 用 completed 计数，skip optional 步骤
 *       后计数 < total → 整条 validator 序列被跳过
 * 统一解：抽 completeStageGates（gates.js:508），三处接入点（completeStep / continueStep / noAI 末步）
 * 都调用它并 early-return 其结果。
 *
 * 本测试直接驱动 completeStageGates（S1/S2/S3 修复的核心共享函数）。三处接入点调它的事实由代码
 * 本身保证（stage.js:357 / complete.js:285 / complete.js:732 均 `if (_stageGatesResult) return _stageGatesResult`），
 * completeStep 路径的 gate 行为由现有 run-complete-step-validator-rollback.test.mjs 覆盖。
 * 驱动 runStage noAI 末步 / continueStep 完成分支需构造完整前置链（checkTransition / scanProfile 动态
 * 注入 / waiting 非 requiresWait），fixture 对齐脆弱且边际价值低，故 gate 级联正确性在此单元覆盖。
 *
 * 覆盖 design §11：T2 plan contract / T3+T6 scan 平台 manifest + auxiliary 重置 / T5+T8 S3 skip optional
 * 守卫 / T4 brainstorm runValidators fail。T1（plan independent-tier Stage Review verdict=fail）与 T7
 * （continueStep 双 worktree 清理回归）需 independent-tier review.json docHash / execute 全 gate 通过
 * fixture，由代码审查（continueStep 删内联 cleanup 731-759 + handleExecuteWorktreeCleanup 在管线末尾
 * 仅调一次）+ completeStageGates 序列（handleExecuteWorktreeCleanup 单次）保证，未单独集成。
 */
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { completeStageGates } from '../src/run/gates.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

// scan 平台 fixture 辅助（复用 run-complete-step-scan-platform.test.mjs 模式）
const SCAN_DOCS = ['ARCHITECTURE.md', 'CONVENTIONS.md', 'STRUCTURE.md', 'INTEGRATIONS.md', 'TESTING.md', 'CONCERNS.md', 'PROJECT.md']
function writePlatformPointer(cwd) {
  writeFileSync(join(cwd, '.sillyspec-platform.json'), JSON.stringify({ status: 'active' }) + '\n')
}
function writeScanDocs(specRoot, projectName) {
  const scanDir = join(specRoot, 'docs', projectName, 'scan')
  mkdirSync(scanDir, { recursive: true })
  for (const doc of SCAN_DOCS) {
    writeFileSync(join(scanDir, doc),
      `---\nauthor: test\ncreated_at: 2026/08/08 08:00:00\n---\n# ${doc.replace('.md', '')}\n\n内容。\n`)
  }
}

console.log('=== completeStageGates: S1/S2/S3 共享收尾管线 ===\n')

// ── T2 / S1 plan 受害者：plan.md task id 不连续 → Plan→Execute Contract fail → 回滚 ──
// 修复前：noAI planPostcheck 末步标 plan completed 绕过 runStageCompletionGates → contract 不校验。
// 修复后：completeStageGates → runStageCompletionGates → validatePlanForExecute fail → rollback。
console.log('--- T2: plan + task id 不连续 → Plan→Execute Contract 阻断回滚 ---')
{
  const { cwd, specBase } = makeRepo('ncg-plan-')
  const cn = 'ncg-plan-contract'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  // task-01 → task-03（缺 task-02）→ validatePlanForExecute 报 task id 不连续
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [ ] task-01: a\n- [ ] task-03: c\n')
  // plan.module-impact.exists(large) 要求——补上让校验过，聚焦 Contract 不连续
  writeFileSync(join(changeDir, 'module-impact.md'), '# 模块影响分析（Module Impact）— ncg\n\n测试占位\n')
  const steps = [
    { name: '复杂度分类与上下文加载', status: 'completed' },
    { name: '生成分级计划', status: 'completed' },
    { name: '审查计划', status: 'completed' },
  ]
  const progress = await seedStage(pm, cwd, cn, 'plan', steps, 'completed')

  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'plan', cwd, changeName: cn, platformOpts: {}, specBase, progress, pm, stageData: progress.stages.plan, steps, currentIdx: 2, outputText: null }))

  assert(!r.error, 'contract fail 回滚不应抛异常（优雅 early-return）')
  assert(r.result && r.result.stageCompleted === false, 'stageCompleted:false（被回滚）')
  assert(r.stdout.includes('Plan → Execute Contract 校验失败'), 'stdout 含「Plan → Execute Contract 校验失败」')
  assert(r.stdout.includes('task id 不连续'), 'stdout 点名 task id 不连续')
  assert(!r.stdout.includes('阶段 plan 全部完成') && !r.stdout.includes('阶段已完成'), 'gate fail 不打完成提示（合理收紧）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.plan.status === 'in-progress', `DB: plan status 回滚 in-progress（实际 ${after.stages.plan.status}）`)
  assert(after.stages.plan.steps[2].status === 'pending', 'DB: 末步回退 pending（可重新 --done）')
}

// ── T3+T6 / S1 平台受害者 + R4：scan 平台 manifest 落盘 + auxiliary 重置 pending ──
// 修复前：noAI scanPostcheck 末步标 scan completed 绕过 handleScanStageCompleted → manifest/指针不落盘。
// 修复后：completeStageGates 第一步 handleScanStageCompleted → manifest + 指针 scan_completed；
//         scan 是 auxiliary → 重置 status=pending（可重跑）。
console.log('\n--- T3+T6: scan 平台 + 7 份文档 → manifest 落盘 + auxiliary 重置 pending ---')
{
  const { cwd, specBase } = makeRepo('ncg-scan-')
  const cn = 'ncg-scan-platform'
  const specRoot = mkdtempSync(join(tmpdir(), 'ncg-scan-specroot-'))
  writePlatformPointer(cwd)
  mkdirSync(join(specRoot, '.runtime'), { recursive: true })
  const projectName = basename(cwd)
  writeScanDocs(specRoot, projectName)
  const pm = await initChange(cwd, specBase, cn)
  const steps = [
    { name: '探测项目结构并建议子项目', status: 'completed' },
    { name: '构建扫描项目列表', status: 'completed' },
    { name: '自检和提交', status: 'completed' },
  ]
  const progress = await seedStage(pm, cwd, cn, 'scan', steps, 'completed')
  const platformOpts = { specRoot, workspaceId: 'ws-ncg-1', scanRunId: 'scan-ncg-1' }

  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'scan', cwd, changeName: cn, platformOpts, specBase, progress, pm, stageData: progress.stages.scan, steps, currentIdx: 2, outputText: null }))

  assert(r.stdout.includes('📄 manifest.json 已写入'), 'stdout 含 manifest 写入（handleScanStageCompleted 跑了）')
  assert(existsSync(join(specRoot, 'manifest.json')), 'manifest.json 落盘（S1 平台受害者修复）')
  const manifest = JSON.parse(readFileSync(join(specRoot, 'manifest.json'), 'utf8'))
  assert(manifest.workspace_id === 'ws-ncg-1', 'manifest.workspace_id')
  assert(manifest.scan_run_id === 'scan-ncg-1', 'manifest.scan_run_id')
  const pointer = JSON.parse(readFileSync(join(cwd, '.sillyspec-platform.json'), 'utf8'))
  assert(pointer.status === 'scan_completed', `指针 status=scan_completed（实际 ${pointer.status}）`)
  assert(pointer.scanStatus !== 'failed_post_check', `指针 scanStatus 非 failed（实际 ${pointer.scanStatus}）`)

  const after = await pm.read(cwd, cn)
  assert(after.stages.scan.status === 'pending', `DB: scan auxiliary 重置 pending 可重跑（实际 ${after.stages.scan.status}）`)
}

// ── T5+T8 / S3：plan skip optional 步骤后 gate 仍跑（completed‖skipped 计数满足）──
// 修复前：completeStep 旧守卫 actualCompleted===actualTotal 用 completed 计数，skip 一个 optional →
//   2 < 3 → 整条 validator 序列跳过（contract / file-locations 都不跑）。
// 修复后：completeStageGates 守卫 settledCount=completed‖skipped === total → gate 跑。
console.log('\n--- T5+T8: plan skip optional 步骤 → S3 守卫满足 gate 仍跑 ---')
{
  const { cwd, specBase } = makeRepo('ncg-s3-')
  const cn = 'ncg-s3-skip'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  // task-01 + task-02 连续 → contract 通过（隔离 S3 守卫，不让 contract fail 干扰）
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [ ] task-01: a\n- [ ] task-02: b\n')
  writeFileSync(join(changeDir, 'module-impact.md'), '# 模块影响分析（Module Impact）— ncg-s3\n\n测试占位\n')
  const steps = [
    { name: '复杂度分类与上下文加载', status: 'completed' },
    { name: '生成分级计划', status: 'skipped' },   // optional 被跳过（S3 关键：skipped 不算 completed）
    { name: '审查计划', status: 'completed' },
  ]
  const progress = await seedStage(pm, cwd, cn, 'plan', steps, 'completed')

  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'plan', cwd, changeName: cn, platformOpts: {}, specBase, progress, pm, stageData: progress.stages.plan, steps, currentIdx: 2, outputText: null }))

  // S3 核心：settledCount(completed‖skipped)=3 === total=3 → 不打「阶段校验跳过」+ gate 序列跑
  assert(!r.stdout.includes('阶段校验跳过'), 'S3: skip optional 不触发「阶段校验跳过」（completed‖skipped 计数满足）')
  assert(r.stdout.includes('Plan → Execute Contract 校验通过'), 'S3: gate 序列仍跑（contract 校验执行，非整体跳过）')
  assert(r.stdout.includes('文件位置验证'), 'S3: validateFileLocations 仍跑（settledCount===total 守卫满足）')
  // plan contract 通过 + tier=self（无 design.md）→ 不阻断 → 返回 null
  assert(r.result === null, 'gate 全过 → 返回 null（调用方继续自管收尾）')
}

// ── T4 / S2 gate 行为：brainstorm 缺 design.md → runValidators fail → 回滚 ──
// 修复前：continueStep 完成分支绕过 gate → 缺 design.md 仍标 completed。
// 修复后：completeStageGates → runStageCompletionGates → runValidators(brainstorm) →
//   validateBrainstormOutputs 报 design.md 缺失 → rollback。
console.log('\n--- T4: brainstorm 缺 design.md → runValidators fail 回滚 ---')
{
  const { cwd, specBase } = makeRepo('ncg-bs-')
  const cn = 'ncg-bs-missing-design'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  // 只写 proposal/requirements/tasks，缺 design.md → validateBrainstormOutputs 必失败
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n无\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n\n- FR-001: 需求\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 做 a\n')
  const BRAINSTORM_STEPS = ['状态检查', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
    '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '用户确认并生成规范文件']
  const steps = BRAINSTORM_STEPS.map(name => ({ name, status: 'completed' }))
  const progress = await seedStage(pm, cwd, cn, 'brainstorm', steps, 'completed')

  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'brainstorm', cwd, changeName: cn, platformOpts: {}, specBase, progress, pm, stageData: progress.stages.brainstorm, steps, currentIdx: 7, outputText: null }))

  assert(!r.error, 'validator fail 回滚不应抛异常')
  assert(r.result && r.result.stageCompleted === false, 'stageCompleted:false（被回滚）')
  assert(r.stdout.includes('阶段 brainstorm 校验失败'), 'stdout 含「阶段 brainstorm 校验失败」')
  assert(r.stdout.includes('design.md'), 'stdout 点名缺失的 design.md')

  const after = await pm.read(cwd, cn)
  assert(after.stages.brainstorm.status === 'in-progress', `DB: brainstorm status 回滚 in-progress（实际 ${after.stages.brainstorm.status}）`)
  assert(after.stages.brainstorm.steps[7].status === 'pending', 'DB: 末步回退 pending（可重新 --done）')
}

// ── T9 / D-1+D-5 verify 死信探针：module-impact 更新结果 pending 行 → 阻断 verify 完成 ──
// 修复前：verify 全 PASS → archive 才发现 pending 死信（时序漏洞）；agent 在 verify 阶段零信号。
// 修复后：verify --done 的 runStageCompletionGates 内 extractPendingDocSyncRows 非零 → 回滚。
console.log('\n--- T9: verify + module-impact 更新结果 pending 死信 → 阻断回滚（D-1/D-5）---')
{
  const { cwd, specBase } = makeRepo('ncg-verify-')
  const cn = 'ncg-verify-deadletter'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  // verify 前置产物：design/plan（verify.core-docs 存在性）+ 结论二级标题 PASS（conclusion-gate）
  writeFileSync(join(changeDir, 'design.md'), '# Design\n\n## 目标\n\n测试\n')
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'verify-result.md'), '---\nauthor: test\ncreated_at: 2026-08-15 00:00:00\n---\n# 验证报告\n\n## 结论\n\nPASS\n\n全部通过。\n')
  writeFileSync(join(changeDir, 'module-impact.md'), `---
author: test
created_at: 2026-08-15 00:00:00
---

# 模块影响分析（Module Impact）— ncg-verify

## 更新结果

| 模块文档 | 操作 | 状态 |
|----------|------|------|
| （execute 完成后由 archive 阶段同步） | 待办 | pending |
`)
  // verify 步骤 7 步（file-lifecycle：只读校验 + 写 verify-result.md）
  const VERIFY_STEPS = ['加载规范并锚定', '对照设计检查', '测试与质量扫描', '验证结果记录', '风险标记与收尾建议', '交叉验证（独立视角）', '汇总验证结论']
  const steps = VERIFY_STEPS.map(name => ({ name, status: 'completed' }))
  const progress = await seedStage(pm, cwd, cn, 'verify', steps, 'completed')

  // runVerifyTestCheck 需要 local.yaml commands.test；无配置时 testCheck.status 非 failed（跳过）
  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'verify', cwd, changeName: cn, platformOpts: {}, specBase, progress, pm, stageData: progress.stages.verify, steps, currentIdx: 6, outputText: null }))

  assert(r.result && r.result.stageCompleted === false, `stageCompleted:false（死信阻断回滚），result: ${JSON.stringify(r.result)}`)
  assert(r.stdout.includes('pending/待办'), 'stdout 含「pending/待办」死信提示')
  assert(!r.stdout.includes('验证通过，下一步'), '死信未清不打验证通过提示')

  const after = await pm.read(cwd, cn)
  assert(after.stages.verify.status !== 'completed', `DB: verify status 已回滚（实际 ${after.stages.verify.status}）`)
  assert(after.stages.verify.steps[6].status === 'pending', 'DB: verify 末步回退 pending')
}

// ── T10 / D-1+D-5 零回归：module-impact 无死信（done/skipped）→ verify 正常通过 ──
console.log('\n--- T10: verify + module-impact 无死信 → gate 过（零回归）---')
{
  const { cwd, specBase } = makeRepo('ncg-verify-ok-')
  const cn = 'ncg-verify-clean'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'design.md'), '# Design\n\n## 目标\n\n测试\n')
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'verify-result.md'), '---\nauthor: test\ncreated_at: 2026-08-15 00:00:00\n---\n# 验证报告\n\n## 结论\n\nPASS\n\n全部通过。\n')
  writeFileSync(join(changeDir, 'module-impact.md'), `---
author: test
created_at: 2026-08-15 00:00:00
---

# 模块影响分析（Module Impact）— ncg-verify-ok

## 更新结果

| 模块文档 | 操作 | 状态 |
|----------|------|------|
| modules/x.md | 契约更新 | done |
| modules/y.md | 卡片不存在 | skipped |
`)
  const VERIFY_STEPS = ['加载规范并锚定', '对照设计检查', '测试与质量扫描', '验证结果记录', '风险标记与收尾建议', '交叉验证（独立视角）', '汇总验证结论']
  const steps = VERIFY_STEPS.map(name => ({ name, status: 'completed' }))
  const progress = await seedStage(pm, cwd, cn, 'verify', steps, 'completed')

  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'verify', cwd, changeName: cn, platformOpts: {}, specBase, progress, pm, stageData: progress.stages.verify, steps, currentIdx: 6, outputText: null }))

  assert(!r.stdout.includes('pending/待办'), '无死信不打死信提示')
}

cleanup()
report(count.passed, count.failed, count.failures)
