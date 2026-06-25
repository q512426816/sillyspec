import { existsSync, readFileSync, readdirSync } from 'fs'
import path from 'path'

// 从 plan-postcheck.js 重导出（保持向后兼容）
export {
  topoSortWaves,
  validateBlueprintConsistency,
  validatePlanArtifacts,
  validatePlanFeasibility
} from './plan-postcheck.js'

// 这些解析函数已迁移到 plan-postcheck.js，此处不再定义

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
// 第 3 步（LLM）：生成紧凑 TaskCard（子代理并行）
// ═══════════════════════════════════════════════════════════════

/**
 * 构建紧凑 TaskCard 协调器步骤（单步，子代理并行写卡片）
 * 每个 task 生成 20~40 行紧凑可执行卡片
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
2. 读取相关源文件了解现有代码
3. 生成紧凑 TaskCard（20~40 行），格式如下：

---
id: task-${num}
title: ${name}
author: <git-user>
created_at: <now-datetime>
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-XX]
decision_ids: [D-XXX@vN]
allowed_paths:
  - frontend/src/lib/errors.ts
goal: >
  一句话说明这个 task 要做什么、为什么。
implementation:
  - 具体步骤 1
  - 具体步骤 2
  - 具体步骤 3
acceptance:
  - 可验证的验收条件 1
  - 可验证的验收条件 2
  - 可验证的验收条件 3
verify:
  - cd frontend && pnpm exec tsc --noEmit
constraints:
  - 边界约束 1（如：不加测试）
  - 边界约束 2（如：不修改传入参数）
---

TaskCard 格式规则（必须严格遵守）：
- 总长度 20~40 行，不要写成长文档
- frontmatter 只含必要字段，不加 estimated_hours
- goal: 一句话，用 > 多行字符串
- implementation: 列表，每条一个具体步骤
- acceptance: 列表，每条可独立验证（不是表格）
- verify: 列表，实际可执行的命令
- constraints: 列表，明确边界（含 brownfield 兼容、异常处理）
- 不需要：修改文件章节、覆盖来源章节、接口定义章节、TDD 步骤章节、参考章节
- 如果存在 decisions.md，无法覆盖的 D-xxx@vN 在 constraints 中标注
- 写完后用 Write tool 保存到文件
\`\`\``
  }).join('\n\n')


  const prompt = `为 plan.md 中的每个任务生成紧凑 TaskCard。

## 任务清单
${taskList}

## 时间和用户
当前时间：<now-datetime>
当前用户：<git-user>

## 执行方式（必须严格遵守）

**你必须使用 Agent tool 启动子代理来写每个卡片，不要自己写。**

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
- frontmatter 包含：id、title、author、created_at、priority、depends_on、blocks、allowed_paths
- body 包含：goal、implementation、acceptance、verify、constraints
- 每个 task 总长度 20~40 行
- **一致性自查**：
  - allowed_paths 有无冲突
  - depends_on 与 plan.md Wave 分组是否一致
  - 如发现矛盾，列出问题清单，不要自动修复`

  return {
    id: 'generate_blueprints',
    name: '生成 TaskCard（子代理并行）',
    prompt,
    outputHint: 'TaskCard 生成结果',
    optional: false
  }
}

// ═══════════════════════════════════════════════════════════════
// 第 4 步（noAI）：Wave 重排 + 一致性校验 + 保存（合并原 ⑧⑨⑩，全代码化）
// 核心逻辑已迁移到 plan-postcheck.js，此处只保留步骤定义
// ═══════════════════════════════════════════════════════════════

/**
 * noAI postcheck 步骤：Wave 重排 + 一致性校验 + 可行性校验 + 保存确认
 * 核心逻辑见 plan-postcheck.js
 */
export function buildPostcheckStep(changeDir) {
  return {
    id: 'postcheck',
    name: 'Wave 重排与可行性校验',
    prompt: '', // noAI 步骤不需要 prompt
    outputHint: 'Wave 重排 + 校验结果',
    optional: false,
    noAI: true,
    _cliAction: 'planPostcheck'
  }
}

// ═══════════════════════════════════════════════════════════════
// 向后兼容：导出 fixedPrefix / fixedSuffix（供 run.js 切片用）
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

  // 生成协调器步骤（TaskCard 生成）+ postcheck
  const coordinatorStep = buildCoordinatorStep(changeDir, taskNames)
  const postcheckStep = buildPostcheckStep(changeDir)
  return [...fixedPrefix, coordinatorStep, postcheckStep]
}
