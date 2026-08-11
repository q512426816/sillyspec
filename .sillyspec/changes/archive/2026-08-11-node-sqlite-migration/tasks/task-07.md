---
id: task-07
title: package.json clean cut——dependencies 删 better-sqlite3，engines.node 换 task-01 floor，version 3.26.0 换 4.0.0（semver breaking），npm install 重算 package-lock 移除 better-sqlite3 与 prebuild-install 与 node-gyp-build 子树
title_zh: 清理 better-sqlite3 依赖与版本升级 4.0.0
author: qinyi
created_at: 2026-08-11 09:48:07
priority: P0
depends_on: [task-01, task-04, task-05, task-06, task-08]
blocks: [task-09, task-10]
requirement_ids: [FR-05, FR-06]
decision_ids: [D-001@v1, D-004@v1]
allowed_paths:
  - package.json
  - package-lock.json
expects_from:
  task-01:
    - contract: NodeSqliteFloor
      needs: [engines_node_floor]
goal: >
  package.json clean cut 删 better-sqlite3 依赖，engines.node 换 task-01 实证 floor，version 升 4.0.0 breaking，npm install 重算 lock 移除 better-sqlite3 与 prebuild-install 与 node-gyp-build 子树。
implementation:
  - package.json dependencies 删 better-sqlite3
  - engines.node 大于等于 18 换 task-01 定论 floor
  - version 3.26.0 换 4.0.0
  - 跑 npm install 重算 package-lock
acceptance:
  - package.json dependencies 无 better-sqlite3 且 version 为 4.0.0 且 engines.node 为 task-01 floor
  - package-lock 无 better-sqlite3 与 prebuild-install 与 node-gyp-build 子树
  - npm install 在 node 24 零编译零 flag 成功
verify:
  - npm install 成功无 better-sqlite3 编译
  - grep package.json 与 package-lock 无 better-sqlite3
constraints:
  - 必须在 task-04 与 task-05 与 task-06 与 task-08 全部 import 站点迁完后才删依赖（否则崩）
  - 不留 optionalDependencies fallback（D-001 clean cut）
  - semver breaking 升 4.0.0
---
