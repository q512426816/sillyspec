---
author: flow-machine-draft
created_at: 2026-09-28T16:25:52.579Z
---
# 设计记录（Design Record）— 2026-09-29-brainstorm-closure-gates

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-closure-gates 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
六个无主开口全部收口到既有门禁管线（零新通道）：4 条纯 kind 规则＋3 条 custom kind 规则全部声明进 stage-contract-spec.js 的 BRAINSTORM_RULES——renderStageContract 事前契约与 --done 事后门自动同源覆盖，不改任何调用方。引擎新增 literal-none 纯 kind（「不含字面量」判定，服务待确认残留的 must-not-contain）；decision-coverage／doubt-closure／risk-mitigation 三个复杂判定算法留 validateBrainstormOutputs（复用 extractCurrentDecisionIds 与 getRule 同源数据）。severity 全部 warning 不阻断：存量进行中变更零破坏（先例：故障面/退役判据软警告的棘轮模式——观测一个周期误报率后再评估升 error）。判据贯穿始终：开放可以，但每个开口必须能回答「谁、在哪个阶段、以什么证据关掉它」。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-closure-gates 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
对外命令/函数签名零变化。变化面：
- src/stage-contract-engine.js dispatchPure 新增纯 kind `literal-none`（data.literals 任一命中→fail，与 literal-any 互补）
- BRAINSTORM_RULES 新增 7 条规则 id：`brainstorm.proposal.success-criteria`／`brainstorm.{design,proposal,requirements,tasks}.no-placeholder`／`brainstorm.design.pending-confirm-residue`（纯 kind）；`brainstorm.requirements.decision-coverage`／`brainstorm.design.doubt-closure`／`brainstorm.design.risk-mitigation`（custom kind，算法留 validator）
- validateBrainstormOutputs warnings 通道新增 3 类输出（D 覆盖缺口逐条点名／自审存疑未闭合行／风险应对空占位行）
- 消费方自动吃到新规则：brainstorm --done（evaluateRules＋validator）、preflight four-piece-rules（仅 error 入清单——本批全 warning 故零影响）、renderStageContract 事前契约注入
- 匹配口径：D 覆盖复用裸号词边界匹配（D-001 即算引用 D-001@v1，大小写不敏感，与 shared.id-traceability 同语义）

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-closure-gates 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序/迟到到达：全部规则是 --done 时刻对落盘文件的只读判定，无事件序；文件晚写只影响该次判定，重跑 --done 即重判，无状态残留。
2. 并发写：与其他 validator 同构——evaluateRules 读文件是一次性 readFileSync 快照，与他 agent 并行编辑最多导致该次判定用旧快照（warning 级不阻断，下次 --done 重判收敛）；本判定不写任何文件，无锁需求。
3. 切换/生命周期：纯函数判定无中间态；变更 reopen/会话中断不产生半判定状态；规则幂等（同输入同输出）。
4. 作用域：规则 target root=change（本变更目录），change 目录隔离即作用域隔离；平台模式经 resolveChangeDir 解析与现有规则同一口径，无跨变更/跨仓串台面。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-brainstorm-closure-gates 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：warning 噪声——design-init 骨架未编辑完的 design.md（R-01 待填行／决策追踪待确认行）会在 --done 集中亮 2-3 条 warning。这是预期收口行为（骨架=未闭合），文案已逐条给出路；退役判据：观测一个周期——误报为主且 agent 普遍忽略→收窄词表，真阳率主导→升 error。
试过放弃：① error 级阻断——存量 brainstorm 阶段进行中变更会立即撞墙，破坏「存量行为不变」兼容红线，且与故障面软警告先例相悖；② 自审存疑查裸词「自审存疑」——design-init 自审 checklist 模板行含该词必然常驻误报，改为查「自审存疑[:：]」应用形态＋行内闭合 token（D-xxx/R-xx/已解决/已闭合/已确认）判定；③ requirements D 覆盖沿用 shared.id-traceability 通用文案——缺「决策覆盖矩阵补行或标剩余风险」的闭环出路提示，语义丢失，故立独立规则带出路文案。
死路注记核对：知识库 unmapped 域 5 条死路（restrict 空清单传参／回溯补录历史断链／CLI 探测派发能力／CLI 探测 vitest 配置／对账前重建分支）与本方案无交集——本方案不建清单通道、不回溯历史、不探测环境，全部复用既有管线。
