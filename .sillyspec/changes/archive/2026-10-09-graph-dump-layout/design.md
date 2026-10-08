---
author: flow-machine-draft
created_at: 2026-10-08T16:45:36.392Z
---
# 设计记录（Design Record）— 2026-10-09-graph-dump-layout

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

平台仓 fullmap 变更的全图数据源：`src/knowledge-graph.js` 内新增 `layoutFullGraph(graph)` 纯函数（原型 prototype-data-gen.cjs 的 comm() 粗分组 + sunflower 摆位逐行移植，常量固化）与 `cmdKnowledgeGraph` 的 dump case（--layout 必带）。选逐行移植而非重设计：目标就是"原型同款视觉"，等价性由常量逐项同值保证；确定性由稳序 tie-break（簇同数按组名字典序）保证。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

文件清单（自声明）：①`src/knowledge-graph.js`（layoutFullGraph/graphCommunity 导出 + dump case + USAGE）；②`test/knowledge-graph.test.mjs`（⑩用例 + 导入扩展）；③`src/stages/knowledge.js`（注释注记，列表值不变）。新 CLI 面：`sillyspec knowledge graph dump --layout --json` → `{ok, query:{sub,layout:true}, nodes:[{id,type,label,x,y}], edges:[{s,t,type,strength}], stats:summary 同源, summary:[人类可读行]}`；缺 --layout → `{ok:false, error:{code:'layout_required'}}`。既有七子命令零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用——静态 md/yaml 解析派生，无事件流；fail-soft 沿既有解析器。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   不适用——纯只读内存计算不落盘。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   不适用——单次 CLI 调用内存生灭。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不会——按传入 specRoot 构建，天然隔离。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：星系数=150（真图实测）比平台 design 初估 10-15 多——但这就是原型 comm() 的真实分组数（原型视觉即如此），不改算法（改了就不是原型视觉）；平台侧按 150 星系渲染。放弃的方案：①summary 细簇分组——否，883 簇主环 ~8900px 退化散点（Grill F-01）；②坐标落盘缓存——否，违反图不落盘铁律；③与原型逐位等价——降级为非约束（tie-break 稳序差异，确定性才是硬约束）。
