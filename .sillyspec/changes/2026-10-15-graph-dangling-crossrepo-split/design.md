---
author: flow-machine-draft
created_at: 2026-10-15T01:48:23.560Z
---
# 设计记录（Design Record）— 2026-10-15-graph-dangling-crossrepo-split

## 做法概述

效果评估实证：knowledge graph dangling 主计数 2537 条中 2447 为跨仓强边注记（backend/frontend/sillyhub 等顶级目录本仓不存在——知识库集中管理仓、代码分仓存放是本体系常态拓扑），本仓可行动悬空仅 90 条，被噪音淹没；doctor 文案已有跨仓分流（「另有 N 条跨仓目标不点名」）但 summary/CLI 的数字面未分流，健康数字长期失真。修法为口径分流而非删数据：graphSummary 增 breakdown.cross_repo 与顶层 dangling_refs_local 两个附加字段（主计数与守恒口径逐字不动——平台 RPC 直采与 doctor 对账零回归），dangling 子命令增 --local 过滤、跨仓条目〔跨仓注记〕标注与 cross_repo 分流计数。改动集中在 src/knowledge-graph.js 一处单一源（graphDangling 的 crossRepo 判定既有，本变更只做计数分流呈现）。

## 接口契约

- graphSummary（src/knowledge-graph.js）：返回 stats 增 dangling_refs_local（=dangling_refs−cross_repo）与 dangling_refs_breakdown.cross_repo；既有 dangling_refs/strong_anchors/medium_doc_refs 逐字不变（守恒测试钉）。
- knowledge graph summary 子命令：summary 文本第二行增「（本仓 X · 跨仓注记 Y——目标仓不在本仓，单列不对账）」。
- knowledge graph dangling 子命令：新旗标 --local（只列本仓悬空）；输出 JSON 增 dangling_refs_local 与 cross_repo 两键；跨仓条目 summary 行带〔跨仓注记〕后缀。
- GRAPH_USAGE 用法行同步补 --local 说明。平台侧（graph.py _as_int/_norm_dangling）对附加键前向兼容——字段纯增，无破坏。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：不适用——纯函数对图求值，无事件时序面。
2. 并发写：无写盘（graph 构建与 summary 均只读），并发调用无共享可变态。
3. 切换/生命周期：不适用——无状态；existsFn 注入态（真实 fs vs 测试假态）由参数显式传入，无生命周期残留。
4. 作用域：分流键按图自身 root 判定顶级目录存在性，单 spec 树自洽；平台 RPC 消费同一 JSON 面，附加键跨端透传无串台。

## 风险与死路

最大风险：跨仓口径被误读为「2447 条可以不管」——跨仓锚点在各自仓内有对账价值（决策↔交付文件机器锚），本变更只是不让它们污染本仓健康数字；口径已在 summary 文案与字段注释双处声明「单列不对账」。次风险：平台 GraphDanglingData DTO 若严格校验未知键会拒收——实证安全：平台侧 _norm_dangling 按 _as_int 取已知键、多余键忽略（graph.py:231-240 实证），且 --local 未传时 query.local 键为 undefined 不序列化。放弃方案：①把跨仓强边从 dangling 主计数剔除（破坏 doctor 对账守恒与既有测试钉，且丢对账价值）；②按目标仓建多图（buildKnowledgeGraph 单根假设，重构量大收益小）；③只在 doctor 文案分流（10-09 已做，数字面失真问题依旧）。
