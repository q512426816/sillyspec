---
author: qinyi
created_at: 2026-09-14 11:40:00
---
# 任务清单（Tasks）

- [x] task-01: scan-diff 聚合改「落后最多」+ collectStaleRefs/parseNameStatus 导出 (depends_on: —)
- [x] task-02: scan-staleness 基线收集改全文档聚合 (depends_on: —)
- [x] task-03: bumpScanDocBaselines 独立盖章函数 + 单测 (depends_on: —)
- [x] task-04: worktree-guard 握手分支 + 7/40 归一化修复 (depends_on: —)
- [x] task-05: scan-refresh 计算层 computeRefreshPlan (depends_on: task-01,task-04)
- [x] task-06: scan-refresh IO 面 + index.js 接线 (depends_on: task-03,task-05)
- [x] task-07: 全链路 e2e 临时 git 仓验证 (depends_on: task-06)
- [x] task-08: 契约文档同步（interface-map/file-lifecycle） (depends_on: task-06)
