---
id: task-03
title: O-2 docs-debt 内联
title_zh: O-2 docs-debt 内联
author: qinyi
created_at: 2026-08-15 23:10:00
priority: P0
depends_on: []
blocks: []
allowed_paths:
  - src/docs-debt.js
repo: main
goal: >
  facts 渲染 debtEntries 循环：docGitPath&&docGitRoot 守卫下调 runDocsCheck({projectRoot:docGitRoot,docs:[docGitPath]})，invalid 非零内联'卡内失效引用 N 处：ref→建议 Lxx'（每模块上限 3 条，suggest 非空显示，异常降级跳过）
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
