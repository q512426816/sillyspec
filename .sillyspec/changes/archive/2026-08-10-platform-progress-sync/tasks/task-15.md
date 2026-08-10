---
id: task-15
title: 冲突状态机 round-trip 测试
title_zh: clean 与 conflict 与 resolved 冲突状态机往返测试
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P0
depends_on: [task-12, task-13]
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-002, D-010]
allowed_paths:
  - test/sync-conflict-statemachine.test.mjs
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
  用测试证明冲突状态机 clean 到 conflict 到 resolved 各路径符合 design 生命周期契约表。
implementation:
  - 建临时 DB 与模拟平台响应，覆盖 push 409 与 pull 本地脏度两路进 conflict
  - 断言 conflict 态写冲突文件且不 import 不 push
  - 覆盖 resolve --keep-local 与 --take-platform 与 --abort 三路径回 clean
  - 断言各 resolve 后冲突文件被清理
acceptance:
  - push 409 与 pull 脏度均正确进入 conflict 态并写冲突文件
  - 三种 resolve 后回 clean 且冲突文件被清理
  - --keep-local 只更新 base_ts，--take-platform 调 import，--abort 不改动
  - 测试全部通过
verify:
  - node --test test/sync-conflict-statemachine.test.mjs
  - npm test
constraints:
  - 测试用临时目录与模拟平台不碰真实服务与真实 .runtime
  - fixture 须显式 cwd 或 chdir 避免解析错仓库
  - 状态迁移与 design 契约表逐条对齐
---
