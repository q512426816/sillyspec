---
author: flow-machine-draft
created_at: 2026-09-25T12:39:47.186Z
---
# 设计记录（Design Record）— 2026-09-25-fr-unmapped-repair

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-unmapped-repair 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
一次性数据修复+写入路径钉：7 条幽灵条目（80355e9b 外部合回切割损伤、非本仓 distill 所写——renderFrLines:309 写入侧必然产出节头）按全文锚点从在场归档恢复标题、补 FR-unmapped-714~720 接续节头；测试钉证明 indexRequirements 产出经 splitKnowledgeSections 解析 preamble 零孤立字段行——本仓写入路径不可能产出幽灵，同类损伤只能来自人工合回（机器不防人工操作面）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-unmapped-repair 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
零代码改动。数据面：unmapped.md 补 7 个节头行（id 714-720，标题从归档 requirements ### FR-NN 恢复）。测试面：test/fr-unmapped-repair.test.mjs 两用例（写入路径钉+修复数据钉）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-unmapped-repair 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用——一次性补行。2. 并发：unmapped.md 是共享域文件，修复时点为独占窗口（工作树无他侧对该文件改动）；写入整文件替换（node 脚本），与 CLI 侧 writeAtomicSync 口径差异接受（一次性治理、收口前 git 审查面可见）。3. 切换：修复幂等（重跑脚本会对非幽灵行零插入——判定条件「前一非空行非 ## 节头」修复后不再成立）。4. 作用域：仅本仓 unmapped.md；新 id 714-720 接续在场最大号 713，无跨域号冲突。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-unmapped-repair 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=幽灵块边界误判（把有节头条目的续行错判为幽灵）——判定条件要求「前一非空行非 ## 节头」且行首为「变更：」，字段行只出现在条目段内，误判面为零（实证插入 7 节全部对准）。死路：重跑 distill 重建——幂等键=「变更：」字段命中即 no-op，幽灵块挡不住 no-op 判定（正是它们当年存活的原因），弃；必须显式补节头。
