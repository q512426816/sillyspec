---
author: flow-machine-draft
created_at: 2026-10-12T15:00:44.087Z
---
# 决策记录（Decisions）— 2026-10-12-verify-handover-hint

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：文案与判定漂移——若未来 non-testable 准入变严（如要求锚点），场景句会误导。缓解：句内写法与现行校验逐字对齐（理由一句话）；本仓探针 cli-copy-selfsufficient 已把「文案与门判定一致」纳入评审必查。 试过但放弃：①加 covered-build/handover 枚举——进分子稀释激励、不进分子与 non-testable 同义（详见做法概述）；②只改骨架注释不改报错——agent 撞门时读的是报错不是骨架，两处都要。
