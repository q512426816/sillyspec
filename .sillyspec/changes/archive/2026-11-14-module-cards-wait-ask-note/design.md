---
author: flow-machine-draft
created_at: 2026-11-14T14:24:18.838Z
---
# 设计记录（Design Record）— 2026-11-14-module-cards-wait-ask-note

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在两份模块卡追加注记收口 2026-11-14-wait-ask-tool-and-selfcheck-output 的文档欠账：stages.md 既有注记节末尾增补一行（自检结果入产物口径）；runtime.md 末尾按既有注记节格式追加「wait 提问方式指引注入」节（两分支注入、auto 例外、测试锁点）；两卡 `updated_at` 更新。不改 docs 模块卡——描述平台仓 docs/，本次未触及其文件。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无。仅模块文档 markdown 内容与 frontmatter 时间戳变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。静态知识文档追加落盘，不依赖事件顺序。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

两会话同改同一模块卡会 git 冲突；按共享仓纪律编辑前重读最新态，冲突手工合并保留双方注记。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。改动已落盘即生效，中断后按进度恢复，不重复追加（编辑前查重）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。仅本仓 spec root 模块卡。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险是注记与源码文案漂移（后续改 prompt/注入忘改注记）。缓解：注记以变更名与测试锁点文件锚定（test/brainstorm-solution-constraint-gate.test.mjs、test/output-step-render.test.mjs 已锁源码文案）。放弃方案：改写 docs 模块卡——其描述平台仓 docs/，写入本仓内容会语义串台。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | .sillyspec/docs/sillyspec/modules/stages.md | 注记节增补自检结果入产物行 + updated_at |
| 修改 | .sillyspec/docs/sillyspec/modules/runtime.md | 追加 wait 提问方式指引注入注记节 + updated_at |
