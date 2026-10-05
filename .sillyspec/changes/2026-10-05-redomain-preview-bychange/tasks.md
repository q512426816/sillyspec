---
author: flow-machine-draft
created_at: 2026-10-05T13:03:31.030Z
---
# 任务注册表（Tasks）— 2026-10-05-redomain-preview-bychange

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-redomain-preview-bychange --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-redomain-preview-bychange` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: tests --redomain --by-change 预览与落盘同口径：只列该变更条目，计数带「（仅「变更：X」）」标注
- [x] task-02: 他变更条目不进预览清单
- [x] task-03: CLI 级单测锁定（execFileSync 走真实 CLI 预览路径断言子集计数与排除项）
