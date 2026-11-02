---
author: flow-machine-draft
created_at: 2026-11-02T08:53:02.471Z
---
# 提案书（Proposal）— 2026-11-02-knowledge-provenance

## 动机

任务原话转写：数据分层与来源对账：停车场 provenance 报告

变更 4 的方案审查推翻了「直接归域」：现有 redomain 工具已跑过一轮（tier-denoise 残量即不可推断项），停车场主体是模板底稿（本仓 74 条中 46 条、平台 308 中 173 条），本仓可迁 39 条 100% 是模板、28 条真实决策一条也迁不动；两仓实为 fork 关系（1026 个同 ID 条目、fr/backend.md 173/212 逐字相同）。审查给出修正版 4A（只读对账）→ 4B（定向迁移）→ 4C（resolved 状态）→ 4D（降权推迟）。本变更实现 4A。

成功标准：
- provenance ledger：两仓 decisions/unmapped 与 fr/unmapped 逐条记录（id、来源仓、所在文件、内容 hash、是否在另一仓存在、同仓重复数），落变更目录 JSON
- 分类：decisions 分 template-draft / real / duplicate-of-platform / unique；fr 分 duplicate-of-platform / unique，模板判定基于标题/理由的底稿模板特征
- 处置表：每条给出建议动作（draft 标记、归档裁剪、人工域映射候选）+ 理由，覆盖全部条目无遗漏
- 零写入：不改任何知识文件；平台仓只读分析
- 报告可审计：统计数字与审查实测对齐（或如实记录差异），落 4A-REPORT.md 随变更归档

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. provenance ledger：两仓 decisions/unmapped 与 fr/unmapped 逐条记录（id、来源仓、所在文件、内容 hash、是否在另一仓存在、同仓重复数），落变更目录 JSON
2. 分类：decisions 分 template-draft / real / duplicate-of-platform / unique；fr 分 duplicate-of-platform / unique，模板判定基于标题/理由的底稿模板特征
3. 处置表：每条给出建议动作（draft 标记、归档裁剪、人工域映射候选）+ 理由，覆盖全部条目无遗漏
4. 零写入：不改任何知识文件；平台仓只读分析
5. 报告可审计：统计数字与审查实测对齐（或如实记录差异），落 4A-REPORT.md 随变更归档

## 成功标准（可验证）

1. provenance ledger：两仓 decisions/unmapped 与 fr/unmapped 逐条记录（id、来源仓、所在文件、内容 hash、是否在另一仓存在、同仓重复数），落变更目录 JSON
2. 分类：decisions 分 template-draft / real / duplicate-of-platform / unique；fr 分 duplicate-of-platform / unique，模板判定基于标题/理由的底稿模板特征
3. 处置表：每条给出建议动作（draft 标记、归档裁剪、人工域映射候选）+ 理由，覆盖全部条目无遗漏
4. 零写入：不改任何知识文件；平台仓只读分析
5. 报告可审计：统计数字与审查实测对齐（或如实记录差异），落 4A-REPORT.md 随变更归档
