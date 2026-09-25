---
author: flow-machine-draft
created_at: 2026-09-25T01:11:36.723Z
---
# 设计记录（Design Record）— 2026-09-25-thin-fr-quality

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-quality 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三件：①extractSuccessCriteria 增编号条目通道——正文「1. …」编号行为条目（与节条目去重）数 ≥3 且多于成功标准节条目时取代之（R16 实证：任务书场景下节条目是总括口号句，编号条目才是行为语义）；adopt/proposal 回提路径经 opts.numberedChannel=false 关闭（proposal 变更范围等节的编号列表会误劫持）。②draftRequirements 的 GWT 模板字面换为需求语义（Given 平台按当前契约运行/When 本变更交付并运行/Then 条目），例外槽提示改写走 flow amend-draft 留痕通道；flow start 简报加 FR 候选改写指引。③reconcileModuleDocs 增未覆盖目录检测：交付目录不在任何模块 paths 下时点名「FR 将落伪域 auto-*」并指路模块图登记（R16 实证：observation 新模块不在图 → FR 落 auto-frontend 伪域）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-quality 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-draft.js（extractSuccessCriteria opts + draftRequirements 字面/槽提示 + redraft 回提关通道）、flow.js（简报两行 + 对账打印条件 rec.lines.length）、flow-parity.js（未覆盖目录检测）、测试三件（⑬ 编号通道四态 + parity ① 地图提示两态 + stage-burst ⑩ 并行改动回归修正）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-quality 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯文本提取与提示输出，无状态无时序面。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-fr-quality 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=编号通道误触发（非需求的编号列表被当 FR）——阈值 ≥3 且多于节条目双条件收窄；adopt 回提侧整路关闭。死路=靠提示词要求用户重排任务书格式——工具该扛住真实输入形态。
