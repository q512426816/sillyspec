---
author: flow-machine-draft
created_at: 2026-10-08T16:44:55.401Z
---
# 决策记录（Decisions）— 2026-10-08-explore-knowledge-graph

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：旧项目无 knowledge graph 能力（sillyspec < 3.33 未装图命令）时 explore prompt 指引落空——agent 跑命令报 unknown subcommand 后自然回退 rg 考古（fail-soft，无阻断面）；后续 init 升级即补齐。接受：指引措辞是「优先」非「必须」。放弃的方案：把 graph 查询做成 explore 独立步骤（--wait 流程化）——弃，explore 的价值恰在无结构自由姿态，流程化会把思考伙伴变成向导机；在 CLI 侧为 explore 注入图预取数据（{GRAPH_FACTS} 占位符）——弃，探索话题不可预知，全量注入是浪费且复刻知识注入面已有的活。
