---
author: flow-machine-draft
created_at: 2026-10-23T07:20:40.660Z
---
# 设计记录（Design Record）— 2026-10-23-knowledge-scope-inject

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

不适用：增量注入面——新模块 knowledge-scope.js（collectScopedKnowledge 解析 section 标记，纯读 fail-soft）＋flowKnowledgeDigest 顶部插两段（内置中立性行恒注入；always/repo 帽 5；module 按 domains 命中）。选 section 级 HTML 注释标记而非新配置文件：知识条目天然以 heading 为粒度（INDEX 路由/命中均按 file#heading），标记跟随原文、零新格式、旧知识零迁移。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新模块 src/knowledge-scope.js 导出 collectScopedKnowledge（{always,repo,modules}）；flowKnowledgeDigest 输出新增「工具中立性」恒注入行与作用域条目行（有 scoped 条目时）；无 scoped 条目时仅多内置行（有意新增），FR/关键词/否决段逐字不变。知识文件格式增可选标记行（旧文件零改动）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：纯读扫描，标记解析与文件内容顺序无关。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用：只读知识文件，零写盘。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用：无状态，改标记下一轮生效。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用：knowledgeRoot 来自 specBase 本仓；模块域匹配走既有 resolveTouchedDomains 单源。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险=恒注入条目膨胀淹没简报（帽 5 条+溢出计数缓解）；module 域命名与知识域/模块图不一致致永不命中——文档注明用 knowledge 域 id（与 FR 域同源）。放弃：新独立 scope 配置文件（双份真相、迁移成本）；文件级标记（section 粒度更贴合 INDEX 路由）。


## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 增 | src/knowledge-scope.js | collectScopedKnowledge 作用域解析器 |
| 改 | src/flow.js | flowKnowledgeDigest 顶部两段注入（内置行+scoped 条目） |
| 增 | test/knowledge-scope-inject.test.mjs | 解析三态＋digest 集成＋缺省锚 |
