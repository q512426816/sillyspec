---
id: task-14
title: db/progress 相关测试重写为 better-sqlite3 行为 + 承接 task-10 声明的 6 个 sql.js/gate-status 依赖测试（修复 import / 改直读 DB 断言 / 删 gate-status 依赖断言）；全量 `npm test` 绿。完成标准：无 async→sync 回归，6 个测试重写完成
title_zh: db/progress 测试重写为 better-sqlite3 同步行为并承接 6 个 sql.js/gate-status 依赖测试
author: qinyi
created_at: 2026-08-09 00:32:15
priority: P0
depends_on: [task-10, task-11]
blocks: []
requirement_ids: [AC-04, FR-04, FR-05]
decision_ids: [D-01, D-02]
allowed_paths:
  - test/db-atomic-write.test.mjs
  - test/worktree-guard.test.mjs
  - test/worktree-guard-db-fallback.test.mjs
  - test/machine-interface.test.mjs
  - test/quick-session-isolation.test.mjs
  - test/runtime-cleanup-keeps-worktree.test.mjs
  - test/_complete-step-harness.mjs
  - test/doctor-align-execute-progress.test.mjs
  - src/worktree.js
  - src/index.js
  - src/init.js
  - src/progress.js
goal: >
  把 db/progress 相关测试从 sql.js 异步/门禁缓存断言重写为 better-sqlite3 同步行为，
  承接 task-10 声明的 6 个依赖测试（db-atomic-write / worktree-guard / worktree-guard-db-fallback /
  machine-interface / quick-session-isolation / runtime-cleanup-keeps-worktree），修复 import、改直读 DB 断言、删 gate-status 断言，全量 npm test 绿无 async→sync 回归。
implementation:
  - db-atomic-write：删 `import initSqlJs from 'sql.js'`，readName 改 better-sqlite3 只读连接 prepare().get()；SELECT 由 exec() 返回 rows 改 prepare().get()；await db.init() 去 await；.bak 断言对齐 task-04 实际回退语义
  - machine-interface：7a/7b/7c 三处 `sqlDb.exec('SELECT ...', [param])` 改 .prepare(...).get()（exec 不绑参）；§5 只读性删 db hash 相等断言（WAL close checkpoint 改写主库）+ 删 gate-status 不产生/不变断言（D-02 已废该文件），改语义级 DB 内容不变
  - worktree-guard + quick-session-isolation：gate-status.json fixture 全改 DB 种 changes 表行（status=active + current_stage=execute/quick，供 readCurrentStage/isInsideRegisteredWorktree 直读）；guard.json 并集合并断言保留，scan-guard.json 用例不动
  - runtime-cleanup-keeps-worktree：删「gate-status.json 应保留」断言（init.js 清理白名单已删该项），worktrees/db/global.json 等权威状态保留断言不变；worktree-guard-db-fallback 改同步风格 + 注释改主路径（gate-status 已废，非 fallback）
  - 其余 db/progress 测试（_complete-step-harness / doctor-align-execute-progress）以全量 npm test 为网校验同步化无回归，必要时按新同步 API 微调 await 与断言；grep 确认 test/ 无 `from 'sql.js'` 残留
acceptance:
  - 全量 npm test 绿，无 async→sync 回归（AC-04）
  - 6 个承接测试重写完成：sql.js import 清零、gate-status 依赖断言清零、直读 DB 断言生效
  - test/ 下无 sql.js 静态 import 残留
verify:
  - npm test
  - npm run lint
constraints:
  - 非测试逻辑本身有误时修逻辑不修测试（CLAUDE.md 规则 11）；断言对齐 task-03/04/10/11 实际实现，不编造行为
  - 只改 test/ 与共享 harness，不越界改 src/ 语义（引擎替换归 task-03~13）；WAL 下 db hash 不稳，只读性断言用语义级内容比对
  - better-sqlite3 同步 API：SELECT 一律 prepare().get()/all()，exec 不绑参；不新增任何 gate-status.json 断言（文件已废除）
related_tests: []
---
