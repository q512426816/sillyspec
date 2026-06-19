/**
 * change-risk-profile.js — 变更风险分级检测
 *
 * 根据变更涉及的文件类型、关键词，自动判定 verify 所需的验收强度。
 */

/**
 * 触发 integration-critical 风险等级的关键词
 */
const INTEGRATION_CRITICAL_PATTERNS = [
  // 跨进程通信
  /\bdaemon\b/i,
  /\bbackend\b/i,
  /\bclient.*api\b/i,
  /\bgrpc\b/i,
  /\bwebsocket\b/i,
  /\bhttp.*client\b/i,
  // 状态机 / 生命周期
  /\bsession\b/i,
  /\blease\b/i,
  /\bagent.?run\b/i,
  /\blifecycle\b/i,
  /\bstate.?transition\b/i,
  /\bclaim\b/i,
  /\bheartbeat\b/i,
  // 跨进程协议
  /\bcross.?process\b/i,
  /\bipc\b/i,
  /\bmessage.?queue\b/i,
  /\bpub.?sub\b/i,
  // 部署/启动路径
  /\bcli\.ts\b/i,
  /\bmain\.ts\b/i,
  /\bentrypoint\b/i,
  /\bserver\.(js|ts)\b/i,
  /\bbootstrap\b/i,
  /\bdockerfile\b/i,
  /\bdocker.?compose\b/i,
]

/**
 * 需要集成验证的文件路径关键词
 */
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
 * 检测变更风险等级
 * @param {object} opts
 * @param {string} [opts.designContent] - design.md 内容
 * @param {string} [opts.planContent] - plan.md 内容
 * @param {string[]} [opts.changedFiles] - 变更文件列表
 * @returns {{ level: string, triggers: string[], requiredVerification: string[] }}
 */
export function detectChangeRisk({ designContent = '', planContent = '', changedFiles = [] } = {}) {
  const triggers = []
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
 * @param {string} verifyContent
 * @param {string[]} requiredVerification
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function checkIntegrationEvidence(verifyContent, requiredVerification) {
  const errors = []
  const warnings = []
  const lower = verifyContent.toLowerCase()

  const needsIntegration = requiredVerification.includes('real_daemon_backend_integration')
  const needsLogEvidence = requiredVerification.includes('runtime_log_evidence')
  const needsTerminalState = requiredVerification.includes('terminal_state_assertion')
  const needsRealStartup = requiredVerification.includes('real_startup_once')

  if (needsIntegration) {
    const hasMockOnly = /mock.*test.*passed|unit.*test.*passed/i.test(lower)
    const hasIntegrationEvidence =
      /集成测试|integration.*test|e2e.*test|端到端/i.test(lower) ||
      /daemon.*backend|backend.*daemon|真实.*集成|real.*integration/i.test(lower) ||
      /runtime.*evidence|运行时.*证据/i.test(lower)

    if (!hasIntegrationEvidence && hasMockOnly) {
      errors.push('integration-critical 变更只提供了 mock 单测证据，缺少真实 daemon↔backend 集成验证')
    } else if (!hasIntegrationEvidence) {
      errors.push('integration-critical 变更缺少集成验证证据 — 需要真实 daemon↔backend 测试结果或运行时日志')
    }
  }

  if (needsLogEvidence) {
    const hasRuntimeSection = /runtime.*evidence|运行时.*证据|daemon.*log|日志.*片段/i.test(lower)
    if (!hasRuntimeSection) {
      errors.push('integration-critical 变更的 verify-result.md 缺少 Runtime Evidence section')
    }
  }

  if (needsTerminalState) {
    const hasTerminalState = /terminal.*state|终态|running.*completed|completed.*failed|session.*end|lease.*end/i.test(lower)
    if (!hasTerminalState) {
      warnings.push('建议检查终态断言：AgentRun running→completed/failed、session end 状态同步')
    }
  }

  if (needsRealStartup) {
    const hasStartupEvidence = /启动.*一次|real.*startup|实际.*启动|docker.*up|npm.*start|node.*server/i.test(lower)
    if (!hasStartupEvidence) {
      errors.push('deployment-critical 变更需要真实启动验证证据')
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}
