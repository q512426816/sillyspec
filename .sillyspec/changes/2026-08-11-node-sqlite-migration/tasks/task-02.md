---
id: task-02
title: 新增 src/db-engine.js 封装 node:sqlite DatabaseSync + 3 缺口 shim（pragma/transaction/pluck），供 db.js 与 doctor-diagnostics 共用（方案 B 单一换引擎点）
title_zh: 新增 db-engine 引擎抽象层
author: qinyi
created_at: 2026-08-11 09:48:07
priority: P0
depends_on: []
blocks: [task-03, task-04, task-05]
requirement_ids: [FR-01]
decision_ids: [D-002@v1]
allowed_paths:
  - src/db-engine.js
provides:
  - contract: DbEngine
    fields: [openDatabase, applyPragmas, runTransaction, pluckGet, pluckAll]
goal: >
  新增 src/db-engine.js 封装 node:sqlite DatabaseSync 并消解 pragma、transaction、pluck 三个缺口，作为 db.js 与 doctor-diagnostics 共用的单一换引擎点（D-002 方案 B）。
implementation:
  - 新建 src/db-engine.js，顶层 import DatabaseSync 来自 node:sqlite
  - openDatabase 打开数据库透传 readOnly 驼峰，fileMustExist 语义交调用方 existsSync 门承担
  - applyPragmas 逐条 exec PRAGMA 语句
  - runTransaction 手写 BEGIN 与 COMMIT 与 ROLLBACK，fn 抛错自动回滚且原错误上抛不吞，嵌套用 SAVEPOINT 与 RELEASE
  - pluckGet 取第一行第一列无行返 undefined，pluckAll 取所有行第一列成数组
acceptance:
  - 5 个 export 签名与 design §7 一致
  - runTransaction 中 fn 抛错时已 ROLLBACK 且原错误上抛不吞
  - 嵌套 runTransaction 用 SAVEPOINT 不抛事务嵌套错
  - openDatabase 不凭空建库（fileMustExist 语义由调用方 existsSync 门承担）
verify:
  - node --check src/db-engine.js 语法通过
  - node --test test/db-engine.test.mjs 全绿（task-03 落盘后跑）
constraints:
  - 本文件不含 BUSY 重试，由 db.js transaction wrapper 外层包裹（design §5 Phase1）
  - ESM 顶层 import（node:sqlite 是内置模块，无需 resolve）
  - 只新增 db-engine.js，不改 db.js 或 doctor-diagnostics（由 task-04 与 task-05 改）
---
