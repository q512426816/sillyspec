---
author: flow-machine-draft
created_at: 2026-09-26T02:25:22.425Z
---
# 决策记录（Decisions）— 2026-09-26-reconcile-source-isolation

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险=meta.branch 指向的分支已被删/移（rev-parse 验证挡住→静默省略回降级，不误锚）；meta.changeName 键与实际变更不匹配（worktree 建立时写入的键与 change 名同源——键漂移时第三候选同样落空回到现状，无恶化面）。死路：让 agent 在对账前「重建分支」的指引——这正是 R18 死循环的形态（4 种面重建 matched=0）；诊断给的出路是登记/恢复既有 ref 而非重建内容，弃。
