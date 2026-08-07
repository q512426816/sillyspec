/**
 * change-risk-profile.js — 变更风险分级检测
 *
 * 根据变更涉及的文件类型、关键词、git diff、brainstorm 产物，
 * 自动判定 P0/P1/P2 风险等级，产出结构化 risk-profile.json。
 *
 * P0 = 阻塞确认（必须用户确认）
 * P1 = 自动推进但记录
 * P2 = 自动通过
 */

// ============ P0 触发规则 ============

const P0_FILE_PATTERNS = [
  { id: 'R-002', pattern: /(?:^|\/)(?:migrations?|migration)\/(?:.+)/i, desc: '数据库 migration' },
  { id: 'R-002', pattern: /(?:^|\/)schema\.(?:sql|prisma|ts|js)$/i, desc: '数据库 schema' },
  { id: 'R-003', pattern: /(?:^|\/)(?:auth|permission|role|login|token)\b/i, desc: '鉴权/权限' },
  { id: 'R-004', pattern: /(?:^|\/)(?:payment|billing|stripe|paypal)\b/i, desc: '支付/资金' },
  { id: 'R-005', pattern: /\.(?:env|env\.\w+)$/, desc: '环境配置' },
  { id: 'R-005', pattern: /(?:^|\/)(?:Dockerfile|docker-compose\.\w+)$/i, desc: '部署配置' },
  { id: 'R-005', pattern: /(?:^|\/)config\.(?:yaml|yml|json|toml)$/i, desc: '生产配置' },
]

const P0_CONTENT_PATTERNS = [
  { id: 'R-001', pattern: /\b(?:DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM\s+\w+\s+(?!WHERE\s+.+\s+LIMIT))/i, desc: '删除数据' },
  { id: 'R-002', pattern: /\b(?:CREATE\s+TABLE|ALTER\s+TABLE|ADD\s+COLUMN|DROP\s+COLUMN|CREATE\s+INDEX)/i, desc: '数据库 migration' },
]

// ============ P1 触发规则 ============

const P1_FILE_PATTERNS = [
  { id: 'R-101', pattern: /(?:^|\/)(?:routes|controllers?|handlers?)\//i, desc: 'API 层' },
  { id: 'R-102', pattern: /(?:^|\/)(?:models|entities)\//i, desc: '数据模型层' },
  { id: 'R-104', pattern: /(?:^|\/)(?:services)\//i, desc: '业务逻辑层（跨模块）' },
  { id: 'R-106', pattern: /(?:^|\/)index\.(?:ts|js)$/i, desc: 're-export 入口' },
]

const P1_CONTENT_PATTERNS = [
  { id: 'R-101', pattern: /\b(?:daemon|backend|grpc|websocket|cross.?process|ipc|message.?queue)\b/i, desc: '跨进程通信' },
  { id: 'R-101', pattern: /\b(?:session|lease|agent.?run|lifecycle|state.?transition|claim|heartbeat)\b/i, desc: '状态机/生命周期' },
  { id: 'R-102', pattern: /\b(?:api|client|contract|dto)\b/i, desc: 'API contract' },
  { id: 'R-105', pattern: /(?:^|\/)(?:workflow|daemon|session|lifecycle|state-machine)\b/i, desc: '核心模块' },
]

// ============ P0/P1 命中文件名关键词（用于 git diff 检测） ============

const PROTECTED_FILE_NAMES = [
  '.env', 'package.json', 'tsconfig.json', 'vite.config.ts', 'vite.config.js',
  'prisma/schema.prisma', 'docker-compose.yml', 'docker-compose.yaml',
]

// ============ 向后兼容：旧的 INTEGRATION_CRITICAL_PATTERNS ============

export const INTEGRATION_CRITICAL_PATTERNS = [
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

export const INTEGRATION_FILE_PATTERNS = [
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

// ============ 核心检测函数 ============

/**
 * 三级风险检测：P0 / P1 / P2
 * @param {object} opts
 * @param {string} [opts.designContent] - design.md 内容
 * @param {string} [opts.planContent] - plan.md 内容
 * @param {string[]} [opts.changedFiles] - 变更文件列表
 * @param {string} [opts.diffContent] - git diff 内容（可选，用于更精确检测）
 * @param {object} [opts.nextAction] - next-action.json 解析后的对象（可选）
 * @param {string[]} [opts.protectedFiles] - 项目自定义 protected files 列表
 * @returns {RiskProfile}
 *
 * @typedef {object} RiskProfile
 * @property {string} level - 'P0' | 'P1' | 'P2'
 * @property {string[]} triggers - 触发的规则 ID 列表
 * @property {object[]} assessedFrom - 评估依据
 * @property {string[]} applyBlockers - apply 阻塞原因
 * @property {boolean} canAutoApply - 是否可自动 apply
 * @property {string} applyReason - apply 决策原因
 */
export function detectRiskProfile({ designContent = '', planContent = '', changedFiles = [], diffContent = '', nextAction = null, protectedFiles = [] } = {}) {
  const triggers = []
  const assessedFrom = []

  const combined = [designContent, planContent].join('\n')

  // ── P0 检测（最高优先级）──

  // 基于文件路径
  for (const rule of P0_FILE_PATTERNS) {
    for (const file of changedFiles) {
      if (rule.pattern.test(file)) {
        rule.pattern.lastIndex = 0
        if (!triggers.includes(rule.id)) {
          triggers.push(rule.id)
          assessedFrom.push({ source: 'file_path', pattern: rule.desc, matchedFiles: [file] })
        }
      }
    }
  }

  // 基于 diff 内容（P0 关键词）
  const diffText = diffContent || combined
  for (const rule of P0_CONTENT_PATTERNS) {
    if (rule.pattern.test(diffText)) {
      rule.pattern.lastIndex = 0
      if (!triggers.includes(rule.id)) {
        triggers.push(rule.id)
        assessedFrom.push({ source: 'content', pattern: rule.desc })
      }
    }
  }

  // protected files
  for (const file of changedFiles) {
    if (PROTECTED_FILE_NAMES.some(p => file === p || file.endsWith('/' + p))) {
      const id = 'R-005'
      if (!triggers.includes(id)) {
        triggers.push(id)
        assessedFrom.push({ source: 'protected_file', pattern: file })
      }
    }
    // 用户自定义 protected files
    if (protectedFiles.includes(file)) {
      const id = 'R-005'
      if (!triggers.includes(id)) {
        triggers.push(id)
        assessedFrom.push({ source: 'protected_file', pattern: file })
      }
    }
  }

  // next-action.json 有 blocking questions
  if (nextAction && nextAction.has_blocking_questions === true) {
    const id = 'R-009'
    if (!triggers.includes(id)) {
      triggers.push(id)
      assessedFrom.push({ source: 'brainstorm', pattern: 'has_blocking_questions === true' })
    }
  }

  // ── P1 检测（只在无 P0 时检测）──
  if (!triggers.some(t => t.startsWith('R-00'))) {
    // 基于文件路径
    for (const rule of P1_FILE_PATTERNS) {
      for (const file of changedFiles) {
        if (rule.pattern.test(file)) {
          rule.pattern.lastIndex = 0
          if (!triggers.includes(rule.id)) {
            triggers.push(rule.id)
            assessedFrom.push({ source: 'file_path', pattern: rule.desc, matchedFiles: [file] })
          }
        }
      }
    }

    // 基于内容关键词
    for (const rule of P1_CONTENT_PATTERNS) {
      if (rule.pattern.test(combined)) {
        rule.pattern.lastIndex = 0
        if (!triggers.includes(rule.id)) {
          triggers.push(rule.id)
          assessedFrom.push({ source: 'content', pattern: rule.desc })
        }
      }
    }

    // 跨模块检测（> 3 个文件的变更）
    if (changedFiles.length > 10) {
      const id = 'R-101'
      if (!triggers.includes(id)) {
        triggers.push(id)
        assessedFrom.push({ source: 'file_count', pattern: `${changedFiles.length} files changed` })
      }
    }

    // next-action.json 有 NEEDS_REVIEW 决策
    if (nextAction && Array.isArray(nextAction.auto_decisions)) {
      for (const d of nextAction.auto_decisions) {
        if (d.status === 'NEEDS_REVIEW') {
          const id = 'R-102'
          if (!triggers.includes(id)) {
            triggers.push(id)
            assessedFrom.push({ source: 'brainstorm', pattern: `NEEDS_REVIEW: ${d.decision}` })
          }
        }
      }
    }
  }

  // ── 判定等级 ──
  let level = 'P2'
  if (triggers.some(t => t.match(/^R-0\d+$/))) {
    level = 'P0'
  } else if (triggers.some(t => t.match(/^R-1\d+$/))) {
    level = 'P1'
  }

  // ── apply 决策 ──
  const applyBlockers = []
  if (level === 'P0') {
    applyBlockers.push('风险等级 P0：需要用户确认后才能 apply')
  }

  const canAutoApply = level !== 'P0' && applyBlockers.length === 0
  const applyReason = canAutoApply
    ? `风险等级 ${level}，无 P0 触发，无 protected files 修改`
    : applyBlockers.join('; ')

  return { level, triggers, assessedFrom, applyBlockers, canAutoApply, applyReason }
}

// ============ 向后兼容 ============

/**
 * 旧的 detectChangeRisk 接口保持向后兼容
 * @returns {{ level: string, triggers: string[], requiredVerification: string[] }}
 */
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
    literals: ['端到端', 'integration test', 'e2e test', 'daemon.*backend', '真实集成', 'runtime evidence', '运行时证据'],
  },
  runtime_log_evidence: {
    desc: 'Runtime Evidence section + 指向真实日志/证据片段。',
    literals: ['Runtime Evidence', '运行时证据', 'daemon log', '日志片段'],
  },
  real_startup_once: {
    desc: '真实启动一次本变更触及的部署/启动入口（服务入口、CLI 主入口、守护进程等——须是本变更实际改动的那一类入口，不能拿无关进程的启动来凑数）。',
    literals: ['启动.*一次', '实际.*启动', 'real startup', 'docker up', 'npm start', 'node server'],
  },
  terminal_state_assertion: {
    desc: '终态断言（建议项，不阻断）：AgentRun running→completed/failed、session/lease end 状态同步。',
    literals: ['terminal state', '终态', 'completed failed', 'session end', 'lease end'],
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
export const RISK_LEVELS = ['doc-only', 'unit-sufficient', 'contract-required', 'integration-critical', 'deployment-critical']

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
 */
export function checkIntegrationEvidence(verifyContent, requiredVerification) {
  const errors = []
  const warnings = []
  const lower = verifyContent.toLowerCase()

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