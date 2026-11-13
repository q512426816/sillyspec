---
author: flow-machine-draft
created_at: 2026-11-13T14:00:11.631Z
---
# 设计记录（Design Record）— 2026-11-13-stages-module-doc-brainstorm-gate

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在 `.sillyspec/docs/sillyspec/modules/stages.md` 末尾按既有注记节格式追加「方案硬约束准入与禁凑数（2026-11-13-brainstorm-solution-constraint-gate）」一节，描述方案步 prompt 的四条新规则并引用测试文件与镜像再生命令；同步更新 frontmatter `updated_at`。不改 `docs/multi-agent-platform/modules/docs.md`——该卡描述的是平台仓 `docs/` 内容，本变更未触及其文件，属模块图路径匹配产生的 advisory。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无。仅模块文档 markdown 内容与 frontmatter 时间戳变化，无代码、命令、文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。文档是静态知识，不依赖事件顺序；注记节以追加方式落盘，不重排既有节。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

两会话同时改同一模块卡会 git 冲突；按共享仓纪律编辑前重读最新态，冲突时手工合并保留双方注记节。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。改动已落盘即生效，中断后按 `sillyspec progress show` 恢复，不重复追加（编辑前查重）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。仅本仓 spec root 下的模块卡，不涉及跨仓数据。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险是注记节与源码文案漂移（后续改 prompt 忘改注记）。缓解：注记以变更名与测试文件锚定，测试已锁源码文案。放弃方案：改写 `docs/multi-agent-platform/modules/docs.md` 记录——该卡描述平台仓 docs/，写入本仓提示词镜像内容会造成语义串台，故不改。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | .sillyspec/docs/sillyspec/modules/stages.md | 追加方案硬约束准入注记节 + updated_at |
