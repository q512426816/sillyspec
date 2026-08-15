---
id: task-04
title: docs-debt 单测
title_zh: docs-debt 单测
author: qinyi
created_at: 2026-08-15 21:16:00
priority: P0
depends_on: [task-01, task-02, task-03]
blocks: [task-05]
allowed_paths:
  - test/docs-debt.test.mjs
repo: main
goal: >
  FR-006 全场景：归属三级（paths/core_files 双读/卡片引用/unmapped）、双 commit 口径
  （behind 数/untracked 卡）、零输出、CRLF map、超时降级。含本仓实测 loadModuleContextIndex 非空。
implementation:
  - tmp git 仓 fixture（多模块 map + 卡片 + commit 序列）
  - 注入集成：outputStep 分支真调（有债/无债两 fixture）
acceptance:
  - node --test test/docs-debt.test.mjs 全绿
verify:
  - node --test test/docs-debt.test.mjs
constraints:
  - fixture 全 tmp 不污染仓库
---

## 验收标准

- FR-003/FR-006 全绿
