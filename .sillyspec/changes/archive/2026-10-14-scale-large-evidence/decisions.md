---
author: flow-machine-draft
created_at: 2026-10-14T02:37:23.634Z
---
# 决策记录（Decisions）— 2026-10-14-scale-large-evidence

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：指引是软约束——agent 仍可能「自信地判错」（写出形式化的 Wave 证据话术而非真实并行分析），反判据只提高误判成本不根除。这是指引面的天然边界；硬面方案（如 CLI 校验 large 必须附 Wave 证据节、否则拒绝 --done）会引入新的 schema 门与存量不兼容，且「真并行/吃不下」本质是语义判断，机器校验只能查形不能查质——留作后续实证后再议。放弃的方案：① 把 large 判定从 agent 手里收走改纯机械规则（文件数/任务数轴）——2026-09-29-brainstorm-exit-thin-default 已实证文件数轴测错轴，复杂度/上下文轴必须留判断力；② 出口分叉处（complete.js）对 large 追问二次确认——收口时点已过设计期，追问只是把同一判断再问一遍，不增信息量。
