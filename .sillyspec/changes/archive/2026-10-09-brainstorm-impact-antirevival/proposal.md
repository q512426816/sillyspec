---
author: flow-machine-draft
created_at: 2026-10-08T17:13:03.280Z
---
# 提案书（Proposal）— 2026-10-09-brainstorm-impact-antirevival

## 动机

任务原话转写：brainstorm 方案步 knowledge-gate 防复潮升级：锚点+模块域双结构键吃 graphImpact 可达集。

动机与背景：
2026-10-08-knowledge-graph 给方案步 --done 的 knowledge-gate 接了 scope 遍历召回，但 scope 键只取 decisions.md「锚点：」字段——方案步的决策条目通常还没写锚点（锚点是 confirmed 状态才必填），scope 常空 → 第四层实际不点火，防复潮仍靠词面三层。方案步真正在场的结构键是「模块域：」（CLI 在生成规范文件步硬校验的可选字段、允许 NEW: 前缀）；且 graphImpact 的可达面比 scopeRecall 一跳宽（深度 2 闭包 + supersedes/module-dep 传递 + belongs-module 侧线）。

成功标准：
- knowledge-graph.js 新导出 impactFromDecisionsMd(graph, decisionsMd)：键=锚点：路径 ∪ 模块域：模块 id（剥 NEW: 前缀，未入图跳过）→ 逐键 graphImpact → rejectedReachable 去重合并，条目带 viaImpact 标记（parseDecisionEntries 原生形态，消费方零重解析）
- complete.js 方案步 gate：词面命中（含既有零分不弹过滤）之后并入 impact 可达集——viaImpact 条目绕过 score>0 门槛（结构可达即防复潮先验，与死路同待遇），与词面命中按 file+id+change 去重，过既有已回应不重弹过滤，渲染带 impact 可达注记；图构建 fail-soft
- 测试：⑪ impactFromDecisionsMd 单元面（fixture 锚点+模块域双键命中 rejected 条目 / NEW: 前缀剥除 / 未知模块跳过 / 空文本零返回）+ gate 合并去重路径
- 全量测试与 lint 零回归；D-004 纪律保持（键全部来自 decisions.md 机器校验字段，不解析自由文本）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. knowledge-graph.js 新导出 impactFromDecisionsMd(graph, decisionsMd)：键=锚点：路径 ∪ 模块域：模块 id（剥 NEW: 前缀，未入图跳过）→ 逐键 graphImpact → rejectedReachable 去重合并，条目带 viaImpact 标记（parseDecisionEntries 原生形态，消费方零重解析）
2. complete.js 方案步 gate：词面命中（含既有零分不弹过滤）之后并入 impact 可达集——viaImpact 条目绕过 score>0 门槛（结构可达即防复潮先验，与死路同待遇），与词面命中按 file+id+change 去重，过既有已回应不重弹过滤，渲染带 impact 可达注记；图构建 fail-soft
3. 测试：⑪ impactFromDecisionsMd 单元面（fixture 锚点+模块域双键命中 rejected 条目 / NEW: 前缀剥除 / 未知模块跳过 / 空文本零返回）+ gate 合并去重路径
4. 全量测试与 lint 零回归；D-004 纪律保持（键全部来自 decisions.md 机器校验字段，不解析自由文本）

## 成功标准（可验证）

1. knowledge-graph.js 新导出 impactFromDecisionsMd(graph, decisionsMd)：键=锚点：路径 ∪ 模块域：模块 id（剥 NEW: 前缀，未入图跳过）→ 逐键 graphImpact → rejectedReachable 去重合并，条目带 viaImpact 标记（parseDecisionEntries 原生形态，消费方零重解析）
2. complete.js 方案步 gate：词面命中（含既有零分不弹过滤）之后并入 impact 可达集——viaImpact 条目绕过 score>0 门槛（结构可达即防复潮先验，与死路同待遇），与词面命中按 file+id+change 去重，过既有已回应不重弹过滤，渲染带 impact 可达注记；图构建 fail-soft
3. 测试：⑪ impactFromDecisionsMd 单元面（fixture 锚点+模块域双键命中 rejected 条目 / NEW: 前缀剥除 / 未知模块跳过 / 空文本零返回）+ gate 合并去重路径
4. 全量测试与 lint 零回归；D-004 纪律保持（键全部来自 decisions.md 机器校验字段，不解析自由文本）
