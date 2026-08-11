---
id: task-04
title: task-review 多仓化 A1/A2/A7 + base/head 双锡点接入（覆盖：FR-06, D-006, D-010）
title_zh: task-review 跨仓 gitDir 切换与 base/head 双锡点
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P0
depends_on: [task-01, task-02]
blocks: []
requirement_ids: [FR-06]
decision_ids: [D-006, D-010]
allowed_paths:
  - src/task-review.js
  - test/machine-interface.test.mjs
  - test/stage-completion-atomicity.test.mjs
  - test/backfill-reviews.test.mjs
  - test/task-review-draft.test.mjs
  - test/run-complete-step-execute-batch.test.mjs
expects_from:
  task-01:
    - contract: MultiRepoContext
      needs: [resolve]
  task-02:
    - contract: TaskCardRepo
      needs: [repo, base_commit, head_commit]
goal: >
  task-review 三处（证据校验/草稿落盘/schema）多仓化，按 review.repo 切跨仓 gitDir，base/head 读 task 卡双锡点，schemaVersion 升 2 向后兼容。
implementation:
  - A1 verifyReviewGitEvidence 加 repo 参数，gitDir 改 ctx.resolve(review.repo 或 main).gitDir
  - A2 generateTaskReviewDrafts 跨仓 base 取 task卡base_commit、head 取 task卡head_commit 双锡点
  - A7 validateReviewSchema 加 review.repo 可选字段，REVIEW_SCHEMA_VERSION 1 升 2，旧 v1 无 repo 视 main
  - validateTaskReviews 循环按 review.repo 切 gitDir 跑 rev-parse/diff
acceptance:
  - 跨仓 task review.json（repo 加跨仓 commit）过 Task Review Gate
  - v1 review.json（无 repo）向后兼容视 main 不阻断既有 change
  - 双锡点 base..head diff 在跨仓仓根跑，不跨 task 漂移
verify:
  - npm test
constraints:
  - schemaVersion 1→2 向后兼容（v1 无 repo 视 main，R-07）
  - 跨仓 gitDir=跨仓仓根（约束①）
  - 双锡点 head 用 task卡head_commit 非瞬时 HEAD（D-010）
related_tests:
  - path: test/machine-interface.test.mjs
    reason: validateTaskReviews 签名扩展可能致断言失效
  - path: test/task-review-draft.test.mjs
    reason: generateTaskReviewDrafts 跨仓锡点改造
---
