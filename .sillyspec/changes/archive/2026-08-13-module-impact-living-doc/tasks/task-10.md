---
id: task-10
title: 受影响测试修复 + 跑全量 npm test/lint
title_zh: 受影响测试修复 + 全量验证
author: qinyi
created_at: 2026-08-13 10:29:11
priority: P0
depends_on: []
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - test/run-complete-step-archive.test.mjs
  - test/archive-cli-git-add.test.mjs
  - test/archive-idempotent-selfheal.test.mjs
  - test/archive-sync-module-docs-wait.test.mjs
  - test/stage-definitions.test.mjs
goal: >
  task-06 把 archive step2 改终审后，相关 archive 测试可能依赖旧的「生成」行为；修受影响测试 + 跑全量 npm test/lint 确认无回归。
implementation:
  - 跑 npm test 找失败的 archive 测试（run-complete-step-archive / archive-cli-git-add / archive-idempotent-selfheal / archive-sync-module-docs-wait）
  - 按新行为（step2 终审非生成）修正测试断言——只改测试对 archive step2 行为的断言，不改测试逻辑本身
  - 确认 stage-definitions.test.mjs pass（task-06 不改名，应无影响）
  - 跑 npm run lint
acceptance:
  - npm test 全绿（含 archive 测试 + stage-definitions）
  - npm run lint 过
verify:
  - npm test
  - npm run lint
constraints:
  - 测试逻辑本身无误时不改测试改逻辑（CLAUDE.md 规则 11）
  - task-06 不改名 → stage-definitions 应无需改
---
