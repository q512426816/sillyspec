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
 *   condition?  可选条件对象 { ctxField, ne|eq };不满足时规则跳过(同 enabled=false)。
 *               供「仅在特定上下文生效」的规则,如 brainstorm proposal/requirements/tasks 仅 scale≠small 时必需
 *               (小变更只产 design.md)。判定见 stage-contract-engine.js conditionHolds(fail-safe:ctx 字段缺失时 ne 成立)。
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
  'design-readiness',        // design.md 进入 plan 前的章节就绪检查(validateDesignForPlan)
  'task-card-fields',        // task-NN.md 卡片字段存在性(validateBlueprintConsistency + validatePlanFeasibility)
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
    spec: '产出 `design.md`(brainstorm 必产;scale=small 时这是唯一必需产物,proposal/requirements/tasks 豁免)',
    failMessage: 'brainstorm 产物缺失: ${path}',
  },
  {
    id: 'brainstorm.proposal.exists',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'proposal.md' },
    data: {},
    // scale=small(小变更)豁免:brainstorm 末步指引 small 只产 design.md 后转 quick,四件套不全不应阻断
    condition: { ctxField: 'scale', ne: 'small' },
    spec: '产出 `proposal.md`(四件套之一;scale=small 时豁免——小变更只需 design.md)',
    failMessage: 'brainstorm 产物缺失: ${path}',
  },
  {
    id: 'brainstorm.requirements.exists',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'requirements.md' },
    data: {},
    condition: { ctxField: 'scale', ne: 'small' },
    spec: '产出 `requirements.md`(四件套之一;scale=small 时豁免——小变更只需 design.md)',
    failMessage: 'brainstorm 产物缺失: ${path}',
  },
  {
    id: 'brainstorm.tasks.exists',
    stage: 'brainstorm', source: 'validateBrainstormOutputs', severity: 'error', kind: 'file-exists',
    target: { root: 'change', path: 'tasks.md' },
    data: {},
    condition: { ctxField: 'scale', ne: 'small' },
    spec: '产出 `tasks.md`(四件套之一;scale=small 时豁免——小变更只需 design.md)',
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
  // integration-evidence(custom,D10 事前契约):风险门控。判定算法 detectChangeRisk +
  // checkIntegrationEvidence 留 change-risk-profile.js(需运行时读 design/plan 内容,引擎无法纯判定);
  // 此处只作事前提示——renderStageContract 把 spec/hint 注入 verify step0,让 agent 写 verify-result.md
  // 前就知道:若 design/plan 命中部署/启动或跨进程关键词,必须提供对应字面证据,否则完成时被门控阻断。
  // (历史教训:agent 闷头写完 verify-result.md 才发现缺「真实启动」证据,撞墙不知缺哪一项。)
  {
    id: 'verify.integration-evidence',
    stage: 'verify', source: 'validateVerifyOutputs', severity: 'error', kind: 'integration-evidence',
    target: { root: 'change', path: 'verify-result.md', scope: 'full' },
    data: {},
    spec: [
      '集成/部署证据门控(仅当 design.md / plan.md 命中以下关键词时触发;命中即阻断完成,直到 verify-result.md 含对应字面证据):',
      '- 命中启动入口(cli.ts / main.ts / server.(js|ts) / bootstrap / entrypoint)→ 部署级:须「真实启动一次本变更触及的入口」,字面命中其一:启动…一次 / 实际…启动 / real startup / docker up / npm start / node server。',
      '- 命中跨进程/状态机(daemon / backend / session / lease / lifecycle / heartbeat)→ 集成级:须「真实 daemon↔backend 集成(非 mock 单测)」,字面命中其一:端到端 / integration test / e2e test / 真实集成 / runtime evidence;并补 Runtime Evidence 章节 + 日志片段。',
      '- 单元测试结论(verify 必做,无论风险级):写明测试套件与结果。',
    ].join('\n'),
    // 运行时门控按 changeRiskProfile 动态拼详细报错(见 stage-contract.js validateVerifyOutputs);
    // 此 failMessage 为单行摘要,满足「每规则声明 failMessage」契约 + 概括阻断原因。
    failMessage: '[integration/deployment-critical] 验证结论为 PASS 但缺少真实集成证据(真实启动本变更触及的入口 / 真实 daemon↔backend 集成 / Runtime Evidence)。需在 verify-result.md 如实补全对应字面证据,或如实改结论 FAIL。',
    hint: [
      '① 先看你的 design.md / plan.md 是否提到上述关键词——是就按对应级别补证据。',
      '② 「真实启动」必须是本变更实际改动的那一类入口(服务入口/CLI 主入口/守护进程),不能拿无关进程的启动凑数。',
      '③ 风险判级按 design/plan 措辞,若属误判可在 design 中如实缩小范围;但危险链路该有真实启动证据,不建议为绕门控而规避。',
    ].join(' '),
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
  // entry-point-wiring(custom):design.md 命中入口实例化/启动路径模式时,被提到的入口文件
  // (cli.ts/main.ts/server.(js|ts)/index.(js|ts))必须出现在某 task allowed_paths 或 plan.md
  // 文件变更清单中,否则需 design.md 紧邻写明豁免。判定算法(多源 allowed_paths 收集 + 逐文件对账 +
  // 豁免)留 validatePlanOutputs;trigger/file 抽取/exemption/failMessage 从本 manifest 同源。
  {
    id: 'plan.entry-point-wiring', stage: 'plan', source: 'validatePlanOutputs', severity: 'error', kind: 'entry-point-wiring',
    target: { root: 'change', path: 'design.md', scope: 'full' },
    data: {
      entryPointPatterns: [
        { pattern: '\\b(cli\\.ts|main\\.ts|server\\.(?:js|ts)|index\\.(?:js|ts))\\b.*\\b(?:实例化|instantiate|构造|new\\s)', flags: 'gi' },
        { pattern: '\\bnew\\s+(Daemon|SessionManager|App|Server|Application)\\b', flags: 'gi' },
        { pattern: '\\b(?:在|from)\\s+[\'"]?(cli\\.ts|main\\.ts|server\\.(?:js|ts)|index\\.(?:js|ts))[\'"]?', flags: 'gi' },
        { pattern: '\\b(?:注入|inject)\\b.*\\b(?:构造|constructor|初始化|init|实例化|instantiate)\\b', flags: 'gi' },
        { pattern: '\\b(?:启动路径|startup|entrypoint|bootstrap|daemon[._-]?start|main.*entry)\\b', flags: 'gi' },
      ],
      fileExtractionPattern: { pattern: '\\b(cli\\.ts|main\\.ts|server\\.(?:js|ts)|index\\.(?:js|ts))\\b', flags: 'i' },
      exemptionPattern: '不需要改.*${file}|${file}.*不需要|不修改.*${file}|${file}.*不变|${file}.*no.?change',
    },
    spec: 'design.md 提到入口文件(cli.ts/main.ts/server.(js|ts)/index.(js|ts))并伴实例化/注入/启动路径关键词(如 new Daemon、startup/entrypoint/bootstrap/daemon_start、注入构造)时,每个被提到的入口文件必须出现在某个 task 的 allowed_paths 或 plan.md 文件变更清单中;若确实不改,需在 design.md 紧邻写明「<文件> 不需要/不变/无需修改」类表述才豁免。',
    failMessage: '生产接线路径矛盾: design.md 提到了入口文件 "${file}"，但没有任何 task 的 allowed_paths（或 plan.md 文件变更清单）包含它。\n   出路（二选一）：\n   ① 若该入口文件确实要改 → 在某个 task 的 allowed_paths 加上 "${file}"；\n   ② 若确实不需要改 → 在 design.md 明确写明理由，且需包含 "${file} 不需要/不变/无需修改" 这类紧邻表述才会被识别为豁免。\n   触发原因：design.md 命中入口实例化/启动路径模式（如 cli.ts|main.ts|server.(js|ts)|index.(js|ts) + new/实例化/注入，或 startup|entrypoint|bootstrap|daemon_start）。',
  },
  // cross-task-contract(custom):consumer.expects_from ↔ provider.provides 对账。3 种断裂文案
  // (unknown-provider / undeclared / missing-fields)进 data,算法(两遍扫描+字段集合对账)留
  // validateCrossTaskContracts。${consumer}/${provider}/${contract}/${needs}/${available} replaceAll。
  {
    id: 'plan.cross-task-contract', stage: 'plan', source: 'validateCrossTaskContracts', severity: 'error', kind: 'cross-task-contract',
    target: { root: 'change', path: 'tasks' },
    data: {
      messageUnknownProvider: '${consumer}: expects_from 引用了不存在的 ${provider}（contract "${contract}", needs [${needs}]）',
      messageUndeclaredContract: '${consumer}: expects_from ${provider} contract "${contract}" needs [${needs}] — ${provider} 的 provides 未声明此契约',
      messageMissingFields: '${consumer}: expects_from ${provider} contract "${contract}" needs [${needs}] — ${provider}.provides 仅含 [${available}]',
    },
    spec: 'task 卡片 frontmatter 的 expects_from 必须被对应 provider task 的 provides 覆盖:consumer 期望的每个契约及其字段,provider 的 provides 必须已声明且字段齐全。三种断裂均阻断——引用了不存在的 provider task、provider 未声明该契约、provider provides 字段不全(字段级对账避免到 execute/verify 才暴露成 403/500)。',
    failMessage: '${consumer}: expects_from ${provider} contract "${contract}" needs [${needs}] — ${provider}.provides 仅含 [${available}]',
  },
  // design-file-coverage(custom):design.md 文件变更清单 vs tasks allowed_paths 覆盖对账。
  // 算法(parseFileChangeList + pathMatches 容差匹配)留 validateDesignFileCoverage;两种断裂文案
  // (缺清单章节 / 文件未覆盖)进 data。${count}/${files} replaceAll(${files} 为 • 逐行列表,validator 拼)。
  {
    id: 'plan.design-file-coverage', stage: 'plan', source: 'validateDesignFileCoverage', severity: 'error', kind: 'design-file-coverage',
    target: { root: 'change', path: 'design.md', scope: 'full' },
    data: {
      messageMissingList: 'design.md 缺少「文件变更清单」章节（或清单解析为空），无法做文件覆盖对账。该章节在 brainstorm 模板中为必填；请在 design.md 补上完整的文件变更清单（列出本次新增/修改/删除的源码文件）后重试。',
      messageUncovered: 'design.md 文件变更清单中 ${count} 个文件未被任何 task 的 allowed_paths 覆盖：\n${files}\n   这些文件在 execute 阶段将无 task 有权修改 → 必然漏改。\n   修复：为每个遗漏文件新建/补充 task 并在其 allowed_paths 声明，或在 design.md「不修改文件」章节说明不改原因。',
    },
    spec: 'design.md「文件变更清单」中的每个源码文件,必须被至少一个 task 的 allowed_paths 覆盖(前缀/glob 容差匹配),否则 execute 子代理无权改它→必然漏改。有 task 卡片但 design 缺「文件变更清单」章节也阻断(清单是覆盖对账的基准)。',
    failMessage: 'design.md 文件变更清单中 ${count} 个文件未被任何 task 的 allowed_paths 覆盖：\n${files}\n   这些文件在 execute 阶段将无 task 有权修改 → 必然漏改。\n   修复：为每个遗漏文件新建/补充 task 并在其 allowed_paths 声明，或在 design.md「不修改文件」章节说明不改原因。',
  },
  // task-id-continuity(custom):task-NN id 从 task-01 起连续。算法留 validatePlanFeasibility。
  // ${expected}/${actual} replaceAll(零填充 2 位)。
  {
    id: 'plan.task-id-continuity', stage: 'plan', source: 'validatePlanFeasibility', severity: 'error', kind: 'task-id-continuity',
    target: { root: 'change', path: 'tasks' },
    data: {},
    spec: 'task 卡片 id 从 task-01 起连续递增(不跳号,如 task-01/task-02/task-03),否则阻断。',
    failMessage: 'task id 不连续: 期望 task-${expected}, 实际 task-${actual}',
  },
  // design-readiness(custom):design.md 进入 plan 前的章节就绪检查(6 章节)。patterns 数组任一
  // 命中即视为有该章节;severity 分 error/warning。算法(逐章节 test)留 validateDesignForPlan,
  // checks/patterns/message 从本 manifest 同源。
  {
    id: 'plan.design-readiness', stage: 'plan', source: 'validateDesignForPlan', severity: 'error', kind: 'design-readiness',
    target: { root: 'change', path: 'design.md', scope: 'full' },
    data: {
      emptyMessage: 'design.md 内容为空',
      checks: [
        { id: 'goal', severity: 'error', patterns: [{ pattern: '(^|\\n)#{2,}\\s*.*(目标|goal|objective|背景|background|问题|problem|purpose|目的)', flags: 'i' }], message: 'design.md 缺少「目标/背景/问题描述」章节 — plan 需要知道要达成什么' },
        { id: 'scope', severity: 'error', patterns: [{ pattern: '(^|\\n)#{2,}\\s*.*(范围|scope|总体方案|方案|approach|solution|设计|design)', flags: 'i' }], message: 'design.md 缺少「范围/总体方案/设计」章节 — plan 需要知道做什么和怎么做' },
        { id: 'decisions', severity: 'error', patterns: [
          { pattern: '(^|\\n)#{2,}\\s*.*(决策|decision|选择|choice|方案选择)', flags: 'i' },
          { pattern: 'd-\\d+@v\\d+', flags: 'i' },
          { pattern: 'decisions?\\.md', flags: 'i' },
        ], message: 'design.md 缺少「决策/方案选择」— plan 需要基于明确的技术决策来拆分任务' },
        { id: 'non-goals', severity: 'warning', patterns: [{ pattern: '(^|\\n)#{2,}\\s*.*(非目标|non-goals?|不做|out of scope|不在范围)', flags: 'i' }], message: 'design.md 缺少「非目标/Non-goals」— 建议明确不做什么，防止 scope creep' },
        { id: 'constraints', severity: 'warning', patterns: [{ pattern: '(^|\\n)#{2,}\\s*.*(约束|constraint|限制|limitation|风险|risk|trade-?off)', flags: 'i' }], message: 'design.md 缺少「约束/风险/Trade-off」— 建议记录已知约束和风险' },
        { id: 'file-changes', severity: 'warning', patterns: [
          { pattern: '文件变更|file change|变更清单|changed files', flags: 'i' },
          { pattern: '^\\|\\s*(新增|修改|删除|new|modify|delete|update)\\s*\\|', flags: 'im' },
        ], message: 'design.md 缺少「文件变更清单」— 建议列出预期改动的文件' },
      ],
    },
    spec: 'design.md 进入 plan 前的章节就绪检查:必须含「目标/背景/问题描述」「范围/总体方案/设计」「决策/方案选择」(或引用 D-XX@vN / decisions.md)三章(error);建议含「非目标/Non-goals」「约束/风险/Trade-off」「文件变更清单」(warning)。章节用二级及以上标题匹配(关键字命中即可,不强求确切标题名)。',
    failMessage: 'design.md 缺少 plan 执行所需的章节(目标/范围/决策)',
  },
  // task-card-structure(custom):蓝图一致性——task 卡片基础字段。validateBlueprintConsistency
  // 认 frontmatter 字段 OR body 章节(flexible)。3 文案进 data(${id} = "${taskId} (${file})"),
  // 算法(parseAllowedPaths/hasAcceptanceCriteria/hasTddOrVerify)留 validator。
  {
    id: 'plan.task-card-structure', stage: 'plan', source: 'validateBlueprintConsistency', severity: 'error', kind: 'task-card-fields',
    target: { root: 'change', path: 'tasks' },
    data: {
      messageAllowedPaths: '${id}: frontmatter 缺少 allowed_paths（需非空数组，列出本 task 真实改动的源文件；回归类 task 无源码改动时填被验证的关键入口文件）',
      messageAcceptance: '${id}: 缺少验收标准——frontmatter 需有 acceptance: 列表字段，或 body 需有「## 验收标准」/「## Acceptance」章节',
      messageTdd: '${id}: 缺少验证步骤——frontmatter 需有 verify: 字段，或 body 需有「## TDD」/「## 验证」/「## Verify」章节',
    },
    spec: 'task 卡片基础字段(蓝图一致性,认 frontmatter 字段或 body 章节):allowed_paths 非空数组(error)、验收标准(frontmatter acceptance: 或 body ## 验收标准/## Acceptance,error)、验证步骤(frontmatter verify: 或 body ## TDD/## 验证/## Verify,缺失仅 warning)。',
    failMessage: '${id}: task 卡片缺少基础字段(allowed_paths/验收标准/验证步骤)',
  },
  // task-card-schema(custom):完整 TaskCard schema——validatePlanFeasibility 只认 frontmatter 字段
  // (strict,不认 body 章节,故与 blueprint 互补不重复)。10 文案进 data(${id} 随检查点取 ${file} /
  // ${taskId || file} / ${taskId},${dep} 用于 depends_on),算法留 validator。
  {
    id: 'plan.task-card-schema', stage: 'plan', source: 'validatePlanFeasibility', severity: 'error', kind: 'task-card-fields',
    target: { root: 'change', path: 'tasks' },
    data: {
      messageFrontmatter: '${id}: 缺少 YAML frontmatter',
      messageId: '${id}: frontmatter 缺少 id',
      messageTitle: '${id}: frontmatter 缺少 title',
      messageAllowedPaths: '${id}: allowed_paths 为空',
      messageGoal: '${id}: 缺少 goal 字段',
      messageImplementation: '${id}: 缺少 implementation 字段',
      messageAcceptance: '${id}: 缺少 acceptance 字段',
      messageVerify: '${id}: 缺少 verify 字段',
      messageConstraints: '${id}: 缺少 constraints 字段',
      messageDependsOnMissing: '${id}: depends_on 引用了不存在的 ${dep}',
    },
    spec: 'task 卡片完整 TaskCard schema(可行性,只认 frontmatter 字段,均 error):YAML frontmatter 必备;frontmatter 需 id、title;allowed_paths 非空;frontmatter 需 goal、implementation、acceptance、verify、constraints 五字段;depends_on 引用的 task 必须存在。',
    failMessage: '${id}: task 卡片 frontmatter 缺少必要字段(id/title/allowed_paths/goal/implementation/acceptance/verify/constraints)',
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

// ── quick ──
// quick step3 --done --output 结果摘要结构校验:4 个必填字段标签(literal-all)。校验对象是
// --output 原文(非文件),引擎不 dispatch;validateQuickResult 取 data.literals 同源,
// complete-handlers 取 failMessage 同源,renderStageContract 注入 quick step0 让 agent 事前知道 4 标签模板。
const QUICK_RULES = [
  {
    id: 'quick.result-labels', stage: 'quick', source: 'validateQuickResult', severity: 'error', kind: 'literal-all',
    target: {},
    data: { literals: ['需求：', '根因：', '方案：', '结果：'] },
    spec: 'quick step3 --done --output 的结果摘要须含 4 个字段标签(字面命中,冒号须全角：):需求：/ 根因：/ 方案：/ 结果：。缺任一 → --done 被拦(回退 step pending),补全后重跑不丢进度。',
    failMessage: '❌ quick 结果摘要结构不完整：缺少字段 ${missing}',
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
  ...QUICK_RULES,
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
