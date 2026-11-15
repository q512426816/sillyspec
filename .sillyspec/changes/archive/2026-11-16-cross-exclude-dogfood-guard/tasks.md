---
author: flow-machine-draft
created_at: 2026-11-15T17:47:10.362Z
---
# 任务注册表（Tasks）— 2026-11-16-cross-exclude-dogfood-guard

- [x] task-01: 跨仓目标仓跟踪 .sillyspec 内容时（dogfood 形态），ensureCrossWorktrees 不再向其 .git/info/exclude 追加 .sillyspec/ 条目
- [x] task-02: 宿主仓形态（.sillyspec 无跟踪内容）行为不变：默认仓内落位仍幂等追加 exclude（既有测试 cross-worktree-placement 断言不回归）
- [x] task-03: 新增回归测试覆盖 dogfood 豁免分支与宿主仓不变分支
