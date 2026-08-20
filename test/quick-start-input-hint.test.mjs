/**
 * quick 启动缺 --input 的占位标题提示（2026-08-20 实测踩坑：进行中条目平台不可见）
 *
 * 背景：quick 启动不带 --input 且无可提取标题的关联变更时，QUICKLOG 条目落「(quick 任务)」
 * 占位标题；平台「快速修复」列表默认隐藏进行中的占位条目（task-06 口径），长会话全程平台
 * 不可见，用户误判为同步故障。
 *
 * 锁定语义：
 *   1. 缺 --input 启动 → 警告出现（点名占位标题后果 + 给带 --input 重启指引）
 *   2. 带 --input 启动 → 无警告，QUICKLOG 条目标题 = 任务描述
 *   3. 关联变更 proposal.md 可提取标题 → 免 --input 也不警告（deriveTitleFromLinkedChange 兜底）
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, runCLI, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const WARN_MARK = '本次 quick 未带 --input'

function readQuicklog(specBase) {
  return readFileSync(join(specBase, 'quicklog', 'QUICKLOG-test.md'), 'utf8')
}

console.log('=== quick 启动缺 --input 占位标题提示 ===\n')

console.log('--- ① 缺 --input 启动 → 占位标题警告 + 重启指引 ---')
{
  const { cwd, specBase } = makeRepo('qs-input-blank-')
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--linked-changes', 'none', '--non-interactive'], { cwd })
  assert(r.status === 0, `启动成功（实际 ${r.status}，尾：${r.combined.slice(-120)}）`)
  assert(r.combined.includes(WARN_MARK), '警告点名缺 --input')
  assert(r.combined.includes('(quick 任务)'), '警告说明占位标题后果')
  assert(r.combined.includes('run quick --input'), '给带 --input 重启指引')
  assert(readQuicklog(specBase).includes('| (quick 任务)'), 'QUICKLOG 实落占位标题')
}

console.log('\n--- ② 带 --input 启动 → 无警告，标题即任务描述 ---')
{
  const { cwd, specBase } = makeRepo('qs-input-set-')
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--linked-changes', 'none', '--non-interactive', '--input', '修复登录限流计数误清'], { cwd })
  assert(r.status === 0, `启动成功（实际 ${r.status}）`)
  assert(!r.combined.includes(WARN_MARK), '语义标题在手，不出占位警告')
  assert(readQuicklog(specBase).includes('修复登录限流计数误清'), 'QUICKLOG 标题 = 任务描述')
}

console.log('\n--- ③ 关联变更 proposal 有标题 → 免传不警告（兜底提取） ---')
{
  const { cwd, specBase } = makeRepo('qs-input-link-')
  mkdirSync(join(specBase, 'changes', '2026-08-20-linked-fix'), { recursive: true })
  writeFileSync(join(specBase, 'changes', '2026-08-20-linked-fix', 'proposal.md'), '# 关联变更语义标题\n\n背景略\n')
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--linked-changes', '2026-08-20-linked-fix', '--non-interactive'], { cwd })
  assert(r.status === 0, `启动成功（实际 ${r.status}）`)
  assert(!r.combined.includes(WARN_MARK), '关联变更标题已提取，不出占位警告')
  assert(readQuicklog(specBase).includes('关联变更语义标题'), 'QUICKLOG 标题 = proposal 首个 # 标题')
}

cleanup()
report(count.passed, count.failed, count.failures)
