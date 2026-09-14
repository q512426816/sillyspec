---
id: task-08
title: '契约文档同步'
title_zh: '契约文档同步'
author: 'qinyi'
generated_by: sillyspec-taskcard
created_at: 2026-09-14 12:16:08
priority: P0
depends_on: ['task-06']
blocks: []
requirement_ids: [FR-6, FR-7]
decision_ids: ['D-006@v1', 'D-007@v1']
allowed_paths:
  - docs/sillyspec/platform-interface-map.md
  - docs/sillyspec/file-lifecycle.md
target_files:
  - docs/sillyspec/platform-interface-map.md
  - docs/sillyspec/file-lifecycle.md
expects_from:
  - 'task-06: CLI 面与退出码契约、guard 字段契约'
goal: >
  契约面登记：scan refresh CLI 锚点、guard 行为变化、scan 文档刷新生命周期行。
implementation:
  - platform-interface-map.md：scan refresh 子命令锚点（两拍/退出码/检出极限）+ worktree-guard 行为变化条目（白名单 + 归一化比对）
  - file-lifecycle.md：scan 文档刷新行——source_commit 推进路径（refresh --done per-doc bump）与全量重扫并列
  - 跑 docs 检查确认锚点全过
acceptance:
  - 两文档锚点登记后 docs 检查全过
  - 文档描述与实现一致（退出码/字段名核对）
verify:
  - npm test
  - node src/index.js workflow check scan-docs --project sillyspec（如适用）
constraints:
  - 不改模块卡/module-map（归档期 module-docs-sync 处理）
  - 风格与既有文档一致
---

<!-- 骨架由 sillyspec taskcard 生成；可选字段（provides/expects_from）已按本变更落位。 -->
