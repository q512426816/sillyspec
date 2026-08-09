---
id: task-06
title: 全量 npm test + npm run lint 全绿 + stage 完成 E2E 回归（覆盖：FR-07）
title_zh: 验收门禁：全量测试 + lint + 回归
author: qinyi
created_at: 2026-08-09 14:10:00
priority: P0
depends_on: [task-05]
blocks: []
requirement_ids: [FR-07]
allowed_paths: []
goal: >
  验收门禁：全量 npm test + npm run lint 全绿，stage 完成 E2E 回归（confirm persist 移后行为不变：gate 全过→completed，gate 失败/异常→in-progress），grep 反向断言 persist 在 gate 后。
implementation:
  - node test/run-tests.mjs（全量 npm test）。
  - node test/check-syntax.mjs（npm run lint）。
  - stage 完成 E2E 回归套件独立直跑（stage-completion-atomicity + 既有 stage/complete/gate 相关）。
  - grep 反向断言：三处完成分支 persist（pm._write completed）在 completeStageGates 调用之后（非之前）。
acceptance:
  - npm test 全绿（N/0）；npm run lint 全绿。
  - stage 完成 E2E 回归全绿。
  - grep 反向断言 persist 在 gate 后。
verify:
  - npm test
  - npm run lint
constraints:
  - 本 task 无代码产出（验收门禁）；base=head。
  - 不改 src/test（仅跑测试）；如发现回归，归源头 task 修。
---
