---
author: flow-machine-draft
created_at: 2026-09-25T06:04:13.840Z
---
# 设计记录（Design Record）— 2026-09-25-flow-tick-prototype

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-flow-tick-prototype 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
两缺口四件修：①勾选纪律进 fresh 与 adopt 简报（完成一条勾一条——勾选是收口哨兵证据面）；②changeArtifactPaths 新函数动态扫变更目录产物（.md/.html + prototypes/），adopt 简报列必读清单、原型 HTML 显式点名必看必用、design 承诺优先；③flow status 显示 tasks.md 勾选进度；④flow done 勾选缺失 advisory（有任务全未勾但有提交 → 警告指引不阻断——不勾选是漏账非假勾）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-flow-tick-prototype 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/flow.js：changeArtifactPaths 新函数、adopt 简报重写（必读清单+原型点名+勾选纪律）、fresh 简报加勾选纪律、status 加勾选进度行、tone done 哨兵块加 advisory。test/flow-tick-prototype.test.mjs 三用例。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-flow-tick-prototype 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：输出与只读扫描，无状态变更。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-flow-tick-prototype 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=adopt 必读清单随目录增长可能变长——限定 .md/.html 两类+prototypes 目录，实际变更目录文件数个位数，可接受。死路=把勾选做成阻断门——机器 draft 的任务行与真实工作单元非一一对应（如一条 FR 拆多步），硬拦会逼假勾（正好是哨兵要防的），advisory 是正确力度。
