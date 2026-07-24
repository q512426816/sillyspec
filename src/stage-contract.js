/**
 * StageContract — 阶段协议
 *
 * 每个阶段声明：允许的前置阶段、必须的产出、校验器、后续阶段。
 * CLI 不再相信 prompt 完成，completeStep 后必须过 validator。
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { execFileSync } from 'child_process'
import { detectChangeRisk, checkIntegrationEvidence } from './change-risk-profile.js'
import { SCAN_REQUIRED_DOCS } from './constants.js'

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

/**
 * --change 变更名存在性校验（治 cwd 漂移误匹配，缺陷 execute-in-place-windows-pitfalls 坑5）。
 *
 * 多项目 monorepo 下，cwd 在子项目目录会让 resolveSpecDir 命中子项目 spec，
 * 此时 --change 传根项目变更名，旧逻辑（resolveChangeDir 纯拼路径）不报错而静默
 * fallback 误启动子项目流程。本校验对「操作已有变更」的阶段强制 changes/<changeName>
 * 存在，不存在则 fail-fast，把 cwd 漂移暴露给用户。
 *
 * 豁免：
 *   - 非 plan/execute/verify/archive 阶段（scan/brainstorm/quick/explore 不校验：
 *     brainstorm 可新建变更、quick 用 sessionId、scan/explore 无 change 语义）
 *   - quick-<8hex> sessionId（quick 会话 changeName 是 sessionId，不在 changes/）
 *
 * @param {string} specBase - 规范根目录（.sillyspec 或平台 specRoot）
 * @param {string} stageName - 阶段名
 * @param {string} changeName - 变更名（--change 或 auto）
 * @returns {{ changeName: string, specBase: string, message: string } | null} null=通过，对象=失败
 */
export function validateChangeExists(specBase, stageName, changeName) {
  const STAGES_REQUIRE_EXISTING_CHANGE = new Set(['plan', 'execute', 'verify', 'archive'])
  if (!changeName || !STAGES_REQUIRE_EXISTING_CHANGE.has(stageName)) return null
  if (/^quick-[0-9a-f]{8}$/.test(changeName)) return null
  if (existsSync(join(specBase, 'changes', changeName))) return null

  // archive 特例：step4 --confirm 已把变更从 changes/<name>/ 移到 changes/archive/<date>-<name>/。
  // step5（更新路线图/提交）--change <name> 不应因 changes/<name>/ 已移走而被前置校验误拦。
  // 精确匹配归档目录名（YYYY-MM-DD-<changeName>），避免后缀子串误匹配（auth ≠ deep-auth）。
  if (stageName === 'archive') {
    const archiveRoot = join(specBase, 'changes', 'archive')
    if (existsSync(archiveRoot)) {
      const archived = readdirSync(archiveRoot).find(d => {
        const m = d.match(/^\d{4}-\d{2}-\d{2}-(.+)$/)
        return m && m[1] === changeName
      })
      if (archived) return null
    }
  }
  return {
    changeName,
    specBase,
    message: `变更 "${changeName}" 在当前 spec 下不存在：${join(specBase, 'changes', changeName)}`,
  }
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
  // 解析 supersedes 字段：记录本条决策取代了哪个旧版本
  const supersedesRaw = readDecisionField(body, 'supersedes', '')
  const supersedes = supersedesRaw
    ? supersedesRaw.split(',').map(s => s.trim().toUpperCase().replace(/['"]/g, '')).filter(Boolean)
    : []
  return { id: id.toUpperCase(), body, status, priority, blocker, priorityMissing, supersedes }
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
  // 收集所有被 supersedes 声明取代的旧版本 ID
  const supersededIds = new Set()
  for (const r of records) {
    for (const oldId of r.supersedes) {
      supersededIds.add(oldId)
    }
  }
  return records
    .filter(r => !['superseded', 'rejected'].includes(r.status))
    .filter(r => !supersededIds.has(r.id)) // 被新版本显式取代的旧版本不再校验
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
  // 剥版本后缀（@vN）按基号词边界匹配：target 里写裸号 D-001 即视为引用了 D-001@V1
  // 的当前版本（prompt 常裸号引用，旧版字面 includes("D-001@V1") 会批量误报）。
  // 大小写不敏感：target 整体大写后比对。
  const targetUpper = targetContent.toUpperCase()
  for (const id of ids) {
    const base = id.replace(/@V\d+$/, '')
    const re = new RegExp(`\\b${base}\\b`)
    if (!re.test(targetUpper)) {
      warnings.push(`${targetName} 未引用 ${sourceName} 中的 ${id}`)
    }
  }
}

/**
 * scan 完成校验：检查 7 份 scan 文档 + manifest
 */
function validateScanOutputs(cwd, changeName, context = {}) {
  const { projectName, specRoot } = context
  // 平台模式：specRoot 直接是规范目录（含 docs/）
  // 本地模式：规范目录是 cwd/.sillyspec
  // 不用 isSpecDir 启发式猜测——很多项目根目录有自己的 docs/，会误判
  const specBase = specRoot || join(cwd, '.sillyspec')
  const docsRoot = projectName
    ? join(specBase, 'docs', projectName, 'scan')
    : join(specBase, 'docs', 'scan')

  const requiredDocs = SCAN_REQUIRED_DOCS

  const errors = []
  const warnings = []

  for (const doc of requiredDocs) {
    if (!existsSync(join(docsRoot, doc))) {
      errors.push(`scan 文档缺失: ${join(docsRoot, doc)}`)
    }
  }

  // 检查 modules 目录
  const modulesRoot = projectName
    ? join(specBase, 'docs', projectName, 'modules')
    : join(specBase, 'docs', 'modules')
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

    // P1: 涉及生命周期关键词时，design.md 必须包含生命周期契约表（除非显式声明不涉及）
    const hasLifecycleKeyword = /\b(session|lease|agent[._-]?run|daemon|lifecycle|state[._-]?transition|claim|heartbeat)\b/i.test(content)
    if (hasLifecycleKeyword) {
      // 显式声明本变更不涉及生命周期契约（覆盖字段名/错误码/否定声明场景）：
      // 历史教训：design 提到 daemon_id 字段名或 daemon_not_owned 错误码就触发，被迫加空表（B3a）。
      //
      // 收紧原则（修：正常 design 不应被误判「已豁免」）：
      //   - 否定词必须是明确多字短语（不涉及/不适用/未涉及/不包含/没有/n\/a/not applicable/none），
      //     杜绝裸单字「无」与裸「na」在 40 字符宽窗口内任意命中——
      //     「lifecycle 状态无变化」「本变更无需 lifecycle 事件」「lifecycle canal 不涉及」等不再误判；
      //   - 否定词必须与「生命周期(契约)/lifecycle(contract)」紧邻（仅允许少量空白/分隔符/「任何」），
      //     不再用 40 字符宽松窗口；工具错误信息本身就指引写「不涉及生命周期契约」这个规范短语。
      const declaresNotApplicable =
        // 否定在前：「不涉及生命周期(契约)」「不适用 lifecycle contract」
        /(?:不涉及|不适用|未涉及|不包含|没有(?:任何)?)\s?(?:任何\s?)?(?:生命周期(?:契约)?|lifecycle(?:[ _=-]?contract)?)/i.test(content) ||
        // 主题在前（表格/列表单元「生命周期契约：不涉及 / N/A / 无」——分隔符强制，杜绝宽窗口）
        /(?:生命周期(?:契约)?|lifecycle(?:[ _=-]?contract)?)\s?[：:=]\s?(?:不涉及|不适用|未涉及|无|n\/?a\b|not[ _=-]?applicable|none\b)/i.test(content) ||
        // 英文谓语句：「does not involve / not applicable ... lifecycle」
        /(?:does[ _-]?not[ _-]?involve|not[ _-]?applicable)[^\n]{0,15}lifecycle/i.test(content)
      if (declaresNotApplicable) {
        warnings.push('design.md 显式声明不涉及生命周期契约 — 已豁免「生命周期契约表」要求')
      } else {
        const hasLifecycleTable =
          /生命周期契约表|lifecycle[._-]?contract|lifecycle[._-]?matrix|Lifecycle Contract/i.test(content) ||
          /事件.*发起方.*接收方.*必需字段.*状态变化/.test(content)
        if (!hasLifecycleTable) {
          errors.push('design.md 涉及生命周期关键词（session/lease/agent_run/daemon/lifecycle）但缺少「生命周期契约表」— 必须列出完整的事件×状态转换矩阵；或显式声明「不涉及生命周期契约」并附理由豁免')
        }
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
      // decision 的天然引用落点是 design.md；requirements（需求按 FR 组织）与
      // tasks（骨架，待 plan 展开）不强求逐条引用每个架构决策，否则批量误报。
      warnMissingIds(warnings, decisionIds, design, 'design.md', 'decisions.md')
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
/**
 * 从 verify-result.md 提取结论关键词（PASS / PASS WITH NOTES / FAIL）。
 * 标题放宽：含「结论/Conclusion/Result/结果」的二级标题均可（B3c），
 * PASS/FAIL 可在标题行本身（如「## 验收结论：✅ PASS」）或紧邻标题的正文里。
 * 历史教训：原正则锚定确切「## 结论」，用户写「## 验收结论：✅ PASS」不被识别。
 */
function extractVerifyConclusion(verify) {
  const headingRe = /^##\s[^\n]*(?:结论|conclusion|result|结果)/im
  const headingMatch = verify.match(headingRe)
  if (!headingMatch) return ''
  const start = headingMatch.index
  const slice = verify.slice(start, start + 400)
  const kw = slice.match(/\b(PASS(?:\s+WITH\s+NOTES)?|FAIL)\b/i)
  return kw ? kw[1].toUpperCase().replace(/\s+/g, ' ') : ''
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

  // verify 阶段必须产出 verify-result.md —— 不存在则不能完成。
  // 历史教训：AI 可能跳过报告直接 --done，导致"假完成"。此处提级为 error 强制阻断。
  const verifyResult = join(changeDir, 'verify-result.md')
  if (!existsSync(verifyResult)) {
    errors.push(`verify-result.md 不存在 — verify 阶段必须产出验证报告才能完成（${verifyResult}）`)
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

    // ── FAIL 结论门控（适用于所有变更，不限风险等级）──
    // verify-result.md 结论为 FAIL 时，verify 阶段不能 completed。
    // 历史教训：CLI 曾不校验结论，AI 写 FAIL 后 verify 仍被标记完成并提示"验证通过可以归档"。
    const conclusionStr = extractVerifyConclusion(verify)
    if (conclusionStr === 'FAIL') {
      errors.push('verify-result.md 结论为 FAIL — 验证未通过，不能标记 verify 完成；请修复后重新运行验证')
    } else if (!conclusionStr) {
      warnings.push('verify-result.md 未识别到结论章节（含 结论/Conclusion/Result/结果 的二级标题，后跟 PASS / PASS WITH NOTES / FAIL）')
    }

    // ── P0: Change Risk Gate — 核心功能缺少真实集成验证时 FAIL ──
    const changeRiskProfile = detectChangeRisk({
      designContent: readIfExists(join(changeDir, 'design.md')),
      planContent: readIfExists(join(changeDir, 'plan.md')),
    })
    if (['integration-critical', 'deployment-critical'].includes(changeRiskProfile.level)) {
      const conclusion = extractVerifyConclusion(verify)
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

// ============ Execute 代码变更客观核验 ============

function gitTry(dir, args) {
  try {
    const out = execFileSync('git', args, {
      cwd: dir,
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    return { ok: true, out }
  } catch (e) {
    return { ok: false, out: '', error: e.message?.split('\n')[0] || String(e) }
  }
}

/**
 * 客观核验 execute 阶段是否产生了真实代码变更。
 *
 * 历史漏洞：execute 无 stage-level validator，agent 勾选 plan.md 全部 checkbox
 * 即可让 execute 被标 completed，代码完成度与真实变更完全脱钩。
 *
 * 判定顺序（fail-open on uncertainty，避免环境差异误杀）：
 *   1. worktree meta 存在且有 baseHash → 在 worktree 内查 baseHash..HEAD diff + 未提交改动
 *   2. sillyspec/<change> 分支存在 → 查 merge-base..branch diff
 *   3. 主工作区存在未提交改动（apply 后未 commit 的常见形态）→ changed
 *   4. 均无法判定 → unknown（由调用方降级为 warning）
 *
 * @returns {{ status: 'changed'|'unchanged'|'unknown', detail: string }}
 */
export function checkExecuteCodeEvidence(cwd, changeName) {
  const metaPath = join(cwd, '.sillyspec', '.runtime', 'worktrees', changeName, 'meta.json')
  let meta = null
  if (existsSync(metaPath)) {
    try { meta = JSON.parse(readFileSync(metaPath, 'utf8')) } catch {}
  }

  // 1. worktree（或 in-place）meta 有 baseHash：最权威的对账基准
  if (meta?.baseHash) {
    const gitDir = (meta.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath))
      ? meta.worktreePath
      : cwd
    const diff = gitTry(gitDir, ['diff', '--name-only', `${meta.baseHash}..HEAD`])
    const status = gitTry(gitDir, ['status', '--porcelain'])
    if (diff.ok && status.ok) {
      const committedFiles = diff.out ? diff.out.split('\n').filter(Boolean).length : 0
      const hasUncommitted = status.out.trim().length > 0
      if (committedFiles > 0 || hasUncommitted) {
        return { status: 'changed', detail: `${committedFiles} 个已提交变更文件${hasUncommitted ? ' + 未提交改动' : ''}（base ${meta.baseHash.slice(0, 8)}）` }
      }
      return { status: 'unchanged', detail: `${gitDir} 相对 base ${meta.baseHash.slice(0, 8)} 无任何提交或未提交改动` }
    }
    return { status: 'unknown', detail: `git 核验失败: ${diff.error || status.error}` }
  }

  // 2. worktree 已清理但分支残留：diff merge-base..branch
  const branch = `sillyspec/${changeName}`
  const branchHash = gitTry(cwd, ['rev-parse', '--verify', '--quiet', branch])
  if (branchHash.ok && branchHash.out) {
    const mergeBase = gitTry(cwd, ['merge-base', 'HEAD', branch])
    if (mergeBase.ok && mergeBase.out) {
      const diff = gitTry(cwd, ['diff', '--name-only', `${mergeBase.out}..${branch}`])
      if (diff.ok && diff.out.split('\n').filter(Boolean).length > 0) {
        return { status: 'changed', detail: `分支 ${branch} 相对 merge-base 有变更` }
      }
    }
  }

  // 3. 主工作区未提交改动（worktree apply 后的常见形态）
  const status = gitTry(cwd, ['status', '--porcelain'])
  if (status.ok && status.out.trim()) {
    return { status: 'changed', detail: '主工作区存在未提交改动' }
  }

  return { status: 'unknown', detail: '无 worktree meta 且无可对账的分支/未提交改动（变更可能已 apply 并提交），无法客观判定' }
}

/**
 * execute 完成校验：plan.md 声明了任务时，必须存在真实代码变更。
 * 防止"勾选 checkbox = 完成 execute"的谎报路径。
 */
function validateExecuteOutputs(cwd, changeName, context = {}) {
  const { specRoot } = context
  const errors = []
  const warnings = []

  const changeDir = resolveChangeDir(cwd, changeName, specRoot)
  const planPath = join(changeDir, 'plan.md')
  // 无 plan.md 的 execute（旧流程/quick 混用）不在此核验范围
  if (!existsSync(planPath)) return { ok: true, errors, warnings }

  const planContent = readFileSync(planPath, 'utf8')
  const hasTasks = /^\s*[-*]\s*\[[ xX]\]\s*task-\d+/m.test(planContent)
  if (!hasTasks) return { ok: true, errors, warnings }

  const evidence = checkExecuteCodeEvidence(cwd, changeName)
  if (evidence.status === 'unchanged') {
    errors.push(`execute 代码变更核验失败：plan.md 声明了任务，但 ${evidence.detail} — 勾选 checkbox 不等于完成实现`)
  } else if (evidence.status === 'unknown') {
    warnings.push(`execute 代码变更无法客观核验：${evidence.detail}`)
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
    validators: [validateExecuteOutputs],
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
