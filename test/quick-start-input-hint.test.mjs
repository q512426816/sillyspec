/**
 * quick 启动缺 --input 的启动门（2026-08-20 实测踩坑：进行中条目平台不可见；2026-08-24 用户
 * 反馈二期①升级为拒绝启动，坑 quick-no-input-placeholder-title）
 *
 * 背景：quick 新会话不带 --input 且无可提取标题的关联变更时，旧行为落「(quick 任务)」占位
 * 标题 + 警告提示放弃重启——占位条目已落盘只能 reset 重来。现升级：新会话（刚生成 sessionId）
 * 缺 --input 且无 --linked-changes → 直接拒绝启动（exit 2），零沉没成本。
 *
 * 锁定语义：
 *   1. 新会话缺 --input（--linked-changes none）→ 拒绝启动 exit 2（含格式指引），QUICKLOG 不落占位条目
 *   2. 带 --input 启动 → 正常启动，QUICKLOG 条目标题 = 任务描述
 *   3. 关联变更 proposal.md 可提取标题 → 免 --input 也正常启动（deriveTitleFromLinkedChange 兜底）
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, runCLI, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const WARN_MARK = '本次 quick 未带 --input'

function readQuicklog(specBase) {
  return readFileSync(join(specBase, 'quicklog', 'QUICKLOG-test.md'), 'utf8')
}

console.log('=== quick 启动缺 --input 拒绝启动门 ===\n')

console.log('--- ① 新会话缺 --input → 拒绝启动（exit 2），不落占位条目 ---')
{
  const { cwd, specBase } = makeRepo('qs-input-blank-')
  const r = runCLI(['--dir', cwd, 'run', 'quick', '--linked-changes', 'none', '--non-interactive'], { cwd })
  assert(r.status === 2, `拒绝启动 exit 2（实际 ${r.status}，尾：${r.combined.slice(-160)}）`)
  assert(r.combined.includes('必须带 --input'), '报错点名必须带 --input')
  assert(r.combined.includes('(quick 任务)'), '报错说明占位标题后果')
  assert(r.combined.includes('--linked-changes'), '给出关联变更取标题的替代出路')
  assert(!existsSync(join(specBase, 'quicklog', 'QUICKLOG-test.md')) || !readQuicklog(specBase).includes('| (quick 任务)'),
    'QUICKLOG 未落占位标题条目（零沉没成本）')
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
