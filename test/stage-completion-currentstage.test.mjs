/**
 * 主阶段完成钉 currentStage 测试（troubleshooting #56 根因修复，2026-09-08）。
 *
 * 锁住：
 *  1. `run verify --done` 直达完成（不经裸 run 入口）后 DB currentStage === 'verify'
 *     （修复前：停留旧值 execute → 归档转换 checkTransition(execute→archive) 误拦）
 *  2. 完成后 `run archive` 转换不再被拦（verify→archive 放行）
 *  3. 辅助阶段完成不写 currentStage（quick/archive 完成不改主流程阶段）
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== 主阶段完成钉 currentStage（troubleshooting #56 修复）===\n')

console.log('--- ① verify 全 --done 完成后 currentStage=verify，归档转换放行 ---')
{
  const { cwd, specBase } = makeRepo('cs-fix-')
  const cn = '2026-09-08-cs-fix'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  // verify 前置产物 + 结论 PASS + 探针段（防 P3b 严格档拦——本变更 created_at 今日）
  writeFileSync(join(changeDir, 'design.md'), '# D\n\n## 目标\n\nt\n\n## 文件变更清单\n| 操作 | 文件路径 |\n|---|---|\n')
  writeFileSync(join(changeDir, 'plan.md'), '# P\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'verify-result.md'),
    '---\nauthor: t\ncreated_at: 2026-09-08 00:00:00\n---\n# 验证报告\n\n## 结论\n\nPASS\n\n#### 探针 1：未实现标记扫描（design 清单文件）\n- ✅ 无命中\n')
  // currentStage 故意停在 execute（复现 #56 前置态），verify 末步 pending
  const p = await pm.read(cwd, cn)
  p.currentChange = cn; p.currentStage = 'execute'
  p.stages.execute = { status: 'completed', startedAt: '2026/9/8', completedAt: '2026/9/8', steps: [{ name: 'x', status: 'completed' }] }
  const VERIFY_STEPS = ['进度确认', '加载规范并锚定', '逐项检查任务', '对照设计检查', '任务蓝图验收', '运行测试和质量扫描', '输出验证报告']
  p.stages.verify = { status: 'in-progress', startedAt: '2026/9/8', completedAt: null, steps: VERIFY_STEPS.map((n, i) => ({ name: n, status: i < 6 ? 'completed' : 'pending' })) }
  await pm._write(cwd, p, cn)

  // 末步 --done（直达完成，不经裸 run verify 入口）
  const r = runStage('verify', cn, cwd, { done: true, output: '末步完成' })
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.verify?.status === 'completed', `verify 阶段完成（exit ${r.status}；状态 ${after.stages.verify?.status}）`)
  assert(after.currentStage === 'verify', `currentStage 钉到 verify（实际 ${after.currentStage}）——修复前停留 execute`)

  // 归档转换放行（修复前此处 execute→archive 拦截）
  const ra = runCLI(['--dir', cwd, 'run', 'archive', '--change', cn], { cwd })
  assert(!ra.combined.includes('阶段转换不允许'), `归档转换不再被拦（输出尾：${ra.combined.slice(-60)}）`)
}

console.log('\n--- ② 辅助阶段完成不写 currentStage ---')
{
  const { cwd, specBase } = makeRepo('cs-aux-')
  const cn = '2026-09-08-cs-aux'
  const pm = await initChange(cwd, specBase, cn)
  const p = await pm.read(cwd, cn)
  p.currentChange = cn; p.currentStage = 'verify'  // 主流程停在 verify
  p.stages.verify = { status: 'completed', startedAt: '2026/9/8', completedAt: '2026/9/8', steps: [{ name: 'x', status: 'completed' }] }
  p.stages.quick = { status: 'in-progress', startedAt: '2026/9/8', completedAt: null, steps: [
    { name: '理解任务', status: 'completed' }, { name: '实现并验证', status: 'completed' }, { name: '暂存和更新记录', status: 'pending' }] }
  await pm._write(cwd, p, cn)
  runStage('quick', cn, cwd, { done: true, output: '需求：x 根因：y 方案：z 结果：t 全过' })
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.currentStage === 'verify', `quick（辅助）完成不改 currentStage（实际 ${after.currentStage}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
