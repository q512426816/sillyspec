---
id: task-04
title: 新增 docs-check 单测
title_zh: 新增 docs-check 单测
author: qinyi
created_at: 2026-08-15 16:16:00
priority: P0
depends_on: [task-01]
blocks: [task-06]
allowed_paths:
  - test/docs-check.test.mjs
repo: main
goal: >
  新增 test/docs-check.test.mjs 覆盖 FR-006：引用提取（全文扫描）、行号边界、
  候选解析三段回退、glob walker（**/* 形态/skip 排除/复杂 glob exit 2）、exit code 行为。
implementation:
  - tmp fixture：构造含合法/非法引用的 md + 对应源文件树
  - 纯函数断言：collectDocRefs 提取集合、validateRefLine 边界（=总行数/超界）
  - runDocsCheck 集成：invalid 报告字段、keywordAssert=false 行为
  - glob walker：docs/**/*.md 命中、skip 排除、字面路径、不支持的形态报错
acceptance:
  - node --test test/docs-check.test.mjs 全绿
  - 覆盖 design FR-006 列举的全部场景
verify:
  - node --test test/docs-check.test.mjs
constraints:
  - fixture 全部 tmp 目录，不污染仓库
---

## 验收标准

- 全部场景绿：提取/边界/回退/walker/exit code（FR-002/003/006）
