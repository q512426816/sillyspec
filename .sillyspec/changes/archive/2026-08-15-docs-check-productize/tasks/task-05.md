---
id: task-05
title: 迁移 dogfood doc-ref-check 测试
title_zh: 迁移 dogfood doc-ref-check 测试
author: qinyi
created_at: 2026-08-15 16:16:00
priority: P0
depends_on: [task-01]
blocks: [task-06]
allowed_paths:
  - test/doc-ref-check.test.mjs
repo: main
goal: >
  test/doc-ref-check.test.mjs 迁移为调 runDocsCheck({ projectRoot: repoRoot })，
  两层校验全开（keywordAssert 缺省 true），检测力不降级（D-007/FR-005）。
implementation:
  - 删内联实现，改 import runDocsCheck
  - 断言面保持：platform-interface-map.md 引用全绿 + 关键词断言仍生效
  - 迁移前后对同一文档跑一次对照输出（diff 为空即检测力一致）
acceptance:
  - npm test 全绿
  - 迁移前后 invalid/total 输出一致（检测力对照）
verify:
  - npm test
constraints:
  - 不允许删断言凑绿（规则 11）
---

## 验收标准

- 迁移后 npm test 绿且两层全开（FR-005）
