---
author: flow-machine-draft
created_at: 2026-11-02T08:53:02.471Z
---
# 需求规格（Requirements）— 2026-11-02-knowledge-provenance

## 功能需求

### FR-01: provenance ledger：两仓 decisions/unmapped 与 fr/unmapped 逐条记录（id、来源仓、所在文件、内容 hash、是否在另一仓存在、同仓重复数），落变更目录 JSON

脚本必须为两仓的 decisions/unmapped 与 fr/unmapped 生成逐条 ledger：id、来源仓、所在文件、内容 hash（条目段 sha256 前 16 位）、是否在另一仓存在（同 id）、同仓重复数；落变更目录 `redomain-provenance.json`，条目按 id+来源仓稳定排序。

#### 场景：条目守恒

Given 本仓 decisions/unmapped 74 条、fr/unmapped 210 条、平台 decisions/unmapped 308 条（按 `## D-...@v` / `## FR-...` 头计数）
When 生成 ledger
Then JSON 条目数与头计数一致（守恒断言随脚本执行）

### FR-02: 分类：decisions 分 template-draft / real / duplicate-of-platform / unique；fr 分 duplicate-of-platform / unique，模板判定基于标题/理由的底稿模板特征

分类必须按标题/理由的底稿模板特征（设计期风险与放弃方案、风险与死路、design 槽4 收割、底稿）判定 template-draft，其余为 real；real 中 id 在另一仓已存在者为 duplicate-of-platform、否则 unique；fr 只分 duplicate-of-platform / unique。

#### 场景：模板分层

Given 本仓 74 条中 46 条为模板底稿
When 分类
Then template-draft 计数与实测对齐（差异如实记录在报告）

### FR-03: 处置表：每条给出建议动作（draft 标记、归档裁剪、人工域映射候选）+ 理由，覆盖全部条目无遗漏

报告必须为每条给出建议动作：template-draft → `mark-draft-exclude`（状态 draft 并排除检索，或迁 non-INDEX 的 design-risk 文件）；duplicate-of-platform → `archive-or-prune`（附另一仓位置）；unique real → `manual-domain-map`（列 id/标题/变更，人工定域）；每条附理由，覆盖全部条目。

#### 场景：无遗漏

Given ledger 共 N 条
When 读报告处置表
Then 处置表条目数 = N（脚本断言）

### FR-04: 零写入：不改任何知识文件；平台仓只读分析

脚本必须零写入：只读两仓知识文件，不修改、不移动、不新增任何知识文件；平台仓仅只读。执行前后对两仓 knowledge 目录计算内容 hash 并比较，不一致则脚本失败。

#### 场景：执行前后 hash 一致

Given 脚本执行
When 比较两仓 knowledge 目录前后 hash
Then 必须一致（零写入断言）

### FR-05: 报告可审计：统计数字与审查实测对齐（或如实记录差异），落 4A-REPORT.md 随变更归档

必须输出 `4A-REPORT.md`：两仓分类计数、与审查实测数字（本仓 decisions 74/46/28、可迁 39 全模板；平台 308/173/135；fr 210/208 重复；两仓同 ID 1026）的对照表（差异如实标注），处置表全文，以及 4B/4C 的输入清单（人工域映射候选、重复裁剪候选）。

#### 场景：数字对照

Given 报告生成
When 人工对照审查实测
Then 关键计数一致或差异有解释（如实记录）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：一次性只读数据报告，守恒断言内嵌脚本（exit≠0 即失败）
FR-02: 不适用：同上（分类计数在报告内与实测对照）
FR-03: 不适用：同上（处置表条目数=ledger 条目数断言内嵌）
FR-04: 不适用：同上（执行前后 knowledge 目录 hash 比较内嵌脚本）
FR-05: 不适用：报告文档随变更归档人工审计
