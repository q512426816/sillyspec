/**
 * run/prompt.js（W6 Step3 从 run.js 抽出）。
 *
 * prompt 渲染主干：outputStep（步骤 prompt 组装 + 占位符替换 + 平台/scanProfile/
 * 模块上下文/铁律注入）+ applyRootPlaceholders（{SPEC_ROOT}/{DOCS_ROOT}/{PROJECTS_ROOT}/
 * {WORKFLOWS_ROOT}/{KNOWLEDGE_ROOT} 路径根占位符替换，平台/常规模式共用）+
 * loadModuleContextIndex/buildModuleContextInjection/parseModuleMapSimple
 * （_module-map.yaml 模块上下文匹配注入，仅 outputStep 用）。
 *
 * 安全锚：run.js 始终 barrel。outputStep + applyRootPlaceholders 由 run.js import 回来；
 * _outputStepForTest（output-step-render 测试）+ applyRootPlaceholders（prompt-placeholders
 * 测试）被 test 直接 import，run.js barrel re-export 契约保留。
 *
 * 路径修正（相对 src/run/）：
 *   - stageRegistry 从 '../stages/index.js'；resolvePromptIncludes/safeGit/WAIT_MARKER_RE 从 './shared.js'
 *   - 动态 import './knowledge-match.js'/'./task-review.js'/'./review-tier.js'/'./stage-review.js' → '../X.js'（src/ 下，退一层）
 *   - 删除 outputStep 内死代码 `const { execSync } = await import('child_process')`（execSync 解构未用，实际走 safeGit）
 *   - loadModuleContextIndex/buildModuleContextInjection 内 require('fs'/'path') 改顶部静态 import
 */
import { basename, join } from 'node:path'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { stageRegistry } from '../stages/index.js'
import { resolvePromptIncludes, resolveRuntimeRoot, safeGit, WAIT_MARKER_RE } from './shared.js'
import { renderStageContract } from '../stage-contract-spec.js'
import { parseModuleMapSimple } from '../modules.js'
import { REVIEW_SCHEMA_VERSION } from '../task-review.js'

/**
 * 从 _module-map.yaml 读取模块上下文索引
 * 用于 brainstorm/plan/execute 阶段按任务命中模块精准注入上下文
 *
 * @param {string} specBase - 规范目录（.sillyspec 或 specRoot）
 * @param {string} projectName - 项目名
 * @returns {object|null} 解析后的模块索引，null 表示无索引
 */
function loadModuleContextIndex(specBase, projectName) {
  try {
    const mapPath = join(specBase, 'docs', projectName, 'modules', '_module-map.yaml')
    if (!existsSync(mapPath)) return null
    const content = readFileSync(mapPath, 'utf8')
    // schema_version 校验（advisory）：modules.js 写 schema_version: 2；缺失或非 2 → warn，
    // 提示 v1/v2 格式混用风险（旧格式字段解析会静默错位）。正常生成的文件不触发。
    const sv = content.match(/^schema_version:\s*(\d+)/m)
    if (!sv) {
      console.warn(`⚠️  _module-map.yaml 缺少 schema_version 声明（期望 2），模块解析可能错位：${mapPath}（跑 \`sillyspec modules rebuild\` 升级到 schema_version: 2 可消除此警告）`)
    } else if (sv[1] !== '2') {
      console.warn(`⚠️  _module-map.yaml schema_version=${sv[1]}（期望 2），可能为旧格式，模块解析可能错位：${mapPath}（跑 \`sillyspec modules rebuild\` 升级到 schema_version: 2 可消除此警告）`)
    }
    return parseModuleMapSimple(content)
  } catch {
    return null
  }
}

/**
 * 根据 AI 输出的任务描述，匹配相关模块并生成上下文注入文本
 * 匹配策略：模块 id / role / doc 路径中的关键词
 *
 * @param {string} taskDescription - 任务描述（来自 plan.md / step prompt / outputText）
 * @param {object} moduleIndex - loadModuleContextIndex 返回值
 * @param {string} specBase - 规范目录
 * @param {string} projectName - 项目名
 * @returns {string} 上下文注入文本，空字符串表示无匹配模块
 */
function buildModuleContextInjection(taskDescription, moduleIndex, specBase, projectName) {
  if (!moduleIndex || !taskDescription) return ''

  const taskLower = taskDescription.toLowerCase()
  const matched = []

  for (const [moduleId, data] of Object.entries(moduleIndex)) {
    let score = 0
    let matchReasons = []
    // 模块 id 匹配
    if (taskLower.includes(moduleId.toLowerCase())) { score += 3; matchReasons.push(`id:${moduleId}`) }
    // role 描述匹配
    if (data.role && taskLower.includes(data.role.toLowerCase())) { score += 2; matchReasons.push('role') }
    // core_files 路径匹配
    const coreFiles = data.paths || data.core_files || []
    for (const p of coreFiles) {
      if (taskLower.includes(p.toLowerCase())) { score += 1; matchReasons.push(`file:${p}`); break }
    }
    if (score > 0) matched.push({ moduleId, data, score, matchReasons })
  }

  if (matched.length === 0) return ''

  matched.sort((a, b) => b.score - a.score)

  let injection = '\n### 📦 模块上下文（按相关性排序，来自 Module Context Index）\n\n'
  injection += `> 以下模块上下文由 scan 阶段生成的 _module-map.yaml 自动匹配。\n`
  injection += `> Matched modules: ${matched.map(m => m.moduleId).join(', ')}\n`
  injection += `> Reasons: ${matched.map(m => m.matchReasons.join(', ')).join('; ')}\n\n`

  for (const { moduleId, data } of matched) {
    injection += `#### ${moduleId}\n`
    if (data.role) injection += `- **职责**: ${String(data.role).slice(0, 100)}\n`
    const riskLevel = data.risk_level || 'medium'
    injection += `- **风险等级**: ${riskLevel}\n`
    const coreFiles = data.paths || data.core_files || []
    if (coreFiles.length > 0) injection += `- **核心文件**: ${coreFiles.join(', ')}\n`
    if (data.doc) {
      const docPath = join(specBase, 'docs', projectName, data.doc)
      const exists = existsSync(docPath)
      injection += `- **模块文档**: ${data.doc}${exists ? ' ✅' : ' ⚠️ 不存在'}\n`
    }
    const deps = data.depends_on || []
    if (deps.length > 0) injection += `- **依赖**: ${deps.join(', ')}\n`
    const usedBy = data.used_by || []
    if (usedBy.length > 0) injection += `- **被引用**: ${usedBy.join(', ')}\n`
    injection += '\n'
  }

  return injection
}

// parseModuleMapSimple 复用 modules.js 的 canonical 实现（合并历史 copy-paste 副本，2026-08-07；
// 无循环依赖：modules.js 仅 import fs/path/db.js，prompt.js → modules.js 单向）。
/**
 * 输出当前步骤的 prompt
 */
export async function outputStep(stageName, stepIndex, steps, cwd, changeName, dbProjectName, platformOpts = {}, prevStepAnswer = null) {
  const step = steps[stepIndex]
  const total = steps.length
  // ── 越界防御 ──
  // steps/defSteps 来自 getStageSteps（如 buildPlanSteps），其长度可能与 progress.steps
  // 不一致（例如平台模式下 changeDir 解析失败导致 buildPlanSteps(null) 只返回 2 步 fixedPrefix）。
  // 此时 stepIndex 可能越界，访问 step.name 会 TypeError 崩溃。降级处理而非崩溃。
  if (!step) {
    console.error(`⚠️  无法输出步骤 ${stepIndex + 1}/${total}：步骤定义缺失`)
    console.error(`   stage=${stageName} stepIndex=${stepIndex} defSteps.length=${steps.length}`)
    console.error(`   可能原因：平台模式下 getStageSteps 未传 specRoot，或 plan/execute 步骤动态生成后 defSteps 未同步。`)
    console.error(`   请检查 --change 指定的变更目录是否存在、specRoot 是否正确，然后重试。`)
    return false
  }
  const projectName = dbProjectName || basename(cwd)

  // ── Revision context injection ──
  const revisionCtx = platformOpts?._revision
  if (revisionCtx) {
    console.log(`### 🔄 Revision Context`)
    console.log(`本阶段处于修订模式（revision ${revisionCtx.revision}），不是首次执行。`)
    console.log(`- 修订起始步骤：${revisionCtx.fromStep}`)
    console.log(`- 当前步骤之前已完成的步骤仍然有效，不需要重做。`)
    console.log(`- 当前步骤及之后的步骤需要重新生成或调整已有产物。`)
    console.log(`- 已有产物文件（design.md、plan.md 等）被保留，审视并更新它们，而不是从零创建。`)
    console.log(`- 不要绕过 CLI 进度追踪。\n`)
  }

  const personas = {
    brainstorm: `### 🎯 你的角色：资深架构师
你是一位有 15 年经验的系统架构师。先理解业务本质，再设计技术方案。决策附理由，方案列 trade-off。不确定就说不确定，不猜。`,
    plan: `### 📋 你的角色：技术项目经理
你是一位经验丰富的技术项目经理。任务拆解粒度均匀，依赖关系明确。每个任务有完成标准，Wave 间有依赖说明。条理清晰，不做模糊描述。`,
    execute: `### 💻 你的角色：高级工程师
你是一位严谨的高级工程师。先读规范再写代码，严格遵循 CONVENTIONS.md 和 plan.md。**你不是设计师，是执行者——按 plan 搬砖，禁止发散思维。** 发现 plan 不合理就停下来反馈，不要自己改方案。代码有清晰职责划分，边界处理完善。少说多做，遇到规范冲突优先问。`,
    verify: `### 🔍 你的角色：QA 专家
你是一位吹毛求疵的 QA 专家。假设所有代码都有 bug，用最坏情况测试。关注边界、异常、并发。有问题直说，用证据说话，不写"看起来没问题"。`,
    quick: `### 💻 你的角色：全栈老兵
你是一位实战经验丰富的全栈工程师。不纠结架构和流程，理解需求就直接干。不确定的地方先问清楚再动手，先读后写，改完就收。问题排查思路开阔，前端报错不一定是前端问题——可能是后端数据、浏览器兼容、甚至设备硬件。解决方案实用接地气，用户描述有误敢于直接指出。`,
    explore: `### 🧭 你的角色：技术探索伙伴
你帮助用户澄清问题、调查代码库、比较方案和暴露风险。探索阶段不写实现代码，不安装依赖，不把讨论强行推进成开发。`
  }

  console.log(`---`)
  console.log(`stage: ${stageName}`)
  console.log(`step: ${stepIndex + 1}/${total}`)
  console.log(`stepName: ${step.name}`)
  console.log(`project: ${projectName}`)
  if (changeName) {
    console.log(`change: ${changeName}`)
    const isPlatform = platformOpts?.specRoot || platformOpts?.runtimeRoot
    const changeDirBase = isPlatform ? platformOpts.specRoot : '.sillyspec'
    const changeDir = join(changeDirBase, 'changes', changeName)
    console.log(`changeDir: ${changeDir}`)
  }
  console.log(`---\n`)
  // persona 只在 stage 首步注入（step0）——角色设定一次即可，后续 step 重复注入纯属 token 浪费
  if (personas[stageName] && stepIndex === 0) {
    console.log(personas[stageName])
    console.log('')
  }
  // 注入全局护栏（如 _globalGuardrails）
  const stageDef = stageRegistry[stageName]
  const guardrails = stageDef && stageDef._globalGuardrails ? stageDef._globalGuardrails : ''

  console.log(`## Step ${stepIndex + 1}/${total}: ${step.name}\n`)
  if (guardrails) {
    if (stepIndex === 0) {
      console.log(guardrails.trim())
      console.log('')
    } else {
      // 护栏已在首步全文注入并留在 context；后续步只留一行精简提醒——
      // 防 context 压缩后 agent 遗忘安全约束（如 verify 禁破坏性 git/源码操作），又避免每步重复 ~1KB。
      console.log(`⛔ 本阶段护栏生效中（禁止破坏性操作，详见首步护栏）\n`)
    }
  }
  // 先解析 {{include: name}}（把外部模板片段拉进 prompt），再做下方占位符替换，
  // 保证模板内容里的 {SPEC_ROOT}/<change-name> 等也能被替换
  let promptText = resolvePromptIncludes(step.prompt)
  // 替换 prompt 中的占位符
  if (projectName && promptText.includes('<project>')) {
    promptText = promptText.replace(/<project>/g, projectName)
  }
  // 替换 <git-user> 占位符
  if (promptText.includes('<git-user>')) {
    try {
      const gitUser = safeGit(cwd, ['config', 'user.name']).value || 'unknown'
      promptText = promptText.replace(/<git-user>/g, gitUser)
    } catch {
      promptText = promptText.replace(/<git-user>/g, 'unknown')
    }
  }
  // 替换时间戳占位符
  const now = new Date()
  const nowDatetime = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0')
  const nowTimestamp = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0') + String(now.getSeconds()).padStart(2,'0')
  const nowDate = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0')
  promptText = promptText.replace(/<now-datetime>/g, nowDatetime)
  promptText = promptText.replace(/<now-timestamp>/g, nowTimestamp)
  promptText = promptText.replace(/<now-date>/g, nowDate)
  // 替换 {REVIEW_SCHEMA_VERSION} 占位符（task review 示例模板用，值=CLI 当前 REVIEW_SCHEMA_VERSION 常量，
  // 避免 agent 照抄 design 目标版本与 CLI 写侧常量漂移；与 stage review 契约 renderReviewJsonContract 动态注入同源）
  if (promptText.includes('{REVIEW_SCHEMA_VERSION}')) {
    promptText = promptText.replace(/\{REVIEW_SCHEMA_VERSION\}/g, String(REVIEW_SCHEMA_VERSION))
  }
  // 替换 <change-name> 占位符
  if (changeName && promptText.includes('<change-name>')) {
    promptText = promptText.replace(/<change-name>/g, changeName)
  }
  // 替换 <quick-session-id> 占位符（quick 阶段专用：sessionId == changeName == quick-<uuid8>，
  // 见 runStage 参数解析 quickSessionId 生成。告知 agent 本会话 id + --done 需带 --change）
  if (changeName && promptText.includes('<quick-session-id>')) {
    promptText = promptText.replace(/<quick-session-id>/g, changeName)
  }
  // 替换 <quicklog-id> 占位符（quick 阶段：从 session guard.json 读 CLI 分配的 ql-ID，
  // 供 agent 在模块文档变更索引等处引用）
  if (promptText.includes('<quicklog-id>')) {
    const specBaseQl = platformOpts?.specRoot || join(cwd, '.sillyspec')
    let qlIdVal = ''
    try {
      const sessionGuardFile = join(specBaseQl, '.runtime', 'quick-sessions', changeName, 'guard.json')
      if (existsSync(sessionGuardFile)) {
        qlIdVal = JSON.parse(readFileSync(sessionGuardFile, 'utf8')).quicklogId || ''
      }
    } catch {}
    promptText = promptText.replace(/<quicklog-id>/g, qlIdVal || '(未分配)')
  }
  // 替换 <linked-changes> 占位符（quick 阶段：从 .runtime/quick-sessions/<sessionId>/guard.json 读关联变更）
  if (promptText.includes('<linked-changes>')) {
    const specBaseLc = platformOpts?.specRoot || join(cwd, '.sillyspec')
    let linkedChanges = []
    try {
      // D-002：guard 按 session 存。changeName == quick-<uuid8>（见 runStage 参数解析）。回退读旧单文件（兼容 task-03 前）
      const sessionGuardFile = join(specBaseLc, '.runtime', 'quick-sessions', changeName, 'guard.json')
      const legacyGuardFile = join(specBaseLc, '.runtime', 'quick-guard.json')
      const guard = existsSync(sessionGuardFile)
        ? JSON.parse(readFileSync(sessionGuardFile, 'utf8'))
        : (existsSync(legacyGuardFile) ? JSON.parse(readFileSync(legacyGuardFile, 'utf8')) : null)
      if (guard) linkedChanges = Array.isArray(guard.linkedChanges) ? guard.linkedChanges : []
    } catch {}
    const display = linkedChanges.length > 0 ? linkedChanges.join(', ') : '（无）'
    promptText = promptText.replace(/<linked-changes>/g, display)
  }
  // 平台模式：注入路径覆盖指令
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) {
    const projectName = dbProjectName || basename(cwd)
    // platformOpts.specRoot 现在指向 specDir 本身（可能是 cwd/.sillyspec 或外部路径）
    const specSillyspec = platformOpts.specRoot || join(cwd, '.sillyspec')
    const docsRoot = join(specSillyspec, 'docs', projectName)
    const projectsRoot = join(specSillyspec, 'projects')
    const changesRoot = join(specSillyspec, 'changes')
    const workflowsRoot = join(specSillyspec, 'workflows')
    const knowledgeRoot = join(specSillyspec, 'knowledge')

    promptText = applyRootPlaceholders(promptText, { specRoot: specSillyspec, docsRoot, projectsRoot, workflowsRoot, knowledgeRoot })

    const platformDirectives = []
    platformDirectives.push(
      `## ⚠️ 平台模式 — 写入路径约束（必须严格遵守）\n` +
      `\n` +
      `规范目录（specDir）: \`${specSillyspec}\`\n` +
      `- 文档根目录: \`${docsRoot}/\`\n` +
      `- 项目注册表: \`${projectsRoot}/\`\n` +
      `- 变更目录: \`${changesRoot}/\`\n` +
      `- 工作流目录: \`${workflowsRoot}/\`\n` +
      `- 术语目录: \`${knowledgeRoot}/\`\n` +
      `\n` +
      `### ⛔ 写入规则\n` +
      `1. **所有文档、配置、产物只能写入上述路径**。严禁写入源码目录或相对路径 \`.sillyspec/\`。\n` +
      `2. **不允许**从 cwd 推导文档路径，必须使用上面列出的绝对路径。\n` +
      `3. **源码扫描范围**必须排除：.sillyspec/、.claude/、.git/、node_modules/、dist/、build/、__pycache__/\n` +
      `4. **local.yaml 校验**：commands 中引用的命令必须在 package.json 的 scripts 中存在，不存在的标记为 unavailable，不能写 "配置良好"\n` +
      `\n` +
      `### ⛔ Write 工具规则\n` +
      `1. 如果 Write 返回 \"File has not been read yet\"，正确动作是：先 Read 目标文件 → 再 Write 覆盖。\n` +
      `2. **不允许**用 cat >、tee、heredoc 等 Bash 方式绕过 Write 工具。\n` +
      `3. 如果 Write 和 Read 均失败，记录失败并停止当前 step。\n` +
      `\n` +
      `### 📍 Workflow YAML 占位符映射（task-05）\n` +
      `读取 \`{WORKFLOWS_ROOT}/scan-docs.yaml\` 时，yaml 内的占位符按以下映射替换为绝对路径：\n` +
      `- \`{SPEC_ROOT}\` → \`${specSillyspec}\`（规范目录根）\n` +
      `- \`<project>\` → 当前项目名（见下方 step 提示，等于 \`${projectName}\`）\n` +
      `- 例：\`{SPEC_ROOT}/docs/<project>/scan/ARCHITECTURE.md\` → \`${docsRoot}/scan/ARCHITECTURE.md\`\n` +
      `\n` +
      `创建目录: \`mkdir -p ${docsRoot}/{scan,modules,flows} ${projectsRoot} ${changesRoot}\`\n`
    )
    if (platformOpts.runtimeRoot) {
      const scanRunId = platformOpts.scanRunId || 'scan-' + new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
      platformDirectives.push(
        `运行时产物写入: \`${platformOpts.runtimeRoot}/scan-runs/${scanRunId}/\`\n`
      )
    }
    if (platformOpts.workspaceId) {
      platformDirectives.push(`workspace_id: ${platformOpts.workspaceId}`)
    }
    // 平台 directives 前置条件：
    //   - step0（对齐 persona 仅 step0 策略）：路径列表/Write 规则/占位符映射一次建立即可；
    //   - scan 阶段所有 step：scan 的 profileDirectives 本就每步注入（见下方 L917），平台路径
    //     约束也需每步可见——否则 quick profile 的 step0 是 noAI preflight（自动执行），run scan
    //     输出的首个可见 step 是 step1，会漏掉 specDir 路径，导致平台模式写入约束丢失。
    //     后续 step 靠 changeDir header + footer 平台规则（L1077+）维持，platformDirectives
    //     每步重复约 500 tokens 仅在 scan（步数有限）可接受。
    if (stepIndex === 0 || stageName === 'scan') {
      promptText = platformDirectives.join('\n') + '\n\n' + promptText
    }
  } else {
    // 常规模式（无平台 specRoot）：占位符替换为 cwd/.sillyspec 下对应路径
    // 让用 {SPEC_ROOT}/{DOCS_ROOT} 等占位符的 prompt（如 quick/scan）在常规模式也写到正确位置
    const projectName = dbProjectName || basename(cwd)
    const specSillyspec = join(cwd, '.sillyspec')
    promptText = applyRootPlaceholders(promptText, {
      specRoot: specSillyspec,
      docsRoot: join(specSillyspec, 'docs', projectName),
      projectsRoot: join(specSillyspec, 'projects'),
      workflowsRoot: join(specSillyspec, 'workflows'),
      knowledgeRoot: join(specSillyspec, 'knowledge'),
    })
  }

  // 注入 scanProfile 硬约束指令
  if (stageName === 'scan' && platformOpts?.scanProfile) {
    const sp = platformOpts.scanProfile
    const profileDirectives = []
    profileDirectives.push(`## 📊 Scan Profile: ${sp.mode} (${sp.reason})`)
    if (sp.maxAgentCalls === 0) {
      profileDirectives.push(`**⛔ 严禁使用子代理（Agent/Task 工具）。** 必须在本 turn 内完成所有工作。`)
    } else if (sp.maxAgentCalls > 0) {
      profileDirectives.push(`**子代理上限：${sp.maxAgentCalls} 个。** 不要超出。`)
    }
    if (sp.maxDocs < 99) {
      profileDirectives.push(`**文档上限：${sp.maxDocs} 份。** 只生成核心文档，不要额外生成 flows/glossary/module-card。`)
    }
    profileDirectives.push(`--output 只需要列出文件名，不要写长篇总结。`)
    promptText = profileDirectives.join('\n') + '\n\n' + promptText

    // scanProfile 分支也要替换占位符（非 platform 模式也会走到这里）
    const _pName = dbProjectName || basename(cwd)
    const _specSS = platformOpts?.specRoot || join(cwd, '.sillyspec')
    const _docsRoot = join(_specSS, 'docs', _pName)
    promptText = applyRootPlaceholders(promptText, {
      specRoot: _specSS,
      docsRoot: _docsRoot,
      projectsRoot: join(_specSS, 'projects'),
      workflowsRoot: join(_specSS, 'workflows'),
      knowledgeRoot: join(_specSS, 'knowledge'),
    })
  } else {
    // 非 platform 模式也要替换占位符
    const projectName = dbProjectName || basename(cwd)
    const specSillyspec = join(cwd, '.sillyspec')
    const docsRoot = join(specSillyspec, 'docs', projectName)
    const projectsRoot = join(specSillyspec, 'projects')
    const workflowsRoot = join(specSillyspec, 'workflows')
    const knowledgeRoot = join(specSillyspec, 'knowledge')
    promptText = applyRootPlaceholders(promptText, { specRoot: specSillyspec, docsRoot, projectsRoot, workflowsRoot, knowledgeRoot })
  }

  // Knowledge hit report: execute 阶段注入匹配结果
  if (stageName === 'execute' && promptText.includes('{KNOWLEDGE_HIT_REPORT}')) {
    try {
      const { matchKnowledge } = await import('../knowledge-match.js')
      const effectiveSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
      const knowledgeDir = join(effectiveSpecBase, 'knowledge')
      // taskContext: changeName + plan.md task names for better matching
      let taskContext = changeName || ''
      if (changeName) {
        const planPath = join(effectiveSpecBase, 'changes', changeName, 'plan.md')
        try {
          const planContent = readFileSync(planPath, 'utf8')
          // match both "- [ ] task-01: title" and "## task-01: title" formats
          const taskLines = [...planContent.matchAll(/(?:^\- \[[ x]\] |^## )task-\d+[^:]*:?\s*(.+)/gm)]
          if (taskLines.length > 0) {
            taskContext += ' ' + taskLines.map(t => t[1]).join(' ')
          }
        } catch {}
      }
      const knowledgeResult = matchKnowledge(knowledgeDir, taskContext)
      promptText = promptText.replace(/\{KNOWLEDGE_HIT_REPORT\}/g, knowledgeResult.report)
      // 写入 runtime JSON
      const runtimeDir = join(effectiveSpecBase, '.runtime')
      mkdirSync(runtimeDir, { recursive: true })
      writeFileSync(join(runtimeDir, 'knowledge-hit-report.json'), JSON.stringify(knowledgeResult.json, null, 2) + '\n')
    } catch (e) {
      promptText = promptText.replace(/\{KNOWLEDGE_HIT_REPORT\}/g, 'Status: no matches (error: ' + e.message + ')')
    }
  }

  // Execute: 注入 currentExecuteRunId（从变更专属标记文件读取）
  if (stageName === 'execute' && promptText.includes('{EXECUTE_RUN_ID}')) {
    let runId = ''
    const execSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
    const runtimeRoot = resolveRuntimeRoot(platformOpts, execSpecBase)
    const runIdFile = join(runtimeRoot, `current-execute-run-id-${changeName}`)
    try {
      if (existsSync(runIdFile)) {
        runId = readFileSync(runIdFile, 'utf8').trim()
      }
    } catch {}
    if (!runId) {
      const { generateExecuteRunId } = await import('../task-review.js')
      runId = generateExecuteRunId()
      // 落盘（与启动站点一致），保证 agent 收到的 ID == gate/checkbox 读取的 ID
      try { mkdirSync(runtimeRoot, { recursive: true }); writeFileSync(runIdFile, runId + '\n') } catch {}
    }
    promptText = promptText.replace(/\{EXECUTE_RUN_ID\}/g, runId)
  }

  // Stage Review Tier：brainstorm/plan/execute 阶段注入审查分级占位符
  // （scanProfile 只在 scan 生效、change-risk-profile 只管 apply/verify，都不约束这些阶段的审查方式，
  //  故按 plan_level / 变更文件数分级：self 当前 agent 自审，independent 强制独立子代理 + review.json）
  if (['brainstorm', 'plan', 'execute'].includes(stageName) && promptText.includes('{REVIEW_TIER}')) {
    try {
      const { classifyReviewTier } = await import('../review-tier.js')
      const { generateStageReviewRunId, renderReviewJsonContract, stageReviewMarkerPath } = await import('../stage-review.js')
      const tierSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
      const tierChangeDir = changeName ? join(tierSpecBase, 'changes', changeName) : null
      const designPath = tierChangeDir ? join(tierChangeDir, 'design.md') : null
      let planLevel = null
      if (tierChangeDir) {
        const planPath = join(tierChangeDir, 'plan.md')
        if (existsSync(planPath)) {
          const fmLine = readFileSync(planPath, 'utf8').split('\n').find(l => l.trim().startsWith('plan_level:'))
          if (fmLine) planLevel = fmLine.split(':')[1].trim()
        }
      }
      const tier = classifyReviewTier({ planLevel, designPath })
      // reviewRunId：优先读 marker 复用（保证多次渲染 prompt 注入同一 ID == gate 读取的 ID，
      // 修复「prompt 多次渲染 / 多次 review 时 gate 取错 ID 读错 review.json」），marker 缺失才
      // generate + 落盘。对齐 execute {EXECUTE_RUN_ID} 段（prompt.js:449-467）。
      const tierRuntimeRoot = resolveRuntimeRoot(platformOpts, tierSpecBase)
      const reviewRunIdMarker = stageReviewMarkerPath(tierRuntimeRoot, stageName, changeName)
      let reviewRunId = ''
      try {
        if (existsSync(reviewRunIdMarker)) {
          reviewRunId = readFileSync(reviewRunIdMarker, 'utf8').trim()
        }
      } catch {}
      if (!reviewRunId) {
        reviewRunId = generateStageReviewRunId()
        try {
          mkdirSync(tierRuntimeRoot, { recursive: true })
          writeFileSync(reviewRunIdMarker, reviewRunId + '\n')
          // plan-c: echo 完整 review 目录路径，避免 agent 拿裸 runId 给子代理时漏连字符拼错路径
          const reviewDir = `${tierRuntimeRoot}/stage-reviews/${stageName}-${reviewRunId}`
          console.log(`  📁 Stage Review 写入目录（直接复制给 review 子代理，勿手拼 runId）：${reviewDir}/`)
        } catch {}
      }
      // review.json 产物契约(schema + 示例 + docHash 算法 + 重算提示)事前注入,与 validateStageReviewSchema 同源
      const reviewContractMd = renderReviewJsonContract({ stage: stageName, changeDir: tierChangeDir, reviewRunId, tier: tier.tier })
      promptText = promptText
        .split('{REVIEW_TIER}').join(tier.tier)
        .split('{REVIEW_TIER_REASON}').join(tier.reason)
        .split('{STAGE_REVIEW_RUN_ID}').join(reviewRunId)
        .split('{REVIEW_JSON_CONTRACT}').join(reviewContractMd)
    } catch (e) {
      // 降级 self，避免 prompt 残留占位符
      promptText = promptText
        .split('{REVIEW_TIER}').join('self')
        .split('{REVIEW_TIER_REASON}').join('分级异常降级 self: ' + e.message)
        .split('{STAGE_REVIEW_RUN_ID}').join('review-unknown')
        .split('{REVIEW_JSON_CONTRACT}').join('(review 契约注入失败,按 schemaVersion=1 + reviewType + verdicts∈pass/fail/cannot_verify + reviewedFiles + docHash=主文档 sha256 产出)')
    }
  }

  // archive Step1「任务完成度检查」客观真相源注入：以 review.json verdict 算完成度，
  // 替代「机械数 plan.md checkbox」（checkbox 依赖 autoCheckPlanFromReviews 回填，runId marker /
  // review 缺失时回填静默 no-op，会停在未勾态导致完成度失真 → archive 误判「全未完成」）。
  // summarizeTaskCompletion 内部已 fail-safe 降级（无 plan / 无 runId → checkbox 统计 + 标注 source），
  // 此处仅兜底注入异常，绝不阻断 archive。
  if (stageName === 'archive' && promptText.includes('{TASK_COMPLETION_REPORT}')) {
    try {
      const { summarizeTaskCompletion } = await import('../task-review.js')
      const tcrSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
      const tcrRuntimeRoot = resolveRuntimeRoot(platformOpts, tcrSpecBase)
      const tcrChangeDir = changeName ? join(tcrSpecBase, 'changes', changeName) : null
      const summary = tcrChangeDir
        ? summarizeTaskCompletion({ changeDir: tcrChangeDir, runtimeRoot: tcrRuntimeRoot, changeName })
        : null
      promptText = promptText.split('{TASK_COMPLETION_REPORT}').join(summary ? summary.report : '（无法计算完成度：变更目录缺失）')
    } catch (e) {
      promptText = promptText.split('{TASK_COMPLETION_REPORT}').join('（完成度计算异常：' + e.message + '，请手动核对 plan.md 与 .runtime/execute-runs/*/tasks/task-NN/review.json）')
    }
  }

  // 注入模块上下文（brainstorm/plan/execute 阶段，基于 Module Context Index）
  if (['brainstorm', 'plan', 'execute'].includes(stageName) && projectName) {
    const effectiveSpecBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
    const moduleIndex = loadModuleContextIndex(effectiveSpecBase, projectName)
    if (moduleIndex && Object.keys(moduleIndex).length > 0) {
      // 尝试从 step prompt / changeName 匹配模块
      const taskDesc = step.prompt || changeName || ''
      const injection = buildModuleContextInjection(taskDesc, moduleIndex, effectiveSpecBase, projectName)
      if (injection) {
        promptText = injection + '\n' + promptText
      }
    }
  }

  // 平台模式 prompt 自检：确保没有裸相对输出路径
  // 只匹配正向写入指令中的裸路径，避免误杀「禁止写入 .sillyspec/」等安全说明
  if ((platformOpts?.specRoot || platformOpts?.runtimeRoot) && stageName === 'scan') {
    const writeCtx = /(?<!不要|禁止|严禁)(?:save[\s.]+to|write|create|mkdir|git add|写入|保存到|写入到)[^a-zA-Z]*\.sillyspec\/[a-z]/i
    if (writeCtx.test(promptText)) {
      console.error(`❌ [sillyspec] BUG: 平台模式 scan prompt 包含写入指令指向裸相对路径 .sillyspec/`)
      console.error(`   这会导致 agent 写入源码目录而非 spec-root，属于源码污染 bug。`)
      console.error(`   请将路径改为对应的 {DOCS_ROOT}/{PROJECTS_ROOT}/{WORKFLOWS_ROOT}/{KNOWLEDGE_ROOT}/{SPEC_ROOT} 占位符。`)
      process.exit(2) // 内部异常（SillySpec 自身 prompt 配置 bug）→ exit 2，与 machine-interface 三段契约一致
    }
  }

  if (prevStepAnswer) {
    console.log(`\n### 📩 上一步用户回答`)
    console.log(prevStepAnswer)
  }

  // 完成契约(事前预知):该 stage 的机械校验通过条件,从 stage-contract-spec.js manifest 渲染,
  // 与 CLI 完成校验严格同源(事前给的 == 事后查的)。仅 step0 注入(与 persona/guardrails 同模式,
  // 一次建立即可;后续步靠 context 保留)。
  if (stepIndex === 0) {
    const stageContract = renderStageContract(stageName)
    if (stageContract) {
      promptText = `${promptText}\n\n${stageContract}`
    }
  }

  console.log(promptText)
  // 铁律拆分（W3 token 效率）：通用流程纪律（文档优先/不跳步/不编造命令）只在首步注入——
  // 每步重复 ~800B 纯耗 context。但【平台写入规则 + 路径规则】是安全关键（防写错目录/绕过 Write），
  // 且依赖 changeName/platformOpts，必须【每步注入】（context 压缩丢失会让 agent 越界写源码）。
  if (stepIndex === 0) {
    console.log(`\n### ⚠️ 铁律`)
    console.log('- 文档优先：代码产出必须先有对应的设计/规范文档支撑。')
    console.log('- 聚焦本步骤：只执行本步骤描述的操作并完整做完；自行扩展或跳步会破坏状态机推进，后续步骤再做后续事。')
    console.log('- 已完成步骤视为只读：需修订用 `sillyspec run <stage> --reopen --from-step N` 回退重做，直接回头改会让进度记录与产物脱节。')
    console.log('- CLI 子命令以本 prompt 或上一条 --done 输出的字面为准；不确定时停下问用户，猜测命令会让状态机推进到错误位置。')
    console.log('- 本步骤产物落盘后立即执行 prompt 末尾的 --done：CLI 据此校验产出并推进状态机；不跑则进度永远停在本步。')
    console.log('- 变更目录改名用 `sillyspec change-rename <旧名> <新名>`：mv/rename 会漏改进度库引用，导致变更失联。')
    console.log('- 文档类型文件（.md/.yaml/.json 等）头部必须包含 author（git 用户名）和 created_at（精确到秒）')
    console.log('- 执行构建/测试前必须先读 local.yaml，优先使用其中配置的命令、路径和环境变量；未配置时才使用默认值')
  }
  // 平台模式 + 路径规则（安全关键，每步注入；step1+ 起带精简标题，不复述通用铁律）
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot || changeName) {
    if (stepIndex !== 0) console.log(`\n### ⚠️ 路径与平台规则（每步提醒，通用铁律见首步）`)
    if (platformOpts?.specRoot || platformOpts?.runtimeRoot) {
      const specSillyspec = platformOpts.specRoot || join(cwd, '.sillyspec')
      console.log(`- **平台模式：所有文件只能写入 \`${specSillyspec}/\` 下的对应子目录，严禁写入源码目录。**`)
      console.log('- **平台模式：Write 工具失败时，不允许用 cat > / tee / heredoc 等方式绕过。先 Read 再 Write，仍失败则记录并停止。**')
      console.log('- **平台模式：local.yaml 中的 commands 必须在 package.json scripts 中真实存在，不存在的标记 unavailable。**')
    }
    if (changeName) {
      const isPlatform = platformOpts?.specRoot || platformOpts?.runtimeRoot
      const changeDirBase = isPlatform ? platformOpts.specRoot : '.sillyspec'
      const changeDir = join(changeDirBase, 'changes', changeName)
      console.log(`- **文件路径规则：所有变更文件必须写入 \`${changeDir}/\` 目录下。不要自己拼接路径，直接使用 changeDir 值。示例：\`${changeDir}/proposal.md\`**`)
    }
  }
  const changeFlag = changeName ? ` --change ${changeName}` : ''
  // 检测当前 step prompt 是否包含 WAIT 指令（即可能需要等待用户）
  const stepPrompt = promptText || ''
  const requiresWait = step.requiresWait === true
  const conditionalWait = step.conditionalWait === true
  const mayNeedWait = WAIT_MARKER_RE.test(stepPrompt) || requiresWait || conditionalWait

  console.log(`\n### 完成后执行`)
  if (requiresWait) {
    console.log(`本步骤必须等待用户输入，不能直接 --done：`)
    console.log(`sillyspec run ${stageName} --wait --reason "${step.waitReason || '等待用户输入'}" --options "${(step.waitOptions || ['确认']).join(',')}"${changeFlag} --output "你的问题/方案摘要"`)
    console.log(``)
    console.log(`用户回答后执行：`)
    console.log(`sillyspec run ${stageName} --continue --answer "用户回答"${changeFlag}`)
    console.log(``)
    console.log(`收到回答并完成本步骤总结后，再执行：`)
  } else if (mayNeedWait) {
    console.log(`如果需要用户决策（选择方案/确认设计等）：`)
    console.log(`sillyspec run ${stageName} --wait --reason "${step.waitReason || '等待原因'}" --options "${(step.waitOptions || ['选项1', '选项2']).join(',')}"${changeFlag} --output "你的摘要"`)
    console.log(``)
    console.log(`如果不需要用户决策，正常完成：`)
  }
  console.log(`sillyspec run ${stageName} --done${changeFlag} --input "用户原始需求/反馈" --output "你的摘要"`)
}
/**
 * 替换 prompt 文本中的路径根占位符 {SPEC_ROOT}/{DOCS_ROOT}/{PROJECTS_ROOT}/
 * {WORKFLOWS_ROOT}/{KNOWLEDGE_ROOT}。平台模式与常规模式共用：仅传入的 roots 值不同。
 * 占位符值都是绝对路径、互不包含其它占位符，故替换顺序不影响结果。
 *
 * 注：本函数由并行会话引入（outputStep 两处逐字重复逻辑的抽取），重构期间 run.js 一次
 * git checkout 误覆盖其未提交版本，此处按 test/prompt-placeholders.test.mjs 的契约重建，
 * 行为等价。
 */
export function applyRootPlaceholders(text, roots) {
  return text
    .replaceAll('{SPEC_ROOT}', roots.specRoot)
    .replaceAll('{DOCS_ROOT}', roots.docsRoot)
    .replaceAll('{PROJECTS_ROOT}', roots.projectsRoot)
    .replaceAll('{WORKFLOWS_ROOT}', roots.workflowsRoot)
    .replaceAll('{KNOWLEDGE_ROOT}', roots.knowledgeRoot)
}

