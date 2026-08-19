---
id: task-04
title: add-zero-diff-guard-to-auto-check-task
title_zh: 勾选层零 diff 守卫
author: qinyi
created_at: 2026-08-19 11:50:00
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-002@v1]
allowed_paths:
  - src/run/complete.js
provides:
  contract: AutoCheckCtx
  fields:
    - gitDir
    - base
    - head
expects_from: {}
goal: >
  shouldAutoCheckTask 加 ctx 可选参数，草稿且实测 diff 非空才勾选
implementation:
  - shouldAutoCheckTask 签名加第三参数 ctx 可选
  - ctx 存在且 review 为自动草稿时额外校验 changedFiles 非空且 git diff 实测非空
  - autoCheckPlanFromReviews 内构造 ctx（getMeta 取 baselineCommit/baseHash，gitDir 分 worktree/cwd，head rev-parse HEAD）
  - ctx 缺省调用点保持现行判定
acceptance:
  - 直接导入 shouldAutoCheckTask 断言行为（草稿零 diff 不勾、草稿实测 diff 勾、ctx 缺省现行）
  - endToEnd task 草稿仍需双 pass（零 diff 不影响）
  - 自动草稿识别用 reviewerNotes 前缀（无 schema 变更）
verify:
  - cd C:/Users/qinyi/IdeaProjects/sillyspec && npm test
constraints:
  - ctx 可选参数保向后兼容
  - 实测 diff 带 changedFiles 路径限定
  - 审计日志补充
related_tests:
  - path: test/execute-batch-endtoend-checkbox.test.mjs
    reason: 直接 import shouldAutoCheckTask 断言，签名变更需回归
---
