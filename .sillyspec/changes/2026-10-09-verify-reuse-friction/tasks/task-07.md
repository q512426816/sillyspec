---
id: task-07
title: W4/FR-07 跨仓对账锚点窗口 baseline..HEAD
title_zh: W4/FR-07 跨仓对账锚点窗口 baseline..HEAD
wave: W4
status: draft
depends_on:
  - task-06
goal: 多笔交付提交的对账窗口全覆盖
implementation: cross-repo-reconcile 与 verify-postcheck 跨仓分支 B 档锚点从 HEAD~1..HEAD 扩为 baseline..HEAD（apply/worktree baseline 可得时），label 如实标注；不可得回退现行窗口
verify: node --test test/cross-repo-reconcile-baseline-anchor.test.mjs（先复现多笔提交漏文件，再验 baseline 窗口全覆盖 + 回退链）
constraints: 锚点档链 A>B'>B>C 不回退；先复现后修
acceptance:
  - baseline 可得：窗口=baseline..HEAD 多笔全覆盖
  - baseline 不可得：回退现行窗口不回退语义
  - 复现测试先行
target_files:
  - src/cross-repo-reconcile.js
  - src/verify-postcheck.js
  - test/cross-repo-reconcile-baseline-anchor.test.mjs
allowed_paths:
  - src/cross-repo-reconcile.js
  - src/verify-postcheck.js
  - test/cross-repo-reconcile-baseline-anchor.test.mjs
---

