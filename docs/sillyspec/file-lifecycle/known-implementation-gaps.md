---
author: qinyi
created_at: 2026-06-04 16:25:42
updated_at: 2026-07-04
---

# 剩余实现差异清单

本页只记录当前代码仍存在的实现差异。已修复的条目不再保留为缺口，包括：

- `brainstorm` / `propose` 重复 object key 导致步骤丢失。
- scan prompt 写 `.sillyspec/.runtime/local.yaml`。
- hook 只读根目录 `local.yaml`。
- archive 第 4 步正常流程不触发自动归档。
- 自动 sync / approval 参数顺序不匹配。
- `ProgressManager._updatePlatformLastSync()` / `_updateApprovalStatus()` 缺失。

## workflow-runs 平台路径支持未从 run.js 接通

代码位置：`src/workflow.js`、`src/run.js`

现象：

- `saveWorkflowRun()` 支持传 `runtimeRoot`。
- `run.js` scan/archive post-check 调用时没有传 `runtimeRoot` / `scanRunId`。

影响：

- 自动 post-check 的 workflow run 当前写本地 `.sillyspec/.runtime/workflow-runs/`。
- 平台模式下不能按旧文档断言它会写入 `<runtime-root>/scan-runs/<scan-run-id>/workflow-runs/`。

## `--no-worktree` 决定不接通（与降级铁律冲突）

代码位置：`src/run.js`、`src/stages/execute.js`、`src/hooks/worktree-guard.js`

决策：有意不接通。`design.md` 降级铁律（"降级只收紧不放松，不存在降级到放行的路径"）决定了 `--no-worktree` 即使接通也无实用价值：

- 单独使用：execute 跳过 worktree 创建，但 hook 仍按 `isNoWorktreeMode` 拦截主仓库源码写入 → 写不了代码。
- 叠加 `SILLYSPEC_DISABLE_HOOKS=1`：能写，但那时 flag 多余（`DISABLE_HOOKS` 已全放行）。

worktree 创建失败的逃生口是 `sillyspec worktree doctor --fix` / 手动清理（`run.js` execute 块的三步提示），不是 `--no-worktree`。`buildExecuteSteps()` 的 `noWorktree` 参数、`changes.no_worktree` 列、`isNoWorktreeMode()` 读端是为该模式预留的基础设施，保留但无 CLI 写入入口。

不要再尝试接通此 flag，除非先重审降级铁律（例如给平台模式开 apply 绕过特例）。

## DB schema version 口径不统一

代码位置：`src/db.js`、`src/progress.js`

现象：

- `db.js` 的 `project.schema_version` 默认值是 4。
- `progress.js` 的 `CURRENT_VERSION` 是 3。
- `ProgressManager.init()` 写 project 行时使用 `CURRENT_VERSION`。

影响：

- 文档只描述表结构，不把当前状态存储称为明确 v4 schema。

## `global.json` 是遗留口径

代码位置：`src/progress.js`

现象：

- 注释和常量还提到 `.sillyspec/.runtime/global.json`。
- 实际 `readGlobal()` / `writeGlobal()` 已经走 SQL。

影响：

- 文档应写成“当前没有实际 global.json 生命周期”。

## workflow archive 固定 project 为 `sillyspec`

代码位置：`src/run.js`

现象：

- archive `extract-module-impact` post-check 调用 `runPostCheck(resolved, cwd, 'sillyspec')`。
- 不按当前项目注册表动态选择 project。

影响：

- 文档不能写成 archive impact workflow 对所有项目自动按 project 维度检查。

## platform approve / reject 尚未实现

代码位置：`src/sync.js`

现象：

- `sillyspec platform approve <change-name>` 和 `reject <change-name>` 有 CLI 分支。
- 当前实现只打印 “尚未实现” warning。

影响：

- 本地 `checkApproval()` 能读取并记录平台审批状态，但 CLI 端还不能主动向平台发起 approve/reject。
