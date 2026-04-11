import { existsSync, readFileSync } from 'fs'
import path from 'path'

export const definition = {
  name: 'plan',
  title: '实现计划',
  description: '编写实现计划 — 按 Wave 分组，每个任务独立文档',
  steps: null // 动态生成
}

// 固定前缀步骤
const fixedPrefix = [
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

### 输出
已加载的文件清单`,
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

### plan.md 格式（轻量总览，PM 视角）
\`\`\`markdown
# 实现计划

## Wave 1（并行，无依赖）
- [ ] task-01: 添加用户创建接口
- [ ] task-02: 添加角色创建接口

## Wave 2（依赖 Wave 1）
- [ ] task-03: 用户创建接口联调

## 全局验收标准
- [ ] 所有单元测试通过
\`\`\`

### 关键规则
- plan.md 只放任务列表 + Wave 划分 + 全局验收标准，**不放实现细节**
- 实现细节写到后续的 tasks/task-NN.md 中
- 每个任务编号格式：task-01、task-02 ...

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
5. 保存到 \`.sillyspec/changes/<变更名>/plan.md\`

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
- [ ] 每个 task 有 checkbox
- [ ] 已标注 Wave 分组和依赖关系
- [ ] 有全局验收标准
- [ ] 没有实现细节（接口定义、代码示例等不应该在 plan.md 里）
- [ ] plan.md 与 design.md 的文件变更清单一致

### 输出
自检通过/不通过`,
    outputHint: '自检结果',
    optional: false
  }
]

// 固定后缀步骤
const fixedSuffix = [
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
2. \`git add .sillyspec/\` — **不要 commit**

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
  const matches = planContent.match(/^[-*]\s*\[[ x]\]\s*task-\d+/gm)
  return matches ? matches.length : 0
}

/**
 * 生成单个任务的蓝图写作 prompt
 */
function buildTaskPrompt(taskNum, taskName, changeDir) {
  return `编写任务蓝图 tasks/task-${String(taskNum).padStart(2, '0')}.md

### 任务
${taskName}

### 文件路径
\`.sillyspec/changes/<变更名>/tasks/task-${String(taskNum).padStart(2, '0')}.md\`

### 格式要求（必须严格遵守）
\`\`\`markdown
# task-${String(taskNum).padStart(2, '0')}: ${taskName}

## 修改文件
- 具体文件路径列表

## 实现要求
1. 具体做什么，写清楚
2. ...

## 接口定义
（代码类任务必填，写方法签名、数据结构）

## 边界处理
- 异常场景列表

## 参考
- 已有代码可参考的模式
- 相关的 CONVENTIONS.md 条目

## TDD 步骤
1. 写测试 ...
2. 运行 <test-cmd> 确认失败
3. 写代码 ...
4. 运行 <test-cmd> 确认通过
（纯配置/文档类任务简化为：1. 实现 2. 验证）

## 验收标准
- [ ] 具体可测试的验收条件
\`\`\`

### 关键规则
- task-N.md 必须独立完整，execute 子代理只读这一个文件就能干活
- 不要依赖其他 task-N.md 的内容
- 接口定义写到"搬砖工照着做"的程度
- 写完后保存到文件

### 操作
1. 读取 design.md 和 plan.md 了解上下文
2. 读取相关源文件了解现有代码
3. 编写任务蓝图
4. 保存到 tasks/task-${String(taskNum).padStart(2, '0')}.md

### 输出
任务蓝图内容摘要`
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

  // 动态生成每个任务的蓝图写作步骤
  const taskSteps = []
  for (let i = 1; i <= taskCount; i++) {
    taskSteps.push({
      name: `写任务蓝图 task-${String(i).padStart(2, '0')}`,
      prompt: `### 注意
这是第 ${i}/${taskCount} 个任务蓝图。focus 在这一个任务上，不要写其他任务的内容。

${buildTaskPrompt(i, '（从 plan.md 读取任务名）', changeDir)}`,
      outputHint: `task-${String(i).padStart(2, '0')} 蓝图`,
      optional: false
    })
  }

  return [...fixedPrefix, ...taskSteps, ...fixedSuffix]
}
