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
 * CLI 侧（run.js done gate）与 prompt 注入侧用同一个函数，保证两边判定一致。
 * 判定权归 agent 的 plan_level 自主判断（CLI 只做确定性映射，见 classifyReviewTier 注释）；
 * 无 plan_level 的阶段才退文件数启发式。
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
 * 判定权归 agent 的 plan_level 判定（2026-08-14 tier-plan-level 改造）：plan_level 是 agent
 * 在 plan step1 按 prompt 分级规则做的自主判断，tier 直接映射它——CLI 不再用文件数启发式
 * 推翻 agent 判定（此前 light + 4 文件会被文件数强制 independent，两套标准打架且不透明，
 * 实证：agent 判 light 自审通过，完成时 CLI 按 7 文件强制 independent review.json）。
 *
 * 判定顺序（短路）：
 *   1. plan_level === 'none'  → self（极小变更）
 *   2. plan_level === 'light' → self（agent 自主判定轻量，自审）
 *   3. plan_level === 'full'  → independent（full 语义即大变更需独立审查，CLI 确定性强制）
 *   4. 无 plan_level（brainstorm 等阶段 plan.md 未生成）→ 退文件数启发式：
 *      design.md 变更文件数 ≤ SELF_REVIEW_FILE_THRESHOLD → self，否则 independent
 *
 * fail-safe：无 plan_level 且 designPath 传了但解析不到文件清单（fileCount=0）按字面 0
 * 处理（真无文件变更 = 极小）；designPath 完全没传（fileCount=null，无法证明规模）→
 * independent（宁严勿松）。
 *
 * @param {object} [opts]
 * @param {string} [opts.planLevel] - plan_level 分类结果（none/light/full）。brainstorm/propose 在 plan 之前，可能拿不到。
 * @param {string} [opts.designPath] - design.md 绝对路径，用于算变更文件数
 * @returns {{ tier: 'self'|'independent', reason: string, fileCount: number|null }}
 */
export function classifyReviewTier({ planLevel, designPath } = {}) {
  if (planLevel === 'none') {
    return { tier: 'self', reason: 'plan_level=none（极小变更，agent 自主判定自审）', fileCount: null }
  }
  if (planLevel === 'light') {
    return { tier: 'self', reason: 'plan_level=light（agent 自主判定轻量变更，自审）', fileCount: null }
  }
  if (planLevel === 'full') {
    return { tier: 'independent', reason: 'plan_level=full（agent 自主判定大变更，独立审查防确认偏差）', fileCount: null }
  }

  let fileCount = null
  if (designPath) {
    fileCount = parseFileChangeList(designPath).size
  }

  if (fileCount !== null && fileCount <= SELF_REVIEW_FILE_THRESHOLD) {
    return { tier: 'self', reason: `无 plan_level，变更文件 ${fileCount} ≤ ${SELF_REVIEW_FILE_THRESHOLD}（启发式）`, fileCount }
  }

  const reason = fileCount === null
    ? '无法解析 design.md 变更文件清单，按正常规模处理（fail-safe）'
    : `无 plan_level，变更文件 ${fileCount} > ${SELF_REVIEW_FILE_THRESHOLD}（启发式）`
  return { tier: 'independent', reason, fileCount }
}
