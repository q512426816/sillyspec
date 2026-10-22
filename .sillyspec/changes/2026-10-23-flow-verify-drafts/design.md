---
author: flow-machine-draft
created_at: 2026-10-22T16:53:52.765Z
---
# 设计记录（Design Record）— 2026-10-23-flow-verify-drafts

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

新增只读子命令 `flow verify-drafts`，复用 flow approve 批准门的 spec 面完整性校验（verifyFlowDrafts `repair:false` 双轨：v2 文档↔锚对比 / v1 指纹+空槽兜底）。批准门校验块（cmdFlowApprove 内）抽为共享单一源 `computeSpecFaceChecks`（纯计算零打印），approve 与 verify-drafts 同源消费——approve 的输出文案与退出码逐字保持，既有 approve 测试零改动作回归锚。不独立实现第二份校验——两路判定必然漂移，与仓内单一源惯例（designSectionsFilled 上移先例）冲突。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新增 CLI 子命令：`sillyspec flow verify-drafts --change <名> [--json] [--runtime-root <路径>]`。退出码：通过 0 / violations 1 / 用法错与变更缺失 2。`--json` 单对象 `{change, applicable, schema, violations, advisories, skipDesign, degraded, v1EmptySlots, passed}`。src/flow.js 新增 `cmdFlowVerifyDrafts`（导出）与 `computeSpecFaceChecks`（模块内共享私有函数）；src/flow-draft.js 零改动。flow 无参用法行与 flow start 横幅断点① 各增指引文本。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立：校验读调用时点盘面快照，无事件序依赖；与 approve/done 各自独立调用，结论随时点失效——本命令是时点自查不是持续保证（通过≠批准，输出文案明示下一步是请批准）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

全程零写盘（repair:false + 不落 flow-state、不 mark 子步），与并行会话起草写盘的最坏竞争=读到中间态多报一条 violation，重跑即收敛；不产生写写冲突。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全：无状态副作用，任意时点中断即退出；exit 1 不留半态（无 spec_approved、无子步标记）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不串台：draft-ledger 是机本位（.runtime）——跨机/存量变更 ledger 缺失时 degraded 为 true 如实降级（v1 AGENT 槽兜底仍跑），与 approve 降级语义同源同文案口径；`--runtime-root` 与平台 spec 根解析走 flow 族既有同轨。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：抽共享源时 approve 行为漂移——对策：approve 输出文案与退出码逐字保持，approve-channel-attest / approve-gate-tick 既有套件零改动全绿作回归锚。放弃方案：①独立实现一份「轻量校验」（两路判定必然漂移，弃）；②把 violations 明细塞进 flow status 恢复简报（status 是自愿查看面，塞校验输出令恢复简报膨胀——与 protocol-tax 输出瘦身方向相反，弃）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/flow.js | 抽 computeSpecFaceChecks 共享源；新增 cmdFlowVerifyDrafts + 子命令分发 + 用法行 + 横幅断点①自查指引行 |
| 增 | test/flow-verify-drafts.test.mjs | 新命令测试（exit 码/零写盘/json 双态/missing/横幅指引行） |
