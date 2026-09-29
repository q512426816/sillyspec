---
author: flow-machine-draft
created_at: 2026-09-29T06:55:43.119Z
---
# 设计记录（Design Record）— 2026-09-29-heartbeat-d007-incontext

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-heartbeat-d007-incontext 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
纠偏 2026-09-29-flow-task-heartbeat 的两处方向错误：①协议文案把「每任务重跑 flow status」写成准必需调用，违反 D-007（thin 道中间零协议必需交互，2 次调用经济性是轻量流程立身之本；openspec 的逐任务循环实为 skill 文本驱动的上下文内循环，agent 直读 tasks.md，CLI 只在交互边界调用）；②勾选纪律细节塞进了 AGENTS.md（每会话全量注入面，title-and-agents-slim 刚瘦身过）。修正：进度源回归 tasks.md 文件本身（做一件→勾一格→继续下一条，零 CLI）；status 心跳渲染保留为自愿查看/恢复面价值（恢复/查进度一次调用拿指针）；五处文案改自愿口径；AGENTS.md 增行整条删除。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-heartbeat-d007-incontext 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
无函数/签名/命令变化。文案五处：flow status 心跳指引行（去「重跑本命令取下一个」，改「继续下一条+D-007 自愿语义」）、flow start 简报两路、draftTasks 头部纪律行；AGENTS.md 删除一条新增行（恢复原状）。测试钉同步：flow-status-heartbeat ①④（加旧口径负向钉）、tick-loop-nudge ③。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-heartbeat-d007-incontext 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯文案与测试钉变更，无乱序/并发/切换/作用域面（1-4 各维均无新代码路径）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-heartbeat-d007-incontext 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：文案改口径后 agent 又回到「一把勾」旧行为——防线分层不变：tasks.md 头部+简报两个恰时面钉纪律、哨兵逐 task 硬门、watcher 人判；心跳渲染在自愿调用时仍给指针。弃案：保留 AGENTS.md 纪律行——每会话注入成本恒定发生，且恢复/简报面已覆盖，属非必要（用户裁决：非必要不放 AGENTS.md）。
