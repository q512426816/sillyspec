---
author: flow-machine-draft
created_at: 2026-10-06T12:55:39.218Z
---
# 任务注册表（Tasks）— 2026-10-06-datetime-timeago

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-datetime-timeago --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-datetime-timeago` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: src/datetime.js 提供 timeAgo(input) 公共导出：接受 Date/epoch 毫秒/时间字符串（解析面与 toWallClock 同构），无效输入抛 TypeError 且 message 含输入字符串形式
- [x] task-02: 输出形状与 stage-machine 现状逐字一致：刚刚 / N 分钟前 / N 小时前 / N 天前（负差与未来时间按刚刚处理）
- [x] task-03: stage-machine._timeAgo 改为委托 datetime.timeAgo（行为不变），模块内不再手写分钟/小时/天换算
- [x] task-04: 新增回归测试覆盖各档位与无效输入，npm run test:core 全绿
