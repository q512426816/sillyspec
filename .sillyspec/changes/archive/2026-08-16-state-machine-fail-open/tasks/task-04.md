---
id: task-04
title: Gate failure sets process exit code 1 at consumption points
title_zh: complete.js/stage.js 消费点 gate 失败置退出码 1
author: qinyi
created_at: 2026-08-16 16:02:14
priority: P0
depends_on: []
blocks: [task-05]
requirement_ids: [FR-01]
decision_ids: [D-002@v2]
allowed_paths:
  - src/run/complete.js
  - src/run/stage.js
goal: >
  三处 completeStageGates 消费点（completeStep/continueStep/noAI）在返回 stageCompleted=false 时设 process.exitCode=1，覆盖 rollback 回滚与 scan 非平台 failed_post_check 直返两条失败路径，对齐 quick 审计 blocked→exit 1。
implementation:
  - complete.js :328/:810 与 stage.js :377 消费点：`if (_stageGatesResult?.stageCompleted === false) process.exitCode = 1`
acceptance:
  - 构造 gate 失败（缺产物），--done 后进程 exit code = 1 且进度回滚 pending
  - scan 非平台 failed_post_check --done 后 exit code = 1
constraints:
  - 用 process.exitCode 非 exit(1)（回滚落盘完成后自然退出）；不改 completeStageGates 签名
  - allowed_paths 含 src/run/stage.js：Wave 1 由 task-02 修改，跨 Wave 共享为串行安全
verify: "npm test（gate 失败 exit code 断言）+ npm run lint"
---
