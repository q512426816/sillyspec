---
author: flow-machine-draft
created_at: 2026-09-25T05:08:34.231Z
---
# 设计记录（Design Record）— 2026-09-25-flow-checkpoints

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-flow-checkpoints 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三件交付：①flow start 简报增加三断点纪律段（spec 断点=填完 FR/design 槽后给用户看摘要等确认；执行断点=写完代码跑完测试后给用户看结果；归档断点=flow done 后给用户看收口结果；用户说全跑完则跳过）；②新增 flow status 子命令——读 flow-state.yaml 显示变更名/阶段推断（spec→执行→归档）/design 槽 FR 区绑定槽填充状态/子步进度/升厚标记，三态覆盖不存在/进行中/已归档；③flow done 收口输出加归档断点预告行。用户反馈驱动：阶段不可见+无卡点+agent 不汇报=可控性不够。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-flow-checkpoints 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/flow.js：cmdFlowStart 简报加三断点纪律块、cmdFlow 新增 status 子命令（readFlowState+槽位快检+阶段推断）、cmdFlowDone 收口加预告行。test/flow-checkpoints.test.mjs 新增（简报断言+status 三态）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-flow-checkpoints 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯输出文案+只读 status 查询，无状态变更。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-flow-checkpoints 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=三断点是说明书纪律不是 CLI 硬门——agent 可能不遵守（不向用户汇报直接跑完）。兜底：flow status 随时可查+评审/归档结果最终可见。后续可考虑 CLI 级硬门（--confirm-spec flag）但会加调用数。死路=加第三次 CLI 调用做确认——破坏 2 调用协议的核心价值。
