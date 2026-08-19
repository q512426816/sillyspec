---
id: task-05
title: add-per-task-review-check-to-batch-finish
title_zh: 批量层逐 task 复核
author: qinyi
created_at: 2026-08-19 11:50:00
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-002@v1]
allowed_paths:
  - src/run/complete.js
provides:
  contract: BatchFinishResult
  fields:
    - blockedTasks
expects_from: {}
goal: >
  detectExecuteBatchFinish 逐 task 复核，草稿零 diff 阻断并返回 blockedTasks
implementation:
  - detectExecuteBatchFinish 在 plan 全勾后逐 task 读 review.json
  - review 缺失或为自动草稿且有效 diff 为空时加入 blockedTasks 列表
  - 返回值新增 blockedTasks 字段（task id 数组）
  - reason 文案引用 blockedTasks 列表提示
acceptance:
  - plan 全勾但零 diff task 被 blockedTasks 捕获
  - 批量放行需所有 task 通过复核
  - blockedTasks 返回值格式与接口定义一致
verify:
  - cd C:/Users/qinyi/IdeaProjects/sillyspec && npm test
constraints:
  - 代码核验保持整变更级不变（checkExecuteCodeEvidence）
  - 只对 CLI 自动生成草稿判定（reviewerNotes 前缀）
  - 复核逻辑在代码核验通过后执行
related_tests:
  - path: test/execute-batch-endtoend-checkbox.test.mjs
    reason: 批量完成测试需覆盖 blockedTasks 场景
---
