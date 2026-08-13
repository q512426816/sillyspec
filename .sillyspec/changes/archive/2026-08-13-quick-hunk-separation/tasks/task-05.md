---
id: task-05
title: 验证 npm test + lint
title_zh: 验证 npm test + lint
allowed_paths:
  - src/run/shared.js
goal: 相关测试绿 + lint 过 + guard schema 既有断言回归核查
implementation: |
  针对性跑 quick 相关（quick-same-file-concurrent + quick-baseline-dirty-worktree + stage-definitions）+ guard 相关测试（grep 既有 guard.json 断言，避新字段破坏深比较）+ npm run lint 全量。
acceptance: 相关测试绿 + 既有 guard 断言未破坏 + lint 266+ 过
verify: npm test（针对性 + guard 相关）+ npm run lint
constraints: 针对性跑（工作区有并发他者 test 迁移半成品，不全量）+ 必须核查 guard schema 既有断言（plan-review gap2）
depends_on:
  - task-01
  - task-02
  - task-03
  - task-04
---

# task-05: 验证 npm test + lint

针对性 quick + guard 相关测试 + 全量 lint。核查 guard schema 既有断言（plan-review gap2）。
