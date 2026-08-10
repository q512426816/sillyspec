---
id: task-02
title: ProgressManager.serializeForSync() 六表完整序列化
title_zh: 新增同步专用六表完整序列化方法
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P0
depends_on: [task-01]
blocks: [task-03, task-05, task-09]
requirement_ids: [FR-07]
decision_ids: [D-005@v2]
allowed_paths:
  - src/progress.js
  - src/progress/shared.js
  - src/progress/step-store.js
  - src/progress/stage-machine.js
  - src/progress/change-registry.js
  - src/db.js
provides:
  - contract: ProgressSyncJSON
    fields: [project, changes, stages, steps, batch_progress, approvals]
expects_from:
  task-01:
    - contract: LastSyncColumns
      needs: [last_synced_platform_ts, last_local_modified_ts]
goal: >
  新增 serializeForSync 做真正的六表完整序列化作为同步载体，绕开 read() 是聚合视图而非六表投影的局限。
implementation:
  - 在 ProgressManager facade 或 progress 子模块新增 serializeForSync 方法，查询六张表产出完整投影 JSON
  - changes 行只投影流程进度列 current_stage status last_active last_synced_platform_ts last_local_modified_ts
  - 排除本地强相关列 isolation_ 与 platform_change_id workspace_id sync_enabled created_at
  - 返回裸六表 JSON，不含 user base_ts pushed_at（由 sync.js 放 HTTP header）
acceptance:
  - serializeForSync 返回对象含 project changes stages steps batch_progress approvals 六键
  - changes 行含 last_synced_platform_ts 与 last_local_modified_ts 且不含 isolation_ 系列与 platform_ 系列列
  - 未连平台时方法可本地调用不依赖网络
verify:
  - npm test
  - npm run lint
constraints:
  - 只读查询不写库，复用 getDb 原生实例 prepare 直查
  - 不复用 read()（其为聚合视图漏 approvals 且 changes 只投影五列）
  - 输出字段名与 import 逆运算约定一致
---
