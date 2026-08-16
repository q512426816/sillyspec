---
id: task-02
title: P2 STRUCTURE.md tree refresh
title_zh: P2 STRUCTURE.md 目录树刷新
author: qinyi
created_at: 2026-08-16 18:25:17
priority: high
depends_on: [task-01]
blocks: [task-03, task-04]
allowed_paths:
  - .sillyspec/docs/sillyspec/scan/STRUCTURE.md
goal: STRUCTURE.md 目录树从 850b485 旧结构刷新到当前 src/ 实测结构，移除 propose 条目
implementation: |
  按 ls src/ 实测重写目录树：run.js barrel（23 行重导出）、src/run/ 11 文件、
  src/progress/ 5 文件、src/dispatch/（backends/probe/strategy）、src/sillyhub-mcp/、
  src/stages/ 15 文件、src/hooks/、根级文件全列带一行注释；
  移除 propose.js 条目；frontmatter source_commit/updated_at 更新。
acceptance:
  - 目录树条目与 ls src/ 逐项一致（含子目录文件数）
  - 无 propose.js 条目
verify: 对照 ls src/ 逐项核对 + grep propose STRUCTURE.md
constraints: 引用行号需过 docs check（写 file:line 时对照源码实测行号）
---
