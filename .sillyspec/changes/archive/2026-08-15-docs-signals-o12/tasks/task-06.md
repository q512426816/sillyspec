---
id: task-06
title: file-lifecycle 同步
title_zh: file-lifecycle 同步
author: qinyi
created_at: 2026-08-15 23:10:00
priority: P0
depends_on: [task-05]
blocks: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
repo: main
goal: >
  quick 行 docSyncHint modules + execute 行 O-2 内联说明
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
