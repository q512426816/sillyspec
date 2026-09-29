---
author: flow-machine-draft
created_at: 2026-09-29T08:03:28.046Z
---
# 设计记录（Design Record）— 2026-09-29-batch-tick-gate

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-batch-tick-gate 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
A+B 双层：A 层移植 openspec 骨架——任务面定稿提前到 ①spec 阶段（简报与 tasks.md 头部指令：覆写为真实实现步骤全 - [ ] 后再动代码）、执行段指令改任务循环（Working on task N/M → 做 → 勾一格 → 下一个），让勾选成为循环体固有动作而非期末文书；B 层机器牙齿——既有勾选节奏 advisory（watcher 单拍 checked N→M 跳≥2 + 非镜像面）升为 flow done 拒收硬门，--allow-batch-tick 显式旁路留痕（同意门先例），镜像-only 与哨兵面未知维持 advisory（镜像豁免哲学 + fail-open 防误拒），观测缺席静默降级现行判据。三次复发（0→6/0→3/0→3）实证协议文本对 agent 执行习惯无效。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-batch-tick-gate 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow.js cmdFlowDone 新增 allowBatchTick 参数与 --allow-batch-tick 旗标解析；勾选节奏块三态分支（拒收 exit 1 + 遥测 sentinel:batch-tick / 旁路留痕 flow-state allow_batch_tick / 哨兵面未知 advisory）；简报两路与 draftTasks 头部文案升级（spec 定稿 + 循环指令）。无导出函数变化（detectBatchCheckCadence/readWatcherEvents 既有复用）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-batch-tick-gate 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：1) 乱序——watcher 事件流只读回放，拒收判据取最大单跳（顺序无关）；2) 并发——门在收口单点执行，事件文件读取 best-effort；3) 切换——拒收后断点续跑幂等（ledger 子步重入），旁路留痕进 flow-state；4) 作用域——事件文件按 change 名隔离，非真相源（缺席不阻断）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-batch-tick-gate 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：误拒合法场景——三层防护（镜像-only 静默、哨兵面未知降级 advisory、--allow-batch-tick 逃生门留痕）；观测旁路事件格式漂移 → detectBatchCheckCadence 解析失配按无证据静默（既有 fail-open）。弃案：逐 task 证据时刻配对（勾选拍与提交拍顺序核验）——git 提交时序与文件编辑时序不可严格配对（一提交多 token 是规范形态），误伤面大；单拍跳幅是唯一机械可靠的一把勾特征。
