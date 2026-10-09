---
id: task-02
title: W1/FR-02 快照失败高可见 + 摩擦记账
title_zh: W1/FR-02 快照失败高可见 + 摩擦记账
wave: W1
status: draft
depends_on:
  - task-01
goal: 快照创建失败/跳过不再静默：告警 + 摩擦事件
implementation: gates.js 与 verify-quality-scan.js 两处静默 catch 改 ⚠️ 告警块（失败原因+主仓回退口径明示）；friction-tally TYPES 增 gate_snapshot_fallback 并在回退点记账
verify: node --test test/gates-snapshot-fallback-visibility.test.mjs（告警输出 + friction 事件落盘）
constraints: 告警不阻断（回退行为本身不变）；friction 枚举是 CLI 封闭类型扩展非开放世界
acceptance:
  - 快照创建失败/跳过：⚠️ 告警块非静默
  - friction-tally 落 gate_snapshot_fallback（detail 携 change 与失败摘要）
  - 两处静默 catch 均改告警
target_files:
  - src/run/gates.js
  - src/run/verify-quality-scan.js
  - src/friction-tally.js
  - test/gates-snapshot-fallback-visibility.test.mjs
allowed_paths:
  - src/run/gates.js
  - src/run/verify-quality-scan.js
  - src/friction-tally.js
  - test/gates-snapshot-fallback-visibility.test.mjs
---

