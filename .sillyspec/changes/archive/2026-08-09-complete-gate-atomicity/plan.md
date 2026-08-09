---
author: qinyi
created_at: 2026-08-09T13:45:00+08:00
plan_level: full
---

# 实现计划（Plan）— stage 完成原子性

依据 design.md（方案 A：persist 移后 + completeStageGates 整体 try/catch）+ requirements.md（FR-01~07）。

## Wave 1（persist 移后 + try/catch，task 间顺序但同 wave）

- [x] task-01: complete.js:262-278（completeStep 完成分支）persist completed `pm._write` + `triggerSync` 移到 `completeStageGates` 成功返回之后；`stageData.status='completed'` + `completedAt` + `progress.lastActive` 内存保留供 gate rollback（覆盖：FR-01, FR-02）
- [x] task-02: stage.js:352-357（runStage noAI 末步完成分支）persist `pm._write` 移到 gate 成功后（原无 triggerSync，只移 `_write`、不加 sync）（覆盖：FR-01）
- [x] task-03: complete.js:720-725（continueStep 完成分支）persist `pm._write` 移到 gate 成功后（原无 triggerSync，只移 `_write`）（覆盖：FR-01）
- [x] task-04: gates.js:549 `completeStageGates` 收尾段 :554-621 整体 try/catch（execute 并发预检 + handleScanStageCompleted + validateMetadata + validateFileLocations + auxiliary 重置 + runStageCompletionGates），异常 `rollbackCompletionAndReturn`；:624 `handleExecuteWorktreeCleanup` 在 try 外（覆盖：FR-03, FR-04, FR-05）

## Wave 2（依赖 Wave 1，测试 + 验证）

- [x] task-05: 新增 `test/stage-completion-atomicity.test.mjs`（completeStageGates 异常兜底 rollback + runStageCompletionGates 内 runValidators/runVerifyTestCheck throw rollback + 原子性回归）（覆盖：FR-06）
- [x] task-06: 全量 `npm test` + `npm run lint` 全绿 + stage 完成 E2E 回归（覆盖：FR-07）

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR | 说明 |
|---|---|---|---|---|---|---|
| task-01 | complete.js:262-278 completeStep persist `_write`+`triggerSync` 移后 | W1 | P0 | — | FR-01,02 | stageData.status 内存保留供 rollback |
| task-02 | stage.js:352-357 runStage noAI 末步 persist `_write` 移后 | W1 | P0 | — | FR-01 | 原无 triggerSync，只移 _write |
| task-03 | complete.js:720-725 continueStep persist `_write` 移后 | W1 | P0 | — | FR-01 | 原无 triggerSync，只移 _write |
| task-04 | gates.js completeStageGates :554-621 try/catch | W1 | P0 | — | FR-03,04,05 | :624 cleanup 在 try 外 |
| task-05 | test/stage-completion-atomicity.test.mjs | W2 | P0 | task-01~04 | FR-06 | 异常兜底 + 原子性 |
| task-06 | 全量测试 + lint + 回归 | W2 | P0 | task-05 | FR-07 | 验收门禁 |

## 关键路径

task-01/02/03（三处 persist 移后，可并行）+ task-04（try/catch，独立）→ task-05（测试）→ task-06（验收）。task-04 不依赖 task-01~03（completeStageGates 改造独立于调用点）。

## 全局验收标准

- [ ] 三处 persist completed 移到 `completeStageGates` 成功返回之后（`stageData.status='completed'` 内存保留供 rollback）
- [ ] triggerSync 仅 complete.js:262-278 移后（stage.js:354 / complete.js:722 原无 triggerSync，只移 `_write`）
- [ ] `completeStageGates` :554-621 整体 try/catch，任一段异常 `rollbackCompletionAndReturn`（不冒顶 exit 1）
- [ ] :624 `handleExecuteWorktreeCleanup` 在 try/catch 外（cleanup 副作用独立）
- [ ] auxiliary 阶段（scan）gate 成功后 `_write` 落盘 pending（内存值决定，回归）
- [ ] completeStageGates/runStageCompletionGates 异常兜底 rollback 测试通过
- [ ] `npm test` + `npm run lint` 全绿

## 覆盖矩阵（FR → task）

| FR | 覆盖任务 | 验收证据 |
|---|---|---|
| FR-01 | task-01,02,03 | 三处 persist 移到 gate 后 |
| FR-02 | task-01 | triggerSync 仅 complete.js 移后 |
| FR-03 | task-04 | completeStageGates :554-621 try/catch |
| FR-04 | task-04 | :624 cleanup 在 try 外 |
| FR-05 | task-04,06 | auxiliary 内存值决定落盘（回归验证） |
| FR-06 | task-05 | 异常兜底测试 |
| FR-07 | task-06 | npm test + lint 全绿 |
