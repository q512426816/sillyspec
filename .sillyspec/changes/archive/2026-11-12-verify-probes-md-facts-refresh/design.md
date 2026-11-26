---
author: qinyi
created_at: 2026-11-11T23:46:10.339Z
---
# 设计记录（Design Record）— 2026-11-12-verify-probes-md-facts-refresh

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

改 `src/verify-probes.js` 的 `writeVerifyFacts`（verify-probes 命令的 facts 落盘点）：合并 prev 固化段之后、写盘之前，若变更目录存在 `verify-result.md` 则用本文件既有的三个解析器（parseHandoverRows / parseDbScriptDeclarations / countMatrixPartialRows）重解析并覆盖 `handover` / `dbScriptDeclarations` / `matrixPartialRows` 三段。理由：这三个字段是 verify-result.md 的纯派生（md 是真相源），此前唯一产出入口是 gates verify 收尾的 `backfillFactsFromMdAndTests`，导致 gate 拦截提示「重跑 verify-probes 幂等刷新 facts 即可消解」与实际行为不符（重跑只保留旧段不产新段，2026-11-11-workspace-ia-redesign 实证只能靠 `--done` 回填）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无函数签名/端点/文件格式变化（facts.json 既有字段的取值时机变化）。行为变化：`sillyspec verify-probes --change X [--init]` 落盘时，若 X 的变更目录有 verify-result.md，facts 的 handover/dbScriptDeclarations/matrixPartialRows 三段即时反映 md 当前内容（此前：保留上次值或缺失）。conclusion 段维持现状（解析器 extractVerifyConclusionSlot 在 stage-contract，保持分层单向不引入反向 import）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用——解析只读当下 md 内容，无时序假设；md 后改再重跑即刷新（测试覆盖清空归零场景）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

与既有落盘同风险面——writeVerifyFacts 整体仍是「读 prev → 合并 → 单次 writeFileSync」，无新增窗口；md 与 facts 并发改写的最后写者胜语义与 backfill 路径一致。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全——md 缺失（未 --init）走 catch 跳过不产段，现状零回归（测试覆盖）；中断最坏态是 facts 与 md 暂时不一致，下次任意落盘点收敛。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会——解析锚定本次调用传入的 changeDir，逐变更目录隔离；与 backfill 共用同一组解析器（单一真相，无第二套口径）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：md 在场但内容为半成品（agent 填写中）时，提前把中间态解析进 facts——可接受，md 本身就是 gate 的对照真相源，中间态刷新让 gate 提示更早对齐。放弃的方案：①把 backfillFactsFromMdAndTests 整体搬进命令主路径（它还消费 tests/conclusion，会引入 stage-contract 反向依赖与实测时点耦合）；②gate 拦截时自动代跑 backfill（gate 应保持只读判定层，产数据归命令层）。
