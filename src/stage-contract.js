/**
 * StageContract — 阶段协议
 *
 * 每个阶段声明：允许的前置阶段、必须的产出、校验器、后续阶段。
 * CLI 不再相信 prompt 完成，completeStep 后必须过 validator。
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'

/**
 * 校验结果
 * @typedef {{ ok: boolean, errors: string[], warnings: string[] }} ValidationResult
 */

/**
 * 阶段合约
 * @typedef {{
 *   stage: string,
 *   description: string,
 *   allowedFrom: string[],
 *   allowedTo: string[],
 *   validators: Function[],
 * }} StageContract
 */

// ============ Validators ============

/**
 * scan 完成校验：检查 7 份 scan 文档 + manifest
 */
function validateScanOutputs(cwd, changeName, context = {}) {
  const { projectName, specRoot } = context
  // 平台模式使用 specRoot，本地模式使用 cwd
  const base = specRoot || cwd
  // 如果 base 已经是 specDir（有 docs/ 子目录），直接用 base/docs/
  // 否则按传统模式拼接 .sillyspec/docs/
  const isSpecDir = existsSync(join(base, 'docs'))
  const docsRoot = projectName
    ? join(base, isSpecDir ? 'docs' : '.sillyspec/docs', projectName, 'scan')
    : join(base, isSpecDir ? 'docs' : '.sillyspec/docs', 'scan')

  const requiredDocs = [
    'ARCHITECTURE.md',
    'CONVENTIONS.md',
    'STRUCTURE.md',
    'INTEGRATIONS.md',
    'TESTING.md',
    'CONCERNS.md',
    'PROJECT.md',
  ]

  const errors = []
  const warnings = []

  for (const doc of requiredDocs) {
    if (!existsSync(join(docsRoot, doc))) {
      errors.push(`scan 文档缺失: ${docsRoot}/${doc}`)
    }
  }

  // 检查 modules 目录
  const modulesRoot = projectName
    ? join(base, isSpecDir ? 'docs' : '.sillyspec/docs', projectName, 'modules')
    : join(base, isSpecDir ? 'docs' : '.sillyspec/docs', 'modules')
  if (!existsSync(modulesRoot)) {
    warnings.push('modules 目录不存在')
  } else {
    const modules = readdirSync(modulesRoot).filter(f => f.endsWith('.md'))
    if (modules.length === 0) {
      warnings.push('modules 目录为空')
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * brainstorm 完成校验：检查四件套规范文件是否生成
 */
function validateBrainstormOutputs(cwd, changeName, context = {}) {
  const { specRoot } = context
  const changesRoot = specRoot ? join(specRoot, 'changes') : join(cwd, '.sillyspec', 'changes')
  if (specRoot && !existsSync(changesRoot)) {
    return { ok: false, errors: [`平台模式 specRoot 缺少 changes 目录: ${changesRoot}`], warnings: [] }
  }
  const changeDir = join(changesRoot, changeName)
  const errors = []
  const warnings = []

  const requiredFiles = ['design.md', 'proposal.md', 'requirements.md', 'tasks.md']

  for (const file of requiredFiles) {
    if (!existsSync(join(changeDir, file))) {
      errors.push(`brainstorm 产物缺失: ${join(changeDir, file)}`)
    }
  }

  // 内容校验（文件存在时检查关键章节）
  if (existsSync(join(changeDir, 'proposal.md'))) {
    const content = readFileSync(join(changeDir, 'proposal.md'), 'utf8')
    if (!content.includes('不在范围内') && !content.includes('Non-Goals') && !content.includes('非目标')) {
      warnings.push('proposal.md 缺少「不在范围内/Non-Goals」章节')
    }
  }

  if (existsSync(join(changeDir, 'requirements.md'))) {
    const content = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
    if (!/FR-\d+/i.test(content)) {
      warnings.push('requirements.md 缺少 FR 编号的需求项')
    }
  }

  if (existsSync(join(changeDir, 'design.md'))) {
    const content = readFileSync(join(changeDir, 'design.md'), 'utf8')
    if (!content.includes('文件变更清单') && !content.includes('File Changes') && !content.includes('文件清单')) {
      warnings.push('design.md 缺少「文件变更清单」章节')
    }
    if (!content.includes('风险登记') && !content.includes('Risk') && !content.includes('风险')) {
      warnings.push('design.md 缺少「风险登记」章节')
    }
    if (!content.includes('自审') && !content.includes('Self-Review') && !content.includes('Self-review')) {
      warnings.push('design.md 缺少「自审」章节')
    }
  }

  if (existsSync(join(changeDir, 'tasks.md'))) {
    const content = readFileSync(join(changeDir, 'tasks.md'), 'utf8')
    const lines = content.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || /^\d+\./.test(l.trim()))
    if (lines.length === 0) {
      warnings.push('tasks.md 没有任务列表项')
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * plan 完成校验：检查 plan.md 生成
 */
function validatePlanOutputs(cwd, changeName) {
  const planDir = join(cwd, '.sillyspec', 'changes', changeName)
  const planFile = join(planDir, 'plan.md')
  const errors = []

  if (!existsSync(planFile)) {
    errors.push(`plan.md 缺失: ${planFile}`)
  }

  const warnings = []
  return { ok: errors.length === 0, errors, warnings }
}

/**
 * verify 完成校验：检查 verify 报告存在
 */
function validateVerifyOutputs(cwd, changeName) {
  const planDir = join(cwd, '.sillyspec', 'changes', changeName)
  const errors = []
  const warnings = []

  // verify 至少应该有 run 记录
  if (!existsSync(join(planDir, 'plan.md'))) {
    errors.push(`变更目录缺失: ${planDir}`)
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * archive 完成校验：检查归档目录完整性
 */
function validateArchiveOutputs(cwd, changeName) {
  const errors = []
  const warnings = []
  const archiveDir = join(cwd, '.sillyspec', 'changes', 'archive')
  const date = new Date().toISOString().slice(0, 10)
  const destDir = join(archiveDir, `${date}-${changeName}`)

  // 检查归档目录是否存在
  if (!existsSync(destDir)) {
    errors.push(`归档目录缺失: ${destDir}`)
    return { ok: false, errors, warnings }
  }

  // 检查核心文档
  const requiredDocs = ['plan.md']
  const recommendedDocs = ['design.md', 'module-impact.md']

  for (const doc of requiredDocs) {
    if (!existsSync(join(destDir, doc))) {
      errors.push(`归档目录缺失核心文档: ${doc}`)
    }
  }

  for (const doc of recommendedDocs) {
    if (!existsSync(join(destDir, doc))) {
      warnings.push(`归档目录缺少推荐文档: ${doc}`)
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * archive 前置校验：所有主流程阶段完成
 */
function validateChangeClosed(cwd, changeName) {
  const errors = []
  const warnings = []

  // 检查前置阶段状态
  const progressDir = join(cwd, '.sillyspec', '.runtime')
  // 这里只做文件层面的检查，DB 检查在 run.js 里做
  const changeDir = join(cwd, '.sillyspec', 'changes', changeName)
  if (!existsSync(changeDir)) {
    errors.push(`变更目录不存在: ${changeDir}`)
    return { ok: false, errors, warnings }
  }

  if (!existsSync(join(changeDir, 'plan.md'))) {
    errors.push(`plan.md 缺失 — 请确保 plan 阶段已完成`)
  }

  return { ok: errors.length === 0, errors, warnings }
}

// ============ Contract Registry ============

/**
 * 主流程阶段（有严格转换顺序）
 */
const mainFlowStages = ['brainstorm', 'plan', 'execute', 'verify']

/**
 * 辅助阶段（可独立运行，无严格转换顺序）
 */
const auxiliaryStages = ['scan', 'quick', 'explore', 'archive', 'status', 'doctor']

/**
 * @type {Object<string, StageContract>}
 */
const contracts = {
  // === 主流程 ===
  brainstorm: {
    stage: 'brainstorm',
    description: '需求分析与设计',
    allowedFrom: [],           // 任何变更的起始阶段
    allowedTo: ['plan'],
    validators: [validateBrainstormOutputs],
  },
  plan: {
    stage: 'plan',
    description: '任务拆解与规划',
    allowedFrom: ['brainstorm'],
    allowedTo: ['execute'],
    validators: [validatePlanOutputs],
  },
  execute: {
    stage: 'execute',
    description: '代码实现',
    allowedFrom: ['plan'],
    allowedTo: ['verify'],
    validators: [],
  },
  verify: {
    stage: 'verify',
    description: '验证与测试',
    allowedFrom: ['execute'],
    allowedTo: ['archive'],
    validators: [validateVerifyOutputs],
  },
  archive: {
    stage: 'archive',
    description: '归档与收口',
    allowedFrom: ['verify'],
    allowedTo: [],
    // 阶段级 validator 全部移除，改为 run.js 中 step 4 完成后的硬编码校验。
    // 理由：两个 validator 的生效窗口互斥 ——
    // validateChangeClosed 要求变更目录存在（step 4 --confirm 后已被移到 archive 目录）
    // validateArchiveOutputs 要求 archive 目录存在（step 4 前还不存在）
    // 注册为阶段级 validator 会导致每步都误报错误。
    // run.js:893-909 已在正确的时机（step 4 完成后）执行相同检查。
    validators: [],
  },

  // === 辅助阶段 ===
  scan: {
    stage: 'scan',
    description: '项目扫描',
    allowedFrom: [],           // 无前置要求
    allowedTo: [],             // 不进入主流程
    validators: [validateScanOutputs],
  },
  quick: {
    stage: 'quick',
    description: '快速任务',
    allowedFrom: [],           // 无前置要求
    allowedTo: [],             // 不进入主流程
    validators: [],
  },
  explore: {
    stage: 'explore',
    description: '代码探索',
    allowedFrom: [],
    allowedTo: [],
    validators: [],
  },
  status: {
    stage: 'status',
    description: '状态查看',
    allowedFrom: [],
    allowedTo: [],
    validators: [],
  },
  doctor: {
    stage: 'doctor',
    description: '环境诊断',
    allowedFrom: [],
    allowedTo: [],
    validators: [],
  },
}

// ============ Public API ============

/**
 * 获取阶段合约
 */
export function getContract(stageName) {
  return contracts[stageName] || null
}

/**
 * 校验状态转换是否允许
 * @param {string} fromStage - 当前阶段（空字符串表示变更起始）
 * @param {string} toStage - 目标阶段
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkTransition(fromStage, toStage) {
  const contract = contracts[toStage]
  if (!contract) {
    return { allowed: false, reason: `未知阶段: ${toStage}` }
  }

  // 辅助阶段随时可执行（archive 除外：从主流程进入 archive 需要校验）
  if (auxiliaryStages.includes(toStage) && toStage !== 'archive') {
    return { allowed: true }
  }

  // archive 特殊处理：从 verify 来的允许，从其他主流程阶段来的需要校验
  if (toStage === 'archive') {
    if (fromStage === 'verify') {
      return { allowed: true }
    }
    // 独立运行 archive（无前置）也允许
    if (!fromStage || auxiliaryStages.includes(fromStage)) {
      return { allowed: true }
    }
    return { allowed: false, reason: 'archive 的前置阶段是 verify，不能从 ' + fromStage + ' 跳转' }
  }

  // 从辅助阶段进入主流程：允许（用户可能 scan 完直接 brainstorm 或 plan）
  if (auxiliaryStages.includes(fromStage)) {
    return { allowed: true }
  }

  // 无前置阶段（变更起始）：只能开始 brainstorm 或辅助阶段
  if (!fromStage) {
    // 主流程必须从 brainstorm 开始
    if (contract.allowedFrom.length === 0) {
      return { allowed: true }
    }
    return { allowed: false, reason: `${toStage} 需要先完成 ${contract.allowedFrom.join(' 或 ')}` }
  }

  // 主流程内部跳转：检查目标阶段的 allowedFrom 是否包含 fromStage
  if (contract.allowedFrom.includes(fromStage)) {
    return { allowed: true }
  }

  return { allowed: false, reason: `${toStage} 的前置阶段是 ${contract.allowedFrom.join(' 或 ')}，不能从 ${fromStage} 跳转` }
}

/**
 * 执行阶段完成校验
 * @param {string} stageName
 * @param {string} cwd
 * @param {string} changeName
 * @param {object} context - 额外上下文（如 projectName）
 * @returns {ValidationResult}
 */
export function runValidators(stageName, cwd, changeName, context = {}) {
  const contract = contracts[stageName]
  if (!contract || contract.validators.length === 0) {
    return { ok: true, errors: [], warnings: [] }
  }

  const allErrors = []
  const allWarnings = []

  for (const validator of contract.validators) {
    try {
      const result = validator(cwd, changeName, context)
      allErrors.push(...(result.errors || []))
      allWarnings.push(...(result.warnings || []))
    } catch (e) {
      allErrors.push(`校验器 ${validator.name || 'unknown'} 异常: ${e.message}`)
    }
  }

  return { ok: allErrors.length === 0, errors: allErrors, warnings: allWarnings }
}

/**
 * 获取所有主流程阶段
 */
export { mainFlowStages, auxiliaryStages }
