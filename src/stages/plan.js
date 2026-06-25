import { existsSync, readFileSync, readdirSync } from 'fs'
import path from 'path'

/**
 * 校验 design.md 是否满足 plan 执行契约
 * 第一版是轻量 markdown 结构检查，不强 schema。
 * @param {string} designContent - design.md 文件内容
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateDesignForPlan(designContent) {
  const errors = []
  const warnings = []

  if (!designContent || !designContent.trim()) {
    return { ok: false, errors: ['design.md 内容为空'], warnings }
  }

  const lower = designContent.toLowerCase()

  // 检查 1: 必须包含目标/问题描述（error）
  const hasGoal = /(^|\n)#{2,}\s*.*(目标|goal|objective|背景|background|问题|problem|purpose|目的)/i.test(designContent)
  if (!hasGoal) {
    errors.push('design.md 缺少「目标/背景/问题描述」章节 — plan 需要知道要达成什么')
  }

  // 检查 2: 必须包含范围/scope（error）
  const hasScope = /(^|\n)#{2,}\s*.*(范围|scope|总体方案|方案|approach|solution|设计|design)/i.test(designContent)
  if (!hasScope) {
    errors.push('design.md 缺少「范围/总体方案/设计」章节 — plan 需要知道做什么和怎么做')
  }

  // 检查 3: 必须包含决策/方案选择（error）
  const hasDecisions = /(^|\n)#{2,}\s*.*(决策|decision|选择|choice|方案选择)/i.test(designContent)
  || /d-\d+@v\d+/i.test(designContent) // decisions.md 引用 ID
  || /decisions?\.md/i.test(designContent) // 引用 decisions.md
  if (!hasDecisions) {
    errors.push('design.md 缺少「决策/方案选择」— plan 需要基于明确的技术决策来拆分任务')
  }

  // 检查 4 (warning): 缺非目标/non-goals
  const hasNonGoals = /(^|\n)#{2,}\s*.*(非目标|non-goals?|不做|out of scope|不在范围)/i.test(designContent)
  if (!hasNonGoals) {
    warnings.push('design.md 缺少「非目标/Non-goals」— 建议明确不做什么，防止 scope creep')
  }

  // 检查 5 (warning): 缺约束/风险
  const hasConstraints = /(^|\n)#{2,}\s*.*(约束|constraint|限制|limitation|风险|risk|trade-?off)/i.test(designContent)
  if (!hasConstraints) {
    warnings.push('design.md 缺少「约束/风险/Trade-off」— 建议记录已知约束和风险')
  }

  // 检查 6 (warning): 缺文件变更清单
  const hasFileChanges = /文件变更|file change|变更清单|changed files/i.test(designContent)
  || /^\|\s*(新增|修改|删除|new|modify|delete|update)\s*\|/im.test(designContent)
  if (!hasFileChanges) {
    warnings.push('design.md 缺少「文件变更清单」— 建议列出预期改动的文件')
  }

  return { ok: errors.length === 0, errors, warnings }
}

export const definition = {
  name: 'plan',
  title: '实现计划',
  description: '编写实现计划 — 按 Wave 分组，每个任务独立文档',
  steps: null // 动态生成
}

// ═══════════════════════════════════════════════════════════════
// 第 1 步（LLM）：复杂度分类 + 上下文加载（合并原 ①②③④）
// ═══════════════════════════════════════════════════════════════

const stepClassify = {
  id: 'classify',
  name: '复杂度分类与上下文加载',
  prompt: `在生成计划之前，先加载上下文并判定本次需求的复杂度等级（plan_level）。

### 操作
1. 运行 \`sillyspec progress show\`，确认 currentStage 为 "plan"
2. 读取 CODEBASE-OVERVIEW.md + 各子项目上下文
3. 读取 proposal.md、design.md、requirements.md、tasks.md
4. 如果存在 decisions.md，必须读取并提取所有当前版本 D-xxx@vN 决策 ID
   - 如果发现 priority=P0/P1 且 status=unresolved/blocking 的决策，停止生成计划，要求先回到 brainstorm 的 Design Grill 修正
   - 如果发现 superseded 决策，只引用最新版本，不引用旧版本
5. 读取 CONVENTIONS.md、ARCHITECTURE.md、STACK.md
6. 读取 local.yaml 获取构建/测试命令
7. 读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`（不存在则跳过）
   - 根据 design.md 的文件变更清单匹配模块
   - 读取匹配到的模块文档
   - 利用模块依赖关系辅助分析（depends_on / used_by）

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

然后列出已加载的文件清单（含 decisions.md 当前版本/未决项状态、模块文档 + 模块依赖关系摘要）。

分类完成后，继续进入下一步。`,
  outputHint: '复杂度分类结果 + 文件清单',
  optional: false
}

// ═══════════════════════════════════════════════════════════════
// 第 2 步（LLM）：生成分级计划 + 自检（合并原 ⑤⑥）
// ═══════════════════════════════════════════════════════════════

const stepGeneratePlan = {
  id: 'generate_plan',
  name: '生成分级计划与自检',
  prompt: `根据上一步的 plan_level 结果，按对应级别生成计划，然后立即自检。

### 操作
1. 读取上一步输出的 plan_level 分类结果
2. 读取 tasks.md 和 design.md 了解需求范围
3. 按 plan_level 选择对应模板输出
4. 生成后立即自检（见下方自检清单）

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
- [ ] task-01: ...（覆盖：FR-01, D-001@v1）
- [ ] task-02: ...
- [ ] task-03: ...

## 验收
- 具体可验证的验收条目

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | AC-01 |
\`\`\`

light 计划的约束：
- **禁止**生成 Mermaid 图
- **禁止**估时
- **禁止**泛泛风险分析（如"需要充分测试"）
- **禁止**放实现细节（函数签名、代码示例）
- 来源/目标直接引用已有文档，不重新生成
- 如果存在 decisions.md，所有当前版本 D-xxx@vN 必须在 Tasks 或覆盖矩阵中出现
- 如果存在 P0/P1 unresolved blocker，不生成 plan.md
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
- [ ] task-01: 添加用户创建接口（覆盖：FR-01, D-001@v1）
- [ ] task-02: 添加角色创建接口（覆盖：FR-02）

## Wave 2（依赖 Wave 1）
- [ ] task-03: 用户创建接口联调

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 添加用户创建接口 | W1 | P0 | — | FR-01, D-001@v1 | ... |
| task-02 | 添加角色创建接口 | W1 | P0 | — | FR-02 | ... |
| task-03 | 用户创建接口联调 | W2 | P0 | task-01,02 | FR-03 | ... |

## 关键路径
task-01 → task-03（最长路径，决定最短交付周期）

## 全局验收标准
- [ ] 所有单元测试通过
- [ ] （brownfield）未配置新功能时行为不变

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | AC-01 |
\`\`\`

full 计划的约束：
- **禁止**估时（任务总表不含估时列）
- **禁止**泛泛风险分析（"需要充分测试"类废话转为具体验收条目）
- Mermaid 依赖关系图**仅当依赖关系非平凡时生成**（线性依赖或全并行时不生成）
- **Wave 下的 checkbox 行必须保留**（execute 阶段解析依赖 \`- [ ] task-XX:\` 格式）
- plan.md 包含 Wave 分组 + 任务总表 + 关键路径 + 全局验收标准，**不放实现细节**
- 如果存在 decisions.md，plan.md 必须包含当前版本 D-xxx@vN/FR-xxx 覆盖矩阵
- 如果存在 P0/P1 unresolved blocker，不生成 plan.md，输出阻塞清单
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

---

### 自检（生成后立即执行，不另开步骤）

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
- [ ] 如果存在 decisions.md，所有当前版本 D-xxx@vN 在 plan.md 中可追踪
- [ ] 不存在 P0/P1 unresolved blocker
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
- [ ] 如果存在 decisions.md，任务总表或覆盖矩阵覆盖全部当前版本 D-xxx@vN
- [ ] 不存在 P0/P1 unresolved blocker
- [ ] （brownfield）全局验收包含兼容性条款
- [ ] 没有实现细节（接口定义、代码示例等不应该在 plan.md 里）
- [ ] plan.md 与 design.md 的文件变更清单一致
- [ ] 如果涉及构造函数/接口/DTO/client 方法变更，是否搜索了所有调用点并纳入任务范围？
- [ ] 调用点搜索命令的输出是否记录在 plan.md 或 task-NN.md 中？
- [ ] 如果有 Mermaid 图，依赖关系确实非平凡（非线性/非全并行）
- [ ] 没有泛泛风险分析（如"需要充分测试"）

### 输出
plan_level + 计划内容 + 自检结果（一次输出）`,
  outputHint: '计划内容 + 自检结果',
  optional: false
}

// ═══════════════════════════════════════════════════════════════
// 第 3 步（LLM）：生成任务蓝图（保留原 ⑦，内嵌一致性要求）
// ═══════════════════════════════════════════════════════════════

/**
 * 构建任务蓝图协调器步骤（单步，子代理并行写蓝图）
 * 内嵌一致性要求，减少后续 review 步骤的需求
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
   - \`ls .sillyspec/docs/*/modules/_module-map.yaml 2>/dev/null\`
   确认模块划分，读取涉及模块的 \`ls .sillyspec/docs/*/modules/*.md 2>/dev/null\`
3. 读取相关源文件了解现有代码
4. 按以下格式编写任务蓝图并保存到 ${changeDir}/tasks/task-${num}.md：

---
id: task-${num}
title: ${name}
author: <git-user>
created_at: <now-datetime>
priority: P0/P1/P2
estimated_hours: N
depends_on: [task-XX]
blocks: [task-XX]
requirement_ids: [FR-XX]
decision_ids: [D-XXX@vN]
allowed_paths:
  - ...
---

# task-${num}: ${name}

## 修改文件（必填）
- 精确到文件路径

## 覆盖来源
- Requirements: FR-xx
- Decisions: D-xxx@vN（如存在）

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
- 如果存在 decisions.md，不允许丢失当前版本 D-xxx@vN；无法覆盖的 D-xxx@vN 必须写入非目标或剩余风险
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

## 验收（生成后自查，不另开步骤）
- 每个 task-N.md 文件存在且非空
- 包含 YAML frontmatter（id、title、author、created_at、priority、depends_on、blocks、requirement_ids、decision_ids、allowed_paths）
- 包含所有必要章节：修改文件、覆盖来源、实现要求、接口定义、边界处理（≥5条）、非目标、TDD 步骤、验收标准（表格格式）
- 边界处理覆盖：null/空值、兼容性、异常处理、参数不可变、歧义场景
- **一致性检查**（生成完毕后自查）：
  - 文件路径有没有冲突（两个任务改同一个文件在同一 allowed_paths 下）
  - 依赖关系和 plan.md 的 Wave 分组是否一致
  - 验收标准和 plan.md 的全局标准是否矛盾
  - 接口定义是否自洽
  - 如发现矛盾，列出问题清单，不要自动修复`

  return {
    id: 'generate_blueprints',
    name: '生成任务蓝图（子代理并行）',
    prompt,
    outputHint: '蓝图生成结果',
    optional: false
  }
}

// ═══════════════════════════════════════════════════════════════
// 第 4 步（noAI）：Wave 重排 + 一致性校验 + 保存（合并原 ⑧⑨⑩，全代码化）
// ═══════════════════════════════════════════════════════════════

/**
 * 从 task-NN.md frontmatter 解析 depends_on 字段
 * @param {string} content - task 文件内容
 * @returns {string[]}
 */
function parseDependsOn(content) {
  // 提取 frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return []
  const fm = fmMatch[1]
  // 匹配 depends_on: [task-01, task-02] 或 depends_on:\n  - task-01
  const inlineMatch = fm.match(/depends_on:\s*\[([^\]]*)\]/)
  if (inlineMatch) {
    return inlineMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean)
  }
  const blockMatch = fm.match(/depends_on:\s*\n((?:\s+-\s+.+\n?)+)/)
  if (blockMatch) {
    return blockMatch[1].match(/-\s+(.+)/g)?.map(s => s.replace(/^-\s+/, '').trim().replace(/['"]/g, '')) || []
  }
  return []
}

/**
 * 解析 task-NN.md 的 task id（从 frontmatter 或文件名）
 * @param {string} content - task 文件内容
 * @param {string} filename - 文件名
 * @returns {string|null}
 */
function parseTaskId(content, filename) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (fmMatch) {
    const idMatch = fmMatch[1].match(/^id:\s*(.+)/m)
    if (idMatch) return idMatch[1].trim()
  }
  const fileMatch = filename.match(/(task-\d+)/i)
  return fileMatch ? fileMatch[1] : null
}

/**
 * 解析 task-NN.md 的 allowed_paths
 * @param {string} content
 * @returns {string[]}
 */
function parseAllowedPaths(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return []
  const fm = fmMatch[1]
  const inlineMatch = fm.match(/allowed_paths:\s*\[([^\]]*)\]/)
  if (inlineMatch) {
    return inlineMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean)
  }
  const blockMatch = fm.match(/allowed_paths:\s*\n((?:\s+-\s+.+\n?)+)/)
  if (blockMatch) {
    return blockMatch[1].match(/-\s+(.+)/g)?.map(s => s.replace(/^-\s+/, '').trim().replace(/['"]/g, '')) || []
  }
  return []
}

/**
 * 检查 task-NN.md 是否包含验收标准章节
 * @param {string} content
 * @returns {boolean}
 */
function hasAcceptanceCriteria(content) {
  return /##\s*验收标准/.test(content) || /##\s*Acceptance/.test(content)
}

/**
 * 检查 task-NN.md 是否包含 TDD/验证步骤
 * @param {string} content
 * @returns {boolean}
 */
function hasTddOrVerify(content) {
  return /##\s*TDD/.test(content) || /##\s*验证/.test(content) || /##\s*Verify/.test(content)
}

/**
 * 拓扑排序：根据 depends_on 计算波次
 * @param {Map<string, string[]>} depMap - taskId → depends_on list
 * @returns {{ waves: string[][](), error: string|null }}
 */
export function topoSortWaves(depMap) {
  const tasks = [...depMap.keys()]
  const waves = []
  const assigned = new Set()
  const visiting = new Set() // for cycle detection
  const visited = new Set()

  // 先做循环依赖检测（DFS）
  function hasCycle(task, path) {
    if (path.has(task)) return true
    if (visited.has(task)) return false
    path.add(task)
    const deps = depMap.get(task) || []
    for (const dep of deps) {
      if (!depMap.has(dep)) continue // 依赖不存在（可能是外部引用），跳过
      if (hasCycle(dep, path)) return true
    }
    path.delete(task)
    visited.add(task)
    return false
  }
  for (const task of tasks) {
    if (hasCycle(task, new Set())) {
      return { waves: [], error: `检测到循环依赖，涉及 task: ${task}` }
    }
  }

  // 逐层分配 Wave
  while (assigned.size < tasks.length) {
    const currentWave = []
    for (const task of tasks) {
      if (assigned.has(task)) continue
      const deps = (depMap.get(task) || []).filter(d => depMap.has(d)) // 只考虑已知 task
      if (deps.every(d => assigned.has(d))) {
        currentWave.push(task)
      }
    }
    if (currentWave.length === 0) {
      // 无法推进，说明有无法解析的依赖
      const remaining = tasks.filter(t => !assigned.has(t))
      return { waves: [], error: `无法解析依赖关系，剩余 task: ${remaining.join(', ')}` }
    }
    for (const task of currentWave) {
      assigned.add(task)
    }
    waves.push(currentWave)
  }

  return { waves, error: null }
}

/**
 * 本地一致性校验器（替代原 LLM 审查步骤）
 * @param {string} changeDir - 变更目录
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateBlueprintConsistency(changeDir) {
  const errors = []
  const warnings = []

  const tasksDir = path.join(changeDir, 'tasks')
  if (!existsSync(tasksDir)) {
    return { ok: false, errors: ['tasks/ 目录不存在'], warnings }
  }

  const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))
  if (taskFiles.length === 0) {
    return { ok: false, errors: ['tasks/ 目录下没有 task-NN.md 文件'], warnings }
  }

  // 收集每个 task 的信息
  const taskInfo = new Map() // taskId → { dependsOn, allowedPaths, hasAcceptance, hasTdd, file }
  const pathOwners = new Map() // filePath → [taskId, ...]

  for (const file of taskFiles) {
    const filePath = path.join(tasksDir, file)
    const content = readFileSync(filePath, 'utf8')
    const taskId = parseTaskId(content, file)
    if (!taskId) {
      errors.push(`${file}: 无法解析 task id`)
      continue
    }

    const dependsOn = parseDependsOn(content)
    const allowedPaths = parseAllowedPaths(content)
    const hasAcceptance = hasAcceptanceCriteria(content)
    const hasTdd = hasTddOrVerify(content)

    taskInfo.set(taskId, { dependsOn, allowedPaths, hasAcceptance, hasTdd, file })

    // 检查 allowed_paths
    if (allowedPaths.length === 0) {
      errors.push(`${taskId} (${file}): 缺少 allowed_paths`)
    }

    // 检查验收标准
    if (!hasAcceptance) {
      errors.push(`${taskId} (${file}): 缺少「验收标准」章节`)
    }

    // 检查 TDD/验证步骤
    if (!hasTdd) {
      warnings.push(`${taskId} (${file}): 缺少 TDD/验证步骤章节`)
    }

    // 收集路径归属
    for (const p of allowedPaths) {
      if (!pathOwners.has(p)) pathOwners.set(p, [])
      pathOwners.get(p).push(taskId)
    }
  }

  // 检查路径冲突
  for (const [p, owners] of pathOwners) {
    if (owners.length > 1) {
      warnings.push(`路径 ${p} 被 ${owners.length} 个 task 修改: ${owners.join(', ')}（确认是否为有意共享）`)
    }
  }

  // 拓扑排序 + 循环依赖检测
  const depMap = new Map()
  for (const [taskId, info] of taskInfo) {
    depMap.set(taskId, info.dependsOn)
  }
  const { error: topoError } = topoSortWaves(depMap)
  if (topoError) {
    errors.push(topoError)
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * noAI postcheck 步骤：Wave 重排 + 一致性校验 + 保存确认
 * 通过 JS 代码完成，不需要 LLM 调用
 */
export function buildPostcheckStep(changeDir) {
  return {
    id: 'postcheck',
    name: 'Wave 重排与一致性校验',
    prompt: '', // noAI 步骤不需要 prompt
    outputHint: 'Wave 重排 + 校验结果',
    optional: false,
    noAI: true,
    _cliAction: 'planPostcheck'
  }
}

// ═══════════════════════════════════════════════════════════════
// 向后兼容：导出 fixedPrefix / fixedSuffix（供 run.js 切片用）
// 新结构只有 3 个 LLM 步骤，fixedSuffix 只含 postcheck
// ═══════════════════════════════════════════════════════════════

export const fixedPrefix = [stepClassify, stepGeneratePlan]

export const fixedSuffix = [] // postcheck 是动态生成的（需要 changeDir）

// ═══════════════════════════════════════════════════════════════
// 工具函数（保持导出兼容）
// ═══════════════════════════════════════════════════════════════

/**
 * 解析 plan.md 获取任务数量
 */
function parseTaskCount(planContent) {
  if (!planContent || typeof planContent !== 'string') return 0
  const matches = planContent.match(/^[-*]\s*\[[ x]\]\s*task-\d+/gm)
  return matches ? matches.length : 0
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
 * 生成单个任务的蓝图写作 prompt（保留供外部调用）
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
author: <git-user>
created_at: <now-datetime>
priority: P0
estimated_hours: N
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-001@v1]
allowed_paths:
  - 允许修改的路径范围
---

# task-${num}: ${taskName}

## 修改文件（必填）
- 精确到文件路径，列出所有需要新增或修改的文件

## 覆盖来源
- Requirements: FR-xx（来自 requirements.md）
- Decisions: D-xxx@vN（如存在 decisions.md）

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
- \`requirement_ids\`: 本任务覆盖的 FR-xxx 列表
- \`decision_ids\`: 本任务覆盖的当前版本 D-xxx@vN 列表；无 decisions.md 时可为空数组
- \`allowed_paths\`: AI executor 可以修改的文件路径范围（安全边界）

### 关键规则
- task-N.md 必须独立完整，execute 子代理只读这一个文件就能干活
- 不要依赖其他 task-N.md 的内容
- 接口定义写到"搬砖工照着做"的程度
- 边界处理至少覆盖 5 条规则
- 验收标准用表格格式，每条可点击验证，禁止"功能可演示"类笼统表述
- 如果存在 decisions.md，不允许丢失当前版本 D-xxx@vN；无法覆盖的 D-xxx@vN 必须写入非目标或剩余风险
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
 * 动态构建 plan 步骤列表
 * 新架构：3 个 LLM 步骤 + 1 个 noAI 步骤 = 4 阶段
 *
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

  // 没有任务数则用固定步骤（兼容旧流程，无蓝图步骤无 postcheck）
  if (taskCount === 0) {
    // 只返回前两个 LLM 步骤 + postcheck（无蓝图生成）
    const postcheck = changeDir ? [buildPostcheckStep(changeDir)] : []
    return [...fixedPrefix, ...postcheck]
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

  // 生成协调器步骤（蓝图生成）+ postcheck
  const coordinatorStep = buildCoordinatorStep(changeDir, taskNames)
  const postcheckStep = buildPostcheckStep(changeDir)
  return [...fixedPrefix, coordinatorStep, postcheckStep]
}
