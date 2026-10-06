---
author: flow-machine-draft
created_at: 2026-10-06T11:32:00.197Z
---
# 提案书（Proposal）— 2026-10-06-resume-title

## 动机

任务原话转写：flow status 已显示变更标题（2026-10-06-flow-status-title），但 flow start 重入的恢复简报（printRecoveryBriefing）仍只打变更名——断点恢复场景与 status 查看面信息不对齐。补齐：恢复简报头行后显示标题（有则显示）。

成功标准：
- DB 登记过非空 title 的活跃变更重入 flow start，恢复简报在「🔁 flow start 恢复简报（重入）」行后显示「- 标题：<title>」行，文本与进度库登记值逐字一致
- 无 DB/无 title 时恢复简报与现状逐字一致（不新增标题行）
- 标题读取复用 getChangeTitle 单源（不另开读取路径）

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. DB 登记过非空 title 的活跃变更重入 flow start，恢复简报在「🔁 flow start 恢复简报（重入）」行后显示「- 标题：<title>」行，文本与进度库登记值逐字一致
2. 无 DB/无 title 时恢复简报与现状逐字一致（不新增标题行）
3. 标题读取复用 getChangeTitle 单源（不另开读取路径）

## 成功标准（可验证）

1. DB 登记过非空 title 的活跃变更重入 flow start，恢复简报在「🔁 flow start 恢复简报（重入）」行后显示「- 标题：<title>」行，文本与进度库登记值逐字一致
2. 无 DB/无 title 时恢复简报与现状逐字一致（不新增标题行）
3. 标题读取复用 getChangeTitle 单源（不另开读取路径）
