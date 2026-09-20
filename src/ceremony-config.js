/**
 * ceremony-config.js — ceremony 定价项目级配置读取器（local.yaml `ceremony:` 段 pricing 五键）
 *
 * 2026-09-20 ceremony 项目化定价（对话裁决：每个项目体系不一样，S0~S3 判定阈值应可配置）：
 * 引擎（ceremony-tier.js）保持纯函数零 IO——配置由本读取器读 local.yaml 注入调用方。
 * 可配的是「起点与阈值」（default_tier / span 两阈值 / friction 起爆线 / 五级词映射部分覆写）；
 * 「只升不降」全局纪律（friction 升档、显式降档须理由）无配置出口——防项目把自己配裸奔。
 *
 * 语义对齐 readCeremonyLocalConfig（src/run/prompt.js，force_tier/shadow 读取器）：
 * best-effort 绝不抛、非法值 warn 后回退默认、缺段返回空对象（引擎侧 normalize 回内置值）。
 * blast 危险面 / span 风险路径**不在本读取器**——它们是项目共享声明（_module-map.yaml 顶层
 * blast/span_risk 段，进 git），local.yaml 是逐机配置，语义不同不混载。
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import jsYaml from 'js-yaml';

import { CEREMONY_TIERS } from './ceremony-tier.js';

/**
 * 读 local.yaml `ceremony:` 段的 pricing 五键（camelCase 归一出参，与 normalizeTierConfig 入参对齐）。
 * @param {string} specBase - .sillyspec 目录（local.yaml 所在）；空/null → 空配置
 * @returns {{ defaultTier?: string, spanFilesThreshold?: number, spanModulesThreshold?: number, frictionThreshold?: number, riskTierMap?: object }}
 *   仅含合法键（非法/缺失键不发——引擎侧回退内置值）
 */
export function readCeremonyPricingConfig(specBase) {
  const out = {};
  if (!specBase) return out;
  let raw = null;
  try {
    const p = join(specBase, 'local.yaml');
    if (!existsSync(p)) return out;
    raw = jsYaml.load(readFileSync(p, 'utf8'));
  } catch {
    return out; // 坏 yaml → 空配置（引擎回内置值），不拦定价
  }
  const c = raw && typeof raw === 'object' && raw.ceremony && typeof raw.ceremony === 'object'
    ? raw.ceremony
    : null;
  if (!c) return out;

  if (CEREMONY_TIERS.includes(c.default_tier)) out.defaultTier = c.default_tier;
  else if (c.default_tier != null) console.warn(`[sillyspec] ceremony.default_tier 非法「${c.default_tier}」已忽略（可选：${CEREMONY_TIERS.join(' | ')}）`);

  for (const [key, outKey] of [['span_files_threshold', 'spanFilesThreshold'], ['span_modules_threshold', 'spanModulesThreshold'], ['friction_escalation_threshold', 'frictionThreshold']]) {
    const v = c[key];
    if (Number.isInteger(v) && v >= 1) out[outKey] = v;
    else if (v != null) console.warn(`[sillyspec] ceremony.${key} 非法「${v}」已忽略（≥1 整数）`);
  }

  if (c.risk_tier_map != null) {
    if (typeof c.risk_tier_map === 'object' && !Array.isArray(c.risk_tier_map)) {
      const map = {};
      for (const [level, tier] of Object.entries(c.risk_tier_map)) {
        if (CEREMONY_TIERS.includes(tier)) map[level] = tier;
        else console.warn(`[sillyspec] ceremony.risk_tier_map.${level} 档位非法「${tier}」已忽略（可选：${CEREMONY_TIERS.join(' | ')}）`);
      }
      if (Object.keys(map).length > 0) out.riskTierMap = map;
    } else {
      console.warn('[sillyspec] ceremony.risk_tier_map 非对象已忽略');
    }
  }
  return out;
}
