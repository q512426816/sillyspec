---
author: flow-machine-draft
---
# 任务注册表（Tasks）— 2026-09-29-flow-task-heartbeat

> 任务面归 agent（协议：flow status 取下一个 → 做一件 → 勾一格 → 重跑；全勾后 flow done）。

- [x] task-01: flow status 心跳块——②阶段当场重读 tasks.md 给下一任务指针/进度/循环指引，全勾改指 flow done；移除旧 tickNudge（含 baseline git 调用）
- [x] task-02: 协议文案三处同步——flow start 简报两路、draftTasks 头部纪律行、AGENTS.md 恢复与查看段
- [x] task-03: 测试——新增 test/flow-status-heartbeat.test.mjs 行为四面；适配 tick-loop-nudge ①③钉与头注释
- [x] task-04: 全量验证——flow 系+test:core 全绿；核验逐 task 哨兵既有行为零改动（sentinel 用例全绿佐证）
