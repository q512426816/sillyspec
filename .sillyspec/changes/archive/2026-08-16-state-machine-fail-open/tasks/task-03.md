---
id: task-03
title: --done transition guard + readonly auxiliary short-circuit + brainstorm gating
title_zh: command.js --done 转换守卫 + 只读辅助短路 + brainstorm 幽灵变更门控
author: qinyi
created_at: 2026-08-16 16:02:14
priority: P0
depends_on: [task-01, task-02]
blocks: [task-05]
requirement_ids: [FR-02, FR-04, FR-05]
decision_ids: [D-004@v1, D-005@v2, D-006@v1]
allowed_paths:
  - src/run/command.js
goal: >
  三合一：--done 完成阶段前执行 checkTransition（与 runStage 同源含 fromStageData）；READONLY_AUXILIARY_STAGES 查询在 registerChange/ensureStageSteps 之前短路零副作用；brainstorm 无 --change 仅 0 活跃变更仓 auto-create。
implementation:
  - --done 分支调用 completeStep 前补 checkTransition(progress.currentStage || '', stageName, { fromStageData })，不合法 exit 1（--skip-approval 可绕过）
  - READONLY_AUXILIARY_STAGES 且无显式写 flag 时短路：progress 不存在 exit 0 提示不建 default；存在则只读不 seed steps
  - brainstorm 无 --change 时查询活跃变更数，>0 exit 2 引导 --change
acceptance:
  - brainstorm 态直跑 verify --done 被拦（exit 1）
  - 新项目 run status 不建 changes/default/
  - 多活跃变更仓 run brainstorm 无 --change exit 2；0 活跃变更仓 auto-create 保留
constraints:
  - 不改 checkTransition 契约；--skip-approval 绕过语义与 runStage 一致
verify: "npm test（--done 守卫 / 只读短路 / brainstorm gating 断言）+ npm run lint"
---
