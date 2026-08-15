---
id: task-02
title: O-1 quick-audit 渲染
title_zh: O-1 quick-audit 渲染
author: qinyi
created_at: 2026-08-15 23:10:00
priority: P0
depends_on: [task-01]
[task-01, task-02, task-03, task-04]
blocks: []
allowed_paths:
  - src/run/quick-audit.js
repo: main
goal: >
  printQuickAuditReview docSyncHint 块 modules 非空时追加'涉及模块：id1 · id2'
implementation:
  - 见 goal
acceptance:
  - 对应 FR 通过
verify:
  - npm test
constraints:
  - 全降级不抛
---

## 验收标准

- 见 frontmatter goal 与 requirements FR
