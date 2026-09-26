---
author: flow-machine-draft
created_at: 2026-09-26T00:34:45.765Z
---
# 设计记录（Design Record）— 2026-09-26-thin-workunits

> 四节的「问题」是机器段（指纹保护，勿改）；你的回答写在每节问题下方的 AGENT 槽里。
> 每节至少一行——小改动可写「不适用：<理由>」；flow done 空槽拒收。

## 做法概述
<!-- MACHINE-DRAFT:design-approach:4fa550e9aac26c5f5a3c89b853d9af0ad0749943358808fbc1196064a42c1173:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-workunits 留痕重锚 -->
本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。
<!-- MACHINE-DRAFT:design-approach:end -->

<!--AGENT:槽1 做法概述作答——例外裁决书写面（机器段之外合法） -->
R18 实证驱动：thin 的 tasks.md 是验收标准逐条镜像（R18-thin 15 条），勾选语义错配（标准的满足判定时刻只在收口）导致一把全勾/进度失真/哨兵证据弱/粒度税。修法（用户拍板，对齐 OpenSpec 工作分解逻辑、保留 thin 机器起草哲学）：groupCriteriaToUnits——>5 条标准按域关键词（后端/前端/端到端/文档四桶+未命中并入实现与收口）聚类为工作单元，每单元行内标注覆盖标准号与摘要（验收锚可追）；≤5 条不聚类（小变更零变化）；draftTasks 渲染单元行；简报与 advisory 勾选纪律文案同步为单元语义（完成一个工作单元=该域实现+测试绿即勾）。

## 接口契约
<!-- MACHINE-DRAFT:design-contract:86ee80e3cad9ae1c299a0c54bf5503a112d318bb2e5490a32fcd5c1724293a0b:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-workunits 留痕重锚 -->
动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？
<!-- MACHINE-DRAFT:design-contract:end -->

<!--AGENT:槽2 接口契约作答——例外裁决书写面（机器段之外合法） -->
flow-draft.js：导出 groupCriteriaToUnits + WORK_UNIT_BUCKETS 常量 + draftTasks 单元渲染（task-NN: <域>——<摘要>等（覆盖标准 i,j,k），行经 clipTaskText）；flow.js：fresh/adopt 简报与 done advisory 三处勾选纪律文案更新。哨兵/指纹/requirements FR 面/测试绑定槽零改动（向下兼容：在途变更的逐条式 tasks 照常收口——本变更自身的 tasks.md 即旧形态实证）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）
<!-- MACHINE-DRAFT:design-boundaries:98046ccf043ed9302175b492d297f70dfd943c39f2e8770e8a6039ea302cbb6a:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-workunits 留痕重锚 -->
1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
<!-- MACHINE-DRAFT:design-boundaries:end -->

<!--AGENT:槽3 盲维四问作答——例外裁决书写面（机器段之外合法） -->
1. 乱序：聚类是起草时点纯函数（标准列表→单元），无状态。2. 并发：纯函数零共享。3. 切换：幂等补起草不重写已存在 tasks.md（在途变更保持旧形态收口——向下兼容路径本变更自身实证）。4. 作用域：只改 thin 默认道 checkbox 面；thick 任务卡（draftTaskCards）不动（厚道任务卡本就是工作分解语义）；withTasks 时 tasks.md 亦为单元形态（对 thick 无害，任务卡才是其主面）。

## 风险与死路
<!-- MACHINE-DRAFT:design-risks:03ff22f024c81093b38d2bb78b9d095acf5be70d5c09b17c10da44e4655ddb72:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-26-thin-workunits 留痕重锚 -->
本方案最大的风险是什么？试过但放弃的方案及放弃理由？
<!-- MACHINE-DRAFT:design-risks:end -->

<!--AGENT:槽4 风险与死路作答——例外裁决书写面（机器段之外合法） -->
最大风险=聚类桶判错域（关键词误命中把前端标准并进后端单元）——误并只影响勾选粒度不影响验收（FR 区/绑定槽仍是标准完整形态，收口对账按 FR）；摘要截断丢关键词——单元行带覆盖标准号可回查 requirements 全文。狗粮新发现（不扩面记录）：本变更自身 tasks.md 暴露复合拆分（splitCompoundCriteria）会把标准内的「；」枚举词表劈碎（task-01~05 实证）——与续行合并同族的机械切分问题，留独立变更。死路：让 agent 自由起草任务面（OS 式）——破 thin 机器起草哲学与 2 调用协议（多一轮交互），弃；死路：单元内嵌完整标准子列表——每轮上下文税回到 15 行级，弃（行内覆盖号+摘要已够回查）。
