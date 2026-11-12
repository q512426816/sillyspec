---
author: flow-machine-draft
created_at: 2026-11-12T16:08:02.096Z
---
# 任务注册表（Tasks）— 2026-11-13-probe7-existing-tests-cap

- [x] task-01: src/verify-probes.js 既有用例候选行有展示帽（前 5 + 「…共 N 个」折叠），单行不超过约 1KB
- [x] task-02: 同一变更内多张无归属卡共享同一候选集时，第二张起折叠为「同上（见 task-XX）」不再重复全量
- [x] task-03: 全量候选写入 verify-facts.json，兑现代码注释承诺
- [x] task-04: 新增测试覆盖上述三条行为，相关测试面绿，既有 verify 相关测试无回归
