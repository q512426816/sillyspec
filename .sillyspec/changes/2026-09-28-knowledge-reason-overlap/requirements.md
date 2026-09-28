---
author: flow-machine-draft
created_at: 2026-09-28T13:26:52.951Z
---
# 需求规格（Requirements）— 2026-09-28-knowledge-reason-overlap

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 查询「穷举」「关键词表」「分类表」等仅出现在理由文本的近义词时，D-001@v1 枚举开放世界死路条
Given 系统就绪
When 查询「穷举」「关键词表」「分类表」等仅出现在理由文本的近义词时，D-001@v1 枚举开放世界死路条目进 decisionHits 前 5
Then 行为符合本条标准描述

### FR-02: 主场景（标题词如 枚举/开放世界）排序不回归，仍置顶
Given 系统就绪
When 主场景（标题词如 枚举/开放世界）排序不回归，仍置顶
Then 行为符合本条标准描述

### FR-03: 空标题 rejected 条目在近义查询下不再以文件序压制相关死路条目
Given 系统就绪
When 空标题 rejected 条目在近义查询下不再以文件序压制相关死路条目
Then 行为符合本条标准描述

### FR-04: 测试钉住近义/主场景/精度三面
Given 测试 相关模块就绪
When 测试钉住近义/主场景/精度三面
Then 行为符合本条标准描述

### FR-05: npm run test:core 全绿
Given 系统就绪
When npm run test:core 全绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-reason-overlap.test.mjs「①近义置顶／②主场景不回归／④真实库钉子」＋test/knowledge-inject-ranking.test.mjs（回归）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-reason-overlap.test.mjs「①近义置顶／②主场景不回归／④真实库钉子」＋test/knowledge-inject-ranking.test.mjs（回归）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-reason-overlap.test.mjs「①近义置顶／②主场景不回归／④真实库钉子」＋test/knowledge-inject-ranking.test.mjs（回归）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-reason-overlap.test.mjs「①近义置顶／②主场景不回归／④真实库钉子」＋test/knowledge-inject-ranking.test.mjs（回归）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-reason-overlap.test.mjs「①近义置顶／②主场景不回归／④真实库钉子」＋test/knowledge-inject-ranking.test.mjs（回归）
