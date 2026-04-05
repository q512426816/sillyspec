import { existsSync, readFileSync } from 'fs'

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
5. 工作区模式：额外加载 CODEBASE-OVERVIEW.md

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
2. 提示 git 提交

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

  for (const line of lines) {
    const waveMatch = line.match(/^#+\s*Wave\s+(\d+)/i)
    if (waveMatch) {
      currentWave = { index: parseInt(waveMatch[1]), tasks: [] }
      waves.push(currentWave)
      continue
    }

    if (currentWave) {
      const taskMatch = line.match(/^[-*]\s*\[[ x]\]\s*(.+)/)
      if (taskMatch) {
        const fileMatch = taskMatch[1].match(/\(([^)]+)\)/)
        currentWave.tasks.push({
          name: taskMatch[1].replace(/\([^)]+\)/, '').trim(),
          file: fileMatch ? fileMatch[1] : '未知'
        })
      }
    }
  }

  return waves
}

/**
 * 为 Wave 生成 prompt
 */
function buildWavePrompt(wave, waveIndex) {
  const taskList = wave.tasks.map(t => `- [ ] ${t.name} (${t.file})`).join('\n')
  return `## Wave ${waveIndex}: 执行以下任务

### 本 Wave 任务
${taskList}

### 执行要求
1. 按任务顺序执行，同一 Wave 内任务可并行
2. 铁律：先读后写、grep 确认方法存在、不编造、TDD
3. 每个任务完成后：
   - 勾选 tasks.md 中对应 checkbox
   - 记录改动文件和测试结果
4. 遇到 BLOCKED → 记录原因，选择：重试/跳过/停止

### 完成后
运行 sillyspec run execute --done --output "Wave ${waveIndex} 结果摘要"`
}

/**
 * 动态构建 execute 步骤列表
 * @param {string|null} planFilePath - plan 文件路径，null 则用默认 3 Wave
 * @returns {Array} 步骤列表
 */
export function buildExecuteSteps(planFilePath = null) {
  let waves

  if (planFilePath && existsSync(planFilePath)) {
    const planContent = readFileSync(planFilePath, 'utf8')
    waves = parseWavesFromPlan(planContent)
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
    prompt: buildWavePrompt(wave, i + 1),
    outputHint: `Wave ${i + 1} 执行结果`,
    optional: false
  }))

  return [...fixedPrefix, ...waveSteps, ...fixedSuffix]
}
