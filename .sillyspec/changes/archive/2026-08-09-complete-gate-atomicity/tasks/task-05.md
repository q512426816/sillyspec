---
id: task-05
title: 新增 test/stage-completion-atomicity.test.mjs（completeStageGates 异常兜底 rollback + runStageCompletionGates throw rollback + 原子性）（覆盖：FR-06）
title_zh: stage 完成原子性与异常兜底测试
author: qinyi
created_at: 2026-08-09 14:10:00
priority: P0
depends_on: [task-01, task-02, task-03, task-04]
blocks: [task-06]
requirement_ids: [FR-06]
allowed_paths:
  - test/stage-completion-atomicity.test.mjs
goal: >
  验证 completeStageGates 整体 try/catch 异常兜底（任一段 throw → rollbackCompletionAndReturn 返回未完成对象，不冒顶 exit 1）+ runStageCompletionGates 内 runValidators/runVerifyTestCheck throw rollback + persist 移后原子性（gate 异常/失败 DB 不留假 completed）。
implementation:
  - 用临时 spec-dir 构造最小 progress fixture（stageData + steps 全 completed）。
  - mock runValidators 抛非结构化异常 → 断言 completeStageGates 返回 {stageCompleted:false,...}（rollback 对象），不 throw；stageData.status 回 in-progress。
  - mock runVerifyTestCheck 抛异常 → 同上 rollback（verify 阶段）。
  - mock validateMetadata/validateFileLocations 抛 → 同上（验证 :554-621 整体覆盖）。
  - 原子性：gate 抛异常后断言 DB（或 progress 对象）stageData.status 非 completed（persist 移后保证）。
acceptance:
  - test/stage-completion-atomicity.test.mjs 存在，4+ 用例（runValidators throw / runVerifyTestCheck throw / validateMetadata throw / 原子性）全 PASS。
  - mock 注入异常 → rollback 返回对象 + stageData.status in-progress，不冒顶。
verify:
  - node test/stage-completion-atomicity.test.mjs（独立直跑）
  - npm test
constraints:
  - 只新增 test/stage-completion-atomicity.test.mjs；不改 src（task-01~04 已改）。
  - mock 异常注入用模块 spy/替换（不真跑全量测试）。
---
