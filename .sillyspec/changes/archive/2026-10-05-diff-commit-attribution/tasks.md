---
author: flow-machine-draft
created_at: 2026-10-05T04:38:09.259Z
---
# 任务注册表（Tasks）— 2026-10-05-diff-commit-attribution

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-diff-commit-attribution --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-diff-commit-attribution` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 集成场景（临时 git 仓双变更混窗）：他侧提交的交付文件不进本变更 patch 冻结面与 attributedChangedFiles，FR 域不再触达他侧文件的域
- [x] task-02: 本变更提交的文件（含被无后缀裸提交触碰过的）归属不变
- [x] task-03: 声明面优先级、7 天陈旧规则、非 git 仓与 git 失败的行为均维持现状
- [x] task-04: 新增测试锁定上述三面，全量测试绿
