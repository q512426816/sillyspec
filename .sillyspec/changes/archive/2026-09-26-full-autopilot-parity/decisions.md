---
author: flow-machine-draft
created_at: 2026-09-26T11:10:20.056Z
---
# 决策记录（Decisions）— 2026-09-26-full-autopilot-parity

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险=auto-tick 的近 20 提交窗口可能捕到其他变更的 task token（多 agent 共享仓）——窗口缩小到 run 范围更精确但 runId 解析复杂度高；20 窗口是 pragmatic 平衡，误勾由 checkExecuteCodeEvidence 兜底。auto-bind 的 test-result 路径在平台模式（runtime 分离根）可能读不到——fail-soft 跳过不阻断，与 thin 同风险面。死路：GWT 预填直接迁移（用 input 文本推导 full 的 FR）——full 的 requirements 来自对话演化，input 只是起点；直接迁移会产出生成式填空题质量低于 thin（无对话上下文），弃。
