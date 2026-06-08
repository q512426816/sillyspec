/**
 * sillyspec run 命令实现
 *
 * CLI 成为流程引擎，AI 变成步骤执行器。
 * 支持多变更并行：每个变更状态存储在 sillyspec.db 中。
 */
import { basename, join, resolve } from 'path'
import { existsSync, readdirSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, statSync } from 'fs'
import { ProgressManager } from './progress.js'

/**
 * 解析规范目录路径
 * @param {string} cwd - 项目根目录
 * @param {object} [opts]
 * @param {string} [opts.specDir] - 用户指定的 specDir（通过 --spec-dir 或 --spec-root）
 * @returns {string} 规范目录的绝对路径
 */
function resolveSpecDir(cwd, opts = {}) {
  if (opts.specDir) return resolve(opts.specDir)
  return join(cwd, '.sillyspec')
}
import { stageRegistry, auxiliaryStages } from './stages/index.js'
import { checkTransition, runValidators } from './stage-contract.js'
import { buildExecuteSteps } from './stages/execute.js'
import { buildPlanSteps } from './stages/plan.js'
import { formatExecuteSummary } from './worktree-apply.js'

/**
 * 同步触发辅助函数：_write 后 best-effort 同步到平台
 */
/**
 * quick 完成审计：对比 baseline 与实际变更
 */
async function auditQuickCompletion(cwd, guard, options = {}) {
  const { baselineFiles, allowedFiles = [], allowNew = false, forceBaseline = false } = guard
  const { isConfirm } = options
  const result = { status: 'safe', reasons: [], changedFiles: [], newFiles: [], deletedFiles: [], baselineHit: [] }

  try {
    const { execSync } = await import('child_process')
    const gitStatus = execSync('git status --porcelain', { cwd, encoding: 'utf8', timeout: 10000 })
    const currentEntries = gitStatus.trim().split('\n').filter(Boolean)

    const DANGEROUS_PATTERNS = [
      '.sillyspec/',
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '.eslintrc',
      'tsconfig.json',
    ]

    for (const entry of currentEntries) {
      const status = entry.slice(0, 2).trim()
      const file = entry.slice(3).trim()
      if (!file || file.startsWith('??. ')) continue

      result.changedFiles.push(file)
      if (status === 'D' || status === ' D') result.deletedFiles.push(file)
      if (status === '??') result.newFiles.push(file)

      // 检查是否命中 baseline protected files
      if (baselineFiles.includes(file)) {
        result.baselineHit.push(file)
      }

      // 检查危险文件（除非 force-baseline）
      if (DANGEROUS_PATTERNS.some(p => file.includes(p)) && !forceBaseline) {
        result.reasons.push(`危险文件变更: ${file}`)
      }
    }

    // 检查 deleted files
    for (const f of result.deletedFiles) {
      result.reasons.push(`删除文件: ${f}`)
    }

    // 检查 baseline hit（除非 force-baseline）
    if (!forceBaseline) {
      for (const f of result.baselineHit) {
        result.reasons.push(`覆盖 baseline 文件: ${f}`)
      }
    }

    // 检查 new files（除非 allow-new）
    if (!allowNew) {
      for (const f of result.newFiles) {
        if (!f.startsWith('.sillyspec/quicklog/') && !f.startsWith('.sillyspec/.runtime/')) {
          result.reasons.push(`新增文件（需 --allow-new）: ${f}`)
        }
      }
    }

    // 检查 allowedFiles 范围
    if (allowedFiles.length > 0) {
      for (const f of result.changedFiles) {
        if (!allowedFiles.includes(f) && !f.startsWith('.sillyspec/')) {
          result.reasons.push(`超出 allowedFiles: ${f}`)
        }
      }
    }

    // 判定结果
    if (result.baselineHit.length > 0 || result.deletedFiles.length > 0 || result.reasons.some(r => r.startsWith('危险') || r.startsWith('删除'))) {
      result.status = 'blocked'
    } else if (result.newFiles.length > 0 || (allowedFiles.length > 0 && result.reasons.some(r => r.startsWith('超出')))) {
      result.status = 'warning'
    }

    // --confirm 模式：展示 diff 并等待确认
    if (isConfirm && (result.status === 'warning' || result.status === 'blocked')) {
      console.log(`\n📋 quick 变更概览：`)
      console.log(`   新增: ${result.newFiles.length}, 修改: ${result.changedFiles.length - result.newFiles.length - result.deletedFiles.length}, 删除: ${result.deletedFiles.length}`)
      if (result.changedFiles.length > 0) {
        console.log(`\n   变更文件：`)
        for (const f of result.changedFiles) {
          const isBaseline = baselineFiles.includes(f)
          const isDangerous = DANGEROUS_PATTERNS.some(p => f.includes(p))
          const marker = isBaseline ? '🔴' : isDangerous ? '⚠️' : '  '
          console.log(`   ${marker} ${f}`)
        }
      }
      console.log(`\n   状态: ${result.status.toUpperCase()}`)
      if (result.reasons.length > 0) {
        console.log(`   原因:`)
        for (const r of result.reasons) {
          console.log(`     - ${r}`)
        }
      }
      console.log(`\n   如确认接受这些变更，重新运行：sillyspec run quick --done --confirm --output "..."`)
      console.log(`   或使用 --force-baseline 允许覆盖 baseline 文件，--allow-new 允许新增文件`)
    }
  } catch (e) {
    result.reasons.push(`审计失败: ${e.message}`)
    result.status = 'warning'
  }

  return result
}

async function triggerSync(cwd, changeName) {
  try {
    if (changeName && !existsSync(join(cwd, '.sillyspec', 'changes', changeName))) return
    const syncMod = await import('./sync.js')
    await syncMod.sync(changeName, cwd)
  } catch (e) {
    // sync.js 不存在或同步失败，静默跳过
    console.warn('⚠️ 同步失败:', e.message)
  }
}

/**
 * 审批检查辅助函数：execute 阶段启动前检查
 * @returns {{ status: string, reason?: string } | null}
 */
async function checkApproval(cwd, changeName) {
  try {
    const syncMod = await import('./sync.js')
    return await syncMod.checkApproval(changeName, cwd)
  } catch (e) {
    // sync.js 不存在或检查失败，静默跳过
    return null
  }
}

/**
 * 统一查找变更目录（与 progress.js 的变更检测逻辑一致）
 */
function resolveChangeDir(cwd, progress, specDir = null) {
  const changesDir = join(specDir || resolveSpecDir(cwd), 'changes')
  if (!existsSync(changesDir)) return null

  // 1. 优先用 currentChange
  if (progress.currentChange) {
    const target = join(changesDir, progress.currentChange)
    if (existsSync(target)) return target
  }

  // 2. fallback：唯一非 archive 目录
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) return join(changesDir, entries[0].name)

  return null
}

/**
 * 自动探测并设置 currentChange（唯一变更目录时）
 * @returns {boolean} 是否设置了 currentChange
 */
function autoDetectChange(progress, cwd, specDir = null) {
  if (progress.currentChange) return false
  const changesDir = join(specDir || resolveSpecDir(cwd), 'changes')
  if (!existsSync(changesDir)) return false
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) {
    progress.currentChange = entries[0].name
    return true
  }
  return false
}

/**
 * 从 progress 或变更目录推导变更名
 */
function resolveChangeName(cwd, progress, specDir = null) {
  if (progress.currentChange) return progress.currentChange
  const changesDir = join(specDir || resolveSpecDir(cwd), 'changes')
  if (!existsSync(changesDir)) return null
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) return entries[0].name
  return null
}

/**
 * 获取阶段的步骤定义（execute 需要动态构建）
 */
async function getStageSteps(stageName, cwd, progress, specDir = null) {
  if (stageName === 'execute') {
    const changeDir = resolveChangeDir(cwd, progress, specDir)
    let planFile = null
    if (changeDir) {
      const p = join(changeDir, 'plan.md')
      if (existsSync(p)) planFile = p
    }
    return buildExecuteSteps(planFile)
  }
  if (stageName === 'plan') {
    const changeDir = resolveChangeDir(cwd, progress, specDir)
    return buildPlanSteps(changeDir)
  }
  const def = stageRegistry[stageName]
  return def ? def.steps : null
}

/**
 * 确保阶段的 steps 已初始化到 progress
 */
async function ensureStageSteps(progress, stageName, cwd, specDir = null) {
  if (!progress.stages) progress.stages = {}

  const steps = await getStageSteps(stageName, cwd, progress, specDir)
  if (!steps) return false

  if (!progress.stages[stageName] || !progress.stages[stageName].steps || progress.stages[stageName].steps.length === 0) {
    progress.stages[stageName] = {
      status: 'in-progress',
      startedAt: new Date().toLocaleString('zh-CN',{hour12:false}),
      completedAt: null,
      steps: steps.map(s => ({ name: s.name, status: 'pending' }))
    }
    return true // 需要写入
  }

  // 检查步骤数量是否匹配（execute 动态步骤可能变化）
  if (progress.stages[stageName].steps.length !== steps.length) {
    const oldSteps = progress.stages[stageName].steps
    progress.stages[stageName].steps = steps.map(s => {
      const old = oldSteps.find(step => step.name === s.name)
      if (old) return old
      return { name: s.name, status: 'pending' }
    })
    return true
  }

  return false
}

/**
 * 输出当前步骤的 prompt
 */
async function outputStep(stageName, stepIndex, steps, cwd, changeName, dbProjectName, platformOpts = {}) {
  const step = steps[stepIndex]
  const total = steps.length
  const projectName = dbProjectName || basename(cwd)

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
    const changeDir = join('.sillyspec', 'changes', changeName)
    console.log(`changeDir: ${changeDir}`)
  }
  console.log(`---\n`)
  if (personas[stageName]) {
    console.log(personas[stageName])
    console.log('')
  }
  // 注入全局护栏（如 _globalGuardrails）
  const stageDef = stageRegistry[stageName]
  const guardrails = stageDef && stageDef._globalGuardrails ? stageDef._globalGuardrails : ''

  console.log(`## Step ${stepIndex + 1}/${total}: ${step.name}\n`)
  if (guardrails) {
    console.log(guardrails.trim())
    console.log('')
  }
  let promptText = step.prompt
  // 替换 prompt 中的占位符
  if (projectName && promptText.includes('<project>')) {
    promptText = promptText.replace(/<project>/g, projectName)
  }
  // 替换 <git-user> 占位符
  if (promptText.includes('<git-user>')) {
    const { execSync } = await import('child_process')
    try {
      const gitUser = execSync('git config user.name', { cwd, encoding: 'utf8', timeout: 5000 }).trim()
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
  // 替换 <change-name> 占位符
  if (changeName && promptText.includes('<change-name>')) {
    promptText = promptText.replace(/<change-name>/g, changeName)
  }
  // 平台模式：注入路径覆盖指令
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) {
    const projectName = dbProjectName || basename(cwd)
    // platformOpts.specRoot 现在指向 specDir 本身（可能是 cwd/.sillyspec 或外部路径）
    const specSillyspec = platformOpts.specRoot || join(cwd, '.sillyspec')
    const docsRoot = join(specSillyspec, 'docs', projectName)
    const projectsRoot = join(specSillyspec, 'projects')
    const changesRoot = join(specSillyspec, 'changes')

    promptText = promptText.replace(/\{DOCS_ROOT\}/g, docsRoot)
    promptText = promptText.replace(/\{PROJECTS_ROOT\}/g, projectsRoot)

    const platformDirectives = []
    platformDirectives.push(
      `## ⚠️ 平台模式 — 写入路径约束（必须严格遵守）\n` +
      `\n` +
      `规范目录（specDir）: \`${specSillyspec}\`\n` +
      `- 文档根目录: \`${docsRoot}/\`\n` +
      `- 项目注册表: \`${projectsRoot}/\`\n` +
      `- 变更目录: \`${changesRoot}/\`\n` +
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
    promptText = platformDirectives.join('\n') + '\n\n' + promptText
  } else {
    // 非 platform 模式也要替换占位符
    if (stageName === 'scan') {
      const projectName = dbProjectName || basename(cwd)
      const specSillyspec = join(cwd, '.sillyspec')
      const docsRoot = join(specSillyspec, 'docs', projectName)
      const projectsRoot = join(specSillyspec, 'projects')
      promptText = promptText.replace(/\{DOCS_ROOT\}/g, docsRoot)
      promptText = promptText.replace(/\{PROJECTS_ROOT\}/g, projectsRoot)
    }
  }

  console.log(promptText)
  console.log(`\n### ⚠️ 铁律`)
  console.log('- **文档是核心资产，代码是文档的产物。** 没有文档就没有代码——文档是 AI 的记忆，是团队协作的基础，是后续维护的唯一依据。任何代码产出必须先有对应的设计/规范文档支撑。')
  console.log('- 只做本步骤描述的操作，不得自行扩展或跳过')
  console.log('- 不要回头修改已完成的步骤')
  console.log('- 不要编造不存在的 CLI 子命令')
  console.log('- 完成后立即执行 --done 命令，不得跳过')
  console.log('- 不要用 mv/rename 重命名变更目录，必须用 `sillyspec change-rename <旧名> <新名>`')
  console.log('- 文档类型文件（.md/.yaml/.json 等）头部必须包含 author（git 用户名）和 created_at（精确到秒）')
  console.log('- 执行构建/测试前必须先读 local.yaml，优先使用其中配置的命令、路径和环境变量；未配置时才使用默认值')
  // 平台模式额外铁律
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) {
    const specSillyspec = platformOpts.specRoot || join(cwd, '.sillyspec')
    console.log(`- **平台模式：所有文件只能写入 \`${specSillyspec}/\` 下的对应子目录，严禁写入源码目录。**`)
    console.log('- **平台模式：Write 工具失败时，不允许用 cat > / tee / heredoc 等方式绕过。先 Read 再 Write，仍失败则记录并停止。**')
    console.log('- **平台模式：local.yaml 中的 commands 必须在 package.json scripts 中真实存在，不存在的标记 unavailable。**')
  }
  // 路径安全规则：防止 AI 拼错变更目录
  if (changeName) {
    const changeDir = join('.sillyspec', 'changes', changeName)
    console.log(`- **文件路径规则：所有变更文件必须写入 \`${changeDir}/\` 目录下。不要自己拼接路径，直接使用 changeDir 值。示例：\`${changeDir}/proposal.md\`**`)
  }
  const changeFlag = changeName ? ` --change ${changeName}` : ''
  console.log(`\n### 完成后执行`)
  console.log(`sillyspec run ${stageName} --done${changeFlag} --input "用户原始需求/反馈" --output "你的摘要"`)
}

/**
 * sillyspec run <stage> 主命令
 */
export async function runCommand(args, cwd, specDir = null) {
  // 解析参数
  const stageName = args[0]
  const flags = args.slice(1)

  if (!stageName) {
    console.error('❌ 请指定阶段，例如: sillyspec run brainstorm')
    console.error(`可选: ${Object.keys(stageRegistry).join(', ')}, auto`)
    process.exit(1)
  }

  if (!stageRegistry[stageName] && stageName !== 'auto') {
    console.error(`❌ 未知阶段: ${stageName}`)
    console.error(`可选: ${Object.keys(stageRegistry).join(', ')}, auto`)
    process.exit(1)
  }

  const isDone = flags.includes('--done')
  const isSkip = flags.includes('--skip')
  const isStatus = flags.includes('--status')
  const isReset = flags.includes('--reset')
  const isConfirm = flags.includes('--confirm')
  const isSkipApproval = flags.includes('--skip-approval')

  // 平台模式参数（供 SillyHub 等平台调用）
  // --spec-dir 是统一参数名，--spec-root 保留为向后兼容别名
  const getFlagValue = (name) => {
    const idx = flags.indexOf(name)
    return idx !== -1 && flags[idx + 1] ? flags[idx + 1] : null
  }
  const resolvedSpecDir = specDir || getFlagValue('--spec-dir') || getFlagValue('--spec-root');
  const platformOpts = {
    specRoot: resolvedSpecDir ? resolve(resolvedSpecDir) : null,
    runtimeRoot: getFlagValue('--runtime-root') ? resolve(getFlagValue('--runtime-root')) : null,
    workspaceId: getFlagValue('--workspace-id'),
    scanRunId: getFlagValue('--scan-run-id'),
  }

  // 跨 --done 生命周期：从 metadata 文件恢复 platformOpts
  // 首次 scan 时写入，所有后续调用（包括 run、--done、--skip）都读取
  // 优先在 specDir 下查找，否则回退到 cwd/.sillyspec/.runtime/
  const specRoot = platformOpts.specRoot || resolveSpecDir(cwd)
  const platformOptsFile = join(specRoot, '.runtime', 'platform-scan.json')
  let platformFileExists = existsSync(platformOptsFile)
  // 如果命令行没传 spec-root，尝试从持久化文件恢复
  if (!platformOpts.specRoot && !platformOpts.runtimeRoot) {
    if (platformFileExists) {
      try {
        const { readFileSync } = await import('fs')
        const saved = JSON.parse(readFileSync(platformOptsFile, 'utf8'))
        if (saved.specRoot) platformOpts.specRoot = saved.specRoot
        if (saved.runtimeRoot) platformOpts.runtimeRoot = saved.runtimeRoot
        if (saved.workspaceId) platformOpts.workspaceId = saved.workspaceId
        if (saved.scanRunId) platformOpts.scanRunId = saved.scanRunId
        // 平台模式 fail-fast：文件存在但缺少 specRoot
        if (!platformOpts.specRoot && !platformOpts.runtimeRoot) {
          console.error(`❌ 平台模式参数文件存在但缺少 specRoot/runtimeRoot: ${platformOptsFile}`)
          console.error('   可能原因：platform-scan.json 损坏或写入不完整')
          console.error('   解决：重新运行首次 scan 并传入 --spec-root')
          process.exit(1)
        }
      } catch (e) {
        console.error(`❌ 平台模式参数文件读取失败: ${platformOptsFile}`)
        console.error(`   错误: ${e.message}`)
        console.error('   可能原因：文件损坏')
        console.error('   解决：删除该文件并重新运行首次 scan 传入 --spec-root')
        process.exit(1)
      }
    }
  }
  // 持久化 platformOpts（命令行传入或已恢复的都持久化）
  if (platformOpts.specRoot || platformOpts.runtimeRoot) {
    try {
      const { mkdirSync, writeFileSync } = await import('fs')
      mkdirSync(join(specRoot, '.runtime'), { recursive: true })
      writeFileSync(platformOptsFile, JSON.stringify({
        specRoot: platformOpts.specRoot,
        runtimeRoot: platformOpts.runtimeRoot,
        workspaceId: platformOpts.workspaceId,
        scanRunId: platformOpts.scanRunId,
        savedAt: new Date().toISOString(),
      }, null, 2) + '\n')
    } catch {
      // 静默失败，不影响主流程
    }
  }

  // 解析 --output
  let outputText = null
  const outputIdx = flags.indexOf('--output')
  if (outputIdx !== -1 && flags[outputIdx + 1]) {
    outputText = flags[outputIdx + 1]
  }

  // 解析 --input
  let inputText = null
  const inputIdx = flags.indexOf('--input')
  if (inputIdx !== -1 && flags[inputIdx + 1]) {
    inputText = flags[inputIdx + 1]
  }

  // 解析 --change <name>
  let changeName = null
  const changeIdx = flags.indexOf('--change')
  if (changeIdx !== -1 && flags[changeIdx + 1]) {
    changeName = flags[changeIdx + 1]
  }

  // 解析 --files a.js,b.js（quick 专用：显式声明 allowedFiles）
  let quickFiles = []
  const filesIdx = flags.indexOf('--files')
  if (filesIdx !== -1 && flags[filesIdx + 1]) {
    quickFiles = flags[filesIdx + 1].split(',').map(f => f.trim()).filter(Boolean)
  }

  const isAllowNew = flags.includes('--allow-new')
  const isForceBaseline = flags.includes('--force-baseline')

  // 未知参数 fail-fast
  const knownFlags = new Set([
    '--done', '--skip', '--status', '--reset', '--confirm', '--skip-approval',
    '--output', '--input', '--change',
    '--spec-dir', '--spec-root', '--runtime-root', '--workspace-id', '--scan-run-id',
    '--files', '--allow-new', '--force-baseline',
    '--json', '--dir', '--help',
  ])
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i]
    if (f.startsWith('--')) {
      if (!knownFlags.has(f)) {
        console.error(`❌ 未知参数: ${f}`)
        console.error(`已知参数: ${[...knownFlags].sort().join(', ')}`)
        process.exit(1)
      }
      // 跳过 value 参数
      i++
    }
  }

  const isAuxiliary = auxiliaryStages.includes(stageName)

  const pm = new ProgressManager({ specDir: specRoot })
  let progress = await pm.read(cwd, changeName)

  if (!progress) {
    // 如果指定了变更名或有变更目录，自动初始化变更的 progress
    const autoChange = changeName || resolveChangeNameAuto(cwd, specRoot)
    if (autoChange) {
      progress = await pm.initChange(cwd, autoChange)
    } else if (isAuxiliary) {
      // 辅助阶段（scan/explore/quick/doctor/status）自动使用默认变更名
      const autoName = changeName || resolveChangeNameAuto(cwd, specRoot) || 'default'
      changeName = autoName
      progress = await pm.initChange(cwd, autoName)
      // initChange 可能因 project 表为空返回 null
      if (!progress) {
        progress = { currentStage: stageName, stages: {}, lastActive: new Date().toLocaleString('zh-CN', { hour12: false }), project: '' }
      }
    } else {
      // brainstorm / propose 作为流程入口，自动生成变更名并初始化
      if (stageName === 'brainstorm' || stageName === 'propose') {
        const date = new Date().toISOString().slice(0, 10)
        const autoName = `${date}-new-change`
        console.log(`🔄 自动创建变更：${autoName}`)
        console.log(`  提示：可以用 --change <名称> 指定自定义变更名`)
        console.log(`  或事后重命名：sillyspec change-rename ${autoName} <新名称>`)
        progress = await pm.initChange(cwd, autoName)
        changeName = autoName
      } else {
        console.error('❌ 未找到进度数据，请先运行 sillyspec init 或指定 --change <变更名>')
        process.exit(1)
      }
    }
  }

  // 确保 progress 有 currentChange
  const effectiveChange = changeName || progress.currentChange || resolveChangeName(cwd, progress, specRoot)

  // -- auto 模式：自动推进所有流程阶段
  if (stageName === 'auto') {
    return await runAutoMode(pm, progress, cwd, flags, effectiveChange)
  }

  // --change 只作为变更名标识，不再拦截流程
  // 注册变更到全局活跃列表（如果尚未注册）
  if (effectiveChange) {
    await pm.registerChange(cwd, effectiveChange)
  }

  // --reset
  if (isReset) {
    return await resetStage(pm, progress, stageName, cwd, effectiveChange)
  }

  // 确保步骤已初始化
  const changed = await ensureStageSteps(progress, stageName, cwd, specRoot)
  if (changed && effectiveChange) {
    await pm._write(cwd, progress, effectiveChange)
    triggerSync(cwd, effectiveChange)
    progress = await pm.read(cwd, effectiveChange) || progress
  }

  // --status
  if (isStatus) {
    return showStatus(progress, stageName)
  }

  // --skip
  if (isSkip) {
    return await skipStep(pm, progress, stageName, cwd, effectiveChange)
  }

  // --done
  if (isDone) {
    return await completeStep(pm, progress, stageName, cwd, outputText, inputText, { confirm: isConfirm, changeName: effectiveChange, platformOpts })
  }

  // 默认：输出当前步骤
  return await runStage(pm, progress, stageName, cwd, effectiveChange, isSkipApproval, platformOpts, { quickFiles, isAllowNew, isForceBaseline })
}

/**
 * 自动推导变更名（不依赖 progress）
 */
function resolveChangeNameAuto(cwd, specDir = null) {
  const changesDir = join(specDir || resolveSpecDir(cwd), 'changes')
  if (!existsSync(changesDir)) return null
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) return entries[0].name
  return null
}

async function runStage(pm, progress, stageName, cwd, changeName, skipApproval = false, platformOpts = {}, quickOpts = {}) {
  // 状态转换校验
  const prevStage = progress.currentStage || ''
  const transition = checkTransition(prevStage, stageName)
  if (!transition.allowed) {
    console.error(`❌ 阶段转换不允许: ${prevStage || '(起始)'} → ${stageName}`)
    console.error(`   原因: ${transition.reason}`)
    console.error(`   提示: 使用 --skip-approval 绕过（需明确意图）`)
    if (!skipApproval) {
      process.exit(1)
    }
  }

  // execute 阶段启动前检查审批
  if (stageName === 'execute' && !skipApproval) {
    const approval = await checkApproval(cwd, changeName)
    if (approval) {
      if (approval.status === 'rejected') {
        console.error(`❌ 变更 ${changeName} 的执行已被拒绝：${approval.reason || '无原因'}`)
        process.exit(1)
      }
      if (approval.status === 'pending') {
        console.log(`⏳ 变更 ${changeName} 的执行审批待处理中...`)
        console.log('  提示：使用 --skip-approval 跳过审批检查')
      }
    }
  }

  // 自动探测 currentChange
  if (autoDetectChange(progress, cwd)) {
    progress.lastActive = new Date().toLocaleString('zh-CN', { hour12: false })
    await pm._write(cwd, progress, changeName)
    triggerSync(cwd, changeName)
  }

  const stageData = progress.stages[stageName]
  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  // 用户显式调用 sillyspec run <stage>：把它标记为当前阶段
  if (progress.currentStage !== stageName) {
    progress.currentStage = stageName
    progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
    await pm._write(cwd, progress, changeName)
    triggerSync(cwd, changeName)
  }

  const steps = stageData.steps
  let currentIdx = steps.findIndex(s => s.status !== 'completed' && s.status !== 'skipped')

  if (currentIdx === -1) {
    // 已完成 → 自动重置，重新开始
    const freshSteps = await getStageSteps(stageName, cwd, progress)
    stageData.steps = freshSteps
      ? freshSteps.map(s => ({ name: s.name, status: 'pending' }))
      : []
    stageData.status = 'in-progress'
    stageData.startedAt = new Date().toLocaleString('zh-CN', { hour12: false })
    stageData.completedAt = null
    await pm._write(cwd, progress, changeName)
    triggerSync(cwd, changeName)
    currentIdx = 0
    console.log(`🔄 ${stageName} 阶段已自动重置，重新开始。\n`)
  }

  // quick 阶段：记录 baselineFiles
  if (stageName === 'quick' && !progress.quickGuard) {
    try {
      const { execSync } = await import('child_process')
      const gitStatus = execSync('git status --porcelain', { cwd, encoding: 'utf8', timeout: 10000 })
      const baselineFiles = gitStatus
        .trim().split('\n').filter(Boolean)
        .map(line => line.slice(3).trim())
        .filter(f => !f.startsWith('.sillyspec/'))
      const allowedFiles = quickOpts?.quickFiles || []
      const allowNew = quickOpts?.isAllowNew || false
      const forceBaseline = quickOpts?.isForceBaseline || false
      progress.quickGuard = {
        baselineCommit: execSync('git rev-parse HEAD', { cwd, encoding: 'utf8', timeout: 5000 }).trim(),
        baselineFiles,
        allowedFiles,
        allowNew,
        forceBaseline,
        startedAt: new Date().toISOString(),
      }
      // 写入 quick-guard.json 供 worktree-guard hook 读取
      const guardFile = join(cwd, '.sillyspec', '.runtime', 'quick-guard.json')
      writeFileSync(guardFile, JSON.stringify(progress.quickGuard, null, 2))
      const parts = [`${baselineFiles.length} 个已有脏文件`]
      if (allowedFiles.length > 0) parts.push(`${allowedFiles.length} 个 allowedFiles`)
      if (allowNew) parts.push('允许新增文件')
      console.log(`🛡️ quick 变更边界已记录: ${parts.join(', ')}`)
      await pm._write(cwd, progress, changeName)
    } catch (e) {
      console.warn(`⚠️ baseline 记录失败: ${e.message}`)
    }
  }

  if (currentIdx > 0) {
    const completed = currentIdx
    const total = steps.length
    console.log(`⚠️  ${stageName} 已进行到第 ${currentIdx + 1}/${total} 步（前 ${completed} 步已完成）。`)
    console.log(`  继续执行将从中断处恢复，用 --reset 可重新开始。\n`)
  }

  const defSteps = await getStageSteps(stageName, cwd, progress)
  if (defSteps && defSteps[currentIdx]) {
    await outputStep(stageName, currentIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
  }
}

function validateMetadata(cwd, stageName) {
  const changesDir = join(cwd, '.sillyspec', 'changes')
  if (!existsSync(changesDir)) return

  const cutoff = Date.now() - 10 * 60 * 1000
  const missing = []

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      try {
        if (entry.isDirectory()) { walk(full); continue }
        if (!/\.(md|yaml|yml)$/.test(entry.name)) continue
        const mtime = statSync(full).mtimeMs
        if (mtime < cutoff) continue
        const content = readFileSync(full, 'utf-8')
        if (!content.includes('author:') && !content.includes('author：')) missing.push(full)
        if (!content.includes('created_at:') && !content.includes('created_at：')) missing.push(full)
      } catch (e) { /* skip unreadable files */ }
    }
  }

  walk(changesDir)
  const unique = [...new Set(missing)]
  if (unique.length > 0) {
    console.log(`\n⚠️  以下文件缺少 author 或 created_at 元数据：`)
    unique.forEach(f => console.log(`  - ${f.replace(cwd + '/', '')}`))
    console.log('请在文件头部添加 author（git 用户名）和 created_at（精确到秒）')
  }
}

/**
 * 验证关键文件是否存在于正确的变更目录下
 * 防止 AI 将文件写到错误的路径
 */
function validateFileLocations(cwd, stageName, progress, changeName) {
  const effectiveChange = changeName || progress.currentChange
  if (!effectiveChange) return

  const changeDir = join(cwd, '.sillyspec', 'changes', effectiveChange)
  if (!existsSync(changeDir)) return

  // 每个阶段完成后预期存在的文件
  const expectedFiles = {
    propose: ['proposal.md', 'design.md', 'requirements.md', 'tasks.md'],
    plan: ['plan.md'],
    verify: ['verify-result.md'],
    archive: ['module-impact.md'],
  }

  const expected = expectedFiles[stageName]
  if (!expected) return

  const missing = []
  for (const file of expected) {
    if (!existsSync(join(changeDir, file))) {
      missing.push(file)
    }
  }

  if (missing.length > 0) {
    console.log(`\n⚠️  文件位置验证：以下文件未在变更目录中找到`)
    console.log(`  变更目录：${changeDir.replace(cwd + '/', '')}/`)
    for (const f of missing) {
      // 检查是否写到了错误的位置
      const wrongPath = join(cwd, '.sillyspec', 'changes', 'change', effectiveChange, f)
      if (existsSync(wrongPath)) {
        console.log(`  ❌ ${f} — 不存在，但发现了错误路径：${wrongPath.replace(cwd + '/', '')}`)
        console.log(`     提示：应该写入 ${changeDir.replace(cwd + '/', '')}/${f}`)
      } else {
        console.log(`  ⬜ ${f} — 未找到（该阶段可能未产出此文件）`)
      }
    }
  } else {
    console.log(`\n✅ 文件位置验证：所有 ${expected.length} 个预期文件均在变更目录中`)
  }
}

async function archiveChangeDirectory(pm, cwd, progress) {
  const { renameSync } = await import('fs')
  const archiveChangeName = progress.currentChange
  if (!archiveChangeName) {
    console.error('❌ 归档失败：未找到当前变更名（currentChange）')
    process.exit(1)
  }
  const changesDir = join(cwd, '.sillyspec', 'changes')
  const archiveDir = join(changesDir, 'archive')
  const srcDir = join(changesDir, archiveChangeName)
  const date = new Date().toISOString().slice(0, 10)
  const destDir = join(archiveDir, `${date}-${archiveChangeName}`)

  if (!existsSync(srcDir)) {
    console.error(`❌ 归档失败：源目录不存在 ${srcDir}`)
    process.exit(1)
  }
  if (existsSync(destDir)) {
    console.error(`❌ 归档失败：目标目录已存在 ${destDir}`)
    process.exit(1)
  }
  mkdirSync(archiveDir, { recursive: true })
  renameSync(srcDir, destDir)

  if (!existsSync(destDir) || existsSync(srcDir)) {
    console.error('❌ 归档校验失败：移动操作异常')
    process.exit(1)
  }

  await pm.unregisterChange(cwd, archiveChangeName)
  console.log(`📦 已归档：${archiveChangeName} → archive/${date}-${archiveChangeName}/`)
}

async function completeStep(pm, progress, stageName, cwd, outputText, inputText = null, options = {}) {
  const { printNext = true, confirm = false, changeName, platformOpts = {} } = options
  const stageData = progress.stages[stageName]
  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  const steps = stageData.steps
  const currentIdx = steps.findIndex(s => s.status === 'pending')

  if (currentIdx === -1) {
    console.error('没有待完成的步骤')
    process.exit(1)
  }

  steps[currentIdx].status = 'completed'
  steps[currentIdx].completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
  if (outputText) {
    const MAX_OUTPUT = 200
    if (outputText.length > MAX_OUTPUT) {
      steps[currentIdx].output = outputText.slice(0, MAX_OUTPUT) + '…'
      // 平台模式：artifact 写入 runtime-root，否则写 .sillyspec/.runtime/artifacts
      const artifactBase = platformOpts?.runtimeRoot
        ? join(platformOpts.runtimeRoot, 'scan-runs', platformOpts.scanRunId || 'unknown')
        : join(cwd, '.sillyspec', '.runtime', 'artifacts')
      mkdirSync(artifactBase, { recursive: true })
      const ts = new Date().toISOString().slice(0,19).replace(/[-T:]/g, '')
      writeFileSync(join(artifactBase, `${changeName || 'unknown'}-${stageName}-step${currentIdx + 1}-${ts}.txt`), outputText)
    } else {
      steps[currentIdx].output = outputText
    }
  }

  if (stageName === 'archive' && steps[currentIdx]?.name === '确认归档') {
    if (!confirm) {
      steps[currentIdx].status = 'pending'
      steps[currentIdx].completedAt = null
      if (outputText) steps[currentIdx].output = null
      await pm._write(cwd, progress, changeName)
      console.log('⚠️  请添加 --confirm 确认归档，例如：sillyspec run archive --done --confirm --output "确认归档"')
      return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
    }
    await archiveChangeDirectory(pm, cwd, progress)
  }

  // archive "确认归档" 步骤完成后，校验归档完整性
  if (stageName === 'archive' && steps[currentIdx]?.name === '确认归档' && confirm) {
    const projectName = progress.project || basename(cwd)
    const contractResult = runValidators('archive', cwd, changeName, { projectName, specRoot: platformOpts?.specRoot })
    if (contractResult.errors.length > 0) {
      console.error(`\n❌ 归档校验失败：`)
      for (const err of contractResult.errors) {
        console.error(`   - ${err}`)
      }
    }
    if (contractResult.warnings.length > 0) {
      console.warn(`\n⚠️ 归档校验警告：`)
      for (const w of contractResult.warnings) {
        console.warn(`   - ${w}`)
      }
    }
  }

  // plan 阶段 "展开任务" 完成后，动态插入任务蓝图协调器步骤
  if (stageName === 'plan' && steps[currentIdx]?.name === '展开任务并分组') {
    const changeDir = resolveChangeDir(cwd, progress)
    if (changeDir) {
      const planFile = join(changeDir, 'plan.md')
      if (existsSync(planFile)) {
        const planContent = readFileSync(planFile, 'utf8')
        const { buildPlanSteps, fixedPrefix, fixedSuffix } = await import('./stages/plan.js')
        const fullSteps = buildPlanSteps(changeDir, planContent)
        const prefixLen = fixedPrefix.length
        const suffixLen = fixedSuffix.length
        const coordinatorSteps = fullSteps.slice(prefixLen, suffixLen > 0 ? -suffixLen : undefined)
        if (coordinatorSteps.length > 0) {
          for (let i = 0; i < coordinatorSteps.length; i++) {
            steps.splice(currentIdx + 1 + i, 0, {
              name: coordinatorSteps[i].name,
              status: 'pending',
              prompt: coordinatorSteps[i].prompt,
              outputHint: coordinatorSteps[i].outputHint,
              optional: coordinatorSteps[i].optional
            })
          }
          console.log(`  📝 已动态插入 ${coordinatorSteps.length} 个任务蓝图步骤（${coordinatorSteps.map(s => s.name).join(', ')}）`)
        }
      }
    }
  }

  // scan 阶段 step 2 "构建扫描项目列表" 完成后，按项目展开 perProject 步骤
  if (stageName === 'scan' && steps[currentIdx]?.name === '构建扫描项目列表') {
    // 解析项目列表：从 step 2 输出提取，或回退读取 projects/*.yaml
    let projectNames = []
    if (outputText) {
      // 匹配 "1. project-name" 格式
      const matches = outputText.match(/^\s*\d+\.\s+(\S+)/gm)
      if (matches) {
        projectNames = matches.map(m => m.replace(/^\s*\d+\.\s+/, '').replace(/[—\-:].*$/, '').trim())
      }
    }
    if (projectNames.length === 0) {
      // 回退：读取所有已注册项目
      console.warn('⚠️ 未能从 step 2 输出解析项目列表，回退扫描所有注册项目')
      const projectsDir = join(cwd, '.sillyspec', 'projects')
      if (existsSync(projectsDir)) {
        projectNames = readdirSync(projectsDir)
          .filter(f => f.endsWith('.yaml'))
          .map(f => f.replace(/\.yaml$/, ''))
      }
    }
    if (projectNames.length === 0) {
      projectNames = ['sillyspec'] // 最终兜底
    }

    // 保存到 runtime 供后续使用 + 防重复展开
    const scanStatePath = join(cwd, '.sillyspec', '.runtime', 'scan-projects.json')
    mkdirSync(join(cwd, '.sillyspec', '.runtime'), { recursive: true })
    let scanState = { projects: projectNames, expanded: false }
    if (existsSync(scanStatePath)) {
      try { scanState = JSON.parse(readFileSync(scanStatePath, 'utf8')) } catch {}
    }

    // 收集当前步骤之后所有 perProject 步骤
    const stageDef = stageRegistry[stageName]
    const allSteps = stageDef?.steps || []
    const perProjectSteps = allSteps.filter(s => s.perProject)

    // 防重复展开：runtime 标记 或 steps 已含项目标识
    const alreadyExpanded = scanState.expanded || steps.some(s => s.name?.match(/\[.+\]\s*$/))
    if (!alreadyExpanded && perProjectSteps.length > 0) {
      // 找到当前步骤（step 2）在动态 steps 中的位置
      const insertBase = currentIdx + 1
      let insertPos = insertBase
      for (const pName of projectNames) {
        // 读取项目配置获取 projectRoot
        const projYaml = join(cwd, '.sillyspec', 'projects', `${pName}.yaml`)
        let projectRoot = '.'
        if (existsSync(projYaml)) {
          const yamlContent = readFileSync(projYaml, 'utf8')
          const pathMatch = yamlContent.match(/^path:\s*(.+)/m)
          if (pathMatch) projectRoot = pathMatch[1].trim()
        }
        const docOutputDir = `.sillyspec/docs/${pName}`
        const contextPrefix = `\n---\n## 当前项目\n- **项目名**: ${pName}\n- **项目路径**: ${projectRoot}\n- **文档输出**: ${docOutputDir}\n\n⚠️ 本步骤只处理上面这个项目，不要处理其他项目。\n---\n\n`

        for (const ppStep of perProjectSteps) {
          steps.splice(insertPos, 0, {
            name: `${ppStep.name} [${pName}]`,
            project: pName,
            status: 'pending',
            prompt: contextPrefix + ppStep.prompt,
            outputHint: ppStep.outputHint,
            optional: ppStep.optional
          })
          insertPos++
        }
      }
      // 移除原始的 perProject 步骤（未展开的版本）
      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].perProject && !steps[i].name?.includes('[')) {
          steps.splice(i, 1)
        }
      }
      console.log(`  📝 已按项目展开 ${perProjectSteps.length} 个步骤 × ${projectNames.length} 个项目 = ${perProjectSteps.length * projectNames.length} 个项目步骤`)
      console.log(`  📁 扫描项目：${projectNames.join(', ')}`)
      // 标记已展开，防止 resume 重复插入
      scanState.expanded = true
      writeFileSync(scanStatePath, JSON.stringify(scanState))
    }
  }

  const nextPendingIdx = steps.findIndex(s => s.status === 'pending')

  if (nextPendingIdx === -1) {
    stageData.status = 'completed'
    stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
    progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
    await pm._write(cwd, progress, changeName)
    triggerSync(cwd, changeName)

    // Append to user-inputs.md
    if (outputText) {
      const inputsPath = join(cwd, '.sillyspec', '.runtime', 'user-inputs.md')
      const entry = `\n## ${new Date().toLocaleString('zh-CN',{hour12:false})} | ${changeName || '?'} | ${stageName}: ${steps[currentIdx].name}\n${inputText ? "- 输入：" + inputText + "\n" : ""}- 输出：${outputText}\n`
      appendFileSync(inputsPath, entry)
    }

    // 平台模式：scan 完成后生成 manifest.json + post-check
    if (stageName === 'scan' && (platformOpts.specRoot || platformOpts.runtimeRoot)) {
      try {
        const { mkdirSync, writeFileSync } = await import('fs')
        const { join } = await import('path')
        const { execSync } = await import('child_process')
        const manifestDir = join(platformOpts.specRoot, '.sillyspec')
        mkdirSync(manifestDir, { recursive: true })
        let sourceCommit = null
        try {
          sourceCommit = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8', timeout: 5000 }).trim()
        } catch {}
        const manifest = {
          workspace_id: platformOpts.workspaceId || null,
          scan_run_id: platformOpts.scanRunId || null,
          source_commit: sourceCommit,
          generated_at: new Date().toISOString(),
          schema_version: 1,
        }
        const manifestPath = join(manifestDir, 'manifest.json')
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
        console.log(`📄 manifest.json 已写入: ${manifestPath}`)
        if (!sourceCommit) {
          console.log(`⚠️  source_commit 无法获取（可能非 git 目录），已设为 null`)
        }
        // 清理平台参数临时文件
        const { unlinkSync } = await import('fs')
        const platformOptsFile = join(specRoot, '.runtime', 'platform-scan.json')
        try { unlinkSync(platformOptsFile) } catch {}

        // CLI 层 post-check（替代旧的简单检查）
        const { runScanPostCheck, printScanPostCheckResult } = await import('./scan-postcheck.js')
        const postResult = runScanPostCheck({
          cwd,
          specDir: platformOpts.specRoot,
          outputText,
        })
        printScanPostCheckResult(postResult)

        // 将 post-check 结果写入 manifest
        manifest.scan_post_check = {
          status: postResult.status,
          checks: postResult.checks,
        }
        // 更新 manifest
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
        console.log(`📄 manifest.json 已更新（含 post-check 结果）`)

        // failed_post_check 时强制阻止 clean success
        if (postResult.status === 'failed_post_check') {
          stageData.status = 'failed_post_check'
          stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
          await pm._write(cwd, progress, changeName)
          console.error(`\n❌ scan post-check 失败，状态设为 failed_post_check。不允许 clean success。`)
          console.error(`   请检查上方错误信息并修复后重新 scan。`)
        } else if (postResult.status === 'completed_with_warnings') {
          // 警告不阻止完成，但记录
          stageData.status = 'completed'
          stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
          await pm._write(cwd, progress, changeName)
        }
      } catch (e) {
        console.warn(`⚠️  manifest.json 写入失败: ${e.message}`)
      }
    }

    // 非 platform 模式 scan 也做轻量 post-check
    if (stageName === 'scan' && !platformOpts.specRoot && !platformOpts.runtimeRoot) {
      const { runScanPostCheck, printScanPostCheckResult } = await import('./scan-postcheck.js')
      const postResult = runScanPostCheck({ cwd, specDir: null, outputText })
      printScanPostCheckResult(postResult)
    }

    validateMetadata(cwd, stageName)

    // 验证关键文件是否在正确的变更目录下
    validateFileLocations(cwd, stageName, progress, changeName)

    // 辅助阶段完成后重置步骤
    const stageDef = stageRegistry[stageName]
    if (stageDef?.auxiliary) {
      const freshSteps = (stageDef.steps || []).map(s => ({
        name: s.name,
        status: 'pending',
        output: null,
        completedAt: null
      }))
      stageData.steps = freshSteps
      stageData.status = 'pending'
      stageData.completedAt = null
      if (progress.currentStage === stageName) progress.currentStage = ''
      await pm._write(cwd, progress, changeName)
    }

    const total = steps.length
    console.log(`✅ ${stageName} 阶段已完成（${total}/${total} 步）`)

    if (stageName === 'execute') {
      // execute run summary：展示真实可得的结构化信息
      try {
        const lastOutput = steps[steps.length - 1]?.output || ''
        const summary = formatExecuteSummary({
          changeName,
          stepsCompleted: total,
          stepsTotal: total,
          agentSummary: lastOutput,
          cwd,
        })
        console.log(`\n${summary}`)
      } catch (e) {
        // summary 失败不影响主流程
        console.log('\n👉 下一步：sillyspec run verify（验证通过后才能归档）')
      }
    } else if (stageName === 'verify') {
      console.log('\n👉 下一步：sillyspec run archive（验证通过，可以归档了）')
    } else if (stageName === 'archive') {
      console.log('\n👉 归档完成！现在可以提交了：git commit -m "..."')
    } else {
      console.log(`\n下一步由你决定：sillyspec run <stage>（brainstorm/plan/execute/verify/archive 等）`)
    }
    return { stageCompleted: true, currentIdx, nextPendingIdx: -1 }
  }

  // 阶段完成校验
  const projectName = progress.project || basename(cwd)
  const contractResult = runValidators(stageName, cwd, changeName, { projectName, specRoot: platformOpts?.specRoot })
  if (contractResult.errors.length > 0) {
    console.error(`\n❌ 阶段 ${stageName} 校验失败：`)
    for (const err of contractResult.errors) {
      console.error(`   - ${err}`)
    }
    console.error(`\n   提示：修复缺失产物后重新运行此步骤，或使用 --skip-approval 跳过校验`)
  }
  if (contractResult.warnings.length > 0) {
    console.warn(`\n⚠️ 阶段 ${stageName} 校验警告：`)
    for (const w of contractResult.warnings) {
      console.warn(`   - ${w}`)
    }
  }

  // quick 阶段完成审计
  if (stageName === 'quick' && progress.quickGuard) {
    const review = await auditQuickCompletion(cwd, progress.quickGuard, { isConfirm })
    progress.quickGuard.review = review
    progress.quickGuard.completedAt = new Date().toISOString()
    // 清理 quick-guard.json
    try {
      const { unlinkSync } = await import('fs')
      const guardFile = join(cwd, '.sillyspec', '.runtime', 'quick-guard.json')
      unlinkSync(guardFile)
    } catch {}
    if (review.status === 'blocked') {
      console.error(`\n🚫 quick 变更边界审计 — BLOCKED：`)
      for (const r of review.reasons) {
        console.error(`   - ${r}`)
      }
      console.error(`\n   这些文件是 baseline 保护的，不应被修改。`)
    } else if (review.status === 'warning') {
      console.warn(`\n⚠️ quick 变更边界审计 — WARNING：`)
      for (const r of review.reasons) {
        console.warn(`   - ${r}`)
      }
    } else {
      console.log(`\n✅ quick 变更边界审计 — SAFE (变更 ${review.changedFiles.length} 个文件)`)
    }
  }

  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName)

  // Append to user-inputs.md
  if (outputText) {
    const inputsPath = join(cwd, '.sillyspec', '.runtime', 'user-inputs.md')
    const entry = `\n## ${new Date().toLocaleString('zh-CN',{hour12:false})} | ${changeName || '?'} | ${stageName}: ${steps[currentIdx].name}\n${inputText ? "- 输入：" + inputText + "\n" : ""}- 输出：${outputText}\n`
    appendFileSync(inputsPath, entry)
  }

  const defSteps = await getStageSteps(stageName, cwd, progress)
  console.log(`✅ Step ${currentIdx + 1}/${steps.length} 完成：${steps[currentIdx].name}\n`)

  // Workflow post_check：scan 深度扫描完成后自动检查产物
  if (stageName === 'scan' && steps[currentIdx]?.name?.includes('深度扫描')) {
    try {
      const { loadWorkflow, runPostCheck, formatCheckReport, saveWorkflowRun } = await import('./workflow.js')
      const wf = loadWorkflow(cwd, 'scan-docs')
      if (wf) {
        // 确定当前项目：优先从 step metadata 读取，回退从 display name 提取
        const currentProjectName = steps[currentIdx].project
          || (steps[currentIdx].name.match(/\[([^\]]+)\]\s*$/) || [])[1]
          || null

        // 确定要检查的项目列表
        let projectsToCheck = []
        if (currentProjectName) {
          // 按项目展开模式：只检查当前项目
          projectsToCheck = [currentProjectName]
        } else {
          // 兼容旧模式（未展开）：检查所有项目
          const projectsDir = join(cwd, '.sillyspec', 'projects')
          const projectFiles = existsSync(projectsDir)
            ? readdirSync(projectsDir).filter(f => f.endsWith('.yaml'))
            : []
          projectsToCheck = projectFiles.map(f => f.replace(/\.yaml$/, ''))
        }

        let anyFailed = false
        for (const pName of projectsToCheck) {
          const result = runPostCheck(wf, cwd, pName)
          const report = formatCheckReport(result)
          console.log(report)
          if (result.status === 'fail') {
            anyFailed = true
            // retry_prompts 由 _checkWorkflow 自动生成
            for (const rp of (result.retry_prompts || [])) {
              console.log(`\n🔄 重试提示（项目 ${pName}）：\n`)
              console.log(rp.prompt)
            }
          }
          const saved = saveWorkflowRun(result, { cwd, source: 'run.js', stage: 'verify', step: steps[currentIdx]?.name })
          if (saved) console.log(`📁 结果已归档：${saved}`)
        }
        if (anyFailed) {
          console.log(`\n⚠️ 存在检查失败项，请按上面的重试提示修复后再继续。`)
        }
      }
    } catch (e) {
      console.warn(`⚠️ workflow 检查跳过：${e.message}`)
    }
  }

  // Workflow post_check：archive extract-module-impact 完成后检查产物
  if (stageName === 'archive' && steps[currentIdx]?.name?.includes('extract-module-impact')) {
    try {
      const { loadWorkflow, runPostCheck, formatCheckReport, saveWorkflowRun } = await import('./workflow.js')
      const wf = loadWorkflow(cwd, 'archive-impact')
      if (wf && changeName) {
        const raw = JSON.stringify(wf)
        const resolved = JSON.parse(raw.replace(/<change-name>/g, changeName))
        const result = runPostCheck(resolved, cwd, 'sillyspec')
        // 只报告 impact-analyzer 的结果（doc-syncer 是后续步骤）
        const impactResult = (result.roles || []).find(r => r.id === 'impact-analyzer')
        if (impactResult) {
          const icon = impactResult.status === 'pass' ? '✅' : '❌'
          console.log(`${icon} module-impact.md 检查${impactResult.status === 'pass' ? '通过' : '失败'}`)
          for (const f of (result.failures || []).filter(f => f.role_id === 'impact-analyzer')) {
            console.log(`   └─ ${f}`)
          }
        }
        const saved = saveWorkflowRun(result, { cwd, source: 'run.js', stage: 'archive', step: steps[currentIdx]?.name })
        if (saved) console.log(`📁 结果已归档：${saved}`)
      }
    } catch (e) {
      console.warn(`⚠️ workflow 检查跳过：${e.message}`)
    }
  }

  if (printNext) {
    await outputStep(stageName, nextPendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
  }
  return { stageCompleted: false, currentIdx, nextPendingIdx }
}

async function skipStep(pm, progress, stageName, cwd, changeName) {
  const stageData = progress.stages[stageName]
  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  const steps = stageData.steps
  const currentIdx = steps.findIndex(s => s.status === 'pending')

  if (currentIdx === -1) {
    console.error('没有待跳过的步骤')
    process.exit(1)
  }

  const defSteps = await getStageSteps(stageName, cwd, progress)
  const stepDef = defSteps ? defSteps[currentIdx] : null
  if (stepDef && !stepDef.optional) {
    console.error(`❌ 步骤 "${steps[currentIdx].name}" 不可跳过`)
    process.exit(1)
  }

  steps[currentIdx].status = 'skipped'
  steps[currentIdx].skippedAt = new Date().toLocaleString('zh-CN',{hour12:false})
  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName)

  console.log(`⏭️ Step ${currentIdx + 1}/${steps.length} 已跳过：${steps[currentIdx].name}`)

  const nextPendingIdx = steps.findIndex(s => s.status === 'pending')
  if (nextPendingIdx !== -1 && defSteps) {
    console.log('')
    await outputStep(stageName, nextPendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
  }
}

function showStatus(progress, stageName) {
  const stageData = progress.stages[stageName]
  const stageDef = stageRegistry[stageName]

  if (!stageData || !stageData.steps || stageData.steps.length === 0) {
    console.log(`阶段：${stageName}（${stageDef.title}）`)
    console.log(`进度：未初始化`)
    return
  }

  const steps = stageData.steps
  const completed = steps.filter(s => s.status === 'completed' || s.status === 'skipped').length
  const bar = '█'.repeat(completed) + '░'.repeat(steps.length - completed)

  console.log(`阶段：${stageName}（${stageDef.title}）`)
  console.log(`进度：[${bar}] ${completed}/${steps.length}\n`)

  const firstPending = steps.findIndex(s => s.status === 'pending')

  if (progress.batchProgress) {
    const bp = progress.batchProgress
    const bpTotal = bp.total || 0
    const bpCompleted = bp.completed || 0
    const bpFailed = bp.failed || 0
    const bpSkipped = bp.skipped || 0
    const bpBarLen = 20
    const bpFilled = Math.round((bpCompleted / Math.max(bpTotal, 1)) * bpBarLen)
    const bpBar = '█'.repeat(bpFilled) + '░'.repeat(bpBarLen - bpFilled)
    const bpParts = []
    if (bpFailed > 0) bpParts.push(`${bpFailed} 失败`)
    if (bpSkipped > 0) bpParts.push(`${bpSkipped} 跳过`)
    const bpSuffix = bpParts.length ? ` (${bpParts.join(', ')})` : ''
    console.log(`\n📊 批量进度: ${bpBar} ${bpCompleted}/${bpTotal}${bpSuffix}\n`)
  }

  steps.forEach((step, i) => {
    const icon = step.status === 'completed' ? '✅' : step.status === 'skipped' ? '⏭️' : '⬜'
    const isCurrent = step.status === 'pending' && i === firstPending
    console.log(`${icon} Step ${i + 1}: ${step.name}${isCurrent ? ' ← 当前' : ''}`)
  })
}

async function resetStage(pm, progress, stageName, cwd, changeName) {
  const defSteps = await getStageSteps(stageName, cwd, progress)
  progress.stages[stageName] = {
    status: 'in-progress',
    startedAt: new Date().toLocaleString('zh-CN',{hour12:false}),
    completedAt: null,
    steps: defSteps ? defSteps.map(s => ({ name: s.name, status: 'pending' })) : []
  }
  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName)
  console.log(`🔄 ${stageName} 阶段已重置`)
}

/**
 * auto 模式：自动推进 brainstorm → plan → execute → verify
 */
async function runAutoMode(pm, progress, cwd, flags, changeName) {
  const flowStages = ['brainstorm', 'plan', 'execute', 'verify']
  const isDone = flags.includes('--done')
  const outputIdx = flags.indexOf('--output')
  const outputText = outputIdx !== -1 && flags[outputIdx + 1] ? flags[outputIdx + 1] : null
  const inputIdx = flags.indexOf('--input')
  const inputText = inputIdx !== -1 && flags[inputIdx + 1] ? flags[inputIdx + 1] : null
  const skipApproval = flags.includes('--skip-approval')
  const nextInFlow = (stage) => {
    const i = flowStages.indexOf(stage)
    return i >= 0 && i < flowStages.length - 1 ? flowStages[i + 1] : null
  }
  const firstOpenStage = () => flowStages.find(s => progress.stages?.[s]?.status !== 'completed')
  const ensureAutoStage = async (stage) => {
    const stageChanged = progress.currentStage !== stage
    progress.currentStage = stage
    const changed = await ensureStageSteps(progress, stage, cwd)
    if (stageChanged || changed) {
      await pm._write(cwd, progress, changeName)
      triggerSync(cwd, changeName)
    }
    progress = await pm.read(cwd, changeName)
    return progress
  }

  let currentStage = progress.currentStage
  if (!currentStage || progress.stages?.[currentStage]?.status === 'completed') {
    currentStage = firstOpenStage()
  }
  if (!currentStage) {
    console.log('All auto flow stages are complete.')
    return
  }
  if (!flowStages.includes(currentStage)) {
    const openStage = firstOpenStage()
    if (!openStage) {
      console.log('All auto flow stages are complete.')
      return
    }
    console.log(`⚠️  当前阶段 ${currentStage} 不在 auto 流程中，自动跳转到 ${openStage}`)
    currentStage = openStage
  }
  await ensureAutoStage(currentStage)

  if (!isDone) {
    console.log('════════════════════════════════════════')
    console.log('  SillySpec Auto Mode')
    if (changeName) console.log(`  Change: ${changeName}`)
    console.log('════════════════════════════════════════')
    console.log(`  Flow: ${flowStages.join(' -> ')}`)
    console.log(`  Current: ${currentStage}`)
    for (const stage of flowStages) {
      const stageData = progress.stages?.[stage]
      const total = stageData?.steps?.length || '?'
      const completed = stageData?.steps?.filter(step => step.status === 'completed' || step.status === 'skipped').length || 0
      const marker = stageData?.status === 'completed' ? 'done' : stage === currentStage ? 'active' : 'pending'
      console.log(`  ${marker} ${stage} (${completed}/${total})`)
    }
    console.log('')

    const defSteps = await getStageSteps(currentStage, cwd, progress)
    const pendingIdx = progress.stages[currentStage]?.steps?.findIndex(step => step.status === 'pending') ?? -1
    if (pendingIdx === -1) {
      const next = nextInFlow(currentStage)
      if (next) console.log(`${currentStage} is complete. Run: sillyspec run auto --done --output "${currentStage} complete"`)
      else console.log('All auto flow stages are complete.')
      return
    }
    // execute 阶段启动前检查审批
    if (currentStage === 'execute' && !skipApproval) {
      const approval = await checkApproval(cwd, changeName)
      if (approval) {
        if (approval.status === 'rejected') {
          console.error(`❌ 变更 ${changeName} 的执行已被拒绝：${approval.reason || '无原因'}`)
          process.exit(1)
        }
        if (approval.status === 'pending') {
          console.log(`⏳ 变更 ${changeName} 的执行审批待处理中...`)
          console.log('  提示：使用 --skip-approval 跳过审批检查')
        }
      }
    }
    await outputStep(currentStage, pendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
    return
  }

  if (!outputText) {
    console.error('auto --done requires --output')
    process.exit(1)
  }

  const result = await completeStep(pm, progress, currentStage, cwd, outputText, inputText, { printNext: false, changeName, platformOpts })
  if (!result) return
  progress = await pm.read(cwd, changeName)

  const nextPendingIdx = progress.stages[currentStage]?.steps?.findIndex(step => step.status === 'pending') ?? -1
  if (nextPendingIdx !== -1) {
    const defSteps = await getStageSteps(currentStage, cwd, progress)
    // execute 阶段启动前检查审批
    if (currentStage === 'execute' && !skipApproval) {
      const approval = await checkApproval(cwd, changeName)
      if (approval) {
        if (approval.status === 'rejected') {
          console.error(`❌ 变更 ${changeName} 的执行已被拒绝：${approval.reason || '无原因'}`)
          process.exit(1)
        }
        if (approval.status === 'pending') {
          console.log(`⏳ 变更 ${changeName} 的执行审批待处理中...`)
          console.log('  提示：使用 --skip-approval 跳过审批检查')
        }
      }
    }
    await outputStep(currentStage, nextPendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
    return
  }

  const next = nextInFlow(currentStage)
  if (!next) {
    console.log('\nAll auto flow stages are complete.')
    return
  }

  progress.currentStage = next
  if (!progress.stages[next]) {
    progress.stages[next] = { status: 'pending', steps: [], startedAt: null, completedAt: null }
  }
  if (progress.stages[next].status === 'pending' || !progress.stages[next].status) {
    progress.stages[next].status = 'in-progress'
    progress.stages[next].startedAt = new Date().toLocaleString('zh-CN',{hour12:false})
  }
  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  await ensureStageSteps(progress, next, cwd)
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName)
  progress = await pm.read(cwd, changeName)

  console.log(`\n${currentStage} complete. Auto advanced to ${next}.`)
  const nextSteps = await getStageSteps(next, cwd, progress)
  const firstPending = progress.stages[next]?.steps?.findIndex(step => step.status === 'pending') ?? -1
  if (firstPending !== -1) {
    // execute 阶段启动前检查审批
    if (next === 'execute' && !skipApproval) {
      const approval = await checkApproval(cwd, changeName)
      if (approval) {
        if (approval.status === 'rejected') {
          console.error(`❌ 变更 ${changeName} 的执行已被拒绝：${approval.reason || '无原因'}`)
          process.exit(1)
        }
        if (approval.status === 'pending') {
          console.log(`⏳ 变更 ${changeName} 的执行审批待处理中...`)
          console.log('  提示：使用 --skip-approval 跳过审批检查')
        }
      }
    }
    await outputStep(next, firstPending, nextSteps, cwd, changeName, progress.project || null, platformOpts)
  }
}
