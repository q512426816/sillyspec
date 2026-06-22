/**
 * StageContract — 阶段协议
 *
 * 每个阶段声明：允许的前置阶段、必须的产出、校验器、后续阶段。
 * CLI 不再相信 prompt 完成，completeStep 后必须过 validator。
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { detectChangeRisk, checkIntegrationEvidence } from './change-risk-profile.js'

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

function resolveChangeDir(cwd, changeName, specRoot = null) {
  const changesRoot = specRoot ? join(specRoot, 'changes') : join(cwd, '.sillyspec', 'changes')
  return join(changesRoot, changeName)
}

function collectIdsFromLine(line, re, ids) {
  for (const match of line.matchAll(re)) {
    ids.add(match[0].toUpperCase())
  }
}

function extractIds(content, prefix) {
  if (!content) return []
  const ids = new Set()
  const idRe = new RegExp(`\\b${prefix}-\\d+(?:@v\\d+)?\\b`, 'gi')
  const headingLineRe = /^\s{0,3}#{1,6}\s+/i
  const fieldLineRe = /^\s*(?:[-*]\s*)?(?:id|decision[-_ ]?ids?|requirement[-_ ]?ids?|covers?|coverage|references?|impacts?|覆盖(?:来源|决策|需求)?)\s*[:：]/i
  const tableLineRe = /^\s*\|/
  const listStartsWithIdRe = new RegExp(`^\\s*(?:[-*]|\\d+\\.)\\s*(?:\\[[ xX]\\]\\s*)?${prefix}-\\d+(?:@v\\d+)?\\b`, 'i')

  for (const line of content.split(/\r?\n/)) {
    if (!headingLineRe.test(line) && !fieldLineRe.test(line) && !tableLineRe.test(line) && !listStartsWithIdRe.test(line)) continue
    collectIdsFromLine(line, idRe, ids)
  }
  return [...ids].sort()
}

function readDecisionField(body, fieldPattern, fallback = '') {
  const re = new RegExp(`^\\s*(?:[-*]\\s*)?(?:${fieldPattern})\\s*[:：]\\s*([^\\n]+)`, 'im')
  return (body.match(re)?.[1] || fallback).trim()
}

function buildDecisionRecord(id, body) {
  const status = readDecisionField(body, 'status', 'accepted').toLowerCase()
  const blockerValue = readDecisionField(body, 'blocker', 'false').toLowerCase()
  const blocker = ['true', 'yes', '1'].includes(blockerValue)
  const priorityValue = readDecisionField(body, 'priority|level|severity')
  const priorityMissing = priorityValue.length === 0
  const fallbackPriority = (['unresolved', 'blocking'].includes(status) || blocker) ? 'P1' : 'P2'
  const priority = (priorityValue.match(/P[0-2]/i)?.[0] || fallbackPriority).toUpperCase()
  return { id: id.toUpperCase(), body, status, priority, blocker, priorityMissing }
}

function findNextDecisionBoundary(content, startIndex) {
  const boundaryRe = /^(\s{0,3}#{2,6}\s+D-\d+(?:@v\d+)?\b|\s*(?:[-*]\s*)?(?:id|decision[-_ ]?id|decision)\s*[:：]\s*D-\d+(?:@v\d+)?\b)/gmi
  boundaryRe.lastIndex = startIndex
  const next = boundaryRe.exec(content)
  return next ? next.index : content.length
}

function isInsideRange(index, ranges) {
  return ranges.some(range => index >= range.start && index < range.end)
}

function parseDecisionRecords(content) {
  if (!content) return []
  const records = []
  const ranges = []
  const headingRe = /^\s{0,3}#{2,6}\s+(D-\d+(?:@v\d+)?)(?:\b|:)[^\n]*$/gmi
  const headings = []
  let match
  while ((match = headingRe.exec(content)) !== null) {
    headings.push({ id: match[1].toUpperCase(), index: match.index, end: headingRe.lastIndex })
  }
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i]
    const next = headings[i + 1]
    const body = content.slice(current.end, next ? next.index : content.length)
    const end = next ? next.index : content.length
    ranges.push({ start: current.index, end })
    records.push(buildDecisionRecord(current.id, body))
  }

  const idLineRe = /^\s*(?:[-*]\s*)?(?:id|decision[-_ ]?id|decision)\s*[:：]\s*(D-\d+(?:@v\d+)?)(?:\b|$)/gmi
  while ((match = idLineRe.exec(content)) !== null) {
    if (isInsideRange(match.index, ranges)) continue
    const bodyEnd = findNextDecisionBoundary(content, idLineRe.lastIndex)
    const body = content.slice(match.index, bodyEnd)
    records.push(buildDecisionRecord(match[1], body))
  }

  return records
}

function extractCurrentDecisionIds(content) {
  const records = parseDecisionRecords(content)
  if (records.length === 0) return extractIds(content, 'D')
  return records
    .filter(r => !['superseded', 'rejected'].includes(r.status))
    .map(r => r.id)
    .sort()
}

function findBlockingDecisionIssues(content) {
  return parseDecisionRecords(content)
    .filter(r => (r.blocker || ['unresolved', 'blocking'].includes(r.status)) && ['P0', 'P1'].includes(r.priority))
    .map(r => `${r.id} (${r.priority}${r.priorityMissing ? ', priority=missing->P1' : ''}, status=${r.status})`)
}

function readIfExists(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : ''
}

function warnMissingIds(warnings, ids, targetContent, targetName, sourceName) {
  for (const id of ids) {
    if (!targetContent.toUpperCase().includes(id)) {
      warnings.push(`${targetName} 未引用 ${sourceName} 中的 ${id}`)
    }
  }
}

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
      errors.push(`scan 文档缺失: ${join(docsRoot, doc)}`)
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
  const changeDir = resolveChangeDir(cwd, changeName, specRoot)
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

    // P1: 涉及生命周期关键词时，design.md 必须包含生命周期契约表
    const hasLifecycleKeyword = /\b(session|lease|agent[._-]?run|daemon|lifecycle|state[._-]?transition|claim|heartbeat)\b/i.test(content)
    if (hasLifecycleKeyword) {
      const hasLifecycleTable =
        /生命周期契约表|lifecycle[._-]?contract|lifecycle[._-]?matrix|Lifecycle Contract/i.test(content) ||
        /事件.*发起方.*接收方.*必需字段.*状态变化/.test(content)
      if (!hasLifecycleTable) {
        errors.push('design.md 涉及生命周期关键词（session/lease/agent_run/daemon/lifecycle）但缺少「生命周期契约表」— 必须列出完整的事件×状态转换矩阵')
      }
    }
  }

  if (existsSync(join(changeDir, 'tasks.md'))) {
    const content = readFileSync(join(changeDir, 'tasks.md'), 'utf8')
    const lines = content.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*') || /^\d+\./.test(l.trim()))
    if (lines.length === 0) {
      warnings.push('tasks.md 没有任务列表项')
    }
  }

  const decisionsFile = join(changeDir, 'decisions.md')
  if (existsSync(decisionsFile)) {
    const decisions = readFileSync(decisionsFile, 'utf8')
    const blockers = findBlockingDecisionIssues(decisions)
    for (const issue of blockers) {
      errors.push(`decisions.md 存在 P0/P1 未决阻塞: ${issue}`)
    }
    const decisionIds = extractCurrentDecisionIds(decisions)
    if (decisionIds.length === 0) {
      warnings.push('decisions.md 存在但没有当前版本 D-xxx@vN 决策 ID')
    } else {
      const design = readIfExists(join(changeDir, 'design.md'))
      const requirements = readIfExists(join(changeDir, 'requirements.md'))
      const tasks = readIfExists(join(changeDir, 'tasks.md'))
      warnMissingIds(warnings, decisionIds, design, 'design.md', 'decisions.md')
      warnMissingIds(warnings, decisionIds, requirements, 'requirements.md', 'decisions.md')
      warnMissingIds(warnings, decisionIds, tasks, 'tasks.md', 'decisions.md')
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * plan 完成校验：检查 plan.md 生成
 */
function validatePlanOutputs(cwd, changeName, context = {}) {
  const { specRoot } = context
  const changeDir = resolveChangeDir(cwd, changeName, specRoot)
  const planFile = join(changeDir, 'plan.md')
  const errors = []

  if (!existsSync(planFile)) {
    errors.push(`plan.md 缺失: ${planFile}`)
  }

  const warnings = []
  if (existsSync(planFile)) {
    const plan = readFileSync(planFile, 'utf8')
    const requirements = readIfExists(join(changeDir, 'requirements.md'))
    const requirementIds = extractIds(requirements, 'FR')
    warnMissingIds(warnings, requirementIds, plan, 'plan.md', 'requirements.md')

    const decisions = readIfExists(join(changeDir, 'decisions.md'))
    const blockers = findBlockingDecisionIssues(decisions)
    for (const issue of blockers) {
      errors.push(`decisions.md 存在 P0/P1 未决阻塞: ${issue}`)
    }
    const decisionIds = extractCurrentDecisionIds(decisions)
    warnMissingIds(warnings, decisionIds, plan, 'plan.md', 'decisions.md')
  }
  // ── P0: 生产接线路径检查：design 提到入口但 task 的 allowed_paths 不含入口文件 ──
  const designContent = readIfExists(join(changeDir, 'design.md'))
  if (designContent) {
    const entryPointPatterns = [
      /\b(cli\.ts|main\.ts|server\.(?:js|ts)|index\.(?:js|ts))\b.*\b(?:实例化|instantiate|构造|new\s)/gi,
      /\bnew\s+(Daemon|SessionManager|App|Server|Application)\b/gi,
      /\b(?:在|from)\s+['"]?(cli\.ts|main\.ts|server\.(?:js|ts)|index\.(?:js|ts))['"]?/gi,
      /\b(?:注入|inject)\b.*\b(?:构造|constructor|初始化|init|实例化|instantiate)\b/gi,
      /\b(?:启动路径|startup|entrypoint|bootstrap|daemon[._-]?start|main.*entry)\b/gi,
    ]
    const mentionedFiles = new Set()
    for (const pattern of entryPointPatterns) {
      pattern.lastIndex = 0
      for (const match of designContent.matchAll(pattern)) {
        const fileMatch = match[0].match(/\b(cli\.ts|main\.ts|server\.(?:js|ts)|index\.(?:js|ts))\b/i)
        if (fileMatch) mentionedFiles.add(fileMatch[1].toLowerCase())
      }
    }
    if (mentionedFiles.size > 0) {
      const tasksDir = join(changeDir, 'tasks')
      const allAllowedPaths = new Set()
      if (existsSync(tasksDir)) {
        const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/i.test(f))
        for (const taskFile of taskFiles) {
          const taskContent = readFileSync(join(tasksDir, taskFile), 'utf8')
          const allowedSection = taskContent.match(/allowed_paths:\s*\n((?:\s+-\s+.+\n?)+)/)
          if (allowedSection) {
            const paths = allowedSection[1].match(/-\s+(.+)/g) || []
            for (const p of paths) allAllowedPaths.add(p.replace(/^-\s+/, '').trim().toLowerCase())
          }
        }
      }
      // 也从 plan.md 文件变更清单中收集
      if (existsSync(planFile)) {
        const planContent = readFileSync(planFile, 'utf8')
        const planFileChanges = planContent.match(/\|\s*(?:新增|修改|new|modify|update)\s*\|\s*`?([^`|]+)`?\s*\|/gi) || []
        for (const line of planFileChanges) {
          const file = line.match(/\|\s*(?:新增|修改|new|modify|update)\s*\|\s*`?([^`|]+)`?\s*\|/i)
          if (file) allAllowedPaths.add(file[1].trim().toLowerCase())
        }
      }
      for (const mentionedFile of mentionedFiles) {
        const found = [...allAllowedPaths].some(p => p.includes(mentionedFile))
        if (!found) {
          const noChangePattern = new RegExp(`不需要改.*${mentionedFile}|${mentionedFile}.*不需要|不修改.*${mentionedFile}|${mentionedFile}.*不变|${mentionedFile}.*no.?change`, 'i')
          if (!noChangePattern.test(designContent)) {
            errors.push(`生产接线路径矛盾: design.md 提到了入口文件 "${mentionedFile}" 但所有 task 的 allowed_paths 中均不含该文件`)
            warnings.push(`提示: 如果确实不需要修改 ${mentionedFile}，请在 design.md 中明确写明理由`)
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}
function validateVerifyOutputs(cwd, changeName, context = {}) {
  const { specRoot } = context
  const changeDir = resolveChangeDir(cwd, changeName, specRoot)
  const errors = []
  const warnings = []

  if (!existsSync(changeDir)) {
    errors.push(`变更目录缺失: ${changeDir}`)
    return { ok: false, errors, warnings }
  }

  // verify 阶段应该产出 verify-result.md（或类似报告）
  const verifyResult = join(changeDir, 'verify-result.md')
  if (!existsSync(verifyResult)) {
    warnings.push('verify-result.md 不存在（verify 阶段建议产出验证报告）')
  }

  // 确保核心规范文件仍然存在
  const requiredDocs = ['design.md', 'plan.md']
  for (const doc of requiredDocs) {
    if (!existsSync(join(changeDir, doc))) {
      errors.push(`核心文档缺失: ${join(changeDir, doc)}`)
    }
  }

  if (existsSync(verifyResult)) {
    const verify = readFileSync(verifyResult, 'utf8')
    const decisions = readIfExists(join(changeDir, 'decisions.md'))
    const blockers = findBlockingDecisionIssues(decisions)
    for (const issue of blockers) {
      errors.push(`decisions.md 存在 P0/P1 未决阻塞: ${issue}`)
    }
    const decisionIds = extractCurrentDecisionIds(decisions)
    warnMissingIds(warnings, decisionIds, verify, 'verify-result.md', 'decisions.md')

    // ── P0: Change Risk Gate — 核心功能缺少真实集成验证时 FAIL ──
    const changeRiskProfile = detectChangeRisk({
      designContent: readIfExists(join(changeDir, 'design.md')),
      planContent: readIfExists(join(changeDir, 'plan.md')),
    })
    if (['integration-critical', 'deployment-critical'].includes(changeRiskProfile.level)) {
      const conclusionMatch = verify.match(/^## 结论\s*\n\s*(PASS|PASS WITH NOTES|FAIL)/im)
      const conclusion = conclusionMatch ? conclusionMatch[1] : ''
      if (conclusion === 'PASS WITH NOTES' || conclusion === 'PASS') {
        const evidenceCheck = checkIntegrationEvidence(verify, changeRiskProfile.requiredVerification)
        if (!evidenceCheck.ok) {
          errors.push(`[${changeRiskProfile.level}] 验证结论为 ${conclusion}，但缺少真实集成证据：${evidenceCheck.errors.join('; ')}`)
          errors.push(`触发词: ${changeRiskProfile.triggers.join(', ')} — PASS WITH NOTES 不被允许，必须 FAIL 或提供集成证据`)
        }
        warnings.push(...evidenceCheck.warnings)
      }
    }
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
 * @param {{ fromStageData?: { status?: string } | undefined }} [options] - 可选，从 progress.stages[prevStage] 提取
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkTransition(fromStage, toStage, options = {}) {
  const { fromStageData } = options  // { status?: string } | undefined
  const contract = contracts[toStage]
  if (!contract) {
    return { allowed: false, reason: `未知阶段: ${toStage}` }
  }

  // 辅助阶段随时可执行（archive 除外：从主流程进入 archive 需要校验）
  if (auxiliaryStages.includes(toStage) && toStage !== 'archive') {
    return { allowed: true }
  }

  // 同阶段内重复运行：允许（继续执行当前阶段的下一步、或修订模式继续）
  if (fromStage === toStage) {
    return { allowed: true }
  }

  // task-07: failed_post_check 门控
  // scan post-check 未通过时，禁止进入主流程的下游阶段（brainstorm/plan/execute/verify/archive）
  // 必须先重跑 scan 修复。toStage === 'scan' 的重跑路径已被上方 fromStage === toStage 放行。
  // fromStageData.status 缺失（旧数据）时门控不触发（向后兼容）。
  if (fromStage === 'scan' && fromStageData?.status === 'failed_post_check' && toStage !== 'scan') {
    return {
      allowed: false,
      reason: 'scan post-check 未通过（failed_post_check），需修复后重跑 scan 再进入 ' + toStage,
    }
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

  // 从辅助阶段进入主流程：允许
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
