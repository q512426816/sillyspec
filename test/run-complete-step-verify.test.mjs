/**
 * verify 阶段收尾 CLI 行为测试（run verify --done）。
 *
 * 从 _completeStepForTest 内部函数迁移为 CLI 子进程测试。注意：verify 校验失败（FAIL 结论
 * 或缺产物）走统一回滚 rollbackCompletionAndReturn——它优雅 return {stageCompleted:false}，
 * 不 process.exit。故 CLI 退出码恒 0，失败与否靠 DB 状态（stage 未 completed + 末步回退 pending）
 * + stdout（「阶段 verify 校验失败」/「FAIL」）区分，而非退出码。
 *
 * 锁住的行为：
 *   - happy：verify-result.md 结论 PASS + design/plan 齐全 + 无 local.yaml（verify-test 对账
 *     skipped 不阻断）→ 阶段完成，stdout「验证通过，下一步：sillyspec run archive」
 *   - rollback：verify-result.md 结论 FAIL → runValidators 失败 → 统一回滚（status 回退、末步 pending）
 *   - 删除探针 advisory：声明修改却整文件删除 → warning 但不阻断（仍 completed）
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

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
    '# Design: 列表排序\n\n## 背景\n列表需默认最新在前。\n\n## 总体方案\nservice 兜底。\n\n## 决策\nD-001@v1: 直接改。\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/list.js | 排序 |\n')
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'verify-result.md'),
    `# 验证报告\n\n## 结论\n\n${conclusion}\n\n所有任务通过。\n`)
}

// 让 CLI 初始化 verify 步骤 schema，再 seedStage 覆盖为末步 pending。
async function seedVerifyToLast(cwd, specBase, cn) {
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'verify', '--change', cn], { cwd })
  return seedStage(pm, cwd, cn, 'verify', verifyStepsWithLastPending())
}

console.log('=== verify 收尾 CLI 行为 ===\n')

// ── Case 1: verify-result.md 结论 PASS + 无 local.yaml → 阶段完成 ──
console.log('--- 结论 PASS + 无 local.yaml → 验证通过 ---')
{
  const { cwd, specBase } = makeRepo('cli-verify-ok-')
  const cn = '2026-07-25-verify-ok'
  await seedVerifyToLast(cwd, specBase, cn)
  writeCoreDocs(join(specBase, 'changes', cn), 'PASS')

  const r = runStage('verify', cn, cwd, { done: true, output: '报告已输出' })

  assert(r.status === 0, `exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-120)}）`)
  assert(r.combined.includes('验证通过，下一步：sillyspec run archive') || r.combined.includes('验证通过'), 'stdout 含「验证通过，下一步：archive」')

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.verify.status === 'completed', 'DB: stage.status=completed')
}

// ── Case 2: verify-result.md 结论 FAIL → runValidators 失败 → 统一回滚 ──
console.log('\n--- 结论 FAIL → 校验失败回滚（CLI exit 0，靠 DB + stdout 判定）---')
{
  const { cwd, specBase } = makeRepo('cli-verify-fail-')
  const cn = '2026-07-25-verify-fail'
  await seedVerifyToLast(cwd, specBase, cn)
  writeCoreDocs(join(specBase, 'changes', cn), 'FAIL')

  const r = runStage('verify', cn, cwd, { done: true, output: '报告已输出' })
  const pm = new ProgressManager({ specDir: specBase })

  // 回滚走优雅 return（不 process.exit），CLI 退出码 0——失败与否靠 DB + stdout
  assert(r.combined.includes('阶段 verify 校验失败') || r.combined.includes('校验失败'), 'stdout 含「阶段 verify 校验失败」')
  assert(r.combined.includes('FAIL'), 'stdout 点名 FAIL 结论')

  const after = await pm.read(cwd, cn)
  assert(after.stages.verify.status !== 'completed', 'DB: stage.status 已回滚（非 completed）')
  assert(after.stages.verify.steps[6].status === 'pending', 'DB: 末步回退 pending')
}

// ── Case 3: 删除探针 advisory——声明修改却整文件删除 → warning 但不阻断 ──
console.log('\n--- 删除探针 advisory：声明修改却删除 → warning 不阻断 ---')
{
  const { cwd, specBase } = makeRepo('cli-verify-del-')
  const cn = '2026-07-31-verify-del'
  // commit src/list.js（基线含它），再工作树删除 → git diff --name-status HEAD 显示 D src/list.js
  // （apply 不 commit，删除文件在工作树消失但仍在 HEAD；design.md 在 .sillyspec/ 被 gitignore，不污染 diff）
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'list.js'), 'export const sort = () => {}\n')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'add list.js'])
  rmSync(join(cwd, 'src', 'list.js'))
  await seedVerifyToLast(cwd, specBase, cn)
  writeCoreDocs(join(specBase, 'changes', cn), 'PASS') // design 声明「修改 src/list.js」

  const r = runStage('verify', cn, cwd, { done: true, output: '报告已输出' })

  assert(r.status === 0, `删除 warning exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-120)}）`)
  assert(r.combined.includes('删除对账发现') && r.combined.includes('高风险'), 'stdout 含删除对账高风险 warning')
  assert(r.combined.includes('验证通过，下一步：sillyspec run archive') || r.combined.includes('验证通过'), 'stdout 仍含「验证通过」（advisory 不阻断归档）')

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.verify.status === 'completed', 'DB: stage.status=completed（删除 warning 不回滚）')
}

cleanup()
report(count.passed, count.failed, count.failures)
