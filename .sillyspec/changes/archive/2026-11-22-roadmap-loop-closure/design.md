---
author: flow-machine-draft
created_at: 2026-11-21T23:14:17.997Z
---
# 设计记录（Design Record）— 2026-11-22-roadmap-loop-closure

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

三环闭合：①机器消费——拒绝概念与位置裁决走变更内 decisions.md 记 D-001/D-002，收口 distill 自动蒸馏进 knowledge decisions 域（这是工具自带的防复潮通道，批 0/批 1 误把同类内容写进无人检索的 md 是绕开了正道）；②状态推进——ROADMAP 迁入 `.sillyspec/docs/sillyspec/` 并加状态列，批 0-3a 回写已归档提交号；③位置归位——删除项目 docs/ 下的死文档（ROADMAP+out-of-scope），修正两份 CLAUDE.md 的过时指引句。归档件历史引用不追改（审计事实）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无代码接口变化。文件面变化：新增 `.sillyspec/docs/sillyspec/ROADMAP.md`（含状态列）、删除 `docs/ROADMAP.md` 与 `docs/sillyspec/out-of-scope/`（2 文件）、修改根 CLAUDE.md 与 .claude/CLAUDE.md 各一句、变更 decisions.md 新增 D-001/D-002（随收口蒸馏进 knowledge）。CLI 命令、行为零变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   不适用：静态文档迁移与决策落盘，无事件顺序语义。若并行会话此刻引用旧路径 docs/ROADMAP.md，其提交在后归档对账时按他侧交付归因，不冲突。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   CLAUDE.md 两份为共享指引文件，本变更各只改一句（第 18 条），改动面窄；knowledge 蒸馏由收口 distill 单写。提交用显式 pathspec，不夹带并行会话文件。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   文档迁移幂等（重跑重写即可）；decisions 条目按 D-xxx 判重幂等；中断恢复由 flow 状态机承担。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   不跨仓：迁移对象限本仓文件。knowledge 决策为仓级资产随 distill 进库。注意规约 00：D 条目正文不枚举具体项目路径，用通用表述。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：删除 docs/ROADMAP.md 后，外部（平台文档/其他会话记忆）若已引用旧路径会断链——缓解：D-002 决策正文记录旧→新路径映射，检索「ROADMAP」可命中新位置。次风险：CLAUDE.md 指引修正与用户后续手改冲突——改动单句、语义对齐用户 2026-11-22 裁决原意。试过但放弃的方案：给工具加 `sillyspec roadmap` 命令族（一等公民化）——放弃理由：先让路线以 knowledge+工作区文档形态闭环验证价值，条目多到手工回写疼了再机械化（先轻后重，ROADMAP 搁置区同款策略）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | NEW:.sillyspec/docs/sillyspec/ROADMAP.md | 迁入工具工作区，批次表加状态列，批 0-3a 回写已归档+提交号 |
| 删除 | docs/ROADMAP.md | 内容已迁移（避免双源） |
| 删除 | docs/sillyspec/out-of-scope/README.md | 沉淀位撤销，职责归 knowledge decisions 通道 |
| 删除 | docs/sillyspec/out-of-scope/mattpocock-skills-full-adoption.md | 内容浓缩进 D-001 决策条目 |
| 修改 | CLAUDE.md | 第 18 条指引句修正（troubleshooting/knowledge/工作区三分通道） |
| 修改 | .claude/CLAUDE.md | 同上句同步修正 |
| 修改 | docs/troubleshooting.md | 闭环欠账补记：.claude/ 冻结面判空缺陷（批 2 只绕过未记录的规则 18 欠账） |
| 新增 | .sillyspec/changes/2026-11-22-roadmap-loop-closure/decisions.md | D-001 拒绝全量照搬；D-002 路线资产位置裁决（随收口蒸馏进 knowledge） |
