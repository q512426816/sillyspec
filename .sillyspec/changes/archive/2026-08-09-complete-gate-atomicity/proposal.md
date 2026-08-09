---
author: qinyi
created_at: 2026-08-09T13:40:00+08:00
---

# 方案概述（Proposal）

## 需求
修复 `docs/sillyspec/review-2026-08-09.md` #2 [P1][共识 F+C]：stage 完成分支 persist completed → gate 崩溃窗口 + gate 异常冒顶 exit 1。

## 方案（方案 A 最小原子性，用户 AskUserQuestion 选定）

- **Phase 1 — persist 移后**：三处 stage 完成分支（complete.js:262-278 completeStep / stage.js:352-357 runStage noAI 末步 / complete.js:720-725 continueStep）的 persist completed（`pm._write`）移到 `completeStageGates` 成功返回之后；`stageData.status='completed'` 内存保留供 gate rollback（`rollbackStageCompletion` gates.js:145 依赖）。triggerSync 仅 complete.js:262-278 有（实读源码），另两处原无 triggerSync 只移 `_write`。
- **Phase 2 — 异常兜底**：`completeStageGates`（gates.js:549）收尾段 :554-621 整体 try/catch，任一段（execute 预检 / handleScanStageCompleted / validateMetadata / validateFileLocations / auxiliary 重置 / runStageCompletionGates）抛非结构化异常 → `rollbackCompletionAndReturn`（不冒顶 exit 1）；不含 :624 `handleExecuteWorktreeCleanup`（cleanup 副作用独立）。

## 行为不变
gate 全过才 completed（persist 移后）；gate 失败/异常 rollback in-progress。auxiliary 阶段（scan）gate 成功后统一 `_write`，`stageData.status` 内存值决定落盘（auxiliary=pending / non-auxiliary=completed）。

## 不在范围内 / Non-Goals
- ③ complete-stage 后门（stage-machine.js:36）收敛 —— **defer 单独立项**（D-001@v1，用户 AskUserQuestion 确认），记债单 review #2b（涉及 progress→run 分层重构）
- user-inputs.md appendFileSync 裸跑（#7 范围）
- 第 4 处 persist handleScanStageCompleted:930（pre-existing，记债单 review #2c）
- persist 单点入 completeStageGates 内部（方案 B 重构大）
- CAS/transaction（方案 C better-sqlite3 同步长持锁不现实）
