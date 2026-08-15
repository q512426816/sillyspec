---
id: task-05
title: 文档同步
title_zh: 文档同步
author: qinyi
created_at: 2026-08-15 21:16:00
priority: P1
depends_on: [task-04]
blocks: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/sillyspec/doc-consistency-debt.md
  - docs/prompt/_extracted.json
repo: main
goal: >
  file-lifecycle.md（execute 行 {DOCS_DEBT} 注入 + CRLF 修复行为扩散说明）+ 债单第六节
  拼图登记 + _extract 镜像重跑。
implementation:
  - file-lifecycle execute 行补注入与行为扩散说明
  - 债单登记 docs-debt 拼图落地
  - node docs/prompt/_extract.mjs
acceptance:
  - 文档与实现一致；镜像 diff 仅占位符行
verify:
  - npm test（doc-ref 等不受影响）
constraints:
  - updated_at 时间戳更新
---

## 验收标准

- FR-005 收口
