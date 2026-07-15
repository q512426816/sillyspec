/**
 * SillySpec Review Tier — 审查分级
 *
 * 决定某阶段的"审查/自检"由「当前 agent 自审」还是「独立审查子代理」执行。
 *
 * 为什么需要分级：
 *   scanProfile（决定 maxAgentCalls / 是否禁子代理）只在 scan 阶段生效（run.js:810
 *   门控 stageName==='scan'）；change-risk-profile 的 P0/P1/P2 只管 apply 阻塞与
 *   verify 证据。两者都不约束 brainstorm/plan/execute/propose 的审查方式。
 *   故新选「plan_level / 变更文件数」作为审查分级维度。
 *
 * 分级结果：
 *   - tier=self         → 当前 agent 自审，CLI 放行（不要求 review.json）
 *   - tier=independent  → 强制独立审查子代理 + review.json，CLI 硬校验
 *
 * CLI 侧（run.js done gate）与 prompt 注入侧用同一个函数，保证两边判定一致——
 * 不信 agent 自报 tier。
 */

import { parseFileChangeList } from './change-list.js'

/**
 * 审查分级阈值：变更文件数 ≤ 此值 → tier=self。
 * 依据：≤3 文件的变更通常是单点修复/文案调整，独立审查子代理的仪式成本 > 收益。
 */
export const SELF_REVIEW_FILE_THRESHOLD = 3

/**
 * 审查分级
 *
 * 判定顺序（短路）：
 *   1. plan_level === 'none'                          → self（极小变更）
 *   2. design.md 变更文件数 ≤ SELF_REVIEW_FILE_THRESHOLD → self
 *   3. 否则                                            → independent
 *
 * fail-safe：designPath 传了但解析不到文件清单（fileCount=0）按字面 0 处理（真无文件
 * 变更 = 极小）；designPath 完全没传（fileCount=null，无法证明规模）→ independent
 * （宁严勿松）。
 *
 * @param {object} [opts]
 * @param {string} [opts.planLevel] - plan_level 分类结果（none/light/full）。brainstorm/propose 在 plan 之前，可能拿不到。
 * @param {string} [opts.designPath] - design.md 绝对路径，用于算变更文件数
 * @returns {{ tier: 'self'|'independent', reason: string, fileCount: number|null }}
 */
export function classifyReviewTier({ planLevel, designPath } = {}) {
  if (planLevel === 'none') {
    return { tier: 'self', reason: `plan_level=none（极小变更，≤${SELF_REVIEW_FILE_THRESHOLD} 文件等价）`, fileCount: null }
  }

  let fileCount = null
  if (designPath) {
    fileCount = parseFileChangeList(designPath).size
  }

  if (fileCount !== null && fileCount <= SELF_REVIEW_FILE_THRESHOLD) {
    return { tier: 'self', reason: `变更文件 ${fileCount} ≤ ${SELF_REVIEW_FILE_THRESHOLD}`, fileCount }
  }

  const reason = fileCount === null
    ? (planLevel
        ? `plan_level=${planLevel}，无法解析变更文件数，按正常规模处理`
        : '无法解析 design.md 变更文件清单，按正常规模处理')
    : `变更文件 ${fileCount} > ${SELF_REVIEW_FILE_THRESHOLD}`
  return { tier: 'independent', reason, fileCount }
}
