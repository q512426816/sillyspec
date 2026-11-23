---
author: flow-machine-draft
created_at: 2026-11-23T02:35:53.976Z
---
# 提案书（Proposal）— 2026-11-23-worktree-fallback-consent

## 动机

任务原话转写：主仓 worktree 降级改显式同意

动机与背景：2026-07-15 实锤降级事故（Windows 长路径 Filename too long，multi-agent-platform docs/sillyspec/finished/execute-in-place-windows-pitfalls.md 坑1）：git worktree add 失败后静默降级 in-place，且降级后主仓未切专用分支停在 main 直写，worktree-guard 又对 in-place meta（worktreePath=主仓根）全放行——主仓整树写入与 git commit 零拦截。全历史取证（腾讯云 postgres agent_run_logs+42 工作区、阿里云 15 工作区、zcode sqlite 882 任务、本地归档）四个月仅此一例，诱因已由 core.longpaths 缓解——fail-open 通道零价值纯风险。跨仓已是 fail-closed（worktree-cross.js「隔离建不起来就不该开工」），主仓对齐。用户原话（2026-11-23）：「不应该降级」。

成功标准：
- git worktree add 失败时 wm.create 不再静默降级：默认 throw，错误信息含原始 git stderr 与处置建议（worktree doctor / 清残留分支 / --allow-in-place 指引）
- 显式同意（run execute --allow-in-place 或 local.yaml worktree.fallback: allow）时可降级：meta 记 explicit 标记与 fallbackReason 原始错误，且主仓 checkout 专用分支（baseHash 等于当前 HEAD 时），不再停在用户当前分支
- worktree-guard 的 isInsideRegisteredWorktree 对无 explicit 标记的遗留 in-place meta 不再授权：主仓源码写入与 Bash 命令回到阶段门禁
- config-schema 文档化 worktree.fallback（block|allow，缺省 block）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. git worktree add 失败时 wm.create 不再静默降级：默认 throw，错误信息含原始 git stderr 与处置建议（worktree doctor / 清残留分支 / --allow-in-place 指引）
2. 显式同意（run execute --allow-in-place 或 local.yaml worktree.fallback: allow）时可降级：meta 记 explicit 标记与 fallbackReason 原始错误，且主仓 checkout 专用分支（baseHash 等于当前 HEAD 时），不再停在用户当前分支
3. worktree-guard 的 isInsideRegisteredWorktree 对无 explicit 标记的遗留 in-place meta 不再授权：主仓源码写入与 Bash 命令回到阶段门禁
4. config-schema 文档化 worktree.fallback（block|allow，缺省 block）

## 成功标准（可验证）

1. git worktree add 失败时 wm.create 不再静默降级：默认 throw，错误信息含原始 git stderr 与处置建议（worktree doctor / 清残留分支 / --allow-in-place 指引）
2. 显式同意（run execute --allow-in-place 或 local.yaml worktree.fallback: allow）时可降级：meta 记 explicit 标记与 fallbackReason 原始错误，且主仓 checkout 专用分支（baseHash 等于当前 HEAD 时），不再停在用户当前分支
3. worktree-guard 的 isInsideRegisteredWorktree 对无 explicit 标记的遗留 in-place meta 不再授权：主仓源码写入与 Bash 命令回到阶段门禁
4. config-schema 文档化 worktree.fallback（block|allow，缺省 block）
