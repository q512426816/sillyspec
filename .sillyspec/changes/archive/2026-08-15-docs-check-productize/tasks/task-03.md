---
id: task-03
title: config-schema 加 docs-check 配置段
title_zh: config-schema 加 docs-check 配置段
author: qinyi
created_at: 2026-08-15 16:16:00
priority: P1
depends_on: [task-01]
blocks: []
allowed_paths:
  - src/config-schema.js
repo: main
goal: >
  config-schema.js 声明 docs-check 配置段（paths/skip/keywordAssert，含缺省值与说明），
  renderExample() 同步输出该段（耦合测试要求 live 键必出现于 example 文本）。
implementation:
  - 配置键声明：paths 缺省 ['docs/**/*.md']、skip 缺省 []、keywordAssert 缺省 true
  - renderExample() 增加对应 yaml 段落
acceptance:
  - npm test 全绿（config-schema 耦合测试不红）
  - local.yaml.example 渲染含 docs-check 段
verify:
  - npm test
constraints:
  - 缺省值与 design §3.3 逐字一致
---

## 验收标准

- live 键 docs-check.paths/skip/keywordAssert 出现于 renderExample 输出
- npm test config-schema 相关测试全绿（FR-004）
