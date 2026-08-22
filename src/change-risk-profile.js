/**
 * change-risk-profile.js — 变更风险分级检测
 *
 * 根据变更涉及的文件类型、关键词、git diff、brainstorm 产物，
 * 判定 5 级风险（doc-only / unit-sufficient / contract-required /
 * integration-critical / deployment-critical），产出门控验证需求。
 */

// ============ 向后兼容：旧的 INTEGRATION_CRITICAL_PATTERNS ============

const INTEGRATION_CRITICAL_PATTERNS = [
  /\bdaemon\b/i,
  /\bbackend\b/i,
  /\bclient.*api\b/i,
  /\bgrpc\b/i,
  /\bwebsocket\b/i,
  /\bhttp.*client\b/i,
  /\bsession\b/i,
  /\blease\b/i,
  /\bagent.?run\b/i,
  /\blifecycle\b/i,
  /\bstate.?transition\b/i,
  /\bclaim\b/i,
  /\bheartbeat\b/i,
  /\bcross.?process\b/i,
  /\bipc\b/i,
  /\bmessage.?queue\b/i,
  /\bpub.?sub\b/i,
  /\bcli\.ts\b/i,
  /\bmain\.ts\b/i,
  /\bentrypoint\b/i,
  /\bserver\.(js|ts)\b/i,
  /\bbootstrap\b/i,
  /\bdockerfile\b/i,
  /\bdocker.?compose\b/i,
]

const INTEGRATION_FILE_PATTERNS = [
  /daemon/i,
  /session.?manager/i,
  /agent.?run/i,
  /lifecycle/i,
  /state.?machine/i,
  /lease/i,
  /cli\.(js|ts)$/,
  /main\.(js|ts)$/,
  /server\.(js|ts)$/,
  /bootstrap/i,
  /startup/i,
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

/** 风险分级的判定来源（命中关键词来源 = design.md / plan.md 内容，非改动文件本身） */
export const RISK_LEVEL_CAUSES = {
  'deployment-critical':
    'design.md / plan.md 命中启动入口关键词（cli.ts / main.ts / server.(js|ts) / bootstrap / entrypoint）。' +
    '注意：这是按 design/plan 里的措辞判定的，不一定代表你真改了启动入口；若属误判可在 design.md frontmatter 用 risk_level 显式声明真实等级（如 unit-sufficient）覆盖——不要靠删措辞绕门控，危险链路该有真实启动证据。',
  'integration-critical':
    'design.md / plan.md 命中跨进程/状态机关键词（daemon / backend / session / lease / lifecycle / heartbeat 等）。',
  'contract-required': 'design.md / plan.md 命中 API contract 关键词（api / client / contract / dto）。',
  'explicit': 'design.md frontmatter 的 risk_level 显式声明（覆盖关键词判级）。',
}

/** design.md frontmatter 可显式声明的合法 risk_level 值（与 detectChangeRisk 判级结果同集合） */
const RISK_LEVELS = ['doc-only', 'unit-sufficient', 'contract-required', 'integration-critical', 'deployment-critical']

/**
 * 从 design.md 顶部 frontmatter 提取显式 risk_level 声明。
 * 只认文档最开头 `---\n...\n---` 块内的 `risk_level: <level>` 单行（与 plan.md 的 plan_level 同款解析），
 * 不扫正文——避免正文里讨论 risk_level 措辞时被误当声明。返回合法 level 或 null。
 */
export function extractExplicitRiskLevel(designContent = '') {
  const fm = designContent.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) return null
  const line = fm[1].split('\n').map(l => l.trim()).find(l => l.startsWith('risk_level:'))
  if (!line) return null
  const value = line.slice('risk_level:'.length).trim().replace(/^["']|["']$/g, '').toLowerCase()
  return RISK_LEVELS.includes(value) ? value : null
}

export function detectChangeRisk({ designContent = '', planContent = '', changedFiles = [] } = {}) {
  const triggers = []

  // ── 显式豁免优先：design.md frontmatter 声明 risk_level → 以声明为准，跳过关键词判级 ──
  // 历史教训：detectChangeRisk 是机械字面匹配，不认否定语境——design 写「本次不改动 daemon/session」
  // 仍命中关键词被误判 integration/deployment-critical，强制要全套集成证据，对无状态后端变更误伤。
  // 与其在正则层做脆弱的否定识别，不如给一条显式、诚实、可审计（落在 design frontmatter + verify-result）
  // 的覆盖通道。声明仍走门控（结论 FAIL 仍拦），但豁免级（unit-sufficient 等）不再强制集成证据。
  const explicit = extractExplicitRiskLevel(designContent)
  if (explicit) {
    const requiredVerification =
      explicit === 'deployment-critical' ? ['unit_tests', 'contract_tests', 'real_daemon_backend_integration', 'runtime_log_evidence', 'real_startup_once'] :
      explicit === 'integration-critical' ? ['unit_tests', 'contract_tests', 'real_daemon_backend_integration', 'runtime_log_evidence', 'terminal_state_assertion'] :
      explicit === 'contract-required' ? ['unit_tests', 'contract_tests'] :
      explicit === 'doc-only' ? ['static_check'] :
      ['unit_tests']
    return { level: explicit, triggers: ['risk_level (explicit)'], requiredVerification, explicit: true }
  }

  const combined = [designContent, planContent].join('\n')

  for (const pattern of INTEGRATION_CRITICAL_PATTERNS) {
    if (pattern.test(combined)) {
      pattern.lastIndex = 0
      const match = combined.match(pattern)
      if (match && !triggers.includes(match[0])) triggers.push(match[0])
    }
  }

  for (const file of changedFiles) {
    for (const pattern of INTEGRATION_FILE_PATTERNS) {
      if (pattern.test(file)) {
        pattern.lastIndex = 0
        const match = file.match(pattern)
        if (match && !triggers.includes(match[0])) triggers.push(match[0])
      }
    }
  }

  if (triggers.length === 0) {
    return { level: 'doc-only', triggers: [], requiredVerification: ['static_check'] }
  }

  const deploymentTrigger = triggers.some(t => /cli\.ts|main\.ts|server\.(js|ts)|bootstrap|entrypoint/i.test(t))
  const lifecycleTrigger = triggers.some(t => /session|lease|agent.?run|lifecycle|state.?transition|claim|heartbeat/i.test(t))
  const crossProcessTrigger = triggers.some(t => /daemon|backend|client.*api|grpc|websocket|cross.?process|ipc|message.?queue/i.test(t))

  let level
  const requiredVerification = ['unit_tests']

  if (deploymentTrigger) {
    level = 'deployment-critical'
    requiredVerification.push('contract_tests', 'real_daemon_backend_integration', 'runtime_log_evidence', 'real_startup_once')
  } else if (lifecycleTrigger || crossProcessTrigger) {
    level = 'integration-critical'
    requiredVerification.push('contract_tests', 'real_daemon_backend_integration', 'runtime_log_evidence', 'terminal_state_assertion')
  } else if (triggers.some(t => /api|client|contract|dto/i.test(t))) {
    level = 'contract-required'
    requiredVerification.push('contract_tests')
  } else {
    level = 'unit-sufficient'
  }

  return { level, triggers, requiredVerification }
}

/**
 * 检查 verify-result.md 是否包含集成验证证据
 *
 * opts.extraEvidenceText（坑 verify-literal-evidence-mismatch，2026-08-22）：调用方可注入
 * CLI 结构化回执文本（如 verify-services.receipt.json 的服务回收回执）——它随 verifyContent
 * 一起参与 literals 匹配，agent 真实起过服务且 CLI 回收过（有回执）时不再依赖其自然语言
 * 措辞恰好含字面词，表述差异不再误拦。
 */
export function checkIntegrationEvidence(verifyContent, requiredVerification, opts = {}) {
  const errors = []
  const warnings = []
  const lower = (String(verifyContent || '') + '\n' + String(opts.extraEvidenceText || '')).toLowerCase()

  // 字面证据正则从 VERIFICATION_NEEDS[k].literals 派生——与报错描述、prompt 事前契约严格同源,
  // 杜绝历史上"描述说 A、正则查 B"的分叉(checkIntegrationEvidence 正则曾比 VERIFICATION_NEEDS
  // 描述多匹配 集成测试/backend.*daemon/real.*integration 等)。literals 为空的 need
  // (unit_tests/contract_tests)无字面校验,视为满足。
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

  return { ok: errors.length === 0, errors, warnings }
}