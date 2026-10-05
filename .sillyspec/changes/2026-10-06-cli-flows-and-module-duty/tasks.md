---
author: flow-machine-draft
created_at: 2026-10-05T16:43:34.502Z
---
# 任务注册表（Tasks）— 2026-10-06-cli-flows-and-module-duty

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-cli-flows-and-module-duty --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-cli-flows-and-module-duty` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: .sillyspec/docs/sillyspec/flows/ 新增 4 篇 CLI 业务流程文档（lightweight-change 轻量变更 / full-pipeline 完整五阶段 / platform-sync 平台同步与远端派发 / recovery-concurrency 中断恢复与多 agent 并发），结构含「目标 / 参与模块 / 流程摘要 / 关键规则」与平台侧 flows 同构
- [x] task-02: 12 张 CLI 模块卡（stages / runtime / cli-entry / progress / docs-consistency / machine-interface / redlines / dispatch / sillyhub-mcp / migration / workflow / dashboard）各补「职责」节一行实文
- [x] task-03: 不引入任何新地图 / 索引 / 刷新机制：docs/PROJECT-MAP.md 不存在，README.md 与 HEAD 一致
