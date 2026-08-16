/**
 * SillySpec 平台状态枚举
 *
 * 所有平台产物（manifest、pointer、postcheck、workflow-runs）共享这些枚举。
 * SillyHub 侧直接使用常量值，不需要猜字符串。
 */

// ── scan 阶段状态 ──
export const SCAN_STATUS = Object.freeze({
  PENDING: 'pending',                        // scan 未开始
  IN_PROGRESS: 'in_progress',                  // scan 进行中
  SUCCESS: 'success',                          // scan 成功（所有检查通过）
  COMPLETED_WITH_WARNINGS: 'completed_with_warnings',  // scan 成功但有警告
  FAILED_POST_CHECK: 'failed_post_check',     // scan 失败（post-check 不通过）
})

// ── 平台指针状态 ──
export const POINTER_STATUS = Object.freeze({
  ACTIVE: 'active',                            // 指针活跃，任务进行中
  SCAN_COMPLETED: 'scan_completed',             // scan 已完成
  STALE: 'stale',                              // 指针过时（完成超过 24h，建议清理）
  CORRUPTED: 'corrupted',                      // 指针损坏（缺少必要字段）
})

// ── workflow 检查状态 ──
export const WORKFLOW_STATUS = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  SKIPPED: 'skipped',
})

// ── postcheck 检查严重级别 ──
export const CHECK_SEVERITY = Object.freeze({
  FAILED: 'failed',
  WARNING: 'warning',
  PASSED: 'passed',
})

// ── stage 步骤状态 ──
export const STEP_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
})

// ── stage 阶段状态 ──
export const STAGE_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED_POST_CHECK: 'failed_post_check',
})

/**
 * 判断指针是否过时（完成超过 24h）
 */
export function isPointerStale(pointer) {
  if (!pointer.completedAt) return false
  const completed = new Date(pointer.completedAt)
  const age = Date.now() - completed.getTime()
  return age > 24 * 60 * 60 * 1000
}

/**
 * 判断指针是否损坏（缺少必要字段）
 */
export function isPointerCorrupted(pointer) {
  return !pointer || !pointer.specRoot || !pointer.savedAt
}

// ── scan 必需文档清单（stage-contract validator 与 scan-postcheck 共用单一真相源）──
// 曾分两处硬编码同一份清单，加新文档需同步改两处，易分叉。现收敛到此处一处。
export const SCAN_REQUIRED_DOCS = Object.freeze([
  'ARCHITECTURE.md',
  'CONVENTIONS.md',
  'STRUCTURE.md',
  'INTEGRATIONS.md',
  'TESTING.md',
  'CONCERNS.md',
  'PROJECT.md',
])

// ── scan quick profile 必需文档子集（4 份核心文档）──
// quick 档（--quick 显式 或 小项目自动判定）只生成这 4 份；scan-postcheck 按 profile 取清单：
// mode==='quick' → SCAN_REQUIRED_DOCS_QUICK，否则 → SCAN_REQUIRED_DOCS（7 份）。
// 由 scan-postcheck.js + complete-handlers.js 透传的 scanProfile.mode 决定取哪份。
export const SCAN_REQUIRED_DOCS_QUICK = Object.freeze([
  'PROJECT.md',
  'ARCHITECTURE.md',
  'CONVENTIONS.md',
  'STRUCTURE.md',
])

// ── 辅助 stage 清单（stage-contract 转移规则 与 stages/index 注册表 共用单一真相源）──
// 曾在 stage-contract.js 与 stages/index.js 逐字重复定义，新增/调整辅助 stage 需同步改两处
// 易分叉。现收敛一处。（注意：主流程序 STAGE_ORDER/mainFlowStages/flowStages 语义不同、
// 各自用途正确，不在本清单范围。）
export const AUXILIARY_STAGES = Object.freeze([
  'scan',
  'quick',
  'explore',
  'archive',
  'status',
  'doctor',
])

// ── 只读辅助 stage 清单（查询型辅助阶段，可读短路不触碰进度库）──
// 供 command.js 判断 status/doctor 等查询型辅助阶段执行只读短路（FR-04 / D-005@v2）。
export const READONLY_AUXILIARY_STAGES = Object.freeze([
  'status',
  'doctor',
])
