---
author: flow-machine-draft
created_at: 2026-10-08T17:13:03.280Z
---
# 设计记录（Design Record）— 2026-10-09-brainstorm-impact-antirevival

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-graph.js | 新导出 impactFromDecisionsMd（锚点∪模块域键 → graphImpact 可达集）+ 内部 moduleIdsFromDecisionsMd |
| 修改 | src/run/complete.js | 方案步 knowledge-gate 词面命中后并入 impact 可达集（去重/绕 score 门槛/🧭注记渲染/fail-soft） |
| 修改 | test/knowledge-graph.test.mjs | 新增⑫用例（双键命中/NEW: 剥除/未入图跳过/空文本/模块键交付面正例——执行期实测修正原预期） |

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

方案步 knowledge-gate 的 scope 键现状只取 decisions.md「锚点：」——但锚点是 confirmed 状态才必填，方案步的决策条目普遍没写，第四层（scope 遍历召回）实际很少点火。本变更把方案步的防复潮入口升级为 impactFromDecisionsMd：键扩为「锚点：路径 ∪ 模块域：模块 id」（模块域是生成规范文件步 CLI 硬校验的在场字段，NEW: 前缀剥除），逐键跑 graphImpact 闭包（比 scopeRecall 一跳宽：深度 2 + supersedes/module-dep 传递 + change-modules 经变更交付面反查），rejected∪死路可达集并入 gate 回显。选 impact 闭包而非再拓 scopeRecall：图查询面已具备该能力（查询 API 同源复用），且模块键→变更→决策的可达链正是本体 change-modules 强边的设计语义；D-004 纪律不破——键全部来自 CLI 校验字段，不碰自由文本。viaImpact 条目绕过零分不弹门槛与死路同待遇：结构可达即防复潮先验，score 是词面维度与结构维度无关。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新导出 impactFromDecisionsMd(graph, text) → parseDecisionEntries 原生形态条目数组（+viaImpact:true、impactKey:string）。
- complete.js 方案步 --done 回显行为变化：词面零命中但 decisions.md 结构键可达 rejected/死路时，也出现 [knowledge-gate] 警告段（条目带 🧭impact 可达（键：…）注记）；既有词面命中/已回应过滤/零分不弹语义零变化。
- 无端点/命令/文件格式变更；matchKnowledgeHybrid 签名与四层层序零变化（本变更在 gate 消费侧并行并入，不动检索器）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   不适用（无事件面）——helper 是图+文本的纯函数，gate 每次调用即时求值。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   decisions.md 读取与图构建各为进程内只读快照；并发写 decisions.md 由 git/流程纪律承担，本变更不引入共享态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   gate 调用即起即落、fail-soft 包裹（图构建异常静默降级词面面），中断无残留状态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   图锚 specBase（本变更目录），decisions.md 锚同一变更 changeDir——同根双源无串台；NEW: 模块未入图静默跳过不误伤他仓。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：impact 闭包比 scopeRecall 宽（深度 2 + 传递例外 + change-modules 反查），模块域键在热区模块（如 core-engine）上可达条目多——回显前 5 条封顶沿用，但"无关 rejected 挤占席位"的噪音面变大。缓解：已回应不重弹过滤沿用（evidence 回应过即静默）；真实仓实测 9 条可达属合理密度；若实测噪音超标，收窄方向是把 impact 深度对 gate 场景降为 1 或按 impactKey 分组限额——留运行时证据再动。放弃的方案：拓 scopeRecall 吃模块键（模块→文件→决策两跳，丢失 change-modules/supersedes 可达面且要改检索器签名）；解析 --output 提取路径入键（违 D-004 自由文本纪律，弃）。
