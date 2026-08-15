---
id: task-01
title: O-1 shared.js docSyncHint 归属
title_zh: O-1 shared.js docSyncHint 归属
author: qinyi
created_at: 2026-08-15 23:10:00
priority: P0
depends_on: []
blocks: []
allowed_paths:
  - src/run/shared.js
  - src/run/complete-handlers.js
repo: main
goal: >
  auditQuickCompletion 加可选 specBase 参数（handleQuickStageCompletion 透传，调用点 complete-handlers.js:793 加 specBase 实参）；projectName 来源 = 调用方作用域 progress.project（dbProjectName），缺省 basename(cwd)；docSyncHint 分支动态 import docs-debt.js matchFilesToModules + modules.js parseModuleMapSimple 直读 map（绕 prompt.js ESM 环）；modules 字段 [{id,doc}]；读不到 map 降级现文案
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
