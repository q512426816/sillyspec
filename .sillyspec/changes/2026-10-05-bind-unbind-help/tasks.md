---
author: flow-machine-draft
created_at: 2026-10-05T14:15:38.829Z
---
# 任务注册表（Tasks）— 2026-10-05-bind-unbind-help

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-bind-unbind-help --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-bind-unbind-help` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: tests 用法行含 --bind/--unbind 语义说明（追加新行不替换旧行 / 按 --row-id 或 --tests 删行）
- [x] task-02: 语义说明与实现一致（bind 行构造 append 语义、unbind 删行 id 来源两口径）
- [x] task-03: 源级回归测试锁定用法行语义文本在场
