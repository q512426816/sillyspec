---
author: qinyi
created_at: 2026-09-17 21:50:00
---

# 任务清单（Tasks）

- [x] task-01: commands.smoke 配置登记 + quality-scan 亲跑执行段（300s 帽/快照超时回退主仓/指纹含新键/实测记录 smoke 面/回执记录落盘） (depends_on: 无)
- [x] task-02: 机器段来源标记链——parseEvidenceSlots 逐条 source 提取 + 分类器双侧认标记直判 cross-layer + 回执槽 ensure 注入与缺态标注 + checkProbeConsistency 回执槽一致性对比 (depends_on: task-01)
- [x] task-03: facts.smokeRan producer（五边界态）+ evaluatePassEligibility 第五条件（smoke-not-run 枚举/判级限定/不设 handover 豁免） (depends_on: task-01, task-02)
- [x] task-04: parseDesignApiTable tolerant 解析器 + 骨架「接口验证覆盖矩阵」段（预填/口径注记/声明占位）+ 消费面与表间完备性 advisory 输出 (depends_on: task-02)
- [x] task-05: validateApiCoverageMatrix validator（covered 记账/有效分母扣除 non-testable/锚点解析级校验/移交联动/探索性子行不计账/声明降级/critical×零接口面 error）注册进 verify.validators (depends_on: task-03, task-04)
- [x] task-06: verify prompt smoke 纪律段（命中条件注入）+ 「CLI 不代跑」矛盾文案改写 + checklist verify 键接线 + 快照随行 + 镜像三步再生 (depends_on: task-03)
- [x] task-07: 测试补全——NEW test/smoke-gate.test.mjs + NEW test/api-coverage-matrix.test.mjs + 既有文件增量断言 (depends_on: task-01, task-02, task-03, task-04, task-05, task-06)
- [x] ql-20260917-009-2ec3 archive_integrity D14 收尾（用户裁决三件套）：①豁免账本——16 份老归档缺 plan.md 系早于 plan.md 流程的历史形态，照 docs-check skip 先例建 .sillyspec/archive-i…
