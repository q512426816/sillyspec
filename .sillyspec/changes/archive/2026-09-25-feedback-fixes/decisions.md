---
author: flow-machine-draft
created_at: 2026-09-25T09:57:49.960Z
---
# 决策记录（Decisions）— 2026-09-25-feedback-fixes

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：风险=去指纹后 tasks.md 无防篡改——但 tasks 本质是 agent 的工作清单非承诺锚（承诺锚在 design/FR），防假勾由哨兵按提交 token 判据独立兜底（不依赖指纹）。⑤最复杂：冻结面归属缺陷需要设计「重冻结」或「提交 trailer 过滤」机制，单独立项。
