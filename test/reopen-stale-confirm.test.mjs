/**
 * reopen stale confirm 门控测试（W1 task-03）
 *
 * 覆盖 task-01/02 改动后的场景：
 *   1a. 中流程阻断：step N pending + 后续 stale 时 --done（无 confirm）→ 当前步完成、
 *       stale 保持、阶段不完成、指引两条出路
 *   1b. 阻断后续跑（全 completed+stale）：--done（无 confirm）→ exit 1 + 指引、状态不变
 *   2.  --done --confirm（全 completed+stale 逃生门）：回填生效 + audit log 落
 *       reopen-stale-backfill + 阶段完成
 *   3.  progress complete-stage 遇 stale 拒绝：报错含 stale 步骤名 + --force 提示；--force 放行
 *   4.  常规零介入：无 stale 时 --done 完成流程行为不变
 *
 * 技术要点：
 * - 用 _cli-step-harness.mjs 提供的 makeRepo/initChange/seedStage/runStage/cleanup
 * - 模拟 reopen 后的 stale 状态：手工置 steps[i].status='stale'
 * - 调 CLI 子进程 `sillyspec run <stage> --done [--confirm]` 测试对外行为
 * - 断言 DB（ProgressManager.read）+ stdout + audit.log 三件套
 * - 场景 2 需 brainstorm 完成产物（四件套）过 validateFileLocations，fixture 预置
 * - Windows 兼容：路径用 path.join，临时目录 mkdtempSync
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runStage, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

// reopen --from-step 3 后的 brainstorm 步骤形态（1-2 completed，3 pending 或 stale，4-8 stale）
function reopenedSteps(stepThreeStatus) {
  return [
    { name: '进度确认', status: 'completed', completedAt: '2026/08/19 10:00:00' },
    { name: '加载项目上下文', status: 'completed', completedAt: '2026/08/19 10:30:00' },
    { name: '对话式探索与需求澄清', status: stepThreeStatus, ...(stepThreeStatus === 'pending' ? {} : { completedAt: '2026/08/19 11:00:00' }) },
    { name: '提出 2-3 种方案', status: 'stale', completedAt: '2026/08/19 11:30:00' },
    { name: '分段展示设计', status: 'stale', completedAt: '2026/08/19 12:00:00' },
    { name: '写设计文档并自审', status: 'stale', completedAt: '2026/08/19 12:30:00' },
    { name: 'Design Grill 交叉审查', status: 'stale', completedAt: '2026/08/19 13:00:00' },
    { name: '生成规范文件', status: 'stale', completedAt: '2026/08/19 13:30:00' },
  ]
}

// brainstorm 完成所需四件套（frontmatter 过 validateMetadata；正文避开 lifecycle 关键词）
function seedBrainstormArtifacts(specBase, cn) {
  const dir = join(specBase, 'changes', cn)
  mkdirSync(dir, { recursive: true })
  const fm = '---\nauthor: qinyi\ncreated_at: 2026-08-19T10:00:00+08:00\n---\n\n'
  writeFileSync(join(dir, 'design.md'), fm + '# 设计\n测试设计正文\n')
  writeFileSync(join(dir, 'proposal.md'), fm + '# 提案\n测试提案\n')
  writeFileSync(join(dir, 'requirements.md'), fm + '# 需求\nFR-01 测试\n')
  writeFileSync(join(dir, 'tasks.md'), fm + '# 任务\n- [ ] task-01 测试\n')
}

console.log('=== reopen stale confirm 门控场景 ===\n')

// ── 场景 1a：中流程阻断（step 3 pending + 4-8 stale，--done 无 confirm）──
console.log('--- 场景 1a：中流程 --done 无 confirm → 当前步完成、stale 保持、阶段不完成 ---')
{
  const { cwd, specBase } = makeRepo('stale-mid-nocf-')
  const cn = '2026-08-19-stale-mid-nocf'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm', reopenedSteps('pending'), 'in-progress')

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '需求：test\n根因：无\n方案：test\n结果：test' })

  assert(r.combined.includes('检测到') && r.combined.includes('stale 步骤'), '输出含 stale 检测提示')
  assert(r.combined.includes('两条出路'), '输出含两条出路指引')
  assert(r.combined.includes('--confirm'), '指引含 --confirm 收尾出路')

  const after = await pm.read(cwd, cn)
  assert(after.stages.brainstorm.status !== 'completed', 'DB: 阶段未完成')
  assert(after.stages.brainstorm.steps[2].status === 'completed', 'DB: step3（对话式探索）本次已完成')
  const staleSteps = after.stages.brainstorm.steps.filter(s => s.status === 'stale')
  assert(staleSteps.length === 5, `DB: 5 个 stale 保持未回填（实际 ${staleSteps.length}）`)
}

// ── 场景 1b：阻断后续跑（全 completed+stale，无 confirm）──
console.log('\n--- 场景 1b：阻断后重复 --done（无 confirm）→ exit 1 + 指引、状态不变 ---')
{
  const { cwd, specBase } = makeRepo('stale-post-nocf-')
  const cn = '2026-08-19-stale-post-nocf'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm', reopenedSteps('stale'), 'in-progress')

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '需求：test\n根因：无\n方案：test\n结果：test' })

  assert(r.status !== 0, `CLI 应 exit 非 0（实际 ${r.status}）`)
  assert(r.combined.includes('stale 步骤'), 'exit 前打印 stale 检测指引')
  assert(r.combined.includes('--confirm'), '指引含 --confirm 逃生门')
  assert(!r.combined.includes('没有待完成的步骤'), '不应误报「没有待完成的步骤」（stale 即待处理）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.brainstorm.status !== 'completed', 'DB: 阶段未完成')
  const staleSteps = after.stages.brainstorm.steps.filter(s => s.status === 'stale')
  assert(staleSteps.length === 6, `DB: 6 个 stale 保持（实际 ${staleSteps.length}）`)
}

// ── 场景 2：--done --confirm 逃生门（全 completed+stale）──
console.log('\n--- 场景 2：--done --confirm → 回填生效 + audit.log reopen-stale-backfill + 阶段完成 ---')
{
  const { cwd, specBase } = makeRepo('stale-confirm-')
  const cn = '2026-08-19-stale-confirm'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm', reopenedSteps('stale'), 'in-progress')
  seedBrainstormArtifacts(specBase, cn)

  const r = runStage('brainstorm', cn, cwd, {
    done: true,
    confirm: true,
    output: '需求：test\n根因：无\n方案：test\n结果：test'
  })

  assert(r.status === 0, `CLI 应 exit 0（实际 ${r.status}）：${r.combined.slice(-400)}`)
  assert(r.combined.includes('同步回填') && r.combined.includes('stale'), '输出含回填提示')

  const after = await pm.read(cwd, cn)
  assert(after.stages.brainstorm.status === 'completed', `DB: 阶段完成（实际 ${after.stages.brainstorm.status}）`)
  const staleSteps = after.stages.brainstorm.steps.filter(s => s.status === 'stale')
  assert(staleSteps.length === 0, `DB: stale 全部回填（实际剩 ${staleSteps.length}）`)
  assert(after.stages.brainstorm.steps.every(s => s.status === 'completed'), 'DB: 全部步骤 completed')

  const auditPath = join(specBase, '.runtime', 'audit.log')
  assert(existsSync(auditPath), 'audit.log 存在')
  const entries = readFileSync(auditPath, 'utf8').trim().split('\n').map(l => JSON.parse(l))
  const backfillEntry = entries.find(e => e.action === 'reopen-stale-backfill')
  assert(!!backfillEntry, 'audit.log 含 reopen-stale-backfill 条目')
  assert(backfillEntry && backfillEntry.stage === 'brainstorm', '审计条目 stage=brainstorm')
  assert(backfillEntry && Array.isArray(backfillEntry.steps) && backfillEntry.steps.length >= 5, `审计条目 steps 列表（实际 ${backfillEntry && backfillEntry.steps && backfillEntry.steps.length}）`)
}

// ── 场景 3：progress complete-stage 遇 stale 拒绝；--force 放行 ──
console.log('\n--- 场景 3：progress complete-stage 遇 stale 拒绝，--force 放行 ---')
{
  // 3a: 无 force 时拒绝
  {
    const { cwd, specBase } = makeRepo('stale-complete-no-force-')
    const cn = '2026-08-19-stale-complete-no-force'
    const pm = await initChange(cwd, specBase, cn)

    const stepsWithStale = [
      { name: '验证准备', status: 'completed', completedAt: '2026/08/19 14:00:00' },
      { name: '执行验证', status: 'stale', completedAt: '2026/08/19 14:30:00' },
      { name: '产出报告', status: 'stale', completedAt: '2026/08/19 15:00:00' },
    ]
    await seedStage(pm, cwd, cn, 'verify', stepsWithStale, 'in-progress')

    let stderr = ''
    const originalError = console.error
    console.error = (...args) => { stderr += args.join(' ') }
    try {
      await pm.completeStage(cwd, 'verify', cn)
    } finally {
      console.error = originalError
    }

    assert(stderr.includes('stale 步骤') || stderr.includes('被拒绝'), 'stderr 含拒绝信息')
    assert(stderr.includes('--force'), 'stderr 提示 --force 逃生门')
    assert(stderr.includes('执行验证') || stderr.includes('产出报告'), 'stderr 点名 stale 步骤名')

    const after = await pm.read(cwd, cn)
    assert(after.stages.verify.status !== 'completed', 'DB: 阶段未完成（仍 in-progress）')
    assert(after.stages.verify.steps.filter(s => s.status === 'stale').length === 2, 'DB: stale 保持未回填')
  }

  // 3b: 带 --force 放行
  {
    const { cwd, specBase } = makeRepo('stale-complete-with-force-')
    const cn = '2026-08-19-stale-complete-with-force'
    const pm = await initChange(cwd, specBase, cn)

    const stepsWithStale = [
      { name: '验证准备', status: 'completed', completedAt: '2026/08/19 14:00:00' },
      { name: '执行验证', status: 'stale', completedAt: '2026/08/19 14:30:00' },
      { name: '产出报告', status: 'stale', completedAt: '2026/08/19 15:00:00' },
    ]
    await seedStage(pm, cwd, cn, 'verify', stepsWithStale, 'in-progress')

    await pm.completeStage(cwd, 'verify', cn, { force: true })

    const after = await pm.read(cwd, cn)
    assert(after.stages.verify.status === 'completed', 'DB: force 推进阶段为 completed')
    assert(after.stages.verify.steps.filter(s => s.status === 'stale').length === 0, 'DB: stale 步骤已回填为 completed')

    const auditPath = join(specBase, '.runtime', 'audit.log')
    if (existsSync(auditPath)) {
      const lines = readFileSync(auditPath, 'utf8').trim().split('\n')
      const lastEntry = JSON.parse(lines[lines.length - 1])
      assert(lastEntry.action === 'complete-stage --force', 'audit.log action=complete-stage --force')
      assert(lastEntry.stage === 'verify', 'audit.log stage=verify')
    }
  }
}

// ── 场景 4：常规零介入：无 stale 时 --done 完成流程行为不变 ──
console.log('\n--- 场景 4：无 stale 时 --done 完成流程行为不变（零介入）---')
{
  const { cwd, specBase } = makeRepo('stale-none-happy-')
  const cn = '2026-08-19-stale-none-happy'
  const pm = await initChange(cwd, specBase, cn)
  seedBrainstormArtifacts(specBase, cn)

  const normalSteps = [
    { name: '进度确认', status: 'completed', completedAt: '2026/08/19 10:00:00' },
    { name: '加载项目上下文', status: 'completed', completedAt: '2026/08/19 11:00:00' },
    { name: '对话式探索与需求澄清', status: 'completed', completedAt: '2026/08/19 11:30:00' },
    { name: '提出 2-3 种方案', status: 'completed', completedAt: '2026/08/19 12:00:00' },
    { name: '分段展示设计', status: 'completed', completedAt: '2026/08/19 12:30:00' },
    { name: '写设计文档并自审', status: 'completed', completedAt: '2026/08/19 13:00:00' },
    { name: 'Design Grill 交叉审查', status: 'completed', completedAt: '2026/08/19 13:30:00' },
    { name: '生成规范文件', status: 'pending' },
  ]
  await seedStage(pm, cwd, cn, 'brainstorm', normalSteps, 'in-progress')

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '需求：test\n根因：无\n方案：test\n结果：test' })

  const hasStaleGateMarkers = r.combined.includes('stale 步骤') ||
                               r.combined.includes('两条出路') ||
                               r.combined.includes('--confirm')
  assert(!hasStaleGateMarkers, '输出不应触发 stale 门控特征（零介入）')
  assert(r.status === 0, `无 stale 常规完成应 exit 0（实际 ${r.status}）：${r.combined.slice(-300)}`)

  const after = await pm.read(cwd, cn)
  assert(after.stages.brainstorm.status === 'completed', 'DB: 阶段正常完成')
  assert(after.stages.brainstorm.steps.every(s => s.status === 'completed'), 'DB: 全部步骤 completed')
}

cleanup()
report(count.passed, count.failed, count.failures)
