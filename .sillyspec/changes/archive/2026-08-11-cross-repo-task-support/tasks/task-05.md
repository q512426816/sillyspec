---
id: task-05
title: worktree-apply 跨仓 no-op A3/A4/A5（覆盖：FR-07, D-002, D-009）
title_zh: worktree-apply 跨仓 no-op 与主仓原 apply 路径区分
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P0
depends_on: [task-01, task-02]
blocks: []
requirement_ids: [FR-07]
decision_ids: [D-002, D-009]
allowed_paths:
  - src/worktree-apply.js
  - test/worktree-allow-list-violations.test.mjs
  - test/stage-completion-atomicity.test.mjs
expects_from:
  task-01:
    - contract: MultiRepoContext
      needs: [resolve, repos]
  task-02:
    - contract: TaskCardRepo
      needs: [repo]
goal: >
  applyWorktree 按 ctx 区分主仓与跨仓，主仓走原 A5 patch apply，跨仓 no-op（commit 已落主干，仅校验 head 加跳过 cleanup），不复用 A5 patch 路径。
implementation:
  - applyWorktree 主流程按 ctx 判断主仓与跨仓（非 per-repo for 循环）
  - 主仓 task 走原 A5 路径（worktree patch 到 git apply --3way 到主仓主干 加 wm.cleanup）
  - 跨仓 task 走 no-op（校验 review.head 是跨仓真实 commit 加 跳过 wm.cleanup，无 patch）
  - resolveApplyAllowSet 返回 Map keyed by repo，allowed_paths 基准为各 repo 自身根
acceptance:
  - 主仓 task 走原 apply 路径零行为变化
  - 跨仓 task apply 为 no-op，校验 head 真实 commit 且不调 wm.cleanup
  - 跨仓改动不进主仓（数据所有权 GOAL-3）
  - resolveApplyAllowSet 按 repo 切片返回
verify:
  - npm test
constraints:
  - 跨仓仓无 worktree 无 meta 无分支（NG-1 NG-3），A5 patch 路径不可复用故 no-op（D-009）
  - filterDeliverableFiles 逻辑不变，跨仓交付物是跨仓仓源码不经主仓 apply
  - 单仓场景走原 apply 零回归（GOAL-2）
related_tests:
  - path: test/worktree-allow-list-violations.test.mjs
    reason: resolveApplyAllowSet 返回结构变更可能致断言失效
---
