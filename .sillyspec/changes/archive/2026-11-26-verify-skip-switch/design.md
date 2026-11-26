---
author: flow-machine-draft
created_at: 2026-11-26T00:16:56.841Z
---
# 设计记录（Design Record）— 2026-11-26-verify-skip-switch

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

只加一个仓级开关，不改阶段壳、不删 26 个消费面。开关键 `verify.mode`（枚举 `full` | `skip`，缺省 `full`），落在 local.yaml 既有 `verify.*` 配置区。

- 读取：新增叶子模块 `src/verify-mode.js`，导出 `readVerifyMode(specBase)` 与纯判定 `shouldSkipVerify({ specBase, stageName })`，复用仓内既有 local.yaml 解析工具，fail-soft：读不到/值非法一律按 `full`。
- 跳过：`src/run/stage.js` 的 `runStage` 在阶段转换校验通过后、渲染步骤前判断——`verify` 阶段且开关为 `skip` 时，打印一行留痕（跳过原因 + 如何恢复），把 verify 全部步骤与阶段标记 completed 后返回，不渲染任何 prompt，不写任何产物。
- 放行：`src/stage-contract.js` 的 `resolveFactsExpected(changeDir)` 在 skip 档直接返回 `false`（由 changeDir 推导 specBase），使 verify/archive 完成门的 factsExpected fail-closed 按存量兼容口径跳过。
- 路由：`src/run/next.js` 的 `inferChange` 在 skip 档且无 `verify-result.md` 时直接提示 `run archive`，避免状态机一直停在「待验证」。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `local.yaml` 新增键 `verify.mode: full|skip`（可选，缺省 full）。
- 新增导出：`readVerifyMode(specBase): 'full'|'skip'`、`shouldSkipVerify({ specBase, stageName }): boolean`。
- 行为变化：仅当 `verify.mode: skip` 时，`run verify` 短路为「打印留痕 + 阶段完成」；缺省路径不新增任何输出。
- `resolveFactsExpected(changeDir)` 签名不变，skip 档返回值由「isIrStrictVerifyChange || facts 在场」改为 `false`。
- `sillyspec next` 在 skip 档对「task 全勾、无 verify-result」的变更给 `run archive` 而非 `run verify`。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | src/verify-mode.js | 开关读取与纯判定（叶子模块，不反向依赖） |
| 修改 | src/config-schema.js | 注册 verify.mode 键与说明 |
| 修改 | src/run/stage.js | verify 阶段 skip 短路（留痕 + 阶段完成） |
| 修改 | src/stage-contract.js | resolveFactsExpected 尊重 skip |
| 修改 | src/run/next.js | 推断路由尊重 skip |
| 新增 | test/verify-skip-mode.test.mjs | skip/full 两态单测 |

本仓实际生效需仓主在 `.sillyspec/local.yaml`（gitignored）自行加 `verify: { mode: skip }`，不随变更提交。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。开关是静态本地文件，无事件流；阶段顺序仍由 `checkTransition` 校验，skip 不绕过 execute→verify 的顺序约束。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

短路只写本变更进度，ProgressManager 的既有并发约束不变；不触碰他变更目录与全局状态。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。full→skip 时已存在的 `verify-result.md`/`verify-facts.json` 保留，但 `resolveFactsExpected` 在 skip 档强制 false（忽略在场事实，按无事实面归档）；skip→full 时已 completed 的 verify 不自动重跑，需 `run verify --reopen`，文档明示；短路写进度失败则阶段未 completed，重跑幂等。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。local.yaml 为仓级 gitignored 配置，多仓/多实例各自独立；CLI 按项目规则在主仓根执行，specBase 与配置同源，不跨仓串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

- 最大风险：`skip` 变成永久逃逸阀，语义核验彻底消失。缓解：缺省 full、每次跳过打印留痕、文档标注恢复方式；删壳与 26 消费面迁移属另案，不在本变更范围。
- 试过并放弃：复用 `test_strategy: skip` —— 该键只跳测试执行、不跳阶段，语义混淆，放弃；在每个 gate 里加 skip 分支 —— 分散易漏，改为 `resolveFactsExpected` 单点收口。
- 不做：删除 `src/stages/verify.js`、改 `execute → archive` 直连、迁移 `verify-result` 的 26 个消费面——均为后续删壳变更的交付面。
