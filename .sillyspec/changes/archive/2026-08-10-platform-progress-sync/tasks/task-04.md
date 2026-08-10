---
id: task-04
title: 全写入路径更新 last_local_modified_ts 脏度
title_zh: 所有写入路径末尾更新本地脏度列
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P0
depends_on: [task-01]
blocks: [task-12]
requirement_ids: [FR-05]
decision_ids: [D-008, D-013]
allowed_paths:
  - src/progress.js
  - src/progress/change-registry.js
  - src/progress/stage-machine.js
  - src/progress/step-store.js
expects_from:
  task-01:
    - contract: LastSyncColumns
      needs: [last_local_modified_ts]
goal: >
  让所有写入路径末尾更新 last_local_modified_ts 本地脏度列，供 pull 侧比对判断是否本地有未同步推进。
implementation:
  - _write 末尾 UPDATE changes 的 last_local_modified_ts 为当前 ISO 时间
  - initChange registerChange 写入后更新 last_local_modified_ts
  - updateChangeIsolation _updateApprovalStatus 写入后更新 last_local_modified_ts
  - renameChange unregisterChange 写入后更新 last_local_modified_ts
  - import 例外：不更新 now 而是重置 last_local_modified_ts 等于 last_synced_platform_ts
acceptance:
  - 任一写入路径后 changes.last_local_modified_ts 更新为写入时刻
  - import 后 last_local_modified_ts 等于 last_synced_platform_ts 而非 now
  - pull 时可用 last_local_modified_ts 大于 last_synced_platform_ts 判本地脏度
verify:
  - npm test
  - npm run lint
constraints:
  - 全写入路径都要覆盖，漏一条即脏度漏判
  - import 是例外不更新 now，否则下次 pull 误判冲突
  - 复用 new Date toISOString 时间戳规范
---
