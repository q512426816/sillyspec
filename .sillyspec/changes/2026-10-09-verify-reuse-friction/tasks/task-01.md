---
id: task-01
title: W1/FR-01 快照口径死循环修复（passed 闸+failed 签名闸同型迁移）
title_zh: W1/FR-01 快照口径死循环修复（passed 闸+failed 签名闸同型迁移）
wave: W1
status: draft
depends_on: []
goal: 快照口径复用闸死循环断根：两闸移到快照创建后按实际口径判定
implementation: executeVerifyQualityScan 内 shouldReuseLastPassedScan 与 shouldReuseLastFailedScan 两处调用移到 createVerifyGateSnapshot 之后，plannedSnapshot 参数改 actualScope=Boolean(snap)；连续失败口径一致即收敛命中
verify: node --test test/verify-quality-scan-reuse-actual-scope.test.mjs（连续失败命中复用/口径切换失配/failed 闸同口径）
constraints: 防作弊语义不变：口径真实切换必须失配；不引入语言/框架枚举；Windows LF/YAML 兼容
acceptance:
  - 连续快照失败场景：passed 幂等闸第二轮起命中复用（reason 不为 snapshot-scope-changed），零测试执行
  - 口径真实切换（上轮快照/本轮失败或反向）：仍失配重跑
  - failed 失败签名去重闸同用实际口径判定，两闸同函数同口径无分叉
target_files:
  - src/run/verify-quality-scan.js
  - test/verify-quality-scan-reuse-actual-scope.test.mjs
allowed_paths:
  - src/run/verify-quality-scan.js
  - test/verify-quality-scan-reuse-actual-scope.test.mjs
---

