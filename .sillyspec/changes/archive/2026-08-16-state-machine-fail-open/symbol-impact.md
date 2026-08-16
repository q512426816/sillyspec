---
author: qinyi
created_at: 2026-08-16 16:08:30
---

# 符号影响面报告（Symbol Impact）

## 结论

- **task-01**：src/constants.js 新增 `READONLY_AUXILIARY_STAGES` 导出——**无签名级变更**（纯新增常量，不修改任何既有函数/接口签名；既有 AUXILIARY_STAGES 原样保留）。
- **task-02**：src/run/stage.js :128-133 写 currentStage 处加 auxiliary 守卫——**无签名级变更**（内部条件逻辑，不改函数签名/返回结构）。
- **task-03**：src/run/command.js --done 补 checkTransition + read-only 短路 + brainstorm gating——**无签名级变更**（内部控制流，checkTransition/completeStep/registerChange/ensureStageSteps 签名均不变）。
- **task-04**：src/run/complete.js :328/:810 + src/run/stage.js :377 消费点设 process.exitCode——**无签名级变更**（completeStageGates 签名与返回契约不变，仅在消费侧追加进程级副作用）。
- **task-05**：test/state-machine-guards.test.mjs 新增回归测试——**无签名级变更**（纯新增测试文件）。

## 调用点检查说明

本变更无任何 class/interface/DTO/API client 签名变更，无既有函数签名增删改，无需调用点搜索；所有改动均为模块内部实现语义（currentStage 写入策略、--done 守卫、退出码设置），不改变任何导出符号的签名。
