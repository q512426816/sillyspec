---
author: flow-machine-draft
created_at: 2026-10-05T11:24:54.199Z
---
# 任务注册表（Tasks）— 2026-10-05-wt-list-resilience

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-wt-list-resilience --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-wt-list-resilience` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 注册表含缺 changeName/branch 字段的 meta 时 sillyspec worktree list 不崩溃，缺字段项以目录名/'-' 兜底正常列出
- [x] task-02: 完整 meta 场景 list 输出不变（changeName/branch 取原值）
- [x] task-03: 单测覆盖缺字段 meta（changeName 兜底=目录名、branch 兜底='-')与解析失败跳过两形态
- [x] task-04: 会话专属 worktree 交付链路：worktree create → 树内实现 task-01~03 → wt-commit（带变更名后缀）→ apply 回主树
