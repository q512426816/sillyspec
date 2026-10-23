---
author: flow-machine-draft
created_at: 2026-10-23T07:03:48.235Z
---
# 设计记录（Design Record）— 2026-10-23-runner-flags-generic

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

不适用：两处泛化——①py_runner_flags 单键重构为 runner_flags 映射（批类别键，parse 行式块；三注入点统一 flagsSuffix 且置于文件面前；hits 不注入）②新增 deps_regress_cap 通用档（own 优先/off/N vel loud 披露）。均为语言中立语义：批类别是 CLI 自身的 runner 分类（py/js/jsx/go… 前向兼容），不枚举语言语法。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

local.yaml 新键 runner_flags（object，批类别→flags）与 deps_regress_cap（string，N|off）；py_runner_flags 保留别名。verify-postcheck 新导出 readRunnerFlags/readDepsRegressCap；deps(auto-*) 批命令尾 flag 与 deps 面截断行为变化。缺省两键均空=现状零回归。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：每轮组面现读键，无事件序。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用：只读键+命令串拼接，零写盘。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用：无状态，改键下一轮生效。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用：键仓级；批类别是 CLI 自有分类，跨语言仓共用同一语义。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险=消费仓误配 flags 或 deps_regress_cap 过激致本地漏测（CI 红后置）——显式配置责任在仓主，loud 披露每轮可见；放弃：按语言/框架提供专用键（py_flags/go_flags/…）= 开放世界枚举违反规约 00，弃；按框架名匹配注入（vitest/jest/pytest 各写一套）同理弃——统一走 CLI 的批类别。


## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/verify-postcheck.js | readRunnerFlags/readDepsRegressCap＋三注入点＋deps 面截断 |
| 改 | src/config-schema.js | 注册两键＋example token；py_runner_flags 标 deprecated 别名 |
| 改 | test/py-runner-flags.test.mjs | 随泛化更新（别名语义） |
| 增 | test/runner-flags-generic.test.mjs | 两键解析三态＋注入点锚＋零回归锚 |
