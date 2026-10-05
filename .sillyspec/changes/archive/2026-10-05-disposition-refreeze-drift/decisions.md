---
author: flow-machine-draft
created_at: 2026-10-05T13:48:34.866Z
---
# 决策记录（Decisions）— 2026-10-05-disposition-refreeze-drift

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：治理件后补提交（如评审任务书后 agent 修改 design.md 并提交）也带本变更后缀 → 触发重冻结+重评——多一次评审循环的成本换审计面始终对齐最新提交事实，方向正确但循环可能多一轮；重评后无新提交即不再触发，无死循环面（判据窗口每轮前移）。放弃的方案：① 只警告不自动重冻结（弱形态）——警告会被忽略，归档件仍停在旧时点，治标不治本；② 按 review.json 的 reviewedAt 时间戳对比提交时间——时钟不可比（本地钟漂移），且 review.json 可手写，锚点不可靠；head 锚是 git 自身事实。均已弃。
