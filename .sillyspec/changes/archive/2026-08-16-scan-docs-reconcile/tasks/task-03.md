---
id: task-03
title: P3 remaining scan docs reconcile
title_zh: P3 剩余 scan 文档核对刷新
author: qinyi
created_at: 2026-08-16 18:25:17
priority: high
depends_on: [task-01, task-02]
blocks: [task-04]
allowed_paths:
  - .sillyspec/docs/sillyspec/scan/ARCHITECTURE.md
  - .sillyspec/docs/sillyspec/scan/CONVENTIONS.md
  - .sillyspec/docs/sillyspec/scan/PROJECT.md
  - .sillyspec/docs/sillyspec/scan/INTEGRATIONS.md
  - .sillyspec/docs/sillyspec/scan/TESTING.md
  - .sillyspec/docs/sillyspec/scan/CONCERNS.md
goal: 6 份 scan 文档按当前代码核对刷新，补新模块段落，修 ARCHITECTURE.md:L99，回收 propose 残留
implementation: |
  ARCHITECTURE/CONVENTIONS（已较新）：补 dispatch/sillyhub-mcp/progress/docs-consistency 模块段落；
  修 ARCHITECTURE.md:L99 失效引用（runAutoMode 行号漂移，对照 src/run/command.js 实测行号）；
  PROJECT/INTEGRATIONS/TESTING/CONCERNS（停 6-26）：逐份按当前代码核对刷新；
  各文档移除 propose 阶段描述残留；frontmatter source_commit/updated_at 更新。
acceptance:
  - 6 份文档与当前代码描述一致，无 propose 阶段描述
  - ARCHITECTURE.md:L99 引用有效（docs check 通过）
verify: docs check + grep propose scan/
constraints: D-001@v1——只修清单内 L99，5 处并行遗留不动
---
