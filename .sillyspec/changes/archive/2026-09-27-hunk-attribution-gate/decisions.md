---
author: flow-machine-draft
created_at: 2026-09-27T05:55:13.843Z
---
# 决策记录（Decisions）— 2026-09-27-hunk-attribution-gate

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：竞争检测的假阳/假阴——他变更声明面与提交面相交但实际各行其事（假阳：一行警告可接受）或他会话在途改动根本没立变更/没写清单（假阴：残留信号与既有文件级 advisory 兜底，无法根治——hunk 归属的语义判断终究要人，门的目标是把静默混合变成显式中断）。试过放弃：① 轻量道默认挂会话 worktree（用户否决——合并税过重，仓内 wt-parallel-commit-race 等坑史为证）；② hunk 语义归属（机器无法判定行归属，改为「竞争文件显式暴露+人核」的诚实口径）。
