---
id: task-05
title: verify.js 输出验证报告步骤注入核对 module-impact 指引
title_zh: verify 输出报告注入核对 module-impact 指引
author: qinyi
created_at: 2026-08-13 10:29:11
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-05]
decision_ids: []
allowed_paths:
  - src/stages/verify.js
goal: >
  verify「输出验证报告」步骤 prompt 追加「核对 module-impact.md 与实际代码变更一致」指引，让 verify 阶段校验 module-impact 的准确性。
implementation:
  - 在 verify.js「输出验证报告」步骤（verify.js:186-256）prompt 追加核对 module-impact 段
  - 指引 agent 对照实际 git diff 与 module-impact.md 的模块影响矩阵，发现不一致则在报告标出
acceptance:
  - verify 输出报告 prompt 含核对 module-impact 指引
verify:
  - grep verify 输出报告 prompt 含 module-impact
constraints:
  - 可选核对不阻断 verify 完成（D-002）
  - 不改 verify-result.md 结论门控（PASS/FAIL 逻辑不变）
---
