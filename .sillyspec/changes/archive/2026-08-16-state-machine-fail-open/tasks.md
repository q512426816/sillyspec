---
author: qinyi
created_at: 2026-08-16 15:52:30
---

# 任务清单（Tasks）

> 本文件由 brainstorm 生成初版任务骨架，plan 阶段将按 design Phase/Wave 细化。

## 任务列表

- [ ] task-01 | constants.js 新增 `READONLY_AUXILIARY_STAGES`（status/doctor）+ 校验引用（FR-04）
- [ ] task-02 | stage.js:128-133 仅非 auxiliary 阶段写 currentStage（FR-03）
- [ ] task-03 | command.js:--done 补 checkTransition（含 fromStageData，FR-02）+ read-only auxiliary 置顶短路（FR-04）+ brainstorm auto-create gating（FR-05）
- [ ] task-04 | complete.js:328/:810 + stage.js:377 消费点 `stageCompleted===false` → process.exitCode=1（FR-01）
- [ ] task-05 | test/state-machine-guards.test.mjs 子进程驱动回归测试（FR-07）+ 全量 npm test / lint 验证
