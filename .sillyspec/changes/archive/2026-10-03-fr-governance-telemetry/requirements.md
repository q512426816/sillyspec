---
author: flow-machine-draft
created_at: 2026-10-02T17:01:53.471Z
---
# 需求规格（Requirements）— 2026-10-03-fr-governance-telemetry

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: rot-suspect 事件携带 FR id 清单
Given flow done 收口的 fr-rot-suspect 遥测事件（覆盖命中的 strong 条目集）
When appendKnowledgeHit 落盘事件
Then 负载含 frIds（strong 条目全局 id，帽 20 条——防单事件膨胀）；既有字段（domains/strong/unknown/skip/count/unknownSources）零改动

### FR-02: unreferenced 事件携带 FR id 清单
Given indexRequirements 的 unreferenced 探针产出触达域未被本次承接引用的 active 条目
When archive-distill 落盘 fr-unreferenced 事件
Then 负载含 ids（该域未引用条目全局 id，帽 20 条）；既有字段（change/domain/count）零改动

### FR-03: 存量事件向后兼容
Given knowledge-hits.jsonl 存量事件（无 frIds/ids 字段）
When knowledge-stats 解析
Then 零破坏——无字段事件不进 id 聚合，域级/事件级既有读数不变

### FR-04: knowledge stats 裁决候选视图
Given knowledge-hits 中 rot-suspect/unreferenced 事件带 id 清单、knowledge/fr 索引在场
When buildFrIndexStats 聚合 + cmdKnowledgeStats 渲染
Then 按 FR id 聚合「suspect 触达次数 × unreferenced 次数」输出候选清单（Top-N 渲染，附来源变更名与处置指引行：确认无人承接 → 承接翻链或人工裁决退休）；无 id 数据时视图零噪音（不渲染空段）

### FR-05: unmapped 停车场治理执行
Given 本仓 knowledge/fr/unmapped.md 存量 723 条（40% 死库存——比对面已排除）
When planRedomain 干跑评估机械可迁面 → 可迁者 redomainFrEntries --write 迁移（ID 不换号）
Then 迁移数量与残余数量披露；不可迁残余在 unmapped.md 头注显式「检索面-only」声明（承认死库存不伪装活跃）

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-governance-telemetry.test.mjs「① rot-suspect 事件带 frIds 帽 20」——rotSuspectFlow 事件负载断言（既有字段零改动）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-governance-telemetry.test.mjs「② unreferenced 探针带 ids」——indexRequirements 产出 unreferenced[].ids 帽 20 断言

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-governance-telemetry.test.mjs「③ 存量无字段事件兼容」——buildFrIndexStats 对无 id 字段事件的既有读数断言

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/fr-governance-telemetry.test.mjs「④ 裁决候选视图」——带 id 事件聚合 Top-N、来源变更附注、无 id 时零渲染断言

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 时自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：跨仓/本仓一次性治理操作（planRedomain 干跑+--write 迁移+头注声明），数量随变更归档件留档（design 回填留档段）；redomain 机器通道本身由既有 test/fr-domain-guard-and-redomain-bychange.test.mjs 守护
