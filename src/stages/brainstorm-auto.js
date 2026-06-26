/**
 * brainstorm-auto.js — auto/full 模式使用的 brainstorm 步骤定义
 *
 * 与 brainstorm.js 的区别：
 * 1. artifact-first：直接写文件，对话只输出摘要
 * 2. 自动决策：基于 AC-001~AC-010 checklist，不频繁请示
 * 3. next-action.json：结构化产物，驱动下游推进
 * 4. 只有 blocking questions 才 wait 用户
 * 5. 步骤从 ~13 步精简为 4 步
 */

export const definition = {
  name: 'brainstorm',
  title: '头脑风暴（自动模式）',
  description: '探索需求、分析技术方案、识别风险 — artifact-first，自动决策优先',

  steps: [
    {
      name: '状态检查与上下文加载',
      prompt: `检查状态、加载项目上下文、匹配模块。

### 操作
1. 运行 \`sillyspec progress show\`，确认 currentStage 为 "brainstorm"
2. 如果未初始化，提示先运行 sillyspec init
3. **检查变更名称**：如果当前变更名是自动生成的（如 \`2026-06-02-new-change\`），直接重命名为有意义名称，然后运行 \`sillyspec change-rename <旧名> <新名>\`

### 加载上下文
4. 读取 CODEBASE-OVERVIEW.md + 共享规范 + 子项目上下文
5. 加载项目信息：\`cat .sillyspec/projects/*.yaml 2>/dev/null\`
6. 加载本地配置：\`cat .sillyspec/local.yaml 2>/dev/null\`
7. 棕地项目：读取 scan 下的 STRUCTURE.md、CONVENTIONS.md、ARCHITECTURE.md
8. 加载模块索引：读取 \`.sillyspec/docs/<project>/modules/_module-map.yaml\`（如存在）
9. 查看进行中的变更：\`ls .sillyspec/changes/ | grep -v archive\`
10. 检查同名变更或可复用模板

### 模块匹配
根据用户描述的需求关键词，匹配相关模块（用 _module-map.yaml 的 tags/aliases/paths）。

### 子项目判定
- 单项目：直接确认
- 多项目且用户已指定：直接确认
- 多项目且用户未指定：列出项目列表，需要用户确认

### 如果有用户提供的原型/截图
分析提取：页面结构、表单字段、交互流程、业务规则。

### 输出
状态摘要 + 项目现状理解（3-5 句）+ 涉及模块列表 + 子项目 + 原型分析（如有）

### 注意
- 以 CLI 返回为准，不要自行推断阶段
- 不要用 mv 命令重命名变更目录，必须用 \`sillyspec change-rename\``,
      outputHint: '状态摘要 + 上下文 + 模块匹配',
      optional: false
    },
    {
      name: '需求分析与方案设计',
      requiresWait: true,
      repeatableWait: true,
      maxWaitRounds: 5,
      waitReason: '等待用户回答需求问题',
      waitOptions: ['回答见--answer', '信息够了，进入设计'],
      prompt: `分析需求，必要时追问，然后设计方案。

### 操作

#### A. 需求评估
1. 汇总上一步加载的上下文和用户需求
2. 判断需求是否清晰：
   - 目标明确、范围清楚、无歧义 → 跳过追问，直接进入方案设计
   - 有歧义或不清楚 → 挑**一个最关键的**问题追问

#### B. 追问规则（只在需要时）
- 一次只问一个问题，不要一次性列出多个问题
- 能从代码/文档确认的不要问用户
- 多选题优于开放式问题
- YAGNI — 砍掉不需要的功能
- 2-3 轮问答就应进入方案设计
- 优先追问影响架构/数据/接口的问题，实现细节不要问

**如果需要追问：**调用 \`sillyspec run brainstorm --wait --reason "等待用户回答需求问题" --options "回答见--answer,信息够了,进入设计" --output "你的单个问题"\`

#### C. 复杂度评估（追问结束后或不需要追问时）
1. 判断是否需要拆分或走批量模式：
   - 3+ 个可独立交付的功能模块 → 建议拆分
   - 任务 > 10 且有重复模式 → 建议批量模式
   - 简单 CRUD → 不拆
2. 如果需要拆分/批量模式：暂停等用户确认
   - 调用：\`sillyspec run brainstorm --wait --reason "等待用户确认拆分方案" --options "同意拆分,不需要拆分,走批量模式" --output "拆分方案摘要"\`
3. 不需要拆分 → 继续

#### D. 方案设计（自动决策优先）
1. 基于需求理解和上下文，提出 1-3 种实现方案
2. **使用自动决策 checklist（AC-001~AC-010）判断是否需要用户选择：**

\`\`\`
AC-001: 未修改公共 API
AC-002: 未修改数据库 schema
AC-003: 未涉及鉴权/权限
AC-004: 未扩大 allowed_paths
AC-005: 未引入新外部依赖
AC-006: 未修改核心模块（workflow/daemon/session/lifecycle）
AC-007: 已有项目约定可复用
AC-008: 不影响向后兼容
AC-009: 不涉及数据迁移
AC-010: 单模块范围内可完成
\`\`\`

3. **自动决策判定：**
   - 只有一个明显合理方案 + checklist 全部 ✅ → **自动选择，标记 AUTO_DECIDED**
   - 有多个方案但影响不大（checklist 全部 ✅）→ **自动选推荐方案，标记 AUTO_DECIDED**
   - 有多个方案且 checklist 有 ❌（影响架构/数据/接口/权限/兼容性）→ **只有这一种情况才暂停等用户选择**

4. 如果需要用户选择方案：
   - 调用：\`sillyspec run brainstorm --wait --reason "等待用户选择方案" --options "方案A,方案B,方案C" --output "方案对比摘要"\`

#### E. Design Grill（轻量交叉审查）
对方案做快速交叉审查：
- 检查方案与 ARCHITECTURE.md / CONVENTIONS.md 的一致性
- 检查是否有术语歧义、边界遗漏
- 能自动解决的直接修正，只有需要业务判断的才问用户
- 跳过条件：单模块、无状态流转、< 3 个文件变更

### 输出
需求理解摘要 + 复杂度评估 + 方案决策（AUTO_DECIDED 或用户选择）

### 注意
- **不要自问自答。** 不要在自己输出中模拟用户回答然后说"需求已明确"
- checklist 判定结果必须在 decisions.md 中记录依据`,
      outputHint: '需求理解 + 方案决策',
      optional: false
    },
    {
      name: '生成设计产物',
      prompt: `将设计方案写入文件（artifact-first），不回显正文。

### 操作
1. 确保变更目录存在：\`mkdir -p .sillyspec/changes/<change-name>/brainstorm\`
2. **直接将设计方案写入文件，不要先在对话中输出完整内容再写文件。**

### 产物文件

#### design.md（必填，写入 \`brainstorm/design.md\`）
包含：背景、设计目标、非目标、总体方案、文件变更清单、接口定义、数据模型（如涉及）、兼容策略（brownfield）、风险登记、决策追踪。

#### decisions.md（必填，写入 \`brainstorm/decisions.md\`）
记录所有决策：
\`\`\`markdown
## D-001@v1: 决策短标题
- type: architecture | boundary | compatibility | ...
- priority: P0 | P1 | P2
- status: AUTO_DECIDED | NEEDS_REVIEW | USER_DECIDED
- source: user | code | docs
- question: 被解决的问题
- answer: 选择或结论
- checklist: AC-001 ✅, AC-007 ✅（AUTO_DECIDED 时必须列出）
- normalized_requirement: 可测试约束
- impacts: [FR-01, task-01]
- evidence: 代码/文档路径或用户回答轮次
\`\`\`

#### gaps.md（必填，写入 \`brainstorm/gaps.md\`）
记录已识别的缺口。status=BLOCKER 的缺口会在 plan-postcheck 中触发回退。

#### assumptions.md（必填，写入 \`brainstorm/assumptions.md\`）
记录隐含假设和验证方法。

#### next-action.json（必填，写入 \`brainstorm/next-action.json\`）
\`\`\`json
{
  "status": "ready_for_plan" | "waiting_for_user",
  "decision_level": "high" | "medium" | "low",
  "has_blocking_questions": true | false,
  "blocking_reasons": [],
  "questions": [],
  "auto_decisions": [
    { "id": "D-001", "decision": "方案描述", "reason": "AC-007 ✅" }
  ]
}
\`\`\`

### 自审
对 design.md 执行自审（需求覆盖、文件变更清单具体性、验收标准可测试、非目标清晰、兼容策略）。发现问题直接修改文件。

### 如果有 blocking questions
将问题写入 next-action.json.questions，在对话中输出问题列表和推荐选项，然后 --wait。

### 输出（artifact-first）
只输出摘要：
\`\`\`
已生成设计产物（5 个文件）：
- brainstorm/design.md — 采用 xxx 方案，涉及 N 个文件变更
- brainstorm/decisions.md — M 个决策，K 个 AUTO_DECIDED
- brainstorm/gaps.md — J 个缺口，0 个 BLOCKER
- brainstorm/assumptions.md — L 个假设
- brainstorm/next-action.json — ready_for_plan / waiting_for_user
\`\`\``,
      outputHint: '产物摘要',
      optional: false
    },
    {
      name: '生成规范文件',
      requiresWait: true,
      waitReason: '等待用户最终确认',
      waitOptions: ['确认', '需要修改', '推翻重来'],
      prompt: `生成 proposal.md / requirements.md / tasks.md，让用户确认。

### 操作
1. 基于 brainstorm/ 下的设计产物，生成规范文件（直接写文件）：
   - **proposal.md**：动机、关键问题、变更范围、不在范围内、成功标准
   - **requirements.md**：角色表 + FR 编号需求 + Given/When/Then + 非功能需求
   - **tasks.md**：任务列表（只列名称，细节在 plan 阶段展开）
2. 如果 brainstorm/decisions.md 有 AUTO_DECIDED 决策，在变更根目录也写一份 decisions.md
3. 所有规范文件头部包含 YAML frontmatter
4. \`git add .sillyspec/\` — 暂存规范文件（不要 commit）

### 输出（摘要）
规范文件路径列表（各一句话说明）

### 铁律
- **直接写文件，不在对话中输出完整内容**
- 暂停等待用户确认：\`sillyspec run brainstorm --wait --reason "等待用户最终确认" --options "确认,需要修改,推翻重来" --output "规范文件摘要"\`
- 禁止自动 commit
- 禁止在确认前推进到后续阶段`,
      outputHint: '规范文件摘要',
      optional: false
    }
  ]
}
