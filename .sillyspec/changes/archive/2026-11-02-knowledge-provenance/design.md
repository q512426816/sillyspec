---
author: flow-machine-draft
created_at: 2026-11-02T08:53:02.471Z
---
# 设计记录（Design Record）— 2026-11-02-knowledge-provenance

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

在变更目录写一次性只读脚本 `provenance.mjs`（不落 src、不引入运行时行为）：只读两仓 knowledge，解析 decisions/unmapped 与 fr/unmapped 的条目段，生成逐条 ledger（`redomain-provenance.json`）与审计报告（`4A-REPORT.md`）。分类复用「底稿模板特征词」启发式（设计期风险与放弃方案 / 风险与死路 / design 槽4 收割 / 底稿）；重复判定用另一仓全量条目 id 集合（decisions 含「原编号」）。脚本内嵌四道断言：条目守恒（ledger 数 = 头计数）、处置表覆盖（条目数 = ledger 数）、零写入（两仓 knowledge 目录执行前后内容 hash 一致）、平台仓只读（不写平台路径）。报告把分类计数与审查实测数字并排对照，差异如实标注。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- 新增变更目录文件：`provenance.mjs`（一次性脚本）、`redomain-provenance.json`（ledger）、`4A-REPORT.md`（审计报告）。
- 无 src 运行时/CLI/API 变化；无知识文件改动（零写入断言保证）。
- 后续 4B/4C 的输入：报告中的「唯一真实决策清单」「重复裁剪候选」「模板 draft 候选」。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。文件扫描按路径排序、ledger 按 id+来源仓排序，纯确定性输出。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

只读脚本，无并发写面；报告文件写在变更目录（单写者）。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。零写入；中断重跑幂等（覆盖同一输出文件）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。两仓路径显式写死（本仓相对、平台绝对可覆盖），平台只读；ledger 的 provenance 字段标明来源仓。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

**风险**：① 模板特征词启发式可能漏判/误判——报告逐条列出 title/reason 供人工核，计数与审查实测对照暴露差异；② 平台仓路径不可用时只出本仓报告（如实披露）。

**放弃的方案**：① 直接跑 redomain 归域（审查实测：可迁全模板、真实决策 0 条可迁）；② 用 suggestDomainFromFiles 批量归域（37/39 与模块投票不一致、产出 src 伪域）；③ 在本变更里改知识文件（4A 定位只读对账，写入属 4B/4C）。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | .sillyspec/changes/2026-11-02-knowledge-provenance/provenance.mjs | 一次性只读对账脚本（内嵌守恒/零写入断言） |
| 新增 | .sillyspec/changes/2026-11-02-knowledge-provenance/redomain-provenance.json | 两仓条目级 ledger |
| 新增 | .sillyspec/changes/2026-11-02-knowledge-provenance/4A-REPORT.md | 审计报告（分类计数对照 + 处置表） |
