---
id: task-10
title: sync-docs-for-state-machine-guards
title_zh: 文档同步状态机守卫变更
author: qinyi
created_at: 2026-08-19 11:50:00
priority: P1
depends_on: [task-01, task-02, task-03, task-04, task-05, task-06, task-07, task-08, task-09]
blocks: []
requirement_ids: [FR-07]
decision_ids: [D-005@v1]
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - .sillyspec/docs/sillyspec/modules/progress.md
  - .sillyspec/docs/sillyspec/modules/worktree.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.md
  - .sillyspec/changes/2026-08-19-reopen-and-execute-batch-guard/module-impact.md
goal: >
  同步 W1/W2/W3 代码变更到对应文档，确保 file-lifecycle 步骤流转语义与模块卡行为描述与实际代码一致
implementation:
  - 更新 docs/sillyspec/file-lifecycle.md W1 stale 回填条件描述，回填需要显式 confirm 声明，刷新 updated_at 时间戳
  - 更新 .sillyspec/docs/sillyspec/modules/progress.md 模块卡，W1 completeStage 拒绝 stale 步骤与 W2 批量完成守卫行为描述，刷新 updated_at
  - 更新 .sillyspec/docs/sillyspec/modules/worktree.md 模块卡，W3 锚点策略改默认 merge-base 与冲突列表 stderr 解析不静默描述，刷新 updated_at
  - 更新 .sillyspec/docs/sillyspec/modules/runtime.md 模块卡，W1/W2 complete.js 行为变化描述，刷新 updated_at
  - 更新 .sillyspec/docs/sillyspec/modules/cli-entry.md 模块卡，W3 --base flag 解析描述，刷新 updated_at
  - 回填 .sillyspec/changes/2026-08-19-reopen-and-execute-batch-guard/module-impact.md 更新结果表，将五行 pending 改为 done
acceptance:
  - file-lifecycle.md stale 回填条件描述与 design.md 改动点 1 一致，含 confirm 门控说明
  - 五个模块卡 updated_at 时间戳已刷新，内容与 design.md 总体方案行为描述一致
  - module-impact.md 更新结果表无 pending 行，全部标记为 done
  - docs/prompt 目录未修改（无 prompt 变更，不需要重跑 extract 脚本）
verify:
  - cd C:/Users/qinyi/IdeaProjects/sillyspec && npm test
constraints:
  - 文档同步不修改 prompt 源码，因此不需要重跑 docs/prompt/_extract.mjs 脚本
  - 各模块卡 updated_at 时间戳必须刷新，反映本次文档变更时间
  - module-impact.md 更新结果表必须逐行回填，不能遗留 pending 行
related_tests: []

---
