---
author: qinyi
created_at: 2026-09-15 21:18:02
---
# 任务清单（Tasks）

- [x] task-01: overlay 隔离并行会话声明文件（`_overlayBaseline` 三道 foreign 剔除 + 隔离打印）
- [x] task-02: no-op 文件剔除（`applyWorktree` hash-object vs 主仓 HEAD blob 对照）
- [x] task-03: supplyFiles 生成物供给（config-schema 键 + create 供给步 + meta 记录）（depends_on: task-01）
- [x] task-04: 勾选口径统一 + 归因多归属（helper + prefetchDiffFileSet + attributeSuspectTasks）
- [x] task-05: evidence 双根核验（runRequiredEvidenceCheckV2 双根取数）（depends_on: task-04）
- [x] task-06: 测试收口 + troubleshooting 章节 + 全量 npm test / lint（depends_on: task-01,02,03,04,05）
