---
author: flow-machine-draft
created_at: 2026-10-06T06:09:49.007Z
---
# 任务注册表（Tasks）— 2026-10-06-wallclock-entry

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-wallclock-entry --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-wallclock-entry` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: datetime.js 新增 toWallClock(input)：接受 Date 实例 / epoch 毫秒数 / 可被 Date 解析的时间字符串三类输入，统一输出本地时区 YYYY-MM-DD HH:mm:ss（与 nowWallClock 同形）；无效输入（NaN 时刻/不可解析字符串）抛 TypeError 且信息含输入的字符串形式
- [x] task-02: scan-facts.js 的 generatedAt 改走 toWallClock，scan facts markdown 头行呈现本地墙钟人读形
- [x] task-03: 测试覆盖：三类输入正确（含时区不偏移断言）、无效输入抛错、scan-facts generatedAt 新形状回归
