---
author: flow-machine-draft
created_at: 2026-10-14T03:45:18.106Z
---
# 决策记录（Decisions）— 2026-10-14-patch-refreeze-missing-artifact

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：缺件重冻锚定当前 HEAD，若窗口内存在本变更后缀提交但冻结件已缺，漂移无法检测（旧冻结 head 不可知）→ review 未锚定时隔离重评兜底（宁可多评），review 已锚定时结论对当前面有效——两条路都收敛到「审计件与评审对象一致」。放弃方案 A（catch 分支里对 ENOENT 特判重冻）：json 损坏（非 ENOENT）同样产「归档无冻结件」，但「在场即信任」与「缺失即重建」混在一个 catch 里语义含糊；显式前置存在性检查意图更清晰、可单测。放弃方案 B（artifacts/ledger 等其它子步一并做存在性复查）：本次缺陷实证面只有 patch 冻结件，其它子步产物（如 ledger 回执）有各自回填机制，一刀切扩面会放大回归风险——留作后续按同模式逐子步治理。
