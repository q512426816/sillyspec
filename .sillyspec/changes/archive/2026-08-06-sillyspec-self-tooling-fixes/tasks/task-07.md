---
id: task-07
title: 全量回归（npm test + lint）
title_zh: 全量回归（npm test + lint）
author: qinyi
created_at: 2026-08-06T09:42:00+08:00
priority: P0
depends_on: [task-01, task-02, task-03, task-04, task-05, task-06]
blocks: []
requirement_ids: [FR-01, FR-02, FR-03, FR-04, FR-05]
decision_ids: [D-01@v1, D-02@v1, D-03@v1, D-04@v1, D-05@v1]
allowed_paths:
  - package.json
goal: |
  全量测试 + lint 全绿回归。包含 task-01~04 新增/修改的 4 个 test 文件 + 既有套件
  无回归（worktree-apply-meta-exclude 已在 task-03 同步断言）。本 task 纯跑测试不改源码。
implementation: |
  - npm test（含新增 test/stage-review-marker-auto.test.mjs / test/archive-cli-git-add.test.mjs
    + 修改的 test/stage-contract.test.mjs / test/worktree-apply-meta-exclude.test.mjs）。
  - npm run lint （lint 脚本 = node test/check-syntax.mjs，0 错）。
  - 既有测试无回归确认（worktree-apply-meta-exclude 断言已 task-03 同步）。
acceptance: |
  - npm test 全绿（exit 0）。
  - npm run lint 0 错（exit 0）。
  - 既有测试无回归（filterDeliverableFiles 行为变更的 worktree-apply-meta-exclude 已 task-03 同步）。
verify: |
  npm test && npm run lint
constraints: |
  - 不改源码（纯跑测试，allowed_paths 仅 package.json 作回归入口）。
  - 失败回 task-01~06 修，不在本 task 改代码。
  - worktree-apply-meta-exclude.test.mjs 断言变更已在 task-03 完成（不是回归漏同步）。
---

# task-07: 全量回归

task-01~06 全部落地后跑全量测试 + lint 守护。本 task 纯验证，不改源码。

## 依据
- plan.md「全局验收标准」6：npm test + npm run lint 全绿，既有测试无回归。
- package.json scripts：test = node test/run-tests.mjs / lint = node test/check-syntax.mjs。
- CLAUDE.md 核心规则 8：实证核验再 --done（触及 src/test 的改动先 npm test + npm run lint）。
