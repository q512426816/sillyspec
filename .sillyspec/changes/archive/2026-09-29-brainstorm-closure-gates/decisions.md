---
author: flow-machine-draft
created_at: 2026-09-28T17:19:59.845Z
---
# 决策记录（Decisions）— 2026-09-29-brainstorm-closure-gates

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：warning 噪声——design-init 骨架未编辑完的 design.md（R-01 待填行／决策追踪待确认行）会在 --done 集中亮 2-3 条 warning。这是预期收口行为（骨架=未闭合），文案已逐条给出路；退役判据：观测一个周期——误报为主且 agent 普遍忽略→收窄词表，真阳率主导→升 error。 试过放弃：① error 级阻断——存量 brainstorm 阶段进行中变更会立即撞墙，破坏「存量行为不变」兼容红线，且与故障面软警告先例相悖；② 自审存疑查裸词「自审存疑」——design-init 自审 checklist 模板行含该词必然常驻误报，改为查「自审存疑[:：]」应用形态＋行内闭合 token（D-xxx/R-xx/已解决/已闭合/已确认）判定；③ requirements D 覆盖沿用 shared.id-traceability 通用文案——缺「决策覆盖矩阵补行或标剩余风险」的闭环出路提示，语义丢失，故立独立规则带出路文案。 死路注记核对：知识库 unmapped 域 5 条死路（restrict 空清单传参／回溯补录历史断链／CLI 探测派发能力／CLI 探测 vitest 配置／对账前重建分支）与本方案无交集——本方案不建清单通道、不回溯历史、不探测环境，全部复用既有管线。
