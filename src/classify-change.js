/**
 * classify-change.js — 变更规模分类器
 *
 * 将用户需求描述分类为 quick / auto / full，
 * 供 auto 模式决定内部流程深度。
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import jsYaml from 'js-yaml'

/**
 * 用户显式指定的关键词 → 强制模式
 */
const FORCE_FULL_PATTERNS = [
  /数据库|database|schema/i,
  /迁移|migration|migrate/i,
  /鉴权|权限|auth|permission|rbac/i,
  /支付|payment|billing/i,
  /重构|refactor.*architectur/i,
  /微服务|microserv/i,
]

const FORCE_QUICK_PATTERNS = [
  /fix typo/i,
  /更新文案|改文案|文案修改/i,
  /样式调整|style.*tweak/i,
  /修复.*\s*\bbug\b.*\bfix\b/i,
]

/**
 * 读 local.yaml 的 auto_mode 段（best-effort，绝不抛）。
 * 供 runCommand 接线：传给 classifyChange 的 localConfig，让 force_*_patterns 真生效。
 * @param {string} cwd - 主仓库根（local.yaml 在 <cwd>/.sillyspec/local.yaml）
 * @returns {{ force_full_patterns?: string[], force_quick_patterns?: string[] } | null}
 *   auto_mode 段含至少一个 string pattern → 归一化数组；文件缺/解析失败/无段/空 → null（降级默认关键词）
 */
export function readAutoModeFromLocalYaml(cwd) {
  try {
    const p = join(cwd, '.sillyspec', 'local.yaml')
    if (!existsSync(p)) return null
    const doc = jsYaml.load(readFileSync(p, 'utf8'))
    if (!doc || typeof doc !== 'object') return null
    const am = doc.auto_mode
    if (!am || typeof am !== 'object') return null
    const ffp = Array.isArray(am.force_full_patterns) ? am.force_full_patterns.filter(s => typeof s === 'string') : []
    const fqp = Array.isArray(am.force_quick_patterns) ? am.force_quick_patterns.filter(s => typeof s === 'string') : []
    if (ffp.length === 0 && fqp.length === 0) return null
    return { force_full_patterns: ffp, force_quick_patterns: fqp }
  } catch {
    return null
  }
}

/**
 * 分类变更规模
 * @param {object} opts
 * @param {string} opts.description - 用户需求描述
 * @param {string} [opts.explicitMode] - 用户显式指定的模式（auto/quick/full）
 * @param {object} [opts.localConfig] - local.yaml auto_mode 段（由 readAutoModeFromLocalYaml 读出）
 * @returns {{ mode: 'quick'|'auto'|'full', reason: string }}
 */
export function classifyChange({ description = '', explicitMode, localConfig } = {}) {
  // 1. 用户显式指定优先级最高
  if (explicitMode && ['quick', 'auto', 'full'].includes(explicitMode)) {
    return { mode: explicitMode, reason: '用户显式指定' }
  }

  // 2. local.yaml force patterns
  if (localConfig) {
    const forceFullPatterns = localConfig.force_full_patterns || []
    const forceQuickPatterns = localConfig.force_quick_patterns || []

    for (const pattern of forceFullPatterns) {
      try {
        if (new RegExp(pattern, 'i').test(description)) {
          return { mode: 'full', reason: `local.yaml force_full_pattern 匹配: ${pattern}` }
        }
      } catch {
        // 非法正则跳过，不崩 auto 分类（review-2026-08-09 #30）
      }
    }
    for (const pattern of forceQuickPatterns) {
      try {
        if (new RegExp(pattern, 'i').test(description)) {
          return { mode: 'quick', reason: `local.yaml force_quick_pattern 匹配: ${pattern}` }
        }
      } catch {
        // 非法正则跳过
      }
    }
  }

  // 3. 默认关键词匹配
  for (const pattern of FORCE_QUICK_PATTERNS) {
    if (pattern.test(description)) {
      return { mode: 'quick', reason: `命中 quick 关键词: ${pattern.source}` }
    }
  }

  for (const pattern of FORCE_FULL_PATTERNS) {
    if (pattern.test(description)) {
      return { mode: 'full', reason: `命中 full 关键词: ${pattern.source}` }
    }
  }

  // 4. 默认 auto
  return { mode: 'auto', reason: '默认模式' }
}
