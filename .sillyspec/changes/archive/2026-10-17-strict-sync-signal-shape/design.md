---
author: flow-machine-draft
created_at: 2026-10-17T06:34:32.358Z
---
# 设计记录（Design Record）— 2026-10-17-strict-sync-signal-shape

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

上一变更归档收尾 dogfood 当场触发强校验 🚨（安全网按设计工作，半态未静默）：raceWithAbort 向 op 传入的是 `{signal}` 形状对象（既有 triggerSync 内联用法 `sync(name, cwd, sig)` 同一形状），triggerSyncTerminalStrict 默认 runSync 误再包一层 `{ signal: sig }`，opts.signal 变套娃对象 → syncSpecTree `AbortSignal.any` 抛 TypeError → 树通道恒假败。修法一行：默认路径原样透传 `syncOpts`（注释钉形状契约），补默认路径回归单测。自救命令已验证收敛上一变更半态（23 文件上行）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `triggerSyncTerminalStrict` 默认 runSync：`(syncOpts) => syncMod.sync(changeName, cwd, syncOpts)`（原样透传）；签名/返回不变，无对外可见行为变化（除修复后的树通道恢复真实判读）。
- 端点/命令/表结构：无变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：不适用——单调用点形状修复，无时序假设变化（上一变更 design 已答全量面）。
2. 并发写：不适用——零写路径改动。
3. 切换/生命周期：不适用——修复让树通道恢复真实判读，生命周期语义与上一变更一致。
4. 作用域：不适用——同上一变更作用域面，无新增。

## 文件变更清单（自声明对账面）

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/run/shared.js | 默认 runSync 原样透传 {signal} 形状对象 + 形状契约注释 |
| 修改 | test/terminal-sync-strict.test.mjs | 新增默认路径回归钉用例 |

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：无——单行形状修复 + 回归钉；已放弃方案：改 raceWithAbort 传裸 AbortSignal（将破坏既有 triggerSync 内联用法 `sync(name, cwd, sig)` 的 opts 形状契约，面大不用）。
