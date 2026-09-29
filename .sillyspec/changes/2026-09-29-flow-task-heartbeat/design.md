---
author: flow-machine-draft
created_at: 2026-09-29T06:26:56.177Z
---
# 设计记录（Design Record）— 2026-09-29-flow-task-heartbeat

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-task-heartbeat 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
openspec 部件二移植：其「每步好好勾选」靠 skill 剧本+CLI 每轮重读 tasks.md（机器给下一个任务）+archive 阻漏勾三件咬合，sillyspec thin 道缺的正是中继协议调用——start/done 之间 tasks.md 只有 agent 自看（2026-09-29-rot-retire-inject-cap 实证一把勾 0→6，watcher 报假勾选嫌疑）。本变更把 flow status 升为执行期节拍器：②执行阶段当场重读 tasks.md（唯一进度源），输出「下一任务指针（第一个 - [ ] 行）+ 进度 N/M + 循环协议指引（做一件→勾一格→重跑取下一个）」，全勾改指 flow done；协议文案三处同步（flow start 简报 fresh/adopt 两路、tasks.md 头部纪律行、AGENTS.md 恢复与查看段）。逐 task 证据哨兵经源码核验已存在（sentinel-assertions.detectFakeCheckCompletion 的 missing 逐个点名+镜像豁免），本变更不动哨兵——心跳管节拍（openspec 同款软约束），哨兵管真伪（既有硬门）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-task-heartbeat 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow status（thin 变更、②执行阶段）输出新增心跳块：未全勾时两行（「⏭️ 下一任务：task-NN <标题截断60字>」「✅ 进度：N/M——边干边勾协议：做一件 → 勾一格 → 重跑本命令取下一个；勿攒一把勾（收口哨兵逐 task 核证据）」）；全勾时一行（任务全勾→flow done 收口+逐 task 证据提示）；①spec 阶段零心跳输出。移除旧「勾选提醒」行（tickNudge：滞后+区间有提交才刷的轻推——被恒在心跳覆盖，条件判断与 baseline git 调用一并退役）。文案变更三处：flow start 简报（fresh 405 行段/620 行段）、draftTasks 头部纪律行、AGENTS.md 恢复与查看段新增节拍器行。无函数签名/导出变化，无 CLI 参数变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-task-heartbeat 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：tasks.md 由 agent 单写、心跳每轮当场重读现文件——无缓存无序性问题，勾一格下一拍即生效（最终一致由重读保证）；2. 并发写：status 纯读零写，多会话各自 --change 隔离，无共享可变态；3. 切换/生命周期：心跳无自身状态（每轮重算），中断重跑幂等；flow-state 读写不涉心跳；4. 作用域：specBase 经 resolvePlatformSpecDir（外置根/--spec-dir 同构），tasks.md 路径锚定 changeDir 无穿越（变更名白名单前置校验）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-flow-task-heartbeat 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：心跳仍被 agent 无视（不轮询 status 直接干完）——与 openspec 同款的软约束边界，诚实披露：openspec 的剧本约束同样不强制（其 skill 文本也只是指令）；缓解=三处协议文案钉死+AGENTS.md 常驻面+哨兵硬门兜底真伪。弃案1：把「逐个勾」升为 flow done 时序硬门（勾选时刻与证据时刻配对核验）——误伤合法场景（一提交携带多 task token 是规范动作，时序配对会把正常批量提交判假）；逐 task 证据哨兵已存在故不再加码。弃案2：新增独立 flow next 子命令——与 status 职责重叠，AGENTS.md/恢复简报已统一指 status，多一个入口徒增记忆面。
