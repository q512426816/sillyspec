---
id: task-02
title: handleQuickStageCompletion 接入 closeQuickLinkedChanges
title_zh: handleQuickStageCompletion 接入 closeQuickLinkedChanges
author: qinyi
created_at: 2026-08-17T09:45:00+08:00
priority: P0
depends_on: [task-01]
blocks: [task-04]
allowed_paths:
  - src/run/complete-handlers.js
goal: |
  在 quick --done 完成路径调用 closeQuickLinkedChanges，确保关联变更在 QUICKLOG 条目翻完成、task 勾选后自动归档。
implementation: |
  在 handleQuickStageCompletion 函数内，completeQuicklogEntry 之后、清理 session 目录 / 注销 quick-<hex> 之前调用 closeQuickLinkedChanges。
acceptance: |
  - quick --done 关联全完成变更 → 自动归档。
  - quick --done 关联未完成变更 → 提示但不归档。
  - 无 linkedChanges → 无额外副作用。
verify: |
  跑 test/quick-close-linked-changes.test.mjs + quick-cli-managed-e2e.test.mjs。
constraints: |
  - 只改 src/run/complete-handlers.js。
  - 调用点必须在 task 勾选之后，否则判定不准确。
---
# task-02: 接入 closeQuickLinkedChanges
见 frontmatter。
