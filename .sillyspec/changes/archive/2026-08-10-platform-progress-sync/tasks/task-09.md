---
id: task-09
title: sync.js POST 元字段走 HTTP header
title_zh: push 元字段走 HTTP header 保持 body 裸 JSON 零回归
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P0
depends_on: [task-02, task-08]
blocks: [task-10, task-12]
requirement_ids: [FR-08, FR-09]
decision_ids: [D-015]
allowed_paths:
  - src/sync.js
expects_from:
  task-02:
    - contract: ProgressSyncJSON
      needs: [project, changes, stages, steps, batch_progress, approvals]
  task-08:
    - contract: PlatformUserConfig
      needs: [user]
goal: >
  把 push 的 user base_ts pushed_at 元字段移到 HTTP header 保持 body 裸 JSON，sillyhub 老版零回归。
implementation:
  - sync 的 POST body 由 read() 改为 serializeForSync() 裸六表 JSON
  - 加 header X-SillySpec-User 取 local.yaml platform.user
  - 加 header X-SillySpec-Base-Ts 取 changes.last_synced_platform_ts
  - 加 header X-SillySpec-Pushed-At 取客户端时钟 ISO
  - 处理 409 冲突响应读回平台最新 JSON
acceptance:
  - POST body 为 serializeForSync 裸六表 JSON 不含元字段
  - header 含 X-SillySpec-User 与 X-SillySpec-Base-Ts 与 X-SillySpec-Pushed-At
  - sillyhub 老版忽略 header 时 push 仍成功零回归
  - 409 响应被识别并进入冲突处理
verify:
  - npm test
  - npm run lint
constraints:
  - body 保持裸 JSON 向后兼容 sillyhub 老版
  - header 缺失或老版忽略不影响 body 解析
  - 检查既有 sync 测试是否断言 POST body 形状并同步
related_tests:
  - path: test/sync.test.mjs
    reason: POST body 从 read() 切到 serializeForSync() 且新增 header，既有断言需同步
---
