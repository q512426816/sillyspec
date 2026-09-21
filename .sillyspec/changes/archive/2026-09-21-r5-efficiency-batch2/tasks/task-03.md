---
id: task-03
title: 'M3 PLAN 分组默认化——recommendWaveGroups 纯函数+派发注入+advisory 附分组（含 test/plan-grouping-recommend.test.mjs）'
title_zh: 'M3 PLAN 分组默认化（预计算推荐分组注入+advisory 附分组+SillyHub 互斥）'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-21 17:25:00
priority: P0
depends_on: ['task-01', 'task-02']
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-003@v1]
allowed_paths:
  - src/stages/execute.js
  - src/stages/plan-postcheck.js
  - test/plan-grouping-recommend.test.mjs
target_files:
  - src/stages/execute.js
  - src/stages/plan-postcheck.js
  - NEW:test/plan-grouping-recommend.test.mjs
goal: >
  CLI 预计算推荐分组默认注入，派发交接单位从 task 升组（P13/GSD 对齐）
implementation:
  - plan-postcheck.js 新增导出纯函数 recommendWaveGroups(tasks)：按第 1 批三条件（allowed_paths 正交/无 provides-expects_from 契约链/组 ≤3）输出推荐分组
  - buildWavePrompt 派发段注入「推荐分组」行+偏离须披露话术；SillyHub 模式不注入
  - checkBatchAdvisory 输出附推荐分组清单（同一纯函数无二源）
  - 不满足条件时渲染输出与旧版逐字节一致（分组行零注入）
acceptance:
  - 分组纯函数单测过：正交/契约链/帽值边界
  - buildWavePrompt 含推荐分组行（有可并批）/逐字节一致（无可并批）
  - advisory 文案含分组
  - SillyHub 模式零注入
verify:
  - node --test test/plan-grouping-recommend.test.mjs
  - npm test
constraints:
  - 不改派发后端判定/对账逻辑
  - 分组是建议非强制（agent 裁决权保留）
---
