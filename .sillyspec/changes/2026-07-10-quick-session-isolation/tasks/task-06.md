---
id: task-06
title: test/quick-session-isolation.test.mjs — 多会话隔离回归
author: qinyi
created_at: 2026-07-10T16:25:00+08:00
priority: P0
depends_on: [task-01, task-02, task-03, task-04, task-05]
blocks: []
allowed_paths:
  - test/quick-session-isolation.test.mjs
expects_from:
  task-01: { contract: quick-session-id, needs: [sessionId] }
  task-02: { contract: quick-done-recovery, needs: [sessionId] }
  task-03: { contract: quick-guard-session-path, needs: [sessionGuardDir] }
  task-05: { contract: hook-merge-guard, needs: [mergedGuard] }
goal: |
  参照 test/agent-gate-hardening.test.mjs 的 mkdtemp + git fixture 模式，
  覆盖全局验收 1-4（多会话 DB 隔离 + guard 隔离 + --done 各推 + hook 合并放行）。
implementation: |
  新建 test/quick-session-isolation.test.mjs（自研 assert，无框架）：
  1. 临时 git 仓库 fixture
  2. 两 quick 会话（A: sillyspec run quick; B: sillyspec run quick）→ 各自 progress.quick-<uuidA/B> 独立（断言 steps 不互覆盖）
  3. A --done + B --done → 各自收敛（断言互不影响）
  4. guard 隔离：A/B 各自 .runtime/quick-sessions/<sid>/guard.json（断言不互覆盖）
  5. hook 合并：两 session allowedFiles 不同 → hook 放行各自（断言不误拦）
  6. 向后兼容：旧单文件 quick-guard.json 仍可读（hook 不崩）
acceptance: |
  - node test/quick-session-isolation.test.mjs 全绿
  - 全量 npm test 通过（接入 run-tests.mjs glob）
verify: |
  TDD：先写断言再依赖已实现。
constraints: |
  - 只新建 test/quick-session-isolation.test.mjs；用 mkdtemp 临时目录不污染仓库
  - 参照 agent-gate-hardening fixture 模式
---
# task-06: 隔离测试
## 目标
见 frontmatter goal（NFR-03, 验收 1-4）。
