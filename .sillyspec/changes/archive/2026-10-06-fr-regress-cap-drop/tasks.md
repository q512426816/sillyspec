---
author: flow-machine-draft
created_at: 2026-10-06T11:20:52.294Z
---
# 任务注册表（Tasks）— 2026-10-06-fr-regress-cap-drop

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-fr-regress-cap-drop --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-fr-regress-cap-drop` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: priorityFiles ∪ 变更自身测试文件不再被 CAP 弃置：优先面整跑（组内序保持优先前缀+字母序），帽只界普通 import 依赖（fill 剩余席位）
- [x] task-02: 批对象披露计数分列：count=实跑总数、dropped 只计普通依赖弃置、新增优先面计数；控制台「超帽弃」文案只对普通依赖成立，优先面计数在场
- [x] task-03: 既有分组/运行器推断行为不变：.py/tsx/jsx 组、pytest/vitest 推断、e2e 目录过滤、cd 重定基照旧（回归测试钉住）
- [x] task-04: 直测覆盖三种配额形态：优先面超帽（普通依赖零席位）、优先面未满帽（普通填余）、py/js 混组优先豁免
