---
author: flow-machine-draft
created_at: 2026-10-20T23:35:25.993Z
---
# 任务注册表（Tasks）— 2026-10-21-review-rerun-scope

- [x] task-01: 任务书含复跑口径五要素：变更测试面/合并一次跑/全量禁止（ledger+pre-push 双重已覆）/回执抽验/日志落盘
- [x] task-02: 材料包 testReceipt 子源：findLatestTestReceipt(verifyRunsDir, change) 纯扫描 fail-soft 取最新匹配；assembleReviewPack 渲染回执行（ran_at/status/exit/耗时/命令面截断）；缺席零注入
- [x] task-03: 新增测试锁口径锚与回执装配（在场/缺席/多轮取最新）；变更测试面+lint 绿（scoped 口径自验）
