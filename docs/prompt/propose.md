> ⚠️ **已废弃（DEPRECATED）**：propose 入口已于 2026-06-14 移除，不在 `stages/index.js` 的 `stageRegistry`。本文档仅作 prompt 历史参考（`stage-review.js` 仍有 propose 的 reviewType / proposal.md 残留逻辑）。

# propose（方案设计）阶段提示词

> **源文件**：`src/stages/propose.js`
> **阶段定位**：生成结构化规范 — proposal + design + tasks
> **类型**：已废弃
> **全局角色 persona**：无
> **全局护栏 _globalGuardrails**：无（仅有 CLI 统一铁律，见 [README.md](./README.md)）。
> **步骤总数**：7

> 📌 本文档展示的是**每个 step 的 prompt 模板原文**，仅作历史参考。废弃前的注入流程 = `outputStep` 注入的 header + prompt 正文（占位符已替换）+ 完成契约（仅首步）+ 铁律 + `--wait/--done` 命令模板。注入细节见 [README.md](./README.md)。

---

## Step 1/7：进度确认

**元数据**
- optional：false
- outputHint：状态摘要
- 等待配置：无（可直接 `--done`）

**提示词原文**

````markdown
检查当前进度，确认可以执行 propose。用 `sillyspec progress show` 查流程进度，不要用 `sillyspec status`（项目级快照，不推进流程）。

### 操作
1. 运行 `sillyspec progress show`
2. 确认 currentStage 为 "propose"
3. 如果没有设计文档 → 提示先运行 brainstorm

### 输出
当前状态摘要
````

---

## Step 2/7：加载上下文

**元数据**
- optional：false
- outputHint：文件列表
- 等待配置：无（可直接 `--done`）

**本步出现的运行时占位符**
- `<project>` → 当前项目名（`basename(cwd)` 或 db 项目名）

**提示词原文**

````markdown
加载所有相关规范和代码库上下文。

### 操作
1. 加载项目总览 `.sillyspec/docs/<project>/scan/PROJECT.md`（如存在）和子项目上下文
2. 读取最新设计文档、需求文档、代码库约定
3. 如果是子阶段变更，读取 MASTER.md 和前序阶段设计

### 模块文档加载
4. 读取 `.sillyspec/docs/<project>/modules/_module-map.yaml`（不存在则跳过以下步骤）
5. 根据当前提案初步判断涉及的模块（匹配提案中的文件路径到 _module-map.yaml 的 paths）
6. 读取匹配到的 `.sillyspec/docs/<project>/modules/<module>.md`
7. 如果发现提案中的变更范围与某个模块文档描述的当前设计存在潜在冲突，在后续提案中明确标注并说明处理方案

### 输出
已加载的文件列表（含模块文档）
````

---

## Step 3/7：锚定确认

**元数据**
- optional：false
- outputHint：文件确认清单
- 等待配置：无（可直接 `--done`）

**提示词原文**

````markdown
确认已读取的文件。

### 操作
1. 列出已读取的文件，标注存在/不存在
2. 格式：`[x] 文件名 — 说明` 或 `[ ] 文件名 — 不存在（正常）`

### 输出
文件加载确认清单

### 注意
- 文件不存在不是错误，正常标注即可
````

---

## Step 4/7：探索现有代码

**元数据**
- optional：false
- outputHint：影响范围分析
- 等待配置：无（可直接 `--done`）

**提示词原文**

````markdown
理解相关模块的当前实现，识别影响范围。

### 操作
1. 根据设计文档中的文件变更清单，读取相关源码
2. 识别现有接口、方法签名、数据结构
3. 记录可能受影响的模块

### 输出
影响范围分析（涉及模块、需修改的文件、风险点）
````

---

## Step 5/7：生成规范文件

**元数据**
- optional：false
- outputHint：四个文件路径
- 等待配置：无（可直接 `--done`）

**本步出现的运行时占位符**
- `<change-name>` → 当前变更名（如 `2026-05-28-agent-log-streaming`）

**提示词原文**

````markdown
在 `.sillyspec/changes/<change-name>/` 下生成四个文件。

**⚠️ 路径注意：<change-name> 是变更目录名（如 `2026-05-28-agent-log-streaming`），直接放在 `.sillyspec/changes/` 下，不要加额外的子目录层级。正确路径示例：`.sillyspec/changes/2026-05-28-agent-log-streaming/proposal.md`**

### proposal.md 格式要求
- **动机**：为什么做、解决什么核心问题
- **关键问题**：为什么现有方案不够（展开 2-3 个具体痛点）
- **变更范围**：本次做什么
- **不在范围内**（显式清单）：不做 X、不做 Y
- **成功标准**（可验证条件）：旧配置默认行为不变、新功能配置后可用

### requirements.md 格式要求
- **角色表**：涉及的角色和说明
- **FR 编号需求**：FR-01、FR-02 ... 每条需求用 Given/When/Then 格式
- **每个边界条件**独立 GWT 块
- **非功能需求**：兼容性、可回退、可测试、可扩展

### design.md 格式要求

**必须包含的章节：**
1. **背景**：为什么做、解决什么问题
2. **设计目标**：要达成什么
3. **非目标**：明确不做的事（防止 scope creep）
4. **总体方案**：技术方案（分 Phase/Wave）
5. **文件变更清单**（必填）：

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/xxx/NewFile.java | ... |
| 修改 | src/xxx/ExistingFile.java | 新增 xx 方法 |

6. **接口定义**：方法签名、数据结构（代码类任务必填）
7. **数据模型**（如涉及）：表结构/字段变更
8. **兼容策略**（brownfield 必填）：未配置新功能时行为不变、新旧逻辑的回退路径
9. **风险登记**：

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | ... | P0/P1/P2 | ... |

10. **自审**：需求覆盖、约束一致性、真实性、YAGNI、验收标准、非目标清晰、兼容策略、风险识别

### tasks.md 格式要求
- 任务列表（只列名称，不展开步骤）
- 每个 task 附文件路径

### 操作
1. 生成 proposal.md
2. 生成 requirements.md
3. 生成 design.md
4. 生成 tasks.md

### 输出
四个文件路径

### 注意
- 表名/字段名/类名必须来自真实代码或标注"新增"
- 用户场景必须用 Given/When/Then 格式
- tasks.md 只列任务名，细节在 plan 阶段展开
````

---

## Step 6/7：自检门控

**元数据**
- 等待配置：无（可直接 `--done`）

**本步出现的运行时占位符**
- `{REVIEW_TIER}` → 审查分级：`self`（当前 agent 自审）或 `independent`（强制独立子代理 + review.json）。由 `review-tier.js` 的 `classifyReviewTier({planLevel, designPath})` 按 plan_level / 变更文件数判定
- `{REVIEW_TIER_REASON}` → 分级理由文案（如 `变更文件 3 ≤ 3` 或 `plan_level=none...`）
- `{REVIEW_JSON_CONTRACT}` → `stage-review.js` 的 `renderReviewJsonContract()` 产出的 review.json 产物契约 markdown（schema + 完整示例 + docHash 算法，propose 主审查文档为 proposal.md）

> 完整占位符映射见 [README.md](./README.md)「占位符总表 → 动态块占位符」。降级：当 review-tier / stage-review 注入抛异常时，`{REVIEW_TIER}`→`self`、`{REVIEW_TIER_REASON}`→`分级异常降级 self: <err>`、`{REVIEW_JSON_CONTRACT}`→精简契约提示。

**提示词原文**

````markdown
自检生成的规范文件（按规模分级）。

### 当前审查分级（CLI 按变更规模判定，占位符由 run.js 注入）
tier: {REVIEW_TIER}（{REVIEW_TIER_REASON}）
- tier=self：当前 agent 直接执行下方 checklist
- tier=independent：必须用 Agent tool 启动一个独立的规范审查子代理（独立上下文，不共享你的分析），子代理执行下方 checklist 并输出 review.json。review.json 产物契约（CLI Stage Review Gate 将硬校验，schema + 完整示例 + docHash 算法如下，照抄改值）:
{REVIEW_JSON_CONTRACT}

### 操作
检查以下各项：
- [ ] proposal.md 有动机、关键问题、变更范围、不在范围内、成功标准
- [ ] design.md 有背景、设计目标、非目标
- [ ] design.md 有文件变更清单表格
- [ ] design.md 有兼容策略（brownfield 时）
- [ ] design.md 有风险登记表格
- [ ] design.md 有自审
- [ ] requirements.md 有角色表
- [ ] requirements.md 有 FR 编号和 Given/When/Then 用户场景
- [ ] tasks.md 每个 task 有文件路径

任何不通过 → 修正后重新检查。

### 输出
自检通过/不通过
````

---

## Step 7/7：展示并更新进度

**元数据**
- optional：false
- outputHint：展示结果
- 等待配置：无（可直接 `--done`）

**提示词原文**

````markdown
展示规范给用户，更新进度。

### 操作
1. 展示 proposal.md 和 design.md 摘要

### 输出
展示结果 + 下一步命令
````
