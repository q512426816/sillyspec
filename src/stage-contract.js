/**
 * StageContract — 阶段协议
 *
 * 每个阶段声明：允许的前置阶段、必须的产出、校验器、后续阶段。
 * CLI 不再相信 prompt 完成，completeStep 后必须过 validator。
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { execFileSync } from 'child_process'
import { detectChangeRisk, checkIntegrationEvidence, VERIFICATION_NEEDS, RISK_LEVEL_CAUSES } from './change-risk-profile.js'
import { SCAN_REQUIRED_DOCS, AUXILIARY_STAGES } from './constants.js'
import { evaluateRules } from './stage-contract-engine.js'
import { getRule } from './stage-contract-spec.js'

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
    message: `变更 "${changeName}" 在当前 spec 下不存在：${join(specBase, 'changes', changeName)}\n` +
      `   排查方向（三选一）：① 变更名是否打错（sillyspec status 或 progress show 查看活跃变更名）；` +
      `② cwd 是否漂到了子项目目录（回到项目根再跑，或加 --spec-dir <根>/.sillyspec）；` +
      `③ 是否该先跑 sillyspec run brainstorm 新建该变更。`,
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
      warnings.push(getRule('shared.id-traceability').failMessage.replaceAll('${target}', targetName).replaceAll('${source}', sourceName).replaceAll('${id}', id))
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

  // 7 份 scan 文档存在性由引擎消费 manifest(与 SCAN_REQUIRED_DOCS 单源,文案/事前契约同源)
  const engineResult = evaluateRules('scan', { docsRoot })
  const errors = [...engineResult.errors]
  const warnings = [...engineResult.warnings]

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
  // 纯 kind 规则(四件套存在性 + proposal/requirements/design 章节 + tasks 列表)由引擎消费
  // stage-contract-spec.js manifest,与报错文案 + prompt 事前契约严格同源(事前给的 == 事后查的)。
  // custom kind(lifecycle / decisions)保留下方旧逻辑,数据/文案在 Batch 3 迁入 manifest。
  const engineResult = evaluateRules('brainstorm', { changeDir })
  const errors = [...engineResult.errors]
  const warnings = [...engineResult.warnings]

  if (existsSync(join(changeDir, 'design.md'))) {
    const content = readFileSync(join(changeDir, 'design.md'), 'utf8')

    // lifecycle-exemption(custom kind):判定算法保留(trigger/exemption/table 三段短路),
    // data + failMessage/exemptionPassedMessage 从 stage-contract-spec.js manifest 同源。
    const lcRule = getRule('brainstorm.design.lifecycle-table')
    const { trigger: lcTrigger, exemptions: lcExempts, table: lcTable } = lcRule.data
    if (new RegExp(lcTrigger.pattern, lcTrigger.flags).test(content)) {
      const declaresNotApplicable = lcExempts.some(e => new RegExp(e.pattern, e.flags).test(content))
      if (declaresNotApplicable) {
        warnings.push(lcRule.exemptionPassedMessage)
      } else {
        const hasLifecycleTable = lcTable.some(t => new RegExp(t.pattern, t.flags).test(content))
        if (!hasLifecycleTable) {
          errors.push(lcRule.failMessage)
        }
      }
    }
  }

  const decisionsFile = join(changeDir, 'decisions.md')
  if (existsSync(decisionsFile)) {
    const decisions = readFileSync(decisionsFile, 'utf8')
    const blockers = findBlockingDecisionIssues(decisions)
    for (const issue of blockers) {
      errors.push(getRule('shared.decision-blocker').failMessage.replace('${issue}', issue))
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

  // plan.md 存在性由引擎消费 manifest。entryPoint/id-trace/decisions 为 custom kind(下方保留)。
  const engineResult = evaluateRules('plan', { changeDir })
  const errors = [...engineResult.errors]
  const warnings = [...engineResult.warnings]

  if (existsSync(planFile)) {
    const plan = readFileSync(planFile, 'utf8')
    const requirements = readIfExists(join(changeDir, 'requirements.md'))
    const requirementIds = extractIds(requirements, 'FR')
    warnMissingIds(warnings, requirementIds, plan, 'plan.md', 'requirements.md')

    const decisions = readIfExists(join(changeDir, 'decisions.md'))
    const blockers = findBlockingDecisionIssues(decisions)
    for (const issue of blockers) {
      errors.push(getRule('shared.decision-blocker').failMessage.replace('${issue}', issue))
    }
    const decisionIds = extractCurrentDecisionIds(decisions)
    warnMissingIds(warnings, decisionIds, plan, 'plan.md', 'decisions.md')
  }
  // ── P0: 生产接线路径检查：design 提到入口但 task 的 allowed_paths 不含入口文件 ──
  // entry-point-wiring(custom):trigger/file 抽取/exemption/failMessage 从 manifest 同源
  // (stage-contract-spec.js),保留多源 allowed_paths 收集 + 逐文件对账 + 豁免算法。
  const designContent = readIfExists(join(changeDir, 'design.md'))
  if (designContent) {
    const epRule = getRule('plan.entry-point-wiring')
    const { entryPointPatterns, fileExtractionPattern, exemptionPattern } = epRule.data
    const fileExtractRe = new RegExp(fileExtractionPattern.pattern, fileExtractionPattern.flags)
    const mentionedFiles = new Set()
    for (const ep of entryPointPatterns) {
      const pattern = new RegExp(ep.pattern, ep.flags)
      pattern.lastIndex = 0
      for (const match of designContent.matchAll(pattern)) {
        const fileMatch = match[0].match(fileExtractRe)
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
          const noChangePattern = new RegExp(exemptionPattern.replaceAll('${file}', mentionedFile), 'i')
          if (!noChangePattern.test(designContent)) {
            errors.push(epRule.failMessage.replaceAll('${file}', mentionedFile))
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

  if (!existsSync(changeDir)) {
    return { ok: false, errors: [`变更目录缺失: ${changeDir}`], warnings: [] }
  }

  // 核心文档存在性(verify-result.md / design.md / plan.md)由引擎消费 manifest。
  // verify-result.md 不存在则不能完成——历史教训:AI 可能跳过报告直接 --done 导致"假完成"。
  const engineResult = evaluateRules('verify', { changeDir })
  const errors = [...engineResult.errors]
  const warnings = [...engineResult.warnings]

  const verifyResult = join(changeDir, 'verify-result.md')
  if (existsSync(verifyResult)) {
    const verify = readFileSync(verifyResult, 'utf8')
    const decisions = readIfExists(join(changeDir, 'decisions.md'))
    const blockers = findBlockingDecisionIssues(decisions)
    for (const issue of blockers) {
      errors.push(getRule('shared.decision-blocker').failMessage.replace('${issue}', issue))
    }
    const decisionIds = extractCurrentDecisionIds(decisions)
    warnMissingIds(warnings, decisionIds, verify, 'verify-result.md', 'decisions.md')

    // ── FAIL 结论门控（适用于所有变更，不限风险等级）──
    // verify-result.md 结论为 FAIL 时，verify 阶段不能 completed。
    // 历史教训：CLI 曾不校验结论，AI 写 FAIL 后 verify 仍被标记完成并提示"验证通过可以归档"。
    const conclusionStr = extractVerifyConclusion(verify)
    if (conclusionStr === 'FAIL') {
      errors.push(getRule('verify.conclusion.fail-gate').failMessage)
    } else if (!conclusionStr) {
      warnings.push(getRule('verify.conclusion.fail-gate').noConclusionWarning)
    }

    // ── P0: Change Risk Gate — 核心功能缺少真实集成验证时 FAIL ──
    const changeRiskProfile = detectChangeRisk({
      designContent: readIfExists(join(changeDir, 'design.md')),
      planContent: readIfExists(join(changeDir, 'plan.md')),
    })
    const conclusion = extractVerifyConclusion(verify)
    if (['integration-critical', 'deployment-critical'].includes(changeRiskProfile.level)) {
      // 显式 risk_level 声明（design frontmatter，非关键词误判）下，PASS WITH NOTES 视为对残留项的
      // 诚实声明，不强求全量集成证据——豁免本就来自 design 的明确判断。自动关键词判级维持严格：
      // PASS WITH NOTES 仍要求证据齐全，防 agent 用 PASS WITH NOTES 绕证据门控。
      const requiresEvidence = conclusion === 'PASS' || (conclusion === 'PASS WITH NOTES' && !changeRiskProfile.explicit)
      if (conclusion === 'PASS WITH NOTES' && changeRiskProfile.explicit) {
        warnings.push(`[${changeRiskProfile.level}] 结论 PASS WITH NOTES：design frontmatter 显式声明 risk_level=${changeRiskProfile.level}，残留项须为真实集成证据缺口，并在 verify-result.md 如实说明`)
      }
      if (requiresEvidence) {
        const evidenceCheck = checkIntegrationEvidence(verify, changeRiskProfile.requiredVerification)
        if (!evidenceCheck.ok) {
          // A: 报错说人话 —— 把「缺哪一项、要写/做什么、判级原因」逐条列出，
          // 让 agent 不必靠改结论文案撞墙。detail 指明真实启动须是本变更实际改动的
          // 部署/启动入口（非无关进程），以及每项的字面期望。
          const needs = changeRiskProfile.requiredVerification
            .filter(k => VERIFICATION_NEEDS[k] && VERIFICATION_NEEDS[k].desc)
            .map(k => {
              const vn = VERIFICATION_NEEDS[k]
              const lit = vn.literals && vn.literals.length ? '字面命中其一：' + vn.literals.join(' / ') : ''
              return `\n    〔${k}〕${vn.desc}${lit}`
            })
            .join('')
          const cause = changeRiskProfile.explicit
            ? RISK_LEVEL_CAUSES.explicit
            : (RISK_LEVEL_CAUSES[changeRiskProfile.level] || '')
          errors.push(
            `[${changeRiskProfile.level}] 验证结论为 ${conclusion}，但缺少真实集成证据。\n` +
            `  缺失项（需在 verify-result.md 如实提供并满足）：${evidenceCheck.errors.join('; ')}\n` +
            `  每项要提供什么：${needs}\n` +
            `  风险判级原因：${cause}\n` +
            `  命中触发词：${changeRiskProfile.triggers.join(', ')}\n` +
            `  出路：① 补全上述缺失的真实集成证据（真实启动 daemon/backend、集成测试、运行日志）后保持 PASS；` +
            `或 ② 如实改结论 FAIL（承认端到端未验，留待部署后补）；` +
            `或 ③ 若判级是关键词误伤（实际并未触碰 daemon/session/启动入口），在 design.md frontmatter 加 risk_level: <真实等级>（如 unit-sufficient）显式覆盖后重跑。` +
            `仅改结论文案/措辞蹭字面关键词会被对账。`
          )
        }
        warnings.push(...evidenceCheck.warnings)
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * 计算归档目标目录名：保证 archive/ 下目录有且仅有一个日期前缀。
 *
 * 变更名创建时常已带 YYYY-MM-DD- 前缀（brainstorm 强制约定 + CLI 自动占位名），
 * 若归档时再无条件拼一次 date- 前缀，会产生 2026-07-28-2026-07-28-<desc> 双日期。
 * 这里先剥离源名前导日期，再统一拼归档当天日期 → 归档目录名恒为 <归档日期>-<纯描述>。
 * 不带日期的源名（如 quick-<hash>）strip 无效，正常补日期，行为不变。
 *
 * 写（archiveChangeDirectory）与校验（validateArchiveOutputs）共用此函数，
 * 避免「写和校验各自硬编码同公式」的漂移（曾因此导致双日期 bug 写校验都自洽通过）。
 */
export function archiveDestDirName(date, changeName) {
  const stripped = String(changeName).replace(/^\d{4}-\d{2}-\d{2}-/, '')
  return `${date}-${stripped}`
}

/**
 * archive 完成校验：检查归档目录完整性
 */
function validateArchiveOutputs(cwd, changeName) {
  const archiveDir = join(cwd, '.sillyspec', 'changes', 'archive')
  const date = new Date().toISOString().slice(0, 10)
  const destDir = join(archiveDir, archiveDestDirName(date, changeName))

  // 归档目录不存在 early return(引擎在存在时才跑)
  if (!existsSync(destDir)) {
    return { ok: false, errors: [`归档目录缺失: ${destDir}`], warnings: [] }
  }

  // plan.md(必备)/design.md/module-impact.md(推荐)存在性由引擎消费 manifest
  const engineResult = evaluateRules('archive', { archiveDir: destDir }, undefined, { source: 'validateArchiveOutputs' })
  return { ok: engineResult.errors.length === 0, errors: engineResult.errors, warnings: engineResult.warnings }
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

  // plan.md 存在性由引擎消费 manifest(source 区分 validateChangeClosed vs validateArchiveOutputs)
  const engineResult = evaluateRules('archive', { changeDir }, undefined, { source: 'validateChangeClosed' })
  return { ok: engineResult.errors.length === 0, errors: engineResult.errors, warnings: engineResult.warnings }
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
  const { specRoot, evidence: passedEvidence } = context
  const errors = []
  const warnings = []

  const changeDir = resolveChangeDir(cwd, changeName, specRoot)
  const planPath = join(changeDir, 'plan.md')
  // 无 plan.md 的 execute（旧流程/quick 混用）不在此核验范围
  if (!existsSync(planPath)) return { ok: true, errors, warnings }

  const planContent = readFileSync(planPath, 'utf8')
  const hasTasks = /^\s*[-*]\s*\[[ xX]\]\s*task-\d+/m.test(planContent)
  if (!hasTasks) return { ok: true, errors, warnings }

  // W4-G (D-008)：evidence 可由调用方（runGate）预先算好传入，避免与 execute-evidence check
  // 重复 spawn git（gate execute 一次省 2 个 git 进程 ≈ 60-200ms on Windows）。未传则内部算（向后兼容）。
  const evidence = passedEvidence || checkExecuteCodeEvidence(cwd, changeName)
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

// 辅助阶段（可独立运行，无严格转换顺序）定义在 constants.js 的 AUXILIARY_STAGES，
// 与 stages/index.js 共用单一真相源，避免两处逐字重复分叉。

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
    description: '项目快照',
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
  if (AUXILIARY_STAGES.includes(toStage) && toStage !== 'archive') {
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
    if (!fromStage || AUXILIARY_STAGES.includes(fromStage)) {
      return { allowed: true }
    }
    return { allowed: false, reason: 'archive 的前置阶段是 verify，不能从 ' + fromStage + ' 跳转' }
  }

  // 从辅助阶段进入主流程：允许
  if (AUXILIARY_STAGES.includes(fromStage)) {
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
export { mainFlowStages, AUXILIARY_STAGES as auxiliaryStages }
