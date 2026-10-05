---
author: flow-machine-draft
created_at: 2026-10-05T13:13:05.580Z
---
# 任务注册表（Tasks）— 2026-10-05-disposition-refreeze-drift

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-05-disposition-refreeze-drift --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-05-disposition-refreeze-drift` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 冻结后窗口内出现本变更名后缀交付提交时，重跑 flow done 检出漂移：输出审计时点漂移警告并自动重冻结（change.patch 含处置提交面，无需手动 --refreeze）
- [x] task-02: review 已有结论（review.json 在场）时漂移触发隔离：旧件改名 review.json.superseded 留档，review 子步标记重置，本次重新定档/重评
- [x] task-03: 窗口内仅他侧提交或无新提交时不触发（幂等跳过行为不变；归属判定按提交 message 变更名后缀）
- [x] task-04: 单测覆盖归属判定三形态（本变更后缀触发/他侧后缀不触发/裸提交不触发）+ e2e 锁定处置重入链路（漂移警告+重冻结+隔离+重评任务书再现）
- [x] task-05: 评审处置（P3×2：隔离槽位带时间戳防跨代覆盖；隔离失败整体退回现状幂等跳过 fail-safe；标记重置独立成块不与 rename 共 catch）
- [x] task-06: 重评处置（P3×3：design 随处置更新含未测边界披露；「下轮兜底」注释改为双故障边界如实描述；故障注入面显式披露不重构）
