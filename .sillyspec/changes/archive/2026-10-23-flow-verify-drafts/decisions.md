---
author: flow-machine-draft
created_at: 2026-10-22T17:07:32.396Z
---
# 决策记录（Decisions）— 2026-10-23-flow-verify-drafts

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：抽共享源时 approve 行为漂移——对策：approve 输出文案与退出码逐字保持，approve-channel-attest / approve-gate-tick 既有套件零改动全绿作回归锚。放弃方案：①独立实现一份「轻量校验」（两路判定必然漂移，弃）；②把 violations 明细塞进 flow status 恢复简报（status 是自愿查看面，塞校验输出令恢复简报膨胀——与 protocol-tax 输出瘦身方向相反，弃）。
