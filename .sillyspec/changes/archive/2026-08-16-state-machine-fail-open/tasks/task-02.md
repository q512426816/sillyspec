---
id: task-02
title: Only non-auxiliary stages write currentStage
title_zh: stage.js 仅非辅助阶段写 currentStage
author: qinyi
created_at: 2026-08-16 16:02:14
priority: P0
depends_on: []
blocks: [task-03]
requirement_ids: [FR-03]
decision_ids: [D-003@v1]
allowed_paths:
  - src/run/stage.js
goal: >
  stage.js 写 currentStage 仅对非 auxiliary 阶段生效，auxiliary（scan/quick/explore/archive/status/doctor）执行后不改主流程当前阶段。
implementation:
  - src/run/stage.js :128-133 写 currentStage 处加 `!AUXILIARY_STAGES.includes(stageName)` 守卫
acceptance:
  - run status/doctor 后 progress.currentStage 保持原值
  - 主流程阶段 run 后 currentStage 正常更新
constraints:
  - 不改 AUXILIARY_STAGES 定义；不引入「写前备份写后还原」
verify: "npm test（currentStage 守卫相关断言）+ npm run lint"
---
# task-02: stage.js 仅非辅助阶段写 currentStage

## 目标
见 frontmatter goal（design.md Phase 2；D-003@v1 选「不写」而非「写了再还原」，避免并发 last-writer-wins 恢复错误）。

## 验收
见 frontmatter acceptance（对齐 plan.md AC-02）。gates.js:730 的 auxiliary 重置 currentStage 分支保留（幂等）。
