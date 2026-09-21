---
id: task-02
title: 'M2 gate 快照分叉态取 worktree 血统——424-426 行翻转+警告对齐指引（含三态回归钉）'
title_zh: 'M2 快照分叉态取 worktree（仅分叉态，三态回归钉）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 17:25:00
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02]
decision_ids: [D-002@v2]
allowed_paths:
  - src/run/gate-snapshot.js
  - test/gate-snapshot-lineage.test.mjs
target_files:
  - src/run/gate-snapshot.js
  - NEW:test/gate-snapshot-lineage.test.mjs
goal: >
  根除定向 worktree 跑遇主仓并行异动的 verify 假红（batch1 移交实证）
implementation:
  - gate-snapshot.js 424-426 行双写分叉分支：src 从 cwdPath 改 wtPath；警告文案补「分叉取 worktree 分支版——主仓侧改动若需保留请 apply/对齐后复跑」
  - 422 行（cwdDiff 且非 wtDiff 取主仓）与 427 行注释态（wtDiff 且非 cwdDiff 保持 worktree）逐字节不动
  - 三态回归钉：保护态取主仓（2026-09-20 零回归）/正常态取 worktree/分叉态取 worktree（batch1 假红复刻）
acceptance:
  - 三态钉全绿
  - 既有 gate-snapshot 相关测试零回归
  - batch1 场景复刻用例断言快照内 src 为 worktree 版
verify:
  - node --test test/gate-snapshot-lineage.test.mjs
  - npm test
constraints:
  - 仅改分叉分支与警告文案
  - merge-backups/local.yaml 复制等其余快照装配逻辑零触碰
---
