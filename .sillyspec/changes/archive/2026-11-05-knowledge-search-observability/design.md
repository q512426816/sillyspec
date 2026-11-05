---
author: flow-machine-draft
created_at: 2026-11-04T23:19:09.911Z
---
# 设计记录（Design Record）— 2026-11-05-knowledge-search-observability

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三子代理交叉分析（2026-11-05）定档的第一批改进：观测补盲（channel 记录、零命中落盘、search 面遥测、测试污染隔离）+ 两处廉价质量收口（向量去重、真实分透出）+ 一处预算修正（超时 env 化）。全部落在 CLI 消费端（sillyspec 仓）——遵循「平台只做语义召回，策略面本地解析」架构原则（噪音地板留第二批、英文词表与换模型按触发条件缓办，见变更 proposal）。遥测复用 knowledge-hits.js 底座（appendKnowledgeHit 透传任意字段、平台直报 best-effort 现成），零新存储面：channel/zeroHit 是 inject 记录新字段、search 是新 type，stats 按 type 严格过滤故零回归。

去重与分数透出都在 buildResultFromPlatform 单点实现（跨文件重复根因=平台 parse_decision_entries 无跨文件去重，CLI 端修是唯一不碰平台契约的位置；平台侧语料重复本身是 epoch 迁移遗留，治理另案）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/knowledge-vector.js`：
  - 新增导出 `resolveVectorTimeoutMs()`（缺省 5000；env `SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS` 正整数覆盖；非法回落）；`platformVectorRecall` 缺省 timeoutMs 改由它解析（显式传参优先级不变）。
  - 新增导出 `resultChannel(result)` → 'routing'|'vector'|'fallback'|'scope'（json.fallback→fallback、json.vector→vector、json.scope→scope、缺省 routing；与 stages/knowledge.js buildSearchMatches 通道判定同口径单源化）。
  - `buildResultFromPlatform`：decisionHits 按 `(id, change||'')` 去重保 score 最高（排序/截断前）；文件级 entries 增挂 `vectorScore`（该文件命中最高分）。
- `src/stages/knowledge.js`：`buildSearchMatches` 对 channel=vector 且 entry.vectorScore 为数字的条目 score=vectorScore（其余通道口径不变）；`cmdSearch` 末尾 fail-soft 落 `type:'search'` 遥测（query/matched/channel/entry_count/matchedFiles 帽 12）到 `dirname(knowledgeDir)/.runtime`。
- `src/flow.js`（thin-start 遥测点）：inject 记录增 `channel`；真零命中（matched=false 且 rejected/scope 皆空）落 `zeroHit:true, matchedFiles:[]` 记录——原「仅命中面非空才落盘」门改为双分支全落。
- `src/stages/execute.js`（execute 遥测点）：inject 记录增 `channel`。
- `test/knowledge-inject-ranking.test.mjs`、`test/knowledge-gate-denoise.test.mjs`：真实仓 specBase 用例改 tmpdir 隔离。
- 遥测 JSONL 格式：inject 记录新增可选字段 `channel`/`zeroHit`（既有读者不识别则忽略）；新增 type='search' 记录（stats 按 type 过滤不进既有视图）。
- CLI 用户可见行为：knowledge search 向量命中 score 从恒 0 变真实余弦分；其余输出面零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   成立。遥测是 append-only 事件流，channel/zeroHit 为单事件字段无跨事件顺序依赖；去重发生在单次请求的 decisionHits 数组内（同批内比较），与到达序无关；resultChannel 只读当次结果对象。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   hits.jsonl 并发 append 是既有形态（appendFileSync 行原子性 + 读取端坏行容忍 R-04），本变更不新增并发写者（每个命令进程仍单点写自己的事件）。resolveVectorTimeoutMs 每次调用重读 env（无缓存），进程内无共享可变态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   安全。所有遥测写入 fail-soft（try/catch 包裹，失败不影响主流程——既有 R-04 纪律延续）；search 遥测在 output() 前落盘，进程中断最坏丢一条事件无状态残留；去重/分数是纯函数变换无持久态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   不会。遥测 runtimeDir 由各自 specBase 派生（仓隔离既有形态）；测试隔离修复正是消除「测试写真实仓遥测」的串台面（tmpdir specBase 自带独立 .runtime）；env 超时键是进程级配置无跨仓副作用。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：零命中落盘改变 hits.jsonl 事件量纲（从「仅命中」到「全事件」），下游若有按行数趋势做告警的面会看到注入量跳变——检查过 stats 消费面按 type/matchedFiles 聚合不受影响，但平台端 hits 面板若按行计数会看到增长（这是补盲的正确方向而非回归，发布说明留痕）。次风险：vectorScore 与既有 keywords 计数分纲不同（0-1 浮点 vs 整数命中数）在同一 score 字段并存——eval/knowledge 若断言 score 整数性需核（实现时跑 eval 基线确认）。

死路：①平台侧修语料跨文件重复（parse_decision_entries 去重）——放弃：动平台契约需重新部署，且 epoch 遗留重复是语料治理问题（蒸馏侧收敛另案），CLI 消费端去重即刻生效且可测；②channel 判定内联到各写入点——放弃：三写入点口径漂移风险，单源 resultChannel 导出；③零命中遥测加独立 type='zero-hit'——放弃：stats/daemon 上行通道按 type 路由的面要逐一适配，沿用 type=inject + zeroHit 标记兼容性最好。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-vector.js | resolveVectorTimeoutMs/resultChannel 导出；buildResultFromPlatform 去重+vectorScore |
| 修改 | src/stages/knowledge.js | buildSearchMatches vector 通道真实分；cmdSearch 落 type=search 遥测 |
| 修改 | src/flow.js | thin-start inject 增 channel + 零命中落盘 |
| 修改 | src/stages/execute.js | execute inject 增 channel |
| 修改 | test/knowledge-inject-ranking.test.mjs | 真实仓 specBase 用例 tmpdir 隔离 |
| 修改 | test/knowledge-gate-denoise.test.mjs | 真实仓 specBase 用例 tmpdir 隔离 |
| 新增 | test/knowledge-vector-observability.test.mjs | FR-01~05 用例（timeout 三分支/去重/分数透出/channel/零命中/search 遥测） |
