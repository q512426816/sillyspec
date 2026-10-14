---
author: flow-machine-draft
created_at: 2026-10-14T03:20:22.130Z
---
# 任务注册表（Tasks）— 2026-10-14-patch-refreeze-missing-artifact

- [x] task-01: patch 子步重入时先查 change-patch.json 与 change.patch 是否在场，缺任一件则告警「冻结件缺失」并走漂移同款自动重冻结，不再静默跳过
- [x] task-02: 缺件重冻面 HEAD 基准取当前 HEAD；review.json anchored-to-head 保留不隔离，未锚定隔离重评（缺基面无法判 governance-only，fail-safe 宁可多评）
- [x] task-03: 冻结件在场时行为与现状逐字节一致（漂移检测、隔离、重置标记全保留），隔离失败仍回退幂等跳过
- [x] task-04: e2e 用例：缺件+anchored PASS 评审→重冻结+评审保留+直接归档成功；缺件+未锚定评审→隔离+重评任务书再现
- [x] task-05: npm test 与 npm run lint 全绿
