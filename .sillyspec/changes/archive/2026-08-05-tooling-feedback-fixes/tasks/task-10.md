---
id: task-10
title: 文档同步 + 全量验证
title_zh: 同步 file-lifecycle/prompt/skills/模块文档 + npm test+lint 全绿
author: qinyi
created_at: 2026-08-05 22:13:45
priority: P0
depends_on: [task-01, task-02, task-03, task-04, task-05, task-06, task-07, task-08, task-09]
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/prompt/
  - .claude/skills/
  - .sillyspec/docs/sillyspec/modules/
---

## goal
同步受影响文档 + npm test/lint 全绿收尾。

## implementation
- file-lifecycle.md：防御性核对（无新文件类型/阶段流转，doctor deps-main-drift/postcheck 校验不挪文件），核对后更新 updated_at。
- docs/prompt：重跑 `node docs/prompt/_extract.mjs` 刷新 _extracted.json；同步 plan.md（task-07 改 plan stepReviewPlan 清单）、execute.md/verify.md（task-09 改 execute/verify 铁律触发）；prompt 正文逐字以 _extracted.json 为准，禁手改。
- .claude/skills/：plan/execute/worktree skill 若触及行为则同步。
- 模块文档：worktree.md（doctor deps-main-drift/--change）、runtime.md（cwd 自动锁定/advanced 行）、stages.md（plan postcheck validateTaskCommands）反映改动。
- npm test + npm run lint 全绿。

## acceptance
- npm test 全绿；npm run lint 0 错。
- docs/prompt/_extracted.json 与源码一致；模块文档反映 doctor/cwd/postcheck 改动。
- file-lifecycle updated_at 刷新。

## verify
npm test && npm run lint

## constraints
- 仅文档同步 + 验证，不改 src 逻辑。
- docs/prompt 禁手改 prompt 原文（改源码后重跑脚本）。
- 按 CLAUDE.md 文件生命周期/提示词文档同步规则。

## related_tests
全量套件（守护回归）。
