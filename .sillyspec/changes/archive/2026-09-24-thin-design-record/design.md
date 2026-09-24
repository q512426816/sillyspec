---
author: flow-machine-draft
created_at: 2026-09-24T15:57:33.603Z
---
# 设计记录（Design Record）— 2026-09-24-thin-design-record

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-24-thin-design-record 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
在 flow-draft.js 新增 draftDesignRecord（四节机器骨架：做法概述/接口契约/边界与并发盲维四问/风险与死路，机器段=指纹保护的固定问题模板）与 verifyDesignRecordFilled（AGENT 槽空槽判定+零槽防绕过）；draftAll 增产 design.md（全档生成）；flow done artifacts 子步在指纹三态校验后追加空槽拒收（「不适用：<理由>」=已答）；flow start 简报加填槽提示。骨架机器生成零 agent 回填轮，问题模板指纹化不可删改——盲维四问每跑必被问。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-24-thin-design-record 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-draft.js 新增导出 draftDesignRecord / verifyDesignRecordFilled（default export 同步扩）；draftAll 返回的 written 增 design.md（顺序 proposal/requirements/design/tasks）；flow.js cmdFlowDone artifacts 子步行为扩展（拒收 exit 1、中断报点与幂等语义不变）。无 CLI 参数/命令面变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-24-thin-design-record 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：纯同步文本解析，无事件序依赖——不适用。
2. 并发写：design.md 由 agent 单写、CLI 只读校验；多会话按 change 名目录隔离。
3. 切换/中断：空槽判定在 artifacts 子步内幂等（substeps 已 done 即 skip），中断重入断点续。
4. 作用域：verifyDesignRecordFilled 只读本 change 目录 design.md，无跨变更/跨工作区读。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-24-thin-design-record 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=blocking 空槽门给零治理负担 S0 任务加一行硬要求（出口「不适用：理由」）——实测三处既有测试夹具需补填槽动作，涟漪已按新契约更新。死路=「S0 档不生成骨架」：档位定价（ceremony-tier 接线）属下一片，本片全档生成保持单一行为面。另实测发现零槽绕过面，已加 slotCount===0 防线。
