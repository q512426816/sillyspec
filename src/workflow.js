/**
 * SillySpec Workflow Engine
 * 
 * 定义、检查和执行结构化工作流。
 * 职责：
 *   - 加载 .sillyspec/workflows/*.yaml
 *   - 运行 post_check 验证产物
 *   - 按角色定位失败 + 生成重试 prompt
 *   - 根据 role 定义生成 role prompts（Level 2）
 */

import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'fs'
import { join, resolve, basename } from 'path'
import jsYaml from 'js-yaml'
import { WORKFLOW_STATUS } from './constants.js'

// ─── Workflow 加载 ───

/**
 * 查找并加载指定名称的 workflow YAML
 * @param {string} cwd - 项目根目录
 * @param {string} name - workflow 名称（如 'scan-docs'）
 * @returns {object|null} workflow 定义，或 null
 */
export function loadWorkflow(cwd, name, validate = true) {
  const wfDir = join(cwd, '.sillyspec', 'workflows')
  if (!existsSync(wfDir)) return null

  // 优先找 <name>.yaml，其次找 <name>.yml
  for (const ext of ['.yaml', '.yml']) {
    const f = join(wfDir, `${name}${ext}`)
    if (existsSync(f)) {
      const raw = readFileSync(f, 'utf8')
      const wf = jsYaml.load(raw)
      if (validate) {
        const errors = validateWorkflow(wf)
        if (errors.length > 0) return { _validationErrors: errors, ...wf }
      }
      return wf
    }
  }
  return null
}

/**
 * 校验 workflow YAML 结构
 * @param {object} wf - workflow 定义
 * @returns {string[]} 错误列表，空数组表示通过
 */
export function validateWorkflow(wf) {
  const errors = []
  const roles = wf.roles || []
  const roleIds = new Set(roles.map(r => r.id))

  for (const role of roles) {
    if (!role.id) {
      errors.push(`role 缺少 id 字段`)
      continue
    }
    // depends_on 校验
    const deps = role.depends_on || []
    for (const depId of deps) {
      if (!roleIds.has(depId)) {
        errors.push(`role "${role.id}" 的 depends_on 引用了不存在的 role "${depId}"`)
      }
    }
    // depends_on 循环检测（简单两层：A→B→A）
    for (const depId of deps) {
      const depRole = roles.find(r => r.id === depId)
      if (depRole && (depRole.depends_on || []).includes(role.id)) {
        errors.push(`循环依赖："${role.id}" ↔ "${depId}"`)
      }
    }
    // from_role 校验
    const inputs = role.inputs || {}
    if (!Array.isArray(inputs)) {
      // inputs is a mapping
      if (inputs.from_role) {
        if (!roleIds.has(inputs.from_role)) {
          errors.push(`role "${role.id}" 的 inputs.from_role 引用了不存在的 role "${inputs.from_role}"`)
        }
        if (inputs.output) {
          const sourceRole = roles.find(r => r.id === inputs.from_role)
          if (sourceRole) {
            const outputExists = (sourceRole.outputs || []).some(o => {
              const outputName = o.name || o.path?.split('/').pop()?.replace(/\.md$/, '') || ''
              return outputName === inputs.output
            })
            if (!outputExists) {
              errors.push(`role "${role.id}" 的 inputs.from_role "${inputs.from_role}" 没有名为 "${inputs.output}" 的 output`)
            }
          }
        }
        if (!deps.includes(inputs.from_role)) {
          errors.push(`role "${role.id}" 的 inputs.from_role "${inputs.from_role}" 未在 depends_on 中声明`)
        }
      }
    } else {
      // inputs is an array (legacy format)
      for (const input of inputs) {
        if (input.from_role) {
          if (!roleIds.has(input.from_role)) {
            errors.push(`role "${role.id}" 的 inputs.from_role 引用了不存在的 role "${input.from_role}"`)
          }
          if (!deps.includes(input.from_role)) {
            errors.push(`role "${role.id}" 的 inputs.from_role "${input.from_role}" 未在 depends_on 中声明`)
          }
        }
      }
    }
  }
  return errors
}

/**
 * 列出所有可用 workflow
 */
export function listWorkflows(cwd) {
  const wfDir = join(cwd, '.sillyspec', 'workflows')
  if (!existsSync(wfDir)) return []
  const files = readdirSync(wfDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
  return files.map(f => f.replace(/\.(yaml|yml)$/, ''))
}

// ─── 占位符替换 ───

/**
 * 替换 workflow YAML 中的 <project> 占位符
 * @param {object} wf - workflow 定义（会被修改）
 * @param {string} projectName - 项目名
 */
function replaceProjectPlaceholder(wf, projectName) {
  const json = JSON.stringify(wf)
  const replaced = json.replace(/<project>/g, projectName)
  return JSON.parse(replaced)
}

// ─── Post Check ───

/**
 * 检查结果项
 * @typedef {{ role: string, output: string, path: string, check: string, passed: boolean, detail?: string }} CheckResult
 */

/**
 * 对单个 output 运行检查
 * @param {object} outputDef - output 定义
 * @param {string} basePath - 被检查的文件所在目录
 * @param {string} cwd - 项目根目录
 * @returns {CheckResult}
 */
function checkOutput(outputDef, projectName, cwd) {
  // 将 <project> 替换为实际项目名
  const rawPath = (outputDef.path || '').replace(/<project>/g, projectName)
  const fullPath = resolve(cwd, rawPath)
  const checks = outputDef.checks || []
  const results = []

  for (const check of checks) {
    switch (check.type) {
      case 'file_exists': {
        const exists = existsSync(fullPath)
        results.push({ passed: exists, check: 'file_exists', detail: exists ? '' : `文件不存在: ${rawPath}` })
        break
      }
      case 'no_empty_files': {
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf8')
          const empty = content.trim().length === 0
          results.push({ passed: !empty, check: 'no_empty_files', detail: empty ? `文件为空: ${rawPath}` : '' })
        } else {
          results.push({ passed: false, check: 'no_empty_files', detail: `文件不存在: ${rawPath}` })
        }
        break
      }
      case 'min_lines': {
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf8')
          const lines = content.split('\n').length
          const min = check.min || 1
          results.push({ passed: lines >= min, check: `min_lines(${min})`, detail: lines >= min ? '' : `文件只有 ${lines} 行，要求至少 ${min} 行: ${rawPath}` })
        } else {
          results.push({ passed: false, check: `min_lines(${check.min || 1})`, detail: `文件不存在: ${rawPath}` })
        }
        break
      }
      case 'contains_sections': {
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf8')
          const sections = check.sections || []
          const missing = sections.filter(s => !content.includes(`## ${s}`))
          results.push({ passed: missing.length === 0, check: 'contains_sections', detail: missing.length > 0 ? `缺少章节: ${missing.join(', ')} — ${rawPath}` : '' })
        } else {
          results.push({ passed: false, check: 'contains_sections', detail: `文件不存在: ${rawPath}` })
        }
        break
      }
      case 'no_placeholder': {
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf8')
          const patterns = check.patterns || ['待补充', 'TODO', 'TBD', '未分析', '根据项目情况', '根据实际情况', '按需填写']
          // 只匹配独立成行的占位文本，不匹配行内引用
          const lineMatches = patterns.filter(p => {
            const regex = new RegExp(`^\s*[-*]?\s*${p}\s*$`, 'm')
            return regex.test(content)
          })
          results.push({ passed: lineMatches.length === 0, check: 'no_placeholder', detail: lineMatches.length > 0 ? `包含占位文本: ${lineMatches.map(m => `"${m}"`).join(', ')} — ${rawPath}` : '' })
        } else {
          results.push({ passed: false, check: 'no_placeholder', detail: `文件不存在: ${rawPath}` })
        }
        break
      }
      default:
        results.push({ passed: true, check: check.type, detail: `未知检查类型，跳过: ${check.type}` })
    }
  }

  return results
}

/**
 * 运行 workflow 的 post_check
 * @param {object} wf - workflow 定义
 * @param {string} cwd - 项目根目录
 * @param {string} projectName - 项目名
 * @returns {{ passed: boolean, roleResults: Array<{ roleId: string, roleName: string, passed: boolean, failures: string[] }>, workflowFailures: string[] }}
 */
/**
 * 统一的 Workflow Check 结果协议
 * CLI 和 run.js 共用同一份结构化结果
 *
 * 返回结构：
 * {
 *   workflow: string,       // workflow 名称
 *   project: string,        // 项目名
 *   status: 'pass'|'fail', // 总体状态
 *   spec_version: number,   // spec 版本
 *   roles: [{ id, name, status, outputs: [{ path, status, checks: [{ type, status, detail }] }] }],
 *   workflow_checks: [{ type, status, detail }],
 *   failures: [{ level: 'role'|'workflow', role_id?, output?, check, message }],
 *   retry_prompts: [{ role_id, role_name, prompt }]
 * }
 */
export function runPostCheck(wf, cwd, projectName, placeholders = {}) {
  let resolved = replaceProjectPlaceholder(wf, projectName)
  if (Object.keys(placeholders).length > 0) {
    let json = JSON.stringify(resolved)
    for (const [key, value] of Object.entries(placeholders)) {
      json = json.replace(new RegExp(`<${key}>`, 'g'), value)
    }
    resolved = JSON.parse(json)
  }
  return _checkWorkflow(resolved, cwd, projectName)
}

function _checkWorkflow(wf, cwd, projectName) {
  const workflowName = wf.name || 'unknown'
  const specVersion = wf.spec_version || wf.version || 0
  const workflowChecks = wf.checks?.workflow_level || []
  const roles = []
  const failures = []
  const workflowCheckResults = []

  // 1. 角色级别检查
  for (const role of wf.roles || []) {
    const roleId = role.id
    const roleName = role.name || roleId
    const outputDefs = role.outputs || []
    const outputs = []

    for (const outputDef of outputDefs) {
      const rawPath = (outputDef.path || '').replace(/<project>/g, projectName)
      const checkResults = checkOutput(outputDef, projectName, cwd)
      const outputPassed = checkResults.every(c => c.passed)

      outputs.push({
        path: rawPath,
        status: outputPassed ? 'pass' : 'fail',
        checks: checkResults.map(c => ({
          type: c.check,
          status: c.passed ? 'pass' : 'fail',
          detail: c.detail
        }))
      })

      for (const cr of checkResults) {
        if (!cr.passed) {
          failures.push({
            level: 'role',
            role_id: roleId,
            output: rawPath,
            check: cr.check,
            message: cr.detail
          })
        }
      }
    }

    const rolePassed = outputs.every(o => o.status === 'pass')
    roles.push({
      id: roleId,
      name: roleName,
      status: rolePassed ? 'pass' : 'fail',
      outputs
    })
  }

  // 2. 工作流级别检查
  for (const check of workflowChecks) {
    switch (check.type) {
      case 'file_count': {
        const scanDir = join(cwd, '.sillyspec', 'docs', projectName, check.path || 'scan/')
        if (existsSync(scanDir)) {
          const files = readdirSync(scanDir).filter(f => f.endsWith('.md'))
          const min = check.min || 0
          if (files.length < min) {
            const detail = `文件数不足: ${scanDir} 有 ${files.length} 个 .md 文件，要求至少 ${min} 个`
            workflowCheckResults.push({ type: 'file_count', status: 'fail', detail })
            failures.push({ level: 'workflow', check: 'file_count', message: detail })
          } else {
            workflowCheckResults.push({ type: 'file_count', status: 'pass', detail: '' })
          }
        } else {
          const detail = `目录不存在: ${scanDir}`
          workflowCheckResults.push({ type: 'file_count', status: 'fail', detail })
          failures.push({ level: 'workflow', check: 'file_count', message: detail })
        }
        break
      }
      case 'no_empty_files': {
        const scanDir = join(cwd, '.sillyspec', 'docs', projectName, check.path || 'scan/')
        if (existsSync(scanDir)) {
          const files = readdirSync(scanDir).filter(f => f.endsWith('.md'))
          let anyEmpty = false
          for (const f of files) {
            const content = readFileSync(join(scanDir, f), 'utf8')
            if (content.trim().length === 0) {
              const detail = `空文件: ${join(scanDir, f)}`
              workflowCheckResults.push({ type: 'no_empty_files', status: 'fail', detail })
              failures.push({ level: 'workflow', check: 'no_empty_files', message: detail })
              anyEmpty = true
            }
          }
          if (!anyEmpty) {
            workflowCheckResults.push({ type: 'no_empty_files', status: 'pass', detail: '' })
          }
        } else {
          const detail = `目录不存在: ${scanDir}`
          workflowCheckResults.push({ type: 'no_empty_files', status: 'fail', detail })
          failures.push({ level: 'workflow', check: 'no_empty_files', message: detail })
        }
        break
      }
      default:
        workflowCheckResults.push({ type: check.type, status: 'pass', detail: '' })
    }
  }

  const allPassed = roles.every(r => r.status === 'pass') && workflowCheckResults.every(c => c.status === 'pass')

  // 生成 retry prompts
  const retryPrompts = []
  if (!allPassed) {
    for (const role of roles.filter(r => r.status === 'fail')) {
      const roleFailures = failures.filter(f => f.role_id === role.id)
      const targetFiles = [...new Set(roleFailures.map(f => f.output).filter(Boolean))]
      const roleDef = (wf.roles || []).find(r => r.id === role.id)
      const constraints = roleDef?.constraints || []
      let prompt = `上一次 workflow 执行存在失败项，请重试。\n\n`
      prompt += `### 失败角色：${role.name} (${role.id})\n失败原因：\n`
      for (const f of roleFailures) {
        prompt += `- ${f.message}\n`
      }
      prompt += `\n`
      for (const fp of targetFiles) {
        prompt += `目标文件：\`${fp}\`\n`
      }
      if (constraints.length > 0) {
        prompt += `约束：\n`
        for (const c of constraints) {
          prompt += `- ${c}\n`
        }
      }
      prompt += `\n⚠️ 你必须确保文件写入指定路径。不要只报告完成，请用 write 工具实际写入。`
      retryPrompts.push({ role_id: role.id, role_name: role.name, prompt })
    }
  }

  return {
    workflow: workflowName,
    project: projectName,
    status: allPassed ? 'pass' : 'fail',
    spec_version: specVersion,
    roles,
    workflow_checks: workflowCheckResults,
    failures,
    retry_prompts: retryPrompts
  }
}

/**
 * 格式化检查结果为人类可读报告（兼容旧接口）
 */
export function formatCheckReport(result) {
  const lines = []
  lines.push('\n📋 Workflow Post-Check 报告\n')

  for (const r of (result.roles || [])) {
    const icon = r.status === 'pass' ? '✅' : '❌'
    lines.push(`${icon} ${r.name} (${r.id})`)
    // 兼容新旧格式
    const outputFailures = (r.outputs || []).flatMap(o =>
      (o.checks || []).filter(c => c.status === 'fail').map(c => c.detail)
    )
    for (const f of outputFailures) {
      lines.push(`   └─ ${f}`)
    }
  }

  if ((result.workflow_checks || []).some(c => c.status === 'fail')) {
    lines.push('')
    for (const c of result.workflow_checks) {
      if (c.status === 'fail') {
        lines.push(`❌ 全局检查失败: ${c.detail}`)
      }
    }
  }

  if (result.status === 'pass') {
    lines.push('\n✅ 全部检查通过')
  } else {
    lines.push('\n❌ 存在失败项，请根据以下重试提示修复：')
  }

  return lines.join('\n')
}

// ─── 兼容适配层 ───

/**
 * 兼容旧接口：generateRetryPrompt
 * @deprecated 直接用 runPostCheck 返回的 retry_prompts
 */
export function generateRetryPrompt(wf, checkResult, projectName) {
  const resolved = replaceProjectPlaceholder(wf, projectName)
  const lines = []
  lines.push('上一次 workflow 执行存在失败项，请重试。\n')

  const roles = resolved.roles || []
  const roleResults = checkResult.roles || []
  for (const r of roleResults) {
    if (r.status === 'pass') continue
    const role = roles.find(rl => rl.id === r.id)
    if (!role) continue

    lines.push(`### 失败角色：${r.name} (${r.id})`)
    lines.push(`失败原因：`)
    const roleFailures = (checkResult.failures || []).filter(f => f.role_id === r.id)
    for (const f of roleFailures) {
      lines.push(`- ${f.message}`)
    }
    lines.push('')

    for (const output of (role.outputs || [])) {
      lines.push(`目标文件：\`${output.path}\``)
    }

    if (role.constraints && role.constraints.length > 0) {
      lines.push('约束：')
      for (const c of role.constraints) {
        lines.push(`- ${c}`)
      }
    }

    lines.push('')
    lines.push('⚠️ 你必须确保文件写入指定路径。不要只报告完成，请用 write 工具实际写入。')
    lines.push('')
  }

  return lines.join('\n')
}

// ─── Role Prompt 生成（Level 2）───

/**
 * 根据 workflow role 定义生成子代理 prompt
 * @param {object} wf - workflow 定义
 * @param {string} roleId - 角色ID
 * @param {string} projectName - 项目名
 * @param {object} context - 额外上下文（envSummary, missingDocs 等）
 * @returns {string|null} 生成的 prompt，或 null（角色不存在）
 */
export function generateRolePrompt(wf, roleId, projectName, context = {}) {
  const resolved = replaceProjectPlaceholder(wf, projectName)
  const role = (resolved.roles || []).find(r => r.id === roleId)
  if (!role) return null

  const lines = []
  lines.push(`## 子代理任务：${role.name} (${roleId})`)
  lines.push('')
  lines.push(`项目：${projectName}`)

  // 任务描述
  if (role.task) {
    lines.push(`任务：${role.task}`)
  }

  // 依赖角色的输出（depends_on + from_role）
  const deps = role.depends_on || []
  if (deps.length > 0) {
    lines.push('')
    lines.push('前置依赖（已完成角色的输出）：')
    const inputs = role.inputs || {}
    for (const depId of deps) {
      const depRole = (resolved.roles || []).find(r => r.id === depId)
      if (!depRole) continue
      if (inputs.from_role === depId) {
        lines.push(`- ${depRole.name}（${depId}）：${inputs.output_description || ''}`)
        if (inputs.output) {
          const depOutput = (depRole.outputs || []).find(o => {
            const outputName = o.name || o.path?.split('/').pop()?.replace(/\.md$/, '') || ''
            return outputName === inputs.output
          })
          if (depOutput) {
            lines.push(`  输出文件：${depOutput.path}`)
          }
        }
      } else {
        lines.push(`- ${depRole.name}（${depId}）`)
        for (const o of (depRole.outputs || [])) {
          lines.push(`  输出：${o.path}`)
        }
      }
    }
  }

  // 输入提示
  const inputs = role.inputs || {}
  const inputPaths = inputs.paths || []
  const inputHints = inputs.hints || {}
  if (inputPaths.length > 0) {
    lines.push('')
    lines.push('搜索范围：')
    for (const p of inputPaths) {
      lines.push(`- ${p}`)
    }
  }
  if (inputHints.grep_patterns && inputHints.grep_patterns.length > 0) {
    lines.push('')
    lines.push('搜索关键词：')
    lines.push(`- ${inputHints.grep_patterns.join(', ')}`)
  }

  // 额外上下文
  if (context.envSummary) {
    lines.push('')
    lines.push('环境探测结果：')
    lines.push(context.envSummary)
  }
  if (context.missingDocs) {
    lines.push('')
    lines.push('缺失文档列表：')
    lines.push(context.missingDocs)
  }

  // 输出目标
  const outputs = role.outputs || []
  lines.push('')
  lines.push('目标文件：')
  for (const o of outputs) {
    lines.push(`- \`${o.path}\``)
  }

  // 约束
  if (role.constraints && role.constraints.length > 0) {
    lines.push('')
    lines.push('约束：')
    for (const c of role.constraints) {
      lines.push(`- ${c}`)
    }
  }

  // 检查要求（告诉子代理需要满足什么）
  for (const o of outputs) {
    const checks = o.checks || []
    for (const check of checks) {
      if (check.type === 'contains_sections' && check.sections) {
        lines.push('')
        lines.push(`必须包含章节：${check.sections.map(s => `"## ${s}"`).join(', ')}`)
      }
      if (check.type === 'min_lines') {
        lines.push(`文件长度要求：至少 ${check.min} 行`)
      }
    }
  }

  lines.push('')
  lines.push('⚠️ 必须用 write 工具将文件写入磁盘！写完后用 read 工具确认文件存在！')

  return lines.join('\n')
}

/**
 * 为 workflow 的所有角色生成 role prompts
 * @param {object} wf - workflow 定义
 * @param {string} projectName - 项目名
 * @param {object} context - 额外上下文
 * @returns {Array<{ roleId: string, roleName: string, prompt: string }>}
 */
export function generateAllRolePrompts(wf, projectName, context = {}) {
  const resolved = replaceProjectPlaceholder(wf, projectName)
  const roles = resolved.roles || []
  return roles.map(role => ({
    roleId: role.id,
    roleName: role.name || role.id,
    prompt: generateRolePrompt(resolved, role.id, projectName, context)
  }))
}

// ─── Workflow Run 归档 ───


/**
 * 将 workflow check 结果归档到 .sillyspec/.runtime/workflow-runs/
 * @param {object} result - runPostCheck 返回的结构化结果
 * @param {object} options
 * @param {string} options.cwd - 项目根目录
 * @param {string} [options.source] - 调用来源（'run.js' / 'cli'）
 * @param {string} [options.stage] - 阶段名（scan/archive）
 * @param {string} [options.step] - 步骤名
 * @returns {string|null} 保存路径，失败返回 null
 */
export function saveWorkflowRun(result, options = {}) {
  const { cwd = '.', source = 'unknown', stage, step, runtimeRoot, scanRunId } = options
  // 平台模式：写入 runtime-root/scan-runs/<scan-run-id>/workflow-runs/
  // 本地模式：写入 cwd/.sillyspec/.runtime/workflow-runs/
  const runDir = runtimeRoot
    ? join(runtimeRoot, 'scan-runs', scanRunId || 'unknown', 'workflow-runs')
    : join(cwd, '.sillyspec', '.runtime', 'workflow-runs')
  try {
    mkdirSync(runDir, { recursive: true })
  } catch (e) {
    console.warn('⚠️ 无法创建 workflow-runs 目录:', e.message)
    return null
  }

  const now = new Date()
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const filename = `${ts}-${result.workflow || 'unknown'}-${result.project || 'default'}-${result.status}.json`
  const filepath = join(runDir, filename)

  const record = {
    run_id: filename.replace('.json', ''),
    created_at: now.toISOString(),
    source,
    ...(stage ? { stage } : {}),
    ...(step ? { step } : {}),
    workflow: result.workflow,
    project: result.project,
    status: result.status,
    spec_version: result.spec_version,
    roles: result.roles,
    workflow_checks: result.workflow_checks,
    failures: result.failures,
    retry_prompts: result.retry_prompts
  }

  try {
    writeFileSync(filepath, JSON.stringify(record, null, 2), 'utf8')
    return filepath
  } catch (e) {
    console.warn('⚠️ 保存 workflow run 失败:', e.message)
    return null
  }
}
