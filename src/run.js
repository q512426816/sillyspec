/**
 * sillyspec run 命令实现
 *
 * CLI 成为流程引擎，AI 变成步骤执行器。
 */
import { basename, join } from 'path'
import { existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs'
import { ProgressManager } from './progress.js'
import { stageRegistry, getNextStage, auxiliaryStages } from './stages/index.js'
import { buildExecuteSteps } from './stages/execute.js'

/**
 * 获取阶段的步骤定义（execute 需要动态构建）
 */
function getStageSteps(stageName, cwd) {
  if (stageName === 'execute') {
    const plansDir = join(cwd, '.sillyspec', 'plans')
    let planFile = null
    if (existsSync(plansDir)) {
      const files = readdirSync(plansDir).filter(f => f.endsWith('.md')).sort()
      if (files.length > 0) planFile = join(plansDir, files[files.length - 1])
    }
    return buildExecuteSteps(planFile)
  }
  const def = stageRegistry[stageName]
  return def ? def.steps : null
}

/**
 * 确保阶段的 steps 已初始化到 progress.json
 */
function ensureStageSteps(progress, stageName, cwd) {
  if (!progress.stages) progress.stages = {}

  const steps = getStageSteps(stageName, cwd)
  if (!steps) return false

  if (!progress.stages[stageName] || !progress.stages[stageName].steps || progress.stages[stageName].steps.length === 0) {
    progress.stages[stageName] = {
      status: 'in-progress',
      startedAt: new Date().toISOString(),
      completedAt: null,
      steps: steps.map(s => ({ name: s.name, status: 'pending' }))
    }
    return true // 需要写入
  }

  // 检查步骤数量是否匹配（execute 动态步骤可能变化）
  if (progress.stages[stageName].steps.length !== steps.length) {
    // 保留已完成的状态，重新构建步骤列表
    const oldSteps = progress.stages[stageName].steps
    progress.stages[stageName].steps = steps.map((s, i) => {
      const old = oldSteps[i]
      if (old && old.name === s.name) return old
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

  console.log(`---`)
  console.log(`stage: ${stageName}`)
  console.log(`step: ${stepIndex + 1}/${total}`)
  console.log(`stepName: ${step.name}`)
  console.log(`project: ${projectName}`)
  console.log(`---\n`)
  console.log(`## Step ${stepIndex + 1}/${total}: ${step.name}\n`)
  console.log(step.prompt)
  console.log(`\n### ⚠️ 铁律`)
  console.log('- 只做本步骤描述的操作，不得自行扩展或跳过')
  console.log('- 不要回头修改已完成的步骤')
  console.log('- 完成后立即执行 --done 命令，不得跳过')
  console.log('- 生成的文件头部必须包含 author（git 用户名）和 created_at（精确到秒）')
  console.log(`\n### 完成后执行`)
  console.log(`sillyspec run ${stageName} --done --output "你的摘要"`)
}

/**
 * sillyspec run <stage> 主命令
 */
export function runCommand(args, cwd) {
  // 解析参数
  const stageName = args[0]
  const flags = args.slice(1)

  if (!stageName || !stageRegistry[stageName]) {
    console.error(`❌ 未知阶段: ${stageName || '(未指定)'}`)
    console.error(`可选: ${Object.keys(stageRegistry).join(', ')}`)
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

  // --reset
  if (isReset) {
    return resetStage(pm, progress, stageName, cwd)
  }

  // 确保步骤已初始化
  const changed = ensureStageSteps(progress, stageName, cwd)
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
    return skipStep(pm, progress, stageName, cwd)
  }

  // --done
  if (isDone) {
    return completeStep(pm, progress, stageName, cwd, outputText)
  }

  // 默认：输出当前步骤
  return runStage(progress, stageName, cwd)
}

function runStage(progress, stageName, cwd) {
  const stageData = progress.stages[stageName]
  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  const steps = stageData.steps
  const currentIdx = steps.findIndex(s => s.status !== 'completed' && s.status !== 'skipped')

  if (currentIdx === -1) {
    const total = steps.length
    console.log(`✅ ${stageName} 阶段已完成（${total}/${total} 步）`)
    const next = getNextStage(stageName)
    if (next) {
      console.log(`\n下一步：sillyspec run ${next}`)
      console.log(`或：/sillyspec:${next}`)
    }
    process.exit(2)
  }

  const stageDef = stageRegistry[stageName]
  const defSteps = getStageSteps(stageName, cwd)
  if (defSteps && defSteps[currentIdx]) {
    outputStep(stageName, currentIdx, defSteps, cwd)
  }
}

function completeStep(pm, progress, stageName, cwd, outputText) {
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

  // 标记完成
  steps[currentIdx].status = 'completed'
  steps[currentIdx].completedAt = new Date().toISOString()
  if (outputText) {
    const MAX_OUTPUT = 200
    if (outputText.length > MAX_OUTPUT) {
      steps[currentIdx].output = outputText.slice(0, MAX_OUTPUT) + '…'
      // Save full output to artifacts/
      const artifactsDir = join(cwd, '.sillyspec', '.runtime', 'artifacts')
      mkdirSync(artifactsDir, { recursive: true })
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      writeFileSync(join(artifactsDir, `${stageName}-step${currentIdx + 1}-${ts}.txt`), outputText)
    } else {
      steps[currentIdx].output = outputText
    }
  }

  // 检查是否还有下一步
  const nextPendingIdx = steps.findIndex(s => s.status === 'pending')

  if (nextPendingIdx === -1) {
    // 全部完成
    stageData.status = 'completed'
    stageData.completedAt = new Date().toISOString()

    const next = getNextStage(stageName)
    if (next) {
      progress.currentStage = next
      if (!progress.stages[next]) progress.stages[next] = { status: 'pending', steps: [], startedAt: null, completedAt: null }
      if (progress.stages[next].status === 'pending' || !progress.stages[next].status) {
        progress.stages[next].status = 'in-progress'
        progress.stages[next].startedAt = new Date().toISOString()
      }
    }

    progress.lastActive = new Date().toISOString()
    pm._write(cwd, progress)

    const total = steps.length
    console.log(`✅ ${stageName} 阶段已完成（${total}/${total} 步）`)
    if (next) {
      console.log(`\n下一步：sillyspec run ${next}`)
      console.log(`或：/sillyspec:${next}`)
    }
    return
  }

  progress.lastActive = new Date().toISOString()
  pm._write(cwd, progress)

  const defSteps = getStageSteps(stageName, cwd)
  console.log(`✅ Step ${currentIdx + 1}/${steps.length} 完成：${steps[currentIdx].name}\n`)
  outputStep(stageName, nextPendingIdx, defSteps, cwd)
}

function skipStep(pm, progress, stageName, cwd) {
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

  const defSteps = getStageSteps(stageName, cwd)
  const stepDef = defSteps ? defSteps[currentIdx] : null
  if (stepDef && !stepDef.optional) {
    console.error(`❌ 步骤 "${steps[currentIdx].name}" 不可跳过`)
    process.exit(1)
  }

  steps[currentIdx].status = 'skipped'
  steps[currentIdx].skippedAt = new Date().toISOString()
  progress.lastActive = new Date().toISOString()
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

  steps.forEach((step, i) => {
    const icon = step.status === 'completed' ? '✅' : step.status === 'skipped' ? '⏭️' : '⬜'
    const isCurrent = step.status === 'pending' && i === firstPending
    console.log(`${icon} Step ${i + 1}: ${step.name}${isCurrent ? ' ← 当前' : ''}`)
  })
}

function resetStage(pm, progress, stageName, cwd) {
  const defSteps = getStageSteps(stageName, cwd)
  progress.stages[stageName] = {
    status: 'in-progress',
    startedAt: new Date().toISOString(),
    completedAt: null,
    steps: defSteps ? defSteps.map(s => ({ name: s.name, status: 'pending' })) : []
  }
  progress.lastActive = new Date().toISOString()
  pm._write(cwd, progress)
  console.log(`🔄 ${stageName} 阶段已重置`)
}
