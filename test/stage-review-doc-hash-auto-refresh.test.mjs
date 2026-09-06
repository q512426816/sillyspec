/**
 * stage review docHash 失配 gate 自动刷新（坑 stage-review-refresh-hash-manual-forget，2026-09-04 ③）
 * change: 2026-09-04 工单③ — src/stage-review.js validateStageReviewWithAutoRefresh
 *
 * 背景：design/plan.md 每次改版后须手动重跑 register-stage-review --refresh-hash，易忘——
 * 忘则 --done 被 docHash 失配拦一轮纯机械损耗。gate 时刻自动机械重算放行（verdict 保留 +
 * reviewerNotes 审计行 + 控制台留痕）。
 *
 * 覆盖：
 *   1. 失配 → 自动刷新 → recheck ok + autoRefreshed + review.json 落盘新 hash + 审计行
 *   2. hash 一致 → 不动文件（autoRefreshed=false）
 *   3. 主文档在候选基准下不存在（路径伪造/错位）→ 不自动刷新，仍 fail-closed
 *   4. verdict=fail → 不自动刷新（照常阻断）
 *   5. autoRefresh=false（默认，如 align 前置门等只读调用方）→ 不刷新
 *   6. schema 失败 → 不自动刷新
 *
 * 隔离：mkdtempSync 临时目录，不污染真实仓库。
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { validateStageReview, validateStageReviewWithAutoRefresh, computeDocHash, generateStageReviewRunId } from '../src/stage-review.js'
import { REVIEW_SCHEMA_VERSION } from '../src/task-review.js'

let total = 0, failed = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== stage review docHash 失配 gate 自动刷新 ===\n')

const root = mkdtempSync(join(tmpdir(), 'sar-auto-'))
const runtimeRoot = join(root, '.runtime')
const changeName = '2026-09-04-demo'
const changeDir = join(root, 'changes', changeName)
mkdirSync(join(runtimeRoot, 'stage-reviews'), { recursive: true })
mkdirSync(changeDir, { recursive: true })

const runId = generateStageReviewRunId()
const reviewDir = join(runtimeRoot, 'stage-reviews', `brainstorm-${runId}`)
mkdirSync(reviewDir, { recursive: true })
const reviewPath = join(reviewDir, 'review.json')
const designPath = join(changeDir, 'design.md')
const reviewedFiles = [`changes/${changeName}/design.md`]
const searchDirs = [root, changeDir]

function baseReview(overrides = {}) {
  return {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    reviewType: 'design',
    specVerdict: 'pass',
    qualityVerdict: 'pass',
    reviewedFiles,
    docHash: 'PLACEHOLDER',
    checklist: [{ item: '设计要点核验', result: 'pass', note: 'ok' }],
    reviewerNotes: '初审结论',
    ...overrides,
  }
}

// ── 1. 失配 → 自动刷新 → 放行 ──
{
  // 先写旧版 design + 与之匹配的 hash（模拟「审查时 hash 正确，之后 design 改版」）
  writeFileSync(designPath, '# design v1\n')
  writeFileSync(reviewPath, JSON.stringify(baseReview({ docHash: computeDocHash(designPath) }), null, 2) + '\n')
  // design 改版（rev2），review.json 的 docHash 变陈旧
  writeFileSync(designPath, '# design v2\n\n## 修订：接口调整\n')

  const before = validateStageReview({ stage: 'brainstorm', reviewType: 'design', runtimeRoot, reviewRunId: runId, searchDirs })
  assert(before.ok === false, '前置：改版后普通校验确实失配（ok=false）')

  const r = validateStageReviewWithAutoRefresh({ stage: 'brainstorm', reviewType: 'design', runtimeRoot, reviewRunId: runId, searchDirs, autoRefresh: true })
  assert(r.autoRefreshed === true, '自动刷新：autoRefreshed=true')
  assert(r.result.ok === true, '自动刷新：recheck 通过（--done 不再被拦一轮）')
  const onDisk = JSON.parse(readFileSync(reviewPath, 'utf8'))
  assert(onDisk.docHash === computeDocHash(designPath), '自动刷新：review.json 落盘新 docHash')
  assert(onDisk.specVerdict === 'pass' && onDisk.checklist.length === 1, '自动刷新：verdict/checklist 原样保留')
  assert(String(onDisk.reviewerNotes).includes('docHash auto-refreshed'), '自动刷新：reviewerNotes 追加审计行')
}

// ── 2. hash 一致 → 不动文件 ──
{
  writeFileSync(designPath, '# design v2\n\n## 修订：接口调整\n')
  const r = validateStageReviewWithAutoRefresh({ stage: 'brainstorm', reviewType: 'design', runtimeRoot, reviewRunId: runId, searchDirs, autoRefresh: true })
  assert(r.autoRefreshed === false && r.result.ok === true, 'hash 一致：不触发自动刷新直接通过')
}

// ── 3. 主文档不存在（路径伪造/基准错位）→ 不自动刷新 ──
{
  writeFileSync(reviewPath, JSON.stringify(baseReview({ reviewedFiles: [`changes/${changeName}/nonexistent.md`] }), null, 2) + '\n')
  const r = validateStageReviewWithAutoRefresh({ stage: 'brainstorm', reviewType: 'design', runtimeRoot, reviewRunId: runId, searchDirs, autoRefresh: true })
  assert(r.autoRefreshed === false && r.result.ok === false, '主文档缺失：不自动刷新，fail-closed 保留')
}

// ── 4. verdict=fail → 不自动刷新 ──
{
  writeFileSync(designPath, '# design v3\n')
  writeFileSync(reviewPath, JSON.stringify(baseReview({ specVerdict: 'fail', docHash: computeDocHash(designPath) }), null, 2) + '\n')
  writeFileSync(designPath, '# design v4\n')
  const r = validateStageReviewWithAutoRefresh({ stage: 'brainstorm', reviewType: 'design', runtimeRoot, reviewRunId: runId, searchDirs, autoRefresh: true })
  assert(r.autoRefreshed === false && r.result.ok === false, 'verdict=fail：不自动刷新，照常阻断')
}

// ── 5. autoRefresh=false（默认）→ 失配原样返回 ──
{
  writeFileSync(designPath, '# design v5\n')
  const r = validateStageReviewWithAutoRefresh({ stage: 'brainstorm', reviewType: 'design', runtimeRoot, reviewRunId: runId, searchDirs })
  assert(r.autoRefreshed === false && r.result.ok === false, '默认（autoRefresh 不开）：失配原样返回（只读调用方行为不变）')
}

// ── 6. schema 失败 → 不自动刷新 ──
{
  writeFileSync(reviewPath, JSON.stringify(baseReview({ schemaVersion: 999, specVerdict: 'oops' }), null, 2) + '\n')
  const r = validateStageReviewWithAutoRefresh({ stage: 'brainstorm', reviewType: 'design', runtimeRoot, reviewRunId: runId, searchDirs, autoRefresh: true })
  assert(r.autoRefreshed === false && r.result.ok === false, 'schema 失败：不自动刷新')
}

// 清理
try { rmSync(root, { recursive: true, force: true }) } catch {}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
