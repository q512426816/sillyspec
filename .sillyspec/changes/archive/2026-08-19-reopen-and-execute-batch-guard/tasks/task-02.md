---
id: task-02
title: block-complete-stage-with-stale-steps
title_zh: progress complete-stage stale 拒绝
author: qinyi
created_at: 2026-08-19 11:50:00
priority: P0
depends_on: []
blocks: [task-03]
requirement_ids: [FR-02]
decision_ids: [D-001@v1]
allowed_paths:
  - src/progress/stage-machine.js
  - test/progress-complete-stage.test.mjs
provides: {}
expects_from: {}
goal: >
  progress complete-stage 遇到 stale 步骤时拒绝执行，需 --force 才放行
implementation:
  - 定位 src/progress/stage-machine.js completeStage 函数第 36-119 行
  - 在第 88 行 UPDATE stages SQL 执行前检查该阶段 steps 是否含 stale 状态
  - 存在 stale 步骤时打印错误信息列出 stale 步骤名并提示用 --force
  - 直接 return 阻止后续 SQL 执行，已有 --force 路径第 67-76 行审计逻辑不变
  - 检查逻辑需读该阶段所有步骤的 status 字段
acceptance:
  - 无 --force 时 complete-stage 遇 stale 拒绝并列出 stale 步骤
  - 带 --force 时按既有审计路径通过并记录审计日志
  - 第 95 行 SQL 回填只在通过 stale 检查后执行
verify:
  - cd C:/Users/qinyi/IdeaProjects/sillyspec && npm test
constraints:
  - 检查点需在 SQL transaction 内执行前，避免部分状态污染
  - --force 逃生门保持既有审计行为不变
  - 只检查 completeStage 指定阶段，不涉及其他阶段
related_tests:
  - path: test/progress-complete-stage.test.mjs
    reason: completeStage 新增 stale 拒绝会改变既有断言语境

---
