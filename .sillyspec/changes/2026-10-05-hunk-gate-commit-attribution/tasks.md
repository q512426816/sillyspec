---
author: flow-machine-draft
created_at: 2026-10-05T14:41:28.144Z
---
# 任务注册表（Tasks）— 2026-10-05-hunk-gate-commit-attribution

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-hunk-gate-commit-attribution --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-hunk-gate-commit-attribution` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 已归档他侧交付（窗口内全部提交属他侧变更名）不再报未归因，改报「他侧归因（提交事实）」信息行并注明 patch 冻结面同口径剔除
- [x] task-02: 他侧归因文件不计入 ok 阻断面（gate=error 不再因此拦）；裸提交/本变更名提交的文件维持未归因原判定
- [x] task-03: 归属切分不可得（非 git/无基线/git 失败）时保持原口径全量未归因（fail-closed 不放宽）
- [x] task-04: 单测覆盖：他侧归因改判/裸提交维持/切分不可得退化三形态
