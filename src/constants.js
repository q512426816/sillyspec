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
