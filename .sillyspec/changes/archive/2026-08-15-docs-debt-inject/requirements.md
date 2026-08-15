---
author: qinyi
created_at: 2026-08-15 21:12:00
change: 2026-08-15-docs-debt-inject
---

# 需求（Requirements）

- FR-001 computeDocsDebt 在含 paths/core_files 的 map fixture 上正确归属 + 算出 behind
- FR-002 v1 无 paths map 退路（卡片引用粗归属）工作；全缺失输出单行事实不抛
- FR-003 CRLF map 解析修复后 loadModuleContextIndex 返回非空（本仓实测）
- FR-004 Wave prompt 注入：有债出现 [docs-debt] 块；无债无残留占位符
- FR-005 npm test 全量绿 + lint 过
- FR-006 单测覆盖：归属三级（含 core_files）/双 commit 口径/untracked 卡片/零输出/CRLF/超时降级
- FR-007 changedFiles 口径：worktree baselineCommit..HEAD + 未提交并集；in-place 退 cwd

## 决策覆盖

- D-001@v1 累计 diff → FR-007；D-002@v1 CRLF 并入 → FR-003；D-003@v1 归属三级 → FR-001/002
- D-004@v1 双 commit 口径 → FR-006；D-005@v1 advisory → FR-004；D-006@v1 占位符链 → FR-004
