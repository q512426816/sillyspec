---
id: task-03
title: db.js 重写——同步 `new Database(path)`+`journal_mode=WAL`+`busy_timeout=5000`+`foreign_keys=ON`；删 `_save`/`_loadDatabase`/`_atomicWriteSync`/`_renameSyncRetry`/`_sleepSync`；`transaction(fn)` 改原生 `db.transaction(fn)`；保留 `_createSchema`/`_migrateAddColumn`/`DB_SCHEMA_VERSION=3` 戳
title_zh: db.js 重写：sql.js 换 better-sqlite3（同步构造 + WAL + 原生事务，删自定义持久化）
author: qinyi
created_at: 2026-08-09 00:32:01
priority: P0
depends_on: [task-01]
blocks: [task-04, task-05, task-06, task-07]
requirement_ids: [FR-01, FR-02, FR-03]
decision_ids: [D-01, D-03]
allowed_paths:
  - src/db.js
goal: >
  src/db.js 从 sql.js 纯内存库重写为 better-sqlite3 同步引擎（真 WAL 并发 + 原生事务），
  删除整库 export 自定义持久化，为后续 task（.bak 回退、PM 同步化）铺底。
implementation:
  - 改 import：删 `import initSqlJs from 'sql.js'`，改 `import Database from 'better-sqlite3'`
  - `init()` 去 async 改同步：`new Database(this.dbPath)` 后设 PRAGMA journal_mode=WAL / busy_timeout=5000 / foreign_keys=ON / synchronous=NORMAL
  - `.schema-version` 戳逻辑保留：戳不匹配时跑 `_createSchema`（better-sqlite3 建表即落盘，不再 `_save`）
  - 删 `_save`/`_loadDatabase`/`_atomicWriteSync`/`_renameSyncRetry`/`_sleepSync` 及 fs 退避辅助
  - `transaction(fn)` 改 `return this.db.transaction(fn)()`：原生自动 BEGIN/COMMIT/ROLLBACK + 嵌套 savepoint，抛错不吞
  - `close()` 删 `_save()` 仅 `db.close()`（WAL 自动 checkpoint）；`getDb()` 语义保持返回 better-sqlite3 实例
  - 保留 `_createSchema`（6 表 DDL + 索引 + `_migrateAddColumn` 迁移逐字不改）与 `DB_SCHEMA_VERSION = 3` 戳
acceptance:
  - src/db.js 无 sql.js / _save / _loadDatabase / _atomicWriteSync / _renameSyncRetry / _sleepSync 残留引用
  - 出现 new Database 与 WAL / busy_timeout / foreign_keys PRAGMA；transaction 走原生 db.transaction(fn)
  - _createSchema / _migrateAddColumn / DB_SCHEMA_VERSION=3 保留，.schema-version 戳机制不变
  - npm run lint 通过
verify:
  - npm run lint
constraints:
  - 仅允许修改 src/db.js 单文件；保留 6 表 DDL、索引、_migrateAddColumn 迁移与版本戳机制
  - 本 task 不删 package.json 的 sql.js 依赖（删依赖归 task-06）；不做 .bak 损坏回退（归 task-04）
  - 全同步 API 不引入 async；与现状行为兼容（单进程串行时表现一致，仅引擎替换）
related_tests:
  - path: test/db-atomic-write.test.mjs
    reason: 直接 import sql.js 并 await db.init()，init 变同步且自定义持久化删除后必然失效（重写归 task-14）
---
