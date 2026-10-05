---
author: flow-machine-draft
created_at: 2026-10-05T13:59:48.258Z
---
# 任务注册表（Tasks）— 2026-10-05-input-format-copy

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-input-format-copy --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-input-format-copy` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 4 处教学点全部带过门格式（独立一行『成功标准：』+ 每行一条『- 可验证标准』的教学形态）；紧凑内联旧形态零残留
- [x] task-02: quick 会话的 --input "<一句话任务描述>"（另一语义门）与 run --done --input "用户原话" 不受影响
- [x] task-03: 源级回归测试锁定：flow start 教学行不再出现无格式/紧凑内联形态
