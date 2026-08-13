---
id: task-06
title: archive.js extract-module-impact 步骤改写为最终确认（不改名只改 prompt）
title_zh: archive step2 extract-module-impact 改最终确认
author: qinyi
created_at: 2026-08-13 10:29:11
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-06]
decision_ids: [D-005@v2, D-008@v1]
allowed_paths:
  - src/stages/archive.js
goal: >
  archive 的 extract-module-impact 步骤（step2）prompt 改写为「最终确认 module-impact.md 核对一致」（module-impact 已在 plan 生成），不改 step 名（消除 stage-definitions.test.mjs:37 硬编码断点）。
implementation:
  - 改 archive.js:27 extract-module-impact 步骤 prompt：从「生成 module-impact」改为「核对 module-impact.md 与实际变更一致 + 标注偏差」
  - 保留 step 名 extract-module-impact（D-005@v2：不改名，避免 stage-definitions.test.mjs:37 断 + 无 migratedFrom 成本）
  - 后续 sync-module-docs 步骤读 module-impact 更新模块卡片不变
acceptance:
  - step 名仍为 extract-module-impact（stage-definitions 不断）
  - prompt 语义改为最终确认（核对一致）
  - sync-module-docs 仍正常读 module-impact
verify:
  - stage-definitions.test.mjs pass（step 名不变）
  - archive 流程端到端正常
constraints:
  - 不改 step 名（D-005@v2，消除 stage-definitions 连带断点）
  - 不改 sync-module-docs 行为
---
