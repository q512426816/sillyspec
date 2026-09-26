---
author: flow-machine-draft
created_at: 2026-09-26T06:38:22.139Z
---
# 设计记录（Design Record）— 2026-09-26-tick-loop-nudge

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-tick-loop-nudge 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
四件（R19 行为发现→OS 机制对齐）：①flow status ②执行阶段勾选滞后+区间有提交→轻推提醒行（把勾选指令从起点简报挪进 agent 中途必经的 status 面——OS 的 Guardrails 常驻干活循环的对齐物，thin 2 调用协议无 instructions 循环，status 是等价注入点）；②tasks.md 头部加边干边勾纪律行（每次读任务面都看到——常驻工件面第二通道）+ 完成判定语义（实现到位+测试跑绿即勾，OS 同款）；③简报交付纪律明示 tasks.md 一并 pathspec 提交（R19 发现 untracked 直至归档——勾选证据链 git 不可回溯）；④哨兵时点判定（放行但 warn）：tasks.md 首次提交==最后提交（一把勾模式）/ untracked 两种形态各一行行为提醒，fail-soft。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-tick-loop-nudge 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow.js：flow status 渲染加 tickNudge 条件行（phase ② + c<tot + commits>0）+ 简报交付纪律两行 + 哨兵 complete 分支加时点判定 try/catch；flow-draft.js：tasks.md 头部加第三条 blockquote 纪律行。零行为阻断变化（全是 advisory/提示/渲染），哨兵的 fake 拦截语义不动。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-tick-loop-nudge 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：提醒是 status 调用时点快照（不落状态零竞态）。2. 并发：只读 git log。3. 切换：提醒幂等（重跑 status 同条件同提示）；哨兵时点 warn 在 complete 分支内（不影响断点续）。4. 作用域：只影响 thin/flow 面的提示与渲染；thick 任务卡（task done 命令）语义不动。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-tick-loop-nudge 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=提醒噪音化（agent 频繁 status 每次都刷同一行）——限定②阶段+滞后+有提交三条件，①阶段/勾齐后静默；R20 重跑可观测行为是否迁移。死路：把一把勾改成阻断（哨兵拒收）——token 证据已验全勾为真（R19 实证勾选滞后≠假勾），阻断只制造 amend 循环（R18 同款摩擦），弃；死路：CLI 侧自动勾（据 wt-commit 事件反推）——自动勾消解 agent 的 ownership（OS 实证自拆清单边勾是自然行为），且反推映射脆，弃。
