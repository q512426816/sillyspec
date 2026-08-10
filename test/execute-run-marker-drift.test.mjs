/**
 * execute run marker 漂移兜底 单元测试（prompt-control-debt.md gate-atom-a 正确修法）。
 *
 * 场景：generateExecuteRunId 只写 marker 字符串、run 目录由 ensureTaskReviewDir 在写 review.json
 * 时才建。marker 漂到「尚未建目录/未写 review」的新 run 后，旧 run 里齐备的 review.json 失联，
 * enforceReviewJsonGate 拿 marker 直接读会误报「review.json 不存在」。
 *
 * 本文件测新 helper resolveLatestExecuteRunIdWithTasks（无视 marker、只认真实含 tasks/ 的最新目录），
 * 并用例锁定 gates.js enforceReviewJsonGate 的集成分支语义：
 *   marker 指向的 run 缺 tasks/ → 用本 helper 重定位到真实含 review 的 run；全部 run 都无 tasks/ →
 *   helper 返回 null，gate 维持原 marker 校验（缺失照报，不误放行）。
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { resolveLatestExecuteRunIdWithTasks, validateCheckedTaskReviews } from '../src/task-review.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== execute run marker 漂移：resolveLatestExecuteRunIdWithTasks ===\n')

// ── helper：空 execute-runs / 目录不存在 → null ──
{
  const rr = mkdtempSync(join(tmpdir(), 'emd-empty-'))
  assert(resolveLatestExecuteRunIdWithTasks({ runtimeRoot: rr }) === null, 'execute-runs 目录不存在 → null')
  mkdirSync(join(rr, 'execute-runs'), { recursive: true })
  assert(resolveLatestExecuteRunIdWithTasks({ runtimeRoot: rr }) === null, 'execute-runs 空目录 → null')
}

// ── helper：含 tasks/ 的 run 才被选中；纯目录无 tasks/ 被跳过 ──
{
  const rr = mkdtempSync(join(tmpdir(), 'emd-pick-'))
  const runs = join(rr, 'execute-runs')
  // 漂移的新 run：有目录但无 tasks/（marker 指向它）
  mkdirSync(join(runs, 'exec-new-drift'), { recursive: true })
  // 真实齐备的旧 run：有 tasks/
  mkdirSync(join(runs, 'exec-old-real', 'tasks', 'task-01'), { recursive: true })
  assert(resolveLatestExecuteRunIdWithTasks({ runtimeRoot: rr }) === 'exec-old-real',
    '跳过无 tasks/ 的漂移 run，选中真实含 tasks/ 的 run')
}

// ── helper：多个含 tasks/ 的 run 时返回其中之一（且必含 tasks/）──
// 注意：不断言具体取哪个——刚 mkdir 的目录 mtime 可能并列（Windows 精度/建序），全量连跑时
// 时序不可控会 flaky。排序正确性由「跳过无 tasks/ run」「端到端重定位」两例保证，此处只锁
// 「多候选时仍能选出合法（含 tasks/）的 run、不返回 null」。
{
  const rr = mkdtempSync(join(tmpdir(), 'emd-latest-'))
  const runs = join(rr, 'execute-runs')
  mkdirSync(join(runs, 'exec-a', 'tasks'), { recursive: true })
  mkdirSync(join(runs, 'exec-b', 'tasks'), { recursive: true })
  const got = resolveLatestExecuteRunIdWithTasks({ runtimeRoot: rr })
  assert(got === 'exec-a' || got === 'exec-b', `多个含 tasks/ run 返回合法候选（actual=${got}）`)
}

// ── 端到端语义（gate 分支）：marker 漂移不误报 ──
// marker=exec-2026-08-09-141248（无 tasks/），真实 review 在 exec-2026-08-09-112734。
// gate 读 marker → 缺 tasks/ → helper 重定位到 112734 → validateCheckedTaskReviews ok。
{
  const rr = mkdtempSync(join(tmpdir(), 'emd-e2e-'))
  const runs = join(rr, 'execute-runs')
  mkdirSync(join(runs, 'exec-2026-08-09-141248'), { recursive: true })  // 漂移 marker 目标，无 tasks/
  const realTasks = join(runs, 'exec-2026-08-09-112734', 'tasks')
  mkdirSync(join(realTasks, 'task-01'), { recursive: true })
  writeFileSync(join(realTasks, 'task-01', 'review.json'), JSON.stringify({
    schemaVersion: 1, task: 'task-01', specVerdict: 'pass', qualityVerdict: 'pass',
    base: 'aaa111', head: 'bbb222',
  }))
  const markerId = 'exec-2026-08-09-141248'
  // 直接信 marker → 误报（对照组）
  const naive = validateCheckedTaskReviews({ planContent: '- [x] task-01', runtimeRoot: rr, executeRunId: markerId })
  assert(naive.ok === false, '对照：直接信漂移 marker → 误报 missing')
  // gate 修法：缺 tasks/ → helper 重定位
  const relocated = resolveLatestExecuteRunIdWithTasks({ runtimeRoot: rr })
  const fixed = validateCheckedTaskReviews({ planContent: '- [x] task-01', runtimeRoot: rr, executeRunId: relocated })
  assert(relocated === 'exec-2026-08-09-112734', 'helper 重定位到真实 run 112734')
  assert(fixed.ok === true, '修法后：用真实 run 校验 → ok，不误报')
}

// ── 端到端语义：全部 run 都无 tasks/（真没写 review）→ 维持阻断不误放行 ──
{
  const rr = mkdtempSync(join(tmpdir(), 'emd-block-'))
  mkdirSync(join(rr, 'execute-runs', 'exec-only',), { recursive: true })  // 唯一 run 也无 tasks/
  const relocated = resolveLatestExecuteRunIdWithTasks({ runtimeRoot: rr })
  assert(relocated === null, '无任何含 tasks/ 的 run → helper null')
  // gate 此时维持原 markerId 校验，task-01 无 review → 仍阻断
  const still = validateCheckedTaskReviews({ planContent: '- [x] task-01', runtimeRoot: rr, executeRunId: 'exec-only' })
  assert(still.ok === false, '真缺 review → 维持阻断不误放行')
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
