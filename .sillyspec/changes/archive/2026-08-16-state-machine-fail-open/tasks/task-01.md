---
id: task-01
title: Add READONLY_AUXILIARY_STAGES constant
title_zh: constants.js 新增只读辅助阶段常量
author: qinyi
created_at: 2026-08-16 16:02:14
priority: P0
depends_on: []
blocks: [task-03]
requirement_ids: [FR-04]
decision_ids: [D-005@v2]
allowed_paths:
  - src/constants.js
goal: >
  定义 READONLY_AUXILIARY_STAGES = ['status', 'doctor']，供 command.js 判断查询型辅助阶段只读短路。
implementation:
  - src/constants.js 在 AUXILIARY_STAGES 附近新增 READONLY_AUXILIARY_STAGES 常量（status/doctor）
acceptance:
  - READONLY_AUXILIARY_STAGES 常量存在且含 status/doctor
  - 既有 AUXILIARY_STAGES 不受影响
constraints:
  - 不改 AUXILIARY_STAGES 既有值
verify: "node --check src/constants.js && npm test 全量 + npm run lint"
---
