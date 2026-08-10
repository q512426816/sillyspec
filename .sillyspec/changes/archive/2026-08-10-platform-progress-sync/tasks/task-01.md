---
id: task-01
title: db.js schema 加列 last_synced_platform_ts / last_local_modified_ts + DB_SCHEMA_VERSION 3→4 连带三处
title_zh: schema 加列 + 版本号四处一致 bump
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P0
depends_on: []
blocks: [task-02, task-03, task-04]
requirement_ids: [FR-02, FR-05]
decision_ids: [D-012]
allowed_paths:
  - src/db.js
  - src/progress/shared.js
  - src/progress.js
provides:
  - contract: LastSyncColumns
    fields: [last_synced_platform_ts, last_local_modified_ts]
goal: >
  给 changes 表加 base_ts 与本地脏度两列并把 DB schema 版本从 3 升到 4 且四处一致，为后续序列化与冲突检测提供数据载体。
implementation:
  - db.js 在 _createSchema 末用 _migrateAddColumn 幂等加 changes 表 last_synced_platform_ts 与 last_local_modified_ts 两列 TEXT
  - db.js:10 把 DB_SCHEMA_VERSION 从 3 改为 4
  - db.js:203 project 表 schema_version DEFAULT 3 改为 4
  - src/progress/shared.js:30 把 CURRENT_VERSION 从 3 改为 4
  - src/progress.js:350 硬编码 _version 3 改为 4（progress.js:226 从 DB 读 schema_version 已随 db.js 生效）
acceptance:
  - 全新 DB init 后 changes 表含 last_synced_platform_ts 与 last_local_modified_ts 两列且默认 NULL
  - 已有 schema 3 DB 经 _migrateAddColumn 幂等加列且新列 NULL，不丢既有数据
  - DB_SCHEMA_VERSION / schema_version DEFAULT / CURRENT_VERSION / progress.js _version 四处全为 4
verify:
  - npm test
  - npm run lint
constraints:
  - 加列必须用现有 _migrateAddColumn 幂等机制，不新增 DDL 工具
  - 版本戳 .schema-version 失配触发重跑 _createSchema，已有库自动幂等加列
  - 不改六张表现有列结构，仅 changes 加两列
---
