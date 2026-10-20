---
author: flow-machine-draft
created_at: 2026-10-20T02:28:57.944Z
---
# 任务注册表（Tasks）— 2026-10-20-decision-caliber-unify

- [x] task-01: 新增 src/decision-values.js 正典值集单一源（4 冻结常量）+ 新增 test/decision-caliber-unify.test.mjs ①②⑤ 用例先行跑红（验证：node --test 新套件 ①红 ⑤绿）
- [ ] task-02: decisions-io.js 白名单改导入派生 + type 扩 8 值；decision-distill.js 入选集改派生 + 状态集 +implemented + 头注同步；新套件 ①②③ 转绿（验证：node --test 新套件绿）
- [ ] task-03: brainstorm.js 两处模板 type/status 清单对齐正典 + docs/prompt/brainstorm.md _extract 再生成；新套件 ④ 转绿（验证：node --test 新套件绿 + docs-check 零 miss）
- [ ] task-04: 复跑既有四套件 decisions-io / decision-distill-flat-list / decision-distill-heading-variants / decision-anchor-backfill 零回归 + lint（验证：node --test 四文件全绿 + npm run lint 绿）
