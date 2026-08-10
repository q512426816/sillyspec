---
id: task-06
title: SyncManager.pullList() 两级 pull 第一级
title_zh: 新增两级 pull 第一级轻量变更列表
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P1
depends_on: [task-03]
blocks: [task-07, task-11]
requirement_ids: [FR-01, FR-03]
decision_ids: [D-001, D-006]
allowed_paths:
  - src/sync.js
provides:
  - contract: PullListResult
    fields: [ok, changes, reason]
goal: >
  新增 pullList 拉取平台轻量变更列表，供 CLI 比对本地决定哪些 change 需更新，控制 pull 性能。
implementation:
  - 在 SyncManager 新增 pullList 方法，GET {url}/api/changes
  - 返回轻量列表含 name current_stage last_pushed_at last_pusher
  - 复用 fetchJson 与 REQUEST_TIMEOUT_MS 熔断
  - 返回 PullListResult 含 ok changes reason
acceptance:
  - pullList 返回 PullListResult 含 ok changes reason
  - 未连接平台时返回 ok false 且 reason 为未连接平台
  - 网络失败 console.warn 不抛错
verify:
  - npm test
  - npm run lint
constraints:
  - Best Effort 网络失败 console.warn 不抛错
  - 未连接平台跳过且降级不阻断
  - 复用现有 fetchJson 不重写 HTTP 层
---
