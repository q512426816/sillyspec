---
id: task-06
title: sync-module-card-and-lifecycle-docs
title_zh: 文档同步模块卡与文件生命周期
author: qinyi
created_at: 2026-08-18 22:42:51
priority: P0
depends_on: [task-05]
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-004@v1]
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/docs-consistency.md
  - docs/sillyspec/file-lifecycle.md
goal: >
  落地后文档同步——修正 docs-consistency 模块卡「四件全部只读」的过时表述，并在 file-lifecycle.md 补记 docs check 的 --fix 写路径。
implementation:
  - docs-consistency.md L29「四件全部只读」修正为准确表述——docs-check 现支持 --fix 可写回行号（其余三件仍只读），契约摘要表 src/docs-check.js 行同步职责描述
  - 模块卡 frontmatter updated_at 更新为本次落地时间
  - file-lifecycle.md 定位 docs check 命令描述处，补 --fix 与 --dry-run 行为及写入语义（改文档行号、CRLF 保持、多命中保守不写）
  - 两文档交叉核对与 src 实际行为一致，不留只读旧表述
acceptance:
  - 模块卡不再有与写路径矛盾的只读表述，updated_at 已更新
  - file-lifecycle.md 的 docs check 描述含 --fix/--dry-run 且与 CLI 行为矩阵一致
  - npm test（含 doc-ref-check 对平台接口图的 file:line 校验）通过
verify:
  - npm test
constraints:
  - 纯文档改动不改代码；触及的 file:line 引用若因前序任务漂移须顺手核对有效性
  - 表述以 design §5.2 行为矩阵与实际实现为准，不发明未实现的行为
---
