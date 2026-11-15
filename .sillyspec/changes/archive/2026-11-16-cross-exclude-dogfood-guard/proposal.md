---
author: flow-machine-draft
created_at: 2026-11-15T17:47:10.362Z
---
# 提案书（Proposal）— 2026-11-16-cross-exclude-dogfood-guard

## 动机

任务原话转写：跨仓 exclude 追加补 dogfood 仓豁免

动机与背景：ensureCrossWorktrees 对跨仓目标仓根幂等追加 .git/info/exclude「.sillyspec/」（坑 cross-wt-repo-local-placement 的 untracked 保障）。但目标仓若是 sillyspec 自托管/dogfood 仓（自身 git 跟踪 .sillyspec/ 内容），该条目会误伤：显式 pathspec 的 git add/commit 对 .sillyspec 下已跟踪文件报「paths are ignored」exit 1（2026-11-16 生产实证：sillyspec 主仓被写入该条目，发布期两笔提交被拦出假失败），且该目录新文件从 status 未跟踪提示中消失。本机存量条目已手工清除，本变更为代码面根治：ensureRepoLocalExclude 调用前判定目标仓 .sillyspec 是否有 git 跟踪内容，有则跳过追加。

成功标准：
- 跨仓目标仓跟踪 .sillyspec 内容时（dogfood 形态），ensureCrossWorktrees 不再向其 .git/info/exclude 追加 .sillyspec/ 条目
- 宿主仓形态（.sillyspec 无跟踪内容）行为不变：默认仓内落位仍幂等追加 exclude（既有测试 cross-worktree-placement 断言不回归）
- 新增回归测试覆盖 dogfood 豁免分支与宿主仓不变分支

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 跨仓目标仓跟踪 .sillyspec 内容时（dogfood 形态），ensureCrossWorktrees 不再向其 .git/info/exclude 追加 .sillyspec/ 条目
2. 宿主仓形态（.sillyspec 无跟踪内容）行为不变：默认仓内落位仍幂等追加 exclude（既有测试 cross-worktree-placement 断言不回归）
3. 新增回归测试覆盖 dogfood 豁免分支与宿主仓不变分支

## 成功标准（可验证）

1. 跨仓目标仓跟踪 .sillyspec 内容时（dogfood 形态），ensureCrossWorktrees 不再向其 .git/info/exclude 追加 .sillyspec/ 条目
2. 宿主仓形态（.sillyspec 无跟踪内容）行为不变：默认仓内落位仍幂等追加 exclude（既有测试 cross-worktree-placement 断言不回归）
3. 新增回归测试覆盖 dogfood 豁免分支与宿主仓不变分支
