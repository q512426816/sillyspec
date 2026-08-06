import { existsSync, readFileSync, readdirSync } from 'fs'
import path from 'path'
import { getRule } from '../stage-contract-spec.js'

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
    return { ok: false, errors: [getRule('plan.design-readiness').data.emptyMessage], warnings }
  }

  // 6 章节就绪检查(patterns + message)从 manifest 同源(stage-contract-spec.js plan.design-readiness);
  // 逐章节 test,patterns 数组任一命中即视为有该章节。算法等价旧内联正则(原 lower 变量未使用,已弃)。
  const rule = getRule('plan.design-readiness')
  for (const check of rule.data.checks) {
    const matched = check.patterns.some(p => new RegExp(p.pattern, p.flags).test(designContent))
    if (!matched) {
      (check.severity === 'error' ? errors : warnings).push(check.message)
    }
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
2. 读取项目总览 \`{SPEC_ROOT}/docs/<project>/scan/PROJECT.md\` + 各子项目上下文
3. 读取 proposal.md、design.md、requirements.md、tasks.md
4. 如果存在 decisions.md，必须读取并提取所有当前版本 D-xxx@vN 决策 ID
   - 如果发现 priority=P0/P1 且 status=unresolved/blocking 的决策，停止生成计划，要求先回到 brainstorm 的 Design Grill 修正
   - 如果发现 superseded 决策，只引用最新版本，不引用旧版本
5. 读取 CONVENTIONS.md、ARCHITECTURE.md（技术栈含在 ARCHITECTURE.md）
6. 读取 local.yaml 获取构建/测试命令
7. 读取 \`{SPEC_ROOT}/docs/<project>/modules/_module-map.yaml\`（不存在则跳过）
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
  name: '生成分级计划',
  prompt: `根据上一步的 plan_level 结果，按对应级别生成计划。

### 操作
1. 读取上一步输出的 plan_level 分类结果
2. 读取 tasks.md 和 design.md 了解需求范围
3. 按 plan_level 选择对应模板输出
4. 保存 plan.md（审查在下一步"审查计划"独立进行，不在本步自审——避免生成与自审同一次输出）

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

# 轻量计划（Light Plan）：<需求简述>

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

# 实现计划（Plan）

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
- [ ] 集成敏感 task（路由/layout/跨进程装配）建议加集成冒烟验收——组件单测全绿 ≠ 集成正确
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
5. 保存到变更目录下的 plan.md（路径格式：\`{SPEC_ROOT}/changes/<change-name>/plan.md\`，其中 <change-name> 是变更目录名，直接使用，不加子目录。正确路径示例：\`{SPEC_ROOT}/changes/2026-05-28-agent-log-streaming/plan.md\`）
**plan_level 为 none 时生成最小 plan.md（占位），不生成完整蓝图。**

---

### 输出
plan_level + 计划内容（审查在下一步独立进行）`,
  outputHint: 'plan_level + 计划内容',
  optional: false
}

// ═══════════════════════════════════════════════════════════════
// 第 2.5 步（LLM）：审查计划（独立于生成，按规模分级）
// ═══════════════════════════════════════════════════════════════

/**
 * 审查计划 step —— 把"审查"从生成 step 拆出（原 stepGeneratePlan 生成+自检同次输出是最严重的 self-review）。
 * 按规模分级：tier=self 当前 agent 自审；tier=independent 强制独立子代理 + review.json。
 * 占位符 {REVIEW_TIER} / {REVIEW_TIER_REASON} / {STAGE_REVIEW_RUN_ID} 由 run.js 注入。
 */
const stepReviewPlan = {
  id: 'review_plan',
  name: '审查计划',
  prompt: `对上一步生成的 plan.md 做审查。生成与审查分离——不在生成 plan 的同一上下文里自审，避免确认偏差。

### 当前审查分级（CLI 按变更规模判定，占位符由 run.js 注入）
tier: {REVIEW_TIER}（{REVIEW_TIER_REASON}）
- tier=self：当前 agent 直接执行下方审查清单（小变更，独立审查仪式成本 > 收益）
- tier=independent：必须用 Agent tool 启动一个独立的计划审查子代理（独立上下文，不共享你生成 plan 时的分析与倾向），由子代理执行下方审查清单并输出 review.json

### 审查清单（读取 plan.md 的 plan_level，逐条核对）
- [ ] task 编号与 Wave checkbox 格式正确，execute 依赖此格式解析任务
- [ ] plan_level 档位与实际复杂度匹配（none/light/full 没选错）
- [ ] 跨任务契约：task-A 的产出（接口/DTO/响应）被 task-B 消费时，consumer 是否在 TaskCard expects_from 声明所需字段、provider 是否在 provides 承诺、两边字段一致？（plan-postcheck 会硬校验，此处是独立视角复查）
- [ ] 文件覆盖：design.md 文件变更清单中的每个源码文件，是否都被至少一个 task 的 allowed_paths 覆盖？（漏覆盖 = execute 必然漏改）
- [ ] 不存在 P0/P1 unresolved blocker 残留
- [ ] 没有实现细节泄漏到 plan.md（接口签名/代码示例应在 tasks/task-NN.md）
- [ ] 关键路径与 Wave 依赖合理（无循环依赖、无遗漏前置）
- [ ] 连带测试归属：本批改动是否会导致既有测试断言失效（改共享/被多 task 依赖源文件、改被测试精确匹配的值如 UI 文案/按钮文本/错误信息/常量/枚举字面量、改函数签名或返回结构等单文件场景）？此类 task 是否在 related_tests 声明了失效测试、且路径在 allowed_paths 内（或由独立测试 task 覆盖）？（漏声明 = execute 阶段测试债、主代理事后兜底）
- [ ] acceptance 字段对照实际 schema/类型源文件核验存在性与形态，不凭 design.md 文字臆断（plan-postcheck best-effort grep 会给 allowed_paths 源文件未命中的 snake_case/camelCase 标识符提 warning，此处是语义层复查；臆断 = execute 阶段返工）

### tier=independent 时：启动 plan-review 子代理
用 Agent tool 启动子代理（subagent_type: general），prompt 要点：
1. 独立读取 {SPEC_ROOT}/changes/<change>/plan.md + design.md + tasks/*.md（不要让生成者喂结论给你，自己读原始文件）
2. 执行上方审查清单，每条给 pass/gap/fail + 证据
3. 输出 review.json(CLI Stage Review Gate 将硬校验,契约如下 —— schema + 完整示例 + docHash 算法,照抄改值):
{REVIEW_JSON_CONTRACT}
4. verdict=fail 时在 reviewerNotes 写明阻断项

### 输出
- tier=self：审查清单结果（每条状态 + 偏差说明）
- tier=independent：子代理产出的 review.json 路径 + verdict 摘要`,
  outputHint: 'plan 审查结果（self=清单 / independent=review.json 路径+verdict）',
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
  const taskList = taskNames.map(t => {
    const num = t.num
    return `- task-${num}: ${t.name}`
  }).join('\n')

  const subagentPrompts = taskNames.map(t => {
    const num = t.num
    return `\`\`\`
任务编号：task-${num}
任务名称：${t.name}
文件路径：${changeDir}/tasks/task-${num}.md
当前时间：<now-datetime>（frontmatter 的 created_at 使用此值）
当前用户：<git-user>（frontmatter 的 author 使用此值）

操作：
1. 读取 ${changeDir}/design.md 和 ${changeDir}/plan.md 了解上下文
2. 读取相关源文件了解现有代码
3. 生成紧凑 TaskCard（20~40 行），格式如下：

---
id: task-${num}
title: ${t.name}
title_zh: <任务中文标题>
author: <git-user>
created_at: <now-datetime>
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-XX]
decision_ids: [D-XXX@vN]
allowed_paths:
  - frontend/src/lib/errors.ts
provides:                              # 可选。仅当本 task 给其他 task 提供接口/DTO/响应时填
  - contract: <DTO或响应类型名>          # 如 DaemonRuntimeRead
    fields: [field_a, field_b]
expects_from:                          # 可选。仅当本 task 消费其他 task 的契约时填
  <provider-task-id>:                  # 如 task-05（占位符，不要照抄）
    - contract: <DTO或响应类型名>
      needs: [field_a]                 # 必须从该 provider 拿到的字段
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
related_tests:                           # 可选。当本 task 改动会导致既有测试断言失效时填（共享源文件/UI文案/常量/签名变更等，判据=测试是否失败非文件是否共享）
  - path: frontend/src/lib/errors.test.ts # 因本次改动断言失效的既有测试文件
    reason: 旧断言假设单例，改归属键后需同步
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
- frontmatter 必须以三减号结尾闭合（开头和结尾各一行 ---）。缺结尾会让 postcheck 提取不到 frontmatter，误报「字段缺失 / allowed_paths 为空」
- allowed_paths 用块式写法（键名换行后每项一行「  - 路径」），不要用流式方括号 [path]——块式与所有校验器一致最稳
- implementation / acceptance / constraints / verify 的每条列表项是 YAML plain scalar，避免以下特殊字符触发 ScannerError：
  - 冒号+空格（如代码签名 provider_id:str、queryUsage(id:string)）会被当映射键报 mapping values are not allowed here——去掉冒号后空格或改成中文描述
  - 花括号且内部含冒号或引号（如 JS 对象、JS 模板字面量）会报 expected block end——改用不含这些字符的中文描述
  - 引号不成对会报扫描错误
  - 注：goal 用 > 折叠标量可容忍花括号，goal 里写占位符不炸；只有上述 plain scalar 列表项需注意
- provides / expects_from 是可选字段：仅当跨 task 契约（一个 task 的接口/DTO/响应被另一个 task 消费）时才填，单 task 或无对外接口场景留空即可
- 填写后 plan-postcheck 会做硬对账：consumer 的每个 expects_from[provider].needs 字段必须在对应 provider 的 provides.fields 里，否则 plan 阶段阻断（不进入 execute）
- 不要把内部实现字段塞进 provides；只暴露给其他 task 的对外契约形状
- related_tests 是可选字段：当本 task 改动会导致既有测试断言失效时填（判据 = 是否有既有测试因本次改动而失败，而非源文件是否共享——覆盖改共享/被多 task 依赖源文件、改被测试精确匹配的值如 UI 文案/按钮文本/错误信息/常量/枚举字面量、改函数签名或返回结构等单文件场景），列出失效测试文件 + 为何失效。关键：这些测试路径必须同时写进本 task 的 allowed_paths（否则子代理被 allowed_paths 铁律锁死、改不了测试 → 退化成主代理事后兜底）；若测试由独立的测试 task 负责，则在该测试 task 的 allowed_paths 覆盖、本字段留空
- 如果存在 decisions.md，无法覆盖的 D-xxx@vN 在 constraints 中标注
- **保存前格式自检**（plan-postcheck 会硬校验，不通过到 Step 4 会批量报错，先在这里逐条自查）：
  - frontmatter 字段齐全：id、title、title_zh、author、created_at、priority、depends_on、blocks、allowed_paths、goal、implementation、acceptance、verify、constraints
  - allowed_paths 非空（至少一个真实源文件路径；回归类 task 无源码改动时填被验证的关键入口文件）
  - acceptance 与 verify 都在 frontmatter 内（漏写会被 plan-postcheck 报「缺少验收标准」/「缺少验证步骤」）
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
- frontmatter 包含：id、title、author、created_at、priority、depends_on、blocks、allowed_paths、goal、implementation、acceptance、verify、constraints
- 每个 task 总长度 20~40 行
- **一致性自查**：
  - allowed_paths 有无冲突
  - depends_on 与 plan.md Wave 分组是否一致
  - provides/expects_from 契约自洽：每个 expects_from[provider].needs 字段都在该 provider task 的 provides.fields 里（plan-postcheck 会硬校验，这里提前自查）
  - related_tests 判据 = 是否有既有测试因本次改动而失败（非「源文件是否共享」；UI 文案/常量/签名变更等单文件场景也算）；若填，测试路径必须都在本 task 或某 task 的 allowed_paths 内（否则子代理无权改 → execute 测试债、主代理事后兜底）
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

export const fixedPrefix = [stepClassify, stepGeneratePlan, stepReviewPlan]

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
  // 返回 [{name, num}]：保留 plan.md 原始编号，避免 buildCoordinatorStep 按 i+1 重编号与 execute 原始编号错位
  const tasks = []
  const lines = planContent.split('\n')
  for (const line of lines) {
    const m = line.match(/^[-*]\s*\[[ x]\]\s*task-(\d+):\s*(.+)/i)
    if (m) tasks.push({ num: String(m[1]).padStart(2, '0'), name: m[2].trim() })
  }
  return tasks
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
