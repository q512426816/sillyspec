---
author: flow-machine-draft
created_at: 2026-10-14T03:20:22.130Z
---
# 提案书（Proposal）— 2026-10-14-patch-refreeze-missing-artifact

## 动机

任务原话转写：flow done 重入幂等跳过只认子步状态不认产物存在性：patch 子步标记 done 后若 change.patch/change-patch.json 缺席（手工误删或上次写盘中断），readFileSync 抛错被 catch 吞掉直接幂等跳过，归档产物缺审计冻结件（multi-agent-platform 2026-10-14 实证：verify-result 记「无冻结件」，只能按 git 手工重建）。修法：存在性复查优先于子步状态——缺件按处置漂移同款自动重冻结，review 处置沿用同一隔离规则。

成功标准：
- patch 子步重入时先查 change-patch.json 与 change.patch 是否在场，缺任一件则告警「冻结件缺失」并走漂移同款自动重冻结，不再静默跳过
- 缺件重冻面 HEAD 基准取当前 HEAD；review.json anchored-to-head 保留不隔离，未锚定隔离重评（缺基面无法判 governance-only，fail-safe 宁可多评）
- 冻结件在场时行为与现状逐字节一致（漂移检测、隔离、重置标记全保留），隔离失败仍回退幂等跳过
- e2e 用例：缺件+anchored PASS 评审→重冻结+评审保留+直接归档成功；缺件+未锚定评审→隔离+重评任务书再现
- npm test 与 npm run lint 全绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. patch 子步重入时先查 change-patch.json 与 change.patch 是否在场，缺任一件则告警「冻结件缺失」并走漂移同款自动重冻结，不再静默跳过
2. 缺件重冻面 HEAD 基准取当前 HEAD；review.json anchored-to-head 保留不隔离，未锚定隔离重评（缺基面无法判 governance-only，fail-safe 宁可多评）
3. 冻结件在场时行为与现状逐字节一致（漂移检测、隔离、重置标记全保留），隔离失败仍回退幂等跳过
4. e2e 用例：缺件+anchored PASS 评审→重冻结+评审保留+直接归档成功；缺件+未锚定评审→隔离+重评任务书再现
5. npm test 与 npm run lint 全绿

## 成功标准（可验证）

1. patch 子步重入时先查 change-patch.json 与 change.patch 是否在场，缺任一件则告警「冻结件缺失」并走漂移同款自动重冻结，不再静默跳过
2. 缺件重冻面 HEAD 基准取当前 HEAD；review.json anchored-to-head 保留不隔离，未锚定隔离重评（缺基面无法判 governance-only，fail-safe 宁可多评）
3. 冻结件在场时行为与现状逐字节一致（漂移检测、隔离、重置标记全保留），隔离失败仍回退幂等跳过
4. e2e 用例：缺件+anchored PASS 评审→重冻结+评审保留+直接归档成功；缺件+未锚定评审→隔离+重评任务书再现
5. npm test 与 npm run lint 全绿
