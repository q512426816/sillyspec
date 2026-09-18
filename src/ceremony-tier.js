/**
 * ceremony-tier.js — 仪式强度定价引擎（三轴客观计价，纯函数零 IO）
 *
 * 2026-09-18-ceremony-risk-pricing task-01 / FR-01（D-001 引擎骨架、D-004 显式声明通道、
 * D-008 friction 升档规则）。ceremony_tier = max(blast, span, friction)：评审轮次/计划厚度/
 * Grill 深度不再由 agent 自报的 plan_level 定价，而是三分量客观取封顶——一切 agent 自报
 * 只可升不可降（升档永远尊重；降档须理由并标记 explicitDowngradeAccepted，待收口双跑
 * 复核）。本模块是定价的单点真相源，消费面：review-tier.js（评审档）、run/gates.js
 * （阶段门升档）、verify-postcheck.js / complete-handlers.js（双跑收口）。
 *
 * 三轴口径：
 *   blast ＝ riskDetection.level（detectChangeRisk 输出）经 RISK_TO_TIER 五档映射 ＋ 显式
 *            声明升降规则；riskDetection 缺失 / level 未知 → 保守缺省 S2（brownfield 兼容：
 *            ≈现状 independent×1，不静默降级）。
 *   span  ＝ 声明文件数 ≥ SPAN_FILES_THRESHOLD ∨ 跨模块数 ≥ SPAN_MODULES_THRESHOLD ∨
 *            声明文件命中 QUICK_RISK_PATH_PATTERNS → 至少 S2。moduleIndex 沿用
 *            computeGateProfile 的输入形态（_module-map.yaml 解析结果，先例
 *            quick-gate-profile.js），缺失/空则跨模块检查跳过（不缺省不拦截）；声明文件数
 *            按 declaredFiles 全量计（任务卡口径，不复刻 quick-gate 的文档剔除）。
 *   friction ＝ friction-ledger 累计账的 gate_rollback + review_rejected 合计达到
 *            FRICTION_ESCALATION_THRESHOLD → 在 blast/span 结果上 +1 档封顶 S3，只升不降。
 *            只认 ledger 口径两键（禁读 friction-tally——其 consumeFrictionHint 消费即删，
 *            会给 verify 门引入隐式次序依赖）；入参携第三键 verify_run_failed 时透传容忍：
 *            不抛错不拒收、不参与升档计算。
 *
 * 零依赖纯函数：无 fs / 锁 / 网络 / 日志副作用；唯一仓内 import 是 change-risk-profile.js
 * 的纯常量 QUICK_RISK_PATH_PATTERNS（quick-gate-profile.js:28 先例）。阈值常量集中文件
 * 顶部可调（R-02：上线前用 friction-ledger 历史变更回放标定再定值）。
 */
import { QUICK_RISK_PATH_PATTERNS } from './change-risk-profile.js'

/** 仪式档位序（只升不降的偏序基准，index 即高低：S0=0 … S3=3） */
export const CEREMONY_TIERS = ['S0', 'S1', 'S2', 'S3']

/** detectChangeRisk 五档风险 → 仪式档位映射（integration 与 deployment 同归 S3：顶档仪式不分家） */
export const RISK_TO_TIER = {
  'doc-only': 'S0',
  'unit-sufficient': 'S1',
  'contract-required': 'S2',
  'integration-critical': 'S3',
  'deployment-critical': 'S3',
}

// ============ 阈值常量（集中可调；R-02 friction-ledger 历史回放标定的落点） ============

/** span 轴：声明文件数 ≥ 此值 → 至少 S2 */
export const SPAN_FILES_THRESHOLD = 8

/** span 轴：跨模块数 ≥ 此值 → 至少 S2 */
export const SPAN_MODULES_THRESHOLD = 3

/**
 * friction 轴起爆阈值：gate_rollback + review_rejected 合计 ≥ 此值 → 在 blast/span 结果上
 * +1 档封顶 S3。口径＝达到即起爆（默认 2 = 两次摩擦事件升档，两振出局；R-02 回放可调）。
 */
export const FRICTION_ESCALATION_THRESHOLD = 2

/** friction 计价消费的 ledger 两键（第三键 verify_run_failed 透传容忍、不消费） */
const FRICTION_CONSUMED_KEYS = ['gate_rollback', 'review_rejected']

/** 档位→序数（非法/缺省 → -1） */
function tierRank(tier) {
  return CEREMONY_TIERS.indexOf(tier)
}

/** 两档取高（防御非法值：任一档非法时返回另一档；两档均合法时返回高者） */
function maxTier(a, b) {
  return tierRank(a) >= tierRank(b) ? a : b
}

/** friction 合计：只消费 ledger 两键；脏值（非有限数/负数）按 0，第三键透传不读 */
function frictionTotal(frictionCounts) {
  if (frictionCounts == null || typeof frictionCounts !== 'object') return 0
  let total = 0
  for (const key of FRICTION_CONSUMED_KEYS) {
    const n = Number(frictionCounts[key])
    if (Number.isFinite(n) && n > 0) total += n
  }
  return total
}

/** 升档阈值覆写解析：数字直接作阈值；对象取 frictionEscalation 键；非法静默回退默认（纯函数不打印） */
function resolveFrictionThreshold(thresholds) {
  let v = null
  if (typeof thresholds === 'number') v = thresholds
  else if (thresholds != null && typeof thresholds === 'object' && !Array.isArray(thresholds)) v = thresholds.frictionEscalation
  return Number.isInteger(v) && v >= 1 ? v : FRICTION_ESCALATION_THRESHOLD
}

/** 显式声明入参归一：字符串或 {level, reason} → {level, reason}；reason 空白视为无理由 */
function normalizeExplicit(v) {
  if (v == null) return null
  if (typeof v === 'string') return { level: v.trim().toLowerCase(), reason: null }
  if (typeof v === 'object' && !Array.isArray(v)) {
    return {
      level: typeof v.level === 'string' ? v.level.trim().toLowerCase() : v.level,
      reason: typeof v.reason === 'string' && v.reason.trim() !== '' ? v.reason.trim() : null,
    }
  }
  return { level: v, reason: null } // 非法形态：RISK_TO_TIER 查不到 → 忽略留痕
}

/** moduleIndex 可用性归一（computeGateProfile 同口径）：null/非对象/空 → null（跨模块检查跳过）；
 *  兼容 { modules: {...} } 包装与裸路径→模块映射两种形态 */
function resolveModulesObject(moduleIndex) {
  if (moduleIndex == null || typeof moduleIndex !== 'object' || Array.isArray(moduleIndex)) return null
  const wrapped = moduleIndex.modules
  const obj = wrapped != null && typeof wrapped === 'object' && !Array.isArray(wrapped) ? wrapped : moduleIndex
  return Object.keys(obj).length > 0 ? obj : null
}

/** 一级模块归属（quick-gate-profile matchModuleForFile 同口径）：paths/core_files 字面量或目录前缀命中 */
function matchModuleForFile(posix, modulesObj) {
  for (const [id, m] of Object.entries(modulesObj)) {
    if (m == null || typeof m !== 'object') continue
    const prefixes = [...(Array.isArray(m.paths) ? m.paths : []), ...(Array.isArray(m.core_files) ? m.core_files : [])]
    for (const raw of prefixes) {
      const p = String(raw).replace(/\\/g, '/').replace(/\/+$/, '')
      if (!p) continue
      if (posix === p || posix.startsWith(p + '/')) return id
    }
  }
  return null
}

/**
 * 三轴定价：ceremony_tier = max(blast, span, friction)（客观计算，一切自报只升不可降）。
 *
 * @param {object} [opts]
 * @param {{level: string}} [opts.riskDetection] detectChangeRisk 输出（只消费 level）；
 *   缺失 / level 未知 → blast 保守缺省 S2（brownfield：不静默降级）
 * @param {string|{level: string, reason: string}} [opts.explicitRiskLevel] 显式声明
 *   （design frontmatter risk_level 通道）：升档永远尊重；降档须 reason（无 reason 的降档
 *   忽略并在 reasons 留痕），采纳时 explicitDowngradeAccepted=true 待收口双跑复核
 * @param {string[]} [opts.declaredFiles] 声明变更文件（span 轴；反斜杠自动归一 POSIX）
 * @param {object|null} [opts.moduleIndex] _module-map.yaml 解析结果（跨模块数口径）；
 *   null/undefined/空 → 跨模块检查跳过（不缺省不拦截）
 * @param {object} [opts.frictionCounts] friction-ledger 累计账口径 { gate_rollback,
 *   review_rejected }——携 verify_run_failed 第三键透传容忍不拒收、不参与计算
 * @returns {{ tier: 'S0'|'S1'|'S2'|'S3', components: { blast: string, span: string, friction: string },
 *   reasons: string[], explicitDowngradeAccepted: boolean }}
 *   friction 分量＝升档后的档（未起爆为 S0，不参与封顶）；reasons 逐分量留痕（含阈值与
 *   命中明细），供消费方审计打印与双跑比对
 */
export function computeCeremonyTier({ riskDetection, explicitRiskLevel, declaredFiles, moduleIndex, frictionCounts } = {}) {
  const reasons = []
  let explicitDowngradeAccepted = false

  // ── blast 轴：判级映射 + 显式声明升降 ──
  const detectedLevel = riskDetection != null && typeof riskDetection === 'object' ? riskDetection.level : undefined
  const mappedTier = RISK_TO_TIER[detectedLevel]
  let blast
  if (mappedTier) {
    blast = mappedTier
    reasons.push(`blast=${blast}（riskDetection.level=${detectedLevel} 经 RISK_TO_TIER 映射）`)
  } else {
    blast = 'S2'
    const cause = detectedLevel === undefined ? 'riskDetection.level 缺失' : `riskDetection.level=${String(detectedLevel)} 未知`
    reasons.push(`blast=S2（保守缺省：${cause}——brownfield 不静默降级）`)
  }

  const explicit = normalizeExplicit(explicitRiskLevel)
  if (explicit) {
    const explicitTier = RISK_TO_TIER[explicit.level]
    if (!explicitTier) {
      reasons.push(`显式 risk_level 非法被忽略：${JSON.stringify(explicitRiskLevel)}（合法值：${Object.keys(RISK_TO_TIER).join(' / ')}）`)
    } else if (tierRank(explicitTier) > tierRank(blast)) {
      reasons.push(`blast 升档尊重显式声明 risk_level=${explicit.level} → ${explicitTier}（高于判级 ${blast}）`)
      blast = explicitTier
    } else if (tierRank(explicitTier) < tierRank(blast)) {
      if (explicit.reason) {
        reasons.push(`blast 降档采纳显式声明 risk_level=${explicit.level}（理由：${explicit.reason}）→ ${explicitTier}，待收口双跑复核（explicitDowngradeAccepted=true）`)
        blast = explicitTier
        explicitDowngradeAccepted = true
      } else {
        reasons.push(`显式降级缺理由被忽略（声明 ${explicit.level}→${explicitTier} 低于判级 ${blast}，无 reason——一切自报只升不降）`)
      }
    }
    // 等档声明：无行为差异，不留痕
  }

  // ── span 轴：文件数 / 跨模块数 / 风险路径模式，任一命中 → 至少 S2 ──
  const files = (Array.isArray(declaredFiles) ? declaredFiles : [])
    .map((f) => String(f).replace(/\\/g, '/'))
    .filter(Boolean)
  let span = 'S0'
  if (files.length >= SPAN_FILES_THRESHOLD) {
    span = 'S2'
    reasons.push(`span=S2（声明文件 ${files.length} ≥ 阈值 ${SPAN_FILES_THRESHOLD}）`)
  }

  const modulesObj = resolveModulesObject(moduleIndex)
  if (modulesObj) {
    const hitModules = new Set()
    for (const f of files) {
      const id = matchModuleForFile(f, modulesObj)
      if (id != null) hitModules.add(id)
    }
    if (hitModules.size >= SPAN_MODULES_THRESHOLD) {
      span = 'S2'
      reasons.push(`span=S2（跨模块 ${hitModules.size} ≥ 阈值 ${SPAN_MODULES_THRESHOLD}：${[...hitModules].join('、')}）`)
    }
  } // moduleIndex 缺失/空 → 跨模块检查跳过，span 其余两维照常

  const riskHitsByPattern = new Map()
  for (const f of files) {
    for (const entry of QUICK_RISK_PATH_PATTERNS) {
      const re = entry == null ? null : entry.re
      if (!(re instanceof RegExp)) continue
      if (re.global) re.lastIndex = 0 // 防调用方传入 /g 正则跨文件携带 lastIndex 状态
      if (re.test(f)) {
        const list = riskHitsByPattern.get(entry.pattern) || []
        list.push(f)
        riskHitsByPattern.set(entry.pattern, list)
      }
    }
  }
  if (riskHitsByPattern.size > 0) {
    span = 'S2'
    for (const [pattern, hitFiles] of riskHitsByPattern) {
      reasons.push(`span=S2（风险路径命中 ${pattern}：${hitFiles.join('、')}）`)
    }
  }

  // ── friction 轴：ledger 两键合计达到阈值 → 在 blast/span 结果上 +1 档封顶 S3（只升不降）──
  const total = frictionTotal(frictionCounts)
  let friction = 'S0'
  if (total >= FRICTION_ESCALATION_THRESHOLD) {
    const base = maxTier(blast, span)
    friction = CEREMONY_TIERS[Math.min(tierRank(base) + 1, CEREMONY_TIERS.length - 1)]
    reasons.push(`friction 升档（gate_rollback+review_rejected 合计 ${total} ≥ 阈值 ${FRICTION_ESCALATION_THRESHOLD}，${base} → ${friction}，封顶 S3）`)
  }

  return { tier: maxTier(maxTier(blast, span), friction), components: { blast, span, friction }, reasons, explicitDowngradeAccepted }
}

/**
 * friction 升档（阶段门检查点用，D-008）：两键合计达到阈值 → min(S3, 当前档+1)；只升不降
 * ——未达阈 / 已在顶 / 当前档非法时原样返回不发明新档。escalated＝档位实际上移（S3 再超阈
 * 返回 { tier:'S3', escalated:false }：已在顶无可升，摩擦在场事实由 computeCeremonyTier 的
 * reasons 留痕承载）。
 *
 * @param {string} currentTier 当前档（'S0'~'S3'）
 * @param {object} frictionCounts ledger 累计账口径（携 verify_run_failed 第三键透传容忍）
 * @param {number|{frictionEscalation: number}} [thresholds] 阈值覆写（≥1 整数；非法静默回退默认）
 * @returns {{ tier: string, escalated: boolean }}
 */
export function escalateByFriction(currentTier, frictionCounts, thresholds) {
  const currentRank = tierRank(currentTier)
  if (currentRank < 0) return { tier: currentTier, escalated: false }
  const th = resolveFrictionThreshold(thresholds)
  if (frictionTotal(frictionCounts) < th) return { tier: currentTier, escalated: false }
  const nextRank = Math.min(currentRank + 1, CEREMONY_TIERS.length - 1)
  return { tier: CEREMONY_TIERS[nextRank], escalated: nextRank > currentRank }
}

/**
 * 双跑收口对账（verify --done / archive confirm 两出口）：事实面仅重跑 blast+span 两轴
 * （实际 diff 无声明通道；摩擦属过程面，阶段门已计过价，不重复升档），与开跑声明档比对。
 * 声明档低于事实档 → mismatch=true、severity='error'（懒 agent 低报硬 flag）；声明档
 * 非法/缺失按最低档对账（fail-safe：无法证明声明到位 → 视为低报，宁严勿松）。
 *
 * @param {object} [opts]
 * @param {string} [opts.declaredTier] 开跑定价落档的声明档
 * @param {object} [opts.factRiskDetection] 实际 diff 重跑的 detectChangeRisk 输出
 * @param {string[]} [opts.factFiles] 实际变更文件（scope-audit / apply-pathspec 文件集）
 * @param {object|null} [opts.factModuleIndex] _module-map.yaml 解析结果
 * @returns {{ factTier: 'S0'|'S1'|'S2'|'S3', mismatch: boolean, severity: 'error'|'none' }}
 */
export function reconcileDualRun({ declaredTier, factRiskDetection, factFiles, factModuleIndex } = {}) {
  const fact = computeCeremonyTier({
    riskDetection: factRiskDetection,
    declaredFiles: factFiles,
    moduleIndex: factModuleIndex,
    frictionCounts: {},
  })
  const mismatch = tierRank(fact.tier) > tierRank(declaredTier)
  return { factTier: fact.tier, mismatch, severity: mismatch ? 'error' : 'none' }
}
