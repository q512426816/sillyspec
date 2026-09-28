---
author: flow-machine-draft
created_at: 2026-09-28T09:25:04.430Z
---
# 决策记录（Decisions）— 2026-09-28-tap-judge

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：TAP 报告器为 node 18.17+ 特性——旧 node 消费仓的 auto-js 批（本就要求现代 node 跑 node --test）实际不构成风险，非 TAP 回退兜底。放弃方案：全量换 JSON 报告器（变化面更大，TAP 文本行与既有豁免模式语义更接近）。
