---
author: flow-machine-draft
created_at: 2026-09-25T06:04:14.256Z
---
# 设计记录（Design Record）— 2026-09-25-fr-compound-split

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-compound-split 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
extractSuccessCriteria 的节内条目收集路径接入 splitCompoundCriteria：分号恒拆、「／/」仅在非路径形态拆（无扩展名点且不超一处斜杠——src/flow.js、backend/app/x.py 形态完整保留）。FR 区 agent 书写架构下摘录是 agent 直抄的原料，拆后 FR-01 A/FR-02 B/FR-03 C 粒度对齐；编号条目通道（thin-fr-quality）与本拆分串联：编号正文先抽条目再拆合取。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-compound-split 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-draft.js 新增 splitCompoundCriteria（节内收集点调用，无对外导出面）；test/fr-compound-split.test.mjs 新增三面用例。无既有行为变化（无斜杠/分号输入零差异）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-compound-split 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯同步字符串变换，拆分规则为纯函数无状态。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-compound-split 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=斜杠误劈路径导致条目碎片——路径感知双判（扩展名点/多斜杠）已覆盖且用例锁定；剩余边角（无扩展名的多段路径如 src/a/b/c 无点）由多斜杠规则兜。死路=把拆分下沉给 agent 自行处理——摘录原料质量不可控，机器先拆一遍是最低成本防线。
