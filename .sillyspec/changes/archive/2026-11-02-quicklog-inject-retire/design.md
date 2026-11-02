---
author: flow-machine-draft
created_at: 2026-11-02T13:30:00.000Z
---
# 设计记录（Design Record）— 2026-11-02-quicklog-inject-retire

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

范围收窄为检索注入面下线：① src/stages/execute.js 的 buildWaveKnowledgeSection 与 src/run/prompt.js 的 buildKnowledgeInjection 各摘除 matchQuicklogContext 调用、renderQuicklogSection 渲染、quicklogIds 遥测字段——quicklog 检索面从知识注入链消失；② src/knowledge-quicklog.js 删除 matchQuicklogContext/renderQuicklogSection 导出（无消费后 lint 会报未引用导出），保留 parseFlowArchiveEntries（hotpath 测试消费）与其余导出。QUICKLOG 记录子系统（src/quicklog.js CLI）、quicklog/ 目录、test-bindings.json（图谱 test-binding 强边）不动——全删是独立大决策。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 摘除：buildWaveKnowledgeSection/buildKnowledgeInjection 的 quick 参数与 quicklog 段渲染；遥测 quicklogIds 字段不再写入。
- 删除导出：knowledge-quicklog.js 的 matchQuicklogContext、renderQuicklogSection。
- 保留：parseFlowArchiveEntries、quicklog.js CLI、quicklog/ 目录、test-bindings.json。
- 无 CLI/图谱行为变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。摘除是减法，无新增顺序依赖。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

无新增写点。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。减法变更，无状态。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。只动本仓 src。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

**风险**：摘除后注入测试对 quicklog 段的断言（若有）需同步摘除——grep 确认。

**放弃的方案**：全删 quicklog 子系统（quicklog.js + 目录 + test-bindings）——test-binding 强边消失影响图谱、11+ 测试文件连锁、且 QUICKLOG 记录是独立子系统非检索面，需用户另行决策。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/stages/execute.js | 摘除 matchQuicklogContext/renderQuicklogSection/quicklogIds |
| 修改 | src/run/prompt.js | 同款摘除 |
| 修改 | src/knowledge-quicklog.js | 删除 matchQuicklogContext/renderQuicklogSection 导出 |
| 修改 | test/knowledge-quicklog.test.mjs | 摘除已删功能用例 |
