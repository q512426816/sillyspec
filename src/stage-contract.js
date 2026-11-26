/**
 * StageContract — 阶段协议
 *
 * 每个阶段声明：允许的前置阶段、必须的产出、校验器、后续阶段。
 * CLI 不再相信 prompt 完成，completeStep 后必须过 validator。
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, basename, dirname } from 'path'
import { safeGit } from './git-helper.js'
import { nowWallClock } from './datetime.js'
import { resolveChangeRisk, extractExplicitRiskLevel } from './change-risk-profile.js'
import { loadBlastDeclarationsAllProjects } from './blast-surface.js'
import { parseFileChangeListDetailed } from './change-list.js'
import { SCAN_REQUIRED_DOCS, AUXILIARY_STAGES } from './constants.js'
import { evaluateRules } from './stage-contract-engine.js'
import { getRule } from './stage-contract-spec.js'
import { backfillFrontmatter } from './scan-postcheck.js'
import { parseAllowedPaths } from './stages/plan-postcheck.js'
// FR 索引消费（2026-09-18-fr-index-l1 L1）：重复嫌疑软门（advisory）——fr-index 是纯 fs+decision-distill
// 叶子链，静态引入无环；knowledge-hits 同为叶子。
import { parseChangeRequirements, resolveTouchedDomains, readActiveFrDigest, frTitleOverlap, FR_TITLE_OVERLAP_THRESHOLD } from './fr-index.js'
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
  const STAGES_REQUIRE_EXISTING_CHANGE = new Set(['plan', 'execute', 'archive'])
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
      // unmapped 过滤对齐 frDupGateFlow（2026-09-29-rot-retire-inject-cap）：停车场池不进
      // 跨域标题比对——原全量载入 723 条做 CPU 税且产出跨域误指认
      const domains = resolveTouchedDomains(changeDir, discoverModuleIndex(frKnowledgeRoot)).filter((d) => d !== 'unmapped')
      const active = readActiveFrDigest(frKnowledgeRoot, domains)
      if (active.length > 0) {
        for (const fr of req.frs) {
          if (fr.supersedes.length > 0 || !fr.title) continue
          let hit = null
          for (const a of active) {
            const o = frTitleOverlap(fr.title, a.title)
            if (!hit || o > hit.o) hit = { a, o }
          }
          if (hit && hit.o >= FR_TITLE_OVERLAP_THRESHOLD) {
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
    //    task-03 改声明面口径）── design --done 按「design 文件清单 × 项目声明危险面」预判一次
    //    （advisory 不作定论）。verify 阶段已退役（2026-11-26-verify-stage-retire）：集成证据门随
    //    阶段删除（D-007），判级保留的用途只剩驱动阶段评审仪式档（ceremony tier）。
    {
      const riskPreview = resolveChangeRiskForChangeDir(changeDir, context.specRoot || specRoot || join(cwd, '.sillyspec'))
      if (riskPreview.evidenceRequired && !riskPreview.explicit) {
        warnings.push(
          `[risk] 本次 design 声明文件面命中项目声明危险面（${riskPreview.hitPrefixes.join('、')}，evidence:true）——阶段评审仪式档按此判级定价（tier=${riskPreview.tier}）。` +
          `判级来源是 _module-map.yaml 顶层 blast 段（git 可见）；design frontmatter 可写 risk_level 显式压仪式档。`
        )
      }
      if (riskPreview.evidenceRequired && riskPreview.explicit) {
        warnings.push(
          `[risk] 声明文件面命中 evidence:true 危险面（${riskPreview.hitPrefixes.join('、')}），且 frontmatter 已显式 risk_level——显式声明压仪式档（tier=${riskPreview.tier}）。`
        )
      }
    }

    // ── 闭环收口 custom 判定（2026-09-29-brainstorm-closure-gates）──
    // doubt-closure：「自审存疑：」应用形态行须含闭合 token——只查带冒号的应用形态，裸词
    // 判定会撞 design-init 自审 checklist 模板行（含裸词）常驻误报。
    {
      const doubtRule = getRule('brainstorm.design.doubt-closure')
      const markerRe = new RegExp(doubtRule.data.markerPattern.pattern, doubtRule.data.markerPattern.flags)
      const closureRe = new RegExp(doubtRule.data.closureTokens.join('|'), 'i')
      for (const line of content.split(/\r?\n/)) {
        if (!markerRe.test(line) || closureRe.test(line)) continue
        warnings.push(doubtRule.failMessage.replaceAll('${line}', line.trim().slice(0, 60)))
      }
    }
    // risk-mitigation：风险登记表 R-xx 行的应对策略列（行末单元格）非空且非占位——design-init
    // 骨架预填「（待填应对策略）」命中即提醒填语义；「接受」显式接受是合法闭合（归属明确）。
    {
      const riskRule = getRule('brainstorm.design.risk-mitigation')
      const rowRe = new RegExp(riskRule.data.rowPattern.pattern, riskRule.data.rowPattern.flags)
      const cellPlaceholderRe = new RegExp(riskRule.data.placeholderCell, 'i')
      for (const line of content.split(/\r?\n/)) {
        const rowMatch = line.match(rowRe)
        if (!rowMatch) continue
        let cells = line.split('|').slice(1).map(c => c.trim())
        if (cells.length > 0 && cells[cells.length - 1] === '' && line.trimEnd().endsWith('|')) cells.pop()
        if (cells.length < 2) continue // 行形态不完整（仅编号列）——表结构问题交 Grill 审查，不在此硬判
        const lastCell = cells[cells.length - 1].replace(/^[（(]/, '').replace(/[）)]$/, '').trim()
        if (cellPlaceholderRe.test(lastCell)) {
          warnings.push(riskRule.failMessage.replaceAll('${id}', rowMatch[1]))
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
      // requirements 的 D 覆盖点名（2026-09-29-brainstorm-closure-gates）：prompt 一直要求
      // 「requirements.md 必须引用全部当前版本 D-xxx@vN，未覆盖的标注为剩余风险」，机器面原只盯
      // design.md——闭环收口补齐：裸号词边界匹配（同 warnMissingIds 语义），裸号出现在决策覆盖
      // 矩阵或「剩余风险」行都算归属（覆盖或显式登记=开口有主），不出现才点名。tasks 仍不强求
      // （骨架，plan 阶段展开——plan --done 的 id-traceability 已覆盖 plan.md 侧）。
      const requirementsForCoverage = readIfExists(join(changeDir, 'requirements.md'))
      if (requirementsForCoverage) {
        const reqUpper = requirementsForCoverage.toUpperCase()
        const coverageFail = getRule('brainstorm.requirements.decision-coverage').failMessage
        for (const id of decisionIds) {
          const base = id.replace(/@V\d+$/, '')
          if (!new RegExp(`\\b${base}\\b`).test(reqUpper)) {
            warnings.push(coverageFail.replaceAll('${id}', id))
          }
        }
      }
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
const mainFlowStages = ['brainstorm', 'plan', 'execute']

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
    allowedTo: ['archive'],   // verify 已退役（2026-11-26-verify-stage-retire）
    validators: [validateExecuteOutputs],
  },
  archive: {
    stage: 'archive',
    description: '归档与收口',
    allowedFrom: ['execute'],  // verify 已退役
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

  // 出生未入门态（2026-09-27-change-birth-stage-brainstorm）：出生阶段自 'scan'（auxiliary）改
  // 'brainstorm' 后，「辅助→主流程任意放行」不再天然覆盖出生态——但 thin/quick、backfill、
  // complete-step 等大量路径从出生态直接 run 目标阶段（旧 scan 出生全都放行）。等价语义：
  // brainstorm 仍 pending/无 stages 行（从未真正进入主流程）视同辅助态；真在 brainstorm 中
  // （in-progress/completed）仍受主流程守卫约束。
  const fromBirthUntouched = fromStage === 'brainstorm'
    && (!fromStageData || !fromStageData.status || fromStageData.status === 'pending')

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

  // archive 特殊处理：从 execute 来的允许（2026-11-26-verify-stage-retire：verify 阶段已退役，
  // execute completed 是新的直接前置），从其他主流程阶段来的需要校验
  if (toStage === 'archive') {
    if (fromStage === 'execute') {
      return { allowed: true }
    }
    // 独立运行 archive（无前置）也允许；出生未入门态同放行（旧 scan 出生态等价——
    // thin/quick 从未进主流程的变更直接归档走此路）
    if (!fromStage || AUXILIARY_STAGES.includes(fromStage) || fromBirthUntouched) {
      return { allowed: true }
    }
    return { allowed: false, reason: 'archive 的前置阶段是 execute（verify 已退役），不能从 ' + fromStage + ' 跳转' }
  }

  // 从辅助阶段进入主流程：允许（出生未入门态同——见函数头注释）
  if (AUXILIARY_STAGES.includes(fromStage) || fromBirthUntouched) {
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
