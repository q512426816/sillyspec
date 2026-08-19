---
id: task-06
title: add-regression-tests-for-zero-diff-guard
title_zh: 零 diff 守卫回归测试
author: qinyi
created_at: 2026-08-19 11:50:00
priority: P0
depends_on: [task-04, task-05]
blocks: []
requirement_ids: [FR-07]
decision_ids: []
allowed_paths:
  - test/execute-batch-zero-diff.test.mjs
provides: {}
expects_from:
  - contract: AutoCheckCtx
    needs:
      - gitDir
      - base
      - head
    provider: task-04
  - contract: BatchFinishResult
    needs:
      - blockedTasks
    provider: task-05
goal: >
  覆盖草稿零 diff 场景三层守卫（勾选/批量/生成）锁定既有逻辑
implementation:
  - 新建 test/execute-batch-zero-diff.test.mjs
  - 测试草稿零 diff 不勾选（shouldAutoCheckTask 断言）
  - 测试批量层 blockedTasks 返回（detectExecuteBatchFinish 断言）
  - 测试生成层空 changedFiles 跳过（generateTaskReviewDrafts 断言）
  - 覆盖 ctx 缺省/真实 review 混合场景
acceptance:
  - 草稿零 diff 不自动勾选且被 blockedTasks 捕获
  - 真实 pass review 不受零 diff 守卫影响
  - 生成器空 changedFiles 跳过逻辑断言通过
verify:
  - cd C:/Users/qinyi/IdeaProjects/sillyspec && npm test
constraints:
  - 测试需构造自动草稿 reviewerNotes 前缀
  - 实测 diff 用 git diff 命令或 mock
  - 端到端 task 需双 pass（specVerdict 与 qualityVerdict）
related_tests:
  - path: test/execute-batch-endtoend-checkbox.test.mjs
    reason: 批量完成既有测试需零 diff 守卫兼容
---
