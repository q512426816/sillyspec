/**
 * 防回归测试：失败行账本去噪（2026-09-16-friction5-hardening verify 移交项②实证）。
 *
 * 事故形态：noAI 质量扫描的「未豁免失败行」账本把三类非失败行计入——
 * ①✅ 前缀通过行（本仓自定义 harness 的「✅ PASS: <断言名>」——断言名高频含 fail-closed/
 *   failed/×3 乘号，✅ 不在 PASS_LINE_RE 标记集内整行落子串命中）；
 * ②CLI advisory 行（⚠️ warn/ℹ️ info/🔄 进度前缀——gate-snapshot 冒烟 warn 正文含
 *   ModuleNotFoundError 被命中）；
 * ③fail-<x> 工具词汇（\bFAIL\b i 标志命中「（fail-closed）」「--- fail-open 三态 ---」）。
 * 一轮 verify 实测 20/27 未豁免行为此噪声，known_failures 无法逐条枚举。
 *
 * 修复口径（partitionFailures）：PASS_LINE_RE 补 ✅ / 新增 ADVISORY_LINE_RE 行首剔 /
 * FAIL_COMPOUND_NEUTRALIZE_RE 判账前中和——真失败词（FAILED/AssertionError/error:/×/❌/--- FAIL）
 * 不受影响，漏检由 judgeWithKnownFailures fail-safe（检测不到失败行不判 pass）兜底。
 */
import { partitionFailures, judgeWithKnownFailures } from '../src/verify-postcheck.js'

let passed = 0
let failed = 0

function assert(name, cond, detail = '') {
  if (cond) {
    console.log(`✅ PASS: ${name}`)
    passed++
  } else {
    console.error(`❌ FAIL: ${name}${detail ? `（${detail}）` : ''}`)
    failed++
    process.exitCode = 1
  }
}

// 事故噪声行（verify 实测原文誊抄）
const NOISE_LINES = [
  '  ✅ PASS: 命中≥1 → covered ×3（t1×2 + t2）（实际 3）',
  '  ✅ PASS: 有归属零命中 → partial ×1（task-05）',
  '  ✅ PASS: 已完成条目拒绝取消（fail-closed）',
  '  ✅ PASS: 退出码 1 → failed（实际 failed）',
  '  ✅ PASS: 坏 ref → null（git 异常 fail-open）',
  '  ✅ PASS: fail-soft 仍清占位符（无残留）',
  '  ✅ 通过: 21  ❌ 失败: 0',
  '✅ PASS: 改写后 getMeta 读取 depsStatus=failed',
  '⚠️ 快照 overlay 冒烟：backend/mod_b.py import 失败（ModuleNotFoundError: No module named \'mod_a\'）——已回退 HEAD 版',
  'ℹ️ 门禁快照：主仓未发现任何环境目录',
  '🔄 deps 门控：depsStatus=failed，阻断前按 --done 重试路径重供给一次（与 doctor --fix 同款）...',
  '[sillyspec] 归因注记：不可归因（worktree 已清理）——DB 判 worktree 但分支 ref 不存在，fail-closed 空集，不回退主仓窗口',
  '--- 1.3 fail-open 三态 ---',
  '坑 fail-safe 策略：默认空集',
]

// 真失败行（各框架/自研 harness 形态——修复后必须照常计入）
const REAL_FAIL_LINES = [
  '❌ FAIL: add frontend 建档',
  "Error: ENOENT: no such file or directory, open 'C:\\ws-x\\.sillyspec\\projects\\frontend.yaml'",
  '✕ test/foo.test.mjs > sub > case name',
  'AssertionError: expected fail-closed guard, got fail-open pass-through',
  '--- FAIL: TestDuplicateKeyGuard (0.00s)',
  '× vitest 失败标记行',
  'FAILED tests/unit/a.spec.ts',
]

console.log('--- 1. 噪声行零计入 ---')
{
  const { failureLines } = partitionFailures(NOISE_LINES.join('\n'), [])
  assert(`事故噪声 ${NOISE_LINES.length} 行全部不计入失败行`, failureLines.length === 0,
    `误收=${JSON.stringify(failureLines)}`)
}

console.log('--- 2. 真失败行照常计入 ---')
{
  const { failureLines } = partitionFailures(REAL_FAIL_LINES.join('\n'), [])
  assert(`真失败 ${REAL_FAIL_LINES.length} 行全部计入`, failureLines.length === REAL_FAIL_LINES.length,
    `实收=${failureLines.length}：${JSON.stringify(failureLines)}`)
}

console.log('--- 3. 混合输出只收真失败（含 fail-compound 断言消息行不丢）---')
{
  const mixed = [...NOISE_LINES, ...REAL_FAIL_LINES].join('\n')
  const { failureLines } = partitionFailures(mixed, [])
  assert('混合场景噪声剔净、真失败全收', failureLines.length === REAL_FAIL_LINES.length,
    `实收=${failureLines.length}`)
}

console.log('--- 4. known_failures 豁免在去噪后照常工作 ---')
{
  const { exempted, remaining } = partitionFailures(REAL_FAIL_LINES.join('\n'), ['add frontend 建档'])
  assert('豁免命中 1 条（add frontend 建档）', exempted.length === 1, `exempted=${exempted.length}`)
  assert('未豁免剩 6 条', remaining.length === REAL_FAIL_LINES.length - 1, `remaining=${remaining.length}`)
}

console.log('--- 5. fail-safe 兜底不变：纯噪声 + exit≠0 仍判 failed（检测不到失败行绝不自动 pass）---')
{
  const judged = judgeWithKnownFailures(1, NOISE_LINES.join('\n'), 'exit 1', ['whatever'])
  assert('纯噪声输出 + exit 1 → status=failed（保守兜底）', judged.status === 'failed', `status=${judged.status}`)
}

console.log('--- 6. 既有通过行口径零回归（✓/√/✔/PASS 前缀仍剔，含 failed 字样的通过用例名）---')
{
  const legacy = ['✓ 超时后 syncStatus=failed 仍重试', '√ case ok', '✔ another pass', 'PASS src/__tests__/ok.test.js']
  const { failureLines } = partitionFailures(legacy.join('\n'), [])
  assert('既有通过标记集照常剔除', failureLines.length === 0, `误收=${JSON.stringify(failureLines)}`)
}

console.log(`\n==================================================`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failed > 0) process.exit(1)
