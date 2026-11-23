---
author: flow-machine-draft
created_at: 2026-11-23T15:58:38.796Z
---
# 设计记录（Design Record）— 2026-11-23-release-33410

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

纯文档 + 版本面发版变更，零 src 改动。其一，清偿 2026-11-23-probe1-bracket-path-blind 的归档 advisory：core-engine.md 追加探针 1 行为变更节（该探针属 core-engine 模块，行为已变必须留档）；`_module-map.yaml` 的 core-engine.paths 补登 `test/verify-probes*.test.mjs` 同族 7 文件（与既有 probe7 测试文件同模式，消除 test 目录伪域）。其二，版本面：package.json/package-lock 3.34.9→3.34.10（用户口述 3.32.10 低于当前 3.34.9，npm 拒绝降级，按「最小版本升级」意图取最小补丁位），并同步 quick-retired R5 锚（3.34.8→3.34.10，3.34.9 发版漏同步致该测试当前红，本次顺手修复）。发版走 lint + quick-retired + verify-probes 同族实测 + npm pack dry-run 后 `npm publish`，沿用 3.34.6~3.34.9 同款发布门。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 无 src 改动、无 CLI 行为变化、无 schema 变更。
- 对外可见变化仅 npm 包版本号：3.34.9 → 3.34.10。
- `_module-map.yaml` core-engine.paths 增加 7 个测试文件条目（模块对账数据面，不影响运行时）。
- core-engine.md 追加一节文档（模块文档是后续变更门禁收窄与知识注入的原料）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

   答：纯静态文件与版本号，无时序输入面；npm registry 版本单调递增，3.34.10 未被占用（git log 可证 3.34.9 为最新发版）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

   答：package.json 与模块图为共享仓文件，Edit 前已核对最新态；若并行会话同时发版会撞 npm 版本占用，publish 失败重升即可，不产生半成品。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

   答：版本号与文档均为静态落盘，中断后重跑幂等；npm publish 不可逆但版本号唯一，失败即整体失败（npm 包要么在要么不在，无半发布态）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

   答：仅本仓 package.json 与 spec 侧文档；npm 发布面向公共 registry，以登录账号 qy0604 为准。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：用户口述版本号 3.32.10 与实际当前版本 3.34.9 不符——若机械执行会被 npm 拒绝（版本不可降级）。已按「最小版本升级」意图改为 3.34.10，汇报中显式声明该偏差；若用户确要 3.32.x 系列需另行决策（不可行于同一 package）。

放弃方案 A：按 3.32.10 字面发布——npm 语义化版本不允许降级，必然失败。

放弃方案 B：把 advisory 清偿并入下一个功能变更——advisory 是上一个变更的欠账，混入后续变更会污染其 patch 面，且发版面需要文档就位后才算干净。

## 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | .sillyspec/docs/sillyspec/modules/core-engine.md | 补探针 1 行为变更节 |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | core-engine paths 登记 verify-probes 同族测试 |
| 修改 | package.json | 3.34.9 → 3.34.10 |
| 修改 | package-lock.json | 3.34.9 → 3.34.10 |
| 修改 | test/quick-retired.test.mjs | R5 锚 3.34.8 → 3.34.10 |
