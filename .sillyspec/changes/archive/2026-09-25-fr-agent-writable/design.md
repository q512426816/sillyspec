---
author: flow-machine-draft
created_at: 2026-09-25T04:43:57.048Z
---
# 设计记录（Design Record）— 2026-09-25-fr-agent-writable

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-agent-writable 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
FR 内容从机器指纹段改为 agent 书写面（同 design 槽模式）：draftRequirements 只搭骨架（AGENT:FR区 标记 + 绑定槽 + 参考摘录注释），agent 干活时直接写 FR 不走 amend 不触发 edit_ratio。verifyRequirementBindings 增加 FR 区空白检测（至少一行 ### FR- 开头），HTML 注释跳过（参考摘录里的 FR 行不算 agent 填写）。平台狗粮驱动：机器摘录 FR 太薄是知识复利源头污染，amend 改写被 route_hint:thick 误报打击改善积极性。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-agent-writable 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
src/flow-draft.js：draftRequirements 重写（AGENT 槽+注释参考摘录+绑定槽）、verifyRequirementBindings 加 FR 区检测+注释跳过。测试五文件适配（fillDesignSlots/fillSlots 统一加 FR 填写、旧 ### FR 断言改新格式）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-agent-writable 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
不适用：纯文本结构与检测逻辑，无时序/并发面。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-fr-agent-writable 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=存量在途变更的 requirements.md 是旧格式（机器指纹段）——verifyRequirementBindings 对旧格式仍走原绑定槽检测（FR 区标记不存在时不加 FR 空白项），向后兼容。死路=保留机器指纹段+排除 edit_ratio——绕圈修标不修本（amend 摩擦仍在），agent 直写才是正解。
