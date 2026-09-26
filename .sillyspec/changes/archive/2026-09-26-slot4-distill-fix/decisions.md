---
author: flow-machine-draft
created_at: 2026-09-26T01:21:56.405Z
---
# 决策记录（Decisions）— 2026-09-26-slot4-distill-fix

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险=补录样本的域路由落 unmapped（治理类变更无模块域）——接受：unmapped 域已有 INDEX 路由行兜底，教训按关键词可命中（三组关键词实测命中）；后续若 unmapped 治理可迁移。死路：回溯批量补录全部历史断链条目——归档件是冻结审计面不回写，历史教训按需逐条重放（幂等），弃。
