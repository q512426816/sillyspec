---
id: task-13
title: src/index.js platform resolve 三选一
title_zh: 新增 platform resolve 三选一冲突解决子命令
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P0
depends_on: [task-03, task-12]
blocks: [task-15]
requirement_ids: [FR-05]
decision_ids: [D-002, D-010, D-013]
allowed_paths:
  - src/index.js
  - src/sync.js
  - src/progress.js
expects_from:
  task-03:
    - contract: ImportResult
      needs: [ok, imported, bakPath]
  task-12:
    - contract: SyncConflictFile
      needs: [change, base_ts, platform_last_pushed_at]
goal: >
  新增 platform resolve 三选一子命令让用户在冲突时显式选择 keep-local 或 take-platform 或 abort。
implementation:
  - index.js platform case 加 resolve 子命令分支
  - --keep-local：base_ts 设为平台当前 last_pushed_at，保留本地 DB 不 import，清冲突文件
  - --take-platform：调 import 用平台 JSON 覆盖本地，清冲突文件
  - --abort：放弃本次同步，清冲突文件，本地 DB 不变，base_ts 不更新
  - 无冲突文件时提示无可解决冲突
acceptance:
  - --keep-local 更新 base_ts 为平台 last_pushed_at 且本地 DB 不变且清冲突文件
  - --take-platform 调 import 覆盖本地且清冲突文件
  - --abort 清冲突文件且本地 DB 与 base_ts 均不变
  - 无冲突文件时提示无可解决冲突
verify:
  - npm test
  - npm run lint
constraints:
  - 三种语义与 design 生命周期契约表严格一致
  - resolve 必清冲突文件防累积
  - --take-platform 用 import 保隔离状态不被覆盖
related_tests:
  - path: test/cli-top-level-aliases.test.mjs
    reason: 新增 platform resolve 子命令，命令存在性测试清单需同步登记
---
