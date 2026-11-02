---
author: flow-machine-draft
created_at: 2026-11-02T15:00:00.000Z
---
# 设计记录（Design Record）— 2026-11-02-series-final-cleanup

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

四处终审修复：① knowledge-match.js 的 deathPath 判定加模板标题排除（底稿特征词与 4A 分层口径一致——process 级流程取舍非真否决，标 deathPath 会占防复潮席位且使 4D 模板清零条件永不可满足）；② AGENTS.md 规则 4 同步模板 metrics/metrics_routes 句（存量红修复——系列前已分歧，模板 2026-10-29 加了指标门句但本地 AGENTS.md 未同步）；③ brainstorm-auto-retire 的 git 命令显式设 maxBuffer 8MB（存量红——git ls-files 输出 1,063KB 超默认 1MB）；④ 4D 推迟决策补录 + parseFlowArchiveEntries 替代注记。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- knowledge-match.js parseDecisionEntries：deathPath 赋值增加模板标题排除条件（行为收紧——模板条目不再进防复潮可达集）。
- AGENTS.md 规则 4：同步模板指标门句（文档一致性修复）。
- brainstorm-auto-retire.test.mjs：maxBuffer 8MB。
- decisions.md D-001：推迟决策补录。
- knowledge-quicklog.js：JSDoc 注记。
- 无 CLI/图谱/检索通道签名变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。deathPath 排除是确定性文本判定；存量红修复无顺序依赖。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

无新增写点。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。行为收紧是减法；文档同步幂等。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。只动本仓。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

**风险**：模板标题排除可能误判「真否决但标题碰巧含'风险与死路'」——排除模式与 4A 分层完全一致（同一组特征词），真否决标题通常含具体方案词而非模板框架词，误判面极小且宁可漏一个防复潮也别让 48 条模板反复霸占席位。

**放弃的方案**：① 从 harvestSlot4Decision 端根治（不产底稿条目）——影响面大（flow-parity 完整链路+大量测试），且底稿条目本身有审计价值（只是不该占防复潮席位）；② 从 distill 端排除（不入 knowledge）——同上，归档件与 knowledge 是两个面。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-match.js | deathPath 判定加模板标题排除 |
| 修改 | AGENTS.md | 规则 4 同步模板指标门句 |
| 修改 | test/brainstorm-auto-retire.test.mjs | maxBuffer 8MB |
| 修改 | src/knowledge-quicklog.js | parseFlowArchiveEntries 替代注记 |
| 修改 | test/knowledge-rank-denoise.test.mjs | 底稿资格门用例 |
