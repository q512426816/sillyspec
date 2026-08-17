---
author: qinyi
created_at: 2026-08-16T23:15:20+08:00
updated_at: 2026-08-16T23:15:20+08:00
---

# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| execute/apply/docs 三链路 | 修复对象 |
| 多 agent 并发环境 | 触发条件（并行会话改 src/main） |
| 审计（quick-audit/docsCheckHint） | #3 提示载体 |

## 功能需求

### FR-01: run 目录创建原子化与不变量
覆盖决策：D-001@v1
Given execute 启动或 fallback 补写 marker
When marker 写入（stage.js:96-112 主点 / gates.js:444 / prompt.js:518 / task-review.js:795 四处）
Then 先 mkdirSync execute-runs/<runId>/tasks 再写 marker（不变量：marker 在则目录在）；失败分层——stage 主点 throw / gates gate 内 throw / prompt console.error 降级 / task-review 去静默保 fail-open

### FR-02: applyByMerge 预对齐
覆盖决策：D-002@v1
Given worktree 分支 baseline checkpoint 含并行会话文件且 main 已推进
When `worktree apply --merge`
Then 预对齐过滤集（`git diff baseHash..baselineCommit` 已提交口径 ∩ main 已推进 ∖ 分支已变更 ∖ 工作区 dirty）逐文件 `git checkout main -- <file>` + commit 后再 merge——并行文件不冲突、交付文件正常合并、dirty 文件跳过走降级

### FR-03: 活文档漂移提示
Given 本次审计 changedFiles 与活文档（platform-interface-map.md 等）引用的源码文件有交集
When quick --done 审计
Then docsCheckHint.livingDocDrift 提示"改动被活文档引用，建议顺手跑 docs check 修引用"（advisory 不阻断）

## 非功能需求

- 兼容性：#1 不变量对读侧（resolveLatestExecuteRunIdWithTasks）透明；#2 降级路径保底；#3 纯提示
- 可回退：三修复相互独立，可单独 revert
- 可测试：三个新测试文件（fail-loud 分层/预对齐+dirty/交集提示）

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 四写入点+分层 fail 语义 |
| D-002@v1 | FR-02 | 候选集已提交口径+dirty 保护 |
