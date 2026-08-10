---
id: task-03
title: ProgressManager.import() 逆运算 + 事务原子 + 独立 .bak snapshot
title_zh: 新增 import 逆运算重建 DB 行并保护本地隔离状态
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P0
depends_on: [task-01, task-02]
blocks: [task-05, task-07, task-13, task-15]
requirement_ids: [FR-07]
decision_ids: [D-005@v2, D-011]
allowed_paths:
  - src/progress.js
  - src/progress/shared.js
  - src/progress/step-store.js
  - src/progress/stage-machine.js
  - src/progress/change-registry.js
  - src/db.js
provides:
  - contract: ImportResult
    fields: [ok, imported, reason, bakPath]
expects_from:
  task-02:
    - contract: ProgressSyncJSON
      needs: [project, changes, stages, steps, batch_progress, approvals]
goal: >
  新增 import 把平台权威 JSON 原子写回本地 DB 的该 change 行，同时保留本地隔离状态不被覆盖。
implementation:
  - 在 ProgressManager facade 新增 import 方法，入参 progressObj 与 changeName
  - import 前 copyFileSync 到独立路径 .runtime/sillyspec.db.pre-import-<ts>.bak（不抢 _openWithFallback 的 .bak）
  - 单 DB.transaction 包裹原子写 stages steps batch_progress approvals 四表
  - changes 行用 UPDATE 选择投影列 current_stage status last_active last_synced_platform_ts，保留 isolation_ 与 platform_ 与 created_at
  - import 后 last_synced_platform_ts 与 last_local_modified_ts 均置为 progressObj.pushed_at
acceptance:
  - import 返回 ImportResult 含 ok imported reason bakPath
  - import 后隔离状态列 isolation_ 与 platform_change_id 等本地列未被覆盖
  - import 后 last_local_modified_ts 等于 last_synced_platform_ts（不更新 now）
  - import 失败 throw 中文且 .bak 可恢复
verify:
  - npm test
  - npm run lint
constraints:
  - 事务原子，任一表写失败整体回滚
  - .bak 用独立路径不冲突 _openWithFallback 主备份机制
  - 保留资产保护注释（⚠️ 必须保护真实资产）
  - import 是本地确定性操作，失败 throw 中文不 console.warn 吞错
---
