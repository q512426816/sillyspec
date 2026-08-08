---
id: task-01
title: package.json 加 `better-sqlite3 ^11.x`、确认 `engines.node>=18`（现状已有保留非新增）；`npm install` 验证主流平台零编译装得上（prebuilt）。本 task 不删 sql.js（db.js/doctor-diagnostics.js 仍静态 import sql.js，删包会让走 PM/DB 的测试全崩，删依赖动作归 task-06）。完成标准：`node -e "require('better-sqlite3')"` 可加载；现状 `npm test` 仍绿。
title_zh: 引入 better-sqlite3 依赖并验证主流平台零编译安装
author: qinyi
created_at: 2026-08-09 00:32:01
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: [D-01, D-03]
allowed_paths:
  - package.json
  - package-lock.json
goal: >
  package.json 加 better-sqlite3 ^11.x（engines.node>=18 现状已有保留非新增），
  npm install 验证主流平台 prebuilt 零编译可装可加载，且现状 npm test 保持全绿。
implementation:
  - package.json dependencies 加 better-sqlite3 ^11.x，engines.node>=18 确认保留（现状已有，非新增）
  - npm install 验证 prebuilt 下载零编译安装成功，package-lock.json 记录依赖与平台二进制
  - node -e "require('better-sqlite3')" 冒烟验证原生绑定可加载
  - 本 task 不删 sql.js 依赖（db.js/doctor-diagnostics.js 仍静态 import sql.js，删包会让走 PM/DB 的测试全崩，删依赖动作归 task-06）
  - 跑 npm test 确认现状测试全绿
acceptance:
  - node -e "require('better-sqlite3')" 可加载成功
  - npm install 零编译成功，package-lock.json 含 better-sqlite3 与 prebuilt
  - npm test 全绿，无新增回归
  - 未改 src/ 源码、未删 sql.js 依赖
verify:
  - node -e "require('better-sqlite3')"
  - npm install
  - npm test
constraints:
  - 本 task 不删 sql.js（删依赖动作归 task-06，届时先改完 doctor-diagnostics 再删包）
  - 不改 src/ 源码，纯依赖配置 task
  - better-sqlite3 锁 ^11.x 稳定版（prebuilt 覆盖 Node 18+，R-01/R-06）
  - engines.node>=18 现状已有，保留非新增
---
