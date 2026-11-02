---
author: flow-machine-draft
created_at: 2026-11-02T16:30:00.000Z
---
# 设计记录（Design Record）— 2026-11-02-slot4-harvest-retire

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

源头下线三处改动：① flow-parity.js 的 harvestSlot4Decision 改为恒返回 {harvested:false}（保留函数签名与导出——flow.js 调用点兼容，anchorBackfillCandidate 纯函数保留因为 decision-distill 端还消费）；② flow.js 摘除收割调用与日志行（整个 try 块删除——不再有调用点）；③ 两个测试文件适配（收割写盘断言改为不写盘断言，anchorBackfill/distill 字段测试保留）。存量 47+ 条底稿不动（底稿资格门已使其行为面无效）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- harvestSlot4Decision：签名不变，行为改为 no-op（恒 {harvested:false, reason}），不写 decisions.md。
- flow.js：收割调用与日志摘除。
- anchorBackfillCandidate：保留导出（decision-distill 消费端不变）。
- 无 CLI/图谱/检索通道签名变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。恒返回无状态、无顺序依赖。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

删写面——本变更减少一个写点，无新增。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。no-op 函数幂等。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。只动本仓 src。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

**风险**：无。纯减法——删一个写点，风险分析内容保留在 design.md 归档件（信息零丢失）。

**放弃的方案**：① 改落非正典文件（如 design-risk.md）——增加维护面且该文件无消费方；② 从 distill 端排除——治标不治本（源还在产）；③ 全删函数——flow.js 调用点需同步删除，保留 no-op 更安全（锚点回填纯函数同文件导出不能删）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow-parity.js | harvestSlot4Decision 改 no-op |
| 修改 | src/flow.js | 摘除收割调用与日志 |
| 修改 | test/slot4-distill-fix.test.mjs | 适配（不写盘断言） |
| 修改 | test/decision-anchor-backfill.test.mjs | 适配（收割端用例改 no-op 验证） |
