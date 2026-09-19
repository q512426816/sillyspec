/**
 * SillySpec Review Tier — 审查分级
 *
 * 决定某阶段的"审查/自检"由「当前 agent 自审」还是「独立审查子代理」执行。
 *
 * 为什么需要分级：
 *   scanProfile（决定 maxAgentCalls / 是否禁子代理）只在 scan 阶段生效（run.js:810
 *   门控 stageName==='scan'）；change-risk-profile 的 P0/P1/P2 只管 apply 阻塞与
 *   verify 证据。两者都不约束 brainstorm/plan/execute/propose 的审查方式。
 *
 * 2026-09-18-ceremony-risk-pricing task-02（FR-02 / D-002）：分级判定权从「plan_level
 * 三分支＋文件数≤3 启发式」移交 ceremony-tier.js 三轴定价引擎——classifyReviewTier
 * 组装 blast/span/friction 输入后委托 computeCeremonyTier 取档，评审 tier 由档位映射：
 *   S0/S1 → self（S1 reason 附 CLI 清单核验提示文案）
 *   S2   → independent×1（单轮独立审查子代理）
 *   S3   → independent（多轮语义由 prompt 侧渲染）
 *
 * 输入组装（调用方零适配，brownfield 兼容）：
 *   - riskDetection：调用侧透传 detectChangeRisk 判级输出（升档接线属 task-03 / prompt
 *     档位化属 task-05）；缺失时 plan_level 代理映射（none→doc-only / light→
 *     unit-sufficient / full→contract-required，经引擎档位等价复刻旧三分支行为）；都缺 →
 *     引擎 brownfield 保守缺省 S2（不静默降级）。
 *   - declaredFiles：design.md 变更清单解析（span 轴；fileCount 返回字段同源）。
 *   - frictionCounts：调用侧 ledger 口径透传，缺省空账（friction 轴不参与）。
 *
 * 旧「design 文件数≤SELF_REVIEW_FILE_THRESHOLD 判 self」降级为断路器：仅在 blast 为
 * brownfield 保守缺省 S2 且 span/friction 均未起爆时复刻旧启发式的 ≤ 阈值 arm 保现状
 * 兼容（≤3 文件小变更不因缺 risk 输入被升仪，ceremonyTier 仍如实报 S2 供审计）；真实
 * 信号在场（riskDetection 输入 / span 起爆 / friction 起爆）时引擎档强制，文件数不再
 * 独自决定 independent。
 *
 * 返回双字段过渡（R-05）：{ tier, ceremonyTier, reason, fileCount }——tier/reason/fileCount
 * 现字段语义保留（gates.js:1031 与 prompt.js:1158 消费 tier.reason），ceremonyTier 为
 * 引擎档（S0~S3）。回退路径：委托收敛在 classifyReviewTier 单点，摘除即回旧文件数规则。
 */

import { parseFileChangeList } from './change-list.js'
import { computeCeremonyTier, CEREMONY_TIERS } from './ceremony-tier.js'
import { resolveChangeRisk, extractExplicitRiskLevel } from './change-risk-profile.js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { loadBlastDeclarationsAllProjects } from './blast-surface.js'

/**
 * 审查分级阈值：变更文件数 ≤ 此值 → 旧启发式断路器命中（brownfield 兼容倾向 self）。
 * 2026-09-18 task-02 起降级为 brownfield 断路器（见 classifyReviewTier 注释），
 * 不再独自决定 independent——评审档由 computeCeremonyTier 定。
 */
export const SELF_REVIEW_FILE_THRESHOLD = 3

/** plan_level → blast 代理映射（无 riskDetection 输入时的 brownfield 兼容：经引擎等价复刻旧三分支） */
const PLAN_LEVEL_BLAST_PROXY = {
  none: 'doc-only',
  light: 'unit-sufficient',
  full: 'contract-required',
}

/** plan_level 归一：非 none/light/full 一律视同无锚点（与旧实现 fall-through 语义一致） */
function normalizePlanLevel(planLevel) {
  return planLevel === 'none' || planLevel === 'light' || planLevel === 'full' ? planLevel : null
}

/**
 * 审查分级（评审档由 computeCeremonyTier 三轴定价决定）
 *
 * 判定顺序：
 *   1. 组装 blast 输入（ql-20260918-007 双轨修复）：riskDetection（调用侧透传）＞ design/plan
 *      实判（designPath 可读即真跑 detectChangeRisk + extractExplicitRiskLevel 并入）＞ plan_level
 *      代理映射（无 designPath 兜底）＞ 引擎 brownfield 保守缺省 S2；档位文件（阶段门已结算价，
 *      含摩擦升档）在场且更高时兜底并入；declaredFiles 取 design.md 变更清单；frictionCounts 缺省空账
 *   2. 委托 computeCeremonyTier 取档 → ceremonyTier（S0~S3）
 *   3. 档位映射评审 tier：S0/S1 → self（S1 附 CLI 清单核验提示）；S2 → independent×1；
 *      S3 → independent（多轮语义由 prompt 侧渲染）
 *   4. 旧文件数断路器（降级兼容）：blast 为 brownfield 纯缺省 S2 且 span/friction 均未
 *      起爆时，fileCount ≤ SELF_REVIEW_FILE_THRESHOLD → self（复刻旧启发式 ≤ 阈值 arm，
 *      行为近似现状不静默降级；真实信号在场时本断路器不适用，引擎档强制）
 *
 * fail-safe：designPath 完全没传（fileCount=null，无法证明规模）→ 不走断路器 →
 * brownfield S2 → independent（宁严勿松）；riskDetection.level 未知 → 引擎保守缺省 S2。
 *
 * @param {object} [opts]
 * @param {string} [opts.planLevel] - plan_level 分类结果（none/light/full）。brainstorm/propose 在 plan 之前，可能拿不到。
 *   2026-09-18 task-02 起为 brownfield 代理信号：仅无 riskDetection 输入时参与 blast 映射。
 * @param {string} [opts.designPath] - design.md 绝对路径，用于算变更文件数（span 轴 declaredFiles 同源）
 * @param {{level: string}} [opts.riskDetection] - detectChangeRisk 判级输出（task-01 契约，只消费 level）；
 *   在场时优先于 plan_level 代理（plan_level 降级为编排标签，不再定价）
 * @param {object} [opts.frictionCounts] - friction-ledger 累计账口径 { gate_rollback, review_rejected }
 *   （携 verify_run_failed 第三键透传容忍）；缺省空账
 * @returns {{ tier: 'self'|'independent', ceremonyTier: 'S0'|'S1'|'S2'|'S3', reason: string, fileCount: number|null }}
 */
export function classifyReviewTier({ planLevel, designPath, riskDetection, frictionCounts } = {}) {
  const normalizedPlanLevel = normalizePlanLevel(planLevel)
  const hasRiskDetection = riskDetection != null && typeof riskDetection === 'object'

  // design.md 变更清单：fileCount 返回字段（现语义）＋ span 轴 declaredFiles 输入（同源一次解析）
  let fileCount = null
  let declaredFiles = []
  if (designPath) {
    declaredFiles = [...parseFileChangeList(designPath)]
    fileCount = declaredFiles.length
  }

  // blast 输入组装（ql-20260918-007 双轨修复 + 2026-09-19-ceremony-pricing-five-cuts task-03 声明面切换）：
  // riskDetection ＞ design/plan 实判（resolveChangeRisk 声明面：declaredFiles × blast 声明 + explicit）＞
  // plan_level 代理 ＞ undefined。实判优先治「full 代理把 S1 推成 S2」的双轨（回放实验实证：
  // 档位文件 S1 vs 审查面 S2）——designPath 可读即真跑声明面判级，plan_level 代理降为无
  // designPath 的 brownfield 兜底（plan_level 仅编排，D-002）。
  let blastInput = null
  let blastSource = null
  let explicitInput = null
  if (hasRiskDetection) {
    blastInput = riskDetection
    blastSource = `riskDetection.level=${riskDetection.level}`
  } else if (designPath) {
    try {
      const designContent = readFileSync(designPath, 'utf8')
      explicitInput = extractExplicitRiskLevel(designContent)
      // specBase 推导：designPath 形如 <specBase>/changes/<change>/design.md（worktree/主仓同形）
      // → 三层 dirname（QA 实证：两层只得 <specBase>/changes、声明面装载恒空表）。推导失败
      // （非常规路径）→ 空声明面（S1 起步不拦审查分级）。
      const specBase = dirname(dirname(dirname(designPath)))
      const blastDeclarations = loadBlastDeclarationsAllProjects({ specBase })
      const risk = resolveChangeRisk({ files: declaredFiles, blastDeclarations, explicitRiskLevel: explicitInput })
      blastInput = { level: risk.level }
      blastSource = `声明面判级 tier=${risk.tier}/level=${risk.level}（design 文件清单 × blast 声明，D-008；explicit=${risk.explicit}）`
    } catch {
      // design 读失败 → 降回代理链（不因 IO 异常拦审查分级）
      blastInput = null
    }
  }
  if (blastInput === null) {
    if (normalizedPlanLevel) {
      blastInput = { level: PLAN_LEVEL_BLAST_PROXY[normalizedPlanLevel] }
      blastSource = `plan_level=${normalizedPlanLevel} 代理映射 ${PLAN_LEVEL_BLAST_PROXY[normalizedPlanLevel]}`
    } else {
      blastInput = undefined
      blastSource = '无 risk 输入，brownfield 保守缺省'
    }
  }

  // 档位文件兜底（canon 真相源，含摩擦升档）：designPath 推导 <specBase>/.runtime/ceremony-tier-<change>.json，
  // 在场且高于实判档时并入（只升不降语义——档位文件是阶段门已结算的权威价，实判只补内容升级面）
  let tierFileTier = null
  if (designPath) {
    try {
      const changeDir = dirname(designPath)
      const tierPath = join(dirname(dirname(changeDir)), '.runtime', `ceremony-tier-${basename(changeDir)}.json`)
      if (existsSync(tierPath)) {
        const tf = JSON.parse(readFileSync(tierPath, 'utf8'))
        if (tf && CEREMONY_TIERS.includes(tf.tier)) tierFileTier = tf.tier
      }
    } catch { /* 坏档当无档（实判仍兜底） */ }
  }

  // 委托三轴定价引擎取档（ceremony-tier.js 单点真相源）
  const priced = computeCeremonyTier({ riskDetection: blastInput, explicitRiskLevel: explicitInput, declaredFiles, frictionCounts })
  let ceremonyTier = priced.tier
  if (tierFileTier && CEREMONY_TIERS.indexOf(tierFileTier) > CEREMONY_TIERS.indexOf(ceremonyTier)) {
    ceremonyTier = tierFileTier
  }
  const tierFileNote = tierFileTier ? `；档位文件 ${tierFileTier} 兜底${tierFileTier === ceremonyTier ? '并入' : '在场（未高于实判，不生效）'}` : ''

  // brownfield 纯缺省判定：档位完全来自 blast 保守缺省（无 risk 输入、无 plan_level 代理、
  // 无档位文件、span/friction 均未起爆）——旧文件数断路器的唯一适用面
  const brownfieldPureDefault =
    blastInput === undefined && tierFileTier === null && priced.components.span === 'S0' && priced.components.friction === 'S0'

  // blast 来源文案已在组装段生成（blastSource，含实判/代理/缺省三态）；此处仅追加档位文件注记

  // ── 旧文件数断路器（降级兼容，R-05 过渡期形态）──
  if (brownfieldPureDefault && fileCount !== null && fileCount <= SELF_REVIEW_FILE_THRESHOLD) {
    return {
      tier: 'self',
      ceremonyTier,
      reason: `无 plan_level，变更文件 ${fileCount} ≤ ${SELF_REVIEW_FILE_THRESHOLD}（启发式断路器保兼容）；ceremony 档 ${ceremonyTier}（blast：${blastSource}，span/friction 未起爆不升仪）${tierFileNote}`,
      fileCount,
    }
  }

  // ── S0/S1 → self（S1 附 CLI 清单核验提示文案，D-005 轻仪菜单）──
  if (ceremonyTier === 'S0' || ceremonyTier === 'S1') {
    const base = normalizedPlanLevel === 'none'
      ? 'plan_level=none（极小变更，agent 自主判定自审）'
      : normalizedPlanLevel === 'light'
        ? 'plan_level=light（agent 自主判定轻量变更，自审）'
        : `ceremony 档 ${ceremonyTier} 判 self`
    const s1Hint = ceremonyTier === 'S1'
      ? '；S1 仪式=CLI 清单核验（按 design 变更清单逐项自检核对，无需独立审查子代理）'
      : ''
    return {
      tier: 'self',
      ceremonyTier,
      reason: `${base}；ceremony 档 ${ceremonyTier}（blast：${blastSource}）${s1Hint}${tierFileNote}`,
      fileCount,
    }
  }

  // ── S2/S3 → independent（S2=单轮；S3 多轮语义由 prompt 侧渲染）──
  const base = normalizedPlanLevel === 'full'
    ? 'plan_level=full（agent 自主判定大变更，独立审查防确认偏差）'
    : brownfieldPureDefault
      ? (fileCount === null
        ? '无法解析 design.md 变更文件清单，按正常规模处理（fail-safe）'
        : `无 plan_level，变更文件 ${fileCount} > ${SELF_REVIEW_FILE_THRESHOLD}（启发式）`)
      : `ceremony 档 ${ceremonyTier} 判 independent`
  const independentForm = ceremonyTier === 'S2'
    ? 'independent×1（单轮独立审查子代理）'
    : 'independent（多轮语义由 prompt 侧渲染）'
  return {
    tier: 'independent',
    ceremonyTier,
    reason: `${base}；ceremony 档 ${ceremonyTier}（blast：${blastSource}）→ ${independentForm}${tierFileNote}`,
    fileCount,
  }
}
