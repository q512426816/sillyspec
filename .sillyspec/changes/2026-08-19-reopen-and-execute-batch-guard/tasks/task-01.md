---
id: task-01
title: add-confirm-gate-to-stale-backfill
title_zh: reopen stale 回填 confirm 门控
author: qinyi
created_at: 2026-08-19 11:50:00
priority: P0
depends_on: []
blocks: [task-03]
requirement_ids: [FR-01]
decision_ids: [D-001@v1, D-005@v1]
allowed_paths:
  - src/run/complete.js
provides: {}
expects_from: {}
goal: >
  reopen --done 不再静默回填 stale 步骤，必须显式 --confirm 才回填 + 审计记录
implementation:
  - 定位 src/run/complete.js 第 288-297 行回填块
  - 在 staleSteps.length 大于 0 分支内加 confirm 判别
  - 无 confirm 时打印阻断信息含两条出路并返回 stageCompleted false staleBlocked true
  - 带 confirm 时按现行回填逻辑执行并调用 pm._appendAuditLog 记录 reopen-stale-backfill
  - 审计日志字段包含 change stage stepList timestamp
acceptance:
  - 无 confirm 时 --done 不回填 stale，阶段不完成，返回 staleBlocked 标记
  - 带 --confirm 时回填生效 + 审计日志写入 reopen-stale-backfill 条目
  - 阻断信息列出 stale 步骤数并给出两条出路命令示例
verify:
  - cd C:/Users/qinyi/IdeaProjects/sillyspec && npm test
constraints:
  - 只改回填分支逻辑，不破坏单步推进路径
  - stale 保持原状不修改，仅返回值新增 staleBlocked 字段
  - 审计日志复用现有 _appendAuditLog 接口
related_tests: []
---
