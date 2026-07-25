/**
 * completeStep characterization — verify 阶段收尾（产物校验 + verify-test 对账）
 *
 * 锁住 completeStep 内 verify 分支（run.js:3598-3612 + validateVerifyOutputs）的现有行为：
 *   - happy：verify-result.md 结论 PASS + design/plan 齐全 + 无 local.yaml（verify-test
 *     对账 skipped 不阻断）→ 阶段完成，stdout「验证通过，下一步：sillyspec run archive」
 *   - rollback：verify-result.md 结论 FAIL → runValidators 失败 → 统一回滚（status 回退、
 *     末步 pending、nextPendingIdx=6），与 brainstorm rollback 同一骨架
 *
 * 断言三件套：DB（status）+ stdout（验证通过 / 校验失败）+ 返回值。
 */
import { writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { _completeStepForTest } from '../src/run.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const VERIFY_STEPS = [
  '状态检查', '加载规范并锚定', '逐项检查任务', '对照设计检查',
  '任务蓝图验收', '运行测试和质量扫描', '输出验证报告',
]
function verifyStepsWithLastPending() {
  return VERIFY_STEPS.map((name, i) => ({
    name, status: i < VERIFY_STEPS.length - 1 ? 'completed' : 'pending',
  }))
}
function writeCoreDocs(changeDir, conclusion) {
  writeFileSync(join(changeDir, 'design.md'),
    `# Design: 列表排序\n\n## 背景\n列表需默认最新在前。\n\n## 总体方案\nservice 兜底。\n\n## 决策\nD-001@v1: 直接改。\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/list.js | 排序 |\n`)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'verify-result.md'),
    `# 验证报告\n\n## 结论\n\n${conclusion}\n\n所有任务通过。\n`)
}

console.log('=== completeStep characterization: verify 收尾 ===\n')

// ── Case 1: verify-result.md 结论 PASS + 无 local.yaml → 阶段完成 ──
console.log('--- 结论 PASS + 无 local.yaml → 验证通过 ---')
{
  const { cwd, specBase } = makeRepo('cs-verify-ok-')
  const cn = '2026-07-25-verify-ok'
  const pm = await initChange(cwd, specBase, cn)
  writeCoreDocs(join(specBase, 'changes', cn), 'PASS')
  const progress = await seedStage(pm, cwd, cn, 'verify', verifyStepsWithLastPending())

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'verify', cwd, '报告已输出', null,
      { changeName: cn, printNext: false }))

  assert(!r.error, 'verify happy 不应 process.exit')
  assert(r.result && r.result.stageCompleted === true, 'stageCompleted:true')
  assert(r.result && r.result.nextPendingIdx === -1, 'nextPendingIdx:-1')
  assert(r.stdout.includes('验证通过，下一步：sillyspec run archive'), 'stdout 含「验证通过，下一步：archive」')

  const after = await pm.read(cwd, cn)
  assert(after.stages.verify.status === 'completed', 'DB: stage.status=completed')
}

// ── Case 2: verify-result.md 结论 FAIL → runValidators 失败 → 统一回滚 ──
console.log('\n--- 结论 FAIL → 校验失败回滚 ---')
{
  const { cwd, specBase } = makeRepo('cs-verify-fail-')
  const cn = '2026-07-25-verify-fail'
  const pm = await initChange(cwd, specBase, cn)
  writeCoreDocs(join(specBase, 'changes', cn), 'FAIL')
  const progress = await seedStage(pm, cwd, cn, 'verify', verifyStepsWithLastPending())

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'verify', cwd, '报告已输出', null,
      { changeName: cn, printNext: false }))

  assert(!r.error, 'FAIL 回滚不应 process.exit（优雅 return）')
  assert(r.result && r.result.stageCompleted === false, 'stageCompleted:false（被回滚）')
  assert(r.result && r.result.nextPendingIdx === 6, 'nextPendingIdx=6（回退末步）')
  assert(r.stdout.includes('阶段 verify 校验失败'), 'stdout 含「阶段 verify 校验失败」')
  assert(r.stdout.includes('FAIL'), 'stdout 点名 FAIL 结论')

  const after = await pm.read(cwd, cn)
  assert(after.stages.verify.status !== 'completed', 'DB: stage.status 已回滚（非 completed）')
  assert(after.stages.verify.steps[6].status === 'pending', 'DB: 末步回退 pending')
}

cleanup()
report(count.passed, count.failed, count.failures)
