# archive（归档变更）阶段提示词

> **源文件**：`src/stages/archive.js`
> **阶段定位**：规范沉淀，可追溯
> **类型**：辅助阶段（auxiliary，无活跃变更时也可执行）
> **全局角色 persona**：无
> **全局护栏 _globalGuardrails**：无（仅有 CLI 统一铁律，见 [README.md](./README.md)）
> **步骤总数**：5

> 📌 本文档展示的是**每个 step 的 prompt 模板原文**。agent 实际收到的提示词 = `outputStep` 注入的 header + persona（仅首步）+ prompt 正文（占位符已替换）+ 完成契约（仅首步）+ 铁律 + `--wait/--done` 命令模板。注入细节见 [README.md](./README.md)。

---

## Step 1/5：任务完成度检查

**元数据**
- optional：false
- outputHint：完成度报告
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `{TASK_COMPLETION_REPORT}` → CLI 从 review.json verdict 算出的客观完成度报告（src/task-review.js summarizeTaskCompletion，archive 阶段注入；真相源替代 plan.md checkbox）

**提示词原文**

````markdown
检查任务完成度，决定是否可归档。

### 客观完成度报告（CLI 已注入，勿自行数 checkbox）
{TASK_COMPLETION_REPORT}

### 判定规则
- **真相源 = review.json verdict**：上方报告由 CLI 从 .runtime/execute-runs/<runId>/tasks/task-NN/review.json 的 specVerdict + qualityVerdict 算出。
- tasks.md 的 - [x] checkbox **仅作显示态参考**：它依赖自动回填，runId marker / review 缺失时会停在未勾态，与客观 verdict 不一致时**以本报告为准**，不要被未勾 checkbox 误导。
- 报告「未通过 / 缺失」= 0 且 source 为 review.json → 完成度合格，进入下一步。
- 报告含「cannot_verify 草稿（未真正复核）」计数 > 0 → 这些 task 只有 cannot_verify 草稿兜底、未被真正复核：先确认 verify 阶段已兑现其 requiredEvidence（verify-result.md 有对应证据），缺证据的派独立子代理对照 task brief + git diff 补真实复核（升级为 pass/fail），勿静默放行。
- 报告 source 为 plan-checkbox-fallback（客观源不可用）→ 完成度无法客观确认，**必须暂停**让用户交叉核对，不要直接放行。
- 存在未完成任务 → **必须暂停等待用户决定**，不要自行判断"可以归档"。
   - 调用：sillyspec run archive --wait --reason "存在未完成任务，是否继续归档" --options "继续归档,回到execute完成剩余任务" --output "未完成任务列表"

### 输出
完成度报告（已通过/总数 + 数据源 + 未完成任务列表）
````

---

## Step 2/5：extract-module-impact

**元数据**
- optional：false
- outputHint：module-impact.md 终审结果 + 修正摘要
- 等待配置：无（可直接 --done）

**提示词原文**

````markdown
最终确认 changes/<change>/module-impact.md（本次变更的模块影响分析）。该文档由 plan review_plan 步生成首版、execute 各 Wave 更新、verify 核对——本步是归档前最后一次确认（module-impact 已非 archive 生成，改活文档终审）。

### 操作
1. 读取 changes/<change>/module-impact.md（应已存在；large 变更 plan 阶段产出首版）
2. 运行 git diff --name-only HEAD~1（或 git diff --name-only --cached）获取真实修改文件列表
3. 三重核对：module-impact.md 记录的受影响模块/文件 vs 真实 git diff 文件列表 vs .sillyspec/docs/<project>/modules/_module-map.yaml 模块映射（不存在则仅核 unmapped 部分）。以 git diff 为准（真实 > 记录）
4. 发现不一致（漏标受影响模块 / 影响类型错误 / 实际未触碰的模块被误标）→ 直接修正 module-impact.md，使其与实际变更一致
5. module-impact.md 第一行标题必须用中文：# 模块影响分析（Module Impact）— <变更简述>

### 降级（module-impact.md 不存在）
若缺失（如旧变更未经新 plan 流程，或 small 变更从未生成），按原生成逻辑补一份：读 .sillyspec/workflows/archive-impact.yaml 的 impact-analyzer 角色规则 + git diff + _module-map.yaml，生成模块影响矩阵（模块 × 影响类型 × 相关文件 × 更新摘要 × needs_review，未匹配文件归入 unmapped 表）落盘 module-impact.md。

确认完成后，下一步 sync-module-docs 会读 module-impact.md 更新模块卡片文档。
````

---

## Step 3/5：sync-module-docs

**元数据**
- optional：false
- outputHint：模块文档更新结果
- 等待配置：requiresWait（必须 --wait 等待用户确认，确认后回到本步由 agent 写入模块文档）

**本步出现的运行时占位符**
- `<change-name>` → 当前变更名

**提示词原文**

````markdown
根据 module-impact.md 同步更新模块索引和卡片文档。

### ⚠️ 核心原则：结构化事实改 _module-map.yaml，语义解释改模块卡片
- `_module-map.yaml` 是唯一的结构化索引源（paths/tags/entrypoints/depends_on/used_by/status/needs_review）
- 模块卡片只负责语义说明（定位/契约摘要/关键逻辑/注意事项/人工备注）
- 一个信息只维护一次，不要两边重复

### 操作
1. 读取 `.sillyspec/changes/<change-name>/module-impact.md`
2. 如果没有受影响模块（只有 unmapped）→ 提示用户，跳过同步
3. 对每个受影响模块，按影响类型分别更新：

#### 更新 _module-map.yaml 的规则
- **路径变化** → 更新对应模块的 paths
- **依赖变化** → 更新 depends_on / used_by（同时更新反向模块的 used_by / depends_on）
- **导出符号变化** → 更新 entrypoints / main_symbols
- **新增模块** → 添加完整条目
- **模块废弃** → status: deprecated
- **不确定的影响** → needs_review: true, review_reasons 追加原因
- 如果 _module-map.yaml 的 generated_at 已过时，更新为当前时间

#### 更新模块卡片（modules/<module-id>.md）的规则
- **契约语义变化**（新增/删除对外能力） → 更新"契约摘要"
- **关键逻辑变化** → 更新"关键逻辑"
- **边界变化**（模块职责扩大/缩小） → 更新"定位"
- **注意事项变化** → 更新"注意事项"
- **内部实现变化**（不影响对外接口） → 通常不更新卡片
- **人工备注** → 永远保护，不覆盖

#### 人工备注保护
1. 用正则提取 `<!-- MANUAL_NOTES_START -->` 到 `<!-- MANUAL_NOTES_END -->` 之间的内容
2. 生成新卡片后，原样回填到人工备注区域
3. 如果标记缺失或重复 → 在 _module-map.yaml 中标记 needs_review: true

#### 新建模块卡片模板
一级标题格式 `# <中文名>（<module-id>）`——中文名从模块职责提炼 2-8 字，括号内保留 module-id 原样（sillyhub 平台解析识别用，与 scan 生成约定一致）。
```markdown
---
schema_version: 1
doc_type: module-card
module_id: <module-id>
---

# <中文名>（<module-id>）

## 定位

## 契约摘要

## 关键逻辑

## 注意事项

## 人工备注

<!-- MANUAL_NOTES_START -->

<!-- MANUAL_NOTES_END -->
```

4. 展示所有更新内容（diff 摘要），**必须暂停等待用户确认**
   - 调用：`sillyspec run archive --wait --reason "等待用户确认模块文档同步" --options "确认写入,跳过同步" --output "diff 摘要"`
5. **只有用户通过 --continue --answer "确认写入" 后才写入文件**
   - 写入 _module-map.yaml 和受影响的模块卡片
6. 用户拒绝时，不写入，但提示"module-impact.md 已保留，可稍后手动同步"
7. 回填 module-impact.md 的"更新结果"表格，区分目标：
   - 目标列写 "`_module-map.yaml: <module-id>`" 或 "`modules/<module-id>.md`"
8. **同步完成后**，如需刷新 `_module-map.yaml` 索引：`sillyspec modules rebuild --force`（默认 dry-run 只预览不写；`--force` 才覆盖，但会清空 tags/entrypoints/main_symbols/depends_on/used_by 等手动维护字段——与 archive-impact 的「人工备注保护」约束冲突，仅当手动字段已并入骨架或可接受覆盖时用；优先手动更新 dependencies.md / 模块卡片）

### 输出
已更新的文件路径列表 + 用户确认状态
````

---

## Step 4/5：确认归档

**元数据**
- optional：false
- outputHint：归档确认
- 等待配置：无（可直接 --done）

**本步出现的运行时占位符**
- `<change-name>` → 当前变更名

**提示词原文**

````markdown
确认归档内容，由 CLI 执行目录移动。

### 操作
1. 展示：变更目录名、包含的文件列表（含 module-impact.md）、生成总结
2. 确保任务清单（tasks.md）所有 task checkbox 都已勾选
3. 让用户确认后，用 `--confirm` 完成本步骤：
   `sillyspec run archive --done --confirm --output "确认归档"`
4. CLI 会创建 `.sillyspec/changes/archive/`，并将变更目录移动到 `.sillyspec/changes/archive/<原变更名>/`

### 输出
归档完成 + archive 目录路径
````

---

## Step 5/5：更新路线图和提交

**元数据**
- optional：false
- outputHint：归档完成
- 等待配置：无（可直接 --done）

**提示词原文**

````markdown
更新路线图并暂存变更。

### 操作
1. 如果 `.sillyspec/ROADMAP.md` 存在，标记对应 Phase 为已完成
2. `git add .sillyspec/changes/archive/` — 暂存归档结果（archive/ 下仅本次归档新增，不会裹挟 changes/ 下其他活跃变更；不要 commit，由用户通过统一提交工具处理）
3. `git add .sillyspec/docs/<project>/modules/` — 暂存模块文档更新（如有；精确到本次同步的模块文档，勿 add 整个 .sillyspec/docs/）
4. 确认 sillyspec.db 中该变更已不再 active（确认归档步骤由 CLI 调用 unregisterChange）

### 输出
归档完成确认 + 累积规范统计
````
