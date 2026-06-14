/**
 * sillyspec run 命令实现
 *
 * CLI 成为流程引擎，AI 变成步骤执行器。
 * 支持多变更并行：每个变更状态存储在 sillyspec.db 中。
 */
import { basename, join, resolve, dirname } from 'path'
import { existsSync, readdirSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, rmSync, statSync } from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { ProgressManager } from './progress.js'
import { SCAN_STATUS, POINTER_STATUS, isPointerCorrupted } from './constants.js'

/**
 * 在容器/Docker 环境下，git 可能因目录所有权不匹配报 dubious ownership。
 * 使用 -c safe.directory= 临时参数，不污染全局 git config。
 * @param {string} cwd - 仓库根目录
 * @param {string[]} args - git 子命令及参数，如 ['rev-parse', 'HEAD']
 * @returns {{ value: string, error: string|null }}
 */
function safeGit(cwd, args) {
  const { execSync } = require('child_process')
  const fullArgs = ['-c', `safe.directory=${cwd}`, '-C', cwd, ...args]
  try {
    const value = execSync(['git', ...fullArgs].join(' '), { encoding: 'utf8', timeout: 5000 }).trim()
    return { value, error: null }
  } catch (e) {
    return { value: null, error: e.message.split('\n')[0] }
  }
}

// ── Wait State Constants ──
// 正则匹配：只识别独立一行的标记，避免误伤文档正文引用
const WAIT_MARKER_RE = /^\s*\[(WAIT_FOR_USER|NEEDS_CONFIRM|NEEDS_DECISION)\]\s*$/m
const WAIT_MARKERS = ['[WAIT_FOR_USER]', '[NEEDS_CONFIRM]', '[NEEDS_DECISION]']

/**
 * 格式化 waitOptions 为人类可读字符串
 */
function formatWaitOptions(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.join(', ')
    return raw
  } catch {
    return raw
  }
}

/**
 * 格式化 repeatableWait 步骤的历史用户回答，注入到重新输出的 step prompt 前。
 * @param {object} step - progress 中的 step 对象（含 waitAnswers 数组）
 * @returns {string|null} 格式化的历史文本，或 null（无历史）
 */
function formatWaitHistory(step) {
  const answers = Array.isArray(step.waitAnswers) ? step.waitAnswers : []
  if (answers.length === 0) return null
  let text = `本步骤历史用户回答（共 ${answers.length} 轮）：\n`
  for (const item of answers) {
    text += `\n${item.round}. ${item.answer}`
    if (item.question) {
      text += `\n   对应问题/摘要：${item.question}`
    }
  }
  const maxRounds = step.maxWaitRounds || null
  if (maxRounds && answers.length >= maxRounds) {
    text += `\n\n已达到 maxWaitRounds=${maxRounds}。请基于以上回答总结需求；除非仍有阻塞问题，否则完成本步骤并进入方案讨论。`
  } else {
    text += `\n\n请判断信息是否足够：如果足够，完成本步骤；如果仍缺关键约束，再提出一个问题并 --wait。`
  }
  return text
}

/**
 * 解析规范目录路径
 * 向上查找含 .sillyspec 的祖先目录，类似 git 找 .git 的逻辑。
 * @param {string} cwd - 项目根目录（或子目录）
 * @param {object} [opts]
 * @param {string} [opts.specDir] - 用户指定的 specDir（通过 --spec-dir 或 --spec-root）
 * @returns {string} 规范目录的绝对路径
 */
function resolveSpecDir(cwd, opts = {}) {
  if (opts.specDir) return resolve(opts.specDir)
  let dir = resolve(cwd)
  while (true) {
    const candidate = join(dir, '.sillyspec')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return join(resolve(cwd), '.sillyspec')
}
import { stageRegistry, auxiliaryStages } from './stages/index.js'
import { checkTransition, runValidators } from './stage-contract.js'
import { buildExecuteSteps } from './stages/execute.js'
import { buildPlanSteps } from './stages/plan.js'
import { formatExecuteSummary } from './worktree-apply.js'

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
    const { existsSync, readFileSync } = require('fs')
    const { join } = require('path')
    const mapPath = join(specBase, 'docs', projectName, 'modules', '_module-map.yaml')
    if (!existsSync(mapPath)) return null
    const content = readFileSync(mapPath, 'utf8')
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
  const { existsSync } = require('fs')
  const { join } = require('path')

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

// 复用 modules.js 的简单 YAML 解析（避免循环依赖）
function parseModuleMapSimple(content) {
  const modules = {}
  let currentModule = null
  let currentKey = null
  let currentArray = null

  for (const line of content.split('\n')) {
    const moduleMatch = line.match(/^  ([a-zA-Z0-9_-]+):$/)
    if (moduleMatch) {
      if (currentArray && currentModule && currentKey) {
        modules[currentModule][currentKey] = currentArray
      }
      currentModule = moduleMatch[1]
      modules[currentModule] = {}
      currentKey = null
      currentArray = null
      continue
    }
    if (!currentModule) continue

    const arrayFieldMatch = line.match(/^    (depends_on|used_by|paths|tags|aliases|entrypoints|main_symbols|review_reasons|core_files|test_files|related_docs|verify_commands):$/)
    if (arrayFieldMatch) {
      if (currentArray && currentKey) modules[currentModule][currentKey] = currentArray
      currentKey = arrayFieldMatch[1]
      currentArray = []
      continue
    }

    const inlineArrayMatch = line.match(/^    (depends_on|used_by|paths|tags|aliases|entrypoints|main_symbols|review_reasons|core_files|test_files|related_docs|verify_commands): \[(.*)\]$/)
    if (inlineArrayMatch) {
      if (currentArray && currentKey) modules[currentModule][currentKey] = currentArray
      const vals = inlineArrayMatch[2].split(',').map(v => v.trim()).filter(Boolean)
      modules[currentModule][inlineArrayMatch[1]] = vals
      currentKey = null
      currentArray = null
      continue
    }

    const scalarMatch = line.match(/^    (status|doc|needs_review|role|risk_level): (.+)$/)
    if (scalarMatch) {
      if (currentArray && currentKey) { modules[currentModule][currentKey] = currentArray; currentArray = null; currentKey = null }
      modules[currentModule][scalarMatch[1]] = scalarMatch[2]
      continue
    }

    const itemMatch = line.match(/^      - (.+)$/)
    if (itemMatch && currentArray !== null) {
      currentArray.push(itemMatch[1].trim())
      continue
    }
  }
  if (currentArray && currentModule && currentKey) {
    modules[currentModule][currentKey] = currentArray
  }
  return modules
}

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

    // quicklog 存在性检查
    try {
      const quicklogDir = join(cwd, '.sillyspec', 'quicklog')
      if (existsSync(quicklogDir)) {
        const qlFiles = readdirSync(quicklogDir).filter(f => f.endsWith('.md'))
        if (qlFiles.length === 0) {
          result.reasons.push('quicklog 目录为空（无任务记录）')
          if (result.status === 'safe') result.status = 'warning'
        }
      } else {
        result.reasons.push('quicklog 目录不存在（agent 未创建任务记录）')
        if (result.status === 'safe') result.status = 'warning'
      }
    } catch {}

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

async function triggerSync(cwd, changeName, platformOpts = {}) {
  // 平台模式（SillyHub）走自己的回传链路，不走 CLI 内置 sync
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) return
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
async function checkApproval(cwd, changeName, platformOpts = {}) {
  // 平台模式不需要 CLI 内置审批检查
  if (platformOpts?.specRoot || platformOpts?.runtimeRoot) return null
  try {
    const syncMod = await import('./sync.js')
    return await syncMod.checkApproval(changeName, cwd)
  } catch (e) {
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
async function outputStep(stageName, stepIndex, steps, cwd, changeName, dbProjectName, platformOpts = {}, prevStepAnswer = null) {
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
    const isPlatform = platformOpts?.specRoot || platformOpts?.runtimeRoot
    const changeDirBase = isPlatform ? platformOpts.specRoot : '.sillyspec'
    const changeDir = join(changeDirBase, 'changes', changeName)
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
    const workflowsRoot = join(specSillyspec, 'workflows')
    const knowledgeRoot = join(specSillyspec, 'knowledge')

    promptText = promptText.replace(/\{DOCS_ROOT\}/g, docsRoot)
    promptText = promptText.replace(/\{PROJECTS_ROOT\}/g, projectsRoot)
    promptText = promptText.replace(/\{WORKFLOWS_ROOT\}/g, workflowsRoot)
    promptText = promptText.replace(/\{KNOWLEDGE_ROOT\}/g, knowledgeRoot)
    promptText = promptText.replace(/\{SPEC_ROOT\}/g, specSillyspec)

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
    promptText = promptText.replace(/\{DOCS_ROOT\}/g, _docsRoot)
    promptText = promptText.replace(/\{PROJECTS_ROOT\}/g, join(_specSS, 'projects'))
    promptText = promptText.replace(/\{WORKFLOWS_ROOT\}/g, join(_specSS, 'workflows'))
    promptText = promptText.replace(/\{KNOWLEDGE_ROOT\}/g, join(_specSS, 'knowledge'))
    promptText = promptText.replace(/\{SPEC_ROOT\}/g, _specSS)
  } else {
    // 非 platform 模式也要替换占位符
    const projectName = dbProjectName || basename(cwd)
    const specSillyspec = join(cwd, '.sillyspec')
    const docsRoot = join(specSillyspec, 'docs', projectName)
    const projectsRoot = join(specSillyspec, 'projects')
    const workflowsRoot = join(specSillyspec, 'workflows')
    const knowledgeRoot = join(specSillyspec, 'knowledge')
    promptText = promptText.replace(/\{DOCS_ROOT\}/g, docsRoot)
    promptText = promptText.replace(/\{PROJECTS_ROOT\}/g, projectsRoot)
    promptText = promptText.replace(/\{WORKFLOWS_ROOT\}/g, workflowsRoot)
    promptText = promptText.replace(/\{KNOWLEDGE_ROOT\}/g, knowledgeRoot)
    promptText = promptText.replace(/\{SPEC_ROOT\}/g, specSillyspec)
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
      process.exit(1)
    }
  }

  if (prevStepAnswer) {
    console.log(`\n### 📩 上一步用户回答`) 
    console.log(prevStepAnswer)
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
    const isPlatform = platformOpts?.specRoot || platformOpts?.runtimeRoot
    const changeDirBase = isPlatform ? platformOpts.specRoot : '.sillyspec'
    const changeDir = join(changeDirBase, 'changes', changeName)
    console.log(`- **文件路径规则：所有变更文件必须写入 \`${changeDir}/\` 目录下。不要自己拼接路径，直接使用 changeDir 值。示例：\`${changeDir}/proposal.md\`**`)
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
 * 根据 project 规模计算 scan profile
 * quick:   fileCount≤30 && sourceBytes≤80KB && projectCount≤3 → 3 步，0 子代理，5 份文档
 * standard: fileCount≤200 && sourceBytes≤800KB → 压缩步骤，最多 1 子代理
 * deep:    大项目或 --deep → 完整流程
 */
function computeScanProfile(cwd, platformOpts) {
  // --deep 标志强制 deep
  const flags = process.argv.slice(2)
  if (flags.includes('--deep')) {
    return { mode: 'deep', reason: '用户指定 --deep', maxAgentCalls: 4, maxDocs: 99 }
  }

  const specDir = platformOpts?.specRoot || join(cwd, '.sillyspec')
  const projectsDir = join(specDir, 'projects')
  let projectCount = 1
  try {
    if (existsSync(projectsDir)) {
      projectCount = readdirSync(projectsDir).filter(f => f.endsWith('.yaml')).length
    }
  } catch {}

  // 快速估算源码规模
  let fileCount = 0
  let sourceBytes = 0
  try {
    const { execSync } = require('child_process')
    const findCmd = `find "${cwd}" -type f \\( -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.java' -o -name '*.go' -o -name '*.rs' -o -name '*.rb' -o -name '*.php' -o -name '*.c' -o -name '*.cpp' -o -name '*.h' -o -name '*.jsx' -o -name '*.vue' -o -name '*.svelte' \\) -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/__pycache__/*' -not -path '*/.sillyspec/*' -not -path '*/.claude/*' 2>/dev/null`
    const files = execSync(findCmd, { encoding: 'utf8', timeout: 10000 }).trim().split('\n').filter(Boolean)
    fileCount = files.length
    for (const f of files) {
      try { sourceBytes += statSync(f).size } catch {}
    }
  } catch {
    // find 失败时假设中等规模
    return { mode: 'standard', reason: '无法估算项目规模', maxAgentCalls: 1, maxDocs: 8 }
  }

  if (fileCount <= 30 && sourceBytes <= 80_000 && projectCount <= 3) {
    return { mode: 'quick', reason: `${fileCount} 源文件, ${Math.round(sourceBytes / 1024)}KB`, maxAgentCalls: 0, maxDocs: 5, _fileCount: fileCount, _sourceBytes: sourceBytes, _projectCount: projectCount }
  }
  if (fileCount <= 200 && sourceBytes <= 800_000) {
    return { mode: 'standard', reason: `${fileCount} 源文件, ${Math.round(sourceBytes / 1024)}KB`, maxAgentCalls: 1, maxDocs: 8, _fileCount: fileCount, _sourceBytes: sourceBytes, _projectCount: projectCount }
  }
  return { mode: 'deep', reason: `${fileCount} 源文件, ${Math.round(sourceBytes / 1024)}KB`, maxAgentCalls: 4, maxDocs: 99, _fileCount: fileCount, _sourceBytes: sourceBytes, _projectCount: projectCount }
}

/**
 * 根据 scanProfile 裁剪步骤
 * quick:   3 步 — CLI preflight / AI generate / CLI postcheck
 * standard: 跳过续扫检测(4), 跳过可选步骤(9)
 */
function applyScanProfileSteps(stageData, profile, cwd, platformOpts) {
  const steps = stageData.steps
  const mode = profile.mode

  if (mode === 'quick') {
    const specBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
    const projectName = basename(cwd)
    const docsRoot = join(specBase, 'docs', projectName)

    // Step 1: CLI preflight（不调 AI，自动完成）
    const step1 = {
      name: '项目概览（自动探测）',
      status: 'pending',
      noAI: true,
      _cliAction: 'scanPreflight',
      prompt: '',
      outputHint: 'preflight 结果',
      optional: false
    }
    // Step 2: AI 生成核心文档（唯一 AI roundtrip）
    const step2 = {
      name: '生成核心文档',
      status: 'pending',
      prompt: `## Quick Scan — 核心文档生成

项目规模较小（quick profile），请一次性生成所有核心文档。

### 操作
1. 读取项目结构和关键文件（package.json / pyproject.toml / README / 入口文件）
2. 生成以下 4 份文档并写入 \`{DOCS_ROOT}/scan/\`：
   - **PROJECT.md** — 项目简介、技术栈、模块划分
   - **ARCHITECTURE.md** — 架构概览、模块关系、技术决策
   - **CONVENTIONS.md** — 代码风格、框架隐形规则
   - **STRUCTURE.md** — 目录树 + 模块说明
3. 如发现子项目，注册到 \`{PROJECTS_ROOT}/\` 下

每份文档头必须包含 frontmatter：\`author\` 和 \`created_at\`。

### ⛔ 硬约束
- **严禁使用子代理（Agent/Task 工具）。** 所有文档在一个 turn 内完成。
- 不要搜索 .sillyspec/ .claude/ .git/ node_modules/ dist/ build/
- --output 只需要列出生成的文件名，不要写长篇总结

### 输出
生成的文件列表`,
      outputHint: '文件列表',
      optional: false
    }
    // Step 3: CLI postcheck（不调 AI，自动完成）
    const selfCheck = steps.find(s => s.name === '自检和提交') || {
      name: '自检和提交', status: 'pending', prompt: '', outputHint: '结果', optional: false
    }
    const step3 = { ...selfCheck, status: 'pending', noAI: true, _cliAction: 'scanPostcheck', prompt: '' }
    stageData.steps = [step1, step2, step3]
    return
  }

  if (mode === 'standard') {
    // 跳过 Step 4（断点续扫检测），跳过 Step 9（flows+glossary，可选）
    const skipNames = ['断点续扫检测', '生成业务流程和术语表（可选）']
    for (const step of stageData.steps) {
      if (skipNames.includes(step.name) && step.status === 'pending') {
        step.status = 'skipped'
        step.skippedAt = new Date().toLocaleString('zh-CN', { hour12: false })
      }
    }
  }
}

/**
 * CLI-only: quick scan preflight
 * 收集项目快照，打印 summary，不调 AI
 */
async function executeScanPreflight(cwd, platformOpts, scanProfile) {
  const specBase = platformOpts?.specRoot || join(cwd, '.sillyspec')
  const projectName = basename(cwd)
  console.log(`  📁 项目: ${projectName}`)
  console.log(`  📊 Profile: ${scanProfile.mode} (${scanProfile.reason})`)
  // 快速列出顶层结构
  try {
    const { execSync } = await import('child_process')
    const dirs = execSync(`ls -d */ 2>/dev/null | grep -v node_modules | grep -v '.git' | grep -v '.sillyspec' | grep -v '.claude' | head -20`, { cwd, encoding: 'utf8' }).trim()
    if (dirs) {
      console.log(`  📂 目录: ${dirs.split('\n').map(d => d.replace(/\/$/, '')).join(', ')}`)
    }
  } catch {}
  console.log(`  ✅ Preflight 完成，准备生成核心文档\n`)
}

/**
 * CLI-only: quick scan postcheck
 * 执行文件存在性 + manifest 检查，不调 AI
 */
async function executeScanPostcheck(cwd, platformOpts, scanProfile) {
  const { runScanPostCheck, printScanPostCheckResult } = await import('./scan-postcheck.js')
  const specDir = platformOpts?.specRoot || null
  const result = runScanPostCheck({
    cwd,
    specDir,
    scanMeta: {
      projectListParsed: true,
      manifestWritten: undefined,
    },
  })
  printScanPostCheckResult(result)
  // 写 manifest（如果还没写）
  if (platformOpts?.specRoot) {
    try {
      const { mkdirSync, writeFileSync } = await import('fs')
      const { join: pJoin, basename: pBasename } = await import('path')
      const { execSync } = await import('child_process')
      const manifestDir = platformOpts.specRoot
      let sourceCommit = null
      try {
        const { value: sourceCommit, error: scErr } = safeGit(cwd, ['rev-parse', 'HEAD'])
      } catch {}
      mkdirSync(manifestDir, { recursive: true })
      const manifest = {
        scan_profile: {
          mode: scanProfile.mode,
          file_count: scanProfile._fileCount || 0,
          source_bytes: scanProfile._sourceBytes || 0,
          project_count: scanProfile._projectCount || 0,
          reason: scanProfile.reason,
        },
        workspace_id: platformOpts.workspaceId || null,
        scan_run_id: platformOpts.scanRunId || null,
        source_commit: sourceCommit,
        source_commit_error: sourceCommit === null ? (scErr || 'unknown') : undefined,
        generated_at: new Date().toISOString(),
        schema_version: 2,
      }
      const manifestPath = pJoin(manifestDir, 'manifest.json')
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      console.log(`  📄 manifest.json 已写入: ${manifestPath}`)
    } catch (e) {
      console.warn(`  ⚠️ manifest 写入失败: ${e.message}`)
    }
  }
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

  // 平台模式参数（供 SillyHub 等平台调用）
  // --spec-dir 是统一参数名，--spec-root 保留为向后兼容别名
  const getFlagValue = (name) => {
    const idx = flags.indexOf(name)
    return idx !== -1 && flags[idx + 1] ? flags[idx + 1] : null
  }
  const isDone = flags.includes('--done')
  const isSkip = flags.includes('--skip')
  const isStatus = flags.includes('--status')
  const isReset = flags.includes('--reset')
  const isConfirm = flags.includes('--confirm')
  const isSkipApproval = flags.includes('--skip-approval')
  const isWait = flags.includes('--wait')
  const isContinue = flags.includes('--continue')
  const isNonInteractive = flags.includes('--non-interactive')
  const isInteractive = flags.includes('--interactive')
  const waitReason = getFlagValue('--reason')
  const waitOptions = getFlagValue('--options')
  const continueAnswer = getFlagValue('--answer')
  const confirmMode = getFlagValue('--confirm-mode')
  const resolvedSpecDir = specDir || getFlagValue('--spec-dir') || getFlagValue('--spec-root')
  const platformOpts = {
    specRoot: resolvedSpecDir ? resolve(resolvedSpecDir) : null,
    runtimeRoot: getFlagValue('--runtime-root') ? resolve(getFlagValue('--runtime-root')) : null,
    workspaceId: getFlagValue('--workspace-id'),
    scanRunId: getFlagValue('--scan-run-id'),
  }

  // 跨 --done 生命周期：从 metadata 文件恢复 platformOpts
  // 首次 scan 时写入，所有后续调用（包括 run、--done、--skip）都读取
  // 优先在 specDir 下查找，否则回退到 cwd/.sillyspec/.runtime/
  let specRoot = platformOpts.specRoot || resolveSpecDir(cwd)
  // 平台参数恢复策略：
  // 1. 优先检查 cwd/.sillyspec-platform.json（轻量指针文件，不污染 .sillyspec 结构）
  // 2. 然后检查 specRoot/.runtime/platform-scan.json（首次 scan 写入）
  const platformPointer = join(cwd, '.sillyspec-platform.json')
  const platformScanFile = join(specRoot, '.runtime', 'platform-scan.json')
  let platformOptsFile = existsSync(platformPointer) ? platformPointer : platformScanFile
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
        // 恢复成功：更新 specRoot（初始值可能是 cwd/.sillyspec，恢复后应为真实 specDir）
        specRoot = platformOpts.specRoot || specRoot
      } catch (e) {
        console.error(`❌ 平台模式参数文件读取失败: ${platformOptsFile}`)
        console.error(`   错误: ${e.message}`)
        console.error('   可能原因：文件损坏')
        console.error('   解决：删除该文件并重新运行首次 scan 传入 --spec-root')
        process.exit(1)
      }
    }
  }
  // 持久化 platformOpts
  // 在 specRoot/.runtime/ 写主文件，同时在 cwd/.sillyspec/.runtime/ 写恢复指针
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
      // 恢复指针：在 cwd 下写 .sillyspec-platform.json（不在 .sillyspec 内，不污染源码结构）
      // 供后续 --done（不带 --spec-root）找到 specDir
      writeFileSync(join(cwd, '.sillyspec-platform.json'), JSON.stringify({
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

  // 统一规范基路径：平台模式用 specRoot，本地模式用 cwd/.sillyspec
  // runCommand 后续所有 .sillyspec/ 操作必须用 specBase
  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')

  // 平台模式：清理旧版本残留的 cwd/.sillyspec/（防止源码污染）
  if (platformOpts.specRoot) {
    const legacyDir = join(cwd, '.sillyspec')
    if (existsSync(legacyDir)) {
      try { rmSync(legacyDir, { recursive: true, force: true }) } catch {}
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
    '--wait', '--continue', '--non-interactive', '--interactive',
    '--reason', '--options', '--answer', '--confirm-mode',
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
  // scan 元数据追踪（存储在 stageData.scanMeta 中，completeStep 通过 progress 访问）

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
      // brainstorm 作为流程入口，自动生成变更名并初始化
      if (stageName === 'brainstorm') {
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
    return await resetStage(pm, progress, stageName, cwd, effectiveChange, platformOpts)
  }

  // 确保步骤已初始化
  const changed = await ensureStageSteps(progress, stageName, cwd, specRoot)
  if (changed && effectiveChange) {
    await pm._write(cwd, progress, effectiveChange)
    triggerSync(cwd, effectiveChange, platformOpts)
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

  // --wait: 将 step 设为 waiting（独立于 --done）
  if (isWait) {
    return await waitStep(pm, progress, stageName, cwd, outputText, waitReason, waitOptions, { changeName: effectiveChange, nonInteractive: isNonInteractive && !isInteractive, platformOpts })
  }

  // --continue: 从 waiting 恢复
  if (isContinue) {
    return await continueStep(pm, progress, stageName, cwd, continueAnswer, { changeName: effectiveChange, nonInteractive: isNonInteractive && !isInteractive, platformOpts })
  }

  // --done
  if (isDone) {
    return await completeStep(pm, progress, stageName, cwd, outputText, inputText, { confirm: isConfirm, changeName: effectiveChange, nonInteractive: isNonInteractive && !isInteractive, platformOpts, confirmMode })
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
    const approval = await checkApproval(cwd, changeName, platformOpts)
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
    triggerSync(cwd, changeName, platformOpts)
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
    triggerSync(cwd, changeName, platformOpts)
  }

  const steps = stageData.steps
  // ── 检查是否有 waiting step 需要先处理 ──
  const waitingIdx = steps.findIndex(s => s.status === 'waiting')
  if (waitingIdx !== -1) {
    const ws = steps[waitingIdx]
    console.error(`\n⏸️  Step ${waitingIdx + 1}/${steps.length} 正在等待用户输入：${ws.name}`)
    if (ws.waitReason) console.error(`   原因：${ws.waitReason}`)
    if (ws.waitOptions) console.error(`   选项：${formatWaitOptions(ws.waitOptions)}`)
    console.error(`\n   普通运行无法跳过等待中的步骤。请先处理：`)
    console.error(`   sillyspec run ${stageName} --continue --answer "你的选择"${changeName ? ` --change ${changeName}` : ''}`)
    process.exit(1)
  }

  let currentIdx = steps.findIndex(s => s.status !== 'completed' && s.status !== 'skipped')

  // ── scanProfile: 根据 project 规模动态裁剪步骤 ──
  let scanProfile = null
  if (stageName === 'scan' && steps.length > 0 && currentIdx === 0) {
    scanProfile = computeScanProfile(cwd, platformOpts)
    console.log(`\n📊 Scan Profile: ${scanProfile.mode} (原因: ${scanProfile.reason})`)
    if (scanProfile.mode !== 'deep') {
      applyScanProfileSteps(stageData, scanProfile, cwd, platformOpts)
      // 步骤被裁剪后 currentIdx 需要重新计算
      currentIdx = 0
    }
    // 保存 profile 供后续 postcheck 使用
    stageData.scanProfile = scanProfile
    await pm._write(cwd, progress, changeName)
  } else if (stageName === 'scan' && stageData.scanProfile) {
    scanProfile = stageData.scanProfile
  }
  if (scanProfile) platformOpts.scanProfile = scanProfile

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
    triggerSync(cwd, changeName, platformOpts)
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
        baselineCommit: safeGit(cwd, ['rev-parse', 'HEAD']).value,
        baselineFiles,
        allowedFiles,
        allowNew,
        forceBaseline,
        startedAt: new Date().toISOString(),
      }
      // 写入 quick-guard.json 供 worktree-guard hook 读取
      const guardFile = join(specBase, '.runtime', 'quick-guard.json')
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
    // noAI 步骤自动完成（CLI-only，不需要 Agent 参与）
    if (defSteps[currentIdx].noAI || stageData.steps[currentIdx]?.noAI) {
      const stepName = defSteps[currentIdx].name
      const cliAction = defSteps[currentIdx]._cliAction || stageData.steps[currentIdx]?._cliAction
      console.log(`⚙️ Step ${currentIdx + 1}/${stageData.steps.length}: ${stepName}（CLI 自动执行，无需 Agent）`)
      if (cliAction === 'scanPreflight') {
        await executeScanPreflight(cwd, platformOpts, scanProfile)
      } else if (cliAction === 'scanPostcheck') {
        await executeScanPostcheck(cwd, platformOpts, scanProfile)
      }
      stageData.steps[currentIdx].status = 'completed'
      stageData.steps[currentIdx].completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
      await pm._write(cwd, progress, changeName)
      // 自动前进到下一步
      const nextIdx = stageData.steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
      if (nextIdx !== -1 && defSteps[nextIdx]) {
        console.log('')
        await outputStep(stageName, nextIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
      } else {
        // 所有步骤完成
        stageData.status = 'completed'
        stageData.completedAt = new Date().toLocaleString('zh-CN', { hour12: false })
        await pm._write(cwd, progress, changeName)
        console.log(`\n✅ ${stageName} 阶段全部完成。`)
      }
      return
    }
    await outputStep(stageName, currentIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
  }
}

function validateMetadata(cwd, stageName, specBase) {
  const changesDir = join(specBase, 'changes')
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
function validateFileLocations(cwd, stageName, progress, changeName, specBase) {
  const effectiveChange = changeName || progress.currentChange
  if (!effectiveChange) return

  const changeDir = join(specBase, 'changes', effectiveChange)
  if (!existsSync(changeDir)) return

  // 每个阶段完成后预期存在的文件
  const expectedFiles = {
    brainstorm: ['design.md', 'proposal.md', 'requirements.md', 'tasks.md'],
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
      const wrongPath = join(specBase, 'changes', 'change', effectiveChange, f)
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

async function archiveChangeDirectory(pm, cwd, progress, specBase) {
  const { renameSync } = await import('fs')
  const archiveChangeName = progress.currentChange
  if (!archiveChangeName) {
    console.error('❌ 归档失败：未找到当前变更名（currentChange）')
    process.exit(1)
  }
  const changesDir = join(specBase, 'changes')
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

// ── Wait Step ──

async function waitStep(pm, progress, stageName, cwd, outputText, waitReason, waitOptions, options = {}) {
  const { changeName, nonInteractive = false, platformOpts = {} } = options
  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')
  const stageData = progress.stages[stageName]

  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  // 查找下一个 pending 或 in-progress 的步骤
  const currentIdx = stageData.steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
  if (currentIdx === -1) {
    console.error('没有可以等待的步骤')
    process.exit(1)
  }

  // 前置检查：不允许已有 waiting 步骤时再 --wait
  const existingWaitingIdx = stageData.steps.findIndex(s => s.status === 'waiting')
  if (existingWaitingIdx !== -1) {
    const ws = stageData.steps[existingWaitingIdx]
    console.error(`❌ 已有步骤处于等待状态：Step ${existingWaitingIdx + 1} "${ws.name}"`)
    console.error(`   请先 --continue 或 --reset 该步骤，再开始新的 --wait`)
    process.exit(1)
  }

  // maxWaitRounds 硬上限：达到后拒绝继续 --wait
  const currentStep = stageData.steps[currentIdx]
  const defSteps = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  const stepDef = defSteps?.[currentIdx] || {}
  const maxWaitRounds = currentStep.maxWaitRounds ?? stepDef.maxWaitRounds
  const currentWaitRound = currentStep.waitRound || 0
  if (maxWaitRounds && currentWaitRound >= maxWaitRounds) {
    console.error(`❌ Step "${currentStep.name}" 已达到最大等待轮次（maxWaitRounds=${maxWaitRounds}）`) 
    console.error(`   请基于已有回答完成本步骤：`)
    console.error(`   sillyspec run ${stageName} --done${changeName ? ` --change ${changeName}` : ''} --output "需求理解摘要"`)
    process.exit(1)
  }

  // 非交互模式下拒绝等待
  if (nonInteractive) {
    console.error(`❌ Human decision required in non-interactive mode.`)
    console.error(`   Reason: ${waitReason || '(unknown)'}`)
    if (waitOptions) console.error(`   Options: ${formatWaitOptions(waitOptions)}`)
    console.error(`   Fix: rerun with --interactive or provide decision via sillyspec run ${stageName} --continue --answer "..."`)
    process.exit(2)
  }

  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  stageData.steps[currentIdx].status = 'waiting'
  stageData.steps[currentIdx].waitedAt = now
  if (outputText) {
    const MAX_OUTPUT = 200
    stageData.steps[currentIdx].output = outputText.length > MAX_OUTPUT
      ? outputText.slice(0, MAX_OUTPUT) + '…' : outputText
  }
  if (waitReason) stageData.steps[currentIdx].waitReason = waitReason
  if (waitOptions) {
    // 统一存为 JSON 数组
    try {
      const parsed = JSON.parse(waitOptions)
      if (Array.isArray(parsed)) {
        stageData.steps[currentIdx].waitOptions = JSON.stringify(parsed)
      } else {
        stageData.steps[currentIdx].waitOptions = JSON.stringify(waitOptions.split(',').map(o => o.trim()))
      }
    } catch {
      stageData.steps[currentIdx].waitOptions = JSON.stringify(waitOptions.split(',').map(o => o.trim()))
    }
  }

  progress.lastActive = now
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)

  console.log(`⏸️  Step ${currentIdx + 1}/${stageData.steps.length} 已暂停等待：${stageData.steps[currentIdx].name}`)
  if (waitReason) console.log(`   原因：${waitReason}`)
  if (waitOptions) console.log(`   选项：${formatWaitOptions(waitOptions)}`)
  console.log(`   继续时执行：sillyspec run ${stageName} --continue --answer "你的选择"${changeName ? ` --change ${changeName}` : ''}`)
}

// ── Continue Step ──

async function continueStep(pm, progress, stageName, cwd, answer, options = {}) {
  const { changeName, platformOpts = {} } = options
  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')
  const stageData = progress.stages[stageName]

  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  if (!answer) {
    console.error('❌ --continue 需要 --answer 参数')
    process.exit(1)
  }

  // 查找 waiting 的步骤
  const waitingSteps = stageData.steps.map((s, i) => ({ ...s, idx: i })).filter(s => s.status === 'waiting')
  if (waitingSteps.length === 0) {
    console.error('没有处于等待状态的步骤')
    process.exit(1)
  }
  if (waitingSteps.length > 1) {
    console.error(`❌ 检测到 ${waitingSteps.length} 个等待中的步骤，无法确定恢复目标：`)
    for (const ws of waitingSteps) {
      console.error(`   Step ${ws.idx + 1}: ${ws.name}${ws.waitReason ? `（${ws.waitReason}）` : ''}`)
    }
    console.error(`   请使用 --reset 重置，或手动修复 DB`)
    process.exit(1)
  }
  const currentIdx = waitingSteps[0].idx
  const defSteps = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  const currentStepDef = defSteps?.[currentIdx] || {}
  const currentStep = stageData.steps[currentIdx]
  const isRepeatableWait = currentStepDef.repeatableWait === true || currentStep.repeatableWait === true
  const requiresWait = currentStepDef.requiresWait === true || currentStep.requiresWait === true
  const shouldReturnToCurrentStep = isRepeatableWait || requiresWait

  const now = new Date().toLocaleString('zh-CN', { hour12: false })
  const prevOutput = currentStep.output || ''
  const waitRound = (currentStep.waitRound || 0) + 1
  currentStep.waitRound = waitRound
  currentStep.waitAnswer = answer
  currentStep.waitAnswers = Array.isArray(currentStep.waitAnswers) ? currentStep.waitAnswers : []
  currentStep.waitAnswers.push({
    round: waitRound,
    answer,
    question: prevOutput || null,
    answeredAt: now,
  })
  currentStep.maxWaitRounds = currentStepDef.maxWaitRounds ?? currentStep.maxWaitRounds

  // 合并 waiting 信息到 output
  const waitInfo = currentStep.waitReason || ''
  if (waitInfo) {
    currentStep.output = prevOutput
      ? `${prevOutput} | 用户回答#${waitRound}：${answer}`
      : `用户回答#${waitRound}：${answer}`
  }

  // 清除等待状态
  delete currentStep.waitReason
  delete currentStep.waitOptions
  delete currentStep.waitedAt

  if (shouldReturnToCurrentStep) {
    currentStep.status = 'pending'
    currentStep.completedAt = null
  } else {
    currentStep.status = 'completed'
    currentStep.completedAt = now
  }

  progress.lastActive = now
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)

  console.log(`✅ Step ${currentIdx + 1}/${stageData.steps.length} 已继续：${currentStep.name}`)
  console.log(`   回答：${answer}`)

  // Append to user-inputs.md
  const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
  const entry = `\n## ${now} | ${changeName || '?'} | ${stageName}: ${currentStep.name} [CONTINUED]\n- 回答：${answer}\n`
 appendFileSync(inputsPath, entry)

  // shouldReturnToCurrentStep: 回到当前步骤继续执行（repeatable=多轮探索，requiresWait=确认后执行动作）
  if (shouldReturnToCurrentStep) {
    console.log(`\n🔁 Step ${currentIdx + 1}/${stageData.steps.length} 已收到用户输入，回到当前步骤继续执行。`)
    if (isRepeatableWait) {
      console.log(`   已收集回答轮次：${waitRound}${currentStep.maxWaitRounds ? `/${currentStep.maxWaitRounds}` : ''}`)
    }
    if (defSteps && defSteps[currentIdx]) {
      console.log('')
      await outputStep(
        stageName,
        currentIdx,
        defSteps,
        cwd,
        changeName,
        progress.project || null,
        platformOpts,
        formatWaitHistory(currentStep)
      )
    }
    return { stageCompleted: false, currentIdx, nextPendingIdx: currentIdx }
  }

  // 检查阶段是否全部完成
  const nextPendingIdx = stageData.steps.findIndex(s => s.status === 'pending')
  const nextWaitingIdx = stageData.steps.findIndex(s => s.status === 'waiting')
  if (nextPendingIdx === -1 && nextWaitingIdx === -1) {
    stageData.status = 'completed'
    stageData.completedAt = now
    await pm._write(cwd, progress, changeName)
    console.log(`\n✅ ${stageName} 阶段已完成（${stageData.steps.length}/${stageData.steps.length} 步）`)
    return { stageCompleted: true, currentIdx, nextPendingIdx: -1 }
  }

  // 输出下一步
  if (nextPendingIdx !== -1 && defSteps) {
    console.log('')
    await outputStep(stageName, nextPendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts, answer)
  } else if (nextWaitingIdx !== -1 && defSteps) {
    // 下一个步骤也在等待状态
    const ws = stageData.steps[nextWaitingIdx]
    console.log(`\n⏸️  Step ${nextWaitingIdx + 1}/${stageData.steps.length} 仍在等待：${ws.name}`)
    if (ws.waitReason) console.log(`   原因：${ws.waitReason}`)
    console.log(`   继续：sillyspec run ${stageName} --continue --answer "..."${changeName ? ` --change ${changeName}` : ''}`)
  }

  return { stageCompleted: false, currentIdx, nextPendingIdx: nextPendingIdx }
}

async function completeStep(pm, progress, stageName, cwd, outputText, inputText = null, options = {}) {
  const { printNext = true, confirm = false, changeName, platformOpts = {}, nonInteractive = false, confirmMode = null } = options
  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')
  const stageData = progress.stages[stageName]
  const scanProfile = stageData?.scanProfile || null

  // ── WAIT MARKER 硬校验 ──
  // 如果 output 包含等待标记，拒绝 --done 推进
  if (outputText) {
    const match = WAIT_MARKER_RE.exec(outputText)
    if (match) {
      console.error(`❌ Refused: step output contains ${match[1]} — human input required.`)
      console.error(`   使用 --wait 替代 --done，例如：`)
      console.error(`   sillyspec run ${stageName} --wait --reason "等待用户决策" --output "你的摘要"${changeName ? ` --change ${changeName}` : ''}`)
      process.exit(1)
    }
  }

  // scanProfile 非 deep 模式：截断 outputText 减少 token 传递
  let effectiveOutput = outputText
  if (scanProfile && scanProfile.mode !== 'deep' && outputText && outputText.length > 1000) {
    effectiveOutput = outputText.slice(0, 1000) + '\n\n…[输出已截断，完整内容见 artifact]'
  }
  if (!stageData || !stageData.steps) {
    console.error(`❌ 阶段 ${stageName} 未初始化`)
    process.exit(1)
  }

  const steps = stageData.steps
  const currentIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
  if (currentIdx === -1) {
    console.error('没有待完成的步骤')
    process.exit(1)
  }

  // ── requiresWait 硬门控 ──
  const defStepsForCurrent = await getStageSteps(stageName, cwd, progress, platformOpts?.specRoot || null)
  const currentStepDef = defStepsForCurrent?.[currentIdx] || {}
  const currentStep = steps[currentIdx]
  if (currentStepDef.requiresWait === true && !currentStep.waitAnswer) {
    console.error(`❌ Step "${currentStep.name}" 必须先等待用户输入，不能直接 --done。`)
    console.error(`   原因：${currentStepDef.waitReason || '该步骤需要人工确认/回答'}`)
    if (currentStepDef.waitOptions) {
      console.error(`   选项：${currentStepDef.waitOptions.join(', ')}`)
    }
    console.error(`   请先执行：`)
    console.error(`   sillyspec run ${stageName} --wait --reason "${currentStepDef.waitReason || '等待用户输入'}" --options "${(currentStepDef.waitOptions || ['确认']).join(',')}"${changeName ? ` --change ${changeName}` : ''} --output "你的问题/方案摘要"`)
    process.exit(1)
  }

  steps[currentIdx].status = 'completed'
  steps[currentIdx].completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
  if (outputText) {
    const MAX_OUTPUT = 200
    if (outputText.length > MAX_OUTPUT) {
      steps[currentIdx].output = outputText.slice(0, MAX_OUTPUT) + '…'
      steps[currentIdx].output_truncated = true
      steps[currentIdx].output_original_length = outputText.length
      // 平台模式：artifact 写入 runtime-root，否则写 .sillyspec/.runtime/artifacts
      const artifactBase = platformOpts?.runtimeRoot
        ? join(platformOpts.runtimeRoot, 'scan-runs', platformOpts.scanRunId || 'unknown')
        : join(specBase, '.runtime', 'artifacts')
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
    await archiveChangeDirectory(pm, cwd, progress, specBase)
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
    // 项目名清洗：只保留 ASCII 字母/数字/横线/下划线/点，过滤中文和特殊字符
    const sanitizeProjectName = (name) => {
      const clean = name.replace(/[^a-zA-Z0-9_\-.]/g, '').trim()
      return clean || null
    }
    if (outputText) {
      // 匹配方式 1: "1. project-name" 编号列表
      const numbered = outputText.match(/^\s*\d+\.\s+(\S+)/gm)
      if (numbered) {
        const raw = numbered.map(m => m.replace(/^\s*\d+\.\s+/, '').replace(/[—\-:].*$/, '').trim())
        projectNames = raw.map(sanitizeProjectName).filter(Boolean)
        if (projectNames.length > 0) { stageData.scanMeta = stageData.scanMeta || {}; stageData.scanMeta.projectListParsed = true; }
      }
      // 匹配方式 2: 括号枚举 "子项目frontend/order-service/user-service" 或 "项目: a, b, c"
      if (projectNames.length === 0) {
        const parenMatch = outputText.match(/(?:子项目|项目)[\s:：]*(\S+(?:[\/、,，]+\S+)*)/)
        if (parenMatch) {
          const raw = parenMatch[1].split(/[\/、,，]+/).map(s => s.trim()).filter(Boolean)
          projectNames = raw.map(sanitizeProjectName).filter(Boolean)
          if (projectNames.length > 0) { stageData.scanMeta = stageData.scanMeta || {}; stageData.scanMeta.projectListParsed = true; }
        }
      }
      // 匹配方式 3: 结构化 YAML block "scan_projects:\n  - id: name"
      if (projectNames.length === 0) {
        const yamlMatch = outputText.match(/scan_projects:\s*\n((?:\s+-\s+id:\s+\S+\s*\n?)+)/)
        if (yamlMatch) {
          const raw = [...yamlMatch[1].matchAll(/-\s+id:\s*(\S+)/g)].map(m => m[1])
          projectNames = raw.map(sanitizeProjectName).filter(Boolean)
          if (projectNames.length > 0) { stageData.scanMeta = stageData.scanMeta || {}; stageData.scanMeta.projectListParsed = true; }
        }
      }
    }
    if (projectNames.length === 0) {
      // 回退：读取所有已注册项目
      console.warn('⚠️ 未能从 step 2 输出解析项目列表，回退扫描所有注册项目')
      stageData.scanMeta = stageData.scanMeta || {}; stageData.scanMeta.projectListParsed = false;
      const projectsDir = join(specBase, 'projects')
      if (existsSync(projectsDir)) {
        projectNames = readdirSync(projectsDir)
          .filter(f => f.endsWith('.yaml'))
          .map(f => f.replace(/\.yaml$/, ''))
      }
    }
    if (projectNames.length === 0) {
      projectNames = ['sillyspec'] // 最终兜底
    }

    // 自动注册未注册的子项目（确保 projects/*.yaml 存在，避免展开时 projectRoot 缺失）
    const projectsDir = join(specBase, 'projects')
    for (const pName of projectNames) {
      const projYaml = join(projectsDir, `${pName}.yaml`)
      if (!existsSync(projYaml)) {
        mkdirSync(projectsDir, { recursive: true })
        // 子项目路径推测：检查 cwd 下是否有同名目录
        const candidates = [
          join(cwd, pName),                              // cwd/frontend
          join(cwd, 'backend', pName),                 // cwd/backend/user-service
          join(cwd, 'packages', pName),                // monorepo packages
          join(cwd, 'apps', pName),                     // monorepo apps
          join(cwd, 'services', pName),                // monorepo services
        ]
        const detected = candidates.find(c => existsSync(c))
        const regPath = detected || join(cwd, pName)
        writeFileSync(projYaml, `name: ${pName}\npath: ${regPath}\nstatus: active\n`)
        console.log(`  📝 自动注册子项目: ${pName} → ${regPath}`)
      }
    }

    // 保存到 runtime 供后续使用 + 防重复展开
    const scanStatePath = join(specBase, '.runtime', 'scan-projects.json')
    mkdirSync(join(specBase, '.runtime'), { recursive: true })
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
        const projYaml = join(specBase, 'projects', `${pName}.yaml`)
        let projectRoot = '.'
        if (existsSync(projYaml)) {
          const yamlContent = readFileSync(projYaml, 'utf8')
          const pathMatch = yamlContent.match(/^path:\s*(.+)/m)
          if (pathMatch) projectRoot = pathMatch[1].trim()
        }
        const docOutputDir = platformOpts.specRoot ? `${specBase}/docs/${pName}` : `.sillyspec/docs/${pName}`
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

  const nextPendingIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')

  if (nextPendingIdx === -1) {
    // 也检查是否有 waiting 的步骤
    const hasWaiting = steps.some(s => s.status === 'waiting')
    if (hasWaiting) {
      // 有等待中的步骤，阶段未完成
      progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
      await pm._write(cwd, progress, changeName)
      const wsIdx = steps.findIndex(s => s.status === 'waiting')
      console.log(`\n⏸️  阶段暂停：Step ${wsIdx + 1} 等待用户输入`)
      if (steps[wsIdx].waitReason) console.log(`   原因：${steps[wsIdx].waitReason}`)
      return { stageCompleted: false, currentIdx, nextPendingIdx: -1 }
    }
    // quick 阶段完成前强制检查 quicklog 是否创建
    if (stageName === 'quick') {
      const quicklogDir = join(specBase, 'quicklog')
      const hasQuicklog = existsSync(quicklogDir) && readdirSync(quicklogDir).some(f => f.endsWith('.md') && f.startsWith('QUICKLOG'))
      if (!hasQuicklog) {
        console.error(`\n❌ quick 阶段完成校验失败：未检测到 QUICKLOG 记录文件。`)
        console.error(`   step 2 要求创建 quicklog 记录，但文件不存在。`) 
        console.error(`   请先创建 quicklog 记录再 --done，或使用 --skip-approval 跳过此校验。`)
        return { stageCompleted: false, currentIdx, nextPendingIdx: -1 }
      }
    }

    stageData.status = 'completed'
    stageData.completedAt = new Date().toLocaleString('zh-CN',{hour12:false})
    progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
    await pm._write(cwd, progress, changeName)
    triggerSync(cwd, changeName, platformOpts)

    // Append to user-inputs.md
    if (outputText) {
      const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
      const entry = `\n## ${new Date().toLocaleString('zh-CN',{hour12:false})} | ${changeName || '?'} | ${stageName}: ${steps[currentIdx].name}\n${inputText ? "- 输入：" + inputText + "\n" : ""}- 输出：${outputText}\n`
      appendFileSync(inputsPath, entry)
    }

    // 平台模式：scan 完成后生成 manifest.json + post-check
    if (stageName === 'scan' && (platformOpts.specRoot || platformOpts.runtimeRoot)) {
      try {
        stageData.scanMeta = stageData.scanMeta || {}; stageData.scanMeta.manifestWritten = false; // 默认失败
        const { mkdirSync, writeFileSync, readFileSync: _readFileSync } = await import('fs')
        const { join } = await import('path')
        const { execSync } = await import('child_process')
        const manifestDir = platformOpts.specRoot
        mkdirSync(manifestDir, { recursive: true })
        let sourceCommit = null
        try {
          const { value: sourceCommit, error: scErr } = safeGit(cwd, ['rev-parse', 'HEAD'])
        } catch {}
        const manifest = {
          workspace_id: platformOpts.workspaceId || null,
          scan_run_id: platformOpts.scanRunId || null,
          source_root: cwd,
          spec_root: platformOpts.specRoot || null,
          runtime_root: platformOpts.runtimeRoot || null,
          source_commit: sourceCommit,
          source_commit_error: sourceCommit === null ? (scErr || 'unknown') : undefined,
          generated_at: new Date().toISOString(),
          schema_version: 1,
          postcheck_result_path: null,
          workflow_runs_dir: platformOpts.runtimeRoot
            ? join(platformOpts.runtimeRoot, 'scan-runs', platformOpts.scanRunId || 'unknown', 'workflow-runs')
            : null,
          platform_pointer_path: join(cwd, '.sillyspec-platform.json'),
          platform_pointer_status: POINTER_STATUS.ACTIVE,
        }
        const manifestPath = join(manifestDir, 'manifest.json')
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
        console.log(`📄 manifest.json 已写入: ${manifestPath}`)
        stageData.scanMeta = stageData.scanMeta || {}; stageData.scanMeta.manifestWritten = true;
        if (!sourceCommit) {
          console.log(`⚠️  source_commit 无法获取（可能非 git 目录），已设为 null`)
        }
        // 清理平台参数临时文件
        const { unlinkSync } = await import('fs')
        const platformOptsFile = join(manifestDir, '.runtime', 'platform-scan.json')
        try { unlinkSync(platformOptsFile) } catch {}

        // CLI 层 post-check（替代旧的简单检查）
        const { runScanPostCheck, printScanPostCheckResult, formatStructuredResult, writeStructuredResult } = await import('./scan-postcheck.js')
        const postResult = runScanPostCheck({
          cwd,
          specDir: platformOpts.specRoot,
          outputText,
          scanMeta: {
            projectListParsed: stageData.scanMeta?.projectListParsed ?? null,
            manifestWritten: stageData.scanMeta?.manifestWritten ?? null,
          },
        })
        printScanPostCheckResult(postResult)

        // 生成结构化 JSON 并写入 runtime（供 SillyHub 消费）
        const structured = formatStructuredResult(postResult, {
          workspace_id: platformOpts.workspaceId,
          scan_run_id: platformOpts.scanRunId,
          source_root: cwd,
          spec_root: platformOpts.specRoot,
          runtime_root: platformOpts.runtimeRoot,
        })
        const postcheckJsonPath = writeStructuredResult(structured, platformOpts.specRoot, {
          runtimeRoot: platformOpts.runtimeRoot,
          scanRunId: platformOpts.scanRunId,
        })
        if (postcheckJsonPath) {
          console.log(`📄 postcheck-result.json 已写入: ${postcheckJsonPath}`)
          manifest.postcheck_result_path = postcheckJsonPath
        }

        // 将 post-check 结果写入 manifest
        manifest.scan_post_check = {
          status: postResult.status,
          checks: postResult.checks,
        }
        // 更新 manifest
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
        console.log(`📄 manifest.json 已更新（含 post-check 结果）`)

        // 更新平台指针状态为 scan_completed
        const pointerPath = join(cwd, '.sillyspec-platform.json')
        try {
          const pointer = JSON.parse(_readFileSync(pointerPath, 'utf8'))
          pointer.status = POINTER_STATUS.SCAN_COMPLETED
          pointer.completedAt = new Date().toISOString()
          pointer.scanStatus = postResult.status
          writeFileSync(pointerPath, JSON.stringify(pointer, null, 2) + '\n')
        } catch {}

        // failed_post_check 时强制阻止 clean success
        if (postResult.status === 'failed_post_check') {
          stageData.status = SCAN_STATUS.FAILED_POST_CHECK
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

    // 非 platform 模式 scan 也做轻量 post-check + 结构化输出
    if (stageName === 'scan' && !platformOpts.specRoot && !platformOpts.runtimeRoot) {
      const { runScanPostCheck, printScanPostCheckResult, formatStructuredResult, writeStructuredResult } = await import('./scan-postcheck.js')
      const postResult = runScanPostCheck({ cwd, specDir: null, outputText })
      printScanPostCheckResult(postResult)
      // 结构化结果写入 .sillyspec/.runtime/
      const structured = formatStructuredResult(postResult, { source_root: cwd })
      const postcheckJsonPath = writeStructuredResult(structured, join(cwd, '.sillyspec'))
      if (postcheckJsonPath) {
        console.log(`📄 postcheck-result.json 已写入: ${postcheckJsonPath}`)
      }
    }

    validateMetadata(cwd, stageName, specBase)

    // 验证关键文件是否在正确的变更目录下
    validateFileLocations(cwd, stageName, progress, changeName, specBase)

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
      const guardFile = join(specBase, '.runtime', 'quick-guard.json')
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
  triggerSync(cwd, changeName, platformOpts)

  // Append to user-inputs.md
  if (outputText) {
    const inputsPath = join(specBase, '.runtime', 'user-inputs.md')
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
          const projectsDir = join(specBase, 'projects')
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
          const saved = saveWorkflowRun(result, {
            cwd,
            source: 'run.js',
            stage: 'scan',
            step: steps[currentIdx]?.name,
            ...(platformOpts.runtimeRoot ? { runtimeRoot: platformOpts.runtimeRoot } : {}),
            ...(platformOpts.scanRunId ? { scanRunId: platformOpts.scanRunId } : {})
          })
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
        const saved = saveWorkflowRun(result, {
          cwd,
          source: 'run.js',
          stage: 'archive',
          step: steps[currentIdx]?.name,
          ...(platformOpts.runtimeRoot ? { runtimeRoot: platformOpts.runtimeRoot } : {}),
          ...(platformOpts.scanRunId ? { scanRunId: platformOpts.scanRunId } : {})
        })
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
  const currentIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')

  if (currentIdx === -1) {
    const wsIdx = steps.findIndex(s => s.status === 'waiting')
    if (wsIdx !== -1) {
      console.error(`⏸️  Step ${wsIdx + 1} 正在等待用户输入，不能跳过。`)
      console.error(`   请先使用 --continue --answer "..." 继续，或用 --reset 重置。`)
    } else {
      console.error('没有待跳过的步骤')
    }
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
  triggerSync(cwd, changeName, platformOpts)

  console.log(`⏭️ Step ${currentIdx + 1}/${steps.length} 已跳过：${steps[currentIdx].name}`)

  const nextPendingIdx = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')
  if (nextPendingIdx !== -1 && defSteps) {
    console.log('')
    await outputStep(stageName, nextPendingIdx, defSteps, cwd, changeName, progress.project || null, platformOpts)
  } else {
    const wsIdx = steps.findIndex(s => s.status === 'waiting')
    if (wsIdx !== -1) {
      console.log(`\n⏸️  Step ${wsIdx + 1}/${steps.length} 正在等待：${steps[wsIdx].name}`)
      if (steps[wsIdx].waitReason) console.log(`   原因：${steps[wsIdx].waitReason}`)
      console.log(`   继续：sillyspec run ${stageName} --continue --answer "..."${changeName ? ` --change ${changeName}` : ''}`)
    }
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

  const firstPending = steps.findIndex(s => s.status === 'pending' || s.status === 'in-progress')

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
    const icon = step.status === 'completed' ? '✅' : step.status === 'skipped' ? '⏭️' : step.status === 'waiting' ? '⏸️' : '⬜'
    const isCurrent = (step.status === 'pending' || step.status === 'in-progress') && i === firstPending
    const isWaiting = step.status === 'waiting'
    console.log(`${icon} Step ${i + 1}: ${step.name}${isCurrent ? ' ← 当前' : ''}${isWaiting ? ' [WAITING]' : ''}`)
    if (isWaiting) {
      if (step.waitReason) console.log(`       原因：${step.waitReason}`)
      if (step.waitOptions) console.log(`       选项：${formatWaitOptions(step.waitOptions)}`)
      if (step.waitedAt) console.log(`       等待时间：${step.waitedAt}`)
    }
  })
}

async function resetStage(pm, progress, stageName, cwd, changeName, platformOpts = {}) {
  const defSteps = await getStageSteps(stageName, cwd, progress)
  progress.stages[stageName] = {
    status: 'in-progress',
    startedAt: new Date().toLocaleString('zh-CN',{hour12:false}),
    completedAt: null,
    steps: defSteps ? defSteps.map(s => ({ name: s.name, status: 'pending' })) : []
  }
  progress.lastActive = new Date().toLocaleString('zh-CN',{hour12:false})
  await pm._write(cwd, progress, changeName)
  triggerSync(cwd, changeName, platformOpts)
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
      triggerSync(cwd, changeName, platformOpts)
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
    const pendingIdx = progress.stages[currentStage]?.steps?.findIndex(step => step.status === 'pending' || step.status === 'in-progress') ?? -1
    if (pendingIdx === -1) {
      const wsIdx = progress.stages[currentStage]?.steps?.findIndex(step => step.status === 'waiting') ?? -1
      if (wsIdx !== -1) {
        const ws = progress.stages[currentStage].steps[wsIdx]
        console.log(`⏸️  Step ${wsIdx + 1} 等待用户输入：${ws.name}`)
        if (ws.waitReason) console.log(`   原因：${ws.waitReason}`)
        console.log(`   继续：sillyspec run auto --continue --answer "..."`)
        return
      }
      const next = nextInFlow(currentStage)
      if (next) console.log(`${currentStage} is complete. Run: sillyspec run auto --done --output "${currentStage} complete"`)
      else console.log('All auto flow stages are complete.')
      return
    }
    // execute 阶段启动前检查审批
    if (currentStage === 'execute' && !skipApproval) {
      const approval = await checkApproval(cwd, changeName, platformOpts)
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

  const nextPendingIdx = progress.stages[currentStage]?.steps?.findIndex(step => step.status === 'pending' || step.status === 'in-progress') ?? -1
  if (nextPendingIdx !== -1) {
    const defSteps = await getStageSteps(currentStage, cwd, progress)
    // execute 阶段启动前检查审批
    if (currentStage === 'execute' && !skipApproval) {
      const approval = await checkApproval(cwd, changeName, platformOpts)
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
  triggerSync(cwd, changeName, platformOpts)
  progress = await pm.read(cwd, changeName)

  console.log(`\n${currentStage} complete. Auto advanced to ${next}.`)
  const nextSteps = await getStageSteps(next, cwd, progress)
  const firstPending = progress.stages[next]?.steps?.findIndex(step => step.status === 'pending' || step.status === 'in-progress') ?? -1
  if (firstPending !== -1) {
    // execute 阶段启动前检查审批
    if (next === 'execute' && !skipApproval) {
      const approval = await checkApproval(cwd, changeName, platformOpts)
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
