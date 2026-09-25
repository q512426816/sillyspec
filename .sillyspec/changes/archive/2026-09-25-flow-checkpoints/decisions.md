---
author: flow-machine-draft
created_at: 2026-09-25T05:22:16.078Z
---
# 决策记录（Decisions）— 2026-09-25-flow-checkpoints

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：风险=三断点是说明书纪律不是 CLI 硬门——agent 可能不遵守（不向用户汇报直接跑完）。兜底：flow status 随时可查+评审/归档结果最终可见。后续可考虑 CLI 级硬门（--confirm-spec flag）但会加调用数。死路=加第三次 CLI 调用做确认——破坏 2 调用协议的核心价值。
