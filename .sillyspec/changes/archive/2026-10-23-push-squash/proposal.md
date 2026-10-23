---
author: flow-machine-draft
created_at: 2026-10-23T08:40:39.989Z
---
# 提案书（Proposal）— 2026-10-23-push-squash

## 动机

任务原话转写：推送前按变更压扁本地未推送提交

客户反馈使用工具后 git 提交过多（每 task 一笔、归档两笔、merge 兜底带入 worktree 全量历史）。需要提供显式 sillyspec push：只改写当前分支相对目标远端的未推送段，默认按连续变更段压扁，可选合并为一个大提交，然后快进推送。禁止 pre-push hook 静默改写、禁止改写已推送历史、禁止 force-push。并行会话场景下不得动他会话未提交文件，不得在活跃 worktree 内压扁；用备份 ref、CAS、文件锁保证可恢复。

成功标准：
- sillyspec push --dry-run 只输出计划，不改写 ref/index/工作区/远端
- 默认 by-change 将连续同变更提交压成一笔，保留变更名与全部 task-NN 证据 token
- 执行后 index/工作区逐字节不变，远端快进推送成功
- base 非 HEAD 祖先、区间含已推送提交、活跃 worktree、merge commit、staged 改动等场景被拒绝并给出可执行指引
- 压扁前自动建备份 ref，--undo 可在推送前恢复
- 新增 sillyspec:push skill 与 push 命令卡，flow done 不再提示 reset --soft

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. sillyspec push --dry-run 只输出计划，不改写 ref/index/工作区/远端
2. 默认 by-change 将连续同变更提交压成一笔，保留变更名与全部 task-NN 证据 token
3. 执行后 index/工作区逐字节不变，远端快进推送成功
4. base 非 HEAD 祖先、区间含已推送提交、活跃 worktree、merge commit、staged 改动等场景被拒绝并给出可执行指引
5. 压扁前自动建备份 ref，--undo 可在推送前恢复
6. 新增 sillyspec:push skill 与 push 命令卡，flow done 不再提示 reset --soft

## 成功标准（可验证）

1. sillyspec push --dry-run 只输出计划，不改写 ref/index/工作区/远端
2. 默认 by-change 将连续同变更提交压成一笔，保留变更名与全部 task-NN 证据 token
3. 执行后 index/工作区逐字节不变，远端快进推送成功
4. base 非 HEAD 祖先、区间含已推送提交、活跃 worktree、merge commit、staged 改动等场景被拒绝并给出可执行指引
5. 压扁前自动建备份 ref，--undo 可在推送前恢复
6. 新增 sillyspec:push skill 与 push 命令卡，flow done 不再提示 reset --soft
