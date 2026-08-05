---
id: task-01
title: H1 checkDepsFreshness + 单测
title_zh: 抽共享 checkDepsFreshness 统一 doctor/ensureDepsFreshness 依赖判定
author: qinyi
created_at: 2026-08-05 22:13:45
priority: P0
depends_on: []
blocks: [task-03, task-04]
requirement_ids: [FR-07]
decision_ids: [D-01@v1]
allowed_paths:
  - src/worktree-deps.js
  - test/worktree-deps.test.mjs
provides:
  - contract: checkDepsFreshness
    fields: [status, detail, wtHash, mainHash, metaLockHash]
---

## goal
抽 `checkDepsFreshness(meta, wtPath, mainCwd)` 统一 doctor（worktree.js:908-928）与 ensureDepsFreshness（stage.js:396-423）的 deps 判定，新增 `main-drift` 状态（wtHash≠mainHash，复用 linkOneDir worktree-deps.js:177-178 的 mismatch 判据）。

## implementation
在 worktree-deps.js 新增 export `checkDepsFreshness(meta, wtPath, mainCwd)`：
- 复用 `lockfileHash`(23-36) 算 `wtHash=lockfileHash(wtPath)`、`mainHash=lockfileHash(mainCwd)`，`metaLockHash=meta.depsLockHash`。
- 判定优先级（对齐 doctor 914-920 + ensure 402-404）：`failed`(meta.depsStatus==='failed') → `missing`(['linked','installed'].includes(depsStatus) 且 !existsSync(node_modules)) → `stale`(metaLockHash && wtHash && wtHash!==metaLockHash) → `main-drift`(wtHash && mainHash && wtHash!==mainHash) → `fresh`。
- 返回 `{status∈{fresh,missing,stale,main-drift,failed}, detail, wtHash?, mainHash?, metaLockHash?}`。

## acceptance
- test/worktree-deps.test.mjs 覆盖 5 个状态各一例。
- wtHash≠mainHash（且非 stale）→ `status=main-drift`。
- 本 task 不改 doctor / ensureDepsFreshness 调用方（task-03 改 doctor、task-04 改 ensureDepsFreshness 接入）。
- lockfileHash / linkOneDir / provisionDeps / tryLink 签名与行为不变。

## verify
`node test/worktree-deps.test.mjs`（绿）。task-03/04 接入前 doctor/ensure 行为不变，无需跑 worktree-doctor 套件。

## constraints
- 保持 lockfileHash(23-36) / linkOneDir(172-183) / provisionDeps(196-267) 不变。
- 不改调用方（doctor 908-928、ensureDepsFreshness 396-423）。
- 路径用 `join`，Windows/Linux 兼容（与现有代码一致）。

## related_tests
- test/worktree-deps.test.mjs（本 task 新增 5 状态用例）
- test/worktree-doctor.test.mjs（task-03 会改，本 task 不动）
