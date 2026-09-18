/**
 * ceremony-tier 定价引擎测试（2026-09-18-ceremony-risk-pricing task-07）
 *
 * 覆盖 FR-01/FR-03/FR-04（D-001 引擎骨架、D-003 双跑收口、D-004 显式声明通道、
 * D-007 影子隔离、D-008 friction 升档），七组断言：
 *   1. 三轴取封顶矩阵：ceremony_tier = max(blast, span, friction)——单分量高档+其余低档 →
 *      高档；多分量同档 → 档不变；全低 → S0；reasons 逐分量留痕
 *   2. RISK_TO_TIER 映射表逐档（integration/deployment 同归 S3）+ brownfield 保守缺省 S2
 *   3. escalateByFriction 只升不降 + S3 封顶 + thresholds 覆写/非法回退 + 第三键透传容忍
 *   4. reconcileDualRun 错配注入：声明 S1/事实 S2 → mismatch error；声明 ≥ 事实 → none；
 *      declaredTier 非法/缺失 → error（fail-safe 宁严勿松）
 *   5. 显式升降：升档永远尊重；降档带 reason 采纳（explicitDowngradeAccepted）；
 *      无 reason 降档忽略留痕；降档只作用 blast 轴不产生跨轴隐式降档
 *   6. 影子命名空间隔离：stage-reviews-shadow/ 产物不被主线 getLatestStageReviewRunId 命中
 *      （marker 优先与 fallback 扫描两通道都验）；仅影子存在 → null（fail-closed 不串台）
 *   7. 并发锁：withFileLock + writeAtomicSync 复刻 gates.js 档位文件锁内段——交错并发写
 *      S1/S3 终态恒 S3（高档先落低档后到不回退 + 拒降留痕 + 原子写无半截读）
 *
 * 风格：自研 assert 计数报告 + mkdtempSync 临时目录（对齐 test/machine-interface.test.mjs），
 * 不引入测试框架。约束（taskcard）：不 mock 引擎真实逻辑——computeCeremonyTier /
 * escalateByFriction / reconcileDualRun 直调真函数，仅 IO 边界（文件系统）用 tmp 目录隔离；
 * SPAN_MODULES_THRESHOLD / FRICTION_ESCALATION_THRESHOLD 在此消费（含默认值钉死），
 * 清 check-syntax.mjs 未引用导出红项——测试引用是消费，白名单是债。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  computeCeremonyTier,
  escalateByFriction,
  reconcileDualRun,
  CEREMONY_TIERS,
  RISK_TO_TIER,
  SPAN_FILES_THRESHOLD,
  SPAN_MODULES_THRESHOLD,
  FRICTION_ESCALATION_THRESHOLD,
} from '../src/ceremony-tier.js'
import { getLatestStageReviewRunId, stageReviewMarkerPath } from '../src/stage-review.js'
import { SHADOW_NAMESPACE_DIR } from '../src/review-dispatch.js'
import { withFileLock } from '../src/quicklog.js'
import { writeAtomicSync } from '../src/fs-atomic.js'

let total = 0
let failed = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 档位→序数（与引擎 tierRank 同口径） */
const rank = (t) => CEREMONY_TIERS.indexOf(t)

/** 生成 n 个不命中 QUICK_RISK_PATH_PATTERNS 的低风险文件名（span 轴干净对照用） */
const lowFiles = (n) => Array.from({ length: n }, (_, i) => `low${i}.js`)

/** 跨模块口径 fixture（paths 前缀归属，quick-gate-profile matchModuleForFile 同形态） */
const moduleIndex = {
  'mod-a': { paths: ['src/a/'] },
  'mod-b': { paths: ['src/b/'] },
  'mod-c': { paths: ['src/c/'] },
}

// ────────────────────────────────────────────────────────────
console.log('=== 1. 三轴取封顶矩阵（max(blast, span, friction)，FR-01/D-001）===\n')
{
  // 全低 → S0（三分量都未起爆）
  const all = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, declaredFiles: ['a.js', 'b.js'] })
  assert(all.tier === 'S0', `全低 → S0（实际 ${all.tier}）`)
  assert(all.components.blast === 'S0' && all.components.span === 'S0' && all.components.friction === 'S0',
    `全低分量明细 {blast,span,friction} 全 S0（实际 ${JSON.stringify(all.components)}）`)
  assert(all.explicitDowngradeAccepted === false, `无显式声明 → explicitDowngradeAccepted=false`)

  // 单分量高档：blast 高档 + 其余低档 → 高档
  const blastOnly = computeCeremonyTier({ riskDetection: { level: 'integration-critical' }, declaredFiles: ['a.js'] })
  assert(blastOnly.tier === 'S3' && blastOnly.components.blast === 'S3' && blastOnly.components.span === 'S0',
    `blast 单分量高档（integration-critical）→ S3，span 未起爆（实际 ${blastOnly.tier} / ${JSON.stringify(blastOnly.components)}）`)

  // 单分量高档：span 文件数轴（阈值相对断言，R-02 回放调参不破测试）
  const spanOnly = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, declaredFiles: lowFiles(SPAN_FILES_THRESHOLD) })
  assert(spanOnly.tier === 'S2' && spanOnly.components.span === 'S2' && spanOnly.components.blast === 'S0',
    `span 单分量高档（${SPAN_FILES_THRESHOLD} 文件 ≥ 阈值）→ S2（实际 ${spanOnly.tier}）`)
  const spanBelow = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, declaredFiles: lowFiles(SPAN_FILES_THRESHOLD - 1) })
  assert(spanBelow.tier === 'S0' && spanBelow.components.span === 'S0',
    `span 阈值下限（${SPAN_FILES_THRESHOLD - 1} 文件）→ 不起爆 S0（实际 ${spanBelow.tier}）`)

  // 单分量高档：span 跨模块轴（moduleIndex 口径 + moduleIndex 缺失跳过不炸）
  const crossModule = computeCeremonyTier({
    riskDetection: { level: 'doc-only' },
    declaredFiles: ['src/a/x.js', 'src/b/y.js', 'src/c/z.js'],
    moduleIndex,
  })
  assert(crossModule.tier === 'S2' && crossModule.components.span === 'S2',
    `span 跨模块（${SPAN_MODULES_THRESHOLD} 模块 ≥ 阈值）→ S2（实际 ${crossModule.tier}）`)
  const twoModules = computeCeremonyTier({
    riskDetection: { level: 'doc-only' },
    declaredFiles: ['src/a/x.js', 'src/b/y.js'],
    moduleIndex: { 'mod-a': { paths: ['src/a/'] }, 'mod-b': { paths: ['src/b/'] } },
  })
  assert(twoModules.tier === 'S0' && twoModules.components.span === 'S0',
    `跨模块阈值下限（${SPAN_MODULES_THRESHOLD - 1} 模块）→ 不起爆 S0（实际 ${twoModules.tier}）`)
  const noModuleIndex = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, declaredFiles: ['src/a/x.js'] })
  assert(noModuleIndex.tier === 'S0', `moduleIndex 缺失 → 跨模块检查跳过不缺省不拦截（实际 ${noModuleIndex.tier}）`)

  // 单分量高档：span 风险路径模式轴（含 Windows 反斜杠归一）
  const patHit = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, declaredFiles: ['src/oauth-config.js'] })
  assert(patHit.tier === 'S2' && patHit.components.span === 'S2',
    `span 风险路径命中（oauth）→ S2（实际 ${patHit.tier}）`)
  const patHitWin = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, declaredFiles: ['src\\billing-hook.js'] })
  assert(patHitWin.tier === 'S2', `反斜杠路径归一后风险路径命中（billing）→ S2（实际 ${patHitWin.tier}）`)

  // 单分量高档：friction 轴（低基 +1 档；两键合计口径）
  const frOnly = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, declaredFiles: ['a.js'], frictionCounts: { gate_rollback: FRICTION_ESCALATION_THRESHOLD } })
  assert(frOnly.tier === 'S1' && frOnly.components.friction === 'S1' && frOnly.components.blast === 'S0',
    `friction 单分量高档（合计 ≥ ${FRICTION_ESCALATION_THRESHOLD}）→ S0+1=S1（实际 ${frOnly.tier} / ${JSON.stringify(frOnly.components)}）`)
  const frMix = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, frictionCounts: { gate_rollback: 1, review_rejected: 1 } })
  assert(frMix.tier === 'S1' && frMix.components.friction === 'S1',
    `friction 两键合计口径（1+1 ≥ ${FRICTION_ESCALATION_THRESHOLD}）→ S1（实际 ${frMix.tier}）`)

  // 多分量同档 → 档不变（不叠加）
  const sameTier = computeCeremonyTier({ riskDetection: { level: 'contract-required' }, declaredFiles: lowFiles(SPAN_FILES_THRESHOLD) })
  assert(sameTier.tier === 'S2' && sameTier.components.blast === 'S2' && sameTier.components.span === 'S2',
    `blast S2 + span S2 同档 → 仍 S2 不叠加（实际 ${sameTier.tier}）`)

  // 三轴合流取最高：blast S1 + span S2 + friction 超阈 → max(S1,S2)+1 封顶 S3
  const combined = computeCeremonyTier({
    riskDetection: { level: 'unit-sufficient' },
    declaredFiles: lowFiles(SPAN_FILES_THRESHOLD),
    frictionCounts: { review_rejected: FRICTION_ESCALATION_THRESHOLD },
  })
  assert(combined.tier === 'S3' && combined.components.friction === 'S3',
    `三轴合流（blast S1/span S2/friction 超阈）→ max+1 封顶 S3（实际 ${combined.tier}）`)

  // reasons 逐分量留痕（含阈值与命中明细，供审计与双跑比对）
  assert(Array.isArray(combined.reasons) && combined.reasons.some((r) => r.startsWith('blast=')),
    `reasons 含 blast 分量留痕（实际 ${JSON.stringify(combined.reasons)}）`)
  assert(combined.reasons.some((r) => r.includes('span=S2')), `reasons 含 span 分量留痕`)
  assert(combined.reasons.some((r) => r.includes('friction 升档') && r.includes(`阈值 ${FRICTION_ESCALATION_THRESHOLD}`)),
    `reasons 含 friction 分量留痕（含阈值数字）`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 2. RISK_TO_TIER 映射表逐档 + brownfield 缺省（FR-01）===\n')
{
  assert(RISK_TO_TIER['doc-only'] === 'S0', `doc-only → S0`)
  assert(RISK_TO_TIER['unit-sufficient'] === 'S1', `unit-sufficient → S1`)
  assert(RISK_TO_TIER['contract-required'] === 'S2', `contract-required → S2`)
  assert(RISK_TO_TIER['integration-critical'] === 'S3', `integration-critical → S3`)
  assert(RISK_TO_TIER['deployment-critical'] === 'S3', `deployment-critical → S3（integration/deployment 同归 S3：顶档仪式不分家）`)
  assert(Object.keys(RISK_TO_TIER).length === 5, `RISK_TO_TIER 恰五档（实际 ${Object.keys(RISK_TO_TIER).length}）`)
  assert(JSON.stringify(CEREMONY_TIERS) === JSON.stringify(['S0', 'S1', 'S2', 'S3']),
    `CEREMONY_TIERS 序 S0<S1<S2<S3（实际 ${JSON.stringify(CEREMONY_TIERS)}）`)

  // 逐档过引擎（tier 与 components.blast 双钉）
  for (const [level, want] of Object.entries(RISK_TO_TIER)) {
    const r = computeCeremonyTier({ riskDetection: { level } })
    assert(r.tier === want && r.components.blast === want, `riskDetection.level=${level} → tier=${want}（实际 ${r.tier}/${r.components.blast}）`)
  }

  // brownfield：旧变更无 riskDetection 输入 → blast 保守缺省 S2，不静默降级（兼容策略钉死）
  const noRisk = computeCeremonyTier({})
  assert(noRisk.tier === 'S2' && noRisk.components.blast === 'S2',
    `无 riskDetection 输入 → 保守缺省 S2（实际 ${noRisk.tier}/${noRisk.components.blast}）`)
  assert(noRisk.reasons.some((r) => r.includes('保守缺省')), `缺省留痕含「保守缺省」字样（实际 ${JSON.stringify(noRisk.reasons)}）`)

  // 未知 level → 同保守缺省（不抛不降级）
  const unknown = computeCeremonyTier({ riskDetection: { level: 'garbage' } })
  assert(unknown.tier === 'S2' && unknown.components.blast === 'S2', `未知 level → 保守缺省 S2（实际 ${unknown.tier}）`)

  // 非对象 riskDetection → 防御性同缺省
  const badShape = computeCeremonyTier({ riskDetection: 'nope' })
  assert(badShape.tier === 'S2', `非对象 riskDetection → 保守缺省 S2 不炸（实际 ${badShape.tier}）`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 3. escalateByFriction 只升不降 + 封顶 + 阈值覆写 + 第三键透传（FR-04/D-008）===\n')
{
  // 阈值默认值钉死（本测试消费两常量，清 check-syntax 未引用导出红项；R-02 回放调参时此处醒目红）
  assert(SPAN_FILES_THRESHOLD === 8 && SPAN_MODULES_THRESHOLD === 3 && FRICTION_ESCALATION_THRESHOLD === 2,
    `阈值默认值：SPAN_FILES=8 / SPAN_MODULES=3 / FRICTION_ESCALATION=2（实际 ${SPAN_FILES_THRESHOLD}/${SPAN_MODULES_THRESHOLD}/${FRICTION_ESCALATION_THRESHOLD}）`)

  // 未超阈 → 档不变
  const under = escalateByFriction('S1', { gate_rollback: 1, review_rejected: 0 })
  assert(under.tier === 'S1' && under.escalated === false, `未超阈 → S1 不变 escalated=false（实际 ${under.tier}/${under.escalated}）`)

  // 超阈 → min(S3, tier+1)，escalated=true
  const over = escalateByFriction('S1', { gate_rollback: FRICTION_ESCALATION_THRESHOLD })
  assert(over.tier === 'S2' && over.escalated === true, `超阈 → S1+1=S2 escalated=true（实际 ${over.tier}/${over.escalated}）`)
  const sum = escalateByFriction('S0', { gate_rollback: 1, review_rejected: 1 })
  assert(sum.tier === 'S1' && sum.escalated === true, `两键合计超阈（1+1）→ S0+1=S1（实际 ${sum.tier}）`)

  // S3 封顶：超阈仍 S3 且 escalated=false（顶档无可升）
  const cap = escalateByFriction('S3', { gate_rollback: 99 })
  assert(cap.tier === 'S3' && cap.escalated === false, `S3 超阈 → 封顶 S3 escalated=false（实际 ${cap.tier}/${cap.escalated}）`)

  // 只升不降：零账/低账/空输入永不降档
  const flat = escalateByFriction('S2', {})
  assert(flat.tier === 'S2' && flat.escalated === false, `零账 → S2 不降（实际 ${flat.tier}）`)
  const noCounts = escalateByFriction('S2')
  assert(noCounts.tier === 'S2', `counts 缺省 → S2 不降（实际 ${noCounts.tier}）`)

  // thresholds 数字覆写
  const numHigh = escalateByFriction('S0', { gate_rollback: 5 }, 10)
  assert(numHigh.tier === 'S0' && numHigh.escalated === false, `thresholds=10 数字覆写：5<10 不升（实际 ${numHigh.tier}）`)
  const numLow = escalateByFriction('S0', { gate_rollback: 5 }, 3)
  assert(numLow.tier === 'S1' && numLow.escalated === true, `thresholds=3 数字覆写：5≥3 → S1（实际 ${numLow.tier}）`)

  // thresholds 对象覆写（frictionEscalation 键）
  const obj = escalateByFriction('S0', { gate_rollback: 1 }, { frictionEscalation: 1 })
  assert(obj.tier === 'S1' && obj.escalated === true, `thresholds={frictionEscalation:1} → 1≥1 升 S1（实际 ${obj.tier}）`)

  // thresholds 非法回退默认（0/负/非整数/字符串/坏对象/数组——回退后 1<2 不升为判别式）
  assert(escalateByFriction('S0', { gate_rollback: 1 }, 0).escalated === false, `thresholds=0 非法 → 回退默认不升`)
  assert(escalateByFriction('S0', { gate_rollback: 1 }, -1).escalated === false, `thresholds=-1 非法 → 回退默认不升`)
  assert(escalateByFriction('S0', { gate_rollback: 1 }, 1.5).escalated === false, `thresholds=1.5 非整数 → 回退默认不升`)
  assert(escalateByFriction('S0', { gate_rollback: 1 }, 'abc').escalated === false, `thresholds='abc' → 回退默认不升`)
  assert(escalateByFriction('S0', { gate_rollback: 1 }, { bogus: 1 }).escalated === false, `thresholds 无 frictionEscalation 键 → 回退默认不升`)
  assert(escalateByFriction('S0', { gate_rollback: 1 }, [1]).escalated === false, `thresholds 数组 → 回退默认不升`)
  const fallbackEscalates = escalateByFriction('S0', { gate_rollback: FRICTION_ESCALATION_THRESHOLD }, null)
  assert(fallbackEscalates.tier === 'S1', `thresholds=null 回退默认 → 2≥2 照常起爆（证明回退值=默认而非禁用）`)

  // 第三键 verify_run_failed 透传容忍：不消费不拒收不抛（ledger 三键超集直传）
  const third = escalateByFriction('S0', { gate_rollback: 1, review_rejected: 0, verify_run_failed: 99 })
  assert(third.tier === 'S0' && third.escalated === false, `第三键在场不计价：1<2 不升（实际 ${third.tier}）`)
  const thirdAlone = escalateByFriction('S1', { verify_run_failed: 50 })
  assert(thirdAlone.tier === 'S1' && thirdAlone.escalated === false, `仅第三键 → 不升不拒收不抛（实际 ${thirdAlone.tier}）`)

  // 脏值按 0（非有限数/负数/null/非对象）
  assert(escalateByFriction('S1', null).tier === 'S1', `counts=null → 不升不炸`)
  assert(escalateByFriction('S1', 'junk').tier === 'S1', `counts 非对象 → 不升不炸`)
  assert(escalateByFriction('S1', { gate_rollback: -5, review_rejected: Number.NaN }).escalated === false,
    `负数/NaN 脏值按 0 → 不升不炸`)

  // 当前档非法 → 原样返回不发明新档
  const badTier = escalateByFriction('SX', { gate_rollback: 9 })
  assert(badTier.tier === 'SX' && badTier.escalated === false, `当前档非法 → 原样返回不发明新档（实际 ${badTier.tier}）`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 4. reconcileDualRun 错配注入（FR-03/D-003 双跑收口）===\n')
{
  // 声明 S1 / 事实 S2 → mismatch=true 且 severity='error'（懒 agent 低报硬 flag）
  const under = reconcileDualRun({ declaredTier: 'S1', factRiskDetection: { level: 'contract-required' }, factFiles: ['a.js'] })
  assert(under.factTier === 'S2' && under.mismatch === true && under.severity === 'error',
    `声明 S1/事实 S2 → mismatch error（实际 ${under.factTier}/${under.mismatch}/${under.severity}）`)

  // 声明 ≥ 事实 → 无错配
  const eq = reconcileDualRun({ declaredTier: 'S2', factRiskDetection: { level: 'contract-required' } })
  assert(eq.mismatch === false && eq.severity === 'none', `声明 S2/事实 S2 等档 → none（实际 ${eq.mismatch}/${eq.severity}）`)
  const above = reconcileDualRun({ declaredTier: 'S3', factRiskDetection: { level: 'contract-required' } })
  assert(above.mismatch === false && above.severity === 'none', `声明 S3/事实 S2 高报 → none（只罚低报不罚高报）`)

  // declaredTier 非法/缺失 → fail-safe 视为低报 error（无法证明声明到位 → 宁严勿松）
  const badTier = reconcileDualRun({ declaredTier: 'SX', factRiskDetection: { level: 'doc-only' } })
  assert(badTier.mismatch === true && badTier.severity === 'error', `declaredTier 非法 → error（实际 ${badTier.mismatch}/${badTier.severity}）`)
  const noTier = reconcileDualRun({ factRiskDetection: { level: 'doc-only' } })
  assert(noTier.mismatch === true && noTier.severity === 'error', `declaredTier 缺失 → error（实际 ${noTier.mismatch}/${noTier.severity}）`)

  // 事实面仅 blast+span 两轴：实际 diff 文件集驱动 span 计价
  const spanFact = reconcileDualRun({ declaredTier: 'S1', factRiskDetection: { level: 'unit-sufficient' }, factFiles: lowFiles(SPAN_FILES_THRESHOLD + 1) })
  assert(spanFact.factTier === 'S2' && spanFact.mismatch === true,
    `事实 span 起爆（${SPAN_FILES_THRESHOLD + 1} 文件）→ 事实 S2 > 声明 S1 → mismatch（实际 ${spanFact.factTier}）`)
  const spanFactOk = reconcileDualRun({ declaredTier: 'S2', factRiskDetection: { level: 'unit-sufficient' }, factFiles: lowFiles(SPAN_FILES_THRESHOLD + 1) })
  assert(spanFactOk.mismatch === false, `同事实面声明 S2 → 无错配（实际 ${spanFactOk.mismatch}）`)

  // factModuleIndex 透传（跨模块计价入口）
  const modFact = reconcileDualRun({
    declaredTier: 'S1', factRiskDetection: { level: 'doc-only' },
    factFiles: ['src/a/x.js', 'src/b/y.js', 'src/c/z.js'], factModuleIndex: moduleIndex,
  })
  assert(modFact.factTier === 'S2' && modFact.mismatch === true, `factModuleIndex 跨模块 → 事实 S2 > 声明 S1 → mismatch（实际 ${modFact.factTier}）`)

  // 全空事实面 → blast 保守缺省 S2（事实侧同样不静默降级），声明 S2 无错配
  const empty = reconcileDualRun({ declaredTier: 'S2' })
  assert(empty.factTier === 'S2' && empty.mismatch === false, `空事实面 → 保守 S2 与声明 S2 对齐（实际 ${empty.factTier}/${empty.mismatch}）`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 5. 显式升降规则（FR-01/D-004：一切自报只升不可降）===\n')
{
  // 显式升档永远尊重（string 形态）
  const up = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, explicitRiskLevel: 'deployment-critical' })
  assert(up.tier === 'S3' && up.components.blast === 'S3', `升档声明 doc-only→deployment-critical → 尊重 S3（实际 ${up.tier}/${up.components.blast}）`)
  assert(up.reasons.some((r) => r.includes('升档尊重')), `升档留痕含「升档尊重」（实际 ${JSON.stringify(up.reasons)}）`)

  // 等档声明：无行为差异
  const equal = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, explicitRiskLevel: 'doc-only' })
  assert(equal.tier === 'S0' && equal.explicitDowngradeAccepted === false, `等档声明 → 无行为差异（实际 ${equal.tier}）`)

  // 显式降档带 reason → 采纳 + explicitDowngradeAccepted=true（待收口双跑复核）
  const down = computeCeremonyTier({ riskDetection: { level: 'contract-required' }, explicitRiskLevel: { level: 'unit-sufficient', reason: '纯文档微调' } })
  assert(down.tier === 'S1' && down.components.blast === 'S1', `降档声明带 reason → 采纳 S1（实际 ${down.tier}/${down.components.blast}）`)
  assert(down.explicitDowngradeAccepted === true, `降档采纳 → explicitDowngradeAccepted=true`)
  assert(down.reasons.some((r) => r.includes('降档采纳') && r.includes('待收口')), `降档留痕含「降档采纳/待收口」`)

  // 无 reason 降档 → 忽略留痕（string 形态 / 对象无 reason / 空白 reason 三态）
  const noReason = computeCeremonyTier({ riskDetection: { level: 'contract-required' }, explicitRiskLevel: 'doc-only' })
  assert(noReason.tier === 'S2' && noReason.explicitDowngradeAccepted === false, `string 降档无 reason → 忽略保 S2（实际 ${noReason.tier}）`)
  assert(noReason.reasons.some((r) => r.includes('缺理由被忽略')), `忽略降档留痕含「缺理由被忽略」`)
  const objNoReason = computeCeremonyTier({ riskDetection: { level: 'contract-required' }, explicitRiskLevel: { level: 'doc-only' } })
  assert(objNoReason.tier === 'S2' && objNoReason.explicitDowngradeAccepted === false, `对象降档无 reason → 忽略保 S2（实际 ${objNoReason.tier}）`)
  const blankReason = computeCeremonyTier({ riskDetection: { level: 'contract-required' }, explicitRiskLevel: { level: 'doc-only', reason: '   ' } })
  assert(blankReason.tier === 'S2' && blankReason.explicitDowngradeAccepted === false, `空白 reason 视同无理由 → 忽略保 S2（实际 ${blankReason.tier}）`)

  // 非法显式声明 → 忽略留痕不炸
  const illegal = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, explicitRiskLevel: 'yolo' })
  assert(illegal.tier === 'S0' && illegal.reasons.some((r) => r.includes('非法被忽略')), `非法显式声明 → 忽略留痕保判级（实际 ${illegal.tier}）`)

  // 降档只作用于 blast 轴：span 起爆仍封顶（自报不产生跨轴隐式降档）
  const downWithSpan = computeCeremonyTier({
    riskDetection: { level: 'contract-required' },
    explicitRiskLevel: { level: 'doc-only', reason: 'r' },
    declaredFiles: lowFiles(SPAN_FILES_THRESHOLD),
  })
  assert(downWithSpan.tier === 'S2' && downWithSpan.components.blast === 'S0' && downWithSpan.explicitDowngradeAccepted === true,
    `blast 降档采纳后 span 起爆仍封顶 S2（实际 ${downWithSpan.tier}，blast=${downWithSpan.components.blast}）`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 6. 影子命名空间隔离（FR-04/D-007/R-06：主线 gate 不命中影子产物）===\n')
{
  assert(SHADOW_NAMESPACE_DIR === 'stage-reviews-shadow', `影子命名空间目录名契约（实际 ${SHADOW_NAMESPACE_DIR}）`)

  const runtimeRoot = makeTmpDir('ct-shadow-')
  const stage = 'plan'
  const change = 'chg-shadow'
  const mainRunId = 'review-2026-09-18-120000'

  // 主线 marker + 主线 stage-reviews 目录并存
  writeFileSync(stageReviewMarkerPath(runtimeRoot, stage, change), mainRunId + '\n')
  mkdirSync(join(runtimeRoot, 'stage-reviews', `${stage}-${mainRunId}`), { recursive: true })
  writeFileSync(join(runtimeRoot, 'stage-reviews', `${stage}-${mainRunId}`, 'review.json'),
    JSON.stringify({ reviewedFiles: [`changes/${change}/plan.md`], specVerdict: 'pass' }))

  // 影子产物（task-06 布局：<shadow>/<change>-<stage>-<ts>/review.json，verdict=fail、时间戳更晚）
  const shadowDir = join(runtimeRoot, SHADOW_NAMESPACE_DIR, `${change}-${stage}-20260918-120500`)
  mkdirSync(shadowDir, { recursive: true })
  writeFileSync(join(shadowDir, 'review.json'),
    JSON.stringify({ verdict: 'fail', specVerdict: 'fail', reviewedFiles: [`changes/${change}/plan.md`] }))

  // 通道一（marker 优先）：读回主线 runId，绝不命中影子
  const byMarker = getLatestStageReviewRunId(runtimeRoot, stage, change)
  assert(byMarker === mainRunId, `marker 优先读主线 runId（实际 ${byMarker}），影子产物不命中`)

  // 通道二（fallback 目录扫描）：只扫 stage-reviews/，影子是兄弟命名空间不串台
  rmSync(stageReviewMarkerPath(runtimeRoot, stage, change))
  const byScan = getLatestStageReviewRunId(runtimeRoot, stage, change)
  assert(byScan === mainRunId, `fallback 扫描不读影子命名空间（实际 ${byScan}）`)

  // 仅影子存在（主线无 marker 无目录）→ null（fail-closed 不串台）
  const onlyShadow = makeTmpDir('ct-shadowonly-')
  const sd = join(onlyShadow, SHADOW_NAMESPACE_DIR, `${change}-${stage}-20260918-130000`)
  mkdirSync(sd, { recursive: true })
  writeFileSync(join(sd, 'review.json'), JSON.stringify({ specVerdict: 'fail' }))
  assert(getLatestStageReviewRunId(onlyShadow, stage, change) === null,
    `仅影子存在（带 changeName）→ null fail-closed（实际 ${getLatestStageReviewRunId(onlyShadow, stage, change)}）`)
  assert(getLatestStageReviewRunId(onlyShadow, stage) === null,
    `仅影子存在（无 changeName 重载）→ null fail-closed`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 7. 并发锁：交错写档位文件只升不降（FR-04/D-008）===\n')
{
  // gates.js 的档位文件读写函数（ceremonyTierFilePath/readCeremonyTierDoc/writeCeremonyTierDoc/
  // escalateCeremonyTierAtGate）均模块私有未导出——按 task-07 指引直接测 withFileLock+
  // writeAtomicSync 组合，复刻 gates.js 锁内段语义：读档（缺失→S0）→ 算目标档 → 写前对磁盘
  // 更高档拒绝降档写回 → writeAtomicSync 原子写。
  const runtimeRoot = makeTmpDir('ct-lock-')
  const readDoc = (path) => {
    try {
      const d = JSON.parse(readFileSync(path, 'utf8'))
      return d && typeof d === 'object' && rank(d.tier) >= 0 ? d : null
    } catch { return null }
  }

  /** 目标档直给写者（读→异步缝隙→拒降守卫→原子写，gates.js 三重保证的测试侧复刻） */
  async function lockedTierWrite(path, targetTier, tag) {
    return withFileLock(path + '.lock', async () => {
      const doc = readDoc(path)
      const current = doc ? doc.tier : 'S0'
      // 读后写前留异步缝隙：无锁时两写者在此交错 → 丢失更新/降档回退
      await sleep(15)
      const diskTier = readDoc(path)?.tier ?? current
      const rejected = rank(diskTier) > rank(targetTier)
      const finalTier = rejected ? diskTier : targetTier
      const next = {
        tier: finalTier,
        components: { ...(doc && doc.components ? doc.components : {}), friction: finalTier },
        reasons: [
          ...((doc && doc.reasons) || []),
          `并发写检查点 ${tag}：目标 ${targetTier}，磁盘 ${diskTier} → 落 ${finalTier}${rejected ? '（拒绝降档写回）' : ''}`,
        ],
        transitions: [...((doc && doc.transitions) || []), ...(finalTier !== current ? [{ from: current, to: finalTier, tag }] : [])],
      }
      writeAtomicSync(path, JSON.stringify(next, null, 2))
      return finalTier
    })
  }

  /** 生产形态检查点：锁内 escalateByFriction 驱动（与 gates.js escalateCeremonyTierAtGate 同驱动源） */
  async function frictionCheckpoint(path, frictionCounts) {
    return withFileLock(path + '.lock', async () => {
      const doc = readDoc(path)
      const current = doc ? doc.tier : 'S0'
      await sleep(10)
      const esc = escalateByFriction(current, frictionCounts)
      const next = {
        tier: esc.tier,
        components: { ...(doc && doc.components ? doc.components : {}), friction: esc.tier },
        reasons: [...((doc && doc.reasons) || []), `friction 检查点：${current} → ${esc.tier}${esc.escalated ? '' : '（未升）'}`],
        transitions: [...((doc && doc.transitions) || []), ...(esc.escalated ? [{ from: current, to: esc.tier }] : [])],
      }
      writeAtomicSync(path, JSON.stringify(next, null, 2))
      return esc
    })
  }

  // 7a. 交错并发：两写者同发 S1/S3 → 终态恒 S3（多轮换启动序覆盖两种完成序）
  for (let round = 0; round < 4; round++) {
    const p = join(runtimeRoot, `ceremony-tier-r${round}.json`)
    const writers = round % 2 === 0
      ? [lockedTierWrite(p, 'S1', 'low'), lockedTierWrite(p, 'S3', 'high')]
      : [lockedTierWrite(p, 'S3', 'high'), lockedTierWrite(p, 'S1', 'low')]
    const results = await Promise.all(writers)
    const final = readDoc(p)
    assert(final && final.tier === 'S3',
      `第 ${round} 轮并发写 S1/S3 → 终态 S3（实际 ${final && final.tier}；写者返回 ${results.join('/')}）`)
  }

  // 7b. taskcard 指定序：高档写先落、低档写后到 → 不回退 + 拒降留痕
  const p2 = join(runtimeRoot, 'ceremony-tier-seq.json')
  const first = await lockedTierWrite(p2, 'S3', 'high-first')
  const second = await lockedTierWrite(p2, 'S1', 'low-late')
  assert(first === 'S3' && second === 'S3', `高档先落 S3、低档后到 → 均返回 S3（实际 ${first}/${second}，降档被拒）`)
  const doc2 = readDoc(p2)
  assert(doc2 && doc2.tier === 'S3' && doc2.reasons.some((r) => r.includes('拒绝降档写回')),
    `终态 S3 且拒降 reasons 留痕（实际 ${doc2 && doc2.tier}）`)

  // 7c. escalateByFriction 驱动检查点链：空档三连升 S0→S1→S2→S3，第四发封顶不再升
  const p3 = join(runtimeRoot, 'ceremony-tier-chain.json')
  const chain = []
  for (let i = 0; i < 4; i++) chain.push(await frictionCheckpoint(p3, { gate_rollback: FRICTION_ESCALATION_THRESHOLD }))
  assert(chain[0].tier === 'S1' && chain[1].tier === 'S2' && chain[2].tier === 'S3' && chain[3].tier === 'S3' && chain[3].escalated === false,
    `friction 检查点链 S0→S1→S2→S3 封顶（实际 ${chain.map((c) => c.tier + (c.escalated ? '+' : '=')).join('→')}）`)
  const doc3 = readDoc(p3)
  assert(doc3 && doc3.transitions.length === 3, `transitions 恰 3 条迁移（封顶发不追加，实际 ${doc3 && doc3.transitions.length}）`)

  // 7d. 锁有效性判别：两并发同账检查点，锁内串行 → 后者必读到前者的 S1 → 终态 S2；
  //     锁失效交错（双双读 S0）→ 终态停在 S1（丢失更新）——终态 S2 即锁真实生效
  const p5 = join(runtimeRoot, 'ceremony-tier-lockeff.json')
  const pair = await Promise.all([
    frictionCheckpoint(p5, { gate_rollback: FRICTION_ESCALATION_THRESHOLD }),
    frictionCheckpoint(p5, { gate_rollback: FRICTION_ESCALATION_THRESHOLD }),
  ])
  const doc5 = readDoc(p5)
  assert(doc5 && doc5.tier === 'S2' && pair.every((r) => r.escalated),
    `并发同账双检查点 → 终态 S2 无丢失更新（实际 ${doc5 && doc5.tier}；锁失效会停 S1）`)

  // 7e. writeAtomicSync 原子性：并发写期间读者恒见完整 JSON（旧版或新版，无半截）
  const p4 = join(runtimeRoot, 'ceremony-tier-atomic.json')
  const writers = Promise.all([lockedTierWrite(p4, 'S3', 'w1'), lockedTierWrite(p4, 'S2', 'w2'), lockedTierWrite(p4, 'S1', 'w3')])
  let polls = 0
  let parseFailures = 0
  while (polls < 40) {
    await sleep(3)
    if (existsSync(p4)) {
      try { readDoc(p4) } catch { parseFailures++ }
    }
    polls++
  }
  const w4 = await writers
  const doc4 = readDoc(p4)
  assert(parseFailures === 0, `并发写期间 ${polls} 次轮询零半截 JSON（坏读 ${parseFailures}）`)
  assert(doc4 && doc4.tier === 'S3' && w4.every((t) => rank(t) >= 0),
    `三写者 S3/S2/S1 并发 → 终态 S3，各写者返回合法档不发明新档（实际终态 ${doc4 && doc4.tier}，返回 ${w4.join('/')}）`)
}

// ── 清理 & 汇总 ──
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
