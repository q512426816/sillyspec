/**
 * stage-contract-spec.js — 阶段产物契约的单一真相源(manifest)
 *
 * 把散落在 stage-contract.js / *-postcheck.js / change-risk-profile.js / complete.js 等处的
 * 「产物字面机械校验规则」集中成结构化数据。validators 通过 stage-contract-engine.js 的
 * evaluateRules 消费它做判定(同源);prompt 通过 renderStageContract 渲染它给 agent 事前预览
 * (同源)。事前给的 == 事后查的,杜绝"prompt 说 A、CLI 查 B"。
 *
 * 规则对象 schema:
 *   id          稳定唯一标识(点分:<stage>.<file>.<aspect>),供测试/prompt 引用
 *   stage       所属阶段
 *   source      来源 validator 函数名(溯源;引擎可按 source 过滤,便于灰度迁移)
 *   severity    'error' | 'warning'
 *   kind        判定类型(见下方 KIND 语义;纯 kind 引擎 dispatch,custom kind 引擎 skip 留 validator)
 *   target      { root: 'change'|'docs'|'archive'|'specBase', path, scope?: 'full'|'head'|'fm' }
 *               root 解析基目录(change=ctx.changeDir / docs=ctx.docsRoot / archive=ctx.archiveDir /
 *               specBase=ctx.specBase);scope 仅文本类:full=全文 / head=前 512 字节 / fm=frontmatter
 *   data        kind 相关判定数据(literals/pattern/flags/sections/fields/min...)
 *   spec        给 agent 看的人类可读契约(renderStageContract 拼到 prompt)
 *   failMessage 失败报错(逐字 == 现有报错文案;支持 ${path} 占位 → 引擎替换为解析后的绝对路径)
 *   hint?       可选出路提示(renderStageContract 附在 spec 后)
 *   enabled?    默认 true,置 false 灰度停用
 *
 * 纯 kind(stage-contract-engine.dispatchPure 直接判定):
 *   file-exists / dir-exists / literal-any / literal-all / regex / contains-section /
 *   no-placeholder-line / field-present / header-field / list-non-empty / min-lines / dir-non-empty
 *   —— 语义:若 target 文件不存在,内容类规则(literal-any、literal-all、regex、contains-section、…、list-non-empty、
 *   min-lines)自动 skip(不报错,存在性由独立的 file-exists 规则保证);file-exists/dir-exists
 *   则是"不存在即 fail"。
 *
 * custom kind(引擎 skip,validator 保留判定算法,但 import 本 manifest 的 data + failMessage):
 *   见 CUSTOM_KINDS。这些是复杂条件校验(lifecycle 多层豁免 / 入口接线多步对账 / decisions 解析 /
 *   cross-task 对账 / id 连续性 / verify 结论门控 / 集成证据 / 风险门控),声明式表达风险高,故保留算法。
 */
import { hasAllSections, hasNoPlaceholderLine, lineCount, meetsMinLines, missingSections, placeholderLineMatches } from './check-primitives.js'
import { SCAN_REQUIRED_DOCS } from './constants.js'

// custom kind 集合:判定算法留在各 validator(复杂条件),引擎跳过不计入 errors/warnings。
export const CUSTOM_KINDS = new Set([
  'lifecycle-exemption',     // design.md 生命周期关键词触发 + 多层豁免(validateBrainstormOutputs)
  'entry-point-wiring',      // design.md 入口实例化 → task allowed_paths 覆盖对账(validatePlanOutputs)
  'id-traceability',         // FR/D 引用追踪(extractIds / warnMissingIds)
  'decision-blocker',        // decisions.md P0/P1 未决阻塞(parseDecisionRecords)
  'cross-task-contract',     // task 卡片 provides/expects_from 对账(plan-postcheck)
  'design-file-coverage',    // design.md 文件清单 vs allowed_paths 覆盖(plan-postcheck)
  'task-id-continuity',      // task-NN id 连续性
  'verify-conclusion-gate',  // verify-result.md 结论 PASS/FAIL 门控
  'integration-evidence',    // verify-result.md 集成证据(change-risk-profile.checkIntegrationEvidence)
  'change-risk-gate',        // 变更风险分级门控(detectChangeRisk)
])

export function isCustomKind(kind) {
  return CUSTOM_KINDS.has(kind)
}

// ============ 规则数据 ============
// 分批填充:当前含 brainstorm 纯规则(Batch 1 样板)。其余 stage 规则与 custom kind 在
// Batch 2/3 迁入。getRulesFor / renderStageContract 自动覆盖全部已声明规则,无需改它们。

// ── brainstorm ──
const BRAINSTORM_RULES = [
  // 四件套文件存在(error)—— 逐字对齐 stage-contract.js validateBrainstormOutputs requiredFiles 循环
  {
    id: 'brainstorm.design.exists',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'design.md' },
    data: {},
    spec: '产出 `design.md`(四件套之一;brainstorm 四件套齐全才能完成)',
    failMessage: 'brainstorm 产物缺失: ${path}',
  },
  {
    id: 'brainstorm.proposal.exists',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'proposal.md' },
    data: {},
    spec: '产出 `proposal.md`(四件套之一)',
    failMessage: 'brainstorm 产物缺失: ${path}',
  },
  {
    id: 'brainstorm.requirements.exists',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'requirements.md' },
    data: {},
    spec: '产出 `requirements.md`(四件套之一)',
    failMessage: 'brainstorm 产物缺失: ${path}',
  },
  {
    id: 'brainstorm.tasks.exists',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'tasks.md' },
    data: {},
    spec: '产出 `tasks.md`(四件套之一)',
    failMessage: 'brainstorm 产物缺失: ${path}',
  },
  // 内容章节(warning)—— 逐字对齐 validateBrainstormOutputs 内容校验段
  {
    id: 'brainstorm.proposal.non-goals',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'warning', kind: 'literal-any',
    target: { root: 'change', path: 'proposal.md', scope: 'full' },
    data: { literals: ['不在范围内', 'Non-Goals', '非目标'] },
    spec: 'proposal.md 含「不在范围内 / Non-Goals / 非目标」之一(字面命中,标明本变更不做的事)',
    failMessage: 'proposal.md 缺少「不在范围内/Non-Goals」章节',
  },
  {
    id: 'brainstorm.requirements.fr-id',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'warning', kind: 'regex',
    target: { root: 'change', path: 'requirements.md', scope: 'full' },
    data: { pattern: 'FR-\\d+', flags: 'i' },
    spec: 'requirements.md 含 `FR-<数字>` 编号的需求项(如 FR-01;「FR 01」「FR_01」不被识别)',
    failMessage: 'requirements.md 缺少 FR 编号的需求项(需字面命中 FR-<数字>,如 FR-01;「FR 01」「FR_01」不被识别)',
  },
  {
    id: 'brainstorm.design.file-change-list',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'warning', kind: 'literal-any',
    target: { root: 'change', path: 'design.md', scope: 'full' },
    data: { literals: ['文件变更清单', 'File Changes', '文件清单'] },
    spec: 'design.md 含「文件变更清单 / File Changes / 文件清单」之一(字面命中,列出本次新增/修改/删除的源码文件)',
    failMessage: 'design.md 缺少「文件变更清单」章节(需字面命中其一:文件变更清单 / File Changes / 文件清单)',
  },
  {
    id: 'brainstorm.design.risk-register',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'warning', kind: 'literal-any',
    target: { root: 'change', path: 'design.md', scope: 'full' },
    data: { literals: ['风险登记', 'Risk', '风险'] },
    spec: 'design.md 含「风险登记 / Risk / 风险」之一(字面命中)',
    failMessage: 'design.md 缺少「风险登记」章节(需字面命中其一:风险登记 / Risk / 风险)',
  },
  {
    id: 'brainstorm.design.self-review',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'warning', kind: 'literal-any',
    target: { root: 'change', path: 'design.md', scope: 'full' },
    data: { literals: ['自审', 'Self-Review', 'Self-review'] },
    spec: 'design.md 含「自审 / Self-Review / Self-review」之一(字面命中;「自我审查」不被识别)',
    failMessage: 'design.md 缺少「自审」章节(需字面命中其一:自审 / Self-Review / Self-review;「自我审查」不被识别)',
  },
  {
    id: 'brainstorm.tasks.list-items',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'warning', kind: 'list-non-empty',
    target: { root: 'change', path: 'tasks.md', scope: 'full' },
    data: {},
    spec: 'tasks.md 至少有一个任务列表项(行首 `-` / `*` / `数字.`)',
    failMessage: 'tasks.md 没有任务列表项',
  },
  // lifecycle(custom kind):design.md 命中生命周期关键词时必须含契约表或紧邻豁免。判定算法留 validator
  // (trigger/exemption/table 三段短路),data + failMessage/exemptionPassedMessage 从本 manifest 同源。
  {
    id: 'brainstorm.design.lifecycle-table',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'error', kind: 'lifecycle-exemption',
    target: { root: 'change', path: 'design.md', scope: 'full' },
    data: {
      trigger: { pattern: '\\b(session|lease|agent[._-]?run|daemon|lifecycle|state[._-]?transition|claim|heartbeat)\\b', flags: 'i' },
      exemptions: [
        { pattern: '(?:不涉及|不适用|未涉及|不包含|没有(?:任何)?)\\s?(?:任何\\s?)?(?:生命周期(?:契约)?|lifecycle(?:[ _=-]?contract)?)', flags: 'i' },
        { pattern: '(?:生命周期(?:契约)?|lifecycle(?:[ _=-]?contract)?)\\s?[：:=]\\s?(?:不涉及|不适用|未涉及|无|n\\/?a\\b|not[ _=-]?applicable|none\\b)', flags: 'i' },
        { pattern: '(?:does[ _-]?not[ _-]?involve|not[ _=-]?applicable)[^\\n]{0,15}lifecycle', flags: 'i' },
      ],
      table: [
        { pattern: '生命周期契约表|lifecycle[._-]?contract|lifecycle[._-]?matrix|Lifecycle Contract', flags: 'i' },
        { pattern: '事件.*发起方.*接收方.*必需字段.*状态变化', flags: '' },
      ],
    },
    spec: 'design.md 命中生命周期关键词(session/lease/agent_run/daemon/lifecycle/state_transition/claim/heartbeat 任一)时,必须含「生命周期契约表」(事件×发起方×接收方×必需字段×状态变化 矩阵),或在紧邻位置写明豁免短语:「不涉及生命周期契约」「不适用 lifecycle contract」「生命周期契约:无/N/A」。注意:宽写法如「lifecycle 状态无变化」「本变更无需 lifecycle 事件」不被识别——否定词必须紧邻「生命周期契约/lifecycle contract」。',
    failMessage: 'design.md 命中生命周期关键词（session/lease/agent_run/daemon/lifecycle/state_transition/claim/heartbeat 任一）但缺少「生命周期契约表」。\n   出路（二选一）：\n   ① 补一个「生命周期契约表」——事件×发起方×接收方×必需字段×状态变化 的矩阵；\n   ② 若确实不涉及，在 design.md 写**紧邻**的豁免短语才算数：「不涉及生命周期契约」「不适用 lifecycle contract」或「生命周期契约：无/N/A」。\n      注意：「本变更无需 lifecycle 事件」「lifecycle 状态无变化」这类宽写法**不被识别**——否定词必须紧邻「生命周期契约/lifecycle contract」。',
    exemptionPassedMessage: 'design.md 显式声明不涉及生命周期契约 — 已豁免「生命周期契约表」要求',
  },
  // decisions 阻塞 / id-traceability 为 custom kind,后续迁入(算法保留,数据/文案 import 本 manifest)
]

// ── scan ──
// 7 份 scan 文档存在性(error)—— 与 constants.SCAN_REQUIRED_DOCS 单源(scan-postcheck 也引用同一常量)
const SCAN_RULES = SCAN_REQUIRED_DOCS.map(doc => ({
  id: `scan.docs.${doc.toLowerCase().replace(/\.md$/, '')}.exists`,
  stage: 'scan', source: 'validateScanOutputs', severity: 'error', kind: 'file-exists',
  target: { root: 'docs', path: doc },
  data: {},
  spec: `产出 scan 文档 \`${doc}\`(7 份必需 scan 文档之一,缺失即阻断)`,
  failMessage: 'scan 文档缺失: ${path}',
}))
// 注:modules 目录非空检查保留在 validateScanOutputs 内联(两种文案"不存在/为空",单 failMessage 表达不了)

// ── verify ──
// 核心文档存在性(error)。decisions 阻塞 / FAIL 门控 / Change Risk Gate 为 custom kind(Batch 3 迁入)
const VERIFY_RULES = [
  {
    id: 'verify.verify-result.exists',
    stage: 'verify', source: 'validateVerifyOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'verify-result.md' },
    data: {},
    spec: '产出 `verify-result.md`(verify 阶段必须产出验证报告才能完成——不存在则不能完成,防"假完成")',
    failMessage: 'verify-result.md 不存在 — verify 阶段必须产出验证报告才能完成（${path}）',
  },
  {
    id: 'verify.design.exists',
    stage: 'verify', source: 'validateVerifyOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'design.md' },
    data: {},
    spec: '`design.md` 仍存在(核心文档,verify 时确认未丢失)',
    failMessage: '核心文档缺失: ${path}',
  },
  {
    id: 'verify.plan.exists',
    stage: 'verify', source: 'validateVerifyOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'plan.md' },
    data: {},
    spec: '`plan.md` 仍存在(核心文档,verify 时确认未丢失)',
    failMessage: '核心文档缺失: ${path}',
  },
  // verify-conclusion-gate(custom):结论 FAIL 门控。算法 extractVerifyConclusion 留 validator,
  // failMessage / noConclusionWarning 从 manifest 同源。
  {
    id: 'verify.conclusion.fail-gate',
    stage: 'verify', source: 'validateVerifyOutputs', severity: 'error', kind: 'verify-conclusion-gate',
    target: { root: 'change', path: 'verify-result.md', scope: 'full' },
    data: {},
    spec: 'verify-result.md 结论不得为 FAIL(FAIL 阻断 verify 完成)。结论在含「结论/Conclusion/Result/结果」的二级标题后,值为 PASS / PASS WITH NOTES / FAIL。',
    failMessage: 'verify-result.md 结论为 FAIL — 验证未通过，不能标记 verify 完成；请修复后重新运行验证',
    noConclusionWarning: 'verify-result.md 未识别到结论章节（含 结论/Conclusion/Result/结果 的二级标题，后跟 PASS / PASS WITH NOTES / FAIL）',
  },
]

// ── plan ──
// plan.md 存在性(error)。entryPoint 接线 / FR-D id-trace / decisions 阻塞为 custom kind(Batch 3 迁入)
const PLAN_RULES = [
  {
    id: 'plan.plan.exists', stage: 'plan', source: 'validatePlanOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'plan.md' },
    data: {},
    spec: '产出 `plan.md`(任务拆解与规划,缺失即阻断)',
    failMessage: 'plan.md 缺失: ${path}',
  },
]

// ── archive ──
// 归档目录文档完整性。validateArchiveOutputs(归档后)与 validateChangeClosed(归档前置)同 stage='archive',
// 用 evaluateRules opts.source 区分。failMessage 用文件名(非路径),逐字对齐旧文案。
const ARCHIVE_RULES = [
  {
    id: 'archive.plan.exists', stage: 'archive', source: 'validateArchiveOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'archive', path: 'plan.md' },
    data: {},
    spec: '归档目录含 `plan.md`(核心文档,归档必备)',
    failMessage: '归档目录缺失核心文档: plan.md',
  },
  {
    id: 'archive.design.exists', stage: 'archive', source: 'validateArchiveOutputs', severity: 'warning', kind: 'file-exists',
    target: { root: 'archive', path: 'design.md' },
    data: {},
    spec: '归档目录含 `design.md`(推荐文档)',
    failMessage: '归档目录缺少推荐文档: design.md',
  },
  {
    id: 'archive.module-impact.exists', stage: 'archive', source: 'validateArchiveOutputs', severity: 'warning', kind: 'file-exists',
    target: { root: 'archive', path: 'module-impact.md' },
    data: {},
    spec: '归档目录含 `module-impact.md`(推荐文档)',
    failMessage: '归档目录缺少推荐文档: module-impact.md',
  },
]

const CHANGE_CLOSED_RULES = [
  {
    id: 'archive-change-closed.plan.exists', stage: 'archive', source: 'validateChangeClosed', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'plan.md' },
    data: {},
    spec: '`plan.md` 存在(archive 前置校验:plan 阶段已完成)',
    failMessage: 'plan.md 缺失 — 请确保 plan 阶段已完成',
  },
]

// 跨 stage 共用的 custom kind(brainstorm/plan/verify 都校验 decisions.md P0/P1 阻塞)。
// stage='shared':getRulesFor(stage) 不返回(不污染各 stage prompt 契约),validator 用 getRule(id)
// 取 failMessage 同源。${issue} 占位由 validator replace 为具体 decision issue 串。
const SHARED_RULES = [
  {
    id: 'shared.decision-blocker', stage: 'shared', source: 'findBlockingDecisionIssues', severity: 'error', kind: 'decision-blocker',
    target: { root: 'change', path: 'decisions.md', scope: 'full' },
    data: {},
    spec: 'decisions.md 不得有 P0/P1 未决阻塞(status=unresolved/blocking 且 priority=P0/P1)。解法:把 status 改为 accepted,或降级 priority 到 P2,或标 superseded,补齐 answer/decision 字段后即视为已决。',
    failMessage: 'decisions.md 存在 P0/P1 未决阻塞: ${issue} — 解法：把该决策 status 改为 accepted（或降级 priority 到 P2 / 标 superseded），补齐 answer/decision 字段后即视为已决',
  },
  {
    id: 'shared.id-traceability', stage: 'shared', source: 'warnMissingIds', severity: 'warning', kind: 'id-traceability',
    target: {}, data: {},
    spec: '产物必须引用上游 ID:plan.md 引用 requirements.md 的 FR + decisions.md 的 D;verify-result.md 引用 decisions.md 的 D(剥 @vN 版本后缀按基号词边界匹配,大小写不敏感)。',
    failMessage: '${target} 未引用 ${source} 中的 ${id}',
  },
]

const RULES = [
  ...BRAINSTORM_RULES,
  ...SCAN_RULES,
  ...VERIFY_RULES,
  ...PLAN_RULES,
  ...ARCHIVE_RULES,
  ...CHANGE_CLOSED_RULES,
  ...SHARED_RULES,
  // QUICK_RULES / 散落字面校验:Batch 2 后续 / Batch 3 迁入
]

// ============ 查询 API ============

/** 取某 stage 的全部启用规则(可按 source 过滤,便于灰度迁移某 validator)。 */
export function getRulesFor(stage, opts = {}) {
  return RULES.filter(r =>
    r.stage === stage &&
    r.enabled !== false &&
    (!opts.source || r.source === opts.source)
  )
}

/** 按 id 取单条规则(custom validator 用它拿 data/failMessage)。 */
export function getRule(id) {
  return RULES.find(r => r.id === id) || null
}

/** 全部规则(调试/测试用)。 */
export function getAllRules() {
  return RULES.slice()
}

// ============ Prompt 渲染(事前契约) ============

/**
 * 把某 stage 的全部规则渲染成 markdown「完成契约」段落,供 prompt 注入(事前让 agent 看到精确通过条件)。
 * 只渲染 spec(给 agent 看的契约),不渲染 failMessage 全文(省 token);按 severity 分组。
 * 调用方:src/run/prompt.js outputStep 的 {STAGE_CONTRACT} 占位符替换。
 */
export function renderStageContract(stage) {
  const rules = getRulesFor(stage)
  if (rules.length === 0) return ''
  const errors = rules.filter(r => r.severity === 'error')
  const warnings = rules.filter(r => r.severity === 'warning')
  const lines = []
  lines.push('## 完成契约(CLI 将机械校验,以下为精确通过条件)')
  lines.push('')
  lines.push('> 这些条件与 CLI 完成校验严格同源(事前给的 == 事后查的)。满足即可通过;缺失 error 项阻断完成,缺失 warning 项记警告不阻断。')
  lines.push('')
  if (errors.length) {
    lines.push('### 必须满足(缺失即阻断完成)')
    for (const r of errors) {
      lines.push(`- **[${r.id}]** ${r.spec}`)
      if (r.hint) lines.push(`  - 出路:${r.hint}`)
    }
    lines.push('')
  }
  if (warnings.length) {
    lines.push('### 建议满足(缺失记警告,不阻断)')
    for (const r of warnings) {
      lines.push(`- **[${r.id}]** ${r.spec}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

export { hasAllSections, hasNoPlaceholderLine, lineCount, meetsMinLines, missingSections, placeholderLineMatches }
