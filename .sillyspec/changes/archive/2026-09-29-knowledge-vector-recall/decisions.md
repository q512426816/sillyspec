---
author: flow-machine-draft
created_at: 2026-09-28T17:20:49.715Z
---
# 决策记录（Decisions）— 2026-09-29-knowledge-vector-recall

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：风险：① 平台未实现期每个零命中查询打一次真实平台 404（静默、debug 可开——流量无害但可观测）；② 向量结果随 embedding 模型升级漂移（非确定性）——advisory 面可接受，确定性底座是本地层；③ 同号锚点缺 change 时全量带回可能放大（unmapped 实测 65 同号）——三层有界：构建侧 score 序封顶 20、flow/complete 渲染 slice(0,5)、prompt 渲染 slice(0,5)（审查 P2 补齐）。退役判据=平台向量命中长期与主题无关（召回质量投诉）或平台放弃该端点（删本层即回两层）。
