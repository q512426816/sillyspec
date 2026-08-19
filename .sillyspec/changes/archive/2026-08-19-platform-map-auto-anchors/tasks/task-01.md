---
id: task-01
title: classify-invalid-ref-fixability
title_zh: 失效引用修复分类（fixable 与 needs-manual）
author: qinyi
created_at: 2026-08-18 22:42:51
priority: P0
depends_on: []
blocks: [task-02, task-03]
requirement_ids: [FR-02]
decision_ids: [D-002@v2]
allowed_paths:
  - src/docs-check.js
provides:
  - contract: inv-fix-classification
    fields: [fixable, newLine, reason]
expects_from: {}
goal: >
  在 runDocsCheck 的失效引用结果上叠加确定性修复分类字段，为 --fix 提供唯一解判定依据，复用既有 token 搜索不新增定位机制。
implementation:
  - 在 invalid 数组条目上新增 fix 分类字段——suggest 为空判 needs-manual 并写明原因（无 token 或零命中）
  - suggest 单命中判 fixable，newLine 取该唯一命中行号
  - suggest 多命中判 needs-manual，reason 携带候选行号列表交人工（D-006 保守默认）
  - 弥补 suggestLines 只查首个候选文件的缺口——对 resolveCandidates 全量候选跑 token 命中统计，跨候选合并非唯一命中即降级 needs-manual（design §12 自审存疑 + R-01）
acceptance:
  - 零命中或无 token 条目 fix.fixable 为 false 且 reason 可读
  - 唯一命中条目 fix.fixable 为 true 且 newLine 等于 token 当前所在行
  - 多命中与多候选非唯一条目均降级 needs-manual，不产生 newLine
  - 既有字段（invalid/suggest/reason）与 --suggest 输出不变
verify:
  - node test/docs-check.test.mjs
  - npm run lint
constraints:
  - 不改 suggestLines 现有逻辑与层1/层2 校验逻辑（D-004 兼容红线）
  - 分类为纯增量字段，无 --fix 时 runDocsCheck 既有返回语义与 JSON 输出兼容
  - 多命中不自动判定可修，保守优先
---
