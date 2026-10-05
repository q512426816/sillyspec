---
author: flow-machine-draft
created_at: 2026-10-05T23:15:57.077Z
---
# 任务注册表（Tasks）— 2026-10-06-review-anchor-and-negation

> 镜像行（task-01…task-NN）是成功标准逐条镜像=任务锚：勿删勿改写（收口对照它），完成实现路径
> 需要更细步骤时在镜像行**后追加细化行**（保持 `- [ ] task-NN:` 行形态，编号从镜像行末尾顺延——
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决）。
> 边干边勾：完成一条 = 实现到位 + 相关测试跑绿 → 当场勾（sillyspec task tick --change 2026-10-06-review-anchor-and-negation --task task-NN 即时回显进度与下一任务，或 Edit 翻格），勿攒到收口一把勾（收口硬门拒单拍多格勾选；--allow-batch-tick 可显式旁路留痕）。⚠️ harness 的 TodoWrite 类工具不替代本文件——平台进度/收口哨兵只读 tasks.md。
> `flow status --change 2026-10-06-review-anchor-and-negation` 为自愿查看/恢复面。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 评审任务书标注评审对象 HEAD（sha 印在任务书）且 review.json schema 含 reviewedAgainst 字段（评审员照抄）；validateReviewJson 对该字段可选校验（缺省兼容旧产物，存在须为 7-40 hex）
- [x] task-02: 漂移隔离前比对：reviewedAgainst 命中当前 HEAD（前缀口径）→ 保留 review.json 不隔离不重置 review 子步标记，日志说明保留原因；未锚定/读失败 → 现行隔离行为不变
- [x] task-03: 比对逻辑提炼为可单测纯函数（flow-review.js 导出），flow.js 仅接线
- [x] task-04: NEGATED_CROSSTALK_RE 补「不串台」整词：design 作答「…过滤不串台」不再一票升级；「不排除串台」风险自认形态保留一票升级
- [x] task-05: 新增回归测试覆盖上述两向；npm test 改动面无回归 + lint 绿
