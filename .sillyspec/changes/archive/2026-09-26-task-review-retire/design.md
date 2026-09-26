---
author: flow-machine-draft
created_at: 2026-09-26T02:31:44.113Z
---
# 设计记录（Design Record）— 2026-09-26-task-review-retire

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-task-review-retire 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
R18 对撞实验实证（docs/analysis/R18-*）：execute 每任务 review.json 评审层在无嵌套派发环境全降自审表演，15 次拦截中 5 次是它的形式合规（缺件/假 hash/枚举错），实质拦截为零；前置豁免通道（2026-09-26-review-unsupervised-exit，已归档）已覆盖无派发环境。本变更把 Task Review 层从「可豁免」推进到「退役」：删 gates.js 三处消费门（Execute Task Review Gate 整块含豁免分支、enforceReviewJsonGate 硬门、enforceAlignExecuteReviewGate 的 Task Review 段），停写生成侧（complete.js 两处 autoCheckPlanFromReviews 调用与 generateTaskReviewDrafts 兜底），勾选迁移为 agent 手动勾（完成=实现+测试绿+wt-commit，同 thin 工作单元语义），假勾防线由 checkExecuteCodeEvidence（detectExecuteBatchFinish 内，保留）+ verify 测试对账承担。Stage Review 层（阶段粒度）保留——R8 实证有真独立评审者时抓过真缺口；task-review.js / stage-review.js 模块保留作历史归档 doctor/回放兼容读侧。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-task-review-retire 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
- gates.js：删导出 enforceReviewJsonGate（唯一调用方 complete.js 同步删调用与 import）；enforceAlignExecuteReviewGate 签名不变、行为收窄为豁免头+Stage Review 段（Task Review 段删）；runStageCompletionGates 级联不再含 Execute Task Review Gate 分支（verify-required-evidence.json 随之停写）。
- complete.js：execute --done 路径不再自动勾选 tasks.md（两处 autoCheckPlanFromReviews 调用删）、不再生成 per-task review 草稿（generateTaskReviewDrafts 兜底块删）；detectExecuteBatchFinish 及 checkExecuteCodeEvidence 客观核验保留不动。
- execute.js 指引：Task Review Gate 段整体删除；勾选语义改「完成一个任务（实现+测试绿+wt-commit）即手动勾 checkbox」；QA 子代理（阶段级）保留但分层前提改写（无 task review 层，统一按 design×diff 全量对照）；旧「无 Agent tool 降级自审」句删（豁免声明句已在）。
- verify.js：verify-required-evidence.json 改兼容读（随 Task Review 退役停写——在场则消费，缺席=无 cannot_verify 任务）。
- 无 CLI 命令签名变化；review write / task done / backfill-reviews 命令保留（历史变更兼容侧，残存 review.json 仍可被 doctor/回放读侧消费）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-task-review-retire 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到到达：review.json 不再是任何门的输入，历史变更残存的 review.json 只走保留的兼容读侧（index.js review-write 钩子、task-done、assertWaveTasksComplete 内幂等 autoCheck——无 review 时纯 no-op），新变更零 review.json 零影响；勾选唯一写入者回到 agent 手动，tasks.md checkbox 语义（已勾=已完成，中断续跑跳过）不变。
2. 并发写：tasks.md 勾选由 agent 串行手动写（thin 语义），CLI 不再有自动补勾并发写面；execute 批量完成仍经 checkExecuteCodeEvidence 客观 diff 核验（假勾→无代码证据→不批量成立），多 agent 并发面较退役前只减不增。
3. 切换/生命周期：中断恢复锚 tasks.md checkbox（写入者变了、语义没变）；退役前生成的 verify-required-evidence.json 在场仍被 verify 消费（兼容读），缺席不再阻断；flow/进度库结构无变化。
4. 作用域：改动全在主仓 CLI 源码（gates/complete/execute/verify 指引），worktree/跨仓机制不变；历史归档变更的 doctor/回放读侧依赖 task-review.js 导出——模块与导出一律保留。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-task-review-retire 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：手动勾选引入假勾面（agent 未做即勾/顺手全勾）。缓解：detectExecuteBatchFinish 内 checkExecuteCodeEvidence 代码证据核验仍在 execute 收口跑（勾了但无 base..HEAD diff 证据→批量完成不成立、阻塞暴露）+ verify 阶段测试对账门禁不变（实测失败阻断收口）+ verify 逐项检查任务步仍只读对照勾选态。放弃的方案：①只加豁免不退役——前置变更已做，R18 实证豁免后仍留 5/15 形式拦截摩擦且「可豁免的门」诱导表演；②连 task-review.js 模块一起删——放弃，历史归档 doctor/回放兼容读侧依赖其导出（validateTaskReviews 等），review write/backfill-reviews 命令仍引用；③保留 Task Review 门但只对 independent tier 生效——放弃，tier 分级在 Stage Review 层已有，任务粒度无独立评审者供给时该门只剩形式校验（R18 实证）。
