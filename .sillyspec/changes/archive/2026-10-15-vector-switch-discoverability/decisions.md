---
author: flow-machine-draft
created_at: 2026-10-15T04:38:04.871Z
---
# 决策记录（Decisions）— 2026-10-15-vector-switch-discoverability

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：提示疲劳——平台已连接的仓每次 search/零命中 start 都带一行。评估：两触点都是「未获得语义召回」的上下文（search 可能命中、flow 零命中行本就是空态提示行），且提示在用户开启开关后永久消失——自消失性使其天然有界。次风险：平台未部署端点的仓开了开关 → 每次检索白打一轮 404——已有死信短路（进程级一次），成本可忽略。放弃方案：①只在 init 时打一次性提示（新项目 init 时平台多半未连接，提示语境错误）；②写进 AGENTS.md 模板（init 生成面已由 local.yaml.example 覆盖，双文档漂移风险）；③把开关改回缺省开（语义检索是增量能力不是默认依赖，收紧决策不动）。
