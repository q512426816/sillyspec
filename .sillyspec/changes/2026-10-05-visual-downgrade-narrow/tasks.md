---
author: flow-machine-draft
created_at: 2026-10-05T11:13:55.953Z
---
# 任务注册表（Tasks）— 2026-10-05-visual-downgrade-narrow

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-visual-downgrade-narrow --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-visual-downgrade-narrow` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 后端/机制讨论语境的「降级」（探针档位讨论、性能降级等）与远处视觉词同行共现必须不再触发降级判定；2026-10-05-uivisual-word-narrow 的真实误伤 design 句作反例
- [x] task-02: 既有降级正例（视觉收敛降级形态、样式统一级形态）检测能力必须不变；带用户裁决留痕放行路径不变
- [x] task-03: 单测覆盖：元层误伤反例（真实误伤句）+ 后端降级同行反例 + 既有两正例回归 + 跨行不误配回归
