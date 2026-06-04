/**
 * sillyspec run 命令实现
 *
 * CLI 成为流程引擎，AI 变成步骤执行器。
 * 支持多变更并行：每个变更状态存储在 sillyspec.db 中。
 */
import { basename, join } from 'path'
import { existsSync, readdirSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, statSync } from 'fs'
import { ProgressManager } from './progress.js'
import { stageRegistry, auxiliaryStages } from './stages/index.js'
import { buildExecuteSteps } from './stages/execute.js'
import { buildPlanSteps } from './stages/plan.js'
import { formatExecuteSummary } from './worktree-apply.js'

/**
 * 同步触发辅助函数：_write 后 best-effort 同步到平台
 */
async function triggerSync(cwd, changeName) {
  try {
    const syncMod = await import('./sync.js')
    await syncMod.sync(cwd, changeName)
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
    return await syncMod.checkApproval(cwd, changeName)
  } catch (e) {
    // sync.js 不存在或检查失败，静默跳过
    return null
  }
}

/**
 * 统一查找变更目录（与 progress.js 的变更检测逻辑一致）
 */
function resolveChangeDir(cwd, progress) {
  const changesDir = join(cwd, '.sillyspec', 'changes')
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
function autoDetectChange(progress, cwd) {
  if (progress.currentChange) return false
  const changesDir = join(cwd, '.sillyspec', 'changes')
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
function resolveChangeName(cwd, progress) {
  if (progress.currentChange) return progress.currentChange
  const changesDir = join(cwd, '.sillyspec', 'changes')
  if (!existsSync(changesDir)) return null
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) return entries[0].name
  return null
}

/**
 * 获取阶段的步骤定义（execute 需要动态构建）
 */
async function getStageSteps(stageName, cwd, progress) {
  if (stageName === 'execute') {
    const changeDir = resolveChangeDir(cwd, progress)
    let planFile = null
    if (changeDir) {
      const p = join(changeDir, 'plan.md')
      if (existsSync(p)) planFile = p
    }
    return buildExecuteSteps(planFile)
  }
  if (stageName === 'plan') {
    const changeDir = resolveChangeDir(cwd, progress)
    return buildPlanSteps(changeDir)
  }
  const def = stageRegistry[stageName]
  return def ? def.steps : null
}

/**
 * 确保阶段的 steps 已初始化到 progress
 */
async function ensureStageSteps(progress, stageName, cwd) {
  if (!progress.stages) progress.stages = {}

  const steps = await getStageSteps(stageName, cwd, progress)
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
  // 平台模式：注入路径覆盖指令（仅 scan 阶段）
  if (stageName === 'scan' && (platformOpts.specRoot || platformOpts.runtimeRoot)) {
    const platformDirectives = []
    if (platformOpts.specRoot) {
      platformDirectives.push(
        `## ⚠️ 平台模式 — 文档输出路径覆盖\n` +
        `本次 scan 的所有正式文档必须写入以下路径（替代默认的 \.sillyspec/docs/<project>/）：\n\n` +
        `| 类型 | 输出路径 |\n|------|----------|\n` +
        `| scan 文档 | ${platformOpts.specRoot}/scan/ |\n` +
        `| 模块文档 | ${platformOpts.specRoot}/modules/ |\n` +
        `| 流程文档 | ${platformOpts.specRoot}/flows/ |\n` +
        `| 术语表 | ${platformOpts.specRoot}/glossary.md |\n` +
        `| manifest | ${platformOpts.specRoot}/manifest.json |\n\n` +
        `创建目录：\`mkdir -p ${platformOpts.specRoot}/{scan,modules,flows}\`\n` +
        `所有写入操作使用上述绝对路径，不要回退到 \.sillyspec/docs/。`
      )
    }
    if (platformOpts.runtimeRoot) {
      const scanRunId = platformOpts.scanRunId || 'scan-' + new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
      platformDirectives.push(
        `\n运行时产物写入：\n` +
        `\`mkdir -p ${platformOpts.runtimeRoot}/scan-runs/${scanRunId}\`\n` +
        `原始输出、日志等运行时文件写入此目录。`
      )
    }
    if (platformOpts.workspaceId) {
      platformDirectives.push(
        `\nworkspace_id: ${platformOpts.workspaceId}`
      )
    }
    promptText = platformDirectives.join('\n') + '\n\n' + promptText
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
export async function runCommand(args, cwd) {
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
  const getFlagValue = (name) => {
    const idx = flags.indexOf(name)
    return idx !== -1 && flags[idx + 1] ? flags[idx + 1] : null
  }
  const platformOpts = {
    specRoot: getFlagValue('--spec-root'),
    runtimeRoot: getFlagValue('--runtime-root'),
    workspaceId: getFlagValue('--workspace-id'),
    scanRunId: getFlagValue('--scan-run-id'),
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

  const isAuxiliary = auxiliaryStages.includes(stageName)

  const pm = new ProgressManager()
  let progress = await pm.read(cwd, changeName)

  if (!progress) {
    // 如果指定了变更名或有变更目录，自动初始化变更的 progress
    const autoChange = changeName || resolveChangeNameAuto(cwd)
    if (autoChange) {
      progress = await pm.initChange(cwd, autoChange)
    } else if (isAuxiliary) {
      // 辅助阶段（scan/explore/quick/doctor/status）自动使用默认变更名
      const autoName = changeName || resolveChangeNameAuto(cwd) || 'default'
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
  const effectiveChange = changeName || progress.currentChange || resolveChangeName(cwd, progress)

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
  const changed = await ensureStageSteps(progress, stageName, cwd)
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
    return await completeStep(pm, progress, stageName, cwd, outputText, inputText, { confirm: isConfirm, changeName: effectiveChange })
  }

  // 默认：输出当前步骤
  return await runStage(pm, progress, stageName, cwd, effectiveChange, isSkipApproval)
}

/**
 * 自动推导变更名（不依赖 progress）
 */
function resolveChangeNameAuto(cwd) {
  const changesDir = join(cwd, '.sillyspec', 'changes')
  if (!existsSync(changesDir)) return null
  const entries = readdirSync(changesDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name !== 'archive')
  if (entries.length === 1) return entries[0].name
  return null
}

async function runStage(pm, progress, stageName, cwd, changeName, skipApproval = false) {
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

async function completeStep(pm, progress, stageName, cwd, outputText, inputText = null, options = {}) {
  const { printNext = true, confirm = false, changeName } = options
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
      const artifactsDir = join(cwd, '.sillyspec', '.runtime', 'artifacts')
      mkdirSync(artifactsDir, { recursive: true })
      const ts = new Date().toISOString().slice(0,19).replace(/[-T:]/g, '')
      writeFileSync(join(artifactsDir, `${changeName || 'unknown'}-${stageName}-step${currentIdx + 1}-${ts}.txt`), outputText)
    } else {
      steps[currentIdx].output = outputText
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

    // 平台模式：scan 完成后生成 manifest.json
    if (stageName === 'scan' && platformOpts.specRoot) {
      try {
        const { mkdirSync, writeFileSync } = await import('fs')
        const { join } = await import('path')
        const { execSync } = await import('child_process')
        mkdirSync(platformOpts.specRoot, { recursive: true })
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
        const manifestPath = join(platformOpts.specRoot, 'manifest.json')
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
        console.log(`📄 manifest.json 已写入: ${manifestPath}`)
        if (!sourceCommit) {
          console.log(`⚠️  source_commit 无法获取（可能非 git 目录），已设为 null`)
        }
      } catch (e) {
        console.warn(`⚠️  manifest.json 写入失败: ${e.message}`)
      }
    }

    validateMetadata(cwd, stageName)

    // 验证关键文件是否在正确的变更目录下
    validateFileLocations(cwd, stageName, progress, changeName)

    // archive 阶段确认归档
    if (stageName === 'archive' && steps[currentIdx]?.name === '确认归档') {
      if (confirm) {
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

        // 从全局活跃列表移除
        await pm.unregisterChange(cwd, archiveChangeName)
        console.log(`📦 已归档：${archiveChangeName} → archive/${date}-${archiveChangeName}/`)
      } else {
        console.log('⚠️  请添加 --confirm 确认归档，例如：sillyspec run archive --done --confirm --output "确认归档"')
      }
    }

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

  const result = await completeStep(pm, progress, currentStage, cwd, outputText, inputText, { printNext: false, changeName })
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
