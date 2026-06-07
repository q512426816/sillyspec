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

### 模块文档加载
6. 读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`（不存在则跳过以下步骤）
7. 根据 plan.md 中的任务文件路径匹配 _module-map.yaml 中的模块
8. 读取匹配到的 \`.sillyspec/docs/<project>/modules/<module>.md\`
9. 实现代码时遵循模块文档中描述的接口约定、数据流和依赖关系
10. **利用模块索引快速定位源码**：
    - 用 entrypoints 字段直接找到模块对外 API 的源码位置
    - 用 main_symbols 字段找到核心类/函数的定义位置
    - 子代理优先读模块卡片理解语义，再读 entrypoints/main_symbols 对应的源码

### 输出
已加载的上下文摘要（含模块文档 + 源码锚点）`,
    outputHint: '上下文摘要',
    optional: false
  },
  {
    name: '创建 worktree',
    prompt: `为本次执行创建隔离的 git worktree。

### 操作
1. 运行 \`sillyspec worktree create <change-name>\`
2. 记录输出的 worktree 路径
3. 后续所有子代理的 cwd 设为该 worktree 路径
4. 如果创建失败 → 报错并停止（不要在无隔离状态下继续）

### 降级模式
CLI 可能自动降级（sandbox 限制、已在 linked worktree 中）：
- \`mode: native-worktree\` — 已在 linked worktree，直接复用
- \`mode: in-place-fallback\` — git worktree add 失败，降级为 in-place + baseline protection
- 这两种模式都会输出 worktree 路径和分支名，正常继续即可

### 输出
worktree 路径 + 分支名 + 模式（如果有）

### 完成后执行
sillyspec run execute --done --output "worktree 路径 + 分支名"`,
    outputHint: 'worktree 路径 + 分支名',
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

// 全局验收步骤定义
const acceptanceSteps = [
  {
    name: '对照设计检查',
    mode: 'acceptance',
    prompt: `对照 design.md 检查所有实现是否与设计一致。

### 执行方式
本步骤由当前 agent 汇总执行，不需要为每个检查项启动独立子代理。
如需深入验证某个模块，可启动单个 QA 子代理统一处理。

### 操作
1. 读取 design.md（技术方案）
2. 逐一对照 design.md 中的设计要点与实际代码实现
3. 检查接口签名、数据结构、模块划分是否一致
4. 记录偏差项（偏差 ≠ 错误，可能是合理的实现调整）

### 输出
检查清单：每项设计要点的实现状态 ✅/⚠️/❌ + 偏差说明`,
    outputHint: '设计对照检查清单',
    optional: false
  },
  {
    name: '运行测试',
    mode: 'acceptance',
    prompt: `运行所有测试，验证代码质量。

### 执行方式
本步骤由当前 agent 执行，不需要启动独立子代理。

### 操作
1. 读取 local.yaml 获取构建和测试命令
2. 运行测试套件（单元测试、集成测试）
3. 运行 lint 检查
4. 如果有测试失败 → 分析原因，标注是代码问题还是测试本身的问题
5. 汇总测试结果

### 输出
测试结果摘要：通过/失败/跳过数量 + 失败项分析`,
    outputHint: '测试结果摘要',
    optional: false
  },
  {
    name: '代码审查',
    mode: 'acceptance',
    prompt: `对本次变更进行代码审查。

### 执行方式
本步骤由当前 agent 或一个 QA agent 汇总执行，不需要为每个文件启动独立子代理。

### 操作
1. 检查 git diff 查看所有变更
2. 审查要点：
   - 代码风格是否符合 CONVENTIONS.md
   - 是否有明显的 bug 或安全漏洞
   - 是否有未处理的 TODO/FIXME
   - 错误处理是否完善
   - 是否有冗余代码或可简化的逻辑
3. 对照 ARCHITECTURE.md 检查架构合规性

### 输出
审查结果：问题列表（严重程度 + 建议修复方式）+ 总体评价`,
    outputHint: '代码审查结果',
    optional: true
  }
]

// 固定后缀步骤定义
const fixedSuffix = [
  {
    name: '知识库审阅',
    prompt: `检查本轮执行产生的新知识。

### 操作
1. 检查 \.sillyspec/knowledge/uncategorized.md\` 中待确认条目
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

先检查当前 worktree 的隔离模式：
\`\`\`bash
node -e "import('./src/worktree.js').then(w => { const wm = new w.WorktreeManager(); const m = wm.getMeta('<change-name>'); console.log(m ? JSON.stringify({mode: m.mode, path: m.worktreePath}) : 'no meta'); })"
# 或从 DB 读取：
sqlite3 -json .sillyspec/.runtime/sillyspec.db "SELECT isolation_status, isolation_mode, isolation_reason FROM changes WHERE name='<change-name>'" 2>/dev/null
\`\`\`

### 操作（mode = worktree，SillySpec 创建的隔离 worktree）
1. 运行 \`sillyspec worktree apply --check-only <change-name>\`
2. 展示 diff 摘要（文件列表 + 变更统计）
3. 检查结果说明（是否通过文件清单校验）
4. 用户确认后运行 \`sillyspec worktree apply <change-name>\`
5. apply 成功 → 运行 \`sillyspec worktree cleanup <change-name>\` → 输出 Worktree: cleaned
6. apply 失败 → 展示错误详情，用户选择重试或手动处理
7. 如果用户不想 apply → 运行 \`sillyspec worktree cleanup <change-name>\` 丢弃
8. 建议下一步：\`sillyspec run verify\`

### 操作（mode = native-worktree，用户已有的 linked worktree）
1. 运行 \`sillyspec worktree apply --check-only <change-name>\`
2. 展示 diff 摘要
3. 用户确认后运行 \`sillyspec worktree apply <change-name>\`
4. **不要运行 cleanup** — 这是用户自己的 worktree，SillySpec 不能删除
5. 输出 Worktree: kept（SillySpec 未创建此 worktree，保留不动）
6. 建议下一步：\`sillyspec run verify\`

### 操作（mode = in-place-fallback，降级模式无隔离目录）
1. 展示本次执行摘要（\`git diff\` 查看变更）
2. 跳过 apply 和 cleanup（没有隔离 worktree）
3. 输出 Worktree: none（降级为 in-place，无隔离目录需要清理）
4. 建议下一步：\`sillyspec run verify\`

### 操作（无 worktree / --no-worktree 模式）
1. 展示本次执行摘要
2. 输出 Worktree: none
3. 提示用户直接使用 \`git diff\` 查看变更
4. 建议下一步：\`sillyspec run verify\`

### 输出
apply 结果 + 下一步建议（或执行摘要）

### 注意
- 如果用户不想 apply → 运行 cleanup 丢弃
- 完成后运行 \`sillyspec run execute --done\` 即可自动推进阶段`,
    outputHint: 'apply 结果',
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
      const taskNoMatch = taskMatch[1].match(/\btask-(\d+)\b/i)
      currentTask = {
        index: taskNoMatch ? parseInt(taskNoMatch[1], 10) : null,
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
 * 为 Wave 生成 prompt（强制子代理执行）
 */
function buildWavePrompt(wave, waveIndex, changeDir, worktreePath) {
  // 构建任务摘要（不再内联完整蓝图，减少上下文污染）
  const taskSummary = wave.tasks.map((t, ti) => {
    const taskNum = String(t.index || (ti + 1)).padStart(2, '0')
    const taskRelPath = changeDir
      ? `.sillyspec/changes/${path.basename(changeDir)}/tasks/task-${taskNum}.md`
      : `task-${taskNum}.md`
    const fileInfo = t.file ? ` (${t.file})` : ''
    return `task-${taskNum}: ${t.name}${fileInfo} → ${taskRelPath}`
  }).join('\n')

  const taskList = wave.tasks.map((t, ti) => {
    const taskNum = String(t.index || (ti + 1)).padStart(2, '0')
    let s = `- [ ] ${t.name}`
    if (t.file) s += ` (${t.file})`
    return s
  }).join('\n')

  const worktreeSection = (worktreePath)
    ? `
### 工作目录（必须严格遵守）

调用 Task 工具启动子代理时，**workdir 参数是强制必传的**。
不传 workdir 会导致子代理把文件写到主工作区而非 worktree，破坏隔离。

\`\`\`json
{
  "subagent_type": "general",
  "workdir": "${worktreePath}",
  "prompt": "在此编写任务描述..."
}
\`\`\`

### 注意
蓝图文件（tasks.md / design.md / proposal.md / requirements.md）在主工作区 .sillyspec/changes/<change>/ 下，它们可能不在 worktree 中。读取蓝图时使用主工作区路径，不要拼接到 worktree 路径下。
`
    : ''

  return `## Wave ${waveIndex}: 执行以下任务

## 执行方式（必须严格遵守）

**每个任务必须由独立子代理执行，你不要自己写代码。**

你的角色是调度者 + 审查者：
1. 为每个任务启动一个子代理（Agent tool），同 Wave 内可并行
2. 子代理完成后审查结果
3. 勾选 plan.md 中的 checkbox
4. 记录改动文件和测试结果

${worktreeSection}
### 任务摘要（按需读取完整蓝图）
为每个任务启动子代理时，**只需告知任务目标和蓝图文件路径，让子代理按需读取**：

${taskSummary}

子代理 prompt 要点：
1. 任务目标（简短描述）
2. 蓝图文件路径（让子代理自行读取详情）
3. 编码铁律：先读后写、TDD、不编造方法、只做蓝图里写的事、遵守边界处理规则、不超出 allowed_paths
4. 如存在模块文档（.sillyspec/docs/*/modules/），按需读取涉及模块的 <module>.md 参考接口约定和数据流

### Wave 开始前
1. 读取 design.md 的「编码铁律」章节（如果存在），严格遵守
2. 读取 plan.md 了解全局任务划分和依赖关系
3. 确认本 Wave 的输入/输出契约（前置 Wave 产出了什么，本 Wave 需要消费什么）
4. 检查前置 Wave 的产出是否完整（文件是否存在、测试是否通过）
5. **上下文分层加载**：
   - 🔥 热上下文：design.md 编码铁律 + 当前 Wave 任务（必须加载）
   - 🌡️ 温上下文：CONVENTIONS.md + ARCHITECTURE.md（需要时加载）
   - ❄️ 冷上下文：其他变更的 design.md、历史 plan.md（不要主动加载，除非明确需要）

### 本 Wave 任务
${taskList}

### 调度要求
1. **同一 Wave 内的任务必须并行启动子代理，禁止串行等待。** Wave 的定义就是"无依赖、可并行"，不要自行分析依赖关系。如果有依赖应该在 plan.md 的不同 Wave 中。
2. **Reverse Sync**：子代理报告实现与 design.md 不一致时，先检查是代码错了还是文档有遗漏
3. **不要频繁编译！** 编译很慢，只在以下情况运行：
   - 写了大量代码后需要验证语法正确性
   - 最后一个 Wave 完成后做一次全量编译验证
   - 用户明确要求编译时
4. 每个任务完成后：
   - 勾选 plan.md / tasks.md 中对应任务的 checkbox
   - 记录改动文件和测试结果
5. 遇到 BLOCKED → 记录原因，选择：重试/跳过/停止

### 完成后
运行 sillyspec run execute --done --input "用户原始反馈" --output "Wave ${waveIndex} 结果摘要"`
}


/**
 * 动态构建 execute 步骤列表
 * @param {string|null} planFilePath - plan 文件路径，null 则用默认 3 Wave
 * @param {{ worktreePath?: string, noWorktree?: boolean }} options
 * @returns {Array} 步骤列表
 */
export function buildExecuteSteps(planFilePath = null, options = {}) {
  const noWorktree = !!options.noWorktree
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

  // 尝试获取 worktree 路径（可能由前缀步骤创建）
  const worktreePath = options.worktreePath || null

  const waveSteps = waves.map((wave, i) => ({
    name: `Wave ${i + 1} 执行`,
    mode: 'implementation',
    prompt: buildWavePrompt(wave, i + 1, changeDir, worktreePath),
    outputHint: `Wave ${i + 1} 执行结果`,
    optional: false
  }))

  return [...fixedPrefix, ...waveSteps, ...acceptanceSteps, ...fixedSuffix]
}
