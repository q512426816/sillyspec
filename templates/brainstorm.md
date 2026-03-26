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
sillyspec status --json
```

- `phase: "brainstorm"` → ✅ 继续
- 其他 phase → 提示用户当前阶段，建议先完成

## 用户想法
$ARGUMENTS

---

## Checklist（必须按顺序完成，不允许跳步或并行）

- [ ] **Step 1** — 加载项目上下文
- [ ] **Step 1.5** — 协作与复用检查（同名变更 + 全局模板）
- [ ] **Step 2** — 原型/设计图分析（如有）
- [ ] **Step 2b** — 评估需求范围，复杂需求拆分子项目/阶段，生成 MASTER.md
- [ ] **Step 3** — 对话式探索（一次一个问题，2-3 轮内完成）
- [ ] **Step 4** — 提出 2-3 个方案并推荐
- [ ] **Step 5** — 分段展示设计，逐段确认
- [ ] **Step 6** — 写设计文档并保存
- [ ] **Step 7** — AI 自审（对照约束检查）
- [ ] **Step 8** — 用户确认设计方案
- [ ] **Step 9** — 输出 design.md
- [ ] **Step 10** — 更新 STATE.md

**终态：** brainstorm 完成后唯一出口是 `/sillyspec:plan`。不允许直接进入 execute 或任何代码操作。

---

## 各步骤详解

### Step 1: 加载项目上下文

```bash
cat .sillyspec/config.yaml 2>/dev/null
```

**工作区模式：** AskUserQuestion 选子项目，**cd 到子项目目录执行**，加载子项目上下文 + 共享规范 + 工作区概览，设计文档保存到子项目 `.sillyspec/changes/`。git commit 在子项目目录执行。

**单项目模式：**
```bash
cat .sillyspec/{PROJECT,REQUIREMENTS,ROADMAP}.md 2>/dev/null
cat .sillyspec/codebase/{STRUCTURE,CONVENTIONS}.md 2>/dev/null
ls .sillyspec/changes/ 2>/dev/null | grep -v archive
ls .sillyspec/knowledge/ 2>/dev/null
```

### Step 1.5: 协作与复用检查

- **同名变更：** `ls .sillyspec/changes/ | grep -v archive` — 有相关变更则提示避免冲突
- **全局模板：** `ls ~/.sillyspec/templates/ 2>/dev/null` — 有匹配模板则建议复用

无匹配则跳过，不输出。

### Step 2: 原型/设计图分析（如有图片则必做）

**不要只看描述文字，图片包含布局、字段、交互等视觉信息。**

对每张图逐页分析（先主页面后子页面）：
1. **页面结构** — 识别搜索区、操作栏、表格、表单等区块
2. **表单字段** — 字段名、类型、必填、选项
3. **交互流程** — 页面跳转、按钮行为、流程线
4. **标注备注** — 业务规则、状态说明、权限说明

展示分析结果，问用户确认有无遗漏。

### Step 2b: 大模块拆分

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
git commit -m "docs: master change plan for <变更名>"
```

提示用户：`/sillyspec:brainstorm <变更名>/stage-1`

**子阶段 brainstorm：** 读取 MASTER.md + 前序阶段经验 + 对应原型，设计文档保存到 `.sillyspec/changes/<变更名>/stages/<stage-N>/`。

### Step 3: 对话式探索

**核心规则：一次只问一个问题。**

1. 从最核心的问题开始（用户到底想做什么？）
2. 等待回答，根据信息量决定追问还是进入方案讨论
3. 探索顺序按需：目的 → 约束 → 边界 → 成功标准
4. **大多数 brainstorm 2-3 轮就应进入方案讨论**

### Step 4: 提出 2-3 种方案

每种方案列优劣，给出推荐和理由。

### Step 5: 分段展示设计

简单项目几句话；复杂项目每段 200-300 字逐段确认。

### Step 6: 写设计文档

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

### Step 7: AI 自审（必须执行）

- 需求覆盖：是否完整覆盖 Step 3 确认的需求点？
- 约束一致性：技术方案是否与 ARCHITECTURE.md、CONVENTIONS.md 一致？
- 表名/字段真实性：是否来自真实 schema？
- 范围控制：是否包含不必要功能（YAGNI）？
- 验收标准：是否具体、可测试？
- 变更冲突：是否与 Step 1.5 检测到的已有变更冲突？

发现问题 → 修改文档，重新自审。不确定的标注「⚠️ 自审存疑」让用户判断。

### Step 8: 用户确认（⛔ 门禁）

```bash
sillyspec status --json
```

展示设计方案，AskUserQuestion：确认 / 需要修改 / 推翻重来。

### Step 9: 输出技术方案

用户确认后，确认 design.md 已包含完整内容（动机、需求、方案、文件变更、代码风格参照）。如 Step 6 已保存则无需重复。

### Step 10: 更新 STATE.md

自动更新 `.sillyspec/STATE.md`（不存在则创建）：当前变更、阶段、下一步 `/sillyspec:plan`、关键决策、历史记录。不需要 Git 提交。

## 关键原则
- YAGNI — 无情砍掉不需要的功能
- 总是探索替代方案
- 设计可以很短，但必须存在
- "简单"的项目更需要设计——未检视的假设造成最大浪费
