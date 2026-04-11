import { existsSync, readFileSync } from 'fs'
import path from 'path'

export const definition = {
  name: 'execute',
  title: '波次执行',
  description: '子代理并行 + 强制 TDD + 两阶段审查',
  steps: [] // 动态构建，由 buildExecuteSteps() 生成
}

// 固定前缀步骤定义
const fixedPrefix = [
  {
    name: '状态检查',
    prompt: `检查当前状态，确认可以执行 execute。

### 操作
1. 运行 \`sillyspec progress show\`
2. 确认 currentStage 为 execute
3. 如果不是 → 检查是否有未完成的 tasks.md
4. 确认执行范围（$ARGUMENTS 指定 wave/task 或全部）

### 输出
当前状态 + 执行范围确认`,
    outputHint: '当前状态 + 执行范围',
    optional: false
  },
  {
    name: '加载上下文',
    prompt: `加载计划、设计和代码库上下文。

### 操作
1. 读取 tasks.md（执行计划）
2. 读取 design.md（技术方案）
3. 读取 CONVENTIONS.md、ARCHITECTURE.md
4. 读取 local.yaml（构建命令）
5. 加载 CODEBASE-OVERVIEW.md

### 输出
已加载的上下文摘要`,
    outputHint: '上下文摘要',
    optional: false
  },
  {
    name: '确认执行范围',
    prompt: `解析任务，确认执行范围和确认模式。

### 操作
1. 从 plan 中解析 Wave 分组和任务列表
2. 根据任务描述关键词为每个 Task 建议模型：
   - 架构/复杂推理 → 最强模型
   - 常规实现 → 中等模型
   - 简单修改 → 快速模型
   - 文档/写作 → 写作模型
3. 用户在 tasks.md 中的 [model:xxx] 标签优先
4. 询问用户执行确认频率：
   - 每个 Wave 确认 — 每个 Wave 完成后展示结果
   - AI 自主判断 — BLOCKED 或计划外变更时才询问
   - 全自动 — 全部自动执行
5. 查询知识库：读取 \`.sillyspec/knowledge/INDEX.md\`，根据 Task 关键词匹配

### 输出
Wave 分组 + 模型分配 + 确认模式 + 知识库匹配结果

### 注意
- 默认推荐"每个 Wave 确认"`,
    outputHint: 'Wave 分组 + 模型分配',
    optional: false
  }
]

// 固定后缀步骤定义
const fixedSuffix = [
  {
    name: '知识库审阅',
    prompt: `检查本轮执行产生的新知识。

### 操作
1. 检查 \`.sillyspec/knowledge/uncategorized.md\` 中待确认条目
2. 如有 → 提示用户审阅
3. 用户确认后改为 [已确认]，可归类到专题文件

### 输出
新知识条目数量 + 审阅提示（或"无新知识"）`,
    outputHint: '知识条目数量',
    optional: true
  },
  {
    name: '完成确认',
    prompt: `所有任务完成后的收尾。

### 操作
1. 询问用户下一步：
   - 验证 → sillyspec run verify
   - 归档 → /sillyspec:archive
   - 继续开发
2. 提示 git add 暂存变更

### 输出
用户选择 + 下一步命令

### 注意
- 完成后运行 \`sillyspec run execute --done\` 即可自动推进阶段`,
    outputHint: '用户选择',
    optional: false
  }
]

/**
 * 从 plan 文件解析 Wave 分组
 */
function parseWavesFromPlan(planContent) {
  const waves = []
  const lines = planContent.split('\n')
  let currentWave = null
  let currentTask = null

  for (const line of lines) {
    const waveMatch = line.match(/^#+\s*Wave\s+(\d+)/i)
    if (waveMatch) {
      currentWave = { index: parseInt(waveMatch[1]), tasks: [] }
      currentTask = null
      waves.push(currentWave)
      continue
    }

    if (!currentWave) continue

    const taskMatch = line.match(/^[-*]\s*\[[ x]\]\s*(.+)/)
    if (taskMatch) {
      currentTask = {
        name: taskMatch[1].trim(),
        file: '',
        steps: '',
        reference: ''
      }
      // 兼容旧格式：任务名后跟 (文件路径)
      const fileMatch = taskMatch[1].match(/\(([^)]+)\)$/)
      if (fileMatch) {
        currentTask.file = fileMatch[1]
        currentTask.name = taskMatch[1].replace(/\([^)]+\)$/, '').trim()
      }
      currentWave.tasks.push(currentTask)
      continue
    }

    // 解析子行信息（修改/参考/步骤）
    if (currentTask) {
      const modMatch = line.match(/^\s+-\s*修改:\s*(.+)/)
      if (modMatch) { currentTask.file = modMatch[1].trim(); continue }

      const refMatch = line.match(/^\s+-\s*参考:\s*(.+)/)
      if (refMatch) { currentTask.reference = refMatch[1].trim(); continue }

      const stepMatch = line.match(/^\s+-\s*步骤:/)
      if (stepMatch) { currentTask.steps = line.replace(/^\s+-\s*步骤:\s*/, '').trim(); continue }

      // 步骤续行（数字开头的子步骤）
      if (currentTask.steps && line.match(/^\s+\d+\./)) {
        currentTask.steps += '\n' + line.trim()
      }
    }
  }

  return waves
}

/**
 * 为 Wave 生成 prompt
 */
function buildWavePrompt(wave, waveIndex, changeDir) {
  const taskList = wave.tasks.map((t, ti) => {
    const taskNum = String(t.index || (ti + 1)).padStart(2, '0')
    const taskFile = changeDir ? `${changeDir}/tasks/task-${taskNum}.md` : ''
    const taskFileExists = taskFile && existsSync(taskFile)
    let s = `- [ ] ${t.name}`
    if (t.file) s += ` (${t.file})`
    if (taskFileExists) {
      const taskContent = readFileSync(taskFile, 'utf8').trim()
      s += `
\n### 📋 任务蓝图（task-${taskNum}.md）\n${taskContent}`
    }
    if (t.reference) s += `\n  参考: ${t.reference}`
    if (t.steps) s += `\n  步骤: ${t.steps}`
    return s
  }).join('\n')
  const { join } = path
const hasTaskBlueprints = changeDir && existsSync(join(changeDir, 'tasks'))
  const taskBlueprintRule = hasTaskBlueprints
    ? '每个任务有独立的 task-N.md 蓝图——只做蓝图里写的事，不要实现蓝图之外的功能。如果蓝图有问题，**停下来反馈**，不要自己改。问题归因：实现困难 → task 蓝图没写好 → plan 没做好 → design 有缺陷。'
    : '如果发现 plan 不合理，**停下来反馈**，不要自己改方案。问题归因：实现困难 → plan 没做好 → design 有缺陷。'
  return `## Wave ${waveIndex}: 执行以下任务

### Wave 开始前
1. 读取 design.md 的「编码铁律」章节（如果存在），严格遵守
2. 读取 plan.md 了解全局任务划分和依赖关系
2. 确认本 Wave 的输入/输出契约（前置 Wave 产出了什么，本 Wave 需要消费什么）
3. 检查前置 Wave 的产出是否完整（文件是否存在、测试是否通过）
4. **上下文分层加载**：
   - 🔥 热上下文：design.md 编码铁律 + 当前 Wave 任务（必须加载）
   - 🌡️ 温上下文：CONVENTIONS.md + ARCHITECTURE.md（需要时加载）
   - ❄️ 冷上下文：其他变更的 design.md、历史 plan.md（不要主动加载，除非明确需要）

### 本 Wave 任务
${taskList}

### 执行要求
1. 按任务顺序执行，同一 Wave 内任务可并行
2. 铁律：先读后写、grep 确认方法存在、不编造、TDD
3. **禁止发散思维**：你是代码搬运工，严格按任务描述执行，不增不减不改。${taskBlueprintRule}
4. **Reverse Sync**：发现 Bug 或实现与 design.md/task-N.md 不一致时，先检查是代码错了还是文档有遗漏，有遗漏则先修文档再修代码。
3. **不要频繁编译！** 编译很慢，只在以下情况运行：
   - 写了大量代码后需要验证语法正确性
   - 最后一个 Wave 完成后做一次全量编译验证
   - 用户明确要求编译时
4. 单个任务完成后只跑**对应模块的单元测试**（TDD 绿灯确认），不要跑全量编译
5. 每个任务完成后：
   - 勾选 task-N.md 中的验收标准 checkbox
   - 勾选 plan.md / tasks.md 中对应任务的 checkbox
   - 记录改动文件和测试结果
6. 遇到 BLOCKED → 记录原因，选择：重试/跳过/停止

### 完成后
运行 sillyspec run execute --done --input "用户原始反馈" --output "Wave ${waveIndex} 结果摘要"`
}

/**
 * 动态构建 execute 步骤列表
 * @param {string|null} planFilePath - plan 文件路径，null 则用默认 3 Wave
 * @returns {Array} 步骤列表
 */
export function buildExecuteSteps(planFilePath = null) {
  let waves
  let changeDir = null

  if (planFilePath && existsSync(planFilePath)) {
    const planContent = readFileSync(planFilePath, 'utf8')
    waves = parseWavesFromPlan(planContent)
    // 从 planFilePath 推导 changeDir: .sillyspec/changes/<name>/plan.md
    changeDir = path.dirname(planFilePath)
  }

  // 如果没解析出 Wave，生成默认 3 个
  if (!waves || waves.length === 0) {
    waves = []
    for (let i = 1; i <= 3; i++) {
      waves.push({ index: i, tasks: [{ name: `默认任务 ${i}`, file: 'TBD' }] })
    }
  }

  const waveSteps = waves.map((wave, i) => ({
    name: `Wave ${i + 1} 执行`,
    prompt: buildWavePrompt(wave, i + 1, changeDir),
    outputHint: `Wave ${i + 1} 执行结果`,
    optional: false
  }))

  return [...fixedPrefix, ...waveSteps, ...fixedSuffix]
}
