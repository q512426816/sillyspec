---
id: task-06
title: doctor-diagnostics.js:23 `import initSqlJs from 'sql.js'` 改 better-sqlite3 只读连接（D1 多 db 检测只读探测），承接删 sql.js 依赖
title_zh: doctor-diagnostics.js 只读探测换 better-sqlite3 并删除 sql.js 依赖
author: qinyi
created_at: 2026-08-09 00:32:01
priority: P0
depends_on: [task-03]
blocks: []
requirement_ids: [FR-01, NFR-02]
decision_ids: [D-01, D-03]
allowed_paths:
  - src/doctor-diagnostics.js
  - package.json
goal: >
  将 doctor-diagnostics.js:23 的 sql.js import 替换为 better-sqlite3 只读连接（D1 多 db 检测只读探测，被 index.js 引用），并承接删除
  package.json 中 sql.js 依赖——sql.js 移除后 doctor --json 不因 import 崩溃（plan 审查 B1）。
implementation:
  - src/doctor-diagnostics.js:23 删 import initSqlJs from sql.js 静态 import，改 import Database from better-sqlite3（同步 API，模块顶层静态 import）
  - probeDb 只读探测：由 readFileSync 整文件 + new SQL.Database(buf) 内存副本，改 better-sqlite3 只读连接 new Database(dbPath, readonly 加 fileMustExist 选项)；查询从 db.exec 改 db.prepare(sql).get()/all()，D1 语义与输出结构不变（readable/schema_version/change_count/active_changes/execute_status_by_change）
  - runDoctorDiagnostics 与 dumpDb 删 initSqlJs() 初始化（doctor-diagnostics.js:495 与 :665），改按需打开只读连接；probeDb 签名去掉 SQL 参数（或改传 Database 构造器），finally 仍 db.close() 用完即关
  - package.json dependencies 移除 sql.js 依赖 + npm install（承接删依赖——task-01 不删的原因：db.js 与 doctor-diagnostics 静态 import 断链会崩测试）
  - 核对 index.js 动态 import 导出契约不破（runDoctorDiagnostics/formatDoctorJson/writeDoctorDiagnosis/cleanupRemnantDbs/dumpDb）
acceptance:
  - sql.js 删除后 `node bin/sillyspec.js doctor --json` 不 import 崩溃（B1）
  - npm install 后 node_modules 无 sql.js 残留；D1 多 db 检测 JSON 输出与现结构一致
  - 打开失败沿用现有降级语义（readable:false + reason），不抛异常
verify:
  - node bin/sillyspec.js doctor --json
  - npm test + npm run lint 全绿（回归）
constraints:
  - 只读探测绝不写回原 db（readonly+fileMustExist），不跑建表/迁移，D1 语义不变
  - 单引擎无 fallback（D-03）：不保留 sql.js 双引擎路径
  - 改动仅限 src/doctor-diagnostics.js 与 package.json（npm install 会同步更新 package-lock.json）；db.js 引擎替换归 task-03/04，不越界
  - 只读连接在 WAL 下可能建 -shm 侧车文件（R-09 环境假设），.gitignore 已由 task-02 覆盖
  - 依赖 task-03 的 db.js 重写先行：probeDb 复用同一 better-sqlite3 只读语义
related_tests:
  - path: test/cli-top-level-aliases.test.mjs
    reason: 该测试断言 doctor --json 输出与退出码——引擎替换后 import 崩溃或输出漂移会使其失败（B1 自然回归载体）
---
