---
id: task-06
title: 改造 src/hooks/worktree-guard.js queryDbFirstCell 子进程内联 node:sqlite（删 createRequire resolve better-sqlite3 块，子进程 require node:sqlite 用 DatabaseSync 取首列），不纳入 db-engine（D-003 进程隔离），fail-closed 不变
title_zh: worktree-guard 子进程迁移 node:sqlite
author: qinyi
created_at: 2026-08-11 09:48:07
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-003@v1]
allowed_paths:
  - src/hooks/worktree-guard.js
goal: >
  改造 worktree-guard queryDbFirstCell 子进程脚本内联 require node:sqlite（内置模块，删 createRequire resolve better-sqlite3 块），用 DatabaseSync 取首列；子进程不纳入 db-engine 抽象（D-003 进程隔离），fail-closed 语义不变。
implementation:
  - 删 createRequire resolve better-sqlite3 块与 libPath 变量，顺带删 import createRequire 来自 module（仅此处用）
  - 子进程脚本改 require node:sqlite，new DatabaseSync 设 readOnly true，prepare get 取首列（无 pluck 方法）
  - existsSync dbPath 前置门保留（替代 fileMustExist）
  - fail-closed 语义不变，db 查询异常或子进程超时返 warn 与 null
  - readCurrentStage 与 isNoWorktreeMode 行为不变
acceptance:
  - queryDbFirstCell 子进程 require node:sqlite 无 resolve better-sqlite3 块
  - readCurrentStage 与 isNoWorktreeMode 直读 current_stage 与 no_worktree 行为不变
  - fail-closed 不退化，缺失或损坏返 null
verify:
  - npm test 跑 worktree-guard-db-fallback 与 worktree-guard-execute-guard 测试全绿
  - grep src/hooks/worktree-guard.js 无 better-sqlite3
constraints:
  - 子进程不纳入 db-engine（D-003：ESM 加进程隔离 加 -e 字符串无法 require sillyspec 抽象层）
  - 子进程用 process.execPath 同主进程，floor flag 约束由 task-01 覆盖
  - fail-closed 不退化为 fail-open
---