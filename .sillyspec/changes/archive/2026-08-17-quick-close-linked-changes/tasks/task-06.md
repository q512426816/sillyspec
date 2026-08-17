---
id: task-06
title: 验收与提交
title_zh: 验收与提交
author: qinyi
created_at: 2026-08-17T09:45:00+08:00
priority: P0
depends_on: [task-04, task-05]
blocks: []
allowed_paths:
  - .sillyspec/quicklog/
goal: |
  全量测试 + lint 通过，精修 QUICKLOG，按规范提交。
implementation: |
  1. 运行 npm test。
  2. 运行 npm run lint
  3. 精修 QUICKLOG 条目（标题语义化/文件多行带括注/结果四段）。
  4. git status 查首列隔离他人暂存，用显式 pathspec 提交本变更。
acceptance: |
  - npm test 全绿。
  - npm run lint 全绿。
  - QUICKLOG 条目格式完整。
verify: |
  命令输出。
constraints: |
  - 不提交他人未暂存文件。
  - 不 git add -A。
---
# task-06: 验收与提交
见 frontmatter。
