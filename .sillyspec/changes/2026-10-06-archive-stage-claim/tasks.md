---
author: flow-machine-draft
created_at: 2026-10-06T07:15:04.788Z
---
# 任务注册表（Tasks）— 2026-10-06-archive-stage-claim

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-archive-stage-claim --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-archive-stage-claim` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: complete-handlers.js 补暂存循环逐批校验 safeGit 返回的 error：任一批失败时不再打印成功提示，改为 ⚠️ 告警（含失败路径与 error 首行）并给出手工兜底指引（git add -- <源侧路径> 后重跑收口）——与相邻 untrackedArchiveHit 兜底分支的告警形态一致
- [x] task-02: 全部成功时维持既有成功提示不变（含 N 项计数）
- [x] task-03: 测试覆盖：add 失败路径告警且不打成功提示 / add 成功路径提示不变的单元回归
