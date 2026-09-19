/**
 * StageContract — 阶段协议
 *
 * 每个阶段声明：允许的前置阶段、必须的产出、校验器、后续阶段。
 * CLI 不再相信 prompt 完成，completeStep 后必须过 validator。
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, basename } from 'path'
import { safeGit } from './git-helper.js'
import { nowWallClock } from './datetime.js'
import { resolveChangeRisk, extractExplicitRiskLevel, checkIntegrationEvidence, VERIFICATION_NEEDS, RISK_LEVEL_CAUSES } from './change-risk-profile.js'
import { loadBlastDeclarationsAllProjects } from './blast-surface.js'
import { parseFileChangeListDetailed } from './change-list.js'
import { parseEvidenceSlots } from './verify-facts-schema.js'
import { IR_STRICT_SINCE } from './constants.js'
import { SCAN_REQUIRED_DOCS, AUXILIARY_STAGES } from './constants.js'
import { evaluateRules } from './stage-contract-engine.js'
import { getRule } from './stage-contract-spec.js'
import { backfillFrontmatter } from './scan-postcheck.js'
import { parseAllowedPaths } from './stages/plan-postcheck.js'
// FR 索引消费（2026-09-18-fr-index-l1 L1）：重复嫌疑软门（advisory）——fr-index 是纯 fs+decision-distill
// 叶子链，静态引入无环；knowledge-hits 同为叶子。
import { parseChangeRequirements, resolveTouchedDomains, readActiveFrDigest, frTitleOverlap } from './fr-index.js'
import { discoverModuleIndex } from './decision-distill.js'
import { appendKnowledgeHit } from './knowledge-hits.js'
// design.md 文件清单解析（2026-09-17-pass-cap-semantics task-02 事实③）：change-list 是纯 fs
// 叶子模块（design-facts / scope-audit / verify-probes 等同款直连惯例），静态引入无环。

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

  // archive 特例：step4 --confirm 已把变更从 changes/<name>/ 移到 changes/archive/<name>/。
  // step5（更新路线图/提交）--change <name> 不应因 changes/<name>/ 已移走而被前置校验误拦。
  if (stageName === 'archive') {
    const archiveRoot = join(specBase, 'changes', 'archive')
    if (existsSync(archiveRoot) && existsSync(join(archiveRoot, changeName))) {
      return null
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
  // 故障面/退役判据（FR-01/D-001@v1，2026-09-15-tax-governance）：自维护税治理字段，
  // 软警告素材（warnMissingGovernanceFields）——type 缺省为 ''（非 architecture 不警告）
  const type = readDecisionField(body, 'type').toLowerCase()
  const failureMode = readDecisionField(body, '故障面')
  const retireWhen = readDecisionField(body, '退役判据')
  return { id: id.toUpperCase(), body, status, priority, blocker, priorityMissing, supersedes, type, failureMode, retireWhen }
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

/**
 * decisions.md 缺 author/created_at header 时自动补齐（坑 decisions-header-late-warning，
 * 2026-08-24 用户反馈二期：brainstorm step8 模板曾自带无 frontmatter 的 decisions 样例——
 * agent 照抄生成必缺 header，拖到后续环节才提示。模板已修；本函数兜存量：gate 前幂等补
 * 机械字段（author=git user / created_at=now），与 scan-fix-headers 同一 backfillFrontmatter 实现。
 * @param {string} changeDir - changes/<name> 目录
 * @returns {boolean} true = 本次补齐过（false = 无 decisions.md / header 已齐 / 写失败）
 */
export function ensureDecisionDocHeader(changeDir) {
  try {
    const decisionPath = join(changeDir, 'decisions.md')
    if (!existsSync(decisionPath)) return false
    const content = readFileSync(decisionPath, 'utf8')
    let author = 'unknown'
    const gitUser = safeGit(changeDir, ['config', 'user.name'])
    if (gitUser && gitUser.value) author = String(gitUser.value).trim() || 'unknown'
    const r = backfillFrontmatter(content, { author, createdAt: nowWallClock() })
    if (!r.changed) return false
    writeFileSync(decisionPath, r.content)
    console.log(`ℹ️  已自动补齐 decisions.md 缺失的 author/created_at header: ${decisionPath}`)
    return true
  } catch { /* 补齐失败不阻断 gate——decisions 内容校验照常进行 */ }
  return false
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
 * 故障面/退役判据软警告（FR-01/D-001@v1，change: 2026-09-15-tax-governance）：
 * type=architecture 且 status=accepted 的条目缺任一字段 → warnings.push（不阻断）。
 * 机制落地时被迫留痕「它引入什么失败模式、什么信号出现就该简化它」；definition/boundary
 * 等其他类型不要求。扫描无法区分新旧条目（design R-03）——文案标注存量可忽略，
 * 软警告不升 error（一个观测周期后再评估棘轮升级，D-001 退役判据锚定）。
 */
function warnMissingGovernanceFields(warnings, decisionsContent) {
  if (!decisionsContent) return
  for (const r of parseDecisionRecords(decisionsContent)) {
    if (r.type !== 'architecture' || r.status !== 'accepted') continue
    if (r.failureMode && r.retireWhen) continue
    warnings.push(`decisions.md ${r.id}（architecture）缺「故障面/退役判据」——新决策建议补齐（存量条目可忽略）`)
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
/**
 * 变更目录级声明面判级（2026-09-19-ceremony-pricing-five-cuts task-03 / D-008）：
 * design 文件变更清单（change-list 单一真相源解析，双形态标题）× blast 声明（多项目并集，
 * 调用方无 project 语境）+ design frontmatter explicit（只压 tier 不豁免 evidence，D-009）。
 * 词表散文判级（detectChangeRisk）退役后的 stage-contract 四消费点统一入口。
 */
function resolveChangeRiskForChangeDir(changeDir, specBase) {
  const designPath = join(changeDir, 'design.md')
  let designText = ''
  try { designText = readFileSync(designPath, 'utf8') } catch { designText = '' }
  const declaredFiles = parseFileChangeListDetailed(designPath, { keepSillyspecDocs: true }).map(e => e.path)
  const blastDeclarations = loadBlastDeclarationsAllProjects({ specBase })
  return resolveChangeRisk({ files: declaredFiles, blastDeclarations, explicitRiskLevel: designText ? extractExplicitRiskLevel(designText) : null })
}

function validateBrainstormOutputs(cwd, changeName, context = {}) {
  const { specRoot } = context
  const changesRoot = specRoot ? join(specRoot, 'changes') : join(cwd, '.sillyspec', 'changes')
  if (specRoot && !existsSync(changesRoot)) {
    return { ok: false, errors: [`平台模式 specRoot 缺少 changes 目录: ${changesRoot}`], warnings: [] }
  }
  const changeDir = resolveChangeDir(cwd, changeName, specRoot)
  // 读 design.md frontmatter scale(若有)传入引擎 ctx,供 BRAINSTORM_RULES 的 condition 判定:
  // scale=small → proposal/requirements/tasks 三规则跳过(小变更只产 design.md,与末步 prompt 一致,
  // 避免"照 Step8 small 指引只写 design.md 后 --done 必撞四件套 error墙")。
  // fail-safe:design.md 不存在或无 scale → null → condition(ne 'small')成立 → 四件套全要求(保守走重流程)。
  const designPath = join(changeDir, 'design.md')
  let scale = null
  let designContent = null
  if (existsSync(designPath)) {
    designContent = readFileSync(designPath, 'utf8')
    const fm = designContent.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/)
    const sm = fm && fm[1].match(/^scale:[ \t]*['"]?(\w+)/m)
    if (sm) scale = sm[1]
  }
  // 纯 kind 规则(四件套存在性 + proposal/requirements/design 章节 + tasks 列表)由引擎消费
  // stage-contract-spec.js manifest,与报错文案 + prompt 事前契约严格同源(事前给的 == 事后查的)。
  // custom kind(lifecycle / decisions)保留下方旧逻辑,数据/文案在 Batch 3 迁入 manifest。
  const engineResult = evaluateRules('brainstorm', { changeDir, scale })
  const errors = [...engineResult.errors]
  const warnings = [...engineResult.warnings]

  // ── FR 重复嫌疑软门（2026-09-18-fr-index-l1 L1，D-005：advisory 永不阻断）──
  // 新 requirements 的无承接 FR × 同域 active 索引条目标题 bigram 重叠 ≥0.6 → warning
  // （双出路：加承接行或改标题区分）+ fr-duplicate-warning 遥测（L3 证据发生器指标③）。
  // fail-soft 全包：索引不存在/解析失败零打扰（同步实现——全部叶子静态导入）。
  try {
    const frKnowledgeRoot = specRoot ? join(specRoot, 'knowledge') : join(cwd, '.sillyspec', 'knowledge')
    const req = parseChangeRequirements(changeDir)
    if (!req.missing && req.frs.length > 0) {
      const domains = resolveTouchedDomains(changeDir, discoverModuleIndex(frKnowledgeRoot))
      const active = readActiveFrDigest(frKnowledgeRoot, domains)
      if (active.length > 0) {
        for (const fr of req.frs) {
          if (fr.supersedes.length > 0 || !fr.title) continue
          let hit = null
          for (const a of active) {
            const o = frTitleOverlap(fr.title, a.title)
            if (!hit || o > hit.o) hit = { a, o }
          }
          if (hit && hit.o >= 0.6) {
            warnings.push(`疑似重复 FR：新「${fr.local} ${fr.title}」与现行 ${hit.a.id}「${hit.a.title}」标题重叠度 ${(hit.o * 100).toFixed(0)}%——若为改写/取代请在该 FR 块加承接行 \`承接: ${hit.a.id}\`，若为不同需求请改标题区分（advisory，L1 观察指标）`)
            try {
              appendKnowledgeHit(join(specRoot || join(cwd, '.sillyspec'), '.runtime'), {
                type: 'fr-duplicate-warning', change: changeName, title: fr.title, candidate: hit.a.id, overlap: Number(hit.o.toFixed(2)),
              })
            } catch { /* 遥测 fail-soft */ }
          }
        }
      }
    }
  } catch { /* FR 软门 fail-soft：索引/解析异常零打扰 */ }

  if (designContent) {
    const content = designContent

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

    // ── 风险判级提前提示（坑 risk-first-use-opaque，2026-08-24；2026-09-19-ceremony-pricing-five-cuts
    //    task-03 改声明面口径）── verify --done 的证据门既往只在流程末段暴露，首次使用者撞墙后
    //    才知道出路。design --done 即按「design 文件清单 × 项目声明危险面」预判一次（advisory
    //    不作定论）：evidence:true 命中 → 透出证据要求 + 出路；explicit 已声明 → 透出「压档不豁免
    //    证据」（D-009——旧显式短路连证据门一起免的洞已收口）。
    {
      const riskPreview = resolveChangeRiskForChangeDir(changeDir, context.specRoot || specRoot || join(cwd, '.sillyspec'))
      if (riskPreview.evidenceRequired && !riskPreview.explicit) {
        warnings.push(
          `[risk] 本次 design 声明文件面命中项目声明危险面（${riskPreview.hitPrefixes.join('、')}，evidence:true）——verify --done 将强制真实集成证据门控。` +
          `若认为不该要求集成证据：改 _module-map.yaml 顶层 blast 段（git 可见）；design frontmatter risk_level 只压仪式档、不豁免证据要求（D-009）。`
        )
      }
      if (riskPreview.evidenceRequired && riskPreview.explicit) {
        warnings.push(
          `[risk] 声明文件面命中 evidence:true 危险面（${riskPreview.hitPrefixes.join('、')}），且 frontmatter 已显式 risk_level——注意：显式声明压仪式档（tier=${riskPreview.tier}），但集成证据要求不被豁免（D-009）。`
        )
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
    // 故障面/退役判据软警告（FR-01，2026-09-15-tax-governance）：architecture+accepted 缺字段
    // → warning 不阻断（经 gates warnings 通道打印，gates.js 零改动）
    warnMissingGovernanceFields(warnings, decisions)
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

  // 读 design.md frontmatter scale(若有)传入引擎 ctx,供 plan.module-impact.exists 的 condition
  // (scale≠small)判定——large 要求 module-impact 首版,small 豁免(走 quick)。fail-safe:无 scale→null→
  // condition(ne 'small')成立→保守要求 module-impact(同 brainstorm scale 读取模式,line 264-272)。
  const designPathForScale = join(changeDir, 'design.md')
  let scale = null
  if (existsSync(designPathForScale)) {
    const fm = readFileSync(designPathForScale, 'utf8').match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/)
    const sm = fm && fm[1].match(/^scale:[ \t]*['"]?(\w+)/m)
    if (sm) scale = sm[1]
  }
  // plan.md frontmatter plan_level 传入引擎 ctx(ql-20260917-003)：plan.global-constraints warning
  // 的 condition 用。读不到(无 frontmatter/旧格式)→ undefined → eq:'full' 不成立 → 规则跳过
  // (存量零误报 fail-safe，同 scale 读取模式)。
  let planLevel = null
  if (existsSync(planFile)) {
    const pfm = readFileSync(planFile, 'utf8').match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/)
    const plm = pfm && pfm[1].match(/^plan_level:[ \t]*['"]?(\w+)/m)
    if (plm) planLevel = plm[1]
  }
  // plan.md 存在性由引擎消费 manifest。entryPoint/id-trace/decisions 为 custom kind(下方保留)。
  const engineResult = evaluateRules('plan', { changeDir, scale, planLevel })
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
    // 故障面/退役判据软警告（FR-01，2026-09-15-tax-governance）：brainstorm 侧同款（软警告不阻断）
    warnMissingGovernanceFields(warnings, decisions)
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
          // 复用 parseAllowedPaths（坑6①：认 inline 数组/缩进块/顶格块 + 剥反引号 + CRLF 归一，
          // 消除此处内联正则与 plan-postcheck 的解析漂移）。卡片无 frontmatter 时退全文扫描
          // （包裹伪 frontmatter 复用同一解析器）——原内联正则是全文匹配语义，entry-point-wiring
          // 只关心路径覆盖，卡片格式合法性归 plan-postcheck 把关，此处不收紧。
          const paths = parseAllowedPaths(taskContent)
          const effective = paths.length > 0 ? paths : parseAllowedPaths(`---\n${taskContent}\n---`)
          for (const p of effective) allAllowedPaths.add(p.toLowerCase())
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
 * 2026-09-08 刀③起降级为 legacy 回退：首选结论枚举槽（extractVerifyConclusionSlot），
 * 仅当文件完全没有槽行时才走本窗口扫描（存量变更兼容）；槽存在即不走本函数——
 * 骨架占位符 `<待填：三选一>` 不含枚举词，两种解析下都 fail-closed（修掉旧占位符
 * `<待填：PASS 或 FAIL>` 被窗口正则误读成 PASS 的自通过缺陷）。
 */
function extractVerifyConclusion(verify) {
  // 遍历所有含关键词的二级标题，取其 400 字符窗口内含 PASS/FAIL 的那个（坑
  // verify-conclusion-heading-hijack：旧逻辑取首个匹配，"## 测试结果"等普通标题
  // 排在真结论前时劫持识别）。优先精确匹配「## 结论」类窄标题。
  const headingRe = /^##\s[^\n]*(?:结论|conclusion|result|结果)/gim
  let best = null
  let bestPriority = -1
  for (const headingMatch of verify.matchAll(headingRe)) {
    const start = headingMatch.index
    const slice = verify.slice(start, start + 400)
    const kw = slice.match(/\b(PASS(?:\s+WITH\s+NOTES)?|FAIL)\b/i)
    if (!kw) continue
    // 优先级：精确含「结论/conclusion」> 宽泛含「result/结果」
    const text = headingMatch[0].toLowerCase()
    const priority = (/结论|conclusion/i.test(text)) ? 1 : 0
    if (priority > bestPriority || (priority === bestPriority && !best)) {
      best = kw[1].toUpperCase().replace(/\s+/g, ' ')
      bestPriority = priority
    }
  }
  return best || ''
}

/**
 * 结论枚举槽提取（刀③，2026-09-08）：verify-probes --init 骨架生成的固定槽行
 * `结论枚举：`<枚举值>…``——解析只认该行的枚举词，标题措辞劫持面归零。
 * @param {string} verify - verify-result.md 全文
 * @returns {string|null} 枚举值（PASS / PASS WITH NOTES / FAIL）；'' = 有槽未填（fail-closed）；
 *   null = 文件无槽行（调用方走 legacy 窗口扫描）
 */
export function extractVerifyConclusionSlot(verify) {
  if (!/^结论枚举：/im.test(verify)) return null
  const m = verify.match(/^结论枚举：`?(PASS WITH NOTES|PASS|FAIL)\b/im)
  // 交替序 PASS WITH NOTES 在前，防裸 PASS 抢先截断
  return m ? m[1] : ''
}

/**
 * 结论解析统一入口：槽优先，无槽走 legacy 窗口扫描并对存量格式发迁移提示。
 * @param {string} verify - verify-result.md 全文
 * @param {string[]} [warnings] - 传入时追加 legacy 迁移 warning
 * @returns {string} 枚举值或 ''（未识别/未填）
 */
function resolveVerifyConclusion(verify, warnings) {
  const slot = extractVerifyConclusionSlot(verify)
  if (slot !== null) return slot
  if (warnings) {
    warnings.push(
      'verify-result.md 结论未用「结论枚举：」槽行（旧自由格式，关键词窗口解析对标题措辞敏感——已有两次历史坑）。' +
      '新变更请用 `sillyspec verify-probes --change <变更> --init` 骨架的槽格式；窗口解析仅为存量变更保留。'
    )
  }
  return extractVerifyConclusion(verify)
}

/**
 * IR 严格档判别（审核 P2-2）：design.md frontmatter created_at ≥ IR_STRICT_SINCE。
 * 与 verify-postcheck isStrictChange 同锚（常量单源 constants.js），此处只读 design
 * 文件（不接 DB——validator 层保持纯文件判定，db 侧判别归 isStrictChange）。
 */
function isIrStrictVerifyChange(changeDir) {
  try {
    const dp = join(changeDir, 'design.md')
    if (!existsSync(dp)) return false
    const fm = readFileSync(dp, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)
    const cm = fm && fm[1].match(/^created_at:\s*(\d{4}-\d{2}-\d{2})/m)
    if (!cm) return false
    return cm[1] >= IR_STRICT_SINCE
  } catch { return false }
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
    // 刀③起结论解析槽优先（extractVerifyConclusionSlot），一处解析两处消费。
    const conclusionStr = resolveVerifyConclusion(verify, warnings)
    // ── 严格档结论槽必在（2026-09-09 外部审核 P2-2）：有槽 fail-closed，但整行删「结论枚举：」
    // 曾可逃回 legacy 窗口正则蹭关键词。IR 严格档变更（design created_at ≥ IR_STRICT_SINCE）
    // 无槽直接 ERROR——存量变更不受影响（legacy 回退保留）。──
    if (!/^结论枚举：/im.test(verify)) {
      const strict = isIrStrictVerifyChange(changeDir)
      if (strict) {
        errors.push('严格档变更（created_at ≥ ' + IR_STRICT_SINCE + '）verify-result.md 缺「结论枚举：」槽行——删槽回退关键词窗口的通道已关闭。修复：跑 `sillyspec verify-probes --change <变更名> --init` 补槽段（已有正文不覆盖），把 <待填：三选一> 替换为枚举值。')
      }
    }
    if (conclusionStr === 'FAIL') {
      errors.push(getRule('verify.conclusion.fail-gate').failMessage)
    } else if (!conclusionStr) {
      warnings.push(getRule('verify.conclusion.fail-gate').noConclusionWarning)
    }

    // ── P0: Change Risk Gate — 核心功能缺少真实集成验证时 FAIL ──
    // 2026-09-19-ceremony-pricing-five-cuts task-03：声明面口径——design 文件清单 × blast 声明，
    // evidenceRequired 驱动证据门（D-009：explicit 只压仪式档不豁免证据）。
    const changeRiskProfile = resolveChangeRiskForChangeDir(changeDir, context.specRoot || specRoot || join(cwd, '.sillyspec'))
    const conclusion = conclusionStr // 槽优先解析结果复用（此前同输入重复扫两遍）
    if (changeRiskProfile.evidenceRequired) {
      // 声明面命中披露 + 出路（旧关键词误伤引导随词表退役改写）：命中 evidence:true 声明路径
      // → 证据门强制；出路=改 map（git 可见）或提供真实证据；risk_level 压档不豁免证据。
      if (!changeRiskProfile.explicit) {
        warnings.push(
          `[${changeRiskProfile.level}] 本次变更声明文件面命中项目声明危险面（evidence:true：${changeRiskProfile.hitPrefixes.join(', ')}）。` +
          `若认为不该要求集成证据：改 _module-map.yaml 顶层 blast 段（git 可见）；design frontmatter risk_level 只压仪式档、不豁免证据要求（D-009）。`
        )
      }
      // ── 显式 risk_level 分层（D-002@v1 延续 + D-009 修订，2026-09-19-ceremony-pricing-five-cuts）──
      // ① explicit 与否不豁免证据（D-009）：evidence:true 命中即进本块——explicit 低档声明不再
      //   是证据逃生门（旧「豁免级免证据」洞已收口，出路=改 map）；
      // ② explicit + PASS WITH NOTES：必须携带结构化 handover（facts.handover 有效行；blocking 级
      //   计入封顶口径同 validatePassEligibility 条件②）或齐全集成证据，二选一——无 handover 即挂
      //   证据门（checkIntegrationEvidence 不过 → error）；
      // ③ 非显式（声明面判级）判定式一字不动（防 PASS WITH NOTES 绕证据门控）。
      const notesExplicitCritical = conclusion === 'PASS WITH NOTES' && changeRiskProfile.explicit
      const handoverRows = notesExplicitCritical ? countFactsHandoverItems(changeDir) : 0
      const requiresEvidence = conclusion === 'PASS'
        || (conclusion === 'PASS WITH NOTES' && (!changeRiskProfile.explicit || handoverRows === 0))
      if (notesExplicitCritical) {
        if (handoverRows > 0) {
          warnings.push(`[${changeRiskProfile.level}] 结论 PASS WITH NOTES：design frontmatter 显式声明 risk_level=${changeRiskProfile.level}，缺口由结构化移交项承载（facts.handover ${handoverRows} 行，「## 移交项（结构化）」）——blocking 级行在结论=PASS 时按封顶口径拦截（validatePassEligibility 条件②），请如实分行勿漏报。`)
        } else {
          warnings.push(`[${changeRiskProfile.level}] 结论 PASS WITH NOTES：显式声明 risk_level=${changeRiskProfile.level} 且「## 移交项（结构化）」零有效行——按齐全集成证据口径校验（二选一：补结构化移交项承载缺口，或提供齐全集成证据；两者皆缺将 error）。`)
        }
      }
      if (requiresEvidence) {
        // CLI 回执注入（坑 verify-literal-evidence-mismatch，2026-08-22 实证：证据第一轮就齐
        // 但自然措辞不含字面词被误拦三轮）：verify 服务回收器落的回执 = 真实启动+PID 登记
        // 的结构化证据，作为附加匹配文本——有回执不依赖 agent 措辞；无回执维持原字面匹配
        let receiptText = ''
        try {
          // 回执按变更分片（坑 verify-pids-cross-session-kill：原单份被并行会话后写覆盖），
          // 优先读本变更分片，兼容旧单份名（升级过渡期 receipt.change 过滤仍生效）。
          // runtimeDir 与写入方 reapVerifyServices 同源解析（context.runtimeRoot > specRoot/.runtime
          // > cwd/.sillyspec/.runtime）——平台/漂移模式下 cwd/.sillyspec 恒读不到回执
          const runtimeDir = context.runtimeRoot
            || join(context.specRoot || join(cwd, '.sillyspec'), '.runtime')
          const receiptPath = existsSync(join(runtimeDir, `verify-services-${changeName}.receipt.json`))
            ? join(runtimeDir, `verify-services-${changeName}.receipt.json`)
            : join(runtimeDir, 'verify-services.receipt.json')
          if (existsSync(receiptPath)) {
            const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'))
            if (receipt && (receipt.reapedPidCount || 0) > 0 && (!receipt.change || receipt.change === changeName)) {
              receiptText = `CLI 回执：verify 服务进程已回收 ${receipt.reapedPidCount} 个（PID 已登记，真实启动，运行时证据 reapedAt=${receipt.reapedAt}）`
            }
          }
        } catch { /* 回执损坏按无回执处理（fail 回原字面匹配） */ }
        // v2（2026-09-08-ir-verify-facts FR-04）：回执槽优先——verify-result.md「## 集成验证回执」
        // 槽在场时传结构化 runtimeEvidence 走一致性校验（绿判据），无槽降 legacy literals。
        // verifyStartAt 由调用方经 context 传入（gates 接线侧 ProgressManager.getStageCompletedAt
        // 同步算好——runValidators 引擎是同步的，此处不做 DB IO；缺省 → auditRuntimeReceipt
        // fail-soft 跳过 mtime 核验）。
        let runtimeEvidence = null
        try {
          const slotsEv = parseEvidenceSlots(verify)
          if (slotsEv.hasReceiptSlot) runtimeEvidence = slotsEv.runtimeEvidence
        } catch { /* 解析失败按无槽 legacy */ }
        const evidenceCheck = checkIntegrationEvidence(verify, changeRiskProfile.requiredVerification, {
          extraEvidenceText: receiptText,
          ...(runtimeEvidence ? { runtimeEvidence } : {}),
          ...(context.verifyStartAt ? { verifyStartAt: context.verifyStartAt } : {}),
          // 回执来源声明透传（X-10 / D-006，2026-09-17-pass-cap-semantics task-02）：调用侧只透传
          // context 携带的声明源（quality-scan 记录的命令 / verify_precedents 声明同思想），不在
          // 本侧做任何分类——分类打标单点在 change-risk-profile（auditRuntimeReceipt 内按回执
          // command 来源 classifyReceiptSourceTag）；未透传时按各回执 command 就地分类。
          ...(context.receiptSourceTag ? { sourceTag: context.receiptSourceTag } : {}),
          cwd,
          specBase: context.specRoot || join(cwd, '.sillyspec'),
        })
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
            `  命中声明危险面（evidence:true）：${changeRiskProfile.hitPrefixes.join(', ') || '（无）'}\n` +
            `  出路：① 补全上述缺失的真实集成证据（真实启动 daemon/backend、集成测试、运行日志）后保持 PASS；` +
            `或 ② 如实改结论 FAIL（承认端到端未验，留待部署后补）；` +
            `或 ③ 若认为该路径不该要求集成证据，改 _module-map.yaml 顶层 blast 段的 evidence 声明（git 可见）——` +
            `design frontmatter risk_level 只压仪式档、不豁免证据要求（D-009）。` +
            `仅改结论文案/措辞蹭字面关键词会被对账。`
          )
        }
        warnings.push(...evidenceCheck.warnings)
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

// ============ 探针 7 验收×测试覆盖矩阵门禁（2026-09-14-acceptance-test-matrix FR-02） ============
// 段格式与 src/verify-probes.js renderProbe7Lines 骨架渲染字面同源（禁第二套解析文法）：
// 段标题「#### 探针 7：验收×测试覆盖矩阵」（全/半角冒号皆认）；每 task 前 **task-NN** 锚行；
// 五列表 | acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |；判定槽 <待填：五选一>、
// 证据槽 <TODO>；列表防御行（卡无 acceptance…）与不适用行无槽不计。

/** 判定列五枚举白名单（骨架口径注记字面同源；covered-service=service 层承接，2026-09-19-api-matrix-service-coverage） */
const MATRIX_VERDICT_WHITELIST = new Set(['covered', 'covered-service', 'partial', 'uncovered', 'non-testable'])
/** 证据列未填占位（骨架字面同源） */
const MATRIX_EVIDENCE_TODO = '<TODO>'

/**
 * 切分 markdown 表格行：按未转义管道切列（`\|` 是单元格内字面量，切列须忽略），
 * 行首管道消费、行尾有管道则末段为收尾空段不产列。非 | 起始行返回 null。
 * @returns {string[]|null} 单元格数组（未 trim）；null = 非表行
 */
function splitMatrixRowCells(line) {
  const s = String(line).trim()
  if (!s.startsWith('|')) return null
  const cells = []
  let cur = ''
  for (let i = 1; i < s.length; i++) {
    const ch = s[i]
    if (ch === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue }
    if (ch === '|') { cells.push(cur); cur = ''; continue }
    cur += ch
  }
  if (!s.endsWith('|')) cells.push(cur) // 行尾缺管道的宽容形态：尾段仍是单元格
  return cells
}

/**
 * covered/partial 行证据是否含测试锚点形态之一：`.test.` 文件名 / file:line（x.js:123）/
 * 反引号包裹的标识符（骨架归属列即反引号路径，agent 引用复制即命中）。
 */
function matrixEvidenceHasAnchor(evidence) {
  const e = String(evidence || '')
  if (e.includes('.test.')) return true
  if (/[A-Za-z0-9_\-./\\]+\.[A-Za-z0-9]+:\d+/.test(e)) return true
  if (/`[^`]+`/.test(e)) return true
  return false
}

/**
 * 行级证据口径：covered/covered-service/partial 须非 TODO 且含测试锚点；non-testable 须非 TODO
 * 且非空（一句话理由）；uncovered 无证据要求；判定未填（不在需证据枚举内）的行只计 unfilled 不重复
 * 计证据（covered-service 与 covered 同口径：证据即测试锚点三形态，2026-09-19-api-matrix-service-coverage）。
 */
function matrixEvidenceMissing(verdict, evidence) {
  if (verdict !== 'covered' && verdict !== 'covered-service' && verdict !== 'partial' && verdict !== 'non-testable') return false
  const e = String(evidence || '').trim()
  if (e === '' || e === MATRIX_EVIDENCE_TODO || e.startsWith('<待填')) return true
  if (verdict === 'non-testable') return false // 非 TODO 且非空即合规（理由一句话）
  return !matrixEvidenceHasAnchor(e)
}

/**
 * 行级提取 verify-result.md「#### 探针 7：验收×测试覆盖矩阵」段的判定/证据槽（纯字符串解析）。
 * 段定位：探针 7 标题（全/半角冒号）到下个同级（####）或更高级（#~###）标题；##### 属段内。
 * 只认五列表行（按忽略 \| 转义切列）；表头/分隔行、**task-NN** 锚行、列表防御行与
 * 「不适用（无 TaskCard）」行不计槽。
 * @param {string} verifyMd - verify-result.md 全文
 * @returns {{
 *   present: boolean,
 *   rows: Array<{task: string, acceptance: string, verdict: string, evidence: string, unfilled?: boolean, evidenceMissing?: boolean}>,
 *   unfilled: number,
 *   missingEvidence: number
 * }} 无段时 present=false、rows=[]、计数 0/0（调用方区分「无段」与「段在而未填」）
 */
export function extractAcceptanceMatrixSlots(verifyMd) {
  const md = String(verifyMd || '')
  const out = { present: false, rows: [], unfilled: 0, missingEvidence: 0 }
  const hm = md.match(/^#### 探针 7[：:]/m)
  if (!hm) return out
  out.present = true
  const rest = md.slice(hm.index + hm[0].length)
  const endMatch = rest.match(/^#{1,4}(?:[ \t]|$)/m)
  const sectionText = endMatch ? rest.slice(0, endMatch.index) : rest

  let currentTask = ''
  for (const rawLine of sectionText.split(/\r?\n/)) {
    const anchor = rawLine.match(/^\*\*\s*(task-[A-Za-z0-9._-]+)\s*\*\*/)
    if (anchor) { currentTask = anchor[1]; continue }
    const cells = splitMatrixRowCells(rawLine)
    if (!cells || cells.length !== 5) continue // 列表防御行/不适用行/非五列表行不计槽
    const c = cells.map(x => x.trim())
    if (c.every(x => /^:?-{3,}:?$/.test(x))) continue // 分隔行 |---|---|…|
    if (c[3] === '判定' && c[4] === '证据') continue // 表头行
    const verdict = c[3]
    const evidence = c[4]
    const row = { task: currentTask, acceptance: c[0], verdict, evidence }
    if (!MATRIX_VERDICT_WHITELIST.has(verdict)) { row.unfilled = true; out.unfilled++ }
    if (matrixEvidenceMissing(verdict, evidence)) { row.evidenceMissing = true; out.missingEvidence++ }
    out.rows.push(row)
  }
  return out
}

/**
 * 探针 7 矩阵门禁 validator（注册 contracts.verify.validators，走 runValidators errors
 * 阻断链——勿进 gates.js fail-soft 回填块，catch 只 warn 会吞阻断）：
 *   - 无 tasks/ 目录（quick 会话/旧变更，无 TaskCard）→ no-op 零行为变化
 *   - verify-result.md 未落盘（verify 中间步骤）→ no-op：存在性归引擎 manifest，此处只读已落盘内容
 *   - 段缺失：严格档（isIrStrictVerifyChange / IR_STRICT_SINCE 同源常量，与结论槽
 *     「删槽回退已关闭」同口径）ERROR；非严格（存量变更）warning 提示补段不阻断
 *   - 段在场：unfilled / missingEvidence > 0 → ERROR 列出违规行（task+acceptance 截断 40 字）
 *   - 段在场：partial/uncovered 行 >0 且 facts.handover 零有效行（任意 severity）→ ERROR
 *     「部分实现必须有移交去向」（D-003/FR-04，task-03；矩阵 MD 槽解析即防篡改锚点 X-05——
 *     不读 facts.matrixPartialRows producer 快照，锚定当前文档实态；factsExpected=false 存量
 *     零行为变化，factsExpected=true 而 facts 缺失 → fail-closed 按零有效行处理）
 *   - 同分支放行路径 advisory（R-05 第一版）：handover 有效行在场时逐行核对行标识（task 锚 /
 *     acceptance 文本）↔ 条目 item/condition 文本命中，未命中 → console.warn 攒实证，不阻断
 */
function validateAcceptanceMatrix(cwd, changeName, context = {}) {
  const { specRoot } = context
  const errors = []
  const warnings = []
  const changeDir = resolveChangeDir(cwd, changeName, specRoot)

  // 无 TaskCard（tasks/ 不存在）→ 不校验（设计兼容策略：brownfield 零行为变化）
  if (!existsSync(join(changeDir, 'tasks'))) return { ok: true, errors, warnings }
  // verify-result.md 中间步骤未落盘 → 不校验（末步引擎存在性规则兜底）
  const verifyResultPath = join(changeDir, 'verify-result.md')
  if (!existsSync(verifyResultPath)) return { ok: true, errors, warnings }

  const matrix = extractAcceptanceMatrixSlots(readFileSync(verifyResultPath, 'utf8'))
  if (!matrix.present) {
    if (isIrStrictVerifyChange(changeDir)) {
      errors.push(
        `探针 7 矩阵段缺失（有 TaskCard 且严格档，created_at ≥ ${IR_STRICT_SINCE}）——` +
        `verify-result.md 缺「#### 探针 7：验收×测试覆盖矩阵」段。` +
        `修复：跑 \`sillyspec verify-probes --change ${changeName} --init\` 幂等补段（已有正文不覆盖），再逐行填判定与证据。`
      )
    } else {
      warnings.push(
        `verify-result.md 缺探针 7 验收×测试覆盖矩阵段（非严格档，存量变更不强制）——` +
        `可跑 \`sillyspec verify-probes --change ${changeName} --init\` 幂等补段。`
      )
    }
    return { ok: errors.length === 0, errors, warnings }
  }

  const clip = (s) => { const t = String(s || ''); return t.length > 40 ? t.slice(0, 40) + '…' : t }
  const rowLabel = (r) => `${r.task || '（未知 task）'}｜${clip(r.acceptance)}`
  if (matrix.unfilled > 0) {
    const list = matrix.rows.filter(r => r.unfilled).map(rowLabel).join('；')
    errors.push(
      `探针 7 验收×测试覆盖矩阵有 ${matrix.unfilled} 行判定未填（五选一 covered/covered-service/partial/uncovered/non-testable）：${list}。` +
      `修复：编辑 verify-result.md 探针 7 段，把 <待填：五选一> 替换为判定值。`
    )
  }
  if (matrix.missingEvidence > 0) {
    const list = matrix.rows.filter(r => r.evidenceMissing).map(rowLabel).join('；')
    errors.push(
      `探针 7 验收×测试覆盖矩阵有 ${matrix.missingEvidence} 行证据缺失` +
      `（covered/covered-service/partial 证据须含测试锚点：\`.test.\` 文件名 / file:line / 反引号包裹的测试名；non-testable 证据须写一句理由）：${list}。` +
      `修复：在证据列补测试锚点（如 \`test/foo.test.mjs\` 或 \`src/x.js:42\`）或 non-testable 理由。`
    )
  }

  // ── partial/uncovered × facts.handover 联动（D-003/FR-04，2026-09-17-pass-cap-semantics task-03）──
  // 部分实现必须有移交去向：矩阵含 partial/uncovered 行且 facts.handover 零有效行（任意
  // severity）→ error；有行 → 本分支放行，blocking 级是否封顶归 validatePassEligibility 条件②
  // （④管「有去向」、②管「去向是否 blocking」）。handover 数据只读 facts.handover（task-01
  // producer 四列产出；不在此重复解析 MD 移交项表——防篡改锚点由上方矩阵 MD 槽解析承担，X-05）。
  // factsExpected 口径复用 task-02 判定式：false（存量未跑管线）→ 分支空转零行为变化；
  // true 而 facts 缺失 → 按零有效行 fail-closed，文案附「重跑 verify-probes」出路。
  // 放行路径上做逐行关联 advisory（R-05 第一版：验收项 ID ↔ handover 条目文本命中，只攒实证
  // 不做硬门）：行标识（task / acceptance 文本）未命中任何条目 → console.warn 提示，不阻断不进 errors。
  const partialRows = matrix.rows.filter(r => r.verdict === 'partial' || r.verdict === 'uncovered')
  if (partialRows.length > 0 && resolveFactsExpected(changeDir)) {
    const facts = readFactsForEligibility(changeDir)
    const factsMissing = facts === null
    // 有效行口径同 countFactsHandoverItems（task-02）：只计对象行；此处需逐条取文本故就地展开
    const handoverItems = facts && facts.handover && Array.isArray(facts.handover.items)
      ? facts.handover.items.filter(it => it && typeof it === 'object') : []
    if (handoverItems.length === 0) {
      const list = partialRows.map(rowLabel).join('；')
      errors.push(
        `探针 7 验收×测试覆盖矩阵含 ${partialRows.length} 行 partial/uncovered 且「## 移交项（结构化）」零有效行（facts.handover）——部分实现必须有移交去向：${list}。` +
        `修复：在 verify-result.md 补「## 移交项（结构化）」有效行（任意 severity 均可，blocking 级另受 PASS 封顶约束），或修正矩阵判定（实际已覆盖的行改 covered），或降级结论为 PASS WITH NOTES 承载。` +
        (factsMissing
          ? `另：verify-facts.json 缺失/不可读而 factsExpected=true，fail-closed 按零有效行处理——重跑 verify-probes（\`sillyspec verify-probes --change ${changeName} --init\` 幂等刷新底稿）。`
          : '')
      )
    } else {
      // 逐行关联 advisory（R-05 第一版，D-003）：行标识（task 锚 / acceptance 文本）命中任一
      // handover 条目的 item/condition 文本即视为有去向；未命中 → console.warn 攒实证（文本
      // 命中是弱关联，误报/漏报均可能——先 advisory 攒数据，硬门等实证后再议），不阻断。
      const itemTexts = handoverItems.map(it => `${it.item || ''}｜${it.condition || ''}`)
      for (const r of partialRows) {
        const keys = [r.task, r.acceptance].map(k => String(k || '').trim()).filter(Boolean)
        const hit = keys.some(k => itemTexts.some(t => t.includes(k)))
        if (!hit) {
          console.warn(`ℹ️ [advisory] 验收项 ${rowLabel(r)} 的移交去向未在 handover 条目中命中——建议条目文本含该标识（advisory，攒实证，D-003/R-05；不阻断）`)
        }
      }
    }
  }
  return { ok: errors.length === 0, errors, warnings }
}

// ============ 接口验证覆盖矩阵门禁（2026-09-17-api-coverage-smoke task-05 / FR-04~FR-06） ============
//
// 与探针 7（验收×测试承接面）并排互补的独立对账门（design §4，D-009 非目标 / R-07 口径注记
// 互指）：探针 7 管「每条 acceptance 由哪些测试承接」，本矩阵管「design 接口段每个端点由哪些
// 验证用例/冒烟步骤覆盖」——fail-closed 记账，机械封住「接口层零派生」的 P1 缺陷面：
//   - covered 记账：分子=判定 covered+covered-service 的端点行（covered-service 计分子——
//     service 层承接是已完成、覆盖层不同；另有 advisory 单独计数承接面）；有效分母=N−non-testable
//     行数（N=解析端点数或声明数，D-005）；分子<有效分母或解析面有未覆盖端点 → error 逐条列缺覆盖端点
//   - 锚点五形态（design §4 Grill #10）：design接口表#<METHOD /path> 解析级（须命中
//     facts.apiFace 解析产出集，防空指）；权限矩阵[...]/契约表@.../DDL@.../载荷@... 形态级
//     存在即认；covered/partial 行缺锚点 → error（missingEvidence 口径同 probe7）；
//     covered-service 行只须测试锚点三形态（matrixEvidenceHasAnchor 同源，2026-09-19-api-matrix-service-coverage）
//   - 移交联动（probe7 条件④同款形态）：partial/uncovered 端点行>0 且 facts.handover 零
//     有效行 → error；blocking 是否封顶归 validatePassEligibility 条件②（④管有去向/②管去向级）
//   - 探索行（uncovered+[探索] 标记）与消费端子行（两空格缩进 ↳ 前缀）不进分母分子
//   - 声明降级（D-005）：解析零行按声明数对账；并存以解析为准并注记 warning；解析零行零
//     声明×判级 critical → error（接口面不可静默为零）；判级 critical×声明 0 端点 → warning
//   - advisory（D-006/D-007 第一版，不阻断不进 errors）：消费端归类在场而矩阵零子行 →
//     warning 列端点；写端点（POST/PUT/DELETE/PATCH）未在权限矩阵段命中且无「无权限约束」
//     豁免 → warning
// 消费路径铁律（plan 全局硬约束 3）：本模块零 import verify-probes——apiFace/consumerHints
// 数据经 facts 落盘面（readFactsForEligibility 同源读取，parseDesignApiTable 产出于
// verify-probes 侧 backfill 落盘）进入；矩阵面经 verify-result.md MD 槽解析（X-05 防篡改锚点，
// 锚定当前文档实态不读 producer 快照）。

/** 矩阵段标题定位（## 级；骨架渲染带「[层：…]」后缀——前缀匹配容忍，renderApiCoverageMatrixLines 字面同源） */
const API_COVERAGE_HEADING_RE = /^## 接口验证覆盖矩阵/m
/** 端点单元格 method+path 提取（预填行 `GET /orders/{id}` 形态；宽匹配容忍注记后缀） */
const API_ENDPOINT_CELL_RE = /(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\/[^\s|]+)/
/** 声明占位行（D-005 零解析降级侧，骨架「本变更接口面：N 端点（agent 声明）」字面同源） */
const API_DECLARED_ROW_RE = /本变更接口面[：:]\s*(\d+)\s*端点/
/** design接口表# 锚点提取（解析级校验用——防空指，Grill #10：非物理行号，METHOD /path 形态） */
const API_ANCHOR_DESIGN_API_RE = /design接口表#\s*(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\/[^\s|，。；;）)]+)/g
/** 探索行标记（骨架文法注释字面同源：证据列含 [探索]） */
const API_EXPLORATION_MARK_RE = /\[探索\]/

/**
 * 行级提取 verify-result.md「## 接口验证覆盖矩阵」段（task-05 壳层 MD 槽解析，纯字符串零 IO）。
 * 段定位：## 标题（前缀匹配容忍后缀）到下个同级（##）或更高级（#）标题。行分类：
 *   - 消费端子行：≥2 空白缩进 + ↳ 前缀（骨架文法字面同源）——只计数不进矩阵行账
 *   - 五列表行（复用 splitMatrixRowCells 切列）：表头/分隔行跳过；端点列含声明行的 →
 *     declaredRow 单列（不进端点行账）；其余 → 端点行（method/path 自端点列提取）
 *   - 声明占位行与探索行判定见上注释；CRLF/LF 容忍（\r 剥离）。
 * @param {string} verifyMd verify-result.md 全文
 * @returns {{
 *   present: boolean,
 *   rows: Array<{endpoint: string, method: string, path: string, verdict: string,
 *     caseId: string, result: string, evidence: string, unfilled?: boolean, exploration?: boolean}>,
 *   subRowCount: number,
 *   declaredRow: {declared: number, verdict: string, evidence: string}|null,
 * }}
 */
export function extractApiCoverageMatrixSlots(verifyMd) {
  const out = { present: false, rows: [], subRowCount: 0, declaredRow: null }
  const md = String(verifyMd || '')
  const hm = md.match(API_COVERAGE_HEADING_RE)
  if (!hm) return out
  out.present = true
  const rest = md.slice(hm.index + hm[0].length)
  const endMatch = rest.match(/^#{1,2}(?:[ \t]|$)/m)
  const sectionText = endMatch ? rest.slice(0, endMatch.index) : rest

  for (const rawLine of sectionText.split(/\r?\n/)) {
    // 消费端子行（≥2 空白缩进 ↳ 前缀）：不计矩阵行账，只计数（advisory 消费面判据）
    if (/^\s{2,}↳/.test(rawLine)) { out.subRowCount++; continue }
    const cells = splitMatrixRowCells(rawLine)
    if (!cells || cells.length !== 5) continue // 注记/防御/非五列表行不计槽
    const c = cells.map(x => x.trim())
    if (c.every(x => /^:?-{3,}:?$/.test(x))) continue // 分隔行
    if (c[0] === '端点' && c[1] === '判定') continue // 表头行
    const dm = c[0].match(API_DECLARED_ROW_RE)
    if (dm) {
      // 声明占位行（D-005 零解析降级侧）：单列不进端点行账，declared 供 N 兜底
      out.declaredRow = { declared: parseInt(dm[1], 10), verdict: c[1], evidence: c[4] }
      continue
    }
    const em = c[0].match(API_ENDPOINT_CELL_RE)
    const row = {
      endpoint: c[0], method: em ? em[1].toUpperCase() : '', path: em ? em[2] : '',
      verdict: c[1], caseId: c[2], result: c[3], evidence: c[4],
    }
    if (!MATRIX_VERDICT_WHITELIST.has(row.verdict)) row.unfilled = true
    row.exploration = row.verdict === 'uncovered' && API_EXPLORATION_MARK_RE.test(`${row.result} ${row.evidence}`)
    out.rows.push(row)
  }
  return out
}

/**
 * 证据锚点五形态命中（design §4 Grill #10）：design接口表# 须提取出 ≥1 个 METHOD /path
 * 锚点才计命中（形态在而端点不可提取按缺锚计，fail-closed）；其余四形态存在即认。
 * design接口表# 锚点是否命中解析产出集由调用侧逐锚核对（解析级校验），此处只管形态在场。
 */
function apiEvidenceHasAnchorForm(evidence) {
  const e = String(evidence || '')
  API_ANCHOR_DESIGN_API_RE.lastIndex = 0
  if (API_ANCHOR_DESIGN_API_RE.test(e)) return true
  if (/权限矩阵\[[^\]]+\]/.test(e)) return true
  if (/契约表@\S/.test(e)) return true
  if (/DDL@\S/.test(e)) return true
  if (/载荷@\S/.test(e)) return true
  return false
}

/**
 * 接口验证覆盖矩阵记账判定纯函数（X-09 双层形态的判定层：零 MD 解析、零 IO——矩阵面经
 * 壳层 extractApiCoverageMatrixSlots 解析传入，apiFace/consumerHints/handover 经 facts
 * 落盘面传入）。task-07 断言消费契约。
 * @param {{
 *   matrix?: object|null,               // extractApiCoverageMatrixSlots 产物
 *   apiFace?: {endpoints?: Array<{method,path,rowIdx}>, declared?: number|null, writeEndpoints?: Array}|null,
 *   consumerHints?: Record<string, string[]>|null,
 *   facts?: object|null,                // verify-facts.json（handover 联动用，缺 null）
 *   factsExpected?: boolean,            // false（存量未跑管线）→ 兼容 ok 不误伤
 *   strict?: boolean,                   // isIrStrictVerifyChange（段缺失分层用）
 *   riskLevel?: string|null,            // resolveChangeRisk().level（声明面判级兼容字段）
 *   changeName?: string,
 *   permSectionText?: string,           // design.md 权限段（段头含 权限/角色 的段合并文本，壳内提取）
 *   designText?: string,                // design.md 全文（写端点豁免行级检测用）
 * }} [args]
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function judgeApiCoverageMatrix(args) {
  const errors = []
  const warnings = []
  const a = args || {}
  // factsExpected=false（存量未跑管线）→ 沿用存量兼容口径 ok 不误伤（evaluatePassEligibility 同款边界）
  if (!a.factsExpected) return { ok: true, errors, warnings }

  const changeName = a.changeName || '<变更名>'
  const INIT_HINT = `\`sillyspec verify-probes --change ${changeName} --init\``
  const matrix = a.matrix && typeof a.matrix === 'object' ? a.matrix : { present: false, rows: [], subRowCount: 0, declaredRow: null }
  const rows = Array.isArray(matrix.rows) ? matrix.rows : []
  const apiFace = a.apiFace && typeof a.apiFace === 'object' ? a.apiFace : null
  const endpoints = apiFace && Array.isArray(apiFace.endpoints)
    ? apiFace.endpoints.filter(e => e && e.method && e.path) : []
  const declared = apiFace && typeof apiFace.declared === 'number' ? apiFace.declared : null
  const writeEndpoints = apiFace && Array.isArray(apiFace.writeEndpoints)
    ? apiFace.writeEndpoints.filter(e => e && e.method && e.path) : []
  const consumerHints = a.consumerHints && typeof a.consumerHints === 'object' ? a.consumerHints : {}
  const criticalLevel = ['integration-critical', 'deployment-critical'].includes(a.riskLevel)

  // ── 段缺失分层（对齐 :896-903 双层形态 + 判级 critical fail-closed 防删段绕过）。
  //    apiFace 在场性 = 特性时序锚（X-08 无条件产出面，task-04 起 backfill 落盘）：缺席说明
  //    facts 最后一次回填早于本特性（特性间隙存量/旧管线 facts）→ warning 引导 --init 刷新
  //    即可（刷新后 apiFace 落盘、矩阵骨架补段，删段面转入上门硬口径）；在场（新管线跑过，
  //    骨架必曾渲染矩阵段）而段缺失 = 删段 → 严格档/critical error。删 facts.json 的对抗面
  //    另由 checkProbeConsistency error 级 MD 锚点兜底（resolveFactsExpected 同口径注记）。──
  const newPipeline = apiFace != null
  if (!matrix.present) {
    if (newPipeline && a.strict) {
      errors.push(
        `接口验证覆盖矩阵段缺失（严格档，created_at ≥ ${IR_STRICT_SINCE}）——verify-result.md 缺「## 接口验证覆盖矩阵」段。` +
        `修复：跑 ${INIT_HINT} 幂等补段（已有正文不覆盖），再逐行填判定与证据。`
      )
    } else if (newPipeline && criticalLevel) {
      errors.push(
        `接口验证覆盖矩阵段缺失且判级 ${a.riskLevel}——critical 变更接口面对账面不可缺失（防删段绕过对账，FR-04）。` +
        `修复：跑 ${INIT_HINT} 幂等补段后逐行填判定与证据。`
      )
    } else {
      warnings.push(
        `verify-result.md 缺「## 接口验证覆盖矩阵」段${newPipeline ? '（非严格档非判级 critical，存量不强制）' : '（facts.apiFace 缺席——特性前回填的存量底稿）'}——可跑 ${INIT_HINT} 幂等补段。`
      )
    }
    return { ok: errors.length === 0, errors, warnings }
  }

  // ── 零接口面分层（D-005）：判级 critical → error（接口面不可静默为零——「变更有接口面」以
  //    判级 critical 为机械代理）；非判级 critical → 零行为零打扰（brownfield 兼容）──
  const declaredFromRow = matrix.declaredRow ? matrix.declaredRow.declared : null
  const zeroFace = endpoints.length === 0 && declared === null && declaredFromRow === null
  if (zeroFace && criticalLevel) {
    errors.push(
      `判级 ${a.riskLevel} 且接口面为零（design 接口段解析零端点且无「本变更接口面：N 端点」声明行）——critical 变更接口面不可静默为零（D-005/FR-04）。` +
      `修复：design.md 补接口段表格（每端点一行 METHOD /path）或声明行「本变更接口面：N 端点」，重跑 ${INIT_HINT} 刷新矩阵段与 facts 后逐行填判定。`
    )
  }
  // 判级 critical × 声明 0 端点 → warning 复核（D-005 故障面条款：显式零声明仍可能是漏写）
  if (criticalLevel && (declared === 0 || declaredFromRow === 0)) {
    warnings.push(
      `判级 ${a.riskLevel} 且声明接口面为 0 端点——critical 变更声明零接口面请复核（D-005）：若实际触碰接口，补 design 接口段表格后重跑 ${INIT_HINT} 刷新对账面。`
    )
  }

  const clip = (s) => { const t = String(s || ''); return t.length > 40 ? t.slice(0, 40) + '…' : t }
  const rowLabel = (r) => `${r.method && r.path ? `${r.method} ${r.path}` : clip(r.endpoint || r.verdict)}`
  const judgedRows = [...rows]
  if (matrix.declaredRow) judgedRows.push({ ...matrix.declaredRow, endpoint: `本变更接口面：${matrix.declaredRow.declared} 端点（agent 声明）`, method: '', path: '', caseId: '', result: '' })

  // ── 行级判定槽/锚点/non-testable 理由校验（missingEvidence 口径同 probe7 :896-903）──
  const unfilledRows = judgedRows.filter(r => r.unfilled)
  if (unfilledRows.length > 0) {
    errors.push(
      `接口验证覆盖矩阵有 ${unfilledRows.length} 行判定未填（五选一 covered/covered-service/partial/uncovered/non-testable）：${unfilledRows.map(rowLabel).join('；')}。` +
      `修复：编辑 verify-result.md 接口验证覆盖矩阵段，把 <待填：五选一> 替换为判定值。`
    )
  }
  const parseSet = new Set(endpoints.map(e => `${e.method} ${e.path}`))
  const anchorViolations = []
  for (const r of judgedRows) {
    if (r.verdict === 'covered-service') {
      // covered-service（service 层承接）：证据即测试本身，只校验测试锚点三形态
      // （matrixEvidenceHasAnchor 同源口径，禁第二套解析文法）；不做 design接口表# 解析级
      // 核对与五形态校验（不要求 design 侧锚点）——校验后 continue，不走 covered/partial 分支。
      if (!matrixEvidenceHasAnchor(r.evidence)) {
        anchorViolations.push(`${rowLabel(r)}：covered-service 证据缺测试锚点（\`.test.\` 文件名 / file:line / 反引号包裹的测试名）`)
      }
      continue
    }
    if (r.verdict !== 'covered' && r.verdict !== 'partial') continue
    const e = String(r.evidence || '')
    // design接口表# 锚点解析级核对（防空指）：提取的 METHOD /path 须全部命中解析产出集
    API_ANCHOR_DESIGN_API_RE.lastIndex = 0
    for (const m of e.matchAll(API_ANCHOR_DESIGN_API_RE)) {
      const key = `${m[1]} ${m[2]}`
      if (!parseSet.has(key)) anchorViolations.push(`${rowLabel(r)}：design接口表#${key} 未命中 design 接口段解析面（空指）`)
    }
    if (!apiEvidenceHasAnchorForm(e)) anchorViolations.push(`${rowLabel(r)}：证据缺用例依据锚点（五形态之一）`)
  }
  if (anchorViolations.length > 0) {
    errors.push(
      `接口验证覆盖矩阵有 ${anchorViolations.length} 项证据锚点缺失/空指` +
      `（covered/partial 证据须含锚点五形态之一：design接口表#METHOD /path（须命中 design 接口段解析面）/ 权限矩阵[角色×动作] / 契约表@行标识 / DDL@列名 / 载荷@构造点路径；covered-service 证据须含测试锚点三形态之一：\`.test.\` 文件名 / file:line / 反引号包裹的测试名）：${anchorViolations.join('；')}。` +
      `修复：在证据列补真实锚点（design接口表# 锚点须与 design.md 接口段端点一致，防编造端点）。`
    )
  }
  // non-testable 理由非空即合法（:900 先例「non-testable 证据须写一句理由」，理由空按违规计）
  const ntMissing = judgedRows.filter(r => r.verdict === 'non-testable' && (String(r.evidence || '').trim() === '' || String(r.evidence).trim() === MATRIX_EVIDENCE_TODO || String(r.evidence).trim().startsWith('<待填')))
  if (ntMissing.length > 0) {
    errors.push(
      `接口验证覆盖矩阵有 ${ntMissing.length} 行 non-testable 缺理由（non-testable 证据须写一句理由）：${ntMissing.map(rowLabel).join('；')}。` +
      `修复：在证据列为 non-testable 端点写一句不适用理由。`
    )
  }

  // ── covered 记账（D-005/D-008）：分子=covered+covered-service 端点行（covered-service 并入
  //    分子满足覆盖等式，service 层承接是「已完成、覆盖层不同」非「未完成待移交」）；有效分母=
  //    N−non-testable 行数；N=解析端点数，解析零行按声明数（declaredRow 优先——矩阵实态，
  //    facts.declared 兜底）。缺覆盖清单解析集驱动：解析面端点 − covered/covered-service 行命中
  //    − non-testable 行命中（partial/uncovered/unfilled 端点行不在命中集即自然进清单；探索行
  //    不进分母分子——其 uncovered 判定使之天然不计分子，且不计入 non-testable 扣减）。──
  if (!zeroFace) {
    const N = endpoints.length > 0 ? endpoints.length : (declaredFromRow != null ? declaredFromRow : (declared != null ? declared : 0))
    const nonTestableCount = rows.filter(r => r.verdict === 'non-testable').length
    const validDenominator = Math.max(0, N - nonTestableCount)
    const serviceCoveredCount = rows.filter(r => r.verdict === 'covered-service').length
    const coveredCount = rows.filter(r => r.verdict === 'covered' || r.verdict === 'covered-service').length
    const coveredSet = new Set(rows.filter(r => (r.verdict === 'covered' || r.verdict === 'covered-service') && r.method && r.path).map(r => `${r.method} ${r.path}`))
    const nonTestSet = new Set(rows.filter(r => r.verdict === 'non-testable' && r.method && r.path).map(r => `${r.method} ${r.path}`))
    const missingEndpoints = endpoints.filter(e => {
      const k = `${e.method} ${e.path}`
      return !coveredSet.has(k) && !nonTestSet.has(k)
    })
    if (coveredCount < validDenominator || missingEndpoints.length > 0) {
      const list = missingEndpoints.length > 0
        ? missingEndpoints.map(e => `${e.method} ${e.path}`).join('；')
        : `声明 ${N} 端点而 covered/covered-service 端点行仅 ${coveredCount}（解析零行降级，无法逐条列端点——按声明行拆出每端点行填判定）`
      errors.push(
        `接口验证覆盖矩阵覆盖不足：有效分母 ${validDenominator}（N=${N} − non-testable ${nonTestableCount}），covered+covered-service 分子 ${coveredCount}——缺覆盖端点：${list}。` +
        `修复：补验证用例/冒烟步骤后把端点行改 covered 并填五形态锚点；端点行为由 service 层测试锁定的改 covered-service 并填测试锚点（\`.test.\` / file:line / 反引号）；不适用端点改 non-testable 并写一句理由；确未覆盖的走「## 移交项（结构化）」承载并保持 partial/uncovered（FR-04）。`
      )
    }
    // covered-service 承接 advisory（D-001/R-01 第一版，只进 warnings 不进 errors）：端点级与
    // 间接覆盖在矩阵统计上可区分——先 advisory 观察滥用面，不设占比上限不阻断。
    if (serviceCoveredCount > 0) {
      warnings.push(
        `[advisory] ${serviceCoveredCount} 端点由 service 层测试承接（非端点级）——端点级与间接覆盖在矩阵统计上可区分，承接占比先 advisory 观察（D-001/R-01，不阻断）`
      )
    }
    // 声明与解析并存以解析为准并注记（骨架 :1573 漂移信号同款口径，数据面 facts.apiFace）
    if (declared !== null && endpoints.length > 0 && declared !== endpoints.length) {
      warnings.push(
        `声明与解析并存（声明 ${declared} 端点 / 解析 ${endpoints.length} 端点）——以解析为准，差异需复核（design 接口段与声明行不同步的漂移信号，D-005）。`
      )
    }
  }

  // ── 移交联动（probe7 条件④ :1068-1073 同款形态）：partial/uncovered 端点行>0 且
  //    facts.handover 零有效行 → error（已覆盖不足且有未验证端点无去向不可静默）；有行 →
  //    放行，blocking 是否封顶归 validatePassEligibility 条件②（④管有去向/②管去向级）。
  //    探索行属 uncovered 子集计入（探索性验证不算覆盖，同样须有去向）；facts 缺失 →
  //    fail-closed 按零有效行处理（factsExpected 已在入口把关，此处只防 facts 消失面）。──
  const partialRows = [
    ...rows.filter(r => r.verdict === 'partial' || r.verdict === 'uncovered'),
    ...(matrix.declaredRow && (matrix.declaredRow.verdict === 'partial' || matrix.declaredRow.verdict === 'uncovered')
      ? [{ ...matrix.declaredRow, endpoint: `本变更接口面：${matrix.declaredRow.declared} 端点（agent 声明）`, method: '', path: '' }] : []),
  ]
  if (partialRows.length > 0) {
    const factsMissing = !a.facts || typeof a.facts !== 'object'
    const handoverItems = !factsMissing && a.facts.handover && Array.isArray(a.facts.handover.items)
      ? a.facts.handover.items.filter(it => it && typeof it === 'object') : []
    if (handoverItems.length === 0) {
      errors.push(
        `接口验证覆盖矩阵含 ${partialRows.length} 行 partial/uncovered 且「## 移交项（结构化）」零有效行（facts.handover）——接口未验证端点必须有移交去向：${partialRows.map(rowLabel).join('；')}。` +
        `修复：在 verify-result.md 补「## 移交项（结构化）」有效行（任意 severity 均可，blocking 级另受 PASS 封顶约束），或修正矩阵判定（实际已覆盖的行改 covered），或降级结论为 PASS WITH NOTES 承载。` +
        (factsMissing
          ? `另：verify-facts.json 缺失/不可读而 factsExpected=true，fail-closed 按零有效行处理——重跑 verify-probes（${INIT_HINT} 幂等刷新底稿）。`
          : '')
      )
    } else {
      // 逐行关联 advisory（R-05 第一版，D-003 同款分工）：行标识未命中任何 handover 条目文本
      // → console.warn 攒实证（文本命中弱关联，先 advisory 攒数据），不阻断不进 errors。
      const itemTexts = handoverItems.map(it => `${it.item || ''}｜${it.condition || ''}`)
      for (const r of partialRows) {
        const keys = [r.method && r.path ? `${r.method} ${r.path}` : '', r.endpoint].map(k => String(k || '').trim()).filter(Boolean)
        const hit = keys.some(k => itemTexts.some(t => t.includes(k)))
        if (!hit) console.warn(`ℹ️ [advisory] 接口端点 ${rowLabel(r)} 的移交去向未在 handover 条目中命中——建议条目文本含该端点标识（advisory，攒实证；不阻断）`)
      }
    }
  }

  // ── advisory：消费面子行缺失（D-006 第一版）——consumerHints 有归类（design 清单启发式，
  //    变更级归类）而矩阵零子行 → warning 列端点（不阻断、不进 errors）。──
  const hintKinds = Object.keys(consumerHints).filter(k => Array.isArray(consumerHints[k]) && consumerHints[k].length > 0)
  if (hintKinds.length > 0 && matrix.subRowCount === 0 && (endpoints.length > 0 || (declaredFromRow != null ? declaredFromRow : declared) > 0)) {
    const list = endpoints.length > 0
      ? endpoints.slice(0, 8).map(e => `${e.method} ${e.path}`).join('；') + (endpoints.length > 8 ? '…' : '')
      : `声明 ${declaredFromRow != null ? declaredFromRow : declared} 端点（解析零行降级）`
    warnings.push(
      `[advisory] 消费端归类在场（${hintKinds.join('/')}，facts.consumerHints——design 清单启发式）但矩阵零消费端子行——建议为接口端点补子行细分承接面（两空格缩进「↳ <消费端>:」形态，D-006，不阻断）：${list}`
    )
  }

  // ── advisory：写端点权限矩阵缺行（D-007/FR-06，文案照 design §5）——apiFace.writeEndpoints
  //    中端点未在权限矩阵段（壳内提取：design 段头含 权限/角色）命中（路径原串或模板基径）
  //    且无「无权限约束」豁免（design 行级/矩阵行级/权限段整体）→ warning。──
  const permText = String(a.permSectionText || '')
  const designLines = String(a.designText || '').replace(/\r\n/g, '\n').split('\n')
  const exemptTexts = [
    ...designLines,
    ...rows.map(r => `${r.endpoint}|${r.caseId}|${r.result}|${r.evidence}`),
  ]
  if (!permText.includes('无权限约束')) {
    for (const ep of writeEndpoints) {
      const base = String(ep.path).split(/[{:]/)[0]
      const hit = permText.includes(ep.path) || (base.length > 1 && permText.includes(base))
      if (hit) continue
      const rowExempt = exemptTexts.some(t => t.includes('无权限约束') && (t.includes(ep.path) || (base.length > 1 && t.includes(base))))
      if (!rowExempt) {
        warnings.push(
          `[advisory] 写端点 ${ep.method} ${ep.path} 未在权限矩阵声明——补行或显式豁免（表缺行会让派生框架继承你的洞）（D-007/FR-06，不阻断）`
        )
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * design.md 权限矩阵段提取（task-05 壳层辅助，D-007 表间完备性数据面）：段头（#/##/###）
 * 含 权限/角色 关键词的段体合并文本（含段头行——命中判据宽松侧，advisory 无害）。零段 → ''。
 */
function extractPermissionMatrixText(designMd) {
  const text = String(designMd || '').replace(/\r\n/g, '\n')
  if (!text) return ''
  const out = []
  let collecting = false
  for (const line of text.split('\n')) {
    const h = line.match(/^#{1,3}\s+(.*)$/)
    if (h) {
      collecting = /权限|角色/.test(h[1])
      if (collecting) out.push(h[1])
      continue
    }
    if (collecting) out.push(line)
  }
  return out.join('\n')
}

/**
 * 接口验证覆盖矩阵 validator 注册壳（与 validateAcceptanceMatrix 同三参签名同构，D-010：
 * 注册进 contracts.verify.validators 即覆盖 gates / machine-interface 等全部 runValidators
 * 调用方，gates.js 零改动）。壳内取数组装（IO/MD 槽解析全在壳层，判定是
 * judgeApiCoverageMatrix 纯函数——X-09 双层形态）：
 *   - tasks/ 不存在（quick 会话/旧变更）或 verify-result.md 未落盘（中间步骤）→ no-op
 *   - factsExpected=false（存量未跑管线，resolveFactsExpected 同源口径）→ no-op 零行为
 *   - verify-facts.json（apiFace/consumerHints/handover，缺失容 null——fail-closed 归纯函数）
 *   - 矩阵段 MD 槽解析（X-05 防篡改锚点：锚定当前文档实态）
 *   - resolveChangeRisk 声明面判级（design 文件清单 × blast 声明 + explicit，task-03）
 *   - design.md 权限矩阵段提取（fs 只读，壳非纯函数）
 */
export function validateApiCoverageMatrix(cwd, changeName, context = {}) {
  const { specRoot } = context
  const errors = []
  const warnings = []
  const changeDir = resolveChangeDir(cwd, changeName, specRoot)
  // 无 TaskCard（tasks/ 不存在）→ 不校验（brownfield 零行为，validateAcceptanceMatrix 同门）
  if (!existsSync(join(changeDir, 'tasks'))) return { ok: true, errors, warnings }
  // verify-result.md 中间步骤未落盘 → 不校验（末步引擎存在性规则兜底）
  const verifyResultPath = join(changeDir, 'verify-result.md')
  if (!existsSync(verifyResultPath)) return { ok: true, errors, warnings }
  // 存量未跑管线（无 facts 且非严格档）→ 矩阵段/apiFace 俱不可得，零行为零打扰
  if (!resolveFactsExpected(changeDir)) return { ok: true, errors, warnings }

  const facts = readFactsForEligibility(changeDir)
  const designText = readIfExists(join(changeDir, 'design.md'))
  // 2026-09-19-ceremony-pricing-five-cuts task-03：声明面判级（design 文件清单 × blast 声明 +
  // explicit；level 为五级词兼容字段——evidenceRequired → integration-critical）
  const riskProfile = resolveChangeRiskForChangeDir(changeDir, context.specRoot || specRoot || join(cwd, '.sillyspec'))
  return judgeApiCoverageMatrix({
    matrix: extractApiCoverageMatrixSlots(readFileSync(verifyResultPath, 'utf8')),
    apiFace: facts && facts.apiFace && typeof facts.apiFace === 'object' ? facts.apiFace : null,
    consumerHints: facts && facts.consumerHints && typeof facts.consumerHints === 'object' ? facts.consumerHints : null,
    facts,
    factsExpected: true,
    strict: isIrStrictVerifyChange(changeDir),
    riskLevel: riskProfile ? riskProfile.level : null,
    changeName,
    permSectionText: extractPermissionMatrixText(designText),
    designText,
  })
}

// ============ PASS 封顶事实面 validator（2026-09-17-pass-cap-semantics task-02 / D-001@v2 / D-010 / D-011） ============
//
// 「要不要集成证据」（validateVerifyOutputs 的 requiresEvidence）与「能不能写 PASS」（本
// validator）解耦：结论=PASS 时四个已知未验证区任一在场即 error——
//   ① 集成实测未跑（facts.integrationRan≠ran，D-006 判定表——字段不在场按未跑处理，与⑤同族口径）
//   ② blocking 级移交项在场（facts.handover[].severity，D-005@v2——④管「有去向」、②管「去向是否 blocking」；
//   facts.handover 不在场=无法核对 blocking 行，fail-closed 拦下）
//   ③ db 脚本未声明执行（verify 时点文件集 ∩ db/**/*.sql 对账 facts.dbScriptDeclarations，D-012）
//   ④ 矩阵含 partial/uncovered 且移交项零有效行（facts.matrixPartialRows × facts.handover——
//   matrixPartialRows 不在场=无法核对矩阵，按含 partial 处理，仍以「零有效移交行」为触发前提）
//   附加：runtimeEndpointExcluded=true 且判级 integration/deployment-critical 且 handover 零行
//   → 计入①事实面（D-004/FR-03，仅判级时计入）。
//   ⑤ 接口冒烟未跑（facts.smokeRan≠ran，仅判级 integration/deployment-critical 时计入，
//   FR-02/D-002@v1——2026-09-17-api-coverage-smoke task-03；不设 handover 豁免子句）。
//
// 分层纪律（D-011）：事实生产走 facts 管线（verify-probes backfillFactsFromMdAndTests 首次
// backfill 主路径无条件产出，X-08 时序——gates 收尾前置 backfill 先于 runValidators）；本壳只做
// 取数组装，判定是 evaluatePassEligibility 纯函数（零 MD 解析、零 IO——MD 锚点防篡改兜底并入
// checkProbeConsistency 抽查面属 task-03）。双源 fail-closed：factsExpected=true 而 facts 缺失
// （篡改/管线故障）→ 全条件按触发拦下；factsExpected=false（存量未跑 --init）→ 兼容 ok 不误伤。

/**
 * 读 <changeDir>/verify-facts.json（缺失/不可解析/非对象 → null）——与 checkProbeConsistency
 * 的 readVerifyFacts（verify-postcheck.js）同口径「有 facts」判别。不静态 import
 * verify-postcheck/verify-probes（verify-probes 顶层 await 动态 import 回指本模块，静态依赖
 * 会在其 TLA 上成环死锁；分层单向，全局硬约束 3），就地等价实现。
 */
function readFactsForEligibility(changeDir) {
  const factsPath = join(changeDir, 'verify-facts.json')
  if (!existsSync(factsPath)) return null
  try {
    const parsed = JSON.parse(readFileSync(factsPath, 'utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch { return null }
}

/**
 * factsExpected 判定（D-011 双源 fail-closed 的「应写」侧）：isIrStrictVerifyChange（严格档
 * 变更删 facts.json 另由 checkProbeConsistency error 级 MD 锚点兜底拦，通道 gates probeBlocked）
 * || verify-facts.json 在场（readVerifyFacts 同口径，含探针子节判别的「有 facts」面）。
 * factsExpected=false（存量未跑管线）→ 封顶兼容 skip 不误伤。
 * @param {string} changeDir 变更目录
 * @returns {boolean}
 */
export function resolveFactsExpected(changeDir) {
  return isIrStrictVerifyChange(changeDir) || readFactsForEligibility(changeDir) !== null
}

/** facts.handover 有效行数（producer parseHandoverRows 已滤占位/表头行；无 facts/handover → 0） */
function countFactsHandoverItems(changeDir) {
  const facts = readFactsForEligibility(changeDir)
  const items = facts && facts.handover && Array.isArray(facts.handover.items) ? facts.handover.items : []
  return items.filter(it => it && typeof it === 'object').length
}

/**
 * PASS 资格事实面封顶纯函数（X-09 双层形态的判定层：零 MD 解析、零 IO，消费 task-01 契约字段）。
 * @param {{
 *   conclusion?: string|null,
 *   facts?: object|null,
 *   factsExpected?: boolean,
 *   changeRiskProfile?: { level?: string }|null,
 *   changeName?: string,
 *   dbScriptCandidates?: string[],
 * }} [args] dbScriptCandidates = 壳内取数的 verify 时点文件集（design 清单 ∪ worktree 变更）∩ db 目录任意层级 .sql
 * @returns {{ ok: boolean, errors: string[], triggered: Array<{ fact: 'integration-not-run'|'blocking-handover-present'|'db-script-undeclared'|'matrix-partial-no-handover'|'smoke-not-run', detail: string }> }}
 */
export function evaluatePassEligibility(args) {
  const errors = []
  const triggered = []
  const a = args || {}
  // factsExpected=false（存量未跑管线）→ 沿用存量兼容口径 ok 不误伤（checkProbeConsistency 同款边界）
  if (!a.factsExpected) return { ok: true, errors, triggered }
  // 封顶只管 PASS：结论 ≠ PASS（FAIL / PASS WITH NOTES / 未识别未填）→ 直接 ok
  if (a.conclusion !== 'PASS') return { ok: true, errors, triggered }

  const factsMissing = !a.facts || typeof a.facts !== 'object'
  const facts = factsMissing ? {} : a.facts
  const handoverItems = (facts.handover && Array.isArray(facts.handover.items)) ? facts.handover.items : []
  const handoverFieldMissing = !factsMissing && !(facts.handover && Array.isArray(facts.handover.items))
  const matrixPartialMissing = !factsMissing && facts.matrixPartialRows == null
  const blockingRows = handoverItems.filter(it => it && it.severity === 'blocking')
  const criticalLevel = a.changeRiskProfile && ['integration-critical', 'deployment-critical'].includes(a.changeRiskProfile.level)
  const NOTES_FIX = '改写结论为 PASS WITH NOTES 并在「## 移交项（结构化）」表格如实分行（类型枚举 env-blocked/manual-acceptance/db-script/other）'

  // ── factsExpected=true 而 facts 缺失 → 双源 fail-closed：全条件按触发（D-011），附重跑 verify-probes 出路（R-07）──
  if (factsMissing) {
    errors.push(
      `[pass-eligibility] verify-facts.json 缺失/不可读但 factsExpected=true（严格档或底稿曾在场后消失——疑似删除/管线故障），按双源 fail-closed 全条件触发拦下。` +
      `出路：重跑 verify-probes（sillyspec verify-probes --change ${a.changeName || '<变更名>'} --init 幂等刷新底稿后重跑 --done 回填），或${NOTES_FIX}降级承载。`
    )
  }

  // ① 集成实测未跑（时序口径 X-01：validator 时点只认已落盘 quality-scan 记录，被拦出路=重跑质量扫描步或降级 NOTES，不算失败；
  // 字段不在场 fail-closed 按未跑处理——⑤同族口径，防存量底稿缺字段静默 PASS）
  if (factsMissing || facts.integrationRan !== 'ran') {
    const integrationDetail = factsMissing
      ? 'facts 缺失（fail-closed 按未跑处理）'
      : `facts.integrationRan=${facts.integrationRan == null ? '不在场（按未跑处理）' : facts.integrationRan}`
    triggered.push({ fact: 'integration-not-run', detail: integrationDetail })
    errors.push(
      `[fact integration-not-run] 集成实测未跑（${integrationDetail}）——结论=PASS 须集成实测已跑（D-006 判定表：quality-scan 实测记录（skip 除外）或跨层回执条目）。` +
      `出路：重跑质量扫描步落实测记录，或提供跨层实测回执后重跑 verify-probes 刷新 facts（字段不在场多为存量底稿未含新字段，重跑即刷新）；仍未跑则${NOTES_FIX}承载（不算失败）。`
    )
  }

  // ② blocking 级移交项在场（blocking 移交项与结论 PASS 互斥；facts.handover 不在场=无法核对，fail-closed）
  if (factsMissing || handoverFieldMissing || blockingRows.length > 0) {
    const list = blockingRows.map(it => `${it.type || '未知类型'}｜${String(it.item || '').slice(0, 60)}`).join('；')
    triggered.push({ fact: 'blocking-handover-present', detail: factsMissing ? 'facts 缺失（fail-closed）' : handoverFieldMissing ? 'facts.handover 不在场（fail-closed 无法核对）' : `${blockingRows.length} 条 blocking 行：${list}` })
    errors.push(
      `[fact blocking-handover-present] ${factsMissing
        ? '移交项 blocking 级行无法核对（verify-facts.json 缺失，fail-closed 按在场触发）'
        : handoverFieldMissing
          ? '移交项 blocking 级行无法核对（facts.handover 不在场——存量底稿未含该字段或管线故障，fail-closed 拦下；重跑 verify-probes 幂等刷新 facts 即可消解）'
          : `移交项含 ${blockingRows.length} 条 blocking 级行——承认有必须兜底的未竟事项即不是 PASS（④管「有去向」、②管「去向是否 blocking」）`}。` +
      `触发行：${factsMissing ? '（facts 缺失，无法核对——fail-closed）' : (list || '（handover 不可核对，无行可列）')}。修复：${NOTES_FIX}；确属 advisory 的按降级文法「（降级：<理由>，依据 <file:line 或 D-xxx>）」显式降级。`
    )
  }

  // ③ db 脚本未声明执行（D-012：verify 时点按声明面/diff 对账，apply/archive 兜底门归 task-04；零连库）
  const candidates = Array.isArray(a.dbScriptCandidates) ? a.dbScriptCandidates : []
  const declared = factsMissing ? [] : (Array.isArray(facts.dbScriptDeclarations) ? facts.dbScriptDeclarations : [])
  const undeclared = candidates.filter(f => !declared.includes(f))
  if (undeclared.length > 0) {
    triggered.push({ fact: 'db-script-undeclared', detail: `${undeclared.join('、')} 未进 facts.dbScriptDeclarations` })
    errors.push(
      `[fact db-script-undeclared] db 脚本在 verify 时点文件集（design 清单 ∪ worktree 变更）∩ db/**/*.sql 中但未声明执行：${undeclared.join('、')}。` +
      `修复：已对目标库执行则在 verify-result.md 补声明（「已对目标库执行：db/<file>.sql」或回执槽 command 含该文件）后重跑 verify-probes 刷新 facts；未执行则${NOTES_FIX}承载（db-script 类恒 blocking）。`
    )
  }

  // ④ 矩阵含 partial/uncovered 且移交项零有效行（任意 severity——部分实现必须有移交去向；
  // matrixPartialRows 不在场=无法核对矩阵，fail-closed 按含 partial 处理，触发前提仍是零有效移交行——
  // 有真移交行在场即「去向已承载」，不因字段缺失误拦）
  if (factsMissing || ((matrixPartialMissing || facts.matrixPartialRows > 0) && handoverItems.length === 0)) {
    const matrixDesc = factsMissing
      ? '（facts 缺失，无法核对——fail-closed）'
      : matrixPartialMissing
        ? '（facts.matrixPartialRows 不在场，无法核对——fail-closed 按含 partial 处理；重跑 verify-probes 刷新 facts 即可消解）'
        : `${facts.matrixPartialRows} 行 partial/uncovered`
    triggered.push({ fact: 'matrix-partial-no-handover', detail: factsMissing ? 'facts 缺失（fail-closed）' : matrixPartialMissing ? 'facts.matrixPartialRows 不在场（fail-closed 按含 partial 处理）且 handover 零有效行' : `matrixPartialRows=${facts.matrixPartialRows} 且 handover 零有效行` })
    errors.push(
      `[fact matrix-partial-no-handover] 验收×测试覆盖矩阵含 ${matrixDesc} 且「## 移交项（结构化）」零有效行——部分实现必须有移交去向。修复：${NOTES_FIX}承载（任意 severity 均可，blocking 级另受条件②约束）。`
    )
  }

  // ── 附加条件（D-004/FR-03，仅判级 integration/deployment-critical 时计入①事实面）：
  // Runtime Evidence「服务端点」行自声明「不涉及」（facts.runtimeEndpointExcluded，X-18 文法）
  // 且移交项零行——端点不得以「不涉及」免检，须真实回执或 handover 承载。
  if (criticalLevel && (factsMissing || facts.runtimeEndpointExcluded === true) && handoverItems.length === 0) {
    triggered.push({
      fact: 'integration-not-run',
      detail: factsMissing ? 'facts 缺失（fail-closed，runtimeEndpointExcluded 不可证伪）' : 'facts.runtimeEndpointExcluded=true 且 handover 零行',
    })
    errors.push(
      `[fact integration-not-run] 判级 ${a.changeRiskProfile.level} 且 Runtime Evidence 服务端点行自声明「不涉及」（facts.runtimeEndpointExcluded=true）且无移交项承载——端点不得以「不涉及」免检（D-004）。` +
      `出路：提供真实端点回执（跨层实测）后重跑 verify-probes，或${NOTES_FIX}承载。`
    )
  }

  // ── ⑤ smoke 冒烟未跑（2026-09-17-api-coverage-smoke task-03 / FR-02 / D-002@v1，判级
  // 限定——criticalLevel 在场才计入，runtimeEndpointExcluded 附加条件同款形态）：判级
  // integration/deployment-critical 且 facts.smokeRan !== 'ran'（producer 自 quality-scan
  // 记录 smokeResult 段推导）→ triggered 加枚举 smoke-not-run。不设 handover 豁免子句——
  // advisory handover 在场不构成 smoke 缺失的 PASS 豁免（smoke 缺失的合法出路只有配
  // commands.smoke 复跑质量扫描步 / 降级 PASS WITH NOTES 移交承载两条）；blocking handover
  // 在场由条件②独立拦下（出口=NOTES），两条件各自触发不互斥。factsMissing 沿双源
  // fail-closed 同族口径按触发处理（smokeRan 不可证伪）；facts 在场但字段不在场（升级
  // 过渡期存量 facts，producer 重新 backfill 前）同 !== 'ran' 触发——fail-closed 侧，防
  // 「判级 critical 未跑冒烟静默 PASS」。非判级（unit-sufficient 等）任意 smokeRan 零行为。
  if (criticalLevel && (factsMissing || facts.smokeRan !== 'ran')) {
    const smokeDetail = factsMissing
      ? 'facts 缺失（fail-closed，smokeRan 不可证伪按未跑处理）'
      : `facts.smokeRan=${facts.smokeRan == null ? '不在场（按未跑处理）' : facts.smokeRan}`
    triggered.push({ fact: 'smoke-not-run', detail: `${smokeDetail}，判级 ${a.changeRiskProfile.level}` })
    const configHint = facts.smokeRan === 'not-configured'
      ? '（not-configured：先在 local.yaml 配置键 commands.smoke，如 smoke: "npm run smoke"）' : ''
    errors.push(
      `[fact smoke-not-run] 接口冒烟未跑（${smokeDetail}）且判级 ${a.changeRiskProfile.level}——critical 变更结论=PASS 须接口冒烟绿跑（facts.smokeRan=ran，FR-02/D-002）。` +
      `出路：①配 commands.smoke 并复跑质量扫描步${configHint}；②降级承载——${NOTES_FIX}（不算失败）。`
    )
  }

  return { ok: errors.length === 0, errors, triggered }
}

/**
 * 事实③文件集取数（D-012，纯声明面/diff 对账零连库）：design.md 文件清单
 * （change-list.parseFileChangeListDetailed——design-facts.validateDesignFileList 同源解析器）
 * ∪ worktree changed files（worktree meta baseHash..HEAD diff ∪ porcelain——checkExecuteCodeEvidence
 * 同款取数形态，与 task-review resolveAttributionDiffFiles 内 resolveVerifyChangedFiles 同源口径；
 * 本模块不静态 import verify-postcheck/verify-probes，TLA 动态环，就地等价实现）∩ db 目录任意层级 .sql。
 * @param {{ cwd: string, changeName: string, specRoot?: string|null, changeDir: string }} opts
 * @returns {string[]} 排序后的候选 db 脚本（posix 相对路径）
 */
function collectDbScriptCandidates({ cwd, changeName, specRoot, changeDir }) {
  const files = new Set()
  const add = (p) => {
    const n = String(p || '').trim().replace(/^"|"$/g, '').replace(/\\/g, '/')
    if (n && n !== '.sillyspec' && !n.startsWith('.sillyspec/')) files.add(n)
  }
  // design 清单半边（design.md 缺失/无清单段 → 空集，fail-soft，diff 半边仍覆盖）
  try {
    for (const entry of parseFileChangeListDetailed(join(changeDir, 'design.md'))) add(entry && entry.path)
  } catch { /* 解析异常退 diff 半边 */ }
  // worktree 变更半边：meta 双根候选（specBase 优先 + cwd/.sillyspec 兜底，_readWorktreeMeta 样板）
  try {
    const specBase = specRoot || join(cwd, '.sillyspec')
    const metaCandidates = [
      join(specBase, '.runtime', 'worktrees', changeName, 'meta.json'),
      join(cwd, '.sillyspec', '.runtime', 'worktrees', changeName, 'meta.json'),
    ]
    let meta = null
    for (const p of metaCandidates) {
      if (existsSync(p)) {
        try { meta = JSON.parse(readFileSync(p, 'utf8')) } catch { meta = null }
        if (meta) break
      }
    }
    if (meta && meta.baseHash) {
      const gitDir = (meta.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath))
        ? meta.worktreePath
        : cwd
      const diff = gitTry(gitDir, ['diff', '--name-only', `${meta.baseHash}..HEAD`])
      if (diff.ok) for (const f of diff.out.split('\n')) add(f)
      const status = gitTry(gitDir, ['status', '--porcelain'])
      if (status.ok) {
        for (const line of status.out.split('\n')) {
          if (!line.trim()) continue
          add(line.slice(3).trim().split(' -> ').pop())
        }
      }
    }
  } catch { /* meta/git 取数失败退 design 清单半边（fail-soft） */ }
  return [...files].filter(p => /^db\/.+\.sql$/i.test(p)).sort()
}

/**
 * PASS 封顶 validator 注册壳（与 validateAcceptanceMatrix 同三参签名同构，D-010：注册进
 * contracts.verify.validators 即覆盖 gates / machine-interface 等全部 runValidators 调用方，
 * gates.js 零改动）。壳内取数组装：verify-result.md 结论（槽优先，legacy 回退）、
 * verify-facts.json（缺失容 null）、resolveChangeRisk 声明面判级、事实③文件集；判定调
 * evaluatePassEligibility 纯函数。
 */
export function validatePassEligibility(cwd, changeName, context = {}) {
  const { specRoot } = context
  const errors = []
  const warnings = []
  const changeDir = resolveChangeDir(cwd, changeName, specRoot)
  // 变更目录缺失 → 引擎 manifest 存在性规则兜底（validateVerifyOutputs 同名 error），此处 no-op
  if (!existsSync(changeDir)) return { ok: true, errors, warnings }
  // verify-result.md 中间步骤未落盘 → no-op（同 validateAcceptanceMatrix：存在性归引擎末步规则）
  const verifyResultPath = join(changeDir, 'verify-result.md')
  if (!existsSync(verifyResultPath)) return { ok: true, errors, warnings }

  const conclusion = resolveVerifyConclusion(readFileSync(verifyResultPath, 'utf8'))
  const facts = readFactsForEligibility(changeDir)
  const result = evaluatePassEligibility({
    conclusion,
    facts,
    factsExpected: isIrStrictVerifyChange(changeDir) || facts !== null,
    // 2026-09-19-ceremony-pricing-five-cuts task-03：声明面判级（level 兼容字段驱动 evaluatePassEligibility
    // 的 critical 判定——evidenceRequired → integration-critical，D-009 证据不被 explicit 豁免）
    changeRiskProfile: resolveChangeRiskForChangeDir(changeDir, context.specRoot || specRoot || join(cwd, '.sillyspec')),
    changeName,
    dbScriptCandidates: collectDbScriptCandidates({ cwd, changeName, specRoot, changeDir }),
  })
  return { ok: result.ok, errors: result.errors, warnings }
}

/**
 * 计算归档目标目录名：保持原变更名不变，直接移入 archive/。
 */
export function archiveDestDirName(date, changeName) {
  return String(changeName)
}

/**
 * archive 完成校验：检查归档目录完整性
 *
 * context.specRoot（A4 同族）：平台模式下归档目录在 specRoot/changes/archive（gates.js /
 * machine-interface.js 调 runValidators 已透传 specRoot: platformOpts?.specRoot），此前硬编码
 * cwd/.sillyspec 平台模式恒报「归档目录缺失」。
 */
function validateArchiveOutputs(cwd, changeName, context = {}) {
  const specBase = context.specRoot || join(cwd, '.sillyspec')
  const archiveDir = join(specBase, 'changes', 'archive')
  const destDir = join(archiveDir, changeName)

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
function validateChangeClosed(cwd, changeName, context = {}) {
  const errors = []
  const warnings = []

  // context.specRoot：平台模式下变更目录在 specRoot/changes（同 validateArchiveOutputs）
  const specBase = context.specRoot || join(cwd, '.sillyspec')
  // 这里只做文件层面的检查，DB 检查在 run.js 里做
  const changeDir = join(specBase, 'changes', changeName)
  if (!existsSync(changeDir)) {
    errors.push(`变更目录不存在: ${changeDir}`)
    return { ok: false, errors, warnings }
  }

  // plan.md 存在性由引擎消费 manifest(source 区分 validateChangeClosed vs validateArchiveOutputs)
  const engineResult = evaluateRules('archive', { changeDir }, undefined, { source: 'validateChangeClosed' })
  return { ok: engineResult.errors.length === 0, errors: engineResult.errors, warnings: engineResult.warnings }
}

// ============ Execute 代码变更客观核验 ============

// QUAL-01 收口：本地 execFileSync 裸调（无 safe.directory）→ git-helper safeGit 统一入口，
// {ok,out,error} 适配语义与 timeout 15000 不变
function gitTry(dir, args) {
  const r = safeGit(dir, args, { timeout: 15000 })
  if (r.value !== null) return { ok: true, out: r.value }
  return { ok: false, out: '', error: r.error || 'git 执行失败' }
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
    // validateAcceptanceMatrix：探针 7 矩阵槽 fail-closed（2026-09-14-acceptance-test-matrix FR-02），
    // 注册进 validator 链即覆盖 gates / machine-interface 等全部 runValidators 调用方（gates.js 零改动）。
    // validatePassEligibility：PASS 封顶事实面（2026-09-17-pass-cap-semantics task-02 / D-001@v2 /
    // D-010）——注册即覆盖同上；回退 = 移除本注册行（纯加法，未触发四条件行为零变化）。
    // validateApiCoverageMatrix：接口验证覆盖矩阵对账门（2026-09-17-api-coverage-smoke task-05 /
    // FR-04~FR-06，与探针 7 并排互补的独立章节）——注册即覆盖同上；回退 = 移除本注册行（纯加法，
    // factsExpected=false / 无矩阵段的存量变更零行为）。
    validators: [validateVerifyOutputs, validateAcceptanceMatrix, validatePassEligibility, validateApiCoverageMatrix],
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
