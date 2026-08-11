---
id: task-09
title: 文档同步——README 安装说明删 better-sqlite3 编译注意写 node 版本要求，gitignore 注释引擎名，docs 下 file-lifecycle 与 worktree-and-guard 与 storage-and-state 与 sillyhub-progress-sync-contract 四文档的 better-sqlite3 引用全改 node:sqlite（历史 review 不动）
title_zh: 文档同步 better-sqlite3 换 node:sqlite
author: qinyi
created_at: 2026-08-11 09:48:07
priority: P1
depends_on: [task-07]
blocks: []
requirement_ids: [FR-07]
decision_ids: []
allowed_paths:
  - README.md
  - .gitignore
  - docs/sillyspec/file-lifecycle.md
  - docs/sillyspec/file-lifecycle/worktree-and-guard.md
  - docs/sillyspec/file-lifecycle/storage-and-state.md
  - docs/sillyspec/sillyhub-progress-sync-contract.md
goal: >
  按 CLAUDE.md 规则 19 同步文档，README 与 gitignore 与四份 docs 的 better-sqlite3 引用全改 node:sqlite，历史 review 文档不动。
implementation:
  - README 安装说明删 better-sqlite3 编译注意事项，写 node 版本要求为 task-01 floor
  - gitignore 第 11 行注释引擎名 better-sqlite3 改 node:sqlite
  - file-lifecycle.md 与 worktree-and-guard.md 与 storage-and-state.md 与 sillyhub-progress-sync-contract.md 的 better-sqlite3 引用全改 node:sqlite
  - 历史 review 文档 review-2026-08-08 与 review-2026-08-09 不动
acceptance:
  - 六个文档无 better-sqlite3 引用（历史 review 排除）
  - README 含 node 版本要求为 task-01 floor
verify:
  - grep 六个文档无 better-sqlite3（历史 review 排除）
constraints:
  - 历史 review 文档不动（historically accurate）
  - 不改源码仅文档
  - 引擎名替换保持 WAL 侧车文件等 SQLite 产物语义不变
---
