/**
 * 回归测试：brainstorm-wait-and-review-path-pitfalls.md 坑1 + 坑3
 *
 * 坑1：--done --answer 落到「已 waiting 的 requiresWait 步骤」必须解掉它
 *   历史 bug：completeStep currentIdx=findIndex(pending||in-progress) 排除 waiting，--done --answer
 *   跳过 waiting 步骤、--answer 静默丢失、步骤永久卡 WAITING、末步报「Step N 等待用户输入」无法 finish。
 *   修复：doneAnswer + 存在 waiting 步骤时，resolveWaitingStepWithAnswer 把首个 waiting 拉回 pending + 补 waitAnswer。
 *
 * 坑3：tier=self 提示不再硬承诺「无需 review.json」
 *   历史 bug：prompt 渲染时 design.md 文件清单可能未补全→fileCount=0→误判 self；gate 以 --done 时刻
 *   design.md 重判可升级 independent 硬要 review.json（TOCTOU）。修复：self 提示改为非承诺式，注明以 gate 为准。
 */
import { resolveWaitingStepWithAnswer } from '../src/run/complete.js'
import { renderReviewJsonContract } from '../src/stage-review.js'
import { makeRepo, initChange, seedStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== 坑1：resolveWaitingStepWithAnswer 纯函数 ===\n')

console.log('--- waiting 步骤被拉回 pending + 补 waitAnswer ---')
{
  const steps = [
    { name: 'a', status: 'completed' },
    { name: 'b', status: 'waiting', waitReason: '确认', waitRound: 0 },
    { name: 'c', status: 'pending' },
  ]
  const idx = resolveWaitingStepWithAnswer(steps, '用户回答', '2026/8/2 18:00:00')
  assert(idx === 1, '返回 waiting 步骤 idx=1')
  assert(steps[1].status === 'pending', 'waiting→pending（回当前步骤待主流程完成）')
  assert(steps[1].waitAnswer === '用户回答', 'waitAnswer 已补')
  assert(Array.isArray(steps[1].waitAnswers) && steps[1].waitAnswers.length === 1, 'waitAnswers 记一轮')
  assert(steps[1].waitAnswers[0].answer === '用户回答', 'waitAnswers[0].answer 正确')
  assert(steps[1].waitAnswers[0].round === 1, 'waitAnswers[0].round 自增')
  assert(!('waitReason' in steps[1]) && !('waitedAt' in steps[1]), 'waitReason/waitedAt 已清')
  assert(steps[1].completedAt === null, 'completedAt=null')
}

console.log('--- 无 waiting 步骤 → -1（不改任何步骤）---')
{
  const steps = [{ name: 'a', status: 'completed' }, { name: 'b', status: 'pending' }]
  const idx = resolveWaitingStepWithAnswer(steps, '回答', 'now')
  assert(idx === -1, '无 waiting 返回 -1')
  assert(steps[1].status === 'pending', 'pending 步骤未被改')
}

console.log('--- 无 doneAnswer → -1（普通 --done 不触发）---')
{
  const steps = [{ name: 'a', status: 'waiting', waitReason: '确认' }]
  assert(resolveWaitingStepWithAnswer(steps, null, 'now') === -1, 'null answer 返回 -1')
  assert(resolveWaitingStepWithAnswer(steps, undefined, 'now') === -1, 'undefined answer 返回 -1')
  assert(resolveWaitingStepWithAnswer(steps, '', 'now') === -1, '空串 answer 返回 -1')
  assert(steps[0].status === 'waiting', 'waiting 步骤未被改（普通 --done 不动）')
}

console.log('--- 多个 waiting → 仅解首个（余者需再次 --done --answer）---')
{
  const steps = [
    { name: 'a', status: 'waiting', waitReason: 'x' },
    { name: 'b', status: 'waiting', waitReason: 'y' },
  ]
  const idx = resolveWaitingStepWithAnswer(steps, '回答', 'now')
  assert(idx === 0, '多 waiting 解首个 idx=0')
  assert(steps[0].status === 'pending', '首个 waiting→pending')
  assert(steps[1].status === 'waiting', '第二个 waiting 不动')
}

console.log('\n=== 坑1 端到端：CLI --done --answer 解 brainstorm 已 waiting 的 requiresWait 步骤 ===\n')
{
  const { cwd, specBase } = makeRepo('cli-wait-done-')
  const cn = '2026-08-02-wait-done-fix'
  const pm = await initChange(cwd, specBase, cn)
  // 先让 CLI 初始化 brainstorm 步骤 schema，拿真实步骤名
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const realNames = (await pm.read(cwd, cn)).stages.brainstorm.steps.map(s => s.name)
  const designIdx = realNames.findIndex(n => n.includes('分段展示设计'))
  // step「分段展示设计」（requiresWait）处于 waiting；前序 completed，后续 pending
  const steps = realNames.map((name, i) => {
    if (i < designIdx) return { name, status: 'completed' }
    if (i === designIdx) return { name, status: 'waiting', waitReason: '分段确认', waitRound: 0 }
    return { name, status: 'pending' }
  })
  await seedStage(pm, cwd, cn, 'brainstorm', steps)

  // --answer 用该 step 的合法预设选项「确认」（wait-choice-enforcement 起封闭单选强制；
  // 本用例聚焦 --done --answer 解 waiting 机制本身，answer 取合法选项不改变被测行为）
  const r = runCLI(['--dir', cwd, 'run', 'brainstorm', '--done', '--answer', '确认', '--change', cn, '--output', '分段展示完成'], { cwd })

  assert(r.status === 0, `不应非零退出（历史 bug：waiting 步骤会让流程卡住）（实际 ${r.status}）`)
  assert(!r.combined.includes('等待用户输入'), '不应报「等待用户输入」（历史 bug 末步症状）')
  assert(r.combined.includes('已补回答并拉回待完成') || r.combined.includes('拉回'), 'stdout 含修复提示')

  const after = await pm.read(cwd, cn)
  const sDesign = after.stages.brainstorm.steps[designIdx]
  assert(sDesign.status === 'completed', '「分段展示设计」waiting→completed')
  assert(sDesign.waitAnswer === '确认', 'waitAnswer 已补为 --answer 值')
  // 后续步骤保持 pending（本次 --done 只解该步，不越权推进）
  assert(after.stages.brainstorm.steps[designIdx + 1].status === 'pending', '下一步仍 pending（未越权推进）')
}

console.log('\n=== 坑3：renderReviewJsonContract tier=self 提示含 TOCTOU 警告 ===\n')
{
  const md = renderReviewJsonContract({ stage: 'brainstorm', changeDir: 'changes/x', reviewRunId: 'review-t', tier: 'self' })
  assert(md.includes('tier=self'), '仍标 tier=self（不破坏现有 happy-path 断言）')
  assert(md.includes('≤3'), '注明判定阈值（变更文件数 ≤3）')
  assert(md.includes('--done'), '提及 gate 以 --done 时刻重判')
  assert(md.includes('independent'), '提示可能升级 independent')
  assert(md.includes('以 gate') || md.includes('以 Stage Review Gate'), '明确以 gate 实际校验为准')
}

cleanup()
report(count.passed, count.failed, count.failures)
