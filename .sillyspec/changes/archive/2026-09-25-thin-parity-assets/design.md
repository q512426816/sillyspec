---
author: flow-machine-draft
created_at: 2026-09-24T17:50:32.021Z
---
# 设计记录（Design Record）— 2026-09-25-thin-parity-assets

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-parity-assets 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
新建 src/flow-parity.js 三件并接线：①reconcileModuleDocs（模块文档同步对账 advisory——交付文件∩模块图命中点名模块与文档路径，代码变而文档未动给强提示；厚道 module-impact 死信门的薄道等价物）挂 patch 子步留档后；②renderVerifyReceipt（人类可读收口回执：结论/基线区间/实测面/评审/绑定行数/冻结 sha）挂 archive 子步归档前；③harvestSlot4Decision（design 槽4 风险与死路实质作答合成 decisions.md，已有不覆盖）挂 distill 子步蒸馏前。另修评审 P2×2：appendTelemetry 单点（失败路径 exit 前落账）+ review 子步续跑 skip 时从留档件回填结论。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-parity-assets 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新增 src/flow-parity.js（reconcileModuleDocs/renderVerifyReceipt/harvestSlot4Decision）；flow.js：committedRaw 保留、patch 后对账打印、gateSummaryText 捕获、review 失败面遥测+回填、distill 收割、archive 回执、遥测单点。模块图登记。无导出面变化（findModuleMapFile 内部化）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-parity-assets 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯同步读盘合成与打印，无时序/共享可变状态；对账与收割均为 best-effort 失败零副作用。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-parity-assets 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=模块对账 advisory 可能被无视（与厚道死信门 blocking 的差别）——薄道哲学先 advisory，无视率进遥测后可升档。死路=把对账做成 blocking——薄道零仪式前提下面板误报会拦死收口，先观察。
