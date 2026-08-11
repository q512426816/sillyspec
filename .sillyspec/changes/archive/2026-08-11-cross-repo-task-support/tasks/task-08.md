---
id: task-08
title: buildWavePrompt per-task workdir 切换 + base/head 锡点落盘时机（覆盖：FR-10, D-010, D-012）
title_zh: buildWavePrompt per-task workdir 与双锡点落盘时机
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P0
depends_on: [task-01, task-02]
blocks: [task-09]
requirement_ids: [FR-10]
decision_ids: [D-010, D-012]
allowed_paths:
  - src/stages/execute.js
  - test/dispatch/execute-dispatch-integration.test.mjs
expects_from:
  task-01:
    - contract: MultiRepoContext
      needs: [resolve]
  task-02:
    - contract: TaskCardRepo
      needs: [repo, base_commit, head_commit]
goal: >
  buildWavePrompt 从单 Wave 单 worktreePath 改 per-task Task 调用各传 workdir，跨仓 task 派发前落 base_commit 回收前落 head_commit 双锡点。
implementation:
  - worktreeSection 从单值改多值表，主仓 task 传 workdir 为主仓 worktreePath
  - 跨仓 task 传 workdir 为跨仓仓根，同 Wave 允许主仓加跨仓混合
  - 跨仓 task 派发前 CLI 实时 git rev-parse HEAD 落 task卡base_commit
  - 子代理完成 commit 后 CLI 回收 review 前落 task卡head_commit
  - 跨仓 task prompt 注入 workdir 与 commit 到该仓主干指引
acceptance:
  - 主仓 task workdir 为主仓 worktreePath
  - 跨仓 task workdir 为跨仓仓根
  - 同 Wave 混合 task 各自切 workdir 不强制同 repo
  - 跨仓 task 派发前落 base_commit 回收前落 head_commit
  - prompt 含跨仓仓路径与不经 worktree 的 commit 指引
verify:
  - npm test
constraints:
  - execute 调度模型 :607-699 不改，只改 worktreeSection prompt 内容
  - 同 Wave 允许主仓加跨仓混合，不强制同 repo
  - 锡点落盘是 CLI 职责非子代理
related_tests:
  - path: test/dispatch/execute-dispatch-integration.test.mjs
    reason: buildWavePrompt workdir 切换改造可能致断言失效
---

# task-08：buildWavePrompt per-task workdir 与双锡点落盘时机

## 上下文（源码锚点，`src/stages/execute.js`）

- **buildWavePrompt**：execute.js:466，签名 `(wave, waveIndex, changeDir, worktreePath, options)`。当前单 Wave 接收一个 `worktreePath`，在 worktreeSection（:561-579）注入 Wave 内所有子代理共用。改为按 task 逐个构造 Task 调用——worktreeSection 单值改多值表，主仓 task 传 `workdir` 为 `ctx.resolve('main').worktreePath`（即主仓 worktreePath），跨仓 task 传 `workdir` 为 `ctx.resolve(<repo>).worktreePath`（即跨仓仓根）。
- **worktreeSection**：execute.js:561-579。当前 `worktreePath` 单值三段（强制必传 / JSON 示例单 workdir / 蓝图路径注意）。改为 per-task 表：列出 Wave 内每个 task 的 workdir（主仓 task=主仓 worktreePath，跨仓 task=跨仓仓根），保留 workdir 强制必传与蓝图路径注意段。
- **调度模型**：execute.js:607-699（Wave 主 prompt 框架 / Task Review Gate / 完成后 hook）。**不改**——本 task 只改 worktreeSection 的 prompt 内容（per-task workdir 表 + 跨仓 commit 指引），调度骨架（每 task 独立子代理、Wave 内并行、勾选 checkbox）保持原样。
- **锡点落盘时机**：跨仓 task 派发前 CLI 实时 `git -C <跨仓仓根> rev-parse HEAD` 落 `task卡base_commit`（子代理在此 HEAD 上改+commit）；子代理完成 commit 后 CLI 回收 review 前 `git -C <跨仓仓根> rev-parse HEAD` 落 `task卡head_commit`。锡点是 CLI 职责，**子代理不写 base_commit/head_commit**（与主仓 task 不需锡点保持区分：主仓有 meta.baseHash 单仓不变式，head 取 worktree HEAD）。

## 关键约束

- **D-012 per-task workdir**：buildWavePrompt 从单 Wave 单 worktreePath 改 per-task Task 调用各传 workdir。同 Wave 内允许主仓+跨仓 task 混合（各 task 独立 Task 调用各传 workdir），**不强制同 Wave 同 repo**（design §6 execute.js 行 138 / R-09）。
- **D-010 双锡点时机**：跨仓 task 的 `base_commit`（派发前落）+ `head_commit`（回收 review 前落）双锡点，CLI 两时机落盘，非子代理、非瞬时 HEAD。解决同 Wave 多 task 改同一跨仓仓时 HEAD 推进致 diff 范围漂移或混入他 task 改动（design §5.3 约束① / R-01）。
- **跨仓 task prompt 注入**：跨仓 task 的 Task 调用 prompt 注入「该 task 改 `<repo>` 仓，workdir=`<跨仓仓根>`，直接改+commit 到该仓主干，不经 worktree」（design §6 execute.js 行 138 / §5.4 数据流 Wave 执行段）。
- **调度模型不动**：execute.js:607-699（Wave 主 prompt / Task Review Gate / 完成后 API 端点 artifact hook）全部保持，本 task 只改 worktreeSection（:561-579）的 prompt 内容。

## 依赖

- **task-01**：提供 `MultiRepoContext`（`resolve(repoKey)` 返回 RepoEntry 含 `worktreePath`，主仓=主仓 worktreePath、跨仓=跨仓仓根；`hasCrossRepo()` 判是否含跨仓 task 决定 prompt 是否分叉）。
- **task-02**：提供 task 卡片 `repo` / `base_commit` / `head_commit` frontmatter 解析（`parseRepo` / `parseBaseCommit` / `parseHeadCommit`，与 parseAllowedPaths 同源），供本 task 读 task 的 repo 决定 workdir 切换 + 锡点字段写入位置。

## 不在本 task 范围

- `MultiRepoContext` 构造与 fail-closed 校验（task-01）。
- task 卡片 `repo` / `base_commit` / `head_commit` frontmatter 解析器实现（task-02）。
- execute 启动入口构造 ctx + 调用链透传（shared.js/index.js，task-09）——本 task 假定 buildWavePrompt 已能拿到 `ctx`（经 options 透传或 execute 入口注入）。
- task-review 多仓化（base/head 读锡点、verifyReviewGitEvidence 按 repo 切 gitDir，task-04）。
- 跨仓 task 的 review.json schema / verify per-repo cwd / apply no-op（task-04/05/06）。
