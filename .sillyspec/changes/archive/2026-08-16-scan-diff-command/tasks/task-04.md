---
id: task-04
title: docs sync and commit
title_zh: 文档同步 + 验证提交
author: qinyi
created_at: 2026-08-16 21:15:00
priority: high
depends_on: [task-01, task-02, task-03]
blocks: []
allowed_paths:
  - docs/prompt/scan.md
  - docs/sillyspec/file-lifecycle.md
  - docs/sillyspec/design-d7-scan-lifecycle.md
  - .claude/skills/sillyspec-scan/SKILL.md
  - .sillyspec/changes/2026-08-16-scan-diff-command/module-impact.md
goal: 文档同步（scan prompt/生命周期/D-7 落地标注）+ 全量验证 + 显式提交
implementation: |
  docs/prompt/scan.md 补 scan diff 子命令说明（禁手改 prompt 原文——若改 stages/scan.js 提示词则重跑 _extract.mjs）；
  docs/sillyspec/file-lifecycle.md scan 行补 scan diff；
  docs/sillyspec/design-d7-scan-lifecycle.md 的"增量刷新 CLI 化"剩余项标注已落地；
  module-impact.md 按实际变更更新（scan-diff.js 归 runtime 卡补录 module-map paths）；
  npm test 全绿 + docs check 无新增失效 + 显式 pathspec 提交（隔离并行会话）。
acceptance:
  - D-7 设计稿标注"增量刷新 CLI 化已落地（scan diff）"
  - npm test 全绿；docs check 无新增失效
  - 提交未夹带并行会话改动（git status 首列核对）
verify: npm test + docs check + git log --stat 核对
constraints: 勿 git add . 全量；prompt 原文改动走 _extract.mjs 再生
---

