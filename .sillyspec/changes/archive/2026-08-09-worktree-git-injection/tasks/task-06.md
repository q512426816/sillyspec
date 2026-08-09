---
id: task-06
title: 全量 npm test（worktree/db 相关回归）+ npm run lint 全绿，grep 反向断言无残留字符串拼接 git（覆盖：FR-08）
title_zh: 全量测试与 lint 及反向断言验收门禁
author: qinyi
created_at: 2026-08-09 11:19:03
priority: P0
depends_on: [task-05]
blocks: []
requirement_ids: [FR-08]
allowed_paths:
  - src/git-helper.js
  - src/worktree.js
  - src/worktree-apply.js
  - src/index.js
goal: >
  一句话：作为验收门禁，跑全量测试与 lint 并做 grep 反向断言，确认 worktree 链 git 调用已全部数组化、无字符串拼接残留、行为回归全绿。
implementation:
  - 确认 task-05 注入测试已就位（含反向断言用例），本 task 不改任何源码。
  - 跑全量 npm test，重点盯 worktree-native-overlay、worktree-apply-incidental、db-concurrency、git-helper-injection 等 worktree 与 db 相关回归全绿。
  - 跑 npm run lint 确认语法检查全绿。
  - grep 反向断言 src/ 全仓，确认不再存在字符串拼接的 git 调用与 git 变量插值模板串（白名单仅无变量固定子命令）。
acceptance:
  - npm test 全绿，worktree 与 db 相关回归套件零失败。
  - npm run lint 全绿，无语法错误。
  - grep 反向断言通过，src/ 全仓无残留字符串拼接的 git 调用与 git 变量插值。
  - 本 task 不引入任何源码或测试改动，仅作验收确认。
verify:
  - npm test
  - npm run lint
  - node test/run-tests.mjs git-helper-injection
constraints:
  - 验收门禁，禁止源码改动，只做验证与断言。
  - 反向断言白名单仅限无变量固定子命令，含变量的拼接一律不得放行。
  - 任一测试或 lint 失败须回退到对应实现 task 修逻辑，禁止改测试来通过。
  - 命令一律在主仓库根跑，不 cd worktree。
---
