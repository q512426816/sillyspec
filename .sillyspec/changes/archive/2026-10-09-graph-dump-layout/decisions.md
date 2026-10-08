---
author: flow-machine-draft
created_at: 2026-10-08T16:57:14.873Z
---
# 决策记录（Decisions）— 2026-10-09-graph-dump-layout

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：星系数=150（真图实测）比平台 design 初估 10-15 多——但这就是原型 comm() 的真实分组数（原型视觉即如此），不改算法（改了就不是原型视觉）；平台侧按 150 星系渲染。放弃的方案：①summary 细簇分组——否，883 簇主环 ~8900px 退化散点（Grill F-01）；②坐标落盘缓存——否，违反图不落盘铁律；③与原型逐位等价——降级为非约束（tie-break 稳序差异，确定性才是硬约束）。
