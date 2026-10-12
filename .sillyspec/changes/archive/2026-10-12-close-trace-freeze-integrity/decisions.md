---
author: flow-machine-draft
created_at: 2026-10-12T10:10:21.531Z
---
# 决策记录（Decisions）— 2026-10-12-close-trace-freeze-integrity

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：FR-01 是行为口径变更，存量读方若依赖 files[] 里的工件路径会静默变面——已核读方（fr-index/knowledge-graph/平台 assets.py）只消费顶级字段与交付行，scopeAudit.rows 口径本就不含工件；filter-committed-face 等四个测试文件钉旧行为需同步口径（测试对齐依据=本设计接口契约节）。放弃的方案：①thin 侧改为「工件保留但 totals 分列」——冗余不除、哨兵仍哑，弃；②FR-02 用 `rev-list --branches` 扫全分支——linked worktree 共享分支命名空间，主仓 main 分支推进会污染独占树判定（假阳阻断），改用本 worktree HEAD reflog；③FR-03 在 apply 内同步等待 agent 提交后回写——apply 无提交职责（pathspec 交给 agent），时序不可控，改多点幂等回写。
