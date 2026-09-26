---
id: task-03
title: scan-diff tests
title_zh: 写 scan-diff 测试
author: qinyi
created_at: 2026-08-16 21:15:00
priority: high
depends_on: [task-01, task-02]
blocks: [task-04]
allowed_paths:
  - test/scan-diff.test.mjs
goal: 覆盖四分类/归模块/rename/unmapped/isAncestor/无漂移/CLI 集成的单测
implementation: |
  test/scan-diff.test.mjs：
  纯函数单测（tmp git 仓 fixture，仿 scan-staleness.test.mjs 模式）——A/D/M/R 四分类（含 rename 场景）、
  归模块与 matchFilesToModules 一致、unmapped 显式标注、isAncestor 守卫（无效/非祖先）、
  无漂移 0 退出、--report 落盘路径；CLI 集成（node bin/sillyspec.js scan diff 子进程）。
  测试名描述场景，断言真实输出。
acceptance:
  - 四分类测试全过（含 W6 rename 场景）
  - 归模块复用验证（直接 import matchFilesToModules 对照）
  - isAncestor 守卫测试（无效 commit/非祖先 commit）
  - CLI 集成测试通过
verify: node --test test/scan-diff.test.mjs
constraints: 纯函数可 mock git；不 mock 被测方法自身
---

