---
id: task-04
title: ensureDepsFreshness 改调 H1 + gates 文案对齐
title_zh: execute 入口自检改调共享 checkDepsFreshness + deps gate 提示对齐
author: qinyi
created_at: 2026-08-05 22:13:45
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-07]
decision_ids: [D-01@v1]
allowed_paths:
  - src/run/stage.js
  - src/run/gates.js
expects_from:
  task-01:
    - contract: checkDepsFreshness
      needs: [状态判定]
---

## goal
`ensureDepsFreshness` 内联三判定（noStatus/missing/stale）改调 task-01 共享 `checkDepsFreshness` 去重；`gates.js` enforceDepsGate 提示命令对齐 task-03 已落地的 `doctor --fix --change` 真实入口。

## implementation
- **stage.js ensureDepsFreshness (396-423)**：删去内联 `noStatus/missing/stale` 三判定 (400-405)，改调 `checkDepsFreshness(worktreeMeta, wtPath)`（task-01）；返回非 fresh 时仍按现逻辑 (407-422) `provisionDeps` + 写回 meta。调用点 83 无需动。
- **gates.js enforceDepsGate 提示文案 (87-94)**：`worktreeGone` 分支 89 已含 `--change`，确认 `--fix` 分支 93 `sillyspec worktree doctor --fix${changeName ? ` --change ${changeName}` : ''}` 在 task-03 实现 `--change` 后真实可跑（task-03 已在 wm.doctor 接 `changeName` 过滤）；措辞与 task-03 doctor 行为对齐，不误导。

## acceptance
- `ensureDepsFreshness` 行为等价（仅换判定实现，触发条件 / provisionDeps / meta 写回不变）。
- `enforceDepsGate` 提示命令在 task-03 合入后真实可跑（`doctor --fix --change <name>` 非空操作）。

## verify
`npm test`——覆盖 `ensureDepsFreshness`（worktree-deps-provision 相关）+ gates（test/enforce-deps-gate-diagnostic.test.mjs）；确认无回归。

## constraints
- `ensureDepsFreshness` 行为不变（仅替换判定 helper，复用 task-01 `checkDepsFreshness`）。
- gates 提示不误导：`--change` 仅在 changeName 非空时拼接（保留 93 现有条件拼接，不破坏无 change 场景）。

## related_tests
- test/enforce-deps-gate-diagnostic.test.mjs（gates 提示分支，若断言文案需同步更新）
- test/worktree-deps-provision.test.mjs / test/worktree-inplace-deps.test.mjs（ensureDepsFreshness 间接覆盖，回归确认）
