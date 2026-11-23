---
author: flow-machine-draft
created_at: 2026-11-23T02:35:53.977Z
---
# 任务注册表（Tasks）— 2026-11-23-worktree-fallback-consent

- [x] task-01: git worktree add 失败时 wm.create 不再静默降级：默认 throw，错误信息含原始 git stderr 与处置建议（worktree doctor / 清残留分支 / --allow-in-place 指引）
- [x] task-02: 显式同意（run execute --allow-in-place 或 local.yaml worktree.fallback: allow）时可降级：meta 记 explicit 标记与 fallbackReason 原始错误，且主仓 checkout 专用分支（baseHash 等于当前 HEAD 时），不再停在用户当前分支
- [x] task-03: worktree-guard 的 isInsideRegisteredWorktree 对无 explicit 标记的遗留 in-place meta 不再授权：主仓源码写入与 Bash 命令回到阶段门禁
- [x] task-04: config-schema 文档化 worktree.fallback（block|allow，缺省 block）
