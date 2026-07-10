---
id: task-03
title: run.js + stages/quick.js — quick-guard.json 按 session 存
author: qinyi
created_at: 2026-07-10T16:25:00+08:00
priority: P0
depends_on: [task-01]
blocks: [task-05, task-06]
allowed_paths:
  - src/run.js
  - src/stages/quick.js
expects_from:
  task-01:
    - contract: quick-session-id
      needs: [sessionId]
provides:
  - contract: quick-guard-session-path
    fields: [sessionGuardDir]
goal: |
  quick-guard.json 从单文件改按 session 存：.runtime/quick-sessions/<sessionId>/guard.json。
implementation: |
  1. run.js:1911-1920 写 quickGuard 处：guardFile 路径从 join(specBase,'.runtime','quick-guard.json')
     改为 join(specBase,'.runtime','quick-sessions',sessionId,'guard.json')；mkdirSync session 目录。
  2. guard.json 加 sessionId 字段。
  3. run.js 读 guard 处（:1434 启动复用 / :2913 post-check）适配新路径（需 sessionId，从 task-01/02）。
acceptance: |
  - guard.json 写 .runtime/quick-sessions/<sid>/guard.json
  - 两会话各自 guard 不互覆盖
verify: |
  task-06 测试覆盖。
constraints: |
  - 只改 src/run.js + src/stages/quick.js；sessionId 从 task-01/02 获得
---
# task-03: guard 按 session 存
## 目标
见 frontmatter goal（FR-04）。
