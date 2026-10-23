---
name: sillyspec:push
description: 推送前压扁本地未推送提交并快进推送（默认 by-change；拒绝改写已推送历史与 force-push）
---
# 何时用

- `flow done` / `archive` 收口、提交完成后准备推送到远端。
- 用户说“推送 / push / 推到 origin / 发布 / 整理中间提交”。
- 不适用：已推送历史改写、他人分支未授权改写、平台进度同步（用 `platform sync`）。

# 生命周期速查

```bash
export SILLYSPEC_SESSION_ID=<agent名+任务名>   # 多会话所有权判定依赖
sillyspec push --dry-run                       # 先看计划，零写盘
sillyspec push                                 # 默认 by-change：连续同变更段压扁 + 快进推送
sillyspec push --mode one --change <名>        # 全部未推送提交合并一笔（守卫通过才可）
sillyspec push --no-push                       # 只压扁不推送
sillyspec push --undo                          # 推送前恢复最近一次压扁
# pre-push hook 会跑 lint/docs gate；失败必须修复，禁止 --no-verify
```

# 防坑清单

- 不要直接 `git push`、`git push --force`，也不要手工 `git reset --soft` 压扁。
- base 非 HEAD 祖先 / upstream 领先 → 拒绝；先人工 fetch/rebase，本命令不 force。
- index 有 staged 改动 → 拒绝；不要替其他会话提交或清理暂存区。
- 在 SillySpec worktree 内 → 拒绝；先 `worktree apply` 回主仓再 push。
- 区间含 merge commit / 已推送提交 → 默认拒绝；不要试图展平他人已推送历史。
- by-change 只合并连续段；裸提交与其他变更提交原样保留，不跨段重排。
- one 模式必须 `--change`；有活跃变更或其他归属提交时拒绝。
- 活锚点（scan `source_commit` / 活跃 baseline / change-patch / worktree meta）自动抬升 base；不要手工越过。
- 备份 ref 不自动清理；`--undo` 只允许推送前，已推送后拒绝。

# 边界声明

本卡不含实现细节——计划、分段、锚点抬升、CAS 与推送由 `sillyspec push` 按当前仓状态实时计算。
本卡不替代 commit：先用 `sillyspec commit` 或显式 pathspec 提交，再 push。
