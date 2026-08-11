---
id: task-08
title: 测试迁移——3 个直连 better-sqlite3 的测试（db-atomic-write 与 machine-interface 与 platform-sync-schema）改 node:sqlite DatabaseSync，3 个仅注释经 DB 类透明的（db-concurrency 与 worktree-guard-db-fallback 与 worktree-guard-execute-guard）清理过时注释
title_zh: 测试迁移 node:sqlite
author: qinyi
created_at: 2026-08-11 09:48:07
priority: P0
depends_on: [task-04]
blocks: [task-07]
requirement_ids: [FR-02, FR-05]
decision_ids: []
allowed_paths:
  - test/db-atomic-write.test.mjs
  - test/machine-interface.test.mjs
  - test/platform-sync-schema.test.mjs
  - test/db-concurrency.test.mjs
  - test/worktree-guard-db-fallback.test.mjs
  - test/worktree-guard-execute-guard.test.mjs
goal: >
  把 3 个直连 better-sqlite3 的测试改 node:sqlite DatabaseSync，3 个仅注释经 DB 类透明的测试清理过时 better-sqlite3 注释，全部 npm test 全绿。
implementation:
  - db-atomic-write 的 import Database 换 import DatabaseSync 来自 node:sqlite，new Database 换 new DatabaseSync 设 readOnly true
  - machine-interface 的 import 与 new Database 同上换法
  - platform-sync-schema 的 import 与五处 new Database 同上换法
  - db-concurrency 与 worktree-guard-db-fallback 与 worktree-guard-execute-guard 仅清理过时 better-sqlite3 注释，逻辑经 DB 类透明不改
  - pluck get 取首列的调用改 prepare get 取首列
acceptance:
  - 3 个直连测试无 better-sqlite3 import 改 node:sqlite DatabaseSync
  - 6 个测试 npm test 全绿
  - readonly 打开统一 readOnly 驼峰
verify:
  - npm test 全绿
  - grep test 目录无 better-sqlite3 import
constraints:
  - readonly 打开统一 readOnly 驼峰（node:sqlite 选项）
  - 不改测试断言语义只换引擎，行为等价
  - 仅注释的 3 个测试不改逻辑
---
