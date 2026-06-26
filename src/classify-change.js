/**
 * classify-change.js — 变更规模分类器
 *
 * 将用户需求描述分类为 quick / auto / full，
 * 供 auto 模式决定内部流程深度。
 */

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
 * 分类变更规模
 * @param {object} opts
 * @param {string} opts.description - 用户需求描述
 * @param {string} [opts.explicitMode] - 用户显式指定的模式（auto/quick/full）
 * @param {object} [opts.localConfig] - local.yaml 中的 auto_mode 配置
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
      if (new RegExp(pattern, 'i').test(description)) {
        return { mode: 'full', reason: `local.yaml force_full_pattern 匹配: ${pattern}` }
      }
    }
    for (const pattern of forceQuickPatterns) {
      if (new RegExp(pattern, 'i').test(description)) {
        return { mode: 'quick', reason: `local.yaml force_quick_pattern 匹配: ${pattern}` }
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
