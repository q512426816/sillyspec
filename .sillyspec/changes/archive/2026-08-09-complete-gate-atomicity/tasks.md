---
author: qinyi
created_at: 2026-08-09T13:40:00+08:00
---

# 任务清单（Tasks）

## Wave 1：persist 移后 + try/catch

- [ ] T-001：complete.js:262-278（completeStep 完成分支）persist completed `_write` + `triggerSync` 移到 `completeStageGates` 成功返回之后（stageData.status='completed' 内存保留）
- [ ] T-002：stage.js:352-357（runStage noAI 末步完成分支）persist `_write` 移到 gate 成功后（原无 triggerSync，只移 _write）
- [ ] T-003：complete.js:720-725（continueStep 完成分支）persist `_write` 移到 gate 成功后（原无 triggerSync，只移 _write）
- [ ] T-004：gates.js:549 `completeStageGates` 收尾段 :554-621 整体 try/catch（execute 预检 + handleScanStageCompleted + validateMetadata + validateFileLocations + auxiliary 重置 + runStageCompletionGates），异常 rollbackCompletionAndReturn；:624 handleExecuteWorktreeCleanup 在 try 外

## Wave 2：测试 + 验证

- [ ] T-005：新增 `test/stage-completion-atomicity.test.mjs`（completeStageGates/runStageCompletionGates 异常兜底 rollback + 原子性）
- [ ] T-006：全量 `npm test` + `npm run lint` 全绿 + stage 完成 E2E 回归
