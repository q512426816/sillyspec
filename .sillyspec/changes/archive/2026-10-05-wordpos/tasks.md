---
author: flow-machine-draft
created_at: 2026-10-05T00:14:27.780Z
---
# 任务注册表（Tasks）— 2026-10-05-wordpos

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-wordpos --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-wordpos` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: FR 行为句强度词判定对英文 SHALL MUST SHALL NOT SHOULD 与中文必须禁用同构——句中任意位置命中即视为已撰写
- [x] task-02: 待撰写占位行仍被拒收——占位句自带的词表字样不算已撰写
- [x] task-03: 既有测试回归绿且 lint 零死导出
