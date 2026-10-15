---
author: flow-machine-draft
created_at: 2026-10-15T01:14:51.640Z
---
# 设计记录（Design Record）— 2026-10-15-thin-inject-telemetry

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

效果评估实证：轻量道 flow start 的知识注入面（src/flow.js flowKnowledgeDigest）只渲染「📚 知识命中」行、不落遥测——thin 道常态化后 .runtime/knowledge-hits.jsonl 的 inject 事件流断流（本仓 10-09 后归零，窗口内 72 次全部来自厚道 execute 与 quick step1 两个旧注入点），knowledge stats 的「从未命中 30 文件疑似死重」判定被盲区污染。修法选在注入面原地补一条 appendKnowledgeHit 导线（R-04 fail-soft 先例），不新增注入点、不动匹配器：命中面（entries 或 rejected 防复潮命中）非空才落盘，事件落 specBase/.runtime 与既有消费面同文件同 append 端点。

同时落 A2-lite 分级字段：injectedFiles（正文实际注入的文件——thin 面恒空，因为 thin 只出「按需 Read」行不注正文）与 mentionedFiles（📚 行显式展示给 agent 的 top-3 锚点）分离，为后续「命中→采纳」率度量打地基；rejectedCount 单列防复潮命中数。既有 matchedFiles 字段与口径逐字不变，knowledge-stats 命中矩阵消费面零回归。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/flow.js flowKnowledgeDigest：新增副作用——命中面非空时向 <specBase>/.runtime/knowledge-hits.jsonl append 一条 {type:'inject', change, query, matchedFiles, injectedFiles:[], mentionedFiles:top3, rejectedCount, source:'thin-start', at} 记录；函数签名与返回值 {lines, summary} 不变。source:'thin-start' 为新增注入点标识（既有 execute/quick 事件无 source 字段，knowledge-stats 对未知字段前向兼容——文件头注释既有承诺）。
- knowledge-hits.jsonl 数据模型：新增三个可选字段 injectedFiles/mentionedFiles/rejectedCount（appendKnowledgeHit 透传任意字段，既有 schema 注释「常用字段」列举不受限）。
- 对外 CLI 行为零变化：flow start 输出字节不变（遥测纯副作用）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用——遥测为本地 append-only 单调时钟序，at 时间戳由 appendKnowledgeHit 统一生成，无外部事件乱序面；resume 重复 start 会重复落事件，语义为「agent 再次看到了注入」，与厚道每次 Wave 组装都落事件的既有口径一致。
2. 并发写：多会话并行 start 时同文件 append——appendKnowledgeHit 既有实现为单次 appendFile，行级原子性由 OS append 语义保证（既有三个注入点同款并发面，无新风险）；行损坏由消费端 readKnowledgeHits 跳坏行容忍。
3. 切换/生命周期：fail-soft（R-04）——appendKnowledgeHit 任何异常（.runtime 缺失/只读/ENOTDIR）被 catch 吞掉，注入本体（lines 渲染与返回值）不受影响；③ 用例以 .runtime 为普通文件实证。
4. 作用域：事件落本变更所在 spec 树的 .runtime，不跨仓；daemon hits 上报链（workspace 隔离上传）原样透传新字段，无串台面。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：遥测双写膨胀——thin start 高频重入（每次 start/resume 都落一条）可能推高事件量。评估：单条 <2KB、既有 8698 行量级下不构成问题，且「注入发生了」本就是事实记录；若未来需要去重，消费端按 (change,query,at窗口) 聚合即可，不在本变更范围。放弃的方案：①在 knowledge-stats 读数时反推 thin 命中（无法还原、纯猜测）；②给 thin 面也注入正文再记 injectedFiles（改变注入形态，超出遥测导线范围——thin 面按需 Read 是 2026-09-28-knowledge-inject-ranking 定下的口径）；③同步写 hits 改异步队列（引入落盘时序复杂度，违背 R-04 简单 fail-soft 先例）。
