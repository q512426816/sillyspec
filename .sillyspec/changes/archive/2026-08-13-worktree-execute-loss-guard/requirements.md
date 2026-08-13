---
author: qinyi
created_at: 2026-08-13 14:50:10
---
# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| 开发者 | 用 `worktree cleanup` / execute / apply / reset 管理 worktree 生命周期 |
| CLI | SillySpec 确定性校验层，判定"文件是否落盘" |

## 功能需求

### FR-01: cleanup 检测未落主仓交付变更并 fail-closed 拒绝

覆盖决策：D-001@v1, D-006@v1

Given 调用 `worktree cleanup <name>`（无 --force）且 worktree 存在未落主仓 HEAD 的交付变更（未 commit 且未 apply，或已 commit 未 apply）
When cleanup 执行
Then 返回 `result:'blocked'`，console.error 列出未落主仓文件 + 提示"请先 `sillyspec worktree apply <name>` 或 commit 到分支，或 `--force` 强制清理"，不删除 worktree 目录/分支/meta

边界条件：
Given worktree 无未落主仓交付变更（hasChanges:false）
When cleanup 执行
Then 照常清理（skipped/kept/cleaned/force-cleaned/partial 语义不变）

### FR-02: --force 显式绕过保护

覆盖决策：D-001@v1

Given 调用 `worktree cleanup <name> --force` 且 worktree 有未落主仓交付变更
When cleanup 执行
Then 跳过 fail-closed 保护，照常清理

### FR-03: 已落主仓/已 apply 的变更不误拦（apply 后 cleanup 正常）

覆盖决策：D-006@v1

Given worktree apply 成功（`git apply --3way` 已把交付文件复制到主仓工作区，未 commit、main HEAD 不变）
When apply 后自动 cleanup 执行
Then cleanup 显式传 `force:true`，正常清理（不被误阻）

边界条件：
Given execute reset 触发 cleanup（语义即显式销毁脏态 worktree）
When cleanup 执行
Then 显式传 `force:true`，正常复位

### FR-04: execute 完成时聚合 review.changedFiles 核验落盘

覆盖决策：D-002@v1

Given execute 完成（apply 前），存在最新 execute run 的 task review.json（含 changedFiles）
When CLI 聚合主仓 repo（repo 缺省或 'main'）的 changedFiles 并逐个核验
Then 每个文件存在于 worktree 分支 tree（`git cat-file -e <branch>:<file>`）或 worktree 工作区（existsSync）→ verified

### FR-05: 缺失文件 warn 列清单，非阻断

覆盖决策：D-002@v1

Given 有 review 声称实现的文件既不在分支 tree 也不在工作区
When 阶段级核验执行
Then console.warn「以下声称实现的交付文件既不在分支也不在工作区，疑似空跑/从未落盘」+ 逐文件列出，不 exit、不阻断 execute 完成

### FR-06: 无法核验时保守提示

覆盖决策：D-002@v1

Given worktree 目录不存在或分支不存在（`git rev-parse --verify <branch>` 失败）
When 阶段级核验执行
Then 返回 checked:false，调用方 console.warn「无法核验，请人工确认」，不阻断

## 非功能需求

- 兼容性：无未落主仓交付变更时 cleanup 行为与旧版完全一致；旧 worktree meta 无新字段依赖。
- 可回退：`--force` 保留逃生通道，显式绕过保护。
- 可测试：cleanup 保护 / findMissingDeliverables 均为纯函数可单测；不依赖真实 worktree 外部状态。
- 不引入新运行时文件类型 / DB schema 变更。

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01, FR-02 | cleanup fail-closed 保护 + --force 绕过 |
| D-002@v1 | FR-04, FR-05, FR-06 | execute 阶段级核验（宽松非阻断） |
| D-003@v1 | （范围裁剪） | 不含 progress 摘要绑定 commit sha |
| D-004@v1 | （否决记录） | 否决 task 级强制 commit |
| D-005@v1 | （否决记录） | 否决 auto-WIP commit |
| D-006@v1 | FR-01, FR-03 | apply 后 / reset cleanup 显式 force 绕过保护 |
