---
author: flow-machine-draft
created_at: 2026-10-14T10:36:52.243Z
---
# 设计记录（Design Record）— 2026-10-14-supersedes-mislink-and-change-display

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

两处 P1 修复（四路只读审计裁定，证据见 flow-state input）：
① supersedes 边误连：src/knowledge-graph.js 解析决策「supersedes：」时去掉「同变更优先、再退同文件首个」的回退分支——同变更无目标即不建边。为什么：v2 蒸馏落地时同变更 v1 段已被就地替换，同变更查询必然落空，回退因此几乎必然连到他变更同号条目（审计口径：698 条中 41 条带 supersedes：33 条误连、5 条断链、仅 1 条同变更命中）；边是构建期现算（零缓存落盘，测试①「构建后文件集逐字节不变」既有断言在案），改解析即修全部消费面。图谱级实测（HEAD 老代码副本 vs 修复后，真实知识库）：决策 supersedes 边 **27 条全部为跨变更误连 → 修复后 0**；并清偿一处既有节点顺序依赖——addEdge 要求两端节点在场，目标晚于引用者定义（同文件行序）时边被静默丢弃（27 与审计口径 33 的差额即此），边改为节点面建齐后统一补挂（目标在文件任意位置均可正确建边，测试锁定）。
② 展示面丢变更名：新增共享纯函数 decisionChangeQualifier（src/knowledge-match.js），四处决策展示行（{DECISION_HITS}/轻量道/knowledge-gate/decision-touch）统一渲染「变更 <名>」/「变更未记录」限定；src/docs-debt.js 的 touch 对象补 change 字段（加法）。为什么：同号密度实证（296× D-001@v1、其中 192 条标题完全相同），展示面不带变更名时无法把引用指到具体条目。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/knowledge-graph.js：buildKnowledgeGraph 的 supersedes 边语义变化——跨变更同号不再建边（同变更含双 legacy 同源仍建）；函数签名无变化。
- src/knowledge-match.js：新增命名导出 `decisionChangeQualifier(change) → string`（change 非空 → `变更 <名>`；否则固定 `变更未记录`）。
- 展示行格式（四处统一，| 为全角分隔）：`…（<域文件>｜变更 <名>）`，change 缺失 → `…（<域文件>｜变更未记录）`。
- src/docs-debt.js：computeDecisionTouches 返回的 touch 对象增 `change` 字段（加法，向后兼容）；renderDecisionTouchFacts 用该字段渲染限定词。
- src/docs-check.js：parseDecisionEntries 增「变更：」行读入（加法字段 change: string|null）——docs-debt 触碰事实行的变更名来源；docs-check 规则族判定行为不变。
- CLI/命令/文件格式：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   - 答：supersedes 目标条目缺席（v1 已被 v2 就地替换）时行为=不建边，稳定且幂等；同变更 v1 若迟到补写，下次构建自动建边（构建期现算、无缓存，无漂移）。展示面限定词纯由条目字段决定，与到达顺序无关。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   - 答：图谱构建只读（无缓存文件落盘）；四处展示面均为只读渲染；decisionChangeQualifier 为纯函数。零共享可变状态，并发安全。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   - 答：legacy 条目（无「变更：」行，现存约 20 处）两侧 change='' 判同源仍可建边；旧「来源：」标签不识别属既有行为（不在本单范围），展示面以「变更未记录」如实降级、不编造；中断（未提交）不影响已落盘知识文件。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   - 答：变更名是仓内作用域标识（changes/<名> 同构），知识库按 specBase 物理隔离；跨仓/多实例各自构建图谱，无共享数据面，无串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：去掉回退后，原先靠回退「连上」的 33 条边消失——这是有意的清偿（它们本就错连他变更）；真实取代关系在 v2 条目的「supersedes：」文本与 superseded 承接中仍有记载，图谱边只作强边闭包信号，误连（进 impact/注入面传播错误事实）比缺边危害大。
- 死路（放弃）：保留回退再加启发式过滤（版本更低/标题相似）——33 条误连的目标版本恰低于引用者、标题各异，版本/标题判据都区分不了「同号不同变更」，仍是抽签。
- 死路（放弃）：展示面改渲染全局号（D-<域>-NNN 发号）——属 P3 增量方案（新条目 epoch 发号、老条目零触碰），不在本单范围；本单以「变更名限定词」最小改动达成消歧。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-graph.js | supersedes 去跨变更回退（同变更含双 legacy 限定） |
| 修改 | src/knowledge-match.js | 新增导出 decisionChangeQualifier（四处共用） |
| 修改 | src/run/prompt.js | {DECISION_HITS} 行加变更名限定 |
| 修改 | src/flow.js | 轻量道防复潮行加变更名限定 |
| 修改 | src/run/complete.js | knowledge-gate 回显行加变更名限定 |
| 修改 | src/docs-debt.js | touch 增 change 字段 + 事实行加变更名限定 |
| 修改 | src/docs-check.js | parseDecisionEntries 加法字段 change（「变更：」行读入） |
| 修改 | test/knowledge-graph.test.mjs | ① 断言反转（supersedes 3→2）+ 新增同变更/双 legacy/跨变更用例 |
| 修改 | test/decision-touch.test.mjs | 渲染断言（在场/降级）+ Wave prompt 降级形态断言 |
| 修改 | test/thin-fr-inject-parity.test.mjs | 否决决策行含变更名断言 |
| 修改 | test/design-knowledge-check.test.mjs | knowledge-gate 行降级形态断言 |
| 新增 | test/decision-change-qualifier.test.mjs | helper 单测 + {DECISION_HITS} 接线钉 |
| 修改 | .sillyspec/docs/sillyspec/modules/{core-engine,runtime,cli-entry,docs-consistency}.changelog.md | 模块卡变更索引增量（收口前） |
