---
id: task-04
title: full regression lint and doc sync assessment
title_zh: 全量回归 + lint + 文档同步评估
author: qinyi
created_at: 2026-08-13 15:02:30
priority: P1
depends_on: task-03
allowed_paths:
  - src/worktree.js
  - test/worktree-cleanup-guard.test.mjs
goal: >
  全量 npm test 与 npm run lint 零失败，并评估是否需要同步 file-lifecycle 或 worktree 相关文档，
  输出文档同步结论（cleanup 返回新增 blocked 是否需在 worktree 文档补充）。
implementation:
  - 运行 npm test 全量确认零失败并记录测试文件数与结果
  - 运行 npm run lint 确认零错误
  - 评估 cleanup 行为变化（blocked 返回与 force 调用点契约）是否需要在 docs 或 file-lifecycle 补一句
  - 若需同步则更新对应文档并重跑受影响校验
acceptance:
  - npm test 全量零失败
  - npm run lint 零错误
  - 文档同步评估给出明确结论（需同步或无需）
verify:
  - npm test
  - npm run lint
constraints:
  - 不以改测试凑绿，修逻辑
  - 若文档改动仅 doc 性质可跳过 lint 全量只跑 node check
  - 不 commit 半成品，结论与落盘文件为准
---

# task-04: 全量回归 + lint + 文档同步评估

见 design.md 兼容策略与自审、CLAUDE.md 规则 8。
