---
id: task-04
title: execute.js Wave 步骤注入主代理汇总更新 module-impact 指引
title_zh: execute Wave 注入主代理汇总更新 module-impact 指引
author: qinyi
created_at: 2026-08-13 10:29:11
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-007@v1]
allowed_paths:
  - src/stages/execute.js
goal: >
  execute 每个 Wave 步骤 prompt 追加「主代理在该 Wave 完成后汇总实际代码变更更新 module-impact.md」指引（非 task 子代理各改——同 Wave 并行子代理会互相覆盖）。
implementation:
  - 在 buildWavePrompt（execute.js:549）追加 Wave 后汇总更新 module-impact.md 的指引段
  - 明定由主代理（调度者，execute.js:787）在 Wave 内所有 task 子代理完成后统一更新
  - 指引基于实际代码 diff（git）+ _module-map.yaml 对照
acceptance:
  - Wave 步骤 prompt 含主代理汇总更新 module-impact 指引
  - 明定归属=主代理（非 task 子代理）
verify:
  - grep buildWavePrompt 含 module-impact + 主代理/汇总
constraints:
  - 不让 task 子代理各改 module-impact（避免并行覆盖）
  - 可选更新不阻断（D-002）
---
