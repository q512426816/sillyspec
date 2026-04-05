# `sillyspec run` 命令设计方案

> 日期：2026-04-06
> 状态：设计阶段

## 1. 核心理念

**现状：** AI 读取整个 SKILL.md（200-600 行），全部塞进上下文，AI 自己决定流程步骤。

**目标：** CLI 成为流程引擎，AI 变成步骤执行器，每次只收到当前步骤的精简 prompt（10-30 行）。

**效果：** 上下文节省 80%+，流程标准化，进度可追踪。

## 2. 命令设计

### 用法

```
sillyspec run <stage>                    # 输出当前步骤 prompt
sillyspec run <stage> --done             # 标记当前步骤完成，输出下一步 prompt
sillyspec run <stage> --done --output "摘要"  # 标记完成 + 记录输出摘要
sillyspec run <stage> --skip             # 跳过当前步骤
sillyspec run <stage> --status           # 查看阶段状态（进度条）
sillyspec run <stage> --reset            # 重置阶段（所有步骤回到 pending）
```

### 参数

| 参数 | 说明 |
|---|---|
| `<stage>` | 阶段名：`brainstorm` / `propose` / `plan` / `execute` / `verify` |
| `--done` | 标记当前步骤完成，自动输出下一步 |
| `--output` | 配合 `--done`，记录步骤输出摘要 |
| `--skip` | 跳过当前步骤（标记 skipped） |
| `--status` | 显示阶段进度，不执行任何操作 |
| `--reset` | 重置阶段所有步骤为 pending |

### 退出码

- `0`：成功输出步骤 / 标记完成
- `1`：错误（阶段不存在、progress.json 格式错误等）
- `2`：阶段已完成（无待执行步骤）

## 3. 步骤定义格式

每个阶段一个 JS 文件，导出 `definition` 对象：

```js
// src/stages/brainstorm.js
export const definition = {
  name: 'brainstorm',
  title: '头脑风暴',
  description: '探索需求、分析技术方案、识别风险',
  steps: [
    {
      name: '状态检查',
      prompt: `...`,       // 10-30 行精简 prompt
      outputHint: '状态摘要', // 提示 AI 应输出什么
      optional: false        // 是否可跳过
    }
  ]
}
```

**步骤定义原则：**
- 每个 prompt 10-30 行，只包含当前步骤必需的信息
- 不重复阶段级信息（如"禁止写代码"只写一次，不每步重复）
- 不包含交互式流程图（CLI 已控制流程）
- 文件路径使用相对路径，由 CLI 在运行时解析
- 生成的每个文件头部必须包含 author（git 用户名）和 created_at（精确到秒），方便追溯

## 4. 五个阶段的完整步骤列表

### 4.1 brainstorm（10 步）

| # | 名称 | 可跳过 | 输出 |
|---|---|---|---|
| 1 | 状态检查 | 否 | 当前状态摘要 |
| 2 | 加载项目上下文 | 否 | 项目现状理解 |
| 3 | 协作与复用检查 | 是 | 已有变更和可用模板 |
| 4 | 原型/设计图分析 | 是 | 页面结构、字段、交互流程 |
| 5 | 需求范围评估 | 是 | 拆分方案（如需要）+ MASTER.md |
| 6 | 对话式探索 | 否 | 需求理解确认 |
| 7 | 提出 2-3 种方案 | 否 | 方案对比 + 推荐 |
| 8 | 分段展示设计 | 否 | 设计方案逐段确认 |
| 9 | 写设计文档并自审 | 否 | design.md 文件 |
| 10 | 用户确认并输出技术方案 | 否 | design.md 最终版 + Git 提交 |

#### 步骤 Prompt 定义

**Step 1/10: 状态检查**

```
检查 .sillyspec/.runtime/progress.json 确认当前状态。

### 操作
1. 运行 `sillyspec progress show`
2. 确认 currentStage 为 "brainstorm"
3. 如果有进行中的 brainstorm，提示选择继续或重新开始
4. 如果未初始化，提示先运行 sillyspec init

### 输出
当前状态摘要（1-2 句话）

### 注意
- 以 CLI 返回为准，不要自行推断阶段
- 如果阶段不对，输出正确提示并停止
```

**Step 2/10: 加载项目上下文**

```
加载项目现有上下文，理解代码结构和约定。

### 操作
1. 检查是否工作区模式：`ls .sillyspec/projects/*.yaml`
2. 工作区模式：加载 CODEBASE-OVERVIEW.md + 共享规范 + 子项目上下文
3. 单项目模式：加载 PROJECT.md、REQUIREMENTS.md、ROADMAP.md
4. 棕地项目：读取 docs/<project>/scan/ 下的 STRUCTURE.md、CONVENTIONS.md、ARCHITECTURE.md
5. 查看进行中的变更：`ls .sillyspec/changes/ | grep -v archive`

### 输出
项目现状理解摘要（3-5 句话，关键约定和架构决策）

### 注意
- 工作区模式下需要询问本次需求属于哪个子项目
- 棕地项目必须读取数据模型章节
```

**Step 3/10: 协作与复用检查**

```
检查是否有同名变更或可复用模板。

### 操作
1. 检查已有变更：`ls .sillyspec/changes/ | grep -v archive`
   - 有相关变更 → 提示用户，避免重复
2. 检查全局模板：`ls ~/.sillyspec/templates/`
   - 有匹配模板 → 询问是否基于模板
3. 无相关内容 → 跳过，不输出

### 输出
检测到的相关变更和可用模板（无则输出"无冲突，继续"）
```

**Step 4/10: 原型/设计图分析**

```
如果用户提供了截图、图片或 HTML 原型，分析提取结构。

### 操作
1. 识别图片中的页面结构（区域、组件、布局）
2. 提取表单字段（名称、类型、必填、选项）
3. 提取交互流程（页面跳转、按钮行为）
4. 提取标注和备注（业务规则、权限说明）
5. 展示分析结果，请用户确认遗漏

### 输出
页面结构树 + 字段列表 + 交互流程图

### 注意
- 没有原型则跳过此步骤
- 多页面时逐页分析，不要一次全部输出
- 图片信息 > 文字描述，不要忽略视觉信息
```

**Step 5/10: 需求范围评估**

```
评估需求复杂度，判断是否需要拆分。

### 操作
1. 根据分析结果判断复杂度
2. 满足以下任意 2 条建议拆分：
   - 3+ 个可独立交付的功能模块
   - 3+ 种角色有不同权限和视图
   - 跨页面状态流转（审批流、多步表单）
   - 模块间耦合度低可独立开发
3. 需要拆分 → 生成 MASTER.md，规划子阶段
4. 不需要拆分 → 继续

### 输出
拆分方案（如需要）或"无需拆分"确认

### 注意
- 简单 CRUD 不拆
- 拆分方案需用户确认
```

**Step 6/10: 对话式探索**

```
通过对话探索需求细节。

### 操作
1. 从最核心的一个问题开始（用户到底想要什么？）
2. 等待用户回答后再问下一个
3. 根据回答判断：信息够了 → 进入方案 / 需要追问 → 只问一个
4. 探索顺序（按需）：目的 → 约束 → 边界 → 成功标准

### 输出
需求理解摘要（用户确认的需求点列表）

### 铁律
- 一次只问一个问题
- 2-3 轮问答就应进入方案讨论
- 多选题优于开放式问题
- YAGNI — 砍掉不需要的功能
```

**Step 7/10: 提出 2-3 种方案**

```
基于需求理解，提出 2-3 种实现方案。

### 操作
1. 每种方案列出：核心思路、优势、劣势
2. 给出推荐方案和理由
3. 等待用户选择或调整

### 输出
方案对比表 + 推荐方案

### 注意
- 方案差异要实质性的，不要为了凑数
- 推荐理由要具体
```

**Step 8/10: 分段展示设计**

```
按复杂度分段展示设计方案，逐段确认。

### 操作
1. 简单项目：几句话整体描述
2. 复杂项目：每段 200-300 字，逐段展示
3. 每段展示后等待用户确认
4. 收集修改意见，调整设计

### 输出
用户确认的完整设计方案

### 注意
- 不要一次输出大段文字
- 逐段确认，确保用户跟上
```

**Step 9/10: 写设计文档并自审**

```
撰写 design 文档并进行 AI 自审。

### 操作
1. 将确认的设计写入 `.sillyspec/specs/YYYY-MM-DD-<topic>-design.md`
2. 自审检查：
   - 需求覆盖：是否完整覆盖 Step 6 确认的需求
   - 约束一致性：是否与 CONVENTIONS.md、ARCHITECTURE.md 一致
   - 真实性：表名/字段名来自真实 schema 或标注"新增"
   - YAGNI：是否包含不必要功能
   - 验收标准：是否具体可测试
3. 自审发现问题 → 修改后重新检查
4. 全部通过 → 进入下一步

### 输出
design.md 文件路径 + 自审结果

### 注意
- 自审不通过不要进入下一步
- 不确定的问题标注「⚠️ 自审存疑」
```

**Step 10/10: 用户确认并输出技术方案**

```
用户确认设计方案，生成最终技术方案。

### 操作
1. 展示 design.md 摘要给用户
2. 请用户选择：✅ 确认 / ✏️ 修改 / ❌ 推翻重来
3. 确认后：
   - 将技术方案写入 `.sillyspec/changes/<变更名>/design.md`
   - 包含：架构决策、文件变更清单、数据模型、API 设计、代码风格参照
   - Git 提交

### 输出
最终 design.md 路径 + Git commit hash

### 注意
- 必须等待用户明确确认
- 禁止在确认前推进到后续阶段
- 推翻重来回到 Step 6
```

---

### 4.2 propose（7 步）

| # | 名称 | 可跳过 | 输出 |
|---|---|---|---|
| 1 | 状态检查 | 否 | 当前状态摘要 |
| 2 | 加载上下文 | 否 | 规范文件列表 |
| 3 | 锚定确认 | 否 | 已加载文件确认 |
| 4 | 探索现有代码 | 否 | 影响范围分析 |
| 5 | 生成规范文件 | 否 | proposal.md + design.md + tasks.md + requirements.md |
| 6 | 自检门控 | 否 | 自检通过确认 |
| 7 | 展示并更新进度 | 否 | 用户审阅 + CLI 更新 |

#### 步骤 Prompt 定义

**Step 1/7: 状态检查**

```
检查当前状态，确认可以执行 propose。

### 操作
1. 运行 `sillyspec progress show`
2. 确认 currentStage 为 "propose"
3. 如果没有设计文档 → 提示先运行 brainstorm

### 输出
当前状态摘要
```

**Step 2/7: 加载上下文**

```
加载所有相关规范和代码库上下文。

### 操作
1. 检测工作区模式
2. 读取最新设计文档、需求文档、代码库约定
3. 如果是子阶段变更，读取 MASTER.md 和前序阶段设计

### 输出
已加载的文件列表
```

**Step 3/7: 锚定确认**

```
确认已读取的文件。

### 操作
1. 列出已读取的文件，标注存在/不存在
2. 格式：`[x] 文件名 — 说明` 或 `[ ] 文件名 — 不存在（正常）`

### 输出
文件加载确认清单

### 注意
- 文件不存在不是错误，正常标注即可
```

**Step 4/7: 探索现有代码**

```
理解相关模块的当前实现，识别影响范围。

### 操作
1. 根据设计文档中的文件变更清单，读取相关源码
2. 识别现有接口、方法签名、数据结构
3. 记录可能受影响的模块

### 输出
影响范围分析（涉及模块、需修改的文件、风险点）
```

**Step 5/7: 生成规范文件**

```
在 `.sillyspec/changes/<变更名>/` 下生成四个文件。

### 操作
1. 生成 proposal.md：动机、变更范围、不在范围内、成功标准
2. 生成 specs/requirements.md：功能需求、用户场景（Given/When/Then）、非功能需求
3. 生成 design.md：架构决策、文件变更清单、数据模型、API 设计、代码风格参照
4. 生成 tasks.md：任务列表（只列名称，不展开步骤）

### 输出
四个文件路径

### 注意
- 表名/字段名必须来自真实 schema 或标注"新增"
- 用户场景必须用 Given/When/Then 格式
- tasks.md 只列任务名，细节在 plan 阶段展开
```

**Step 6/7: 自检门控**

```
自检生成的规范文件。

### 操作
检查以下各项：
- [ ] proposal.md 有动机、变更范围、不在范围内、成功标准
- [ ] design.md 有文件变更清单表格
- [ ] requirements.md 有 Given/When/Then 用户场景
- [ ] tasks.md 每个 task 有文件路径

任何不通过 → 修正后重新检查。


### 输出
自检通过/不通过
```

**Step 7/7: 展示并更新进度**

```
展示规范给用户，更新进度。

### 操作
1. 展示 proposal.md 和 design.md 摘要

### 输出
展示结果 + 下一步命令
```

---

### 4.3 plan（7 步）

| # | 名称 | 可跳过 | 输出 |
|---|---|---|---|
| 1 | 状态检查 | 否 | 当前状态摘要 |
| 2 | 加载上下文 | 否 | 规范文件 + 代码库约定 |
| 3 | 锚定确认 | 否 | 已加载文件确认 |
| 4 | 逐任务展开 | 否 | 详细步骤（2-5 分钟粒度） |
| 5 | 标注执行顺序 | 否 | Wave 分组 + 依赖关系 |
| 6 | 自检门控 | 否 | 自检通过确认 |
| 7 | 保存并更新进度 | 否 | 计划文件 + CLI 更新 |

#### 步骤 Prompt 定义

**Step 1/7: 状态检查**

```
检查当前状态，确认可以执行 plan。

### 操作
1. 运行 `sillyspec progress show`
2. 确认 currentStage 为 "plan"

### 输出
当前状态摘要
```

**Step 2/7: 加载上下文**

```
加载所有规范文件和代码库上下文。

### 操作
1. 检测工作区模式
2. 读取 proposal.md、design.md、tasks.md、requirements.md
3. 读取 CONVENTIONS.md、ARCHITECTURE.md、STACK.md
4. 工作区模式：额外加载 CODEBASE-OVERVIEW.md + 各子项目上下文

### 输出
已加载的文件清单
```

**Step 3/7: 锚定确认**

```
确认已读取的文件。

### 操作
列出已读取的文件，标注存在/不存在。

### 输出
文件加载确认清单
```

**Step 4/7: 逐任务展开**

```
把 tasks.md 中每个 checkbox 展开为详细步骤。

### 操作
对每个 Task：
1. 标注精确文件路径（新建/修改/测试）
2. 每个步骤 2-5 分钟可完成
3. 包含完整可运行的代码示例
4. 包含验证命令和预期输出
5. 频繁 commit，每个任务独立提交
6. 引用已有代码的方法签名（从 CONVENTIONS.md 或源码获取）

### 输出
展开后的详细计划

### 注意
- 假设执行者是熟练开发者但对你项目零上下文
- 不要写"添加验证逻辑"这种模糊描述
- 要写"在 UserController.java 添加方法：public Result<UserVO> createUser(...)"
- 调用已有方法前必须 grep 确认存在
```

**Step 5/7: 标注执行顺序**

```
按依赖关系分组，标注执行顺序。

### 操作
1. 分析 Task 间依赖
2. 无依赖的 Task 归入同一 Wave（可并行）
3. 有依赖的 Task 按顺序排列

### 输出
Wave 分组列表 + 依赖说明

### 示例
Wave 1（并行）：Task 1 + Task 2
Wave 2（依赖 Wave 1）：Task 3
Wave 3（依赖 Wave 2）：Task 4
```

**Step 6/7: 自检门控**

```
自检计划质量。

### 操作
检查以下各项：
- [ ] 每个 task 有具体文件路径
- [ ] 每个 task 有验证命令和预期输出
- [ ] 已标注 Wave 和执行顺序
- [ ] plan 与 design.md 的文件变更清单一致



### 输出
自检通过/不通过
```

**Step 7/7: 保存并更新进度**

```
保存计划文件，更新进度。

### 操作
1. 保存到 `.sillyspec/plans/YYYY-MM-DD-<change-name>.md`

### 输出
计划文件路径 + 下一步命令
```

---

### 4.4 execute（动态步骤）

execute 阶段的步骤数量是**动态的**，取决于 plan 阶段生成的 Wave 数量。

**固定步骤（5 个）：**

| # | 名称 | 可跳过 | 输出 |
|---|---|---|---|
| 1 | 状态检查 | 否 | 当前状态 + 执行范围 |
| 2 | 加载上下文 | 否 | 计划 + 设计 + 代码库约定 |
| 3 | 确认执行范围 | 否 | Wave 分组 + 模型分配 + 确认模式 |
| 倒数第 2 | 知识库审阅 | 是 | 新知识条目 |
| 最后 1 | 完成确认 | 否 | 用户选择下一步 |

**动态步骤（N 个）：** 每个步骤对应一个 Wave，CLI 从 plan 文件中解析 Wave 数量动态生成。例如 plan 有 3 个 Wave，则 execute 有 5 + 3 = 8 步。

**CLI 动态构建 execute 步骤的逻辑：**

```js
function buildExecuteSteps(planFilePath) {
  const plan = readPlan(planFilePath)
  const waves = parseWaves(plan) // 从 plan 中解析 Wave 分组

  const fixedPrefix = [
    { name: '状态检查', ... },
    { name: '加载上下文', ... },
    { name: '确认执行范围', ... }
  ]

  const waveSteps = waves.map((wave, i) => ({
    name: `Wave ${i + 1} 执行`,
    prompt: buildWavePrompt(wave, i + 1),
    outputHint: `Wave ${i + 1} 执行结果`,
    optional: false
  }))

  const fixedSuffix = [
    { name: '知识库审阅', ... },
    { name: '完成确认', ... }
  ]

  return [...fixedPrefix, ...waveSteps, ...fixedSuffix]
}
```

#### 固定步骤 Prompt 定义

**Step 1: 状态检查**

```
检查当前状态，确认可以执行 execute。

### 操作
1. 运行 `sillyspec progress show`
2. 确认 currentStage 为 execute
3. 如果不是 → 检查是否有未完成的 tasks.md
4. 确认执行范围（$ARGUMENTS 指定 wave/task 或全部）

### 输出
当前状态 + 执行范围确认
```

**Step 2: 加载上下文**

```
加载计划、设计和代码库上下文。

### 操作
1. 读取 tasks.md（执行计划）
2. 读取 design.md（技术方案）
3. 读取 CONVENTIONS.md、ARCHITECTURE.md
4. 读取 local.yaml（构建命令）
5. 工作区模式：额外加载 CODEBASE-OVERVIEW.md

### 输出
已加载的上下文摘要
```

**Step 3: 确认执行范围**

```
解析任务，确认执行范围和确认模式。

### 操作
1. 从 plan 中解析 Wave 分组和任务列表
2. 根据任务描述关键词为每个 Task 建议模型：
   - 架构/复杂推理 → 最强模型
   - 常规实现 → 中等模型
   - 简单修改 → 快速模型
   - 文档/写作 → 写作模型
3. 用户在 tasks.md 中的 [model:xxx] 标签优先
4. 询问用户执行确认频率：
   - 每个 Wave 确认 — 每个 Wave 完成后展示结果
   - AI 自主判断 — BLOCKED 或计划外变更时才询问
   - 全自动 — 全部自动执行
5. 查询知识库：读取 `.sillyspec/knowledge/INDEX.md`，根据 Task 关键词匹配

### 输出
Wave 分组 + 模型分配 + 确认模式 + 知识库匹配结果

### 注意
- 默认推荐"每个 Wave 确认"
```

#### 动态步骤 Prompt 定义（每个 Wave 一个步骤）

**Wave N 执行步骤的 Prompt 模板：**

```js
function buildWavePrompt(wave, waveIndex) {
  return `## Wave ${waveIndex}: 执行以下任务

### 本 Wave 任务
${wave.tasks.map(t => `- [ ] ${t.name} (${t.file})`).join('\n')}

### 执行要求
1. 按任务顺序执行，同一 Wave 内任务可并行
2. 铁律：先读后写、grep 确认方法存在、不编造、TDD
3. 每个任务完成后：
   - 勾选 tasks.md 中对应 checkbox
   - 记录改动文件和测试结果
4. 遇到 BLOCKED → 记录原因，选择：重试/跳过/停止

### 完成后
运行 sillyspec run execute --done --output "Wave ${waveIndex} 结果摘要"`
}
```

AI 收到当前 Wave 的 prompt 后，直接执行该 Wave 的所有任务。执行完成后运行 `sillyspec run execute --done`，CLI 自动输出下一个 Wave 的 prompt（或知识库审阅步骤）。

#### 固定尾部步骤 Prompt 定义

**倒数第 2 步: 知识库审阅**

```
检查本轮执行产生的新知识。

### 操作
1. 检查 `.sillyspec/knowledge/uncategorized.md` 中待确认条目
2. 如有 → 提示用户审阅
3. 用户确认后改为 [已确认]，可归类到专题文件

### 输出
新知识条目数量 + 审阅提示（或"无新知识"）
```

**最后 1 步: 完成确认**

```
所有任务完成后的收尾。

### 操作
1. 询问用户下一步：
   - 验证 → sillyspec run verify
   - 归档 → /sillyspec:archive
   - 继续开发
2. 提示 git 提交

### 输出
用户选择 + 下一步命令

### 注意
- 完成后运行 `sillyspec run execute --done` 即可自动推进阶段
```

---

### 4.5 verify（6 步）

| # | 名称 | 可跳过 | 输出 |
|---|---|---|---|
| 1 | 状态检查 | 否 | 当前状态摘要 |
| 2 | 加载规范并锚定 | 否 | 文件加载确认 |
| 3 | 逐项检查任务 | 否 | 任务完成度报告 |
| 4 | 对照设计检查 | 否 | 设计一致性报告 |
| 5 | 运行测试和质量扫描 | 否 | 测试结果 + 技术债务 |
| 6 | 输出验证报告 | 否 | 完整验证报告 + 下一步 |

#### 步骤 Prompt 定义

**Step 1/6: 状态检查**

```
检查当前状态，确认可以执行 verify。

### 操作
1. 运行 `sillyspec progress show`
2. 确认 currentStage 为 "verify"

### 输出
当前状态摘要
```

**Step 2/6: 加载规范并锚定**

```
加载规范文件并确认。

### 操作
1. 读取 proposal.md、design.md、tasks.md、requirements.md
2. 标注每个文件的存在/不存在状态

### 输出
文件加载确认清单
```

**Step 3/6: 逐项检查任务**

```
对照 tasks.md 检查每个任务完成状态。

### 操作
对每个 checkbox：
1. 检查相关文件是否存在
2. 检查代码是否实现了描述的功能
3. 标记：✅ 已完成 / ❌ 未完成 / ⚠️ 部分完成

### 输出
任务完成度列表 + 完成率

### 注意
- 不修改任何代码，只做检查和报告
```

**Step 4/6: 对照设计检查**

```
对照 design.md 检查实现一致性。

### 操作
1. 架构决策是否遵循
2. 文件变更清单是否一致
3. 数据模型是否符合
4. API 设计是否符合

### 输出
一致性检查结果
```

**Step 5/6: 运行测试和质量扫描**

```
运行完整测试套件和代码质量扫描。

### 操作
1. 运行测试：`pnpm test` 或 `npm test` 或 `pytest`
2. 记录通过/失败数量，分析失败原因
3. 搜索技术债务：grep TODO/FIXME/HACK/XXX
4. 运行综合校验（lint、测试等）

### 输出
测试结果 + 技术债务标记
```

**Step 6/6: 输出验证报告**

```
生成完整验证报告。

### 操作
1. 汇总以上所有检查结果
2. 给出结论：PASS / PASS WITH NOTES / FAIL

### 输出
验证报告 markdown + 下一步命令

### 注意
- PASS → 下一步 archive
- FAIL → 修复后重新 verify
```

## 5. 输出格式示例

### 当前步骤输出

```
---
stage: brainstorm
step: 1/10
stepName: 状态检查
project: my-app
---

## Step 1/10: 状态检查

检查 .sillyspec/.runtime/progress.json 确认当前状态。

### 操作
1. 运行 `sillyspec progress show`
2. 确认 currentStage 为 "brainstorm"
3. 如果有进行中的 brainstorm，提示选择继续或重新开始
4. 如果未初始化，提示先运行 sillyspec init

### 输出
当前状态摘要（1-2 句话）

### 注意
- 以 CLI 返回为准，不要自行推断阶段
- 如果阶段不对，输出正确提示并停止

### 完成后执行
sillyspec run brainstorm --done --output "你的状态摘要"
```

### 步骤完成 → 自动输出下一步

```
✅ Step 1/10 完成：状态检查

---
stage: brainstorm
step: 2/10
stepName: 加载项目上下文
project: my-app
---

## Step 2/10: 加载项目上下文

...

### 完成后执行
sillyspec run brainstorm --done --output "你的摘要"
```

### 阶段完成输出

```
✅ brainstorm 阶段已完成（10/10 步）

下一步：sillyspec run propose
或：/sillyspec:propose
```

### 状态查看输出

```
阶段：brainstorm（头脑风暴）
进度：[████████░░] 8/10

✅ Step 1: 状态检查
✅ Step 2: 加载项目上下文
✅ Step 3: 协作与复用检查
✅ Step 4: 原型/设计图分析
✅ Step 5: 需求范围评估
✅ Step 6: 对话式探索
✅ Step 7: 提出 2-3 种方案
✅ Step 8: 分段展示设计
⏳ Step 9: 写设计文档并自审 ← 当前
⬜ Step 10: 用户确认并输出技术方案
```

## 6. CLI 内部流程（伪代码）

### `sillyspec run <stage>`

```js
function runStage(stageName) {
  // 1. 读取 progress.json
  const progress = readJSON('.sillyspec/.runtime/progress.json')

  // 2. 检查阶段是否存在
  const stageDef = loadStageDefinition(stageName) // 从 src/stages/<stage>.js
  if (!stageDef) {
    console.error(`未知阶段: ${stageName}`)
    process.exit(1)
  }

  // 3. 找到当前步骤
  const stageProgress = progress.stages?.[stageName]
  if (!stageProgress) {
    // 首次进入此阶段，初始化步骤
    initStage(progress, stageName, stageDef.steps)
  }

  // 4. 找到第一个未完成的步骤
  const steps = progress.stages[stageName].steps
  const currentStepIndex = steps.findIndex(s => s.status !== 'completed' && s.status !== 'skipped')

  if (currentStepIndex === -1) {
    // 全部完成
    console.log(`✅ ${stageName} 阶段已完成（${steps.length}/${steps.length} 步）`)
    console.log(`\n下一步：sillyspec run ${getNextStage(stageName)}`)
    process.exit(2)
  }

  // 5. 输出当前步骤的 prompt
  const step = stageDef.steps[currentStepIndex]
  const totalSteps = stageDef.steps.length

  console.log(`---
stage: ${stageName}
step: ${currentStepIndex + 1}/${totalSteps}
stepName: ${step.name}
project: ${progress.project || basename(cwd())}
---\n`)
  console.log(`## Step ${currentStepIndex + 1}/${totalSteps}: ${step.name}\n`)
  console.log(step.prompt)
  console.log(`\n### 完成后执行\nsillyspec run ${stageName} --done --output "你的摘要"`)
}
```

### `sillyspec run <stage> --done`

```js
function completeStep(stageName, outputText) {
  // 1. 读取 progress.json
  const progress = readJSON('.sillyspec/.runtime/progress.json')

  // 2. 找到当前步骤
  const steps = progress.stages[stageName].steps
  const currentStepIndex = steps.findIndex(s => s.status === 'pending')

  if (currentStepIndex === -1) {
    console.error('没有待完成的步骤')
    process.exit(1)
  }

  // 3. 标记完成
  steps[currentStepIndex].status = 'completed'
  steps[currentStepIndex].completedAt = new Date().toISOString()
  if (outputText) {
    steps[currentStepIndex].output = outputText
  }

  // 4. 检查是否还有下一步
  const nextStepIndex = steps.findIndex(s => s.status === 'pending')

  if (nextStepIndex === -1) {
    // 5a. 全部完成
    progress.stages[stageName].status = 'completed'
    progress.stages[stageName].completedAt = new Date().toISOString()
    progress.currentStage = getNextStage(stageName)
    writeJSON('.sillyspec/.runtime/progress.json', progress)

    console.log(`✅ ${stageName} 阶段已完成（${steps.length}/${steps.length} 步）`)
    console.log(`\n下一步：sillyspec run ${getNextStage(stageName)}`)
  } else {
    // 5b. 还有下一步，自动输出
    writeJSON('.sillyspec/.runtime/progress.json', progress)
    console.log(`✅ Step ${currentStepIndex + 1}/${steps.length} 完成：${steps[currentStepIndex].name}\n`)

    // 输出下一步的 prompt
    runStage(stageName)
  }
}
```

### `sillyspec run <stage> --skip`

```js
function skipStep(stageName) {
  const progress = readJSON('.sillyspec/.runtime/progress.json')
  const steps = progress.stages[stageName].steps
  const stageDef = loadStageDefinition(stageName)

  const currentStepIndex = steps.findIndex(s => s.status === 'pending')
  const step = stageDef.steps[currentStepIndex]

  if (!step.optional) {
    console.error(`步骤 "${step.name}" 不可跳过`)
    process.exit(1)
  }

  steps[currentStepIndex].status = 'skipped'
  steps[currentStepIndex].skippedAt = new Date().toISOString()
  writeJSON('.sillyspec/.runtime/progress.json', progress)

  console.log(`⏭️ Step ${currentStepIndex + 1}/${steps.length} 已跳过：${step.name}`)

  // 输出下一步
  runStage(stageName)
}
```

### `sillyspec run <stage> --status`

```js
function showStatus(stageName) {
  const progress = readJSON('.sillyspec/.runtime/progress.json')
  const stageDef = loadStageDefinition(stageName)
  const steps = progress.stages[stageName].steps

  const completed = steps.filter(s => s.status === 'completed').length
  const bar = '█'.repeat(completed) + '░'.repeat(steps.length - completed)

  console.log(`阶段：${stageName}（${stageDef.title}）`)
  console.log(`进度：[${bar}] ${completed}/${steps.length}\n`)

  steps.forEach((step, i) => {
    const def = stageDef.steps[i]
    const icon = step.status === 'completed' ? '✅' : step.status === 'skipped' ? '⏭️' : step.status === 'pending' ? '⬜' : '⏳'
    const isCurrent = step.status === 'pending' && i === steps.findIndex(s => s.status === 'pending')
    console.log(`${icon} Step ${i + 1}: ${def.name}${isCurrent ? ' ← 当前' : ''}`)
  })
}
```

### `sillyspec run <stage> --reset`

```js
function resetStage(stageName) {
  const progress = readJSON('.sillyspec/.runtime/progress.json')
  const stageDef = loadStageDefinition(stageName)

  progress.stages[stageName] = {
    status: 'in_progress',
    steps: stageDef.steps.map(step => ({
      name: step.name,
      status: 'pending'
    }))
  }

  writeJSON('.sillyspec/.runtime/progress.json', progress)
  console.log(`🔄 ${stageName} 阶段已重置`)
}
```

## 7. Skills 精简方案

改造后每个 skill 的 SKILL.md 只需要几行模板：

```markdown
---
name: sillyspec:brainstorm
description: 需求探索 — 结构化头脑风暴，含技术方案输出（创建性工作前必用）
---

## 执行

运行 `sillyspec run brainstorm`，按提示逐步执行。
每步完成后运行 `sillyspec run brainstorm --done --output "摘要"`。
阶段完成后自动提示下一步。

## 用户指令
$ARGUMENTS
```

所有阶段的 skill 都遵循同样模式，只是替换阶段名。

**效果：**
- 原来 brainstorm SKILL.md 591 行 → 精简后 ~10 行
- 原来 plan SKILL.md ~200 行 → ~10 行
- 原来 execute SKILL.md ~300 行 → ~10 行
- 原来 verify SKILL.md ~120 行 → ~10 行
- 原来 propose SKILL.md ~200 行 → ~10 行

## 8. 文件结构

```
src/
  stages/
    brainstorm.js    ← brainstorm 阶段定义（10 步）
    propose.js       ← propose 阶段定义（7 步）
    plan.js          ← plan 阶段定义（7 步）
    execute.js       ← execute 阶段定义（动态步骤：5 固定 + N Wave）
    verify.js        ← verify 阶段定义（6 步）
    index.js         ← 加载所有阶段定义，导出 stageRegistry
  commands/
    run.js           ← sillyspec run 命令的 CLI 实现
  progress.js       ← 已有，保持（读写 progress.json）
  index.js          ← 注册 run 命令
```

**`src/stages/index.js` 示例：**

```js
import { definition as brainstorm } from './brainstorm.js'
import { definition as propose } from './propose.js'
import { definition as plan } from './plan.js'
import { definition as execute } from './execute.js'
import { definition as verify } from './verify.js'

export const stageRegistry = {
  brainstorm,
  propose,
  plan,
  execute,
  verify
}

// 阶段顺序，用于 getNextStage
const stageOrder = ['brainstorm', 'propose', 'plan', 'execute', 'verify']

export function getNextStage(currentStage) {
  const index = stageOrder.indexOf(currentStage)
  return stageOrder[index + 1] || null
}
```

## 9. Dashboard 集成方案

### 进度同步

- `sillyspec run` 每次执行都会更新 `progress.json`
- Dashboard 已有的 fs.watch / 轮询机制继续工作
- 不需要额外的 WebSocket 通知

### 新增信息

`progress.json` 中的阶段数据结构扩展：

```json
{
  "stages": {
    "brainstorm": {
      "status": "in_progress",
      "steps": [
        { "name": "状态检查", "status": "completed", "completedAt": "...", "output": "..." },
        { "name": "加载项目上下文", "status": "completed", "completedAt": "..." },
        { "name": "协作与复用检查", "status": "skipped", "skippedAt": "..." },
        { "name": "原型/设计图分析", "status": "pending" },
        { "name": "需求范围评估", "status": "pending" }
      ]
    }
  }
}
```

Dashboard 可以渲染：
- 进度条（已完成/总数）
- 每个步骤的状态和时间
- 当前步骤高亮
- 步骤输出摘要

## 10. 向后兼容考虑

### 旧 progress.json 格式

旧格式只有 `currentStage` 字段，没有 `stages` 详细步骤信息。兼容方案：

```js
function migrateProgress(progress) {
  if (!progress.stages) {
    // 旧格式，初始化 stages 结构
    progress.stages = {}
  }

  // 如果当前阶段没有 steps，自动初始化
  const currentStage = progress.currentStage
  if (currentStage && !progress.stages[currentStage]?.steps) {
    const stageDef = stageRegistry[currentStage]
    if (stageDef) {
      progress.stages[currentStage] = {
        status: 'in_progress',
        steps: stageDef.steps.map(step => ({
          name: step.name,
          status: 'pending'
        }))
      }
    }
  }

  return progress
}
```

### 已完成阶段

如果某个阶段在旧格式中已经标记完成（如 `brainstorm ✅`），迁移时跳过初始化步骤：

```js
// 已完成的阶段直接标记
if (progress.stages[stageName]?.status === 'completed') {
  // 不重新初始化
  continue
}
```

### 命令兼容

- `sillyspec progress show` 继续保留，用于查看当前进度
- `sillyspec progress complete-stage` 内部由 `sillyspec run --done` 自动调用，也可手动使用
- 新增 `sillyspec run` 不影响已有命令

### 渐进式迁移

1. 先实现 `sillyspec run` 命令和步骤定义
2. Skills 可以逐步精简，不需要一次性改完
3. 旧 Skill 仍然可以正常工作（读取完整 SKILL.md）
4. 新 Skill 精简后自动使用 `sillyspec run` 流程
5. 两种模式可以共存，用户选择何时迁移