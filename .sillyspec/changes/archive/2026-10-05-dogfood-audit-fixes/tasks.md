---
author: flow-machine-draft
created_at: 2026-10-05T02:36:34.334Z
---
# 任务注册表（Tasks）— 2026-10-05-dogfood-audit-fixes

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-dogfood-audit-fixes --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-dogfood-audit-fixes` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: knowledge stats/classify/inbox 三子命令的 --json 判定必须兼读 opts.json（全局旗标正道）与 args.includes('--json')（直调兜底），经 index.js 真实调度的 --json 输出结构化 JSON
- [x] task-02: flow start 起草的 design.md 模板「文件变更清单」指引必须改为独立章节写法，与 parseFileChangeList 解析面一致（照新指引书写不再触发夹带嫌疑误报）
- [x] task-03: 单测覆盖：三子命令 opts.json 路径断言各至少一条；stats 加经 stages/knowledge.js cmdKnowledge 调度入口的端到端 JSON 断言；模板文案新指引在场
