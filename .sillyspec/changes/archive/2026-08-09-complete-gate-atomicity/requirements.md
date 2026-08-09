---
author: qinyi
created_at: 2026-08-09T13:40:00+08:00
---

# 需求规范（Requirements）

## 功能需求（FR）

- **FR-01**：三处 stage 完成分支（complete.js:262-278 completeStep / stage.js:352-357 runStage noAI 末步 / complete.js:720-725 continueStep）的 persist completed `pm._write` 移到 `completeStageGates` 成功返回之后；`stageData.status='completed'` + `completedAt` + `progress.lastActive` 内存保留供 gate rollback
- **FR-02**：complete.js:262-278 的 `triggerSync` 同步移到 gate 成功后；stage.js:354 / complete.js:722 原无 triggerSync，只移 `_write`、不加 sync（行为不变，不引入新平台通知）
- **FR-03**：`completeStageGates`（gates.js:549）收尾段 :554-621 整体 try/catch，任一段（execute 并发预检 / handleScanStageCompleted / validateMetadata / validateFileLocations / auxiliary 重置 / runStageCompletionGates）抛非结构化异常 → `rollbackCompletionAndReturn`（回滚 in-progress + `_write` + 返回未完成对象），不冒顶 exit 1
- **FR-04**：:624 `handleExecuteWorktreeCleanup` 在 try/catch 外（execute worktree cleanup 副作用独立，失败不 rollback stage 状态）
- **FR-05**：auxiliary 阶段（scan）正确性 —— gate 成功后统一 `_write`，`stageData.status` 内存值决定落盘（auxiliary=pending / non-auxiliary=completed），无需特判
- **FR-06**：新增 `test/stage-completion-atomicity.test.mjs`（completeStageGates 异常兜底 rollback + runStageCompletionGates 内 runValidators/runVerifyTestCheck throw rollback + 原子性回归）
- **FR-07**：全量 `npm test` + `npm run lint` 全绿

## 决策引用
- **D-001@v1**：③ complete-stage 后门（stage-machine.js:36）defer，单独立项（用户 AskUserQuestion 确认），记债单 review #2b。本变更不覆盖（③ 非 FR 范围，属 complete-stage 后门收敛独立项）。

## 剩余风险
- **R5**：第 4 处 persist 站点 `handleScanStageCompleted`（complete-handlers.js:930，scan+平台+warnings 落盘 completed）pre-existing，本变更不处理，记债单 review #2c（scan 是 auxiliary reset 覆盖，风险小）。
