---
id: task-02
title: stage-contract-spec.js 新增 plan.module-impact.exists validator
title_zh: 新增 plan.module-impact.exists 校验规则
author: qinyi
created_at: 2026-08-13 10:29:11
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-02, FR-08]
decision_ids: [D-002@v1, D-003@v2]
allowed_paths:
  - src/stage-contract-spec.js
goal: >
  新增 plan.module-impact.exists 校验规则（error + condition scale≠small），让 large 变更 plan 完成时缺 module-impact.md 阻断，small 豁免。
implementation:
  - 仿 stage-contract-spec.js:405 archive.module-impact.exists 规则，新增 plan.module-impact.exists
  - severity=error；condition={ctxField:'scale', ne:'small'}（参照 line 82 brainstorm.proposal.exists 先例）
  - target root=change，path=module-impact.md
acceptance:
  - plan.module-impact.exists 规则存在，severity=error
  - condition scale≠small（large 阻断 / small 豁免）
  - 保留 archive.module-impact.exists（warning, root=archive）不动
verify:
  - node 跑 runValidators('plan')：large 缺 module-impact → errors 含该规则；small → 跳过
constraints:
  - 不动 archive.module-impact.exists
  - condition 生效依赖 task-03 的 scale 读取链路（同 Wave 完成）
---
