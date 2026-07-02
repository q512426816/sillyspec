---
author: qinyi
created_at: 2026-06-04 16:25:42
---

# 阶段与变更产物

## 变更注册

变更状态由 `ProgressManager.initChange()` 写入 SQLite：

- 确保 `.sillyspec/changes/<change>/` 存在
- `changes` 表插入或激活 change
- 为所有有效阶段写入 `stages` 行
- 默认 `current_stage = 'brainstorm'`

`run.js` 在执行阶段时会调用 `pm.registerChange()`，确保 effective change 是 active。

## 阶段步骤来源

阶段定义来自 `src/stages/*.js`，由 `src/stages/index.js` 注册。`scan`、`quick`、`explore`、`archive`、`status`、`doctor` 被标记为辅助阶段；辅助阶段完成后，`run.js` 会把该阶段步骤重置为 pending，并清空当前辅助阶段的 gate 状态。

当前运行时步骤数：

| 阶段 | 步骤数 | 产物口径 |
|---|---:|---|
| scan | 10 | 生成 `.sillyspec/docs/<project>/...`，step 2 后动态展开项目级步骤 |
| brainstorm | 11 | 第 10 步写 `design.md` 并自审，第 11 步确认后生成四件套，可选生成 `MASTER.md`、prototype、后续包骨架 |
| propose | 7 | 第 5 步生成四件套，第 6 步自检门控 |
| plan | 8+ | 生成 `plan.md`；如解析到任务，会动态插入任务蓝图协调器 |
| execute | 12+ | 生成/使用 worktree，按 Wave 执行；最终 apply/cleanup |
| verify | 7 | 写 `verify-result.md` |
| archive | 5 | 写 `module-impact.md`，同步模块文档，归档目录 |
| quick | 3 | 始终写 quicklog；关联变更时另在各 change tasks.md 追加并勾选 task；直接改主工作区 |

## 变更四件套

目标路径：`.sillyspec/changes/<change>/`

| 文件 | 当前创建方式 | 后续消费者 |
|---|---|---|
| `proposal.md` | brainstorm 第 11 步；propose 第 5 步 | propose/plan/verify/archive prompt |
| `design.md` | brainstorm 第 10/11 步；propose 第 5 步 | plan、execute、verify、worktree apply 的文件清单 |
| `requirements.md` | brainstorm 第 11 步；propose 第 5 步 | plan、verify |
| `tasks.md` | brainstorm 第 11 步；propose 第 5 步；quick 关联变更时可追加 task | plan、execute、verify、archive |

`run.js validateFileLocations()` 在阶段完成时会检查：

| 阶段 | 预期文件 |
|---|---|
| propose | `proposal.md`、`design.md`、`requirements.md`、`tasks.md` |
| plan | `plan.md` |
| verify | `verify-result.md` |
| archive | `module-impact.md` |

这个检查只打印警告，不会阻止流程。

## `design.md` 文件变更清单

解析方：`src/change-list.js`

规则：

- 查找 `## 文件变更清单` 或 `### 文件变更清单`
- 截取到下一个 `##` 标题
- 解析 Markdown 表格
- 取第二列作为文件路径
- 忽略空路径、`—`、`-`、`.sillyspec/` 开头路径

消费者：

- `worktree-apply.js` 用它作为 allow list
- verify/archive prompt 要求人工对照

如果清单为空，`applyWorktree()` 不做 allow list 限制。

## `plan.md` 和 `tasks/task-NN.md`

`plan.md` 创建方式：plan 阶段“展开任务并分组”prompt 写入。

`run.js completeStep()` 在该步骤完成后读取 `plan.md`。如果能解析到 `- [ ] task-XX:` 格式的任务，会通过 `buildPlanSteps(changeDir, planContent)` 动态插入“生成任务蓝图（子代理并行）”步骤。

`tasks/task-NN.md` 创建方式：动态任务蓝图协调器 prompt 要求子代理写入。

当前 `tasks/task-NN.md` frontmatter 模板包含：

- `id`
- `title`
- `priority`
- `estimated_hours`
- `depends_on`
- `blocks`
- `allowed_paths`

## `verify-result.md`

路径：`.sillyspec/changes/<change>/verify-result.md`

创建方式：verify 阶段最后一步 prompt。

`run.js` 不生成报告正文，只在 verify 阶段完成后检查文件是否存在，并提示下一步 `sillyspec run archive`。

## `module-impact.md`

路径：`.sillyspec/changes/<change>/module-impact.md`

创建方式：archive 阶段 `extract-module-impact` prompt。

`run.js` 在该步骤完成后会尝试加载 `.sillyspec/workflows/archive-impact.yaml` 并执行 workflow post-check，然后把检查结果保存到 `.sillyspec/.runtime/workflow-runs/`。

## scan 文档

目标目录：`.sillyspec/docs/<project>/scan/`

当前 scan 定义要求 7 份核心扫描文档：

- `ARCHITECTURE.md`
- `CONVENTIONS.md`
- `STRUCTURE.md`
- `INTEGRATIONS.md`
- `TESTING.md`
- `CONCERNS.md`
- `PROJECT.md`

`scan` step 2 之后，`run.js` 会把所有带 `perProject: true` 的步骤按项目展开，并在 `.sillyspec/.runtime/scan-projects.json` 记录已展开状态。

## 模块文档

目标目录：`.sillyspec/docs/<project>/modules/`

| 文件 | 当前创建/维护方 |
|---|---|
| `_module-map.yaml` | scan 可选步骤；`sillyspec modules rebuild` 会按模块卡片重建骨架 |
| `<module>.md` | scan 可选步骤；archive `sync-module-docs` prompt；quick prompt |
| `dependencies.md` | `generateDependenciesMd()` 可生成，但当前 CLI 没有直接暴露该函数 |

`sillyspec modules rebuild` 不是全量源码重扫。它会保留/合并模块卡片并生成骨架，输出也明确提示 tags、entrypoints、main_symbols、depends_on、used_by 需要重新 scan 或手动补充。

## quicklog

路径：`.sillyspec/quicklog/QUICKLOG-<git-user>.md`

创建方式：quick 阶段“理解任务”prompt，**每次 quick 都创建/追加**（无论是否关联变更）。关联变更时，同一 ql-ID 会同步写入各关联变更的 tasks.md 作为未勾选 task，step 3 完成时勾选。

格式规则来自 prompt：

- ID 为 `ql-YYYYMMDD-NNN-XXXX`
- `NNN` 每天从 001 递增
- `XXXX` 是 4 位随机十六进制字符
- 第一步写“进行中”
- 第三步改为“已完成”
- 超过 500 行时 prompt 要求轮转为 `QUICKLOG-<USER>-YYYY-MM-DD.md`

这些写入和轮转由 AI 按 prompt 执行，当前没有独立 JS 函数自动完成。

## 归档目录

目标目录：`.sillyspec/changes/archive/<date>-<change>/`

当前移动目录由 `run.js` 执行：

- archive 第 4 步是“确认归档”。
- 执行 `sillyspec run archive --done --confirm --output "确认归档"` 时，`run.js` 会把 `.sillyspec/changes/<change>/` 移动到 `.sillyspec/changes/archive/<date>-<change>/`。
- 移动后会调用 `ProgressManager.unregisterChange()`，注销 active change。
- 如果没有带 `--confirm`，`run.js` 会把第 4 步回退为 pending，清除该步输出，并提示补上 `--confirm`。

第 5 步“更新路线图和提交”只负责后续人工收尾，不再移动目录。
