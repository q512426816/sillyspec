---
author: flow-machine-draft
created_at: 2026-09-26T09:20:26.199Z
---
# 设计记录（Design Record）— 2026-09-26-governance-autopilot

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-governance-autopilot 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
三条机器推断替代 agent 手工操作（R20 实证 +38 轮全来自治理工件交互的 Edit+12/Read+5/Write+3/Bash+10 均匀分布）：①draftGwtSkeleton——成功标准→Given/When/Then 骨架直接预填 FR 区（agent 可覆盖但无需从零写，消灭空槽冷启动）；②自动勾选——flow done ledger 子步哨兵检查前，解析区间提交 task-NN token 代勾未勾条目（有证据但未勾=漏账，机器代勾零手工）；③自动绑定——flow done artifacts 子步绑定校验前，从 verify-runs/test-result.json 提取实际执行的测试文件路径补全空绑定槽（fail-soft）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-governance-autopilot 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-draft.js：draftGwtSkeleton 纯函数（关键词提取 Given/箭头拆分 When-Then）+ draftRequirements 重写（GWT 骨架预填替代注释参考+空槽；绑定槽语义改「自动补全」）；flow.js：ledger 子步加 auto-tick（_tasksMdPath 防命名冲突）+ artifacts 子步加 auto-bind（verify-runs 读→_testFiles Set→空槽正则注入）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-governance-autopilot 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：GWT 骨架是起草时点纯函数；auto-tick/bind 是 done 时点快照操作。2. 并发：auto-tick 的 writeAtomicSync 原子写；auto-bind fail-soft try/catch。3. 切换：三条均幂等（已有内容不覆盖——tick 只勾未勾的、bind 只填空槽、GWT 只在 draftAll 生成）。4. 作用域：draftRequirements 变更影响所有新起草（旧变更不受影响——redraftMissingArtifacts 已存在的文件不碰）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-governance-autopilot 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=GWT 骨架语义不准（关键词启发式的 Given 可能错域、箭头拆分的 When/Then 可能断错）——骨架标注「可编辑覆盖」，agent 修正错骨架比从零写省力（一次 Edit vs 三次）；索引进 knowledge/fr 的骨架质量依赖 agent 覆盖意愿（不覆盖时入库的是骨架不是精写——比空着不进库好，但不如精写——权衡接受）。死路：完全取消 agent 填写（纯机器 FR 入库）——索引质量退化为机械摘录，知识复利面受损；保留 agent 可覆盖是正确分界。
