---
author: qinyi
created_at: 2026-06-04 16:25:42
updated_at: 2026-07-16T00:00:00+08:00
---

# 剩余实现差异清单

本页只记录当前代码仍存在的实现差异。已修复的条目不再保留为缺口，包括：

- `brainstorm` / `propose` 重复 object key 导致步骤丢失。
- scan prompt 写 `.sillyspec/.runtime/local.yaml`。
- hook 只读根目录 `local.yaml`。
- archive 第 4 步正常流程不触发自动归档。
- 自动 sync / approval 参数顺序不匹配。
- `ProgressManager._updatePlatformLastSync()` / `_updateApprovalStatus()` 缺失。
- platform `approve` / `reject` 未实现（2026-07-09 已补齐：`sync.js` `_submitApproval` 真实 HTTP POST 到 `{url}/api/changes/{changeName}/approval`，body `{decision[,reason]}`，成功后落 `approvals` 表；端点待 SillyHub 对齐，见 `interface-contract.md` §7 TBD-hub-api）。
- workflow-runs 平台路径未从 `run.js` 接通（2026-07-09 已补齐：`run.js` scan/archive 两处 post-check 均透传 `runtimeRoot` / `scanRunId` 给 `saveWorkflowRun`；平台模式落 `<runtimeRoot>/scan-runs/<scanRunId>/workflow-runs/`）。
- DB schema version 口径不统一（2026-07-16 已修复）：`db.js` project 表 `schema_version` DEFAULT 从 4 对齐为 `progress.js` `CURRENT_VERSION=3`（旧值 4 是遗留误写；CREATE TABLE IF NOT EXISTS 不影响已存在的行）。
- `global.json` 遗留口径（2026-07-16 已修复）：`progress.js` 删除未引用的 `GLOBAL_FILE` 常量与存储结构注释里的 `global.json` 行——全局状态实际走 SQLite，无实体 global.json 生命周期。
- workflow archive 固定 project 为 `sillyspec`（2026-07-16 已修复）：`run.js` archive `extract-module-impact` post-check 从硬编码 `'sillyspec'` 改为 `progress.project || basename(cwd)`，与 scan 的动态 project 口径一致。

## `--no-worktree` 决定不接通（与降级铁律冲突）

代码位置：`src/run.js`、`src/stages/execute.js`、`src/hooks/worktree-guard.js`

决策：有意不接通。`design.md` 降级铁律（"降级只收紧不放松，不存在降级到放行的路径"）决定了 `--no-worktree` 即使接通也无实用价值：

- 单独使用：execute 跳过 worktree 创建，但 hook 仍按 `isNoWorktreeMode` 拦截主仓库源码写入 → 写不了代码。
- 叠加 `SILLYSPEC_DISABLE_HOOKS=1`：能写，但那时 flag 多余（`DISABLE_HOOKS` 已全放行）。

worktree 创建失败的逃生口是 `sillyspec worktree doctor --fix` / 手动清理（`run.js` execute 块的三步提示），不是 `--no-worktree`。`buildExecuteSteps()` 的 `noWorktree` 参数、`changes.no_worktree` 列、`isNoWorktreeMode()` 读端是为该模式预留的基础设施，保留但无 CLI 写入入口。

不要再尝试接通此 flag，除非先重审降级铁律（例如给平台模式开 apply 绕过特例）。
