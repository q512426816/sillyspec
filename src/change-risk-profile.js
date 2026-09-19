/**
 * change-risk-profile.js — 变更风险分级检测
 *
 * 根据变更涉及的文件类型、关键词、git diff、brainstorm 产物，
 * 判定 5 级风险（doc-only / unit-sufficient / contract-required /
 * integration-critical / deployment-critical），产出门控验证需求。
 *
 * 2026-09-19-ceremony-pricing-five-cuts：判级唯一入口 resolveChangeRisk（危险面=项目
 * _module-map.yaml 顶层 blast 段路径声明 × 变更文件，D-008；explicit frontmatter 只压仪式档
 * 不豁免证据，D-009）。散文词表判级（detectChangeRisk 及词表/否定抑制/枚举继承机器）已整体
 * 退役删除。RISK_TO_TIER 五级词→档位映射表迁入本文件（ceremony-tier re-export 保持既有
 * import 面——依赖方向 ceremony-tier→本文件已有先例）。证据门判据（VERIFICATION_NEEDS /
 * checkIntegrationEvidence / auditRuntimeReceipt）与 span 轴 QUICK_RISK_PATH_PATTERNS 原样保留。
 */
import { readFileSync, statSync } from 'fs'
import { join, isAbsolute } from 'path'
import { resolveBlastSurfaces } from './blast-surface.js'

// ============（已退役）词表散文判级 ============

// 2026-09-19-ceremony-pricing-five-cuts task-03 删除收口：INTEGRATION_CRITICAL_PATTERNS /
// INTEGRATION_FILE_PATTERNS 全宇宙词表与 detectChangeRisk 散文扫描整体退役（D-008：撞词≠危险、
// 自指陷阱——判级唯一入口是 resolveChangeRisk 声明面口径；知识库 conventions.md「判级/定价/门禁
// 输入必须项目声明」条目为口径真相源）。
// ============ quick 出口门禁：路径模式风险表（2026-09-14-quick-exit-tiered-gates task-01） ============
//
// quick 侧「风险特征命中」的单一数据源（design D-004@v2：v1 仅路径模式——不做 diff 关键词
// 扫描、不加 git 子进程，R-04 零子进程承诺；diff 维度待真实需求另立变更）。与上方 verify 侧
// INTEGRATION_FILE_PATTERNS 语义不同（那张表收跨进程/集成域、供 detectChangeRisk 判级），本表
// 收 quick 实证踩坑域（R-03 从窄收录：auth/permission/billing/migration/锁/调度），供
// quick-gate-profile.js 的 computeGateProfile 经 opts.riskTable 默认引用——命中即画像 L2 +
// checks.runtimeEvidence='required'。detectChangeRisk 判级逻辑不消费本表（verify 侧行为零变化）。
//
// 匹配口径：POSIX 路径、大小写不敏感、段边界锚定——前界 (^|[/_-]) + 后界 (?=[/._-]|$)，
// 防 author/booking/lockfile 类子串假阳（R-03）；pattern 为稳定域标识（riskHits 审计输出用）。
export const QUICK_RISK_PATH_PATTERNS = [
  { pattern: 'auth', re: /(?:^|[/_-])(?:oauth2?|auth(?:orization|entication|enticator)?)(?=[/._-]|$)/i },
  { pattern: 'permission', re: /(?:^|[/_-])permissions?(?=[/._-]|$)/i },
  { pattern: 'billing', re: /(?:^|[/_-])billing(?=[/._-]|$)/i },
  { pattern: 'migration', re: /(?:^|[/_-])(?:migrations?|migrate)(?=[/._-]|$)/i },
  { pattern: 'lock', re: /(?:^|[/_-])(?:locks?|mutex(?:es)?)(?=[/._-]|$)/i },
  { pattern: 'scheduling', re: /(?:^|[/_-])(?:schedul(?:er|ing)|cron|jobs?)(?=[/._-]|$)/i },
]

/**
 * task 级「端到端/deployment-critical」文本判定（execute 批量完成 autoCheckPlanFromReviews 用）。
 *
 * 聚焦需要真实集成/启动验证的 task，区别于 change 级 INTEGRATION_CRITICAL_PATTERNS（含 backend/session
 * 等泛词——task 级用会误伤普通后端 task）。命中端到端集成语义（端到端/真实集成/daemon↔backend/
 * integration test/e2e）或部署启动入口（cli.ts/main.ts/entrypoint/server/bootstrap/startup/docker）。
 * 坑 execute-batch-complete-endtoend-checkbox：这类 task 的 review cannot_verify 不算 checked，
 * 阻断 execute 批量完成（必须 pass），防端到端未真验就被批量放行（verify integration-evidence 兜底外的
 * execute 侧前置门）。
 * @param {string} text task 描述文本（plan.md task 行 + tasks/task-XX.md 内容）
 * @returns {boolean}
 */
const END_TO_END_TASK_KEYWORDS = [
  /端到端/, /真实集成/, /daemon.*backend/i, /integration\s*test/i, /e2e\s*test/i,
  /runtime\s*evidence/i, /运行时证据/,
  /\bcli\.ts\b/i, /\bmain\.ts\b/i, /\bentrypoint\b/i, /\bserver\.(js|ts)\b/i,
  /\bbootstrap\b/i, /\bstartup\b/i, /启动/, /\bdockerfile\b/i, /\bdocker.?compose\b/i,
]
export function isEndToEndTaskText(text = '') {
  return END_TO_END_TASK_KEYWORDS.some(re => re.test(text))
}

// ============ 门控可执行化（A：报错说人话） ============
//
// 历史教训：integration-critical / deployment-critical 门控只报「缺少真实集成证据 / 需要真实
// 启动验证证据」，agent 看不出具体缺哪一项、要写/做什么才算过，只能靠改结论文案撞墙。
// 此处把每一项 requiredVerification 的需求（写什么 / 做什么）和判级原因显式导出，
// 供 stage-contract 拼成可执行的报错信息。

/** 每项 requiredVerification 的需求描述 + 字面期望 */
export const VERIFICATION_NEEDS = {
  unit_tests: {
    desc: '单元测试（verify 必做；在 verify-result.md 写明测试套件与结果）',
    literals: [],
  },
  contract_tests: {
    desc: '契约测试（前后端/跨进程 API parity 对账，写明结论）',
    literals: [],
  },
  real_daemon_backend_integration: {
    desc: '真实 daemon↔backend 集成验证（非仅 mock 单测）。写「真实集成/端到端」的证据；',
    // 同义扩充（坑 verify-literal-evidence-mismatch，2026-08-22 实证：证据第一轮就齐但表述
    // 不含字面词被误拦三轮）——覆盖常见自然表述 + PID 登记句式（verify prompt 要求照写）
    literals: ['端到端', 'integration test', 'e2e test', 'daemon.*backend', '真实集成',
      'runtime evidence', '运行时证据', '联调', '打通', '实际请求', '真实请求', '跨进程',
      'PID 已登记', 'verify-services'],
  },
  runtime_log_evidence: {
    desc: 'Runtime Evidence section + 指向真实日志/证据片段。',
    literals: ['Runtime Evidence', '运行时证据', 'daemon log', '日志片段', '日志关键',
      '日志:', '日志摘录', '日志', 'log 摘录', 'log 片段', '进程日志', 'PID 已登记', 'verify-services'],
  },
  real_startup_once: {
    desc: '真实启动一次本变更触及的部署/启动入口（服务入口、CLI 主入口、守护进程等——须是本变更实际改动的那一类入口，不能拿无关进程的启动来凑数）。',
    // 同义扩充（同坑）：自然表述 + CLI 回执句式；checkIntegrationEvidence 另拼 CLI 回执文本
    //（verify-services.receipt.json，服务回收器落盘）——结构化信号不依赖 agent 措辞
    literals: ['启动.*一次', '实际.*启动', 'real startup', 'docker up', 'npm start', 'node server',
      '真实启动', '拉起', '已启动', '进程启动', '服务启动', '启动验证',
      'PID 已登记', 'verify-services'],
  },
  terminal_state_assertion: {
    desc: '终态断言（建议项，不阻断）：AgentRun running→completed/failed、session/lease end 状态同步。',
    literals: ['terminal state', '终态', 'completed failed', 'session end', 'lease end',
      '生命周期终态', '状态同步'],
  },
}

/** 风险分级的判定来源（2026-09-19-ceremony-pricing-five-cuts task-03 改声明面口径） */
export const RISK_LEVEL_CAUSES = {
  'deployment-critical':
    '变更文件面命中项目声明危险面（_module-map.yaml 顶层 blast 段）且判级为顶档。' +
    '这是按「文件路径 × 项目声明」判定的——若认为该路径不该定此价：改 map 声明（git 可见）；危险链路该有真实启动证据。',
  'integration-critical':
    '变更文件面命中项目声明危险面的 evidence:true 路径（需要真实集成证据，D-009）。' +
    'frontmatter risk_level 只压仪式档、不豁免证据要求——证据豁免=改 map 的 evidence 声明（git 可见）。',
  'contract-required': '变更文件面命中项目声明的 S2 档危险面（跨模块契约域）。',
  'explicit': 'design.md frontmatter 的 risk_level 显式声明（压仪式档；不豁免 evidence 要求）。',
}

/** design.md frontmatter 可显式声明的合法 risk_level 值（存量五级词兼容集合） */
const RISK_LEVELS = ['doc-only', 'unit-sufficient', 'contract-required', 'integration-critical', 'deployment-critical']

/**
 * 从 design.md 顶部 frontmatter 提取显式 risk_level 声明。
 * 只认文档最开头 `---\n...\n---` 块内的 `risk_level: <level>` 单行（与 plan.md 的 plan_level 同款解析），
 * 不扫正文——避免正文里讨论 risk_level 措辞时被误当声明。返回合法 level 或 null。
 * 2026-09-19-ceremony-pricing-five-cuts task-03 删除收口后保留：声明面判级 explicit 通道的
 * 唯一提取器（stage-contract / review-tier / verify-quality-scan / run-gates 消费）。
 */
export function extractExplicitRiskLevel(designContent = '') {
  const fm = designContent.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) return null
  const line = fm[1].split('\n').map(l => l.trim()).find(l => l.startsWith('risk_level:'))
  if (!line) return null
  const value = line.slice('risk_level:'.length).trim().replace(/^["']|["']$/g, '').toLowerCase()
  return RISK_LEVELS.includes(value) ? value : null
}

/**
 * 五级风险词 → 仪式档位映射（integration 与 deployment 同归 S3：顶档仪式不分家）。
 * 2026-09-19-ceremony-pricing-five-cuts task-02 自 ceremony-tier.js 迁入（判级域归属本文件，
 * ceremony-tier re-export 保持既有 import 面不变）；resolveChangeRisk 的 explicitRiskLevel
 * 兼容通道消费本表（存量 frontmatter 五级词）。
 */
export const RISK_TO_TIER = {
  'doc-only': 'S0',
  'unit-sufficient': 'S1',
  'contract-required': 'S2',
  'integration-critical': 'S3',
  'deployment-critical': 'S3',
}

// ============ 声明面判级（2026-09-19-ceremony-pricing-five-cuts task-02 / D-008 / D-009）============
//
// 新判级入口：files × 项目声明危险面（loadBlastDeclarations 装载 map blast 段 + local 只升合并）
// → { tier, evidenceRequired, explicit, hitPrefixes, requiredVerification }。
//   tier：命中声明面最高档（无命中 S1——未配置项目禁回退词表，D-008）；explicitRiskLevel
//   （frontmatter 五级词经 RISK_TO_TIER 存量兼容）存在时覆盖 tier（人工通道升/降均尊重），
//   **不豁免 evidenceRequired**（D-009：证据豁免=改 map，git 可见——收掉旧显式短路连证据门
//   一起免的懒 agent 洞）。
//   evidenceRequired → requiredVerification 取现行 integration-critical 组原样（证据门判据零改动）。

/**
 * 声明面判级（纯函数）。
 * @param {{ files?: string[], blastDeclarations?: Array<{prefixes: string[], tier: string, evidence?: boolean}>, explicitRiskLevel?: string|null }} opts
 * @returns {{ tier: 'S0'|'S1'|'S2'|'S3', level: string, evidenceRequired: boolean, explicit: boolean, hitPrefixes: string[], requiredVerification: string[] }}
 *   level＝五级词兼容字段（存量消费面零改动）：evidenceRequired → 'integration-critical'；
 *   否则 tier 反查（S0 doc-only / S1 unit-sufficient / S2 contract-required / S3 integration-critical）。
 */
const TIER_TO_COMPAT_LEVEL = { S0: 'doc-only', S1: 'unit-sufficient', S2: 'contract-required', S3: 'integration-critical' }

export function resolveChangeRisk({ files = [], blastDeclarations = [], explicitRiskLevel = null } = {}) {
  const surfaces = resolveBlastSurfaces(files, blastDeclarations)
  const level = typeof explicitRiskLevel === 'string' ? explicitRiskLevel.trim().toLowerCase() : ''
  const explicitTier = level ? RISK_TO_TIER[level] : undefined
  const tier = explicitTier ? explicitTier : surfaces.tier
  const evidenceRequired = surfaces.evidence
  const requiredVerification = evidenceRequired
    ? ['unit_tests', 'contract_tests', 'real_daemon_backend_integration', 'runtime_log_evidence', 'terminal_state_assertion']
    : ['unit_tests']
  const compatLevel = evidenceRequired ? 'integration-critical' : TIER_TO_COMPAT_LEVEL[tier]
  return { tier, level: compatLevel, evidenceRequired, explicit: Boolean(explicitTier), hitPrefixes: surfaces.hitPrefixes, requiredVerification }
}

// ============ 回执来源分类打标（X-10 / D-002 / D-006，2026-09-17-pass-cap-semantics task-02） ============
//
// EHS 实证（D-002）：mvn compile + JUnitCore 纯单测的三条 log 通过了集成回执四条件校验——
// 单测/编译类回执被当成集成实测。打标口径：只认回执 command 的命令来源声明（quality-scan
// 记录的命令与 verify_precedents 声明同思想），不解析日志内容猜测（X-10）；未定类默认
// 'build'（fail-closed 侧：build/unit 回执不构成「集成实测已跑」绿判据，宁可触发封顶要求
// handover——stage-contract 侧 validatePassEligibility（evaluatePassEligibility 纯函数 +
// resolveFactsExpected 判定）消费本口径对结论=PASS 封顶；verify-probes producer 侧
// classifyReceiptCommandSource（facts.integrationRan 判定）与本分类同族口径，两处正则族
// 保持同步演进）。smoke 冒烟命令族计 cross-layer（D-006 退役判据：批次 C commands.smoke
// 落地后由 smoke 回执一票判定「集成实测已跑」——起服务冒烟即跨层实测，不得默认 build 误拦金路径）。
//
// 来源标记直判（2026-09-17-api-coverage-smoke task-02 / Grill B-1 修正，FR-03）：条目 source
// 标记 'cli-noai-smoke'（verify-probes ensureSmokeReceiptSection 注入的机器段行尾注，
// parseEvidenceSlots additive 解析回填）→ 直判 cross-layer，**优先于命令词正则分类**——
// 修正点在标记识别而非命令词增补：node scripts/smoke.mjs / bash smoke.sh / python smoke.py
// 等脚本形态在既有正则下全判 build 会误拦金路径，且脚本形态词表不可枚举（正则族两文件零词
// 变动）。对齐目标：verify-probes.js classifyReceiptCommandSource（judgeIntegrationRan 消费）
// 同款 sourceMark 参数与标记族——**任一侧增改标记族必须双侧同步**（G-3 先例：producer 侧
// 曾漏 smoke 一词致口径分裂）。
export const RECEIPT_SOURCE_CROSS_LAYER_RE = new RegExp([
  '\\bcurl\\b', '\\bwget\\b', '\\bhttpie\\b', '\\bInvoke-WebRequest\\b', '\\bInvoke-RestMethod\\b',
  '\\biwr\\b', '\\birm\\b', 'https?://',
  'spring-boot:run', '\\bjava\\b[^|\\n]*\\s-jar\\b',
  '\\b(?:npm|pnpm|yarn|bun)\\s+(?:run\\s+)?(?:dev|start|serve|smoke)\\b',
  '\\bdotnet\\s+run\\b', '\\bflask\\s+run\\b', '\\buvicorn\\b', '\\bgunicorn\\b',
  '\\b(?:nc|netcat|telnet|socat)\\b',
].join('|'), 'i')
export const RECEIPT_SOURCE_UNIT_RE = /\bJUnitCore\b|\bnode\s+--test\b|\bmocha\b|\bjest\b|\bvitest\b|\bpytest\b|\bphpunit\b|\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b/i
/** CLI 机器段来源标记（与 verify-probes.js SMOKE_RECEIPT_SOURCE_MARK / task-01 记录 source 同值，双侧同步） */
export const CLI_SMOKE_SOURCE_MARK = 'cli-noai-smoke'
function classifyReceiptSourceTag(command, sourceMark) {
  if (sourceMark === CLI_SMOKE_SOURCE_MARK) return 'cross-layer'
  const cmd = String(command || '')
  if (RECEIPT_SOURCE_CROSS_LAYER_RE.test(cmd)) return 'cross-layer'
  if (RECEIPT_SOURCE_UNIT_RE.test(cmd)) return 'unit'
  return 'build'
}

/**
 * 检查 verify-result.md 是否包含集成验证证据
 *
 * opts.extraEvidenceText（坑 verify-literal-evidence-mismatch，2026-08-22）：调用方可注入
 * CLI 结构化回执文本（如 verify-services.receipt.json 的服务回收回执）——它随 verifyContent
 * 一起参与 literals 匹配，agent 真实起过服务且 CLI 回收过（有回执）时不再依赖其自然语言
 * 措辞恰好含字面词，表述差异不再误拦。
 *
 * opts.sourceTag（X-10 / D-006，2026-09-17-pass-cap-semantics task-02）：可选回执来源声明
 * （'cross-layer' | 'build' | 'unit'），透传给 auditRuntimeReceipt 优先于按 command 就地
 * 分类；非法值忽略。build/unit 回执不作集成实测绿判据（缺省按 command 分类，未定类 build）。
 */
export function checkIntegrationEvidence(verifyContent, requiredVerification, opts = {}) {
  const errors = []
  const warnings = []
  const lower = (String(verifyContent || '') + '\n' + String(opts.extraEvidenceText || '')).toLowerCase()

  // ── v2 回执槽优先（2026-09-08-ir-verify-facts FR-04，D-003@v1）：「集成验证回执」槽在场时
  // 走结构化一致性校验（绿判据：logPath 存在 × mtime ∈ verify 窗口 × 日志尾 200 行失败签名
  // 扫描（噪声剔除）× exitCode===0），literals 降 legacy 回退（存量兼容）。
  // extraEvidenceText（verify-services 回执注入）保留合并为补充候选文本。CLI 不代跑集成进程。──
  if (Array.isArray(opts.runtimeEvidence) && opts.runtimeEvidence.length > 0) {
    const greenReceipts = []
    const receiptAudit = []
    for (const r of opts.runtimeEvidence) {
      const audit = auditRuntimeReceipt(r, opts)
      receiptAudit.push(audit)
      if (audit.green) greenReceipts.push(r)
    }
    const needsIntegration = requiredVerification.includes('real_daemon_backend_integration')
    const needsLogEvidence = requiredVerification.includes('runtime_log_evidence')
    const needsRealStartup = requiredVerification.includes('real_startup_once')
    // 任一绿回执 = 结构化在场证据（claim 语义由 agent 声明，一致性由 CLI 校验）
    const hasGreen = greenReceipts.length > 0
    if (needsIntegration && !hasGreen) {
      const bad = receiptAudit.filter(a => !a.green)
      errors.push(`integration-critical 变更无绿回执（${bad.length} 条回执校验不过：${bad.map(a => a.reason).join('；') || '无有效回执'}）——绿判据：log 存在 × mtime ∈ verify 窗口 × 日志无失败签名 × exit 0 × 来源 cross-layer（build/unit 回执不作集成实测判据，D-006）`)
    }
    if (needsLogEvidence && !hasGreen) {
      errors.push('integration-critical 变更的回执未通过一致性校验（Runtime Evidence 等价物）')
    }
    if (needsRealStartup && !hasGreen) {
      errors.push('deployment-critical 变更无绿回执（真实启动验证）')
    }
    if (receiptAudit.some(a => !a.green && a.failSignatures > 0)) {
      warnings.push('回执日志含失败签名（error/exception/traceback/fatal 行首命中，已剔除「0 errors」类良性行）——确认是否预期内失败')
    }
    return { ok: errors.length === 0, errors, warnings, receiptAudit, structured: true }
  }

  // ── legacy literals 回退（无槽存量格式）──
  const hasEvidence = (k) => {
    const n = VERIFICATION_NEEDS[k]
    if (!n || !n.literals || n.literals.length === 0) return true
    return new RegExp(n.literals.join('|'), 'i').test(lower)
  }

  const needsIntegration = requiredVerification.includes('real_daemon_backend_integration')
  const needsLogEvidence = requiredVerification.includes('runtime_log_evidence')
  const needsTerminalState = requiredVerification.includes('terminal_state_assertion')
  const needsRealStartup = requiredVerification.includes('real_startup_once')

  if (needsIntegration) {
    const hasMockOnly = /mock.*test.*passed|unit.*test.*passed/i.test(lower)
    const hasIntegrationEvidence = hasEvidence('real_daemon_backend_integration')
    if (!hasIntegrationEvidence && hasMockOnly) {
      errors.push('integration-critical 变更只提供了 mock 单测证据，缺少真实 daemon↔backend 集成验证')
    } else if (!hasIntegrationEvidence) {
      errors.push('integration-critical 变更缺少集成验证证据 — 需要真实 daemon↔backend 测试结果或运行时日志')
    }
  }

  if (needsLogEvidence) {
    if (!hasEvidence('runtime_log_evidence')) {
      errors.push('integration-critical 变更的 verify-result.md 缺少 Runtime Evidence section')
    }
  }

  if (needsTerminalState) {
    if (!hasEvidence('terminal_state_assertion')) {
      warnings.push('建议检查终态断言：AgentRun running→completed/failed、session end 状态同步')
    }
  }

  if (needsRealStartup) {
    if (!hasEvidence('real_startup_once')) {
      errors.push('deployment-critical 变更需要真实启动验证证据')
    }
  }

  return { ok: errors.length === 0, errors, warnings, structured: false }
}

/**
 * 单条回执一致性校验（FR-04 绿判据）。噪声剔除：签名行首匹配 + 剔除「0 errors」类良性行
 * （本仓 verify-postcheck.js 测试输出解析先例同款）。fail-soft：校验依赖缺失（opts 无
 * cwd/verifyStartAt）时只核 exitCode 与日志可读性，不假装跑了文件校验。
 *
 * opts.sourceTag（X-10 / D-006，2026-09-17-pass-cap-semantics task-02）：可选回执来源声明，
 * 缺省按回执 command 来源就地分类（classifyReceiptSourceTag），未定类默认 'build'（向后
 * 兼容的 fail-closed 缺省）；sourceTag ∈ {build, unit} 的回执不作集成实测绿判据（四条件
 * 全过也只到 non-green，reason 点名来源）——verify-postcheck 不在本调用链上，不受影响。
 *
 * r.source（2026-09-17-api-coverage-smoke task-02 / FR-03，Grill B-1）：条目级来源标记
 * （parseEvidenceSlots additive 第五字段，CLI 机器段行 'cli-noai-smoke' 尾注回填）透传给
 * classifyReceiptSourceTag 直判 cross-layer——优先级在调用方 opts.sourceTag 声明源之下、
 * 命令词正则分类之上；无标记条目分类路径逐字节不变。
 */
function auditRuntimeReceipt(r, opts) {
  const out = { claim: r && r.claim, logPath: r && r.logPath, sourceTag: null, green: false, logExists: null, mtimeInWindow: null, failSignatures: 0, exitCode: r && typeof r.exitCode === 'number' ? r.exitCode : null, reason: '' }
  // 打标依据 = 命令来源声明（不解析日志内容，X-10）：opts.sourceTag 调用方声明源优先，
  // 其次条目 source 标记直判（task-02 Grill B-1——'cli-noai-smoke' 直判 cross-layer），
  // 否则按回执 command 分类；非法/缺省走分类，未定类默认 build。
  const declaredSource = opts && typeof opts.sourceTag === 'string'
    && ['cross-layer', 'build', 'unit'].includes(opts.sourceTag) ? opts.sourceTag : null
  out.sourceTag = declaredSource || classifyReceiptSourceTag(r && r.command, r && r.source)
  if (!r || !r.logPath) { out.reason = '回执缺 logPath'; return out }
  // 绝对路径直读（2026-09-17-api-coverage-smoke task-02）：CLI 机器段（source=cli-noai-smoke）
  // 的 logPath 是 quality-scan 记录的绝对路径实录——join(cwd, 绝对路径) 会拼出破损路径
  // 误报「日志不存在」，isAbsolute 时跳过 join（verify-postcheck 测试输出解析同款口径）。
  const resolveLog = (p) => (opts.cwd && !isAbsolute(String(p)) ? join(opts.cwd, p) : p)
  let content = null
  try {
    const abs = resolveLog(r.logPath)
    content = readFileSync(abs, 'utf8')
    out.logExists = true
  } catch {
    out.logExists = false
    out.reason = `日志不存在：${r.logPath}`
    return out
  }
  if (opts.verifyStartAt) {
    try {
      const startAt = new Date(opts.verifyStartAt).getTime()
      out.mtimeInWindow = statSync(resolveLog(r.logPath)).mtimeMs >= startAt - 60_000
      if (!out.mtimeInWindow) { out.reason = `日志 mtime 早于 verifyStartAt（${r.logPath}）`; return out }
    } catch { out.mtimeInWindow = null }
  }
  // 失败签名扫描（日志尾 200 行；行首匹配 + 良性计数行剔除）
  const tail = content.split('\n').slice(-200)
  const SIGNATURE_RE = /^(?:error|exception|traceback|fatal)\b/i
  const BENIGN_RE = /\b0\s+(?:errors?|exceptions?|failures?)\b|no\s+(?:errors?|exceptions?)/i
  for (const line of tail) {
    if (SIGNATURE_RE.test(line.trim()) && !BENIGN_RE.test(line)) out.failSignatures++
  }
  if (out.failSignatures > 0) { out.reason = `日志含 ${out.failSignatures} 行失败签名（行首 error/exception/traceback/fatal，已剔除良性计数行）`; return out }
  if (out.exitCode !== 0) { out.reason = `exitCode=${out.exitCode}（非 0 不可用作在场证据）`; return out }
  // 来源门（D-002/D-006，2026-09-17-pass-cap-semantics task-02）：四条件全过但来源 build/unit
  // （编译/单测/构建类命令）→ 不作集成实测绿判据（EHS 实证口径），排在前置硬伤（缺日志/
  // 出窗/签名/exit≠0）之后不抢 reason 优先级。
  if (out.sourceTag !== 'cross-layer') {
    out.reason = `回执来源 ${out.sourceTag}（command：${(r && r.command) || ''}）不构成「集成实测已跑」——build/unit 类命令（编译/单测/构建）不作集成绿判据（D-006）。出路：提供跨层实测回执（起服务/HTTP/进程对进程/smoke 冒烟命令），或降级 PASS WITH NOTES 并在「## 移交项（结构化）」承载缺口`
    return out
  }
  out.green = true
  out.reason = '绿回执（log 存在 × mtime 窗口 × 无失败签名 × exit 0 × 来源 cross-layer）'
  return out
}
