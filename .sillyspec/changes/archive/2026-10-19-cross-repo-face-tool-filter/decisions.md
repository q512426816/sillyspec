---
author: flow-machine-draft
created_at: 2026-10-19T11:07:59.402Z
---
# 决策记录（Decisions）— 2026-10-19-cross-repo-face-tool-filter

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：跨仓 patch 与 totals 的既有读方（平台全屏预览/实时对账卡）看到的文件数变小——这是口径修正（模板本就不该计入交付），非数据丢失；模板改动仍在 git 历史与归档文档。放弃方案：①只过滤 patch 不过滤 rows——会造成 totals 与 patch 文件数不一致（生产 112 vs 110 的既有失真复刻）；②在 filterDeliverableFiles 层过滤——会改变 worktree apply 的交付语义（tool 档是软桶），影响面超出本变更。
