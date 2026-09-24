---
author: flow-machine-draft
created_at: 2026-09-24T17:20:40.227Z
---
# 设计记录（Design Record）— 2026-09-25-thin-review-slice

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-review-slice 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
新建 src/flow-review.js 三件（classifyReviewNeed 危险证据定档 / renderReviewerTaskbook 评审任务书 / validateReviewJson 三态校验）+ flow.js 接线：SUBSTEPS 增 review 子步（patch 后）——定档不需评则豁免记账，需评且 review.json 缺失则打印任务书 exit 1 断点续，在场则校验（FAIL 或 P1 发现拦截列明细，修复后删件重评）；--review/--no-review 声明一票落 flow-state.review_force；评审结果进 flow-telemetry。定档五路信号：高危交付语义词一票、盲维四问实质作答（作答即信号，不另造问卷）、冻结 diff 危险原语扫描、决策密度 editRatio、声明一票；文件数出局。豁免需多证并举且 1/4 定额抽查采样（确定性哈希桶）。design.md 机器问题模板含语义词字样属模板自污染——扫描面剥 MACHINE-DRAFT 段只看 agent 作答。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-review-slice 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
新增 src/flow-review.js（导出三件+sampleBucket）；flow.js SUBSTEPS 八子步、cmdFlowStart 增 reviewForce 参数与简报预告、cmdFlowDone 增 review 子步与遥测 review 字段；模块图登记 flow-review.js。无既有命令签名变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-review-slice 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：不适用（纯同步文本/文件操作）。2. 并发写：不适用——review.json 由评审子代理单写、CLI 只读校验；change 目录按变更名隔离。3. 切换/中断：评审断点幂等（子步标记 done 后重入 skip），FAIL 后修复重跑不产生半态假绿。4. 作用域：定档只读本变更目录工件与冻结 patch；采样哈希只依赖变更名，无全局状态。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-25-thin-review-slice 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
风险=关键词表有盲区（新型风险词扫不到）+ 自述偏差（四问全答不适用但实际没想到）——兜底是 1/4 抽查采样与遥测回流校准，规则可随数据迭代。死路=按文件数/影响面定档——撞实验 F-02 实证几行小改是 P1、大批量改名无风险，体积代理指标两个方向都误判，已弃。
