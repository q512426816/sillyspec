---
id: task-04
title: full regression and doc sync check
title_zh: 全量回归测试与文档同步核查
author: qinyi
created_at: 2026-08-10 12:16:03
priority: P1
depends_on:
  - task-03
blocks: []
allowed_paths:
  - src/index.js
goal: >
  task-01 至 task-03 落地后跑全量回归确认零回归，并核查 index.js 是否有集中命令注册表或帮助文案
  需补登 register-stage-review，以及确认本变更不触及 src/stages 故文件生命周期与提示词文档无需同步。
implementation:
  - 跑 npm test 全量确认 EXIT 0 含新 test/stage-review-register.test.mjs 含现有 stage-review 套件零回归
  - 跑 npm run lint 确认绿 含 test 目录内容规则
  - grep index.js 查是否存在集中命令列表或 help 文案 需补 register-stage-review 登记有则补
  - 确认本变更不改 src/stages 下任何阶段定义 故 file-lifecycle 与 docs prompt 无需同步
  - 确认不动 gate 语义 enforceReviewJsonGate validateStageReview getLatestStageReviewRunId 零改
acceptance:
  - npm test 全量 EXIT 0 失败为 0
  - npm run lint 绿 文件数符合预期
  - index.js 若有命令注册表则 register-stage-review 已登记 若无则记录无需补
  - 文件生命周期与提示词文档同步判定有据 无需同步则记理由
verify:
  - npm test 全量输出 EXIT 0
  - npm run lint 输出 LINT EXIT 0
  - grep 结果留证
constraints:
  - 纯验证 task 不改源码逻辑 allowed_paths 仅 src/index.js 作被验证入口
  - 若发现需补命令注册表导致第 4 个文件改动则重估 tier 但补文案非实质逻辑
  - 触及 src/stages 否 否故文档同步免 对齐 CLAUDE.md 文件生命周期同步规则
  - FR-06 NFR-01 到 NFR-04 的回归确认
---

# task-04：全量回归 + 文档同步核查

纯验证 task，不改源码。allowed_paths 仅 src/index.js（被验证的关键入口）。依赖 task-03 测试落地。
