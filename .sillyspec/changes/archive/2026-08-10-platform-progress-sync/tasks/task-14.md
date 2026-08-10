---
id: task-14
title: src/index.js platform status 扩展
title_zh: platform status 加落后标记与未决冲突列表
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P2
depends_on: [task-12]
blocks: [task-15]
requirement_ids: [FR-05]
decision_ids: [D-002, D-010]
allowed_paths:
  - src/index.js
  - src/sync.js
expects_from:
  task-12:
    - contract: SyncConflictFile
      needs: [change]
goal: >
  扩展 platform status 显示本地可能落后标记与未决冲突列表，提升多用户协作可见性。
implementation:
  - index.js platform status 分支扩展
  - 比对本地 last_synced_platform_ts 与平台 last_pushed_at 显示本地可能落后标记
  - 扫描 .runtime/sync-conflict-*.json 列出未决冲突
  - 未连接平台时保持现状输出
acceptance:
  - 平台 last_pushed_at 晚于本地时显示本地可能落后标记
  - 存在冲突文件时列出未决冲突清单
  - 未连接平台时输出与现状一致
verify:
  - npm test
  - npm run lint
constraints:
  - 只读展示不修改任何进度
  - 冲突文件扫描容错，损坏文件跳过不崩
  - 未连接平台时跳过比对
---
