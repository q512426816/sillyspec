/**
 * ceremony-tier.js — 仪式强度定价引擎（三轴客观计价，纯函数零 IO）
 *
 * 2026-09-18-ceremony-risk-pricing task-01 / FR-01（D-001 引擎骨架、D-004 显式声明通道、
 * D-008 friction 升档规则）。ceremony_tier = max(blast, span, friction)：评审轮次/计划厚度/
 * Grill 深度不再由 agent 自报的 plan_level 定价，而是三分量客观取封顶。自报契约
 * （2026-09-19-ceremony-pricing-five-cuts D-003 修订）：**无摩擦迁移时随声明面重定价**
 * （完成门声明追赶，applyDeclarationCatchUp——后补 risk_level/声明面变化可升可降）；
 * **有摩擦迁移时地板不退**（transitions 最高 to 档托底）；摩擦升档本身与 force_tier 仍
 * 只升不降；本 computeCeremonyTier 内的 explicitRiskLevel 降档仍须 reason 并标记
 * explicitDowngradeAccepted 待收口双跑复核。本模块是定价的单点真相源，消费面：
 * review-tier.js（评审档）、run/gates.js（阶段门升档）、verify-postcheck.js /
 * complete-handlers.js（双跑收口）。
 *
 * 三轴口径：
 *   blast ＝ blastTier 声明面直入（resolveChangeRisk：变更文件 × _module-map.yaml 顶层
 *            blast 段声明危险面，D-008——2026-09-19-ceremony-pricing-five-cuts 起的
 *            主通道；未命中 S1、词表判级退役）＞ riskDetection.level 经 RISK_TO_TIER 五档
 *            映射（legacy 兼容层）＋ 显式声明升降规则；两者皆缺 → 保守缺省 S2
 *            （brownfield 兼容：≈现状 independent×1，不静默降级）。
 *   span  ＝ 声明文件数 ≥ SPAN_FILES_THRESHOLD ∨ 跨模块数 ≥ SPAN_MODULES_THRESHOLD ∨
 *            声明文件命中项目声明 span_risk 表（matchSpanRiskPatterns，
 *            2026-09-19-span-risk-pattern-migration D-003）→ 至少 S2。moduleIndex 沿用
 *            computeGateProfile 的输入形态（_module-map.yaml 解析结果，先例
 *            quick-gate-profile.js），缺失/空则跨模块检查跳过（不缺省不拦截）；声明文件数
 *            按 declaredFiles 全量计（任务卡口径，不复刻 quick-gate 的文档剔除）。
 *   friction ＝ friction-ledger 累计账的 gate_rollback + review_rejected 合计达到
 *            FRICTION_ESCALATION_THRESHOLD → 在 blast/span 结果上 +1 档封顶 S3，只升不降。
 *            只认 ledger 口径两键（禁读 friction-tally——其 consumeFrictionHint 消费即删，
 *            会给 verify 门引入隐式次序依赖）；入参携第三键 verify_run_failed 时透传容忍：
 *            不抛错不拒收、不参与升档计算。
 *
 * 零依赖纯函数：无 fs / 锁 / 网络 / 日志副作用；仓内 import 是 change-risk-profile.js 的
 * 纯常量 RISK_TO_TIER 与 span-risk-surface.js 的纯函数 matchSpanRiskPatterns（span 轴
 * 风险路径表自 2026-09-19-span-risk-pattern-migration D-003 起改项目声明 span_risk 段经
 * 参数注入，默认 [] = 模式维度关闭，不再内嵌全宇宙表）。阈值常量集中文件顶部可调
 * （R-02：上线前用 friction-ledger 历史变更回放标定再定值）。
 */
import { RISK_TO_TIER } from './change-risk-profile.js'
import { matchSpanRiskPatterns } from './span-risk-surface.js'

/** 仪式档位序（只升不降的偏序基准，index 即高低：S0=0 … S3=3） */
export const CEREMONY_TIERS = ['S0', 'S1', 'S2', 'S3']

// RISK_TO_TIER 迁源 re-export（2026-09-19-ceremony-pricing-five-cuts task-02）：五级词→档位映射表
// 判级域归属 change-risk-profile.js（resolveChangeRisk 消费方），本文件 re-export 保持既有
// import 面（test/ceremony-tier.test.mjs 等）不变——依赖方向 ceremony-tier→change-risk-profile
// 已有先例。
export { RISK_TO_TIER }

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
 * @param {{level: string}} [opts.riskDetection] legacy 判级输入（五级词 level，只消费 level；词表判级已退役——保留为既有调用方兼容通道，新调用走 blastTier）；
 *   缺失 / level 未知 → blast 保守缺省 S2（brownfield：不静默降级）
 * @param {string} [opts.blastTier] blast 轴直入（2026-09-19-ceremony-pricing-five-cuts task-03：
 *   resolveChangeRisk 声明面判级产物 tier——在场合跳过 riskDetection.level 映射直接起算；
 *   与 riskDetection 并存时 blastTier 优先；显式声明升降规则照常套用）
 * @param {string|{level: string, reason: string}} [opts.explicitRiskLevel] 显式声明
 *   （design frontmatter risk_level 通道）：升档永远尊重；降档须 reason（无 reason 的降档
 *   忽略并在 reasons 留痕），采纳时 explicitDowngradeAccepted=true 待收口双跑复核
 * @param {string[]} [opts.declaredFiles] 声明变更文件（span 轴；反斜杠自动归一 POSIX）
 * @param {object|null} [opts.moduleIndex] _module-map.yaml 解析结果（跨模块数口径）；
 *   null/undefined/空 → 跨模块检查跳过（不缺省不拦截）
 * @param {Array<{pattern: string, re: RegExp}>} [opts.spanRiskPatterns] span 轴风险路径声明表
 *   （span-risk-surface.js compile/load 产物；默认 [] = 模式维度关闭——项目声明 span_risk
 *   段由调用方装载注入，2026-09-19-span-risk-pattern-migration D-003；命中 → 至少 S2，
 *   reasons 记 token 与命中文件）
 * @param {object} [opts.frictionCounts] friction-ledger 累计账口径 { gate_rollback,
 *   review_rejected }——携 verify_run_failed 第三键透传容忍不拒收、不参与计算
 * @returns {{ tier: 'S0'|'S1'|'S2'|'S3', components: { blast: string, span: string, friction: string },
 *   reasons: string[], explicitDowngradeAccepted: boolean }}
 *   friction 分量＝升档后的档（未起爆为 S0，不参与封顶）；reasons 逐分量留痕（含阈值与
 *   命中明细），供消费方审计打印与双跑比对
 */
export function computeCeremonyTier({ riskDetection, blastTier, explicitRiskLevel, declaredFiles, moduleIndex, spanRiskPatterns = [], frictionCounts, config } = {}) {
  // ── 项目级配置覆写（2026-09-20 ceremony 项目化定价）：引擎保持纯函数零 IO，配置由调用方
  //    读 local.yaml ceremony: 段注入（readCeremonyPricingConfig）。可配的是「起点与阈值」：
  //    缺省档 / span 两阈值 / friction 起爆线 / 五级词映射。「只升不降」全局纪律（friction 升档、
  //    显式降档须理由）不开放配置——防项目把自己配裸奔。非法值逐项回退默认并在 reasons 留痕。
  const cfg = normalizeTierConfig(config)
  const reasons = []
  let explicitDowngradeAccepted = false

  // ── blast 轴：声明面直入（优先）＞ 判级映射 ＞ 保守缺省 ──
  let blast
  if (CEREMONY_TIERS.includes(blastTier)) {
    blast = blastTier
    reasons.push(`blast=${blast}（声明面直入 blastTier——resolveChangeRisk 声明危险面判级，D-008）`)
  } else {
    const detectedLevel = riskDetection != null && typeof riskDetection === 'object' ? riskDetection.level : undefined
    const mappedTier = cfg.riskTierMap[detectedLevel]
    if (mappedTier) {
      blast = mappedTier
      reasons.push(`blast=${blast}（riskDetection.level=${detectedLevel} 经 risk_tier_map 映射）`)
    } else {
      blast = cfg.defaultTier
      const cause = detectedLevel === undefined ? 'riskDetection.level 缺失' : `riskDetection.level=${String(detectedLevel)} 未知`
      reasons.push(`blast=${cfg.defaultTier}（保守缺省：${cause}${cfg.defaultTierSource === 'config' ? '，项目配置 default_tier' : '，brownfield 不静默降级'}）`)
    }
  }

  const explicit = normalizeExplicit(explicitRiskLevel)
  if (explicit) {
    const explicitTier = cfg.riskTierMap[explicit.level]
    if (!explicitTier) {
      reasons.push(`显式 risk_level 非法被忽略：${JSON.stringify(explicitRiskLevel)}（合法值：${Object.keys(cfg.riskTierMap).join(' / ')}）`)
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
  if (files.length >= cfg.spanFilesThreshold) {
    span = 'S2'
    reasons.push(`span=S2（声明文件 ${files.length} ≥ 阈值 ${cfg.spanFilesThreshold}${cfg.spanFilesSource === 'config' ? '（项目配置）' : ''}）`)
  }

  const modulesObj = resolveModulesObject(moduleIndex)
  if (modulesObj) {
    const hitModules = new Set()
    for (const f of files) {
      const id = matchModuleForFile(f, modulesObj)
      if (id != null) hitModules.add(id)
    }
    if (hitModules.size >= cfg.spanModulesThreshold) {
      span = 'S2'
      reasons.push(`span=S2（跨模块 ${hitModules.size} ≥ 阈值 ${cfg.spanModulesThreshold}${cfg.spanModulesSource === 'config' ? '（项目配置）' : ''}：${[...hitModules].join('、')}）`)
    }
  } // moduleIndex 缺失/空 → 跨模块检查跳过，span 其余两维照常

  // 风险路径模式维：共享 matcher（matchSpanRiskPatterns——files 已归一，其内部重复归一幂等；
  // 防御口径 null/非对象条目跳过与 /g lastIndex 归零由 matcher 承接），按 pattern 聚合 files
  // 保持 riskHitsByPattern 语义与 reasons 文案形态不变（只换表来源：注入声明表，默认 [] 关维）
  const riskHitsByPattern = new Map()
  for (const { pattern, file } of matchSpanRiskPatterns(files, spanRiskPatterns)) {
    const list = riskHitsByPattern.get(pattern) || []
    list.push(file)
    riskHitsByPattern.set(pattern, list)
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
  if (total >= cfg.frictionThreshold) {
    const base = maxTier(blast, span)
    friction = CEREMONY_TIERS[Math.min(tierRank(base) + 1, CEREMONY_TIERS.length - 1)]
    reasons.push(`friction 升档（gate_rollback+review_rejected 合计 ${total} ≥ 阈值 ${cfg.frictionThreshold}${cfg.frictionSource === 'config' ? '（项目配置）' : ''}，${base} → ${friction}，封顶 S3）`)
  }

  return { tier: maxTier(maxTier(blast, span), friction), components: { blast, span, friction }, reasons, explicitDowngradeAccepted }
}

/**
 * 项目级定价配置归一（computeCeremonyTier 内部消费，纯函数）：非法值逐项回退默认。
 * 入参形态即 local.yaml `ceremony:` 段的 pricing 五键（由 readCeremonyPricingConfig 读取注入，
 * 引擎自身不读文件）：
 *   default_tier（'S0'~'S3'）/ span_files_threshold（≥1 整数）/ span_modules_threshold（≥1 整数）
 *   / friction_escalation_threshold（≥1 整数）/ risk_tier_map（五级词→档位映射的**部分覆写**，
 *   与内置表浅合并——只覆写声明的词，未声明词保持内置值）。
 * 「只升不降」纪律不在此面（friction 升档/显式降档复核为全局语义，无配置出口）。
 */
function normalizeTierConfig(config) {
  const c = config != null && typeof config === 'object' && !Array.isArray(config) ? config : {}
  const out = {
    defaultTier: 'S2',
    defaultTierSource: 'builtin',
    spanFilesThreshold: SPAN_FILES_THRESHOLD,
    spanFilesSource: 'builtin',
    spanModulesThreshold: SPAN_MODULES_THRESHOLD,
    spanModulesSource: 'builtin',
    frictionThreshold: FRICTION_ESCALATION_THRESHOLD,
    frictionSource: 'builtin',
    riskTierMap: { ...RISK_TO_TIER },
  }
  if (CEREMONY_TIERS.includes(c.defaultTier)) {
    out.defaultTier = c.defaultTier
    out.defaultTierSource = 'config'
  }
  if (Number.isInteger(c.spanFilesThreshold) && c.spanFilesThreshold >= 1) {
    out.spanFilesThreshold = c.spanFilesThreshold
    out.spanFilesSource = 'config'
  }
  if (Number.isInteger(c.spanModulesThreshold) && c.spanModulesThreshold >= 1) {
    out.spanModulesThreshold = c.spanModulesThreshold
    out.spanModulesSource = 'config'
  }
  if (Number.isInteger(c.frictionThreshold) && c.frictionThreshold >= 1) {
    out.frictionThreshold = c.frictionThreshold
    out.frictionSource = 'config'
  }
  if (c.riskTierMap != null && typeof c.riskTierMap === 'object' && !Array.isArray(c.riskTierMap)) {
    for (const [level, tier] of Object.entries(c.riskTierMap)) {
      if (Object.prototype.hasOwnProperty.call(RISK_TO_TIER, level) && CEREMONY_TIERS.includes(tier)) {
        out.riskTierMap[level] = tier
      }
    }
  }
  return out
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
 * 声明追赶重定价（2026-09-19-ceremony-pricing-five-cuts task-03 / D-003 纯函数单点）：
 * 档位文件在场时完成门按当前声明面重算开跑价，「只升不降」契约修订为三分支——
 *   ① currentDoc.transitions 为空且 frictionTotal < 阈值 → 整档换重算结果（可升可降），
 *     reasons 记「声明追赶重定价」（后补 risk_level/声明面变化由此生效，不再粘住）；
 *   ② transitions 为空且 frictionTotal ≥ 阈值 → 同样整档换、不设地板——后续 escalateByFriction
 *     在同一锁内按既有 +1 语义即时兑现摩擦价（重算 S1 → 终 S2），摩擦价不因追赶丢失也不预支
 *     （可达入参：gate 失败先记摩擦于级联前段、升档检查点在级联末位，Grill P1-1 边界）；
 *   ③ transitions 非空 → 最终档 = maxTier(重算档, 摩擦地板)，地板 = transitions 内最高 to 档
 *     （已付摩擦价不白付；后续 escalate 若仍超阈按既有语义再 +1，封顶 S3）。
 * 重定价不记 transitions（该数组专属摩擦迁移审计）；transitions 原样透传。
 *
 * @param {object} opts
 * @param {{tier: string, components?: object, reasons?: string[], transitions?: Array<{to: string}>}} [opts.currentDoc] 现档位 doc（读档侧）
 * @param {string} opts.recomputedTier 按当前声明面重算的档（computeInitialCeremonyTierDoc 产物 tier）
 * @param {object} [opts.recomputedComponents] 重算分量（透传进新 doc）
 * @param {string[]} [opts.recomputedReasons] 重算 reasons（事件文案由调用方以参数区分——追赶场景不追加「初始档/首见」行）
 * @param {object} [opts.frictionCounts] ledger 累计账口径（携 verify_run_failed 第三键透传容忍）
 * @returns {{ tier: string, components: object, reasons: string[], transitions: Array<object> }}
 */
export function applyDeclarationCatchUp({ currentDoc, recomputedTier, recomputedComponents = {}, recomputedReasons = [], frictionCounts } = {}) {
  const transitions = Array.isArray(currentDoc && currentDoc.transitions) ? currentDoc.transitions : []
  const baseReasons = Array.isArray(currentDoc && currentDoc.reasons) ? currentDoc.reasons : []
  const recomputed = CEREMONY_TIERS.includes(recomputedTier) ? recomputedTier : (currentDoc && currentDoc.tier) || 'S1'
  const frictionOver = frictionTotal(frictionCounts) >= FRICTION_ESCALATION_THRESHOLD
  if (transitions.length === 0) {
    // 分支①②：无摩擦迁移——整档换（超阈不设地板，摩擦价交由同锁 escalate 即时兑现）
    return {
      tier: recomputed,
      components: recomputedComponents,
      reasons: [
        ...recomputedReasons,
        `声明追赶重定价（${(currentDoc && currentDoc.tier) || '无'} → ${recomputed}，无摩擦迁移${frictionOver ? '但摩擦已超阈——地板不设，同锁 escalate 即时 +1 兑现' : '且未超阈'}，blast/span 分量随当前声明面刷新，D-003）`,
      ],
      transitions,
    }
  }
  // 分支③：摩擦地板不退——最终档 = max(重算档, transitions 最高 to)
  const floor = transitions.reduce((acc, t) => maxTier(acc, t && t.to), 'S0')
  const final = maxTier(recomputed, floor)
  return {
    tier: final,
    components: recomputedComponents,
    reasons: [
      ...recomputedReasons,
      ...baseReasons.slice(-3), // 摩擦地板语境留最近三条旧痕防断代（全部保留会随每道门膨胀）
      `摩擦地板 ${floor} 不退，重算 ${recomputed} 被地板托底 → ${final}（transitions ${transitions.length} 条在场，D-003）`,
    ],
    transitions,
  }
}

/**
 * 双跑收口对账（verify --done / archive confirm 两出口）：事实面仅重跑 blast+span 两轴
 * （实际 diff 无声明通道；摩擦属过程面，阶段门已计过价，不重复升档），与开跑声明档比对。
 * 声明档低于事实档 → mismatch=true、severity='error'（懒 agent 低报硬 flag）；声明档高于
 * 事实档 → 高报态 severity='warn'（D-005：只记账不阻断——高报代价是更重仪式自罚机制天然
 * 在场，硬拦会把「误伤粘住」变成「收口再打回一轮」反向涨 token）；等档 'none'。声明档
 * 非法/缺失按最低档对账（fail-safe：无法证明声明到位 → 视为低报，宁严勿松）。
 *
 * @param {object} [opts]
 * @param {string} [opts.declaredTier] 开跑定价落档的声明档
 * @param {object} [opts.factRiskDetection] legacy 事实面判级输入（新调用走 factBlastTier）
 * @param {string} [opts.factBlastTier] 实际 diff × 声明面判级 tier（resolveChangeRisk 产物——
 *   在场合跳过 factRiskDetection 映射直入，2026-09-19-ceremony-pricing-five-cuts task-03）
 * @param {string[]} [opts.factFiles] 实际变更文件（scope-audit / apply-pathspec 文件集）
 * @param {object|null} [opts.factModuleIndex] _module-map.yaml 解析结果
 * @param {Array<{pattern: string, re: RegExp}>} [opts.factSpanRiskPatterns] 事实面 span 风险
 *   声明表（穿透内部 computeCeremonyTier 的 spanRiskPatterns；与 factBlastTier 同装载源
 *   ——项目声明 span_risk 段，默认 [] = 模式维度关闭，2026-09-19-span-risk-pattern-migration D-003）
 * @returns {{ factTier: 'S0'|'S1'|'S2'|'S3', mismatch: boolean, severity: 'error'|'warn'|'none' }}
 */
export function reconcileDualRun({ declaredTier, factRiskDetection, factBlastTier, factFiles, factModuleIndex, factSpanRiskPatterns = [] } = {}) {
  const fact = computeCeremonyTier({
    riskDetection: factRiskDetection,
    blastTier: factBlastTier,
    declaredFiles: factFiles,
    moduleIndex: factModuleIndex,
    spanRiskPatterns: factSpanRiskPatterns,
    frictionCounts: {},
  })
  const declaredRank = tierRank(declaredTier)
  const factRank = tierRank(fact.tier)
  // 声明档非法/缺失（rank<0）按最低档对账 → 事实高于声明即 error（fail-safe 宁严勿松）
  const mismatch = factRank > declaredRank
  const overReport = declaredRank > factRank && declaredRank >= 0
  return { factTier: fact.tier, mismatch, severity: mismatch ? 'error' : overReport ? 'warn' : 'none' }
}
