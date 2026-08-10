---
id: task-12
title: 双向冲突检测 + 写 .runtime/sync-conflict-<change>.json
title_zh: push 409 与 pull 本地脏度双向冲突检测并写冲突文件
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P0
depends_on: [task-04, task-07, task-09]
blocks: [task-13, task-14, task-15]
requirement_ids: [FR-05]
decision_ids: [D-002, D-008, D-010]
allowed_paths:
  - src/sync.js
  - src/progress.js
provides:
  - contract: SyncConflictFile
    fields: [change, base_ts, local_modified_ts, platform_last_pushed_at, created_at]
expects_from:
  task-07:
    - contract: PullResult
      needs: [ok, conflict, reason]
goal: >
  实现双向冲突检测：push 时平台 409 与 pull 时本地脏度，命中即写冲突文件进入强制提示。
implementation:
  - pull 时比对 last_local_modified_ts 大于 last_synced_platform_ts 且平台 last_pushed_at 更新则判冲突
  - push 409 响应时从响应取平台最新 JSON 与 last_pushed_at
  - 冲突命中写 .runtime/sync-conflict-<change>.json 含 change base_ts local_modified_ts platform_last_pushed_at created_at
  - 冲突时不 import 不 push 保留现状返回 conflict true
acceptance:
  - pull 本地脏度命中写冲突文件并返回 conflict true
  - push 409 命中写冲突文件并返回 conflict true
  - 冲突文件含 base_ts local_modified_ts platform_last_pushed_at 等字段
  - 无冲突时不写冲突文件
verify:
  - npm test
  - npm run lint
constraints:
  - 绝不字段级 auto-merge，冲突即强制提示
  - 冲突文件路径在 .runtime 下避免入版本控制
  - 冲突判定逻辑与 design 生命周期契约表一致
---
