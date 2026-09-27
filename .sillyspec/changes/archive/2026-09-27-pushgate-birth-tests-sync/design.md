---
author: flow-machine-draft
created_at: 2026-09-27T15:23:27.784Z
---
# 设计记录（Design Record）— 2026-09-27-pushgate-birth-tests-sync

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-birth-tests-sync 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
两个测试文件按 eb3b4bce 已声明的设计语义同步（出生未入门态=brainstorm 仍 pending/无 stages 行 等价旧 scan 出生态，主流程直入与归档放行；真在 brainstorm 中守卫不变）：stage-contract 转换表把 brainstorm→execute 拆成两行——带 fromStageData:{status:'in-progress'} 的真入门拦截行（保留原跳步防护语义）+ 无 options 的出生未入门放行行；state-machine-guards 用例 1a fixture 补 stages.brainstorm.status='in-progress' 显式入态，使守卫断言（exit 1 + 前置阶段点名 + DB 不推进）继续测到拦截。


## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-birth-tests-sync 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
无接口面——仅测试期望与 fixture 状态构造，src 零改动。


## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-birth-tests-sync 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到：不适用——静态断言与一次性 fixture。
2. 并发写：两测试文件当前不在任何并行会话编辑集（提交前重核 git status）；若撞面以最新态重读再改。
3. 切换/生命周期：不适用——无状态。
4. 作用域：转换语义为本仓全局契约，改动即全仓生效——本变更不改语义只对齐断言，语义正确性由 eb3b4bce 的⑤组 9 断言背书。


## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-pushgate-birth-tests-sync 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：若 eb3b4bce 的放行语义后续被裁决回退（出生态不允许直入主流程），本两处断言需随语义再翻转——留锚在转换表注释。放弃的方案：直接删掉 brainstorm→execute 表行与 1a 用例——被否：删断言等于丢防护面，保留带 fromStageData 的真入门变体才守住「跳步拦截」语义。

