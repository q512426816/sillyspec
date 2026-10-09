---
id: task-04
title: W2/FR-04 复用判定落盘观测
title_zh: W2/FR-04 复用判定落盘观测
wave: W2
status: draft
depends_on:
  - task-03
goal: 复用链路可观测：指纹与判定原因落盘，取证不靠 stdout
implementation: runVerifyTestCheck 写 test-result.json 时增 fingerprint 与 reuseDecision{layer,hit,reason}（additive）；storeQualityScan 增 scopeDecision{planned,actual} 与 missReason（读上次记录的 miss 链）
verify: node --test test/verify-test-result-reuse-observability.test.mjs（真跑轮 test-result 字段 + 复用轮 jsonl journal + 旧格式兼容）
constraints: 全部 additive 字段；旧记录无新键不炸（先例 dedupKey）
acceptance:
  - test-result.json 携 fingerprint+reuseDecision（两态都有值）
  - 质量扫描记录携 scopeDecision/missReason
  - 旧格式读侧兼容
target_files:
  - src/verify-postcheck.js
  - src/run/verify-quality-scan.js
  - test/verify-test-result-reuse-observability.test.mjs
allowed_paths:
  - src/verify-postcheck.js
  - src/run/verify-quality-scan.js
  - test/verify-test-result-reuse-observability.test.mjs
---

