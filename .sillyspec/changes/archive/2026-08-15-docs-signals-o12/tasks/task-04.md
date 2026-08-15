---
id: task-04
title: F-1 flag 白名单
title_zh: F-1 flag 白名单
author: qinyi
created_at: 2026-08-15 23:10:00
priority: P0
depends_on: []
blocks: []
allowed_paths:
  - src/index.js
repo: main
goal: >
  BARE_FLAGS=['--suggest'] PAIRED_FLAGS=['--paths']，未知 --xxx exit 2 报错；💡 候选行号行 --suggest 门控
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
