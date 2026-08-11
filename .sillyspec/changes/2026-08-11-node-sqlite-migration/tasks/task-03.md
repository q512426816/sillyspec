---
id: task-03
title: 新增 test/db-engine.test.mjs 覆盖 db-engine 5 export（openDatabase 门 / applyPragmas 生效 / runTransaction 提交回滚嵌套 / pluckGet / pluckAll）
title_zh: db-engine 单元测试
author: qinyi
created_at: 2026-08-11 09:48:07
priority: P0
depends_on: [task-02]
blocks: []
requirement_ids: [FR-01]
decision_ids: []
allowed_paths:
  - test/db-engine.test.mjs
expects_from:
  task-02:
    - contract: DbEngine
      needs: [openDatabase, applyPragmas, runTransaction, pluckGet, pluckAll]
goal: >
  新增 test/db-engine.test.mjs 用 node:test 与 node:assert/strict 覆盖 db-engine 5 个 export，含事务提交回滚与嵌套 SAVEPOINT 回归。
implementation:
  - 新建 test/db-engine.test.mjs，import 5 个 export 来自 ../src/db-engine.js
  - 测 openDatabase 打开库与 readOnly 选项行为
  - 测 applyPragmas 设 journal_mode 为 WAL 后验证生效
  - 测 runTransaction 成功提交与 fn 抛错回滚与嵌套 SAVEPOINT 不抛嵌套错
  - 测 pluckGet 无行返 undefined 与 pluckAll 空数组
acceptance:
  - 5 个 export 各有覆盖用例
  - 嵌套事务用例验证不抛嵌套事务错
  - 全部用 node:test 原生无第三方测试库（CONVENTIONS）
verify:
  - node --test test/db-engine.test.mjs 全绿
constraints:
  - 用 mkdtemp 临时目录隔离 db 文件（规避 Windows EPERM）
  - 只测不改 db-engine.js 源码
  - 不引入第三方测试库
---
