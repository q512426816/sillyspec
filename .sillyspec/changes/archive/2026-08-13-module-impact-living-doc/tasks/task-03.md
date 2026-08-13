---
id: task-03
title: stage-contract.js validatePlanOutputs 加 scale 读取链路
title_zh: validatePlanOutputs 读取 design scale 传入校验 ctx
author: qinyi
created_at: 2026-08-13 10:29:11
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-009@v1]
allowed_paths:
  - src/stage-contract.js
goal: >
  validatePlanOutputs 新增 design.md frontmatter scale 读取链路，把 scale 传给 evaluateRules ctx，使 task-02 的 condition scale≠small 生效（当前 line 332 只传 {changeDir}）。
implementation:
  - 仿 validateBrainstormOutputs（stage-contract.js:264-272）读 design.md frontmatter scale 的 8 行模式
  - validatePlanOutputs 把 evaluateRules('plan', { changeDir }) 改为 evaluateRules('plan', { changeDir, scale })
  - scale 缺省/null 时 fail-safe（condition ne='small' 缺字段=规则生效，保守）
acceptance:
  - validatePlanOutputs 传 scale 给 ctx
  - task-02 condition 在 large/small 下分别生效/跳过
verify:
  - node 跑 validatePlanOutputs 带/不带 scale 的 design.md
constraints:
  - 不破坏现有 plan validator 行为（plan.md/decisions 校验不变）
  - scale 读取 fail-safe（design 无 scale 字段时保守走 large 要求）
---
