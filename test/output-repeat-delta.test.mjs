/**
 * FR-02（2026-10-21-protocol-tax）：同一步骤重复进入的增量渲染面。
 *
 * 背景澄清（2026-10-21 实测）：复入压缩已由 2026-09-21-r5-efficiency-batch2 落地
 * （reentryHit + .runtime/step-guide-state/ 变更级台账 + 指纹匹配），本测试冻结其对外
 * 契约，防止后续改动回归（本变更 task-03 裁决：复用既有机制，无新增实现面——D-001）。
 *
 * 锁定行为：
 *   1. 同步骤第二次渲染：首屏 <60 行、含「步骤指引未变」锚引用行（guide 全文路径）、
 *      不含首见全量标志（无「### 🎯 你的角色」角色全文段）
 *   2. 步骤推进后再渲染：恢复全量渲染（无「步骤指引未变」行、行数显著大于复入形态）
 *
 * 风格：_cli-step-harness 子进程 CLI（同 run-complete-step-brainstorm 模式）。
 */
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const BRAINSTORM_STEPS = [
  '进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
  '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件',
]
const stepsWith = (doneCount) => BRAINSTORM_STEPS.map((name, i) => ({
  name, status: i < doneCount ? 'completed' : 'pending',
}))

const stdoutLines = (s) => s.split('\n').filter((l) => l !== '')

console.log('=== FR-02 重复渲染增量面（复用既有 reentryHit，冻结契约）===\n')

console.log('--- Case 1: 同步骤重复渲染 → <60 行 + 锚引用 + 无全量角色段 ---')
{
  const { cwd, specBase } = makeRepo('cli-repeat-1-')
  const cn = '2026-07-25-repeat-demo'
  const pm = await initChange(cwd, specBase, cn)
  // 种到「加载项目上下文」pending（step0 已完成——避开 auto-advance 干扰）
  await seedStage(pm, cwd, cn, 'brainstorm', stepsWith(1))

  const first = runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const second = runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })

  assert(first.status === 0 && second.status === 0, `两次渲染均 exit 0（${first.status}/${second.status}）`)
  const secondLines = stdoutLines(second.stdout)
  assert(secondLines.length < 60, `重复渲染首屏 <60 行（实际 ${secondLines.length}）`)
  assert(second.stdout.includes('步骤指引未变'), '含「步骤指引未变」锚引用行')
  assert(/step-guides[\\/][^\s]+\.md/.test(second.stdout), '锚引用给出 guide 全文路径')
  assert(!second.stdout.includes('## 完成契约'), '重复渲染不再重印首见静态全文（完成契约段只在全量形态）')
  assert(stdoutLines(first.stdout).length > secondLines.length, `首见渲染行数大于复入（${stdoutLines(first.stdout).length} vs ${secondLines.length}）`)
}

console.log('--- Case 2: 步骤推进后再渲染 → 恢复全量 ---')
{
  const { cwd, specBase } = makeRepo('cli-repeat-2-')
  const cn = '2026-07-25-repeat-advance'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm', stepsWith(1))
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd }) // 首见
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd }) // 复入

  // 推进一步：step1 完成、step2 pending（直接翻 DB——与 seedStage 同款注入路径）
  const pm2 = new ProgressManager({ specDir: specBase })
  const progress = await pm2.read(cwd, cn)
  progress.currentChange = cn
  progress.stages.brainstorm.steps = stepsWith(2)
  await pm2._write(cwd, progress, cn)

  const next = runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  assert(next.status === 0, `换步渲染 exit 0（实际 ${next.status}）`)
  assert(!next.stdout.includes('步骤指引未变'), '换步渲染恢复全量（无复入短路行）')
  const nextLines = stdoutLines(next.stdout)
  assert(nextLines.length > 20, `全量渲染行数显著（实际 ${nextLines.length}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
