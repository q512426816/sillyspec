---
author: flow-machine-draft
created_at: 2026-09-26T09:50:52.582Z
---
# 决策记录（Decisions）— 2026-09-26-governance-autopilot

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险=GWT 骨架语义不准（关键词启发式的 Given 可能错域、箭头拆分的 When/Then 可能断错）——骨架标注「可编辑覆盖」，agent 修正错骨架比从零写省力（一次 Edit vs 三次）；索引进 knowledge/fr 的骨架质量依赖 agent 覆盖意愿（不覆盖时入库的是骨架不是精写——比空着不进库好，但不如精写——权衡接受）。死路：完全取消 agent 填写（纯机器 FR 入库）——索引质量退化为机械摘录，知识复利面受损；保留 agent 可覆盖是正确分界。
