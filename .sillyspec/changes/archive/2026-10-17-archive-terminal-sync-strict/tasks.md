---
author: flow-machine-draft
created_at: 2026-10-17T06:17:49.417Z
---
# 任务注册表（Tasks）— 2026-10-17-archive-terminal-sync-strict

- [x] task-01: syncSpecTree 返回携带 ok 契约（成功/合法态 true、通道失败 false、未决冲突无 ok=fail-closed 未确认），单测钉两种可达路径
- [x] task-02: triggerSyncTerminalStrict 状态机单测：非终态委托、未连接静默、终态 treeOk 判定、冲突让位、预算熔断按未确认处置、失败告警含自救命令且 exitCode=1，全绿
- [x] task-03: 受影响面既有测试零回归（platform-sync 两件 + archive-chain + change-delete + run-complete-step-archive + flow-done-fail-brief）
- [x] task-04: 语法门（node test/check-syntax.mjs）通过；dogfood flow done 真实走一遍新强校验路径（平台健康时静默 confirmed）
