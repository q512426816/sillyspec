---
author: qinyi
created_at: 2026-09-16 12:23:00
---
# 任务清单（Tasks）

- [x] task-01: 探针8 契约维度核心——verify-probes.js 新增 parseDesignContracts 导出 + runProbe8PayloadParity 扩展 contractOrphans/missingRequired + 渲染段与 metrics 两行（既有三维度零触碰） (depends_on: —)
- [x] task-02: 一致性抽查接线——verify-postcheck.js checkProbeConsistency 纳入 probe8 维度（WARNING 级，环境敏感组） (depends_on: task-01)
- [x] task-03: 测试——NEW:test/probe8-contract-pivot.test.mjs 五用例（契约外键命中/必填漏发命中/对齐零新告警/无契约面 skipped/非契约表不入面） (depends_on: task-01)
