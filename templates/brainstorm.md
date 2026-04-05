## 交互规范
**当需要用户从多个选项中做出选择时，必须使用 Claude Code 内置的 AskUserQuestion 工具，将选项以参数传入。**

## 核心约束（必须遵守）
- ❌ 写实现代码（任何语言）
- ❌ 修改任何源代码文件
- ❌ 安装依赖或执行构建命令
- ❌ 创建数据库迁移脚本
- ❌ 跳过 brainstorm 直接进入 execute/plan
- ❌ 在 checklist 未完成前开始写设计文档
- ❌ 编造不存在的表名、字段名、API 端点
- ❌ 一次性抛出多个问题（必须逐个等待回答）
- ❌ 用户确认前自行推进到 plan 或任何后续阶段

## 状态检查（必须先执行）

```bash
cat .sillyspec/STATE.md 2>/dev/null
```

- phase 为 `brainstorm` 或无 STATE.md → ✅ 继续
- 其他 phase → 提示用户当前阶段，建议先完成

## 进度恢复检查（必须先执行）

1. 读取 `.sillyspec/.runtime/progress.json`（使用 read 工具）
2. 如果文件存在且 `currentStage` 为 `brainstorm`：
   a. 按 resume-dialog.md 模板向用户展示恢复信息（见下方）
   b. 用户确认后，将 `resumeCount` +1，更新 `lastActiveAt`，写入 progress.json
   c. 将已完成步骤的结论作为「已确认的决策，无需重新讨论」注入上下文
   d. 从 `inProgressStep.id` 继续，**禁止回头重新讨论已完成步骤**
3. 如果文件不存在或 `currentStage` 不是 `brainstorm`：正常启动

### 恢复对话规则
- 首次恢复（resumeCount < 3）：友好欢迎，展示进度条和关键结论
- 频繁中断（resumeCount >= 3）：建议重新开始，但尊重用户选择
- 长时间中断（距 lastActiveAt > 24h）：先回顾上次聊了什么，再问是否继续
- 恢复时说「欢迎回来」而非「检测到中断」
- 参考模板：`.sillyspec/.runtime/templates/resume-dialog.md`

## 用户想法
$ARGUMENTS

---

## Checklist（必须按顺序完成，不允许跳步或并行）

- [ ] **Step 1** — 加载项目上下文 → 保存进度
- [ ] **Step 2** — 协作与复用检查（同名变更 + 全局模板）→ 保存进度
- [ ] **Step 3** — 原型/设计图分析（如有）→ 保存进度
- [ ] **Step 4** — 评估需求范围，复杂需求拆分子项目/阶段，生成 MASTER.md → 保存进度
- [ ] **Step 5** — 对话式探索（一次一个问题，2-3 轮内完成）→ 保存进度
- [ ] **Step 6** — 提出 2-3 个方案并推荐 → 保存进度
- [ ] **Step 7** — 分段展示设计，逐段确认 → 保存进度
- [ ] **Step 8** — 写设计文档并保存 → 保存进度
- [ ] **Step 9** — AI 自审（对照约束检查）→ 保存进度
- [ ] **Step 10** — 用户确认设计方案 → 保存进度
- [ ] **Step 11** — 输出 design.md → 保存进度
- [ ] **Step 12** — 更新 STATE.md → 保存进度
- [ ] **Step 13** — 保存最终进度

**终态：** brainstorm 完成后唯一出口是 `/sillyspec:plan`。不允许直接进入 execute 或任何代码操作。

---

## 各步骤详解

### Step 1: 加载项目上下文

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

**工作区模式：** AskUserQuestion 选子项目，**cd 到子项目目录执行**，加载子项目上下文 + 共享规范 + 工作区概览，设计文档保存到子项目 `.sillyspec/changes/`。修改在子项目目录中暂存。

**单项目模式：**
```bash
cat .sillyspec/{PROJECT,REQUIREMENTS,ROADMAP}.md 2>/dev/null
cat .sillyspec/codebase/{STRUCTURE,CONVENTIONS,ARCHITECTURE}.md 2>/dev/null
ls .sillyspec/changes/ 2>/dev/null | grep -v archive
ls .sillyspec/knowledge/ 2>/dev/null
```

### Step 2: 协作与复用检查

- **同名变更：** `ls .sillyspec/changes/ | grep -v archive` — 有相关变更则提示避免冲突
- **全局模板：** `ls ~/.sillyspec/templates/ 2>/dev/null` — 有匹配模板则建议复用

无匹配则跳过，不输出。

### Step 3: 原型/设计图分析（如有图片则必做）

**不要只看描述文字，图片包含布局、字段、交互等视觉信息。**

对每张图逐页分析（先主页面后子页面）：
1. **页面结构** — 识别搜索区、操作栏、表格、表单等区块
2. **表单字段** — 字段名、类型、必填、选项
3. **交互流程** — 页面跳转、按钮行为、流程线
4. **标注备注** — 业务规则、状态说明、权限说明

展示分析结果，问用户确认有无遗漏。

### Step 4: 大模块拆分

**满足以下任意 2 条就建议拆分：**
- 3+ 个可独立交付的功能模块
- 3+ 种角色有不同权限和视图
- 跨页面状态流转（审批流、多步表单）
- brainstorm 提问发现需求范围过大

确认拆分后生成 MASTER.md：

```bash
mkdir -p .sillyspec/changes/<变更名>/stages
```

`MASTER.md` 内容：概述、拆分计划表（阶段/范围/状态）、整体技术方向、阶段间依赖、原型分析摘要、经验记录。

```bash
git add .sillyspec/changes/<变更名>/MASTER.md
```

💡 大模块计划已暂存。准备好后用 `/sillyspec:commit` 提交。

提示用户：`/sillyspec:brainstorm <变更名>/stage-1`

**子阶段 brainstorm：** 读取 MASTER.md + 前序阶段经验 + 对应原型，设计文档保存到 `.sillyspec/changes/<变更名>/stages/<stage-N>/`。

### Step 5: 对话式探索

**核心规则：一次只问一个问题。**

1. 从最核心的问题开始（用户到底想做什么？）
2. 等待回答，根据信息量决定追问还是进入方案讨论
3. 探索顺序按需：目的 → 约束 → 边界 → 成功标准
4. **大多数 brainstorm 2-3 轮就应进入方案讨论**

探索阶段可使用项目已配置的 MCP 工具或 web search 调研技术方案和 API 用法，不要凭记忆写方案。检测可用工具：`cat .claude/mcp.json .cursor/mcp.json 2>/dev/null`

### Step 6: 提出 2-3 种方案

每种方案列优劣，给出推荐和理由。

### Step 7: 分段展示设计

简单项目几句话；复杂项目每段 200-300 字逐段确认。

### Step 8: 写设计文档

保存到 `.sillyspec/changes/<变更名>/design.md`：

```markdown
# [Feature Name] 设计

## 动机与范围
（为什么做、范围边界、成功标准）

## 功能需求
（需求场景、验收标准）
- [ ] 标准 1

## 技术方案
## 约束和假设
## 不在范围内
## 文件变更
## 代码风格参照
（参考已有源文件，标注返回值类型、异常类型、注解风格）
```

**注意：** 引用的表名必须来自 ARCHITECTURE.md 数据模型或明确标注"新增"。必须先读取 `.sillyspec/codebase/ARCHITECTURE.md`。

### Step 9: AI 自审（必须执行）

- 需求覆盖：是否完整覆盖 Step 5 确认的需求点？
- 约束一致性：技术方案是否与 ARCHITECTURE.md、CONVENTIONS.md 一致？
- 表名/字段真实性：是否来自真实 schema？
- 范围控制：是否包含不必要功能（YAGNI）？
- 验收标准：是否具体、可测试？
- 变更冲突：是否与 Step 2 检测到的已有变更冲突？
- 缺口：模糊表述（"适当的"/"必要时"等）是否已明确化
- 缺口：隐含假设（登录态、数据量、并发预期）是否已显式写出
- 缺口：边界场景（空数据、并发、服务不可用）是否已考虑

发现问题 → 修改文档，重新自审。不确定的标注「⚠️ 自审存疑」让用户判断。

### Step 10: 用户确认（⛔ 门禁）

展示设计方案，AskUserQuestion：确认 / 需要修改 / 推翻重来。

### Step 11: 输出技术方案

用户确认后，确认 design.md 已包含完整内容（动机、需求、方案、文件变更、代码风格参照）。如 Step 8 已保存则无需重复。

### Step 12: 更新 STATE.md

自动更新 `.sillyspec/STATE.md`（不存在则创建）：当前变更、阶段、下一步 `/sillyspec:plan`、关键决策、历史记录。不需要 Git 提交。

### Step 13: 保存最终进度

1. 更新 `.sillyspec/.runtime/progress.json`：
   - `stages.brainstorm.status` 设为 `completed`
   - 写入 `stageSummary`（2-3 句总结核心设计决策）
   - `currentStage` 更新为 `plan`
   - `checkpoint` 设为「brainstorm 完成，等待 plan」
2. Append `user-inputs.md` 最终记录
3. 告知用户：「brainstorm 完成 ✅ 进度已保存，下一步 /sillyspec:plan」

## 关键原则
- YAGNI — 无情砍掉不需要的功能
- 总是探索替代方案
- 设计可以很短，但必须存在
- "简单"的项目更需要设计——未检视的假设造成最大浪费

## 进度保存规则（⚠️ HARD-GATE）

**每步完成后必须执行，不允许跳过：**

1. 使用 write 工具更新 `.sillyspec/.runtime/progress.json`
2. 将当前步骤 ID 加入 `completedSteps`
3. 在 `summaries` 中写入本步结构化摘要：
   - `conclusion`（1-2句核心结论，必填）
   - `decisions`（用户确认的决策列表）
   - `rejectedAlternatives`（被否方案 + 简要理由）
   - `userMessages`（用户影响决策的原话）
   - `openQuestions`（遗留问题）
   - `keyEntities`（涉及的关键实体/概念）
4. 更新 `checkpoint`（一句话描述）
5. 刷新 `lastActiveAt`（ISO 格式）
6. `_version` +1
7. Append `.sillyspec/.runtime/user-inputs.md`（格式见 progress-format.md）
8. 对用户说：「✅ 第X步完成，进度已保存。」

**下步启动检查：** 进入下一步前，先确认 progress.json 的 currentStep 已更新。如果发现未保存，立即补保存。

## 多任务并行提醒

如果用户在 brainstorm 过程中临时要求执行 quick 任务：
- quick 任务不写入 progress.json，不影响当前 brainstorm 状态
- quick 完成后，brainstorm 从断点继续
- 告知用户：「quick 任务会独立执行，brainstorm 进度不受影响」
