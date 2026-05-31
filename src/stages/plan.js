import { existsSync, readFileSync } from 'fs'
import path from 'path'

export const definition = {
  name: 'plan',
  title: '实现计划',
  description: '编写实现计划 — 按 Wave 分组，每个任务独立文档',
  steps: null // 动态生成
}

// 固定前缀步骤
export const fixedPrefix = [
  {
    name: '状态检查',
    prompt: `检查当前状态，确认可以执行 plan。

### 操作
1. 运行 \`sillyspec progress show\`
2. 确认 currentStage 为 "plan"

### 输出
当前状态摘要`,
    outputHint: '状态摘要',
    optional: false
  },
  {
    name: '加载上下文',
    prompt: `加载所有规范文件和代码库上下文。

### 操作
1. 读取 CODEBASE-OVERVIEW.md + 各子项目上下文
2. 读取 proposal.md、design.md、requirements.md、tasks.md
3. 读取 CONVENTIONS.md、ARCHITECTURE.md、STACK.md
4. 读取 local.yaml 获取构建/测试命令

### 模块文档加载
5. 读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`（不存在则跳过以下步骤）
6. 根据 design.md 的文件变更清单匹配 _module-map.yaml 中的模块
7. 读取匹配到的 \`.sillyspec/docs/<project>/modules/<module>.md\`
8. 将模块文档作为制定计划的上下文，确保计划符合模块当前设计

### 输出
已加载的文件清单（含模块文档）`,
    outputHint: '文件清单',
    optional: false
  },
  {
    name: '锚定确认',
    prompt: `确认已读取的文件。

### 操作
列出已读取的文件，标注存在/不存在。

### 输出
文件加载确认清单`,
    outputHint: '文件确认清单',
    optional: false
  },
  {
    name: '展开任务并分组',
    prompt: `把 tasks.md 每个 checkbox 展开为任务描述，按 Wave 分组，产出 plan.md 总览。

### plan.md 格式（PM 视角 + 机器可解析）
\`\`\`markdown
# 实现计划

## Spike 前置验证（如需要）
| Spike | 验证内容 | 不通过后果 |
|---|---|---|
| spike-01 | ... | task-XX 推翻重设计 |

> 技术不确定性高时才需要 Spike。无不确定性则跳过此节。

## Wave 1（并行，无依赖）
- [ ] task-01: 添加用户创建接口
- [ ] task-02: 添加角色创建接口

## Wave 2（依赖 Wave 1）
- [ ] task-03: 用户创建接口联调

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 估时 | 依赖 | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 添加用户创建接口 | W1 | P0 | 4h | — | ... |
| task-02 | 添加角色创建接口 | W1 | P0 | 3h | — | ... |
| task-03 | 用户创建接口联调 | W2 | P0 | 4h | task-01,02 | ... |

## 依赖关系图
\`\`\`mermaid
graph LR
  task-01 --> task-03
  task-02 --> task-03
\`\`\`

## 关键路径
task-01 → task-03（最长路径，决定最短交付周期）

## 全局验收标准
- [ ] 所有单元测试通过
- [ ] （brownfield）未配置新功能时行为不变
\`\`\`

### 关键规则
- plan.md 包含：Wave 分组 + 任务总表 + 依赖图 + 关键路径 + 全局验收标准，**不放实现细节**
- 实现细节写到后续的 tasks/task-NN.md 中
- 每个任务编号格式：task-01、task-02 ...
- **Wave 下的 checkbox 行必须保留**（execute 阶段解析依赖 \`- [ ] task-XX:\` 格式）
- 任务总表的优先级：P0（必须）/ P1（重要）/ P2（可选）
- 估时参考：单个 task ≤ 8h，超过则拆分

### Spike 前置验证
当存在技术不确定性时，在 Wave 之前设计 Spike：
- 涉及新技术栈/未经验证的集成 → 需要 Spike
- 涉及安全隔离/性能瓶颈 → 需要 Spike
- 纯业务逻辑/确定的技术方案 → 不需要 Spike
- 每个 Spike 定义：验证内容 + 通过标准 + 不通过后果

### 批量模式指引
如果 design.md 或需求中包含批量特征（关键词：批量/模板/引擎/N个相似），按以下原则规划：
❌ 不要列出每个实例作为独立任务
❌ 不要在文档中嵌入数据
✅ 设计通用架构，Wave 1 聚焦架构
✅ 数据转换用脚本完成，单独一个 Wave
✅ 总任务数控制在 10 个以内

### 操作
1. 读取 tasks.md 获取任务列表
2. 读取 design.md 获取文件变更清单
3. 逐个展开为任务描述
4. 分析依赖关系，按 Wave 分组
5. 生成任务总表（含优先级、估时、依赖）
6. 生成 Mermaid 依赖关系图
7. 标注关键路径
8. 评估是否需要 Spike 前置验证
9. 保存到变更目录下的 plan.md（路径格式：\`.sillyspec/changes/<change-name>/plan.md\`，其中 <change-name> 是变更目录名，直接使用，不加子目录。正确路径示例：\`.sillyspec/changes/2026-05-28-agent-log-streaming/plan.md\`）

### 输出
plan.md 总览内容`,
    outputHint: 'plan.md 总览',
    optional: false
  },
  {
    name: '自检总览',
    prompt: `自检 plan.md 总览质量。

### 操作
检查以下各项：
- [ ] 每个 task 有编号（task-01、task-02 ...）
- [ ] 每个 task 在 Wave 下有 checkbox（\`- [ ] task-XX:\` 格式，execute 解析依赖此格式）
- [ ] 已标注 Wave 分组和依赖关系
- [ ] 有任务总表（含优先级、估时、依赖列）
- [ ] 有 Mermaid 依赖关系图
- [ ] 有关键路径标注
- [ ] 有全局验收标准
- [ ] （brownfield）全局验收包含兼容性条款
- [ ] 没有实现细节（接口定义、代码示例等不应该在 plan.md 里）
- [ ] plan.md 与 design.md 的文件变更清单一致

### 输出
自检通过/不通过`,
    outputHint: '自检结果',
    optional: false
  }
]

// 固定后缀步骤
export const fixedSuffix = [
  {
    name: '审查一致性',
    prompt: `审查所有 task-N.md 的一致性。

### 操作
1. 读取所有 tasks/task-NN.md
2. 检查：
   - 文件路径有没有冲突（两个任务改同一个文件）
   - 依赖关系和 plan.md 的 Wave 分组是否一致
   - 验收标准和 plan.md 的全局标准是否矛盾
   - 接口定义是否自洽
3. 发现问题 → 列出问题清单，暂停等用户决定是否修复

### 输出
一致性审查结果`,
    outputHint: '审查结果',
    optional: false
  },
  {
    name: '保存并更新进度',
    prompt: `确认所有文件已保存，更新进度。

### 操作
1. 确认 plan.md 和所有 tasks/task-NN.md 已存在

### 输出
文件列表 + 下一步命令`,
    outputHint: '文件列表',
    optional: false
  }
]

/**
 * 解析 plan.md 获取任务数量
 */
function parseTaskCount(planContent) {
  if (!planContent || typeof planContent !== 'string') return 0
  const matches = planContent.match(/^[-*]\s*\[[ x]\]\s*task-\d+/gm)
  return matches ? matches.length : 0
}

/**
 * 生成单个任务的蓝图写作 prompt
 */
function buildTaskPrompt(taskNum, taskName, changeDir) {
  const num = String(taskNum).padStart(2, '0')
  return `编写任务蓝图 tasks/task-${num}.md

### 任务
${taskName}

### 文件路径
\`.sillyspec/changes/<change-name>/tasks/task-${num}.md\`

### 格式要求（必须严格遵守）
\`\`\`markdown
---
id: task-${num}
title: ${taskName}
priority: P0
estimated_hours: N
depends_on: []
blocks: []
allowed_paths:
  - 允许修改的路径范围
---

# task-${num}: ${taskName}

## 修改文件（必填）
- 精确到文件路径，列出所有需要新增或修改的文件

## 实现要求
1. 具体做什么，写清楚
2. ...

## 接口定义（代码类任务必填）
写方法签名、数据结构、控制流伪代码。AI executor 应能照着直接编码。

## 边界处理（必填）
- null/空值行为
- 兼容旧行为（brownfield：未配置新功能时行为不变）
- 异常不静默吞掉（明确返回值或抛出）
- 不修改传入参数
- 歧义/冲突场景的处理策略

## 非目标（本任务不做的事）
- 明确列出边界，防止 scope creep

## 参考
- 已有代码可参考的模式
- 相关的 CONVENTIONS.md 条目

## TDD 步骤
1. 写 XxxTest，覆盖场景 A/B/C
2. 运行 <test-cmd> 确认测试失败
3. 实现 Xxx
4. 运行 <test-cmd> 确认测试通过
5. 运行全量测试确认无回退
（纯配置/文档类任务简化为：1. 实现 2. 验证）

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | 具体操作 | 期望结果 |
| AC-02 | ... | ... |
\`\`\`

### frontmatter 元数据说明
- \`priority\`: P0（必须）/ P1（重要）/ P2（可选）
- \`estimated_hours\`: 预估工时，单个 task ≤ 8h
- \`depends_on\`: 依赖的前序 task 编号列表
- \`blocks\`: 被本 task 阻塞的后续 task 编号列表
- \`allowed_paths\`: AI executor 可以修改的文件路径范围（安全边界）

### 关键规则
- task-N.md 必须独立完整，execute 子代理只读这一个文件就能干活
- 不要依赖其他 task-N.md 的内容
- 接口定义写到"搬砖工照着做"的程度
- 边界处理至少覆盖 5 条规则
- 验收标准用表格格式，每条可点击验证，禁止"功能可演示"类笼统表述
- 写完后保存到文件

### 操作
1. 读取 design.md 和 plan.md 了解上下文
2. 读取相关源文件了解现有代码
3. 编写任务蓝图
4. 保存到 tasks/task-${num}.md

### 输出
任务蓝图内容摘要`
}

/**
 * 构建任务蓝图协调器步骤（单步，子代理并行写蓝图）
 */
export function buildCoordinatorStep(changeDir, taskNames) {
  const taskList = taskNames.map((name, i) => {
    const num = String(i + 1).padStart(2, '0')
    return `- task-${num}: ${name}`
  }).join('\n')

  const subagentPrompts = taskNames.map((name, i) => {
    const num = String(i + 1).padStart(2, '0')
    return `\`\`\`
任务编号：task-${num}
任务名称：${name}
文件路径：${changeDir}/tasks/task-${num}.md

操作：
1. 读取 ${changeDir}/design.md 和 ${changeDir}/plan.md 了解上下文
2. 读取相关模块文档（如存在）：
   - \
ls .sillyspec/docs/*/modules/_module-map.yaml 2>/dev/null\
   确认模块划分，读取涉及模块的 \
ls .sillyspec/docs/*/modules/*.md 2>/dev/null\
3. 读取相关源文件了解现有代码
4. 按以下格式编写任务蓝图并保存到 ${changeDir}/tasks/task-${num}.md：

---
id: task-${num}
title: ${name}
priority: P0/P1/P2
estimated_hours: N
depends_on: [task-XX]
blocks: [task-XX]
allowed_paths:
  - ...
---

# task-${num}: ${name}

## 修改文件（必填）
- 精确到文件路径

## 实现要求
1. 具体做什么

## 接口定义（代码类任务必填）
方法签名、数据结构、控制流伪代码

## 边界处理（必填）
- null/空值行为
- 兼容旧行为（brownfield：未配置新功能时行为不变）
- 异常不静默吞掉（明确返回值或抛出）
- 不修改传入参数
- 歧义/冲突场景的处理策略

## 非目标（本任务不做的事）
- 明确边界，防止 scope creep

## 参考
- 可参考的模式

## TDD 步骤
1. 写测试 → 2. 确认失败 → 3. 写代码 → 4. 确认通过 → 5. 回归

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | ... | ... |

关键规则：
- 必须独立完整，execute 子代理只读这一个文件就能干活
- 不要依赖其他 task-N.md 的内容
- 接口定义写到"搬砖工照着做"的程度
- 边界处理至少 5 条
- 验收标准用表格，禁止笼统表述
- 写完后用 Write tool 保存到文件
\`\`\``
  }).join('\n\n')


  const prompt = `为 plan.md 中的每个任务生成独立蓝图文件。

## 任务清单
${taskList}

## 执行方式（必须严格遵守）

**你必须使用 Agent tool 启动子代理来写每个蓝图，不要自己写。**

1. 确认 \`${changeDir}/tasks/\` 目录存在（不存在则创建）
2. 为每个任务启动一个独立子代理（Agent tool），可并行启动多个
3. 每个子代理使用对应的 prompt（见下方模板）
4. 等待所有子代理完成
5. 验证每个 task-N.md 文件已生成且非空

### 子代理 prompt 模板
为每个任务使用以下 prompt 启动子代理：

${subagentPrompts}

## 验收
- 每个 task-N.md 文件存在且非空
- 包含 YAML frontmatter（id、title、priority、depends_on、blocks、allowed_paths）
- 包含所有必要章节：修改文件、实现要求、接口定义、边界处理（≥5条）、非目标、TDD 步骤、验收标准（表格格式）
- 边界处理覆盖：null/空值、兼容性、异常处理、参数不可变、歧义场景`

  return {
    name: '生成任务蓝图（子代理并行）',
    prompt,
    outputHint: '蓝图生成结果',
    optional: false
  }
}

/**
 * 从 plan.md 解析任务名列表
 */
function parseTaskNames(planContent) {
  const names = []
  const lines = planContent.split('\n')
  for (const line of lines) {
    const m = line.match(/^[-*]\s*\[[ x]\]\s*task-\d+:\s*(.+)/i)
    if (m) names.push(m[1].trim())
  }
  return names
}

/**
 * 动态构建 plan 步骤列表
 * @param {string|null} changeDir - 变更目录路径
 * @param {string|null} planContent - plan.md 内容（可选，用于解析任务数）
 * @returns {Array} 步骤列表
 */
export function buildPlanSteps(changeDir = null, planContent = null) {
  let taskCount = 0

  // 尝试从 plan.md 解析任务数
  if (planContent) {
    taskCount = parseTaskCount(planContent)
  } else if (changeDir) {
    const planFile = path.join(changeDir, 'plan.md')
    if (existsSync(planFile)) {
      taskCount = parseTaskCount(readFileSync(planFile, 'utf8'))
    }
  }

  // 没有任务数则用固定步骤（兼容旧流程）
  if (taskCount === 0) {
    return [...fixedPrefix, ...fixedSuffix]
  }

  // 解析任务名
  let taskNames = []
  if (planContent) {
    taskNames = parseTaskNames(planContent)
  } else if (changeDir) {
    const planFile = path.join(changeDir, 'plan.md')
    if (existsSync(planFile)) {
      taskNames = parseTaskNames(readFileSync(planFile, 'utf8'))
    }
  }

  // 生成单个协调器步骤（子代理并行写蓝图）
  const coordinatorStep = buildCoordinatorStep(changeDir, taskNames)
  return [...fixedPrefix, coordinatorStep, ...fixedSuffix]
}
