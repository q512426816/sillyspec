---
id: task-05
title: 测试三件
title_zh: 测试三件
author: qinyi
created_at: 2026-08-15 23:10:00
priority: P0
depends_on: [task-01, task-02, task-03, task-04]
blocks: []
allowed_paths:
  - test/audit-quick-completion.test.mjs
  - test/docs-debt.test.mjs
  - test/docs-check-cli.test.mjs
repo: main
goal: >
  audit D-8 场景升级 modules 断言（fixture 加 map+卡片）+ FR-002 两分支（map 缺失/解析空降级现文案）；docs-debt O-2 内联场景（fixture 卡含失效引用）；docs-check-cli 新增（子进程：--suggest 识别/未知 flag exit 2/💡 门控三场景）
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
