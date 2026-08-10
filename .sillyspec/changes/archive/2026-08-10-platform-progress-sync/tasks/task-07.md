---
id: task-07
title: SyncManager.pull(changeName) 两级 pull 第二级
title_zh: 新增两级 pull 第二级单变更完整拉取
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P0
depends_on: [task-03, task-06]
blocks: [task-10, task-11, task-12]
requirement_ids: [FR-01, FR-03, FR-09]
decision_ids: [D-001, D-006, D-014]
allowed_paths:
  - src/sync.js
  - src/progress.js
provides:
  - contract: PullResult
    fields: [ok, imported, conflict, reason]
expects_from:
  task-03:
    - contract: ImportResult
      needs: [ok, imported, bakPath]
  task-06:
    - contract: PullListResult
      needs: [ok, changes, reason]
goal: >
  新增 pull 按需拉平台单变更完整 JSON 并调用 import 重建本地 DB 行，实现下行覆盖。
implementation:
  - 在 SyncManager 新增 pull 方法，GET {url}/api/changes/{name}/progress
  - 未连接平台返回 ok false reason 未连接平台
  - 本地脏度比对 last_local_modified_ts 大于 last_synced_platform_ts 且平台更新则判冲突返回 ok false conflict true
  - 无冲突则调 import 重建 DB 行返回 ok imported reason
acceptance:
  - pull 返回 PullResult 含 ok imported conflict reason
  - 本地脏度命中冲突时不 import 返回 conflict true
  - 无冲突时调 import 并返回 imported true
  - sillyhub 未就绪或 404 时 Best Effort 降级不阻断
verify:
  - npm test
  - npm run lint
constraints:
  - Best Effort 网络失败 console.warn 不抛错
  - sillyhub 独立 change 未就绪时本 change 客户端侧可独立验收
  - 冲突时不 import 保留本地现状
---
