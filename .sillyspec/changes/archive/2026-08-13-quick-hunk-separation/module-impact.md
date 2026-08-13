---
author: qinyi
created_at: 2026-08-13 13:40:00
---

# 模块影响分析（Module Impact）— quick --done 同文件并发检测

## 受影响模块

### runtime（主要）
- **auditQuickCompletion**（`src/run/shared.js`）：末尾加同文件并发检测 + warn（advisory）。**不破坏现有审计**——baseline 跳过逻辑（isBaselineFile）不变，changedFiles/blocked 判定不变，只 push reasons + console.warn。
- **stage.js step1**（`src/run/stage.js`）：录 allowedFilesHash（guard schema 扩展，~line 270 baselineCommit 附近）。guard 落盘加一个字段。

### quick-audit（printQuickAuditReview）
- 不改（检测 warn 在 auditQuickCompletion 内，printQuickAuditReview 只打印 review.status）。

### concurrent-detect
- 不改（detectConcurrentChanges 检测他者改动；本检测是"同文件 hunk 混"，独立于 detectConcurrentChanges）。

## 不受影响
- 其他 stage（brainstorm/plan/execute/verify/archive）：本变更 quick --done only（D-001）。
- worktree / 平台同步 / DB schema：不改（guard 是本地 session 元数据，加字段不触平台脏度，R5）。

## 兼容性
- **向后兼容**：旧 guard（无 allowedFilesHash）→ `guard.allowedFilesHash?.[f] === undefined` → 检测跳过（不报）。
- **baseline 跳过不变量**：方案 A 加检测层，不动 baseline 按路径跳过逻辑（D-003，避方案 B 破坏审计）。
- **advisory**：不改 result.status（只 push reasons + warn），与 detectConcurrentChanges 一致（D-002）。

## 风险
- **guard schema 扩展**：guard.json 加 allowedFilesHash 字段。既有 guard.json 深比较断言（如有）需核查（task-05 grep）。
- **CRLF**：step1/--done 同机同文件，hash 一致（R2）。
