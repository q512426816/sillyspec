---
author: flow-machine-draft
created_at: 2026-10-06T05:44:41.765Z
---
# 任务注册表（Tasks）— 2026-10-06-archive-cmd-race-and-brief

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-archive-cmd-race-and-brief --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-archive-cmd-race-and-brief` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 归档建议命令的 src 侧 pathspec 仅含 HEAD 树在册路径（转瞬即逝的源侧 A 条目不进命令）；dst 侧为单条归档目录 pathspec；正常形态下打印命令可原样执行成功（exit 0）
- [x] task-02: 竞态注入形态（源侧幽灵 A 条目进暂存区后消失）下，打印命令仍可执行成功且提交面不含幽灵路径
- [x] task-03: flow done 首轮中断简报的「待办」不再包含本轮已完成/已跳过的子步（与重入后口径一致）
- [x] task-04: 新增单元测试覆盖上述三点并纳入 test:core，test:core 全绿
