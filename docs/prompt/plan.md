# plan（实现计划）阶段提示词

> **源文件**：`src/stages/plan.js`
> **阶段定位**：编写实现计划 — 按 Wave 分组，每个任务独立文档
> **类型**：主流程阶段
> **全局角色 persona**：技术项目经理（`### 📋 你的角色：技术项目经理`）
> **全局护栏 _globalGuardrails**：无（仅有 CLI 统一铁律，见 [README](./README.md)）
> **步骤总数**：5（3 固定 LLM + 1 协调器 + 1 noAI postcheck；任务数为 0 时只有 3 固定 + postcheck，无协调器）

> 📌 本文档展示的是**每个 step 的 prompt 模板原文**。agent 实际收到的提示词 = `outputStep` 注入的 header + persona（仅首步）+ prompt 正文（占位符已替换）+ 完成契约（仅首步）+ 铁律 + `--wait/--done` 命令模板。注入细节见 [README.md](./README.md)。
>
> **动态阶段说明**：plan 的 steps 由 `buildPlanSteps(changeDir, planContent)` 运行时生成——3 个固定 LLM 步骤（复杂度分类 → 生成分级计划 → 审查计划）+ 1 个动态协调器步骤（生成 TaskCard，仅当 plan.md 含 checkbox task 时追加）+ 1 个 noAI postcheck 步骤（Wave 重排 + 一致性校验）。下方 Step 4 协调器步骤展示的是 **3-task 示例 plan（task-01/02/03）** 的生成结果，任务清单与 changeDir 实际随 plan.md 变化。详见文末「动态步骤说明」。

---

## Step 1/5：复杂度分类与上下文加载

**元数据**
- id：`classify`
- optional：false
- outputHint：plan 审查结果（self=清单 / independent=review.json 路径+verdict）
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{SPEC_ROOT}` → 常规模式 `cwd/.sillyspec`；平台模式 `specRoot`
- `<project>` → 当前项目名（`basename(cwd)` 或 db 项目名）

**提示词原文**

````markdown
在生成计划之前，先加载上下文并判定本次需求的复杂度等级（plan_level）。

### 操作
1. 运行 `sillyspec progress show`，确认 currentStage 为 "plan"
2. 读取项目总览 `{SPEC_ROOT}/docs/<project>/scan/PROJECT.md` + 各子项目上下文
3. 读取 proposal.md、design.md、requirements.md、tasks.md
4. 如果存在 decisions.md，必须读取并提取所有当前版本 D-xxx@vN 决策 ID
   - 如果发现 priority=P0/P1 且 status=unresolved/blocking 的决策，停止生成计划，要求先回到 brainstorm 的 Design Grill 修正
   - 如果发现 superseded 决策，只引用最新版本，不引用旧版本
5. 读取 CONVENTIONS.md、ARCHITECTURE.md（技术栈含在 ARCHITECTURE.md）
6. 读取 local.yaml 获取构建/测试命令
7. 读取 `{SPEC_ROOT}/docs/<project>/modules/_module-map.yaml`（不存在则跳过）
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

```
plan_level: none | light | full
reason: <一句话说明判定理由>
estimated_files: <N>
cross_module: true | false
has_schema_change: true | false
has_state_machine_change: true | false
needs_parallel_execution: true | false
needs_human_review: true | false
```

然后列出已加载的文件清单（含 decisions.md 当前版本/未决项状态、模块文档 + 模块依赖关系摘要）。

### 落盘锚点（必须执行）
把 plan_level 写进 plan.md frontmatter（`plan_level: <none|light|full>`）——上一步分类结果在本步落盘为持久锚点，后续步骤（及 context 压缩后的恢复）一律读 plan.md frontmatter，不依赖对话记忆传递。

分类完成后，继续进入下一步。
````

---

## Step 2/5：生成分级计划

**元数据**
- id：`generate_plan`
- optional：false
- outputHint：plan_level + 计划内容
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{SPEC_ROOT}` → 常规模式 `cwd/.sillyspec`；平台模式 `specRoot`
- `<change-name>` → 当前变更名（出现在底部路径示例 `{SPEC_ROOT}/changes/<change-name>/plan.md`）

**提示词原文**

````markdown
根据 plan.md frontmatter 的 plan_level 结果，按对应级别生成计划。

### 操作
1. 读取 plan.md frontmatter 的 `plan_level:` 字段（上一步已落盘为持久锚点；文件不存在或无该字段时回退读上一步输出的分类结果）
2. 读取 tasks.md 和 design.md 了解需求范围
3. 按 plan_level 选择对应模板输出
4. **写回任务清单**：把展开后的任务清单写回 tasks.md（checkbox 行 `- [ ] task-XX: 一句话任务名`，可附 `[model:xxx]`/`(depends_on: task-01,02)` 行内标注）。**写回规则（D-002@v1）**：保留 frontmatter/中文标题/所有非 task-XX 行（quick 挂载的 ql-xxx 勾选行、注记等逐行保留），仅重写 task-XX checkbox 行集合——防摧毁 quick 挂载条目
5. 保存 plan.md（审查在下一步"审查计划"独立进行，不在本步自审——避免生成与自审同一次输出）；frontmatter 保留 plan_level 字段不删。**plan.md Wave 段下任务一律纯 ID 引用行**（`- task-XX`，不重抄任务名——任务名唯一真相在 tasks.md，重抄即双写漂移）

---

#### plan_level = none
生成最小 plan.md（占位文件，保持流程兼容），不生成完整蓝图。格式：
```markdown
---
plan_level: none
---

# 计划跳过

## 原因
<一句话说明判定理由>

## 建议直接 execute
直接进入 execute 阶段完成最小任务（任务清单见 tasks.md）。

## 验收
- 修改范围符合用户需求
- 不引入额外无关变更
- 必要测试或检查通过
```
同时把最小任务写入 tasks.md：`- [ ] task-01: 按用户需求完成小范围明确修改`（同样遵守写回规则）。
**注意：** 任务 checkbox 只在 tasks.md（`- [ ] task-XX:` 格式，execute 阶段从 tasks.md 解析任务、按 plan.md Wave 引用分组）。

---

#### plan_level = light
生成轻量 plan.md，保存到变更目录。只包含以下四部分：

```markdown
---
plan_level: light
---

# 轻量计划（Light Plan）：<需求简述>

## 来源
直接引用 brainstorm 结论或用户原始需求，不重新扩写。

## 范围
- 涉及的文件/模块清单

## 验收
- 具体可验证的验收条目

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | AC-01 |
```

light 计划的约束：
- **禁止**生成 Mermaid 图
- **禁止**估时
- **禁止**泛泛风险分析（如"需要充分测试"）
- **禁止**放实现细节（函数签名、代码示例）
- 来源/目标直接引用已有文档，不重新生成
- 如果存在 decisions.md，所有当前版本 D-xxx@vN 必须在 Tasks 或覆盖矩阵中出现（CLI 只校验 D-xxx@vN ID 字面出现在 plan.md，warning 不阻断；矩阵结构供人类追溯，CLI 不校验 D→FR→task 映射完整性）
- 如果存在 P0/P1 unresolved blocker，不生成 plan.md
- 任务清单（tasks.md）控制在 10 条以内
- 任务名使用 tasks.md checkbox 格式（`- [ ] task-XX:`），plan.md 不放任务行

---

#### plan_level = full
生成完整 plan.md，保存到变更目录。格式如下：

```markdown
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
- task-01
- task-02

## Wave 2（依赖 Wave 1）
- task-03

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
```

full 计划的约束：
- **禁止**估时（任务总表不含估时列）
- **禁止**泛泛风险分析（"需要充分测试"类废话转为具体验收条目）
- Mermaid 依赖关系图**仅当依赖关系非平凡时生成**（线性依赖或全并行时不生成）
- **Wave 段 ID 引用行必须保留**（`- task-XX` 纯 ID、无 checkbox 无任务名——机器解析依赖；任务名唯一真相在 tasks.md，plan.md 重抄即双写漂移）
- plan.md 包含 Wave 分组 + 任务总表 + 关键路径 + 全局验收标准，**不放实现细节**
- 如果存在 decisions.md，plan.md 建议包含当前版本 D-xxx@vN/FR-xxx 覆盖矩阵（CLI 只校验 D-xxx@vN/FR-xxx ID 字面出现在 plan.md，warning 不阻断；矩阵的 D→FR→task 映射完整性供人类追溯，CLI 不校验——勿以为画了矩阵就被结构校验）
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
3. 读取 plan.md frontmatter 的 `plan_level:` 字段（持久锚点；缺失时回退上一步输出）
4. 按对应级别模板生成内容
5. 保存到变更目录下的 plan.md（路径格式：`{SPEC_ROOT}/changes/<change-name>/plan.md`，其中 <change-name> 是变更目录名，直接使用，不加子目录。正确路径示例：`{SPEC_ROOT}/changes/2026-05-28-agent-log-streaming/plan.md`）
6. 写回 tasks.md（本步操作 4 的写回规则：仅重写 task-XX checkbox 行集合，保留非 task-XX 行）
**plan_level 为 none 时生成最小 plan.md（占位），不生成完整蓝图。**

---

### 输出
plan_level + 计划内容（审查在下一步独立进行）
````

---

## Step 3/5：审查计划

**元数据**
- id：`review_plan`
- optional：false
- outputHint：plan 审查结果（self=清单 / independent=review.json 路径+verdict）
- 等待配置：
  - conditionalWait：true
  - waitReason：等待用户确认计划后进入执行
  - waitOptions：`确认，进入执行` / `需要调整`

**本步出现的运行时占位符**
- `{SPEC_ROOT}` → 常规模式 `cwd/.sillyspec`；平台模式 `specRoot`
- `{REVIEW_TIER}` → 审查分级：`self`（当前 agent 自审）或 `independent`（强制独立子代理 + review.json），由 `review-tier.js` 的 `classifyReviewTier({planLevel, designPath})` 按 plan_level / 变更文件数判定
- `{REVIEW_TIER_REASON}` → 分级理由文案（如 `变更文件 3 ≤ 3` 或 `plan_level=none...`）
- `{REVIEW_JSON_CONTRACT}` → `stage-review.js` 的 `renderReviewJsonContract()` 产出的 review.json 产物契约 markdown（schema + 完整示例 + docHash 算法，主审查文档为 plan.md）

> 注：prompt 正文中的 `<change>`（出现在 `{SPEC_ROOT}/changes/<change>/plan.md`）是源码里的内联占位文案，运行时不经全局 `<xxx>` 替换器，CLI 注入时保留字面，由 agent 自行解读为当前变更名。

**提示词原文**

````markdown
对上一步生成的 plan.md 做审查。生成与审查分离——不在生成 plan 的同一上下文里自审，避免确认偏差。

### 执行前确认门（plan_level=full 时）
plan.md 审查通过后、进入 execute 前，若 plan_level=full（跨模块/大变更），必须先向用户展示计划摘要并等待确认，不要让 AI 默认共识擅自开工：
- 展示：Wave 分组 + task 总数 + 关键 allowed_paths 边界 + 依赖说明（一两屏内，不贴全文）
- 调用：`sillyspec run plan --wait --reason "等待用户确认计划" --options "确认，进入执行,需要调整" --output "计划摘要"`
- 用户确认后再 --done；plan_level=none/light（小变更）无需等待，正常完成即可

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

### 生成 module-impact.md 首版（scale≠small 时）
计划审查通过后，顺带生成 module-impact.md 首版（本次变更的模块影响分析，供 execute/verify 阶段更新、archive 阶段终审）。scale=small 不生成（small 走 quick，module-impact 对 quick 无用）。

输入（此时 TaskCard/allowed_paths 尚未生成——在下一步「生成 TaskCard」才产出，故用以下两项作输入，粒度与 archive 现状一致）：
- design.md 的「文件变更清单」（本次计划改哪些源码文件）
- plan.md 的任务列表（每个 task 改的范围）

步骤（module-impact 的生成口径与 archive 终审一致）：
1. 读 {SPEC_ROOT}/docs/<project>/modules/_module-map.yaml（模块→文件路径映射）。**不存在 → 降级**：生成只含 unmapped 部分的 module-impact.md + 提示「建议运行 scan 生成模块映射」，不阻断
2. 对照 design 文件变更清单 + plan 任务列表，逐文件匹配所属模块（命中的归 mapped，未命中的归「未匹配文件」章节）
3. 落盘 {SPEC_ROOT}/changes/<change>/module-impact.md，**两个章节标题逐字固定**（archive-impact.yaml contains_sections 机械校验，写成「影响矩阵」等变体会被 archive 硬拦返工）：
   - 「## 模块影响矩阵」：模块 × 影响类型[新增/修改/删除/依赖变更] × 说明
   - 「## 未匹配文件」：unmatched 文件 × 处置说明（无未匹配文件也保留空章节，写「无」）
4. 首行标题必须用中文：# 模块影响分析（Module Impact）— <变更简述>
5. **必须含「更新结果」表骨架**（本表是 verify/archive 死信门控的收口目标——CLI 硬校验表内无 pending/待办行，漏写此表则 agent 只能从 gate 报错反推格式）：
   ```markdown
   ## 更新结果

   | 目标 | 操作 | 状态 |
   |------|------|------|
   | `modules/<id>.md` | 更新<模块名>模块卡（本次变更涉及） | pending |
   | `_module-map.yaml` | 无变化（未增删模块） | skipped |
   ```
   规则：每个受影响模块文档一行，状态列初始化 pending；无变化的行直接写 skipped。execute/verify 完成文档同步后把对应行回填 done；确定不同步的行改 skipped 并在操作列写明原因。**末列是状态列**（done/skipped/pending），不要在表尾追加其他列。

execute/verify 阶段会按实际代码变更更新此文档；archive 阶段会最终确认它。

### 输出
- tier=self：审查清单结果（每条状态 + 偏差说明）
- tier=independent：子代理产出的 review.json 路径 + verdict 摘要
- scale≠small：附 module-impact.md 路径 + 影响摘要
````

---

## Step 4/5：生成 TaskCard（子代理按 batch 并行）

**元数据**
- id：`generate_blueprints`
- optional：false
- outputHint：TaskCard 生成结果
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符与 include 指令**
- `<now-datetime>` → `YYYY-MM-DD HH:MM:SS`（执行时刻）
- `<git-user>` → `git config user.name`（失败为 `unknown`）
- `{{include: taskcard-rules}}` → include 指令：`resolvePromptIncludes` 在占位符替换前，把仓库根 `templates/prompts/taskcard-rules.md` 拉进 prompt 正文（TaskCard 格式规则 + 保存前自检，batch 子代理 prompt 展开后相同）

**示例值（来自 3-task 示例输入，实际随 plan.md 任务列表变化）**
- 任务清单：task-01「添加用户创建接口（覆盖：FR-01, D-001@v1）」、task-02「添加角色创建接口（覆盖：FR-02）」、task-03「用户创建接口联调」——由 `buildPlanSteps(changeDir, planContent)` 从 plan.md 的 checkbox 任务解析后注入。
- changeDir：`C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\changes\2026-05-13-demo-change`——示例变更目录，实际取自当前变更路径。
- 下方展示**批量 TaskCard 子代理 prompt**：主 agent 按「同一 Wave + 同一模块/相近能力 + 无跨 batch 强依赖」把 task 分成 2~4 个一组的 batch，每个 batch 启动一个子代理，一次生成该 batch 内全部 task-N.md。本示例为 3-task 结果；实际任务数、任务清单、changeDir、batch 划分随当前变更的 plan.md 变化。

**提示词原文**

````markdown
为 plan.md 中的每个任务生成紧凑 TaskCard。

⚠️ 生成卡片前先确认 plan.md 已满足（否则下一步 postcheck 会硬拦，导致返工重编号/重分 Wave）：
- **共享文件须分 Wave**：若多个 task 的 allowed_path 含同一文件，plan.md 必须把它们分到不同「## Wave N」（同 Wave 共享文件会被 execute 强制并行，子代理互相覆盖；postcheck 拦同 Wave 共享）
- **task id 从 1 连续**：task-01、task-02、task-03… 不能跳号或重号（postcheck 校验 id 连续性，gap 会拦）
这两条是跨 task 全局约束，子代理只写单卡看不到全局——你（主 agent）分派子代理前必须先在 plan.md 里确认 Wave 划分与编号正确。

## 任务清单
- task-01: 添加用户创建接口（覆盖：FR-01, D-001@v1）
- task-02: 添加角色创建接口（覆盖：FR-02）
- task-03: 用户创建接口联调

## 时间和用户
当前时间：<now-datetime>
当前用户：<git-user>

## 执行方式（必须严格遵守）

**你必须使用 Agent tool 启动子代理来写卡片，不要自己写。**

1. 确认 `C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\changes\2026-05-13-demo-change/tasks/` 目录存在（不存在则创建）
2. **按 batch 分派子代理（减少总子代理数量，而不是一个 task 一个子代理）：**
   - 把任务按「同一 Wave + 同一模块/相近能力 + 无跨 batch 强依赖」原则分组
   - **每个 batch 包含 2~4 个 task**；Wave 内任务数 ≤4 时整个 Wave 可作为一个 batch
   - 有提供/消费契约的 task 尽量放到同一 batch（子代理能同时看到 consumer 与 provider，避免契约字段漏配）
   - 跨 Wave 依赖的 task 不要放在同一 batch（子代理只需读 plan.md，但 batch 内 task 的 allowed_paths 不应互相阻塞）
3. 为每个 batch 启动一个独立子代理（Agent tool），可并行启动多个 batch
4. 每个子代理使用下方「批量 TaskCard 子代理 prompt」，一次生成该 batch 的全部 task-N.md
5. 等待所有 batch 子代理完成
6. 验证每个 task-N.md 文件已生成且非空

> 设计意图：plan.md 里 task 数可以较多（能力拆分完整），但 TaskCard 生成阶段要合理合并，避免子代理数量随 task 数线性爆炸。一个子代理生成 2~4 张卡片与生成 1 张卡片的 token/时间成本接近，却能显著减少协调开销。

### 批量 TaskCard 子代理 prompt
```
你是一个专注的 TaskCard 生成器。你的任务是为指定 batch 生成全部 TaskCard。

## 输入
- 变更目录：C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\changes\2026-05-13-demo-change
- 当前时间：<now-datetime>（frontmatter 的 created_at 使用此值）
- 当前用户：<git-user>（frontmatter 的 author 使用此值）
- 本 batch 任务列表：
  <由主 agent 注入：task-01: 名称 / task-02: 名称 / ...>

## 操作
1. 读取 C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\changes\2026-05-13-demo-change/design.md 和 C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\changes\2026-05-13-demo-change/plan.md 了解整体上下文
2. 读取本 batch 涉及的相关源文件
3. 为 batch 中的**每一个 task 独立生成**一个 task-N.md 文件
4. 每个文件使用如下模板（把 <task-id> / <task-name> 替换为具体编号和名称）：

---
id: <task-id>
title: <task-name>
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

{{include: taskcard-rules}}

## 约束
- 每个 task 20~40 行；禁止在 TaskCard 里写实现细节之外的冗长设计
- 同 batch 内 task 的 allowed_paths 不要互相冲突
- 若 task 之间有 provides/expects_from 契约，同 batch 生成时必须字段对齐
- 只生成本 batch 声明的任务，不要多写或少写
- 不要在 TaskCard 里泄露 plan.md 中未出现的实现假设

## 完成标志
- 本 batch 的每个 task-N.md 都已写入 C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\changes\2026-05-13-demo-change/tasks/
- 每个文件非空且 frontmatter 完整
```

## 验收（生成后自查，不另开步骤）
- 每个 task-N.md 文件存在且非空
- 所有 task 都被某个 batch 覆盖、无遗漏、无重复
- frontmatter 字段分两组对照（与 plan-postcheck / taskcard-rules.md 同源，三处清单以此为准）：
  - **硬校验 9 字段**（缺失 plan-postcheck 直接报错阻断）：id、title、title_zh、allowed_paths、goal、implementation、acceptance、verify、constraints
  - **规范约定 5 字段**（应填但缺失只影响规范性，不阻断）：author、created_at、priority、depends_on、blocks
- 每个 task 总长度 20~40 行
- **一致性自查**：
  - allowed_paths 有无冲突
  - depends_on 与 plan.md Wave 分组是否一致
  - provides/expects_from 契约自洽：每个 expects_from[provider].needs 字段都在该 provider task 的 provides.fields 里（plan-postcheck 会硬校验，这里提前自查）
  - related_tests 判据 = 是否有既有测试因本次改动而失败（非「源文件是否共享」；UI 文案/常量/签名变更等单文件场景也算）；若填，测试路径必须都在本 task 或某 task 的 allowed_paths 内（否则子代理无权改 → execute 测试债、主代理事后兜底）
  - 如发现矛盾，列出问题清单，不要自动修复
````

---

## Step 5/5：Wave 重排与可行性校验

**元数据**
- id：`postcheck`
- optional：false
- outputHint：Wave 重排 + 校验结果
- noAI：true
- _cliAction：`planPostcheck`
- 等待配置：无（CLI 内部执行完毕后自动推进阶段）

**本步出现的运行时占位符**
- 无（noAI 步骤，无 prompt 注入）

**提示词原文**

无 prompt（noAI 步骤，CLI 内部执行 Wave 重排 + 一致性校验，逻辑见 `src/stages/plan-postcheck.js`）。

---

## 动态步骤说明

plan 是**动态阶段**，steps 由 `src/stages/plan.js` 的 `buildPlanSteps(changeDir, planContent)` 在运行时生成，结构如下：

- **3 个固定 LLM 前置步骤**（始终存在）：
  - Step 1 `classify`（复杂度分类与上下文加载）— 加载上下文，按规则判定 `plan_level`（none / light / full），输出分类结果。
  - Step 2 `generate_plan`（生成分级计划）— 按 `plan_level` 选择对应模板（none 占位 / light 轻量 / full 完整 Wave 分组），写入 `plan.md`。生成与下一步审查分离，避免同上下文自审。
  - Step 3 `review_plan`（审查计划）— 按 `{REVIEW_TIER}` 分级审查：`self` 由当前 agent 直接核对清单；`independent` 用 Agent tool 启动独立子代理对照审查清单并产出 `review.json`（`{REVIEW_JSON_CONTRACT}` 注入产物契约）。

- **1 个动态协调器步骤**（仅当 plan.md 含 checkbox task 时追加）：
  - Step 4 `generate_blueprints`（生成 TaskCard 子代理按 batch 并行）— 由 `buildCoordinatorStep(changeDir, taskNames)` 生成。`buildPlanSteps` 从 `planContent` 解析出 `- [ ] task-XX:` 行得到任务清单；主 agent 按「同一 Wave + 同一模块/相近能力 + 无跨 batch 强依赖」把 task 分成 2~4 个一组的 batch，每个 batch 启动一个独立子代理，一次生成该 batch 内全部 `tasks/task-NN.md`。本目录展示的是 **3-task 示例**（task-01/02/03）+ 示例 changeDir（`C:\Users\qinyi\IdeaProjects\sillyspec\.sillyspec\changes\2026-05-13-demo-change`）的生成结果；实际任务清单、任务数、changeDir、batch 划分随当前变更的 plan.md 变化。任务数为 0 时本步骤不追加，整阶段退化为「3 固定 + postcheck」共 4 步。

- **1 个 noAI postcheck 步骤**（始终存在）：
  - Step 5 `postcheck`（Wave 重排与可行性校验）— 由 `buildPostcheckStep()` 生成，`noAI: true`、`_cliAction: 'planPostcheck'`、prompt 为空字符串。CLI 在 `--done` 时直接执行 `src/stages/plan-postcheck.js` 的 Wave 重排与一致性校验（含 `provides` / `expects_from` 跨 task 契约硬对账、allowed_paths 文件覆盖检查等），不调用 LLM，无 prompt 注入。

> 与 [README](./README.md) 「动态阶段说明 / plan」小节一致；任务数为 0 时不含协调器步骤，其余结构不变。

---

## 自检清单

- [x] 步骤数 == `_extracted.json` 的 `stepsCount`（5）
- [x] 每个 prompt 与 `_extracted.json` 的 `plan.steps[].prompt` 逐字一致
- [x] 占位符全部保留字面（`{SPEC_ROOT}` / `<project>` / `<change-name>` / `{REVIEW_TIER}` / `{REVIEW_TIER_REASON}` / `{REVIEW_JSON_CONTRACT}` / `<now-datetime>` / `<git-user>` / `<change>`）
- [x] prompt 用 4 反引号包裹，内部 3 反引号代码块未被破坏
- [x] 元数据字段与 JSON step 对象一致（id / optional / outputHint / noAI / _cliAction）
- [x] 动态阶段有「动态步骤说明」小节
- [x] Step 4 协调器 prompt 完整（batch 模式，含 3-task 示例 + 批量 TaskCard 子代理 prompt 模板）
- [x] Step 5 postcheck 标注 noAI（无 prompt，逻辑见 `src/stages/plan-postcheck.js`）
