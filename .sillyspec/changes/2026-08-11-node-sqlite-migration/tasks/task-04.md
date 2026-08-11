---
id: task-04
title: 改造 src/db.js 换 node:sqlite 引擎（import db-engine，new Database 换 openDatabase，pragma 换 applyPragmas，transaction 换 runTransaction 保留 BUSY 退避外层，getDb 返 DatabaseSync），progress 层零改动
title_zh: db.js 迁移 node:sqlite
author: qinyi
created_at: 2026-08-11 09:48:07
priority: P0
depends_on: [task-02]
blocks: [task-08]
requirement_ids: [FR-02]
decision_ids: [D-002@v1]
allowed_paths:
  - src/db.js
expects_from:
  task-02:
    - contract: DbEngine
      needs: [openDatabase, applyPragmas, runTransaction]
goal: >
  改造 src/db.js 把 better-sqlite3 引擎换成经 db-engine 的 node:sqlite，DB wrapper 对外职责不变，progress 层 prepare/get/all/run 调用面字面零改动。
implementation:
  - import 换 openDatabase 与 applyPragmas 与 runTransaction 来自 ./db-engine.js，删 import Database 来自 better-sqlite3
  - _openWithFallback 三处 new Database 换 openDatabase，tryOpen 探测的 prepare get 保留
  - init 四条 pragma 换 applyPragmas 设 WAL 与 busy_timeout 与 foreign_keys 与 synchronous 同值
  - transaction 内部 db.transaction 换 runTransaction，BUSY 退避 while 外层保留
  - getDb 返回原生 DatabaseSync，createSchema 与 migrateAddColumn 的 exec 保留，过时 better-sqlite3 注释改写
acceptance:
  - src/db.js 无 better-sqlite3 import
  - getDb 返回 node:sqlite DatabaseSync，progress 层调用面字面不变
  - 四条 PRAGMA 经 applyPragmas 设同值
  - BUSY 退避逻辑保留
  - bak 回退与 schema 戳逻辑保留
verify:
  - npm test 相关 DB 测试全绿（progress 层透明）
  - grep src/db.js 无 better-sqlite3
constraints:
  - 不改 progress.js 与 progress 下子模块与 sync.js（G3 零改动）
  - DB schema 版本常量不变（N2 不改 schema）
  - 不异步化（N4）
---
