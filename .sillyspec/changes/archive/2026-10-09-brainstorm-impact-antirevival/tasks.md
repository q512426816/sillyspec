---
author: flow-machine-draft
created_at: 2026-10-08T17:13:03.280Z
---
# 任务注册表（Tasks）— 2026-10-09-brainstorm-impact-antirevival

- [x] task-01: knowledge-graph.js 新导出 impactFromDecisionsMd(graph, decisionsMd)：键=锚点：路径 ∪ 模块域：模块 id（剥 NEW: 前缀，未入图跳过）→ 逐键 graphImpact → rejectedReachable 去重合并，条目带 viaImpact 标记（parseDecisionEntries 原生形态，消费方零重解析）
- [x] task-02: complete.js 方案步 gate：词面命中（含既有零分不弹过滤）之后并入 impact 可达集——viaImpact 条目绕过 score>0 门槛（结构可达即防复潮先验，与死路同待遇），与词面命中按 file+id+change 去重，过既有已回应不重弹过滤，渲染带 impact 可达注记；图构建 fail-soft
- [x] task-03: 测试：⑪ impactFromDecisionsMd 单元面（fixture 锚点+模块域双键命中 rejected 条目 / NEW: 前缀剥除 / 未知模块跳过 / 空文本零返回）+ gate 合并去重路径
- [x] task-04: 全量测试与 lint 零回归；D-004 纪律保持（键全部来自 decisions.md 机器校验字段，不解析自由文本）
