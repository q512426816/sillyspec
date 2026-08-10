---
id: task-11
title: src/index.js platform pull 子命令
title_zh: 新增 platform pull 手动拉取子命令
author: qinyi
created_at: 2026-08-10 15:24:01
priority: P1
depends_on: [task-06, task-07]
blocks: [task-15]
requirement_ids: [FR-03]
decision_ids: [D-006, D-009]
allowed_paths:
  - src/index.js
  - src/sync.js
expects_from:
  task-06:
    - contract: PullListResult
      needs: [ok, changes, reason]
  task-07:
    - contract: PullResult
      needs: [ok, imported, conflict, reason]
goal: >
  新增 platform pull 子命令供用户手动拉取平台进度，可选指定单个变更。
implementation:
  - index.js platform case 加 pull 子命令分支
  - 支持 --change <名> 指定单变更拉取，不带则先 pullList 再按需 pull
  - 输出拉取结果 ok imported conflict reason
  - 未连接平台提示先 platform connect
acceptance:
  - platform pull 无参数时先拉列表再按需拉完整进度
  - platform pull --change <名> 拉单变更
  - 未连接平台输出明确提示不崩
verify:
  - npm test
  - npm run lint
constraints:
  - 手动 pull 与自动 triggerPull 共用 SyncManager.pull
  - 检查 cmd-existence 相关测试是否需登记新子命令
related_tests:
  - path: test/cli-top-level-aliases.test.mjs
    reason: 新增 platform pull 子命令，命令存在性测试清单需同步登记
---
