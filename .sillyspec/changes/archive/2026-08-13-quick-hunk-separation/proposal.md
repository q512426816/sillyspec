---
author: qinyi
created_at: 2026-08-13 13:26:51
---
# 提案书（Proposal）— quick --done 同文件并发检测 + hunk 分离提示

## 动机
SillySpec 多 agent 同仓，quick 是最高频并发。同文件并发（我的 allowedFile + 他者改动）时 commit 整文件 pathspec 夹带他者 hunk，污染 commit 归属（实证 f1709ec）。

## 关键问题
1. **baseline 按路径整文件跳过**（`shared.js isBaselineFile`）：同文件并发不可见——审计既看不到我的改动也看不到并发（`shared.js:569 continue` + `concurrent-detect ownFiles rule3` 双向证实）。
2. **commit 整文件 pathspec 夹带他者 hunk**：实证 prompt.js f1709ec——我改 `loadModuleContextIndex` + 他者改 `_outputStepForTest` 注释，混在一个 commit。
3. **detectConcurrentChanges 不检测"同文件 hunk 混"**：只检测他者改动（不同文件 / 不同 change）。

## 变更范围
quick --done 加同文件并发检测（方案 A hash 对比）：guard.json 加 `allowedFilesHash` + auditQuickCompletion 末尾检测 warn（advisory）。详见 design.md。

## 方案
方案 A（hash 对比）：step1 录 allowedFiles sha256，--done 对比 hash 变化检测"我改了 baseline 文件" → warn + git add -p/patch 分离指引。D-003@v1。

## 不在范围内（Non-Goals）
- 不检测其他 stage（brainstorm/plan/execute/verify/archive）的 --done（D-001 quick only，后续扩展）
- 不自动 hunk 分离（只 warn + 给指引，用户手动 git add -p/patch）
- 不阻断 --done（advisory，D-002）
- 不改 baseline 跳过逻辑（方案 A 加检测层，baseline 不变量不动）
- 不处理 execute worktree 同文件并发（不同子系统，单独记）
