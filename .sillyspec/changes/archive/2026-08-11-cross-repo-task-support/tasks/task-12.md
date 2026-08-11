---
id: task-12
title: npm test 全量 + lint 全量验收（覆盖：AC-04, NFR-02）
title_zh: 全量测试与 lint 验收
author: qinyi
created_at: 2026-08-12 01:14:51
priority: P0
depends_on: [task-11]
blocks: []
requirement_ids: [FR-11]
decision_ids: []
allowed_paths:
  - package.json
goal: >
  npm test 全量加 npm run lint 全量验收，跨仓新测与既有回归全绿，跨平台兼容。
implementation:
  - npm test 全量跑（含 4 新跨仓测试加 11 既有回归测试）
  - npm run lint 全量跑
  - 记录 EXIT 等于 0
  - 若有失败修逻辑不修测试
acceptance:
  - npm test 全量 EXIT 为 0（跨仓新测加既有回归全绿）
  - npm run lint 全量通过
  - 无跳过测试
verify:
  - npm test
  - npm run lint
constraints:
  - 失败修逻辑不修测试（CLAUDE.md 规则 11）
  - 跨平台兼容 Win 加 Linux 加 macOS 路径与并发（NFR-02）
  - 偶发 node-sqlite flaky 失败优先怀疑重跑确认
---
