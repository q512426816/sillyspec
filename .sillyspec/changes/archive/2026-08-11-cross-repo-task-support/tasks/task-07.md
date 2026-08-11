---
id: task-07
title: gates reviewGitDir 按 ctx.resolve main 兜底 + Task Review Gate per-task 按 repo 切 + runVerifyTestCheck 透传 ctx（覆盖：FR-06, FR-08, D-007, D-013）
title_zh: gates reviewGitDir 与 Task Review Gate 跨仓切 gitDir
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P0
depends_on: [task-01, task-04]
blocks: []
requirement_ids: [FR-06, FR-08]
decision_ids: [D-007, D-013]
allowed_paths:
  - src/run/gates.js
  - test/stage-completion-atomicity.test.mjs
  - test/agent-gate-hardening.test.mjs
  - test/stage-review.test.mjs
expects_from:
  task-01:
    - contract: MultiRepoContext
      needs: [resolve]
  task-04:
    - contract: TaskReviewValidation
      needs: [perRepoGitDir]
goal: >
  gates reviewGitDir 改 ctx.resolve main 兜底，Task Review Gate 每 task 按 review.repo 切跨仓 gitDir，runVerifyTestCheck 调用点透传 ctx，未注册 repo fail-closed。
implementation:
  - reviewGitDir 改 ctx.resolve main 的 gitDir 兜底，in-place-fallback 时 worktreePath 空用 cwd
  - Task Review Gate 循环每 task 按 review.repo 切 gitDir（消费 task-04 多仓化 validateTaskReviews）
  - runVerifyTestCheck 调用点透传 ctx 给 task-06 的 per-repo cwd
  - 约束② fail-closed 校验未注册 repo 与跨仓 git 不可用阻断
acceptance:
  - reviewGitDir 单仓退化 main gitDir 零回归
  - Task Review Gate 跨仓 task 按其 repo 切跨仓 gitDir 校验
  - in-place-fallback 时 worktreePath 兜底 cwd
  - 未注册 repo 或跨仓 git 不可用阻断
verify:
  - npm test
constraints:
  - reviewGitDir 兜底与 task-review.js:724 in-place 逻辑同源
  - Task Review Gate 依赖 task-04 的 validateTaskReviews 多仓化
  - 约束② fail-closed 不沿用主仓 unavailable 降级
related_tests:
  - path: test/stage-completion-atomicity.test.mjs
    reason: reviewGitDir 与 gate 逻辑变更可能致断言失效
  - path: test/agent-gate-hardening.test.mjs
    reason: Task Review Gate 跨仓切 gitDir 改造
---

# task-07：gates reviewGitDir 与 Task Review Gate 跨仓切 gitDir

## 上下文（源码锚点，`src/run/gates.js`）

- **reviewGitDir**：gates.js:357-366。当前 `let reviewGitDir = cwd` + 读 `wm.getMeta(changeName).worktreePath`（:363 `meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath)` 兜底）。改为 `ctx.resolve('main').gitDir` 兜底，in-place-fallback 时 `worktreePath` 空→用 cwd（与 task-review.js:724 同源逻辑）。
- **Task Review Gate**：gates.js:324-397。`validateTaskReviews({ planContent, runtimeRoot, executeRunId, changeDir, gitDir: reviewGitDir })`（:368）单 `gitDir` 调用。改为每 task 按 `review.repo` 切跨仓 gitDir（消费 task-04 多仓化的 `validateTaskReviews`，循环内 `ctx.resolve(review.repo ?? 'main').gitDir`）。
- **runVerifyTestCheck 调用点**：gates.js:223 `runVerifyTestCheck({ cwd, specBase, changeName })`。透传 `ctx` 给 task-06 的 per-repo cwd（跨仓仓 npm test 在跨仓仓根跑）。
- **enforceReviewJsonGate**：gates.js:112-144（`validateCheckedTaskReviews` 单仓调用，本 task 不改其 schema 校验，仅保持与新 ctx 透传链兼容）。

## 关键约束

- **约束② fail-closed（D-007）**：未注册 repo / 跨仓 git 不可用必须阻断 execute 完成（不沿用主仓 `verifyReviewGitEvidence` unavailable 降级，task-review.js:500-510 那是主仓容错；跨仓不可用是 local.yaml 配置错）。MultiRepoContext（task-01）构造期已 fail-closed，本 task 的 gate 层只需让 `ctx` 透传到位、不重新降级。
- **G2 进程级 ctx（D-013）**：ctx 由 execute 启动入口（task-09）构造一次贯穿 apply/verify，本 task 在 gates 的两个调用点（reviewGitDir / runVerifyTestCheck）消费同一 ctx 实例。
- **in-place-fallback 同源**：reviewGitDir 兜底逻辑必须与 task-review.js:724 的 in-place-fallback 处理一致（`worktreePath` 空用 cwd），避免两处漂移。

## 依赖

- **task-01**：提供 `MultiRepoContext`（`resolve(repoKey)` 返回 RepoEntry 含 `gitDir`）。
- **task-04**：提供多仓化的 `validateTaskReviews`（按 `review.repo` 切 gitDir 的循环逻辑）。

## 不在本 task 范围

- `MultiRepoContext` 构造逻辑（task-01）。
- `validateTaskReviews` 内部多仓循环实现（task-04）。
- `runVerifyTestCheck` 内部 per-repo cwd 实现（task-06）。
- execute 启动入口 ctx 构造与调用链透传（task-09）。
