---
author: flow-machine-draft
created_at: 2026-10-23T07:46:40.283Z
---
# 设计记录（Design Record）— 2026-10-23-knowledge-scope-discoverability

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

不适用：三处发现面——①knowledge 子命令族新增 scope 分支（复用 collectScopedKnowledge 单源，人类+--json 双态；语法教学内置）②AGENTS 模板知识库行加一句指针③sillyspec-config 技能加「知识注入作用域」节。均为只读/文案，无行为面。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新子命令 sillyspec knowledge scope [--json]；knowledge help 增列；templates/agents-instruction.md 与 .claude/skills/sillyspec-config/SKILL.md 文案增补。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

不适用：只读扫描。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

不适用：零写盘。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

不适用：无状态。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不适用：读本仓 knowledgeRoot。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

风险=教学文案与解析实现漂移——命令的语法示例由源码常量单源渲染（不手抄）；放弃：仅靠聊天/文档口口相传（正是本次问题），弃。


## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 改 | src/stages/knowledge.js | scope 子命令（现状+语法教学+--json） |
| 改 | templates/agents-instruction.md | 知识库行作用域指引 |
| 改 | .claude/skills/sillyspec-config/SKILL.md | 知识注入作用域节 |
| 增 | test/knowledge-scope-cmd.test.mjs | CLI e2e＋文案锚 |
