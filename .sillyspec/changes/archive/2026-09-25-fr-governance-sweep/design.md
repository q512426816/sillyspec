---
author: flow-machine-draft
created_at: 2026-09-25T12:27:31.614Z
---
# 设计记录（Design Record）— 2026-09-25-fr-governance-sweep

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-governance-sweep 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
两项治理合并一条：①知识对齐——requirements FR-01 以承接行（承接: FR-runtime-020）声明 flow.mode 缺省 thin 现状，flow done distill 的承接翻链机制（跨全域扫描 target 段、就地补丁翻状态+取代链）自动把与实现相反的旧条目退役；②评审留档四 P3 小修——patchText null/空分径（豁免证据诚实化）、resume 声明通道落盘（三路口径一致）、status 归档精确匹配（目录名恒等）、头注释优先序如实。合并动机：纯知识治理变更交付面为空会致 FR 落伪域，四个 src 小修提供真实交付面（flow.js/flow-review.js→cli-entry 域路由正常）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-governance-sweep 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-review.js classifyReviewNeed ③分径（null→reasons 需评审；空→豁免照旧）+ 头注释补优先序说明；flow.js resume 分支加 review_force 落盘（幂等：null 不覆盖）+ status 归档检测 includes→全等。对外行为变化两处：patch 采集失败的变更不再凭误标证据豁免评审（改判需评审）；--review/--no-review 对在途变更生效。requirements FR-01 的承接行是知识面契约（distill 消费）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-governance-sweep 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用——四修均为同步小改+纯读判定。2. 并发：review_force 落盘走 writeFlowState 既有原子合并（fs-atomic）；status 精确匹配纯读。3. 切换：resume 落盘幂等（null 不覆盖既有声明），中断重入安全；承接翻链由 distill 子步既有幂等保证（同变更重跑零新增零漂移）。4. 作用域：classifyReviewNeed 签名不变（既有消费方零影响）；承接行指向的 FR-runtime-020 在 runtime 域（跨域扫描，本变更新条目落 cli-entry 域不影响翻链）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-governance-sweep 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=承接翻链失败（承接 id typo/解析形态不符）→ distill warnings 收集不阻断归档，旧条目保持 active（知识漂移持续）——收口输出可观测，失败则按 warning 提示修正后重跑。次风险=null 分径收紧后，历史上依赖「patch 失败→豁免」路径的变更将进评审（成本上升、方向正确——fail-closed）。死路：手改 knowledge/fr/runtime.md 翻状态——机器契约文件（勿手改），弃；必须走承接行→distill 翻链的正规通道。
