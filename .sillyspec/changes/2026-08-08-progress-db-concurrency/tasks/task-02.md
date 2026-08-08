---
id: task-02
title: `.gitignore` 加 `*.db-wal`/`*.db-shm`；README 声明主流平台支持、musl/Win-arm64 不保证
title_zh: 忽略 WAL 侧车文件 + README 平台支持声明
author: qinyi
created_at: 2026-08-09 00:32:01
priority: P1
depends_on: []
blocks: []
requirement_ids: [NFR-02, NFR-05, AC-05]
decision_ids: [D-01, D-03]
allowed_paths:
  - .gitignore
  - README.md
goal: >
  为 better-sqlite3 替换做准备：在 .gitignore 忽略 WAL 侧车文件（*.db-wal / *.db-shm），
  并在 README 声明主流平台 prebuilt 零编译支持、Alpine musl / Win-arm64 等边缘平台不保证。
implementation:
  - 在 .gitignore 追加两行：*.db-wal 与 *.db-shm（WAL 模式运行产生的侧车文件）
  - 在 README 新增平台支持说明段，声明主流 npm 平台（Node 18+ 的 Linux/macOS/Windows x64 及 macOS arm64）prebuilt 零编译安装
  - README 同时声明 Alpine musl / Win-arm64 / BSD 等边缘平台不保证（无 prebuilt 时可能触发 node-gyp 编译）
  - 本次改动不触碰 src/ 与 package.json，不删 sql.js（删依赖归 task-06）
acceptance:
  - .gitignore 落盘包含 *.db-wal 与 *.db-shm 两行
  - README 落盘包含主流平台支持声明与 musl/Win-arm64 不保证声明
  - 实际运行 WAL 产生的 *.db-wal / *.db-shm 文件不被 git status 跟踪（git check-ignore 验证）
  - 不涉及 src/、package.json 等其它文件变更
verify:
  - git check-ignore -v sillyspec.db-wal && git check-ignore -v sillyspec.db-shm
  - grep -nE 'db-wal|db-shm' .gitignore
  - grep -nE 'prebuilt|musl|arm64' README.md
constraints:
  - 仅允许修改 .gitignore 与 README.md 两个文件
  - WAL 侧车文件只忽略不删除，不误伤 .sillyspec/ 下正常 db 文件
  - README 声明措辞与 plan task-02 一致（主流平台支持、musl/Win-arm64 不保证）
  - 本 task 为 Wave 0 配置，纯配置落盘即可验收，不得引入回归
---
