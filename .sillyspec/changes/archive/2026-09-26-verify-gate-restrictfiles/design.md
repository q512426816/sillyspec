---
author: flow-machine-draft
created_at: 2026-09-26T01:13:44.373Z
---
# 设计记录（Design Record）— 2026-09-26-verify-gate-restrictfiles

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-verify-gate-restrictfiles 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
两件小修：①gates.js verify 测试对账门的 runVerifyTestCheck 补传 restrictFiles（resolveVerifyChangedFiles includeWorkingTree 口径，与 :1135 lint scope/quick-audit:584 同源）——清偿归档留痕的评审 P2 缺口（变更全提交后 verify --done 同形下 0 命中假 skip=验收侧虚焊）；②verify.js 步骤渲染首部长会话税提示（R18 实证 verify 段轮均 3-4 倍——建议跨阶段会话新开 verify 续跑）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-verify-gate-restrictfiles 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
gates.js verify 门调用点加 _restrict 解析（fail-open：解析异常走全量不传）与条件展开；verify.js 加载规范步 prompt 首部三行提示。零签名变化（runVerifyTestCheck 的 restrictFiles 为既有参数，quick 门在用）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-verify-gate-restrictfiles 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：restrictFiles 是门调用时点快照，测试实测即时消费。2. 并发：resolveVerifyChangedFiles 与 lint scope 同函数同仓读——既有并发语义不变；空清单不传的分支防了「解析失败→restrict 空→假 skip」的反面虚焊。3. 切换：解析 try/catch fail-open 走全量硬门（不降级）。4. 作用域：只影响五阶段 verify 门；quick 门/flow done 实测门口径不动（各自已有收窄）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-verify-gate-restrictfiles 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=restrictFiles 收窄后模块选择漏测（文件面解析错变更文件→选错模块子集）——与 quick 门同函数同风险面，quick 侧长期实证可接受；空清单防御分支保住「宁全量不假 skip」的 fail-closed 底线。死路：空清单也传（restrict []）——正是本变更要修的假 skip 形态的反面制造，弃。
