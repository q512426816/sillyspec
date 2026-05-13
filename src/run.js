/**
 * sillyspec run 命令实现
 *
 * CLI 成为流程引擎，AI 变成步骤执行器。
 */
import { basename, join } from 'path'
import { existsSync, readdirSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, statSync } from 'fs'
import { ProgressManager } from './progress.js'
import { stageRegistry, auxiliaryStages } from './stages/index.js'
import { buildExecuteSteps } from './stages/execute.js'
import { buildPlanSteps } from './stages/plan.js'

/**
 * 统一查找变更目录
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
 * 确保阶段的 steps 已初始化到 progress.json
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
    // 保留已完成的状态，重新构建步骤列表
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
function outputStep(stageName, stepIndex, steps, cwd) {
  const step = steps[stepIndex]
  const total = steps.length
  const projectName = basename(cwd)

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
你是一位实战经验丰富的全栈工程师。不纠结架构和流程，理解需求就直接干。不确定的地方先问清楚再动手，先读后写，改完就收。问题排查思路开阔，前端报错不一定是前端问题——可能是后端数据、浏览器兼容、甚至设备硬件。解决方案实用接地气，用户描述有误敢于直接指出。`
  }

  console.log(`---`)
  console.log(`stage: ${stageName}`)
  console.log(`step: ${stepIndex + 1}/${total}`)
  console.log(`stepName: ${step.name}`)
  console.log(`project: ${projectName}`)
  console.log(`---\n`)
  if (personas[stageName]) {
    console.log(personas[stageName])
    console.log('')
  }
  console.log(`## Step ${stepIndex + 1}/${total}: ${step.name}\n`)
  console.log(step.prompt)
  console.log(`\n### ⚠️ 铁律`)
  console.log('- **文档是核心资产，代码是文档的产物。** 没有文档就没有代码——文档是 AI 的记忆，是团队协作的基础，是后续维护的唯一依据。任何代码产出必须先有对应的设计/规范文档支撑。')
  console.log('- 只做本步骤描述的操作，不得自行扩展或跳过')
  console.log('- 不要回头修改已完成的步骤')
  console.log('- 不要编造不存在的 CLI 子命令')
  console.log('- 完成后立即执行 --done 命令，不得跳过')
  console.log('- 文档类型文件（.md/.yaml/.json 等）头部必须包含 author（git 用户名）和 created_at（精确到秒）')
  console.log('- 执行构建/测试前必须先读 local.yaml，优先使用其中配置的命令、路径和环境变量；未配置时才使用默认值')
  console.log(`\n### 完成后执行`)
  console.log(`sillyspec run ${stageName} --done --input "用户原始需求/反馈" --output "你的摘要"`)
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
  let progress = pm.read(cwd)

  if (!progress) {
    // 辅助命令可以在没有 progress.json 时工作（比如 scan）
    if (!isAuxiliary) {
      console.error('❌ 未找到 progress.json，请先运行 sillyspec init')
      process.exit(1)
    }
    progress = pm.init(cwd)
  }

  // -- auto 模式：自动推进所有流程阶段
  if (stageName === 'auto') {
    return await runAutoMode(pm, progress, cwd, flags)
  }

  // --change 设置当前变更名
  if (changeName) {
    progress.currentChange = changeName
    progress.lastActive = new Date().toLocaleString('zh-CN', { hour12: false })
    pm._write(cwd, progress)
    console.log(`✅ 当前变更设置为：${changeName}`)
    return
  }

  // --reset
  if (isReset) {
    return await resetStage(pm, progress, stageName, cwd)
  }

  // 确保步骤已初始化
  const changed = await ensureStageSteps(progress, stageName, cwd)
  if (changed) {
    pm._write(cwd, progress)
    progress = pm.read(cwd)
  }

  // --status
  if (isStatus) {
    return showStatus(progress, stageName)
  }

  // --skip
  if (isSkip) {
    return await skipStep(pm, progress, stageName, cwd)
  }

  // --done
  if (isDone) {
    return await completeStep(pm, progress, stageName, cwd, outputText, inputText)
  }

  // 默认：输出当前步骤
  return await runStage(pm, progress, stageName, cwd)
}

async function runStage(pm, progress, stageName, cwd) {
  // 自动探测 currentChange
  if (autoDetectChange(progress, cwd)) {
    progress.lastActive = new Date().toLocaleString('zh-CN', { hour12: false })
    pm._write(cwd, progress)
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
    pm._write(cwd, progress)
  }

  const steps = stageData.steps
  let currentIdx = steps.findIndex(s => s.status !== 'completed' && s.status !== 'skipped')

  if (currentIdx === -1) {
    console.log(`✅ ${stageName} 阶段已完成。`)
    console.log(`  如需重新开始，请显式执行 --reset。\n`)
    return
  } else if (currentIdx > 0) {
    // 有进行中的步骤，提示用户
    const completed = currentIdx
    const total = steps.length
    console.log(`⚠️  ${stageName} 已进行到第 ${currentIdx + 1}/${total} 步（前 ${completed} 步已完成）。`)
    console.log(`  继续执行将从中断处恢复，用 --reset 可重新开始。\n`)
  }

  const defSteps = await getStageSteps(stageName, cwd, progress)
  if (defSteps && defSteps[currentIdx]) {
    outputStep(stageName, currentIdx, defSteps, cwd)
  }
}

function validateMetadata(cwd, stageName) {
  const changesDir = join(cwd, '.sillyspec', 'changes')
  if (!existsSync(changesDir)) return

  // 找最近 10 分钟内修改的 md/yaml 文件
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

async function completeStep(pm, progress, stageName, cwd, outputText, inputText = null, options = {}) {
  const { printNext = true } = options
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

  // 标记完成（先标记，再处理动态步骤插入）

  steps[currentIdx].status = 'completed'
  steps[currentIdx].completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
  if (outputText) {
    const MAX_OUTPUT = 200
    if (outputText.length > MAX_OUTPUT) {
      steps[currentIdx].output = outputText.slice(0, MAX_OUTPUT) + '…'
      // Save full output to artifacts/
      const artifactsDir = join(cwd, '.sillyspec', '.runtime', 'artifacts')
      mkdirSync(artifactsDir, { recursive: true })
      const ts = new Date().toISOString().slice(0,19).replace(/[-T:]/g, '')
      writeFileSync(join(artifactsDir, `${stageName}-step${currentIdx + 1}-${ts}.txt`), outputText)
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
        // 提取协调器步骤（prefix 和 suffix 之间）
        const coordinatorSteps = fullSteps.slice(prefixLen, suffixLen > 0 ? -suffixLen : undefined)
        if (coordinatorSteps.length > 0) {
          // 在当前步骤之后插入协调器步骤
          for (let i = 0; i < coordinatorSteps.length; i++) {
            steps.splice(currentIdx + 1 + i, 0, { name: coordinatorSteps[i].name, status: 'pending' })
          }
          console.log(`  📝 已动态插入 ${coordinatorSteps.length} 个任务蓝图步骤（${coordinatorSteps.map(s => s.name).join(', ')}）`)
        }
      }
    }
  }

  const nextPendingIdx = steps.findIndex(s => s.status === 'pending')

  if (nextPendingIdx === -1) {
    // 全部完成 — 仅标记当前阶段，不自动推进 currentStage
    stageData.status = 'completed'
    stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
    progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
    pm._write(cwd, progress)

    // Append to user-inputs.md
    if (outputText) {
      const inputsPath = join(cwd, '.sillyspec', '.runtime', 'user-inputs.md')
      const entry = `\n## ${new Date().toLocaleString('zh-CN',{hour12:false})} | ${stageName}: ${steps[currentIdx].name}\n${inputText ? "- 输入：" + inputText + "\n" : ""}- 输出：${outputText}\n`
      appendFileSync(inputsPath, entry)
    }

    // 验证：检查生成的文件是否包含 author 和 created_at
    validateMetadata(cwd, stageName)

    const total = steps.length
    console.log(`✅ ${stageName} 阶段已完成（${total}/${total} 步）`)
    console.log(`\n下一步由你决定：sillyspec run <stage>（brainstorm/plan/execute/verify/archive 等）`)
    return { stageCompleted: true, currentIdx, nextPendingIdx: -1 }
  }

  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  pm._write(cwd, progress)

  // Append to user-inputs.md
  if (outputText) {
    const inputsPath = join(cwd, '.sillyspec', '.runtime', 'user-inputs.md')
    const entry = `\n## ${new Date().toLocaleString('zh-CN',{hour12:false})} | ${stageName}: ${steps[currentIdx].name}\n${inputText ? "- 输入：" + inputText + "\n" : ""}- 输出：${outputText}\n`
    appendFileSync(inputsPath, entry)
  }

  const defSteps = await getStageSteps(stageName, cwd, progress)
  console.log(`✅ Step ${currentIdx + 1}/${steps.length} 完成：${steps[currentIdx].name}\n`)
  if (printNext) {
    outputStep(stageName, nextPendingIdx, defSteps, cwd)
  }
  return { stageCompleted: false, currentIdx, nextPendingIdx }
}

async function skipStep(pm, progress, stageName, cwd) {
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
  pm._write(cwd, progress)

  console.log(`⏭️ Step ${currentIdx + 1}/${steps.length} 已跳过：${steps[currentIdx].name}`)

  // 输出下一步
  const nextPendingIdx = steps.findIndex(s => s.status === 'pending')
  if (nextPendingIdx !== -1 && defSteps) {
    console.log('')
    outputStep(stageName, nextPendingIdx, defSteps, cwd)
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

  // 批量进度
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

async function resetStage(pm, progress, stageName, cwd) {
  const defSteps = await getStageSteps(stageName, cwd, progress)
  progress.stages[stageName] = {
    status: 'in-progress',
    startedAt: new Date().toLocaleString('zh-CN',{hour12:false}),
    completedAt: null,
    steps: defSteps ? defSteps.map(s => ({ name: s.name, status: 'pending' })) : []
  }
  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  pm._write(cwd, progress)
  console.log(`🔄 ${stageName} 阶段已重置`)
}

/**
 * auto 模式：自动推进 brainstorm → plan → execute → verify
 */
async function runAutoMode(pm, progress, cwd, flags) {
  const flowStages = ['brainstorm', 'plan', 'execute', 'verify']
  const isDone = flags.includes('--done')
  const outputIdx = flags.indexOf('--output')
  const outputText = outputIdx !== -1 && flags[outputIdx + 1] ? flags[outputIdx + 1] : null
  const inputIdx = flags.indexOf('--input')
  const inputText = inputIdx !== -1 && flags[inputIdx + 1] ? flags[inputIdx + 1] : null
  const nextInFlow = (stage) => {
    const i = flowStages.indexOf(stage)
    return i >= 0 && i < flowStages.length - 1 ? flowStages[i + 1] : null
  }
  const firstOpenStage = () => flowStages.find(s => progress.stages?.[s]?.status !== 'completed')
  const ensureAutoStage = async (stage) => {
    const stageChanged = progress.currentStage !== stage
    progress.currentStage = stage
    const changed = await ensureStageSteps(progress, stage, cwd)
    if (stageChanged || changed) pm._write(cwd, progress)
    progress = pm.read(cwd)
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
    // 当前在辅助阶段（scan/quick/archive 等），自动跳到第一个未完成的流程阶段
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
    outputStep(currentStage, pendingIdx, defSteps, cwd)
    return
  }

  if (!outputText) {
    console.error('auto --done requires --output')
    process.exit(1)
  }

  const result = await completeStep(pm, progress, currentStage, cwd, outputText, inputText, { printNext: false })
  if (!result) return
  progress = pm.read(cwd)

  const nextPendingIdx = progress.stages[currentStage]?.steps?.findIndex(step => step.status === 'pending') ?? -1
  if (nextPendingIdx !== -1) {
    const defSteps = await getStageSteps(currentStage, cwd, progress)
    outputStep(currentStage, nextPendingIdx, defSteps, cwd)
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
  pm._write(cwd, progress)
  progress = pm.read(cwd)

  console.log(`\n${currentStage} complete. Auto advanced to ${next}.`)
  const nextSteps = await getStageSteps(next, cwd, progress)
  const firstPending = progress.stages[next]?.steps?.findIndex(step => step.status === 'pending') ?? -1
  if (firstPending !== -1) outputStep(next, firstPending, nextSteps, cwd)
}
