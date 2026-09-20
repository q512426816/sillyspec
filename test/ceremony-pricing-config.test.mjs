/**
 * ceremony 项目化定价配置测试（2026-09-20：每个项目体系不一样，S0~S3 判定阈值可配）
 *
 * 覆盖：
 *   1. computeCeremonyTier config 参五键逐项生效（default_tier/span 两阈值/friction 阈值/risk_tier_map）
 *   2. 非法值逐项回退内置默认（纯函数不抛）；risk_tier_map 部分覆写（未声明词保持内置）
 *   3. 「只升不降」纪律不受配置影响（friction 升档照炸、显式降档仍须理由）
 *   4. readCeremonyPricingConfig 读取器：合法/非法/缺段/坏 yaml 四态
 *   5. 零配置 = 现行行为零回归（内置值路径）
 *
 * 风格：自研 assert（同 ceremony-tier.test.mjs）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { computeCeremonyTier } from '../src/ceremony-tier.js'
import { readCeremonyPricingConfig } from '../src/ceremony-config.js'

let failed = 0
let total = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) } else { console.log(`  ✅ PASS: ${msg}`) }
}
const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }

// ── 1. 五键逐项生效 ──
{
  // default_tier：小仓降 S1
  const r1 = computeCeremonyTier({ declaredFiles: [], config: { defaultTier: 'S1' } })
  assert(r1.tier === 'S1' && r1.reasons.some(x => x.includes('项目配置 default_tier')), `1a default_tier=S1 生效（实际 ${r1.tier}）`)
  // span_files_threshold=3：3 文件即 S2（内置 8 不炸）
  const files3 = ['a.ts', 'b.ts', 'c.ts']
  const rNoCfg = computeCeremonyTier({ blastTier: 'S0', declaredFiles: files3 })
  assert(rNoCfg.components.span === 'S0', '1b 前置：3 文件在内置阈值 8 下不炸 span')
  const rCfg = computeCeremonyTier({ blastTier: 'S0', declaredFiles: files3, config: { spanFilesThreshold: 3 } })
  assert(rCfg.components.span === 'S2' && rCfg.tier === 'S2' && rCfg.reasons.some(x => x.includes('项目配置')), '1c span_files_threshold=3 → 3 文件即 S2')
  // friction_threshold=1：一次拦拒即升档
  const f1 = { gate_rollback: 1, review_rejected: 0 }
  const rFno = computeCeremonyTier({ blastTier: 'S1', declaredFiles: [], frictionCounts: f1 })
  assert(rFno.tier === 'S1', '1d 前置：1 次摩擦内置阈值 2 不升档')
  const rFcfg = computeCeremonyTier({ blastTier: 'S1', declaredFiles: [], frictionCounts: f1, config: { frictionThreshold: 1 } })
  assert(rFcfg.tier === 'S2' && rFcfg.components.friction === 'S2', `1e friction_threshold=1 → 1 次即升 S2（实际 ${rFcfg.tier}）`)
  // risk_tier_map 部分覆写：unit-sufficient→S2
  const rMap = computeCeremonyTier({ riskDetection: { level: 'unit-sufficient' }, config: { riskTierMap: { 'unit-sufficient': 'S2' } } })
  assert(rMap.tier === 'S2', `1f risk_tier_map 覆写 unit-sufficient→S2（实际 ${rMap.tier}）`)
  const rMapOther = computeCeremonyTier({ riskDetection: { level: 'doc-only' }, config: { riskTierMap: { 'unit-sufficient': 'S2' } } })
  assert(rMapOther.tier === 'S0', '1g 未覆写词 doc-only 保持内置 S0（部分覆写语义）')
}

// ── 2. 非法值回退 ──
{
  const r = computeCeremonyTier({
    declaredFiles: [],
    config: { defaultTier: 'S9', spanFilesThreshold: -1, spanModulesThreshold: 'x', frictionThreshold: 0, riskTierMap: { 'doc-only': 'SX', 未知词: 'S3' } },
  })
  assert(r.tier === 'S2', `2a 全非法配置 → 内置默认 S2（实际 ${r.tier}，不抛不发明新档）`)
}

// ── 3. 只升不降纪律不受配置影响 ──
{
  // 显式降档仍须理由（配置 defaultTier 再低也不给白降）
  const r = computeCeremonyTier({ blastTier: 'S3', explicitRiskLevel: { level: 'doc-only' }, config: { defaultTier: 'S0' } })
  assert(r.tier === 'S3', '3a 显式降档无理由仍被拒（配置不开放逃审）')
  // friction 升档封顶 S3 不受配置抬高
  const r2 = computeCeremonyTier({ blastTier: 'S2', declaredFiles: [], frictionCounts: { gate_rollback: 5 }, config: { frictionThreshold: 1 } })
  assert(r2.tier === 'S3', '3b friction 封顶 S3 照旧')
}

// ── 4. 读取器四态 ──
{
  const root = mk('cercfg-')
  const spec = join(root, '.sillyspec')
  mkdirSync(spec, { recursive: true })
  assert(Object.keys(readCeremonyPricingConfig(spec)).length === 0, '4a 无 local.yaml → 空配置')
  writeFileSync(join(spec, 'local.yaml'), 'commands:\n  test: x\n')
  assert(Object.keys(readCeremonyPricingConfig(spec)).length === 0, '4b 无 ceremony 段 → 空配置')
  writeFileSync(join(spec, 'local.yaml'), [
    'ceremony:',
    '  default_tier: S1',
    '  span_files_threshold: 3',
    '  span_modules_threshold: 2',
    '  friction_escalation_threshold: 1',
    "  risk_tier_map: { 'unit-sufficient': S2 }",
    '  force_tier: S3',
    '  shadow: false',
    '',
  ].join('\n'))
  const c = readCeremonyPricingConfig(spec)
  assert(c.defaultTier === 'S1' && c.spanFilesThreshold === 3 && c.spanModulesThreshold === 2 && c.frictionThreshold === 1, `4c 五键合法读取（${JSON.stringify(c)}）`)
  assert(c.riskTierMap && c.riskTierMap['unit-sufficient'] === 'S2', '4d risk_tier_map snake→camel 读取')
  assert(!('forceTier' in c) && !('shadow' in c), '4e force_tier/shadow 不在 pricing 读取器（归 readCeremonyLocalConfig，语义不混载）')
  writeFileSync(join(spec, 'local.yaml'), 'ceremony: [unclosed')
  assert(Object.keys(readCeremonyPricingConfig(spec)).length === 0, '4f 坏 yaml → 空配置不抛')
}

// ── 5. 零配置零回归 ──
{
  const r = computeCeremonyTier({ riskDetection: { level: 'doc-only' } })
  assert(r.tier === 'S0', '5a 无 config 参 → 内置映射（doc-only→S0）')
  const r2 = computeCeremonyTier({ declaredFiles: [] })
  assert(r2.tier === 'S2', '5b 无 config 参 → 内置保守缺省 S2')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
