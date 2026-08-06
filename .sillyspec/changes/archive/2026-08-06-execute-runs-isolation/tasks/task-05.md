---
id: task-05
title: npm test + npm run lint 全绿回归
title_zh: npm test + npm run lint 全绿回归
author: qinyi
created_at: 2026-08-06T14:07:45+08:00
priority: P0
depends_on: [task-01, task-02, task-03, task-04]
blocks: []
requirement_ids: []
decision_ids: [D-05]
allowed_paths:
  - bin/sillyspec.js
provides:
  - contract: regressionGreen
    fields: [npmTestPass, npmRunLintPass]
    desc: "npm test 全绿（含 T-01..T-08 + 既有套件零回归）+ npm run lint 通过"
expects_from:
  task-02:
    - contract: allRuntimeRootSitesResolved
      needs: [sitesCount]
  task-03:
    - contract: isolationTestSuite
      needs: [caseCount]
  task-04:
    - contract: docsSynced
      needs: [fileLifecycleUpdated]
goal: |
  design §9 AC-7/AC-8 收尾：全量 npm test（含新增 T-01..T-08 + 既有套件零回归）+ npm run lint 通过。
  本 task 无代码改动，只跑回归（allowed_paths 空）。
implementation: |
  - npm test 全量跑既有测试套件 + 新增 test/execute-runs-isolation.test.mjs（task-03 落地后）。
    关注既有 runtimeRoot / worktree / drift / stage-review / execute-runs 相关测试是否零回归
    （task-02 改 14 站点公式，可能影响 marker 路径断言）。
  - npm run lint 全量跑（本变更不改 lint 规则，预期无新增 warning）。
  - 若既有测试断言失效（非新测试逻辑误）：修逻辑（task-01/02 源码）非修测试（CLAUDE.md 规则 11）。
acceptance: |
  - npm test 全绿（exit 0）。
  - npm run lint 通过（exit 0）。
  - 既有套件零回归（对比本 change 前的 baseline）。
verify: |
  npm test
  npm run lint
constraints: |
  - 无代码改动（allowed_paths 空），纯回归。
  - 既有测试断言失效时修源码逻辑非修测试（CLAUDE.md 规则 11）。
  - Windows / Linux 跨平台跑（NFR-02）；本环境 Windows，CI 补 Linux。
related_tests: []
---

# task-05: npm test + npm run lint 全绿回归

design §9 AC-7/AC-8 收尾。无代码改动（allowed_paths 空），纯回归——task-01..04 全落地后跑全量测试 + lint。

## 依据
- design.md §9 AC-7（npm test 全绿）/ AC-8（npm run lint 通过）
- requirements.md NFR-01（零回归）/ NFR-02（跨平台）
- CLAUDE.md 规则 8（实证核验再 --done）/ 规则 11（非测试逻辑误时禁改测试通过）
