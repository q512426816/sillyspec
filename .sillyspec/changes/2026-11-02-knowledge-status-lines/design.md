---
author: flow-machine-draft
created_at: 2026-11-02T12:30:00.000Z
---
# 设计记录（Design Record）— 2026-11-02-knowledge-status-lines

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

纯数据侧收尾三件事（方案审查确认零代码行为面）：① 一次性脚本（变更目录 annotate-status.mjs）按「emoji+标题词+正文语义」启发式生成本仓 known-issues.md 53 条的状态建议清单（heading→建议状态→判据），人工复核后落盘「- 状态：<六值>」行（放首段说明之后；heading/标题词/INDEX 不动；5 条未路由条照标）；同款逻辑只读生成平台 48 条建议清单（不写平台）。② decisions/unmapped.md 头注加一行检索面-only 自描述（不加条目字段行——docs-check 解析契约）。③ fr/unmapped.md 头注残余计数修正（625→实测段头数）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 数据文件：knowledge/known-issues.md（每条目加一行状态行）、knowledge/decisions/unmapped.md（头注+1 行）、knowledge/fr/unmapped.md（头注数字修正）。无代码/CLI/解析契约变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。状态行是独立文档行，无顺序依赖。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

单写者约定；显式 pathspec 提交。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。纯文档行新增，git 可回滚。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。本仓落盘；平台只读零写（断言）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

**风险**：状态误判——无检索后果（isResolvedRoute 不读正文），建议清单人工复核兜底。

**放弃的方案**：① decisions/unmapped 加「状态：draft」字段行——docs-check 机械解析契约+producer 幂等性风险（审查实证），改头注自描述；② 改 isResolvedRoute 读正文状态行——数据迁移不夹带检索行为变化（变更 4 审查裁决），留独立变更。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | .sillyspec/knowledge/known-issues.md | 53 条状态行 |
| 修改 | .sillyspec/knowledge/decisions/unmapped.md | 头注自描述行 |
| 修改 | .sillyspec/knowledge/fr/unmapped.md | 头注数字修正 |
| 新增 | .sillyspec/changes/2026-11-02-knowledge-status-lines/annotate-status.mjs | 一次性标注脚本 |
| 新增 | .sillyspec/changes/2026-11-02-knowledge-status-lines/platform-status-suggestion.md | 平台建议清单 |
