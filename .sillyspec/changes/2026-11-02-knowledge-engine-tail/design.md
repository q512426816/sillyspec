---
author: flow-machine-draft
created_at: 2026-11-02T08:04:03.235Z
---
# 设计记录（Design Record）— 2026-11-02-knowledge-engine-tail

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

按子代理修正版实现三项引擎收尾：

**FR-01 向量融合对称**：`matchKnowledgeHybrid` 抽 `fuseBaseWithScope(base)` 辅助——scopeFiles 经 `graphPathCandidates` 规整，命中则 `fuseScopeRecall(base, scopeRecall(getKnowledgeGraph(specRoot), files)) || base`，异常 catch 返回 base；路由命中与向量命中两分支共用同一实现（消除「同一 early-return 病只修一半」）。向量路径冷缓存图构建实测 ~7.1s、热缓存 ~45ms，作为接受项写入设计。

**FR-02 遥测 scope 单列**：三处注入点（flow.js 轻量道、run/prompt.js buildKnowledgeInjection、stages/execute.js Wave）统一新增 `scopeMatchedFiles`（只记实际展示子集：scope 否决 rejected/deathPath top3 + scopeEntries top3，按 ref 去重）；`matchedFiles` 保持查询通道语义（entries+routeHits）不变——并入 20 条 scope 决策会让 knowledge-stats 的 neverHit 失真；`mentionedFiles` 按实际展示集合（📚 top3 + 🧭 top3 + scope 否决 top3 + scopeEntries top3 去重）构造。standalone 形态的 scopeEntries 经 entries 已进 matchedFiles，scopeMatchedFiles 侧去重不双记。

**FR-03 图卫生**：`sectionFilePaths` 出口过滤「路径必须含 `/`」（纯词法规则——存在性判断会让图依赖构建时文件系统状态、破坏缓存确定性）；只改 section 级，模块卡/scan 采集不动；`GRAPH_CACHE_VERSION` 3→4（构建输出变化必须失效旧缓存）；删除 `scopeRecall` 的 `frCount` 字段与 `frs` 收集循环（恒 0、无消费方），注释改为「FR 召回由域路由 digest 承载」；`getKnowledgeGraph` memo 只加注记（standalone 分支不统一——同进程陈旧图有实测，`buildKnowledgeGraph` 指纹缓存与 memo 热路径并存是合理分工）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `matchKnowledgeHybrid`：内部抽 `fuseBaseWithScope`；向量命中路径新增融合（行为变化）；结果可能新增 `scopeDecisionHits/scopeEntries/scopeFused` 与路由路径同构。
- 三个注入点的遥测记录：新增 `scopeMatchedFiles` 字段（加法）；`matchedFiles`/`mentionedFiles` 语义按上文调整（mentionedFiles 从 matchedFiles.slice 改为展示集合构造）。
- `scopeRecall`：返回结构删除 `frCount`（无消费方）；注释诚实化。
- `buildKnowledgeGraph`：section doc-refs 边过滤裸名词；缓存版本 4（旧缓存失效重建）。
- 无 CLI flag/命令变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。融合/遥测/过滤均为确定性纯处理；展示集合构造按固定 top-k 顺序，无时序依赖。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

只读检索；遥测 append 沿既有单行 JSONL 追加（既有并发容忍）。无新增写点。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。遥测新增字段为加法；缓存版本升 4 强制重建（一次冷启动成本已列为接受项）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。各函数以传入 indexDir/specRoot 为界；向量路径的 scope 键由各消费面机器键派生。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

**风险**：① 向量路径融合新增冷缓存图构建（~7.1s 首次）——接受项，写明；② 遥测口径变化影响 knowledge-stats 历史解读——文档同步 + neverHit 语义不变（仍按查询通道）；③ section doc-refs 过滤减少边数（预期降幅写入设计），scope 对手工条目的召回面收窄——只影响裸名词引用，可接受。

**放弃的方案**：① 遥测把 scope 全部并入 matchedFiles——20 条 scope 决策会让 neverHit 失真（每次 flow start 反复计命中）；② 统一 standalone 到 getKnowledgeGraph——同进程陈旧图有实测（先 get 后改知识再 get 仍返回旧图），收益仅省 45ms；③ doc-refs 过滤用「盘上存在」——图会依赖构建时文件系统状态、缓存指纹不覆盖目标存在性；④ frCount 改注释保留——死字段继续误导，直接删除。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-vector.js | fuseBaseWithScope 公共辅助 + 向量分支融合 |
| 修改 | src/knowledge-graph.js | sectionFilePaths 含 / 过滤、缓存版本 4、删 frCount/frs、memo 注记 |
| 修改 | src/flow.js | 遥测 scopeMatchedFiles + mentionedFiles 展示集合 |
| 修改 | src/run/prompt.js | 同款遥测口径 |
| 修改 | src/stages/execute.js | 同款遥测口径 |
| 修改 | src/knowledge-stats.js | scope 单列口径文档注记 |
| 修改 | test/knowledge-fusion.test.mjs | 向量融合用例 |
| 修改 | test/thin-inject-telemetry.test.mjs | scopeMatchedFiles 两形态断言 |
| 修改 | test/knowledge-graph.test.mjs | doc-refs 过滤正反例 + frCount 删除适配 |
| 修改 | eval/knowledge/README.md | 数据规划注记（flow 形态带 scope + fusion 升主刻度 + 非标题复述查询） |
