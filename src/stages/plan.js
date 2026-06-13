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
    name: '复杂度分类',
    prompt: `在生成计划之前，先判定本次需求的复杂度等级（plan_level）。

### 操作
1. 读取 tasks.md 和 design.md，了解需求范围
2. 按「分级规则」判定 plan_level

### 分级规则
判定 plan_level 为 none 时，需**同时满足**以下所有条件：
- 涉及文件 ≤ 2 个
- 不跨模块（改动集中在单个模块内）
- 无 schema / DB / manifest / local.yaml 变更
- 无状态机 / workflow 状态流转变更
- 无 source_root / spec_root / runtime_root 路径隔离规则变更
- 无 validator / postcheck / agent 调度行为变更
- 需求明确，无设计歧义

判定为 light（满足任一即升为 light）：
- 涉及 3-5 个文件
- 涉及 prompt 行为变更
- 涉及 validator / postcheck 逻辑
- 涉及路径规则变更（但范围可控）
- 涉及 schema/DB/状态机变更，但影响面可控
- 需要明确验收标准来防止范围漂移

判定为 full（满足任一即升为 full）：
- 预计 8 个以上 task
- 跨 3 个以上模块
- 涉及 CLI + 平台 + DB 联动
- 涉及 agent 调度 / worktree / isolation 逻辑
- 涉及复杂状态恢复（checkpoint / resume）
- 需要并行 sub-agent 执行
- 需要人工审查设计方向
- 涉及 worktree / baseline / sandbox 等基础设施

### 输出格式
在输出开头，以如下格式输出分类结果：

\`\`\`
plan_level: none | light | full
reason: <一句话说明判定理由>
estimated_files: <N>
cross_module: true | false
has_schema_change: true | false
has_state_machine_change: true | false
needs_parallel_execution: true | false
needs_human_review: true | false
\`\`\`

分类完成后，继续进入下一步。`,
    outputHint: '复杂度分类结果',
    optional: false
  },
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
9. **利用模块依赖关系辅助分析**：
   - 用 depends_on 判断哪些模块会被间接影响
   - 用 used_by 判断变更会不会影响下游模块
   - 将依赖关系纳入 Wave 分组决策（依赖同一模块的任务尽量同 Wave）
   - 如果变更涉及多个有依赖关系的模块，在 plan.md 的任务总表中标注模块依赖

### 输出
已加载的文件清单（含模块文档 + 模块依赖关系摘要）`,
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
    name: '按复杂度生成分级计划',
    prompt: `根据「复杂度分类」步骤的 plan_level 结果，按对应级别生成计划。

### 操作
1. 读取上一步输出的 plan_level 分类结果
2. 读取 tasks.md 和 design.md 了解需求范围
3. 按 plan_level 选择对应模板输出

---

#### plan_level = none
生成最小 plan.md（占位文件，保持流程兼容），不生成完整蓝图。格式：
\`\`\`markdown
---
plan_level: none
---

# 计划跳过

## 原因
<一句话说明判定理由>

## 建议直接 execute
直接进入 execute 阶段完成下列最小任务。

## Tasks
- [ ] task-01: 按用户需求完成小范围明确修改

## 验收
- 修改范围符合用户需求
- 不引入额外无关变更
- 必要测试或检查通过
\`\`\`
**注意：** 所有 plan_level 都必须包含 \`- [ ] task-XX:\` 格式的 checkbox 任务，execute 阶段依赖此格式解析任务。

---

#### plan_level = light
生成轻量 plan.md，保存到变更目录。只包含以下四部分：

\`\`\`markdown
---
plan_level: light
---

# 轻量计划：<需求简述>

## 来源
直接引用 brainstorm 结论或用户原始需求，不重新扩写。

## 范围
- 涉及的文件/模块清单

## Tasks
- [ ] task-01: ...
- [ ] task-02: ...
- [ ] task-03: ...

## 验收
- 具体可验证的验收条目
\`\`\`

light 计划的约束：
- **禁止**生成 Mermaid 图
- **禁止**估时
- **禁止**泛泛风险 分析（如"需要充分测试"）
- **禁止**放实现细节（函数签名、代码示例）
- 来源/目标直接引用已有文档，不重新生成
- 任务列表控制在 10 条以内
- **任务必须使用 checkbox 格式**（\`- [ ] task-XX:\`），不要用纯编号列表（\`1. 2.\`），execute 阶段依赖此格式解析任务

---

#### plan_level = full
生成完整 plan.md，保存到变更目录。格式如下：

\`\`\`markdown
---
plan_level: full
---

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
| 编号 | 任务 | Wave | 优先级 | 依赖 | 说明 |
|---|---|---|---|---|---|
| task-01 | 添加用户创建接口 | W1 | P0 | — | ... |
| task-02 | 添加角色创建接口 | W1 | P0 | — | ... |
| task-03 | 用户创建接口联调 | W2 | P0 | task-01,02 | ... |

## 关键路径
task-01 → task-03（最长路径，决定最短交付周期）

## 全局验收标准
- [ ] 所有单元测试通过
- [ ] （brownfield）未配置新功能时行为不变
\`\`\`

full 计划的约束：
- **禁止**估时（任务总表不含估时列）
- **禁止**泛泛风险分析（"需要充分测试"类废话转为具体验收条目）
- Mermaid 依赖关系图**仅当依赖关系非平凡时生成**（线性依赖或全并行时不生成）
- **Wave 下的 checkbox 行必须保留**（execute 阶段解析依赖 \`- [ ] task-XX:\` 格式）
- plan.md 包含 Wave 分组 + 任务总表 + 关键路径 + 全局验收标准，**不放实现细节**
- 实现细节写到后续的 tasks/task-NN.md 中
- 每个任务编号格式：task-01、task-02 ...
- 任务总表的优先级：P0（必须）/ P1（重要）/ P2（可选）
- 总任务数控制在 15 个以内

### Spike 前置验证（仅 full）
当存在技术不确定性时，在 Wave 之前设计 Spike：
- 涉及新技术栈/未经验证的集成 → 需要 Spike
- 涉及安全隔离/性能瓶颈 → 需要 Spike
- 纯业务逻辑/确定的技术方案 → 不需要 Spike
- 每个 Spike 定义：验证内容 + 通过标准 + 不通过后果

### 批量模式指引（仅 full）
如果 design.md 或需求中包含批量特征（关键词：批量/模板/引擎/N个相似），按以下原则规划：
- ❌ 不要列出每个实例作为独立任务
- ❌ 不要在文档中嵌入数据
- ✅ 设计通用架构，Wave 1 聚焦架构
- ✅ 数据转换用脚本完成，单独一个 Wave
- ✅ 总任务数控制在 10 个以内

---

### 通用操作（所有级别）
1. 读取 tasks.md 获取任务列表
2. 读取 design.md 获取文件变更清单
3. 读取上一步的 plan_level 分类结果
4. 按对应级别模板生成内容
5. 保存到变更目录下的 plan.md（路径格式：\`.sillyspec/changes/<change-name>/plan.md\`，其中 <change-name> 是变更目录名，直接使用，不加子目录。正确路径示例：\`.sillyspec/changes/2026-05-28-agent-log-streaming/plan.md\`）
**plan_level 为 none 时生成最小 plan.md（占位），不生成完整蓝图。**

### 输出
plan_level + 计划内容（none 级别输出建议操作）`,
    outputHint: '计划内容',
    optional: false
  },
  {
    name: '自检总览',
    prompt: `根据 plan_level 检查对应的计划质量。

### 操作
读取上一步的 plan_level 分类结果，按级别执行对应的自检：

#### plan_level = none
- [ ] plan.md 文件存在且包含 plan_level: none
- [ ] 给出了可操作的修改建议（2-5 条）
- [ ] 不含 Wave、Mermaid、估时、任务总表、依赖关系等完整蓝图内容
- [ ] 建议了直接 execute
- [ ] 包含至少一个 \`- [ ] task-XX:\` 格式的 checkbox 任务（execute 解析依赖此格式）

#### plan_level = light
- [ ] 输出明确标注 plan_level: light
- [ ] 有来源、范围、任务列表、验收标准四个部分
- [ ] 来源直接引用已有文档，未重新扩写
- [ ] 任务列表清晰且无实现细节
- [ ] 任务使用 checkbox 格式（\`- [ ] task-XX:\`），不是纯编号列表
- [ ] 验收标准具体可验证（非笼统表述）
- [ ] 没有 Mermaid 图、估时、风险分析
- [ ] 没有函数签名、代码示例等实现细节
- [ ] plan.md 与 design.md 的文件变更清单一致
- [ ] 包含至少一个 \`- [ ] task-XX:\` 格式的 checkbox 任务（execute 解析依赖此格式）

#### plan_level = full
- [ ] 每个 task 有编号（task-01、task-02 ...）
- [ ] 每个 task 在 Wave 下有 checkbox（\`- [ ] task-XX:\` 格式，execute 解析依赖此格式）
- [ ] 已标注 Wave 分组和依赖关系
- [ ] 有任务总表（含优先级、依赖列，**无估时列**）
- [ ] 有关键路径标注
- [ ] 有全局验收标准
- [ ] （brownfield）全局验收包含兼容性条款
- [ ] 没有实现细节（接口定义、代码示例等不应该在 plan.md 里）
- [ ] plan.md 与 design.md 的文件变更清单一致
- [ ] 如果有 Mermaid 图，依赖关系确实非平凡（非线性/非全并行）
- [ ] 没有泛泛风险分析（如"需要充分测试"）

### 输出
自检通过/不通过（附 plan_level）`,
    outputHint: '自检结果',
    outputHint: '自检结果',
    optional: false
  }
]

// 固定后缀步骤
export const fixedSuffix = [
  {
    name: '重排 Wave（基于 depends_on）',
    prompt: `根据蓝图的 depends_on 字段重排 Wave 分组，更新 plan.md。

### 操作
1. 读取所有 tasks/task-NN.md 的 frontmatter，提取每个任务的 depends_on 列表
2. 拓扑排序：无依赖的任务 → Wave 1，依赖 Wave 1 的 → Wave 2，依此类推
3. 检查是否存在循环依赖，如有则报错暂停
4. 用重排结果更新 plan.md：
   - Wave 分组（含 checkbox 列表）
   - 任务总表的 Wave 列
   - 依赖关系图（Mermaid）
   - 关键路径
5. 如果 Wave 分组与原始 plan.md 一致，只需确认一致即可，不需要重写

### 规则
- **Wave 是执行单元，同 Wave 内任务必须无依赖（可并行）**
- 有 depends_on 关系的任务必须在不同的 Wave
- depends_on 为空的任务放 Wave 1
- 取决于拓扑排序的最大深度决定 Wave 编号

### 输出
重排后的 Wave 分组摘要（如果与原 plan.md 一致则说明一致）`,
    outputHint: 'Wave 重排结果',
    optional: false
  },
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
3. 发现问题 → 列出问题清单，暂停等待用户决定
   - 调用：\`sillyspec run plan --wait --reason "审查发现一致性问题" --options "自动修复,手动修复,忽略并继续" --output "问题清单"\`
   - **绝对禁止**：自己决定修复方向然后自动修复
4. 无问题 → 正常完成

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

当前时间：<now-datetime>（frontmatter 的 created_at 使用此值）
当前用户：<git-user>（frontmatter 的 author 使用此值）

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
当前时间：<now-datetime>（frontmatter 的 created_at 使用此值）
当前用户：<git-user>（frontmatter 的 author 使用此值）

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

## 时间和用户
当前时间：<now-datetime>
当前用户：<git-user>

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
