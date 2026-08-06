/**
 * Stage Review marker 自生测试（坑1，FR-01）
 *
 * execute 批量完成跳过 prompt 渲染时，stage review marker 不写盘 → gate 读 null →
 * 期望路径变 stage-reviews/execute-null/review.json（agent 不知往哪补）。gates.js 在
 * marker 缺失时自生 generateStageReviewRunId + 写盘，让 gate 读到确定 ID。
 *
 * 本测试直接验证 stage-review.js 的三个原语契约（gates.js fallback 依赖它们）：
 *   1. marker 缺失 + 无 stage-reviews/ 目录 → getLatestStageReviewRunId 返回 null
 *   2. 自生 runId + 写 marker 后，marker 文件存在、内容匹配 ^review-、getLatestStageReviewRunId 读回同值
 *   3. 幂等：marker 已存在时 gate 走读路径，不再生成 / 不覆盖
 */
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  generateStageReviewRunId,
  stageReviewMarkerPath,
  getLatestStageReviewRunId,
} from '../src/stage-review.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== Stage Review marker 自生（坑1）===\n')

const runtimeRoot = mkdtempSync(join(tmpdir(), 'sr-marker-auto-'))
const stage = 'execute'
const change = '2026-08-06-marker-demo'

// ── Case 1: marker 缺失 + 无 stage-reviews/ → null（gate 触发自生的前提）──
console.log('--- Case 1: marker 缺失 → getLatestStageReviewRunId 返回 null ---')
{
  const got = getLatestStageReviewRunId(runtimeRoot, stage, change)
  assert(got === null, `marker 缺失时返回 null（got ${got}）`)
  assert(!existsSync(stageReviewMarkerPath(runtimeRoot, stage, change)), '此时 marker 文件不存在')
}

// ── Case 2: 模拟 gates.js fallback —— 自生 + 写盘后读回确定 ID ──
console.log('--- Case 2: gate 自生 generateStageReviewRunId + 写 marker → 可读回 ---')
{
  // 完整复刻 gates.js 的 fallback 逻辑（src/run/gates.js stage review gate 分支）
  let reviewRunId = getLatestStageReviewRunId(runtimeRoot, stage, change)
  if (!reviewRunId) {
    reviewRunId = generateStageReviewRunId()
    mkdirSync(runtimeRoot, { recursive: true })
    writeFileSync(stageReviewMarkerPath(runtimeRoot, stage, change), reviewRunId + '\n')
  }
  const markerPath = stageReviewMarkerPath(runtimeRoot, stage, change)

  assert(existsSync(markerPath), '自生后 marker 文件落盘')
  const content = readFileSync(markerPath, 'utf8').trim()
  assert(/^review-/.test(content), `marker 内容匹配 ^review-（got ${content}）`)
  assert(content === reviewRunId, 'marker 内容 == 自生 runId')

  // gate 再读 → 拿到确定 ID（不再 null），错误路径从 execute-null 变 execute-review-<id>
  const reread = getLatestStageReviewRunId(runtimeRoot, stage, change)
  assert(reread === reviewRunId, `getLatestStageReviewRunId 读回同值 ${reviewRunId}（got ${reread}）`)
  assert(reread && /^review-/.test(reread), '读回的 ID 是 review- 前缀（可执行路径）')
}

// ── Case 3: 幂等 —— marker 已存在时 gate 不再生成 / 不覆盖 ──
console.log('--- Case 3: marker 已存在 → gate 走读路径，不覆盖 ---')
{
  const existing = getLatestStageReviewRunId(runtimeRoot, stage, change)
  // 二次 gate 调用：因 getLatestStageReviewRunId 非 null，if (!reviewRunId) 分支不进，不写盘
  let second = getLatestStageReviewRunId(runtimeRoot, stage, change)
  if (!second) {
    second = generateStageReviewRunId()
    writeFileSync(stageReviewMarkerPath(runtimeRoot, stage, change), second + '\n')
  }
  assert(second === existing, `marker 已存在时不再自生（existing ${existing} == second ${second}）`)

  // 篡改 marker 后再读应反映磁盘真实内容（证明 gate 读的是盘，不是内存缓存）
  writeFileSync(stageReviewMarkerPath(runtimeRoot, stage, change), 'review-tampered-123\n')
  const after = getLatestStageReviewRunId(runtimeRoot, stage, change)
  assert(after === 'review-tampered-123', 'gate 读的是磁盘 marker（篡改后可见，非缓存）')
}

// ── Case 4: 多 change 隔离 —— 不同 changeName 各自独立 marker ──
console.log('--- Case 4: 多 change marker 隔离 ---')
{
  const changeB = '2026-08-06-another-change'
  const gotB = getLatestStageReviewRunId(runtimeRoot, stage, changeB)
  assert(gotB === null, '另一 change 的 marker 缺失（不串台）')
  const idB = generateStageReviewRunId()
  writeFileSync(stageReviewMarkerPath(runtimeRoot, stage, changeB), idB + '\n')
  assert(getLatestStageReviewRunId(runtimeRoot, stage, changeB) === idB, 'changeB 读到自己的 marker')
  // 原 change 的 marker 未受影响
  assert(existsSync(stageReviewMarkerPath(runtimeRoot, stage, change)), '原 change marker 仍在')
}

rmSync(runtimeRoot, { recursive: true, force: true })

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
