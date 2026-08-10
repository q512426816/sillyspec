---
id: task-05
title: round-trip 测试 serializeForSync→import→serializeForSync 等值
title_zh: serializeForSync 与 import 互逆往返等值测试
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P0
depends_on: [task-02, task-03, task-04]
blocks: []
requirement_ids: [FR-07]
decision_ids: [D-005@v2]
allowed_paths:
  - test/progress-sync-roundtrip.test.mjs
  - src/progress.js
expects_from:
  task-02:
    - contract: ProgressSyncJSON
      needs: [project, changes, stages, steps, batch_progress, approvals]
  task-03:
    - contract: ImportResult
      needs: [ok, imported, bakPath]
goal: >
  用测试证明 serializeForSync 与 import 严格互逆且保护本地隔离状态，防六表同步回归。
implementation:
  - 建测试用临时 DB，造一个含 stages steps batch_progress approvals 的 change
  - serializeForSync 取快照，import 回写后再次 serializeForSync，断言两次 JSON 等值
  - 预置 isolation_ 与 platform_change_id 本地列，import 后断言这些本地列未被覆盖
  - 断言 import 后 last_local_modified_ts 等于 last_synced_platform_ts
acceptance:
  - serializeForSync→import→serializeForSync 两次输出逐键等值
  - import 后 isolation_ 与 platform_change_id 与 created_at 保持本地原值
  - import 后 last_local_modified_ts 等于 last_synced_platform_ts
  - 测试全部通过
verify:
  - node --test test/progress-sync-roundtrip.test.mjs
  - npm test
constraints:
  - 测试用临时目录临时 DB 不碰真实 .sillyspec/.runtime
  - fixture 构造须 chdir 或用显式 cwd，避免 worktreeBase 解析到错仓库
  - 不修改被测逻辑来迎合测试
---
