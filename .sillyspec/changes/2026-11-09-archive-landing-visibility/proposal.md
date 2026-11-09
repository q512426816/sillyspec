---
author: flow-machine-draft
created_at: 2026-11-09T06:35:00.825Z
---
# 提案书（Proposal）— 2026-11-09-archive-landing-visibility

## 动机

任务原话转写：归档落库终态可见性与 doctor 残留检查

动机与背景：连续三个变更（multi-agent-platform 仓 2026-11-09）flow done 归档子步后，归档提交未落库的 🚨 警告打在输出中段而最后一行是「✅ flow done 完成」——agent/人尾部消费（tail）得到假成功印象，归档件滞留共享暂存区（并行 index 手术可丢）。归档提交由 agent 手工执行是既有设计（共享仓竞态 + pre-commit hook 纪律，complete-handlers.js 注释已论证），不改该设计，改可见性与兜底。

成功标准：
- flow done 终态输出携带归档落库状态：已落库 → 成功行注明；未落库 → 输出末尾（最终可见行）高亮 🚨 与待执行 commit 命令（幂等 pathspec），退出码保持 0（exit≠0 语义已被测试门/收口失败占用，防 fail-closed 消费者误判）
- doctor 新增「归档提交残留」检查项：暂存区存在指向 changes/<名>/ 或 changes/archive/<名>/ 的条目且该变更未落 HEAD 树 → WARNING + 修复命令建议（只读 advisory，复用 archiveLandedInHeadTree 判定）
- 新增测试：终态渲染（落库/未落库两态）与 doctor 检查（残留命中/干净/非仓跳过）；既有 archive-commit-suggest-race 回归全绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. flow done 终态输出携带归档落库状态：已落库 → 成功行注明；未落库 → 输出末尾（最终可见行）高亮 🚨 与待执行 commit 命令（幂等 pathspec），退出码保持 0（exit≠0 语义已被测试门/收口失败占用，防 fail-closed 消费者误判）
2. doctor 新增「归档提交残留」检查项：暂存区存在指向 changes/<名>/ 或 changes/archive/<名>/ 的条目且该变更未落 HEAD 树 → WARNING + 修复命令建议（只读 advisory，复用 archiveLandedInHeadTree 判定）
3. 新增测试：终态渲染（落库/未落库两态）与 doctor 检查（残留命中/干净/非仓跳过）；既有 archive-commit-suggest-race 回归全绿

## 成功标准（可验证）

1. flow done 终态输出携带归档落库状态：已落库 → 成功行注明；未落库 → 输出末尾（最终可见行）高亮 🚨 与待执行 commit 命令（幂等 pathspec），退出码保持 0（exit≠0 语义已被测试门/收口失败占用，防 fail-closed 消费者误判）
2. doctor 新增「归档提交残留」检查项：暂存区存在指向 changes/<名>/ 或 changes/archive/<名>/ 的条目且该变更未落 HEAD 树 → WARNING + 修复命令建议（只读 advisory，复用 archiveLandedInHeadTree 判定）
3. 新增测试：终态渲染（落库/未落库两态）与 doctor 检查（残留命中/干净/非仓跳过）；既有 archive-commit-suggest-race 回归全绿
