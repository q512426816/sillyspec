---
author: flow-machine-draft
created_at: 2026-10-06T05:06:35.656Z
---
# 任务注册表（Tasks）— 2026-10-06-flow-status-json

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-flow-status-json --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-flow-status-json` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: flow status --change <存在的活跃变更> --json 输出合法 JSON，含 change/phase/designFilled/frFilled/bindingsFilled/bindingsTotal/tasksChecked/tasksTotal/substeps 字段
- [x] task-02: 变更不存在与已归档两种形态下 --json 亦输出结构化 JSON（带对应状态标记）且进程退出码与现有人类可读路径一致
- [x] task-03: 新增单元测试覆盖上述三种形态并纳入 test:core，全部跑绿
