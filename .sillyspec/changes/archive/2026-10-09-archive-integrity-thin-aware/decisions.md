---
author: flow-machine-draft
created_at: 2026-10-09T00:19:42.603Z
---
# 决策记录（Decisions）— 2026-10-09-archive-integrity-thin-aware

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：epoch 豁免面过宽——若有人在 2026-10-07 前的 thin 归档里真留了未完成工作，本检查不再点名（归档完成门在 flow done 六子步当时已判，事后无法区分占位稿与漏勾）。接受理由：v3 前勾选不是完成契约（无机械区分依据），误报 36 份 vs 漏检理论值的代价权衡明确；新账（epoch 后）照常严查。次风险：批量入账 42 条若混入真欠账——逐条按五类理由归类（每类有形态证据：quick 通道产物有 decisions+delta 无 flow-state、spike 仅 proposal.md 等），且账本条目带 exempted_at 可追溯，stale 条目 doctor 会提示清理。放弃的方案：簿记补勾 36 份 pre-epoch thin（伪造完成态，违 2026-09-17 裁决）；全部走账本不修检查（172 份系统性误报逐条入账是拿账本抹平检查缺陷，且未来 thin 归档持续新增误报）；只修检查不入账（42 份真历史形态继续亮红，advisory 狼来了）。
