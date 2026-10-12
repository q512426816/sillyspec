---
author: flow-machine-draft
created_at: 2026-10-12T06:27:23.284Z
---
# 任务注册表（Tasks）— 2026-10-12-cross-wt-ghost-cleanup

- [x] task-01: cleanupCrossWorktrees 清理后以 git worktree list --porcelain 断言注册已消失（对齐 gate-snapshot 双清契约）；prune 失败/断言不过 → result=partial + 落位注册表键保留可重试，不再静默
- [x] task-02: locked 幽灵（prune 对 locked 条目静默跳过形态）在 partial 细节中提示 git worktree unlock
- [x] task-03: archiveWorktreeCleanup 主仓清理完成后调用 cleanupCrossWorktrees 兜底跨仓（幂等；跨仓有未 apply 交付时保留并警告，语义与主仓一致；不阻断归档）
- [x] task-04: doctor 新增跨仓注册扫描（local.yaml repos 各仓 git worktree list --porcelain 对照实体目录，失效注册列 finding）+ 新增清理动作 flag（dry-run 默认 + --confirm 执行 prune，对齐 --cleanup-ghosts 范式；locked 条目只提示不自动 unlock）
- [x] task-05: 新增测试覆盖：locked 幽灵夹具（lock+清目录）、归档兜底调用、doctor 扫描/清理 dry-run 与 confirm；全量相关测试绿
