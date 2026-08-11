---
id: task-05
title: 改造 src/doctor-diagnostics.js 换 db-engine（两处 new Database 全迁移——probeDb 与 dumpDb，否则 import Database 删不掉 clean cut 崩；pluck 换 pluckGet/pluckAll；readonly 换 readOnly 驼峰），只读 fail-closed 不变
title_zh: doctor-diagnostics 迁移 node:sqlite
author: qinyi
created_at: 2026-08-11 09:48:07
priority: P0
depends_on: [task-02]
blocks: []
requirement_ids: [FR-03]
decision_ids: [D-002@v1]
allowed_paths:
  - src/doctor-diagnostics.js
expects_from:
  task-02:
    - contract: DbEngine
      needs: [openDatabase, pluckGet, pluckAll]
goal: >
  改造 src/doctor-diagnostics.js 把 better-sqlite3 散落 import 换成 db-engine，含 probeDb 与 dumpDb 两处 new Database 全迁移（design 漏列 dumpDb，本 task 补充覆盖），只读 fail-closed 语义不变。
implementation:
  - import 换 openDatabase 与 pluckGet 与 pluckAll 来自 ./db-engine.js，删 import Database 来自 better-sqlite3
  - probeDb 的 new Database 换 openDatabase 设 readOnly true，existsSync 与 statSync 零字节门保留
  - pick 的 pluck get 换 pluckGet，pickCol 的 pluck all 换 pluckAll
  - dumpDb 的 new Database 换 openDatabase 设 readOnly true，prepare all 保留无 pluck
  - pickExecuteStatusByChange 的 prepare all 保留，readonly 全改 readOnly 驼峰
acceptance:
  - src/doctor-diagnostics.js 无 better-sqlite3 import（两处 new Database 全迁移）
  - probeDb 与 dumpDb 只读 fail-closed 缺失或损坏返 null 或 false 语义不变
  - readonly 全改 readOnly 驼峰
verify:
  - npm test 相关 doctor 测试全绿
  - grep src/doctor-diagnostics.js 无 better-sqlite3
constraints:
  - 必须迁移 dumpDb 第二处 new Database（design §5 漏列，plan 补充覆盖），否则 import 删不掉 clean cut 崩
  - 不改诊断逻辑只换引擎
  - 只读 fail-closed 不退化
---
