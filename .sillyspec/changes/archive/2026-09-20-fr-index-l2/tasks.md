---
author: zcode-fr-l2
created_at: 2026-09-20 07:30:00
---
# 任务注册表（Tasks）— 2026-09-20-fr-index-l2

- [x] task-01: fr-index.js——parseChangeRequirements 决策矩阵解析（decisions 字段）+ indexRequirements 条目「依据决策：」行（省略态）+ 文件头模块卡指针 + readActiveFrDigest.decisions
- [x] task-02: 注入渲染点（prompt.js 或 brainstorm.js 实读定位）条目附 D 锚（截前 3）
- [x] task-03: test/fr-index-l2.test.mjs 断言组（矩阵/条目行/digest/指针/省略态/GWT/回填） + 全量绿 (depends_on: task-01, task-02, task-04, task-05)
- [x] task-04: fr-index.js GWT 捕获（scenarioBodies）+ 条目「场景正文：」块渲染（截 80 字 ≤5 场景）
- [x] task-05: backfillScenarioBodies（标题匹配回填，幂等）+ CLI sillyspec fr-backfill
