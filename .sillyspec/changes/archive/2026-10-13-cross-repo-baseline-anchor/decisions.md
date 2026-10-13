---
author: flow-machine-draft
created_at: 2026-10-13T15:43:58.818Z
---
# 决策记录（Decisions）— 2026-10-13-cross-repo-baseline-anchor

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：token 归因依赖提交消息约定——跨仓提交不带变更名时零命中回退全窗口，外来已提交内容会进冻结面与 totals（审计污染可见）。缓解：AGENTS 规则 11 本就要求提交消息带变更名（跨仓不应例外）；回退面是可见噪音（unplanned 行+锚 label 自述「零 token 命中回退全窗口」），与主仓夹带嫌疑 advisory 同语义。次风险：共享跨仓未提交态天然混面（token 无法归因未提交内容）——文档披露的残留，根治需跨仓 worktree 隔离（另立项）。试过放弃的方案：①仅记基线不做 token 过滤——实验实证外来提交进窗污染冻结面，主面必须过滤；②flow done 时反向推断基线（窗口内最早提交的父）——交错时序下推断错位（正是 B 档病灶），start 时点快照才是唯一可靠锚；③跨仓也建 worktree——策略面大（往外部仓写状态），thin 首步不碰。均否。
