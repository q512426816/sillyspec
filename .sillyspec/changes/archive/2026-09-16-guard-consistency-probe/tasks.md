---
author: qinyi
created_at: 2026-09-16 20:15:00
---
# 任务清单（Tasks）

- [x] task-01: 探针9 核心实现——verify-probes.js 三导出（clusterMutationMethods/detectGuardSignals/runProbe9GuardConsistency）+ 渲染段 + metrics (depends_on: —)
- [x] task-02: 一致性抽查接线——verify-postcheck.js checkProbeConsistency 纳入 probe9 维度（WARNING 级） (depends_on: task-01)
- [x] task-03: 测试——NEW:test/probe9-guard-consistency.test.mjs 五用例（EHS doSubmit 缩小版） (depends_on: task-01)
