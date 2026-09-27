---
author: flow-machine-draft
created_at: 2026-09-27T09:01:58.457Z
---
# 设计记录（Design Record）— 2026-09-27-confirm-on-use

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-confirm-on-use 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三层治理①层（消费时确认）：readActiveFrDigest 条目附 unconfirmed 计数（readEntryUnconfirmed 数绑定块内 confirmed_by≠agent 的 - row: 块，行块边界=下一 row:/节头）；flowKnowledgeDigest 注入面对未确认条目打 ⚪N未确认绑定 标记 + 追加抽查确认提示（至多点名 2 个 anchor，带 tests confirm 指引与「不符留给 digest 信号」出路）；CLI tests --confirm --anchor <FR id> --evidence <真实测试路径>：证据经 resolveTestFileRel（锚剥离单源）机械校验后，条目全部 candidate 机器行翻 active（confirmed_by=agent, confirmed_at=HEAD，upsertFrBindingsRaw 权威重写+projectRoot 归一），幂等（全 active 提示不写盘）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-confirm-on-use 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
readActiveFrDigest 返回条目新增 unconfirmed: number 字段（additive，既有消费方不受影响）；CLI 新子命令形态 sillyspec tests --confirm --anchor FR-<域>-NNN --evidence <路径>（exit 1：证据不可解析/anchor 无 FR 前缀/无绑定行）；注入摘要新增两行形态（⚪标记拼在条目行尾、抽查确认独立行）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-confirm-on-use 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
乱序：翻牌是整条目行集权威重写（幂等键=行集），并发读注入零冲突。并发写：--confirm 与归档提升同条目并发时 writeAtomicSync 原子性保最后一写者，行集同源（readFrBindings 全行读改写）不丢行。切换：幂等重跑安全；confirm 不依赖会话状态。作用域：evidence 锚 effDir（CLI 运行仓根）——跨仓证据拒绝（解析失败即拒）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-27-confirm-on-use 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险：橡皮图章——agent 全点确认。缓解三层：抽查式（注入至多点名 2 条）、证据机械校验（必须盘上真实测试文件，口头相符不收）、confirm 只翻绑定状态不改内容（错翻的代价=绑定行显示 active，门禁消费 candidate/active 无行为差异——宁多跑语义不变，长期准确性靠 digest 坏绑定卡兜）。次风险：upsertFrBindingsRaw 不走 agent 行保护（权威重写）——但行集来自 readFrBindings 全行读（含 agent 行原样回写），只改 confirmed_by/state 两字段，无删除面。放弃方案：FR 条目级 confirmed 状态（新机器字段）——绑定状态机已够用，条目级标题/域问题归 digest 信号与人工裁决，不为此发明第二套状态。
