---
author: flow-machine-draft
created_at: 2026-10-20T01:54:00.807Z
---
# 任务注册表（Tasks）— 2026-10-20-cli-worktree-cwd-anchor

- [x] task-01: CLI 入口对 worktree cwd（cwd 或 --dir 命中 worktree 段）：不再 exit 2，改为⚠️警告（变更名/原 cwd/锚定主仓根/逃生门整行）+ 自动把执行目录重锚定到主仓根——命令按主仓口径执行（进度库/变更状态单源）
- [x] task-02: --allow-worktree-cwd 显式放行语义不变（跳过守卫零警告零锚定）；wt-commit 豁免不变；--dir 显式主仓根不经守卫（本来就命中不了 worktree 段）
- [x] task-03: 主仓根 .sillyspec 存在性由后续未初始化门自然判定（锚定后主仓未 init 的极端态走既有出口，不在守卫内重复判）
- [x] task-04: detectCwdInsideWorktree 单元行为不变；既有 worktree-cwd-guard e2e 断言改钉（exit 2 → 锚定警告 + 主仓口径执行）；守卫相关回归全绿
- [x] task-05: 本仓 AGENTS/CLAUDE 若述及硬拦行为则同步（查无则记不适用）
