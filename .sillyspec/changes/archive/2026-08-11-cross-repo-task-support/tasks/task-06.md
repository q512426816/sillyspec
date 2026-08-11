---
id: task-06
title: verify-postcheck A6 per-repo cwd 跑跨仓 npm test（覆盖：FR-08, D-004）
title_zh: verify 跨仓仓 per-repo cwd 跑 npm test
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-08]
decision_ids: [D-004]
allowed_paths:
  - src/verify-postcheck.js
expects_from:
  task-01:
    - contract: MultiRepoContext
      needs: [repos]
goal: >
  runVerifyTestCheck per-repo cwd，跨仓仓有 package.json 则在该仓根跑 npm test，无则跳过加 warn，跨仓仓不参与 module 子集策略。
implementation:
  - runVerifyTestCheck 改 per-repo cwd，ctx.repos 遍历每 repo 探 package.json
  - 跨仓仓有 package.json 则在该仓根跑 npm test，无则跳过加 console.warn
  - resolveVerifyChangedFiles 走 ctx per-repo 取 diff 后合并
  - 跨仓仓只跑 full npm test，不参与 module 子集策略
acceptance:
  - 跨仓仓有 package.json 时在该仓根跑 npm test
  - 跨仓仓无 package.json 跳过加 warn 不阻断 verify
  - 跨仓仓不参与 module 子集策略
  - 主仓 npm test 行为不变
verify:
  - npm test
constraints:
  - 跨仓仓只跑 full npm test 不参与 module 子集（module 配置主仓强相关）
  - 无 package.json 跳过加 warn 不阻断 verify
  - 单仓场景 per-repo 退化为仅主仓零回归
---
