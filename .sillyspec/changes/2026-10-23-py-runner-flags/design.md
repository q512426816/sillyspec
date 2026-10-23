---
author: flow-machine-draft
created_at: 2026-10-23T06:28:48.549Z
---
# 设计记录（Design Record）— 2026-10-23-py-runner-flags

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

不适用：一行接线——readVerifyPyFlags（逐键正则，CRLF 归一）＋ runModuleSubset 推断路径对 py 组命令追加 flags（pytest 参数序无关，flags 置于文件面前）；hits 路径不动（其 flags 已由模块命令携带，双加会重复）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

local.yaml 新键 py_runner_flags（string，缺省空=零回归）；verify-postcheck 新导出 readVerifyPyFlags；deps(auto-py) 推断批命令尾部增声明 flags。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：每轮组面现读键，无事件序。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用：只读键+命令串拼接，零写盘。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用：无状态，改键下一轮生效。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用：键仓级；py 分组/重定基语义零改动。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险=消费仓误配 flags 致 pytest 参数错（如无 xdist 配 -n auto 报错）——显式配置责任在仓主，报错可见可改；放弃：缺省自动加 -n auto（xdist 未必安装，默认加会打挂无 xdist 仓，弃）。


## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/verify-postcheck.js | readVerifyPyFlags＋推断路径 flags 追加 |
| 改 | src/config-schema.js | 注册 py_runner_flags＋example token |
| 增 | test/py-runner-flags.test.mjs | 键三态 unit＋接线锚 |
