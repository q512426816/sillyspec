---
author: flow-machine-draft
created_at: 2026-09-26T02:17:39.340Z
---
# 设计记录（Design Record）— 2026-09-26-reconcile-source-isolation

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-reconcile-source-isolation 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
两件（R18-SF-full 对账死锁三因中的①③，调查结论：物化是 agent 自创行为，治本=锚定硬化+诊断先行）：①B1 第三候选——sillyspec/<change> 分支名约定与审计 tag 均落空时，扫 .runtime/worktrees/*/meta.json 按 changeName 键匹配取 meta.branch 真实分支名作 merge-base diffRef（非约定命名分支的锚定通路）；②死锁诊断——post-apply 形态 actual 源全空（无锚定 diff+porcelain 无未提交面+无 apply-pathspec）时 parallelAdvanceHint：指明并行推进形态、明禁暂存物化自救、给安全出路，经 notes 带到对账输出。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-reconcile-source-isolation 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
verify-postcheck.js resolveReconcileActualFiles：形态 B 的 diffRef 解析加 metaBranchRef 第三候选（readdirSync worktrees 读 meta.json BOM 容错，rev-parse 验证 ref 存在）；返回对象新增 parallelAdvanceHint 字段（条件：form=post-apply 且 files/union 全空且无 diff/兜底源）；reconcileTargetFiles 消费侧把 hint push 进 notes。既有 B1/B2/B4/B3 源与形态 A 零改动。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-reconcile-source-isolation 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：meta 扫描是读时点快照（meta 在 worktree 建立时写、分支 ref 由 git 保证）；多 worktree 目录首命中即用（changeName 键唯一——同名变更不并存，规则 8 隔离）。2. 并发：只读扫描零共享态；hint 是纯输出不落状态。3. 切换：hint 无副作用（重跑同形态同提示）；metaBranchRef 验证失败静默省略（回到既有降级路径）。4. 作用域：只影响形态 B 的 diffRef 候选序（sillyspec/ 前缀 > 审计 tag > meta.branch）；形态 A（worktree 存活）不走此路径。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-reconcile-source-isolation 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=meta.branch 指向的分支已被删/移（rev-parse 验证挡住→静默省略回降级，不误锚）；meta.changeName 键与实际变更不匹配（worktree 建立时写入的键与 change 名同源——键漂移时第三候选同样落空回到现状，无恶化面）。死路：让 agent 在对账前「重建分支」的指引——这正是 R18 死循环的形态（4 种面重建 matched=0）；诊断给的出路是登记/恢复既有 ref 而非重建内容，弃。
