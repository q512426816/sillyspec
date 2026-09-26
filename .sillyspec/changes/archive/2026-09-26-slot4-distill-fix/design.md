---
author: flow-machine-draft
created_at: 2026-09-26T01:07:12.251Z
---
# 设计记录（Design Record）— 2026-09-26-slot4-distill-fix

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-slot4-distill-fix 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三重格式断链修复（用户核验暴露）：槽4 收割器（harvestSlot4Decision）产出的条目缺「- 类型：」「- 状态：」字段行且正文用非白名单标签「- 决策：」，而蒸馏链入选要 type∈七类白名单 ∧ status∈{confirmed|accepted|rejected}、字段解析只认  列表行、落盘「理由：」行取 entry.answer（answer|答案 标签）——三处不匹配叠加致收割条目永不入选且即便入选正文丢失。修：收割模板补  + （槽4 是定案流程取舍）+ 正文改 。附带：thin-agent-tasks 的枚举教训按新格式重放蒸馏补录进 knowledge/decisions/unmapped.md + INDEX 路由（一次性治理）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-slot4-distill-fix 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-parity.js harvestSlot4Decision 模板三行改动（类型/状态/答案标签）；测试 test/slot4-distill-fix.test.mjs 两用例（收割→蒸馏全链入选落盘+无状态旧格式不入选回归）。行为变化：此后所有轻量变更的槽4 收割决策真实进 knowledge（此前全部只留档归档）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-slot4-distill-fix 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：收割在 distill 子步内序执行（收割→蒸馏同链），无时序窗口。2. 并发：knowledge 写盘沿 distillIntoKnowledge 既有单写入方幂等（同 ID 同版本重写不重复）。3. 切换：补录动作幂等可重跑；断链历史条目（已归档各变更的槽4 决策）不回溯批量补录——按需逐条治理（本变更只补录 thin-agent-tasks 一条作为验证样本）。4. 作用域：harvest 不覆盖已存在 decisions.md（agent 手写决策文件优先级不变）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-slot4-distill-fix 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=补录样本的域路由落 unmapped（治理类变更无模块域）——接受：unmapped 域已有 INDEX 路由行兜底，教训按关键词可命中（三组关键词实测命中）；后续若 unmapped 治理可迁移。死路：回溯批量补录全部历史断链条目——归档件是冻结审计面不回写，历史教训按需逐条重放（幂等），弃。
