---
author: flow-machine-draft
created_at: 2026-10-15T01:52:13.819Z
---
# 决策记录（Decisions）— 2026-10-15-graph-dangling-crossrepo-split

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：跨仓口径被误读为「2447 条可以不管」——跨仓锚点在各自仓内有对账价值（决策↔交付文件机器锚），本变更只是不让它们污染本仓健康数字；口径已在 summary 文案与字段注释双处声明「单列不对账」。次风险：平台 GraphDanglingData DTO 若严格校验未知键会拒收——实证安全：平台侧 _norm_dangling 按 _as_int 取已知键、多余键忽略（graph.py:231-240 实证），且 --local 未传时 query.local 键为 undefined 不序列化。放弃方案：①把跨仓强边从 dangling 主计数剔除（破坏 doctor 对账守恒与既有测试钉，且丢对账价值）；②按目标仓建多图（buildKnowledgeGraph 单根假设，重构量大收益小）；③只在 doctor 文案分流（10-09 已做，数字面失真问题依旧）。
