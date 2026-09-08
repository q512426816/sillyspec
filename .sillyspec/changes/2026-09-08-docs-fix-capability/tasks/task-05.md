---
id: task-05
title: 'Module doc + CLI help text sync'
title_zh: '模块文档+CLI help 文本同步——docs-consistency.md + index.js usage'
author: 'qinyi'
created_at: 2026-09-08 09:37:00
priority: P2
depends_on: [task-01, task-02, task-03]
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/docs-consistency.md
  - src/index.js
target_files: [.sillyspec/docs/sillyspec/modules/docs-consistency.md, src/index.js]
goal: >
  docs-consistency 模块文档同步五项能力（解析修复/migrate/豁免/candidates/出口统一）；
  index.js CLI 用法文本补 docs migrate --from/--to 与 --no-exempt 说明（CLAUDE.md 规则 19：触及 CLI 行为同步文档）。
implementation:
  - docs-consistency.md：新增五项能力段落（REF_RE 展开循环形、fuzzy skip、豁免双通道、migrate 命令、candidates JSON、stdout 出口契约）
  - index.js usage/帮助文本：docs migrate --from/--to [--apply] 说明（区分旧结构迁移）；docs check --no-exempt 说明
acceptance:
  - 模块文档与代码一致（豁免后 invalid 只减不增、基线复核提示）
  - CLI --help 含新 flag 说明
verify:
  - node bin/sillyspec.js docs check（dogfood 实测：本仓文档引用仍全绿）
constraints:
  - 文档中文、与既有模块文档风格一致
  - 不改其他模块文档
---

## 上下文

CLAUDE.md 规则 19（触及 CLI 行为同步文档）；design.md §文件变更清单。
