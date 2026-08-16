---
id: task-01
title: P1 module-map v2 + module cards backfill
title_zh: P1 module-map 升 v2 + 模块卡补录 26 文件
author: qinyi
created_at: 2026-08-16 18:25:17
priority: high
depends_on: []
blocks: [task-02, task-03, task-04]
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/_module-map.yaml
  - .sillyspec/docs/sillyspec/modules/progress.md
  - .sillyspec/docs/sillyspec/modules/docs-consistency.md
  - .sillyspec/docs/sillyspec/modules/core-engine.md
  - .sillyspec/docs/sillyspec/modules/stages.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/worktree.md
  - .sillyspec/docs/sillyspec/modules/setup.md
  - .sillyspec/docs/sillyspec/modules/change-management.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.md
goal: _module-map.yaml 升 schema v2（全模块补 paths），26 个缺文档文件归卡补写，propose 卡内回收
implementation: |
  schema_version: 2 + 全模块 paths 补录（26 文件按目录前缀+源码头注释归卡）；
  新建 progress.md（progress.js facade + src/progress/ 5 文件）与 docs-consistency.md（docs-check/gate/debt/scan-staleness 四件）两卡；
  core-engine/stages 卡移除 propose 描述；worktree 卡 git-helper 补录闭环 needs_review；
  每文件 1-2 行描述读源码头部注释写，不臆测。
acceptance:
  - schema_version=2 且 26 文件全有 paths 归属
  - parseModuleMapSimple 解析模块数 ≥20
  - 模块卡内 propose 零阶段描述残留
verify: node -e 调 parseModuleMapSimple 解析 + grep propose modules/
constraints: 勿跑 modules rebuild --force（清空 paths）
---
