---
author: flow-machine-draft
created_at: 2026-09-25T15:14:34.828Z
---
# 设计记录（Design Record）— 2026-09-25-r17-assets-intake

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-r17-assets-intake 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
纯 doc 入库：R17 报告（SUMMARY 67 行）按 R16 先例格式入 docs/analysis/R17-对撞-三臂轻量完整与openspec-2026-09-25.md（引言补目的/口径/判据）；4 条实验知识（flag 死路类/摘录碎片化/verify 互锁/绿地伪域断流）入 known-issues.md（每条含现象/证据锚点/修复状态指向），INDEX.md 补 4 行路由（关键词可区分，知识命中面可及）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-r17-assets-intake 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
零代码。新增 docs/analysis/R17-*.md 一份；known-issues.md 追加 4 条 🟡 条目；INDEX.md 追加 4 行路由行。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-r17-assets-intake 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用——静态文档。2. 并发：known-issues/INDEX 为共享追加面，本会话独占窗口写入（追加式不覆盖既有行）。3. 切换：一次性写入无中间态。4. 作用域：报告内容来自实验目录 SUMMARY（数据冻结态），缺陷修复状态指向 A+B/C 变更号（尚未落地，状态字段留有更新义务——A+B/C 收口后按需回改状态，可接受滞后）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-r17-assets-intake 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=知识条目的修复状态指向未落地变更（A+B/C 号已预占）——若 A+B/C 变号或拆并，known-issues 状态字段需回改；接受（变更号已在案可追）。死路：把 7 项缺陷全记流水账——只记 4 条有跨会话复利价值的类知识（实例与修复细节在 R17 报告），避免 known-issues 膨胀为变更日志。
