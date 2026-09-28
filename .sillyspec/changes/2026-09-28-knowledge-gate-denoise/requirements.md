---
author: flow-machine-draft
created_at: 2026-09-28T16:00:58.225Z
---
# 需求规格（Requirements）— 2026-09-28-knowledge-gate-denoise

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: matchKnowledge decisionHits 条目新增 score 字段（加法不改既有键）
Given 系统就绪
When matchKnowledge decisionHits 条目新增 score 字段（加法不改既有键）
Then 行为符合本条标准描述

### FR-02: 门/knowledge 注入段/{DECISION_HITS} 三消费方回显过滤——score>0 
Given 系统就绪
When 门/knowledge 注入段/{DECISION_HITS} 三消费方回显过滤——score>0 或 deathPath 才弹，空标题零分 rejected 
Then 行为符合本条标准描述

### FR-03: 真实库枚举词表查询下 D-001@v1 仍置顶弹出、D-009/010/011 不再出现在回显
Given 系统就绪
When 真实库枚举词表查询下 D-001@v1 仍置顶弹出、D-009/010/011 不再出现在回显
Then 行为符合本条标准描述

### FR-04: 已回应不重弹：decisions.md 正文含「命中 id＋域文件名」共现（如 unmapped.m
Given 系统就绪
When 已回应不重弹：decisions.md 正文含「命中 id＋域文件名」共现（如 unmapped.md D-001@v1 形态）的命中在后续 --done 回显
Then 行为符合本条标准描述

### FR-05: 未回应命中照常弹
Given 系统就绪
When 未回应命中照常弹
Then 行为符合本条标准描述

### FR-06: 无命中
Given 系统就绪
When 无命中
Then 行为符合本条标准描述

### FR-07: 全静默时输出与现状一致
Given 系统就绪
When 全静默时输出与现状一致
Then 行为符合本条标准描述

### FR-08: 既有知识面测试回归全绿，test:core 全绿
Given 测试 相关模块就绪
When 既有知识面测试回归全绿，test:core 全绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」＋既有知识面四文件回归（25/25）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」＋既有知识面四文件回归（25/25）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」＋既有知识面四文件回归（25/25）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」＋既有知识面四文件回归（25/25）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」＋既有知识面四文件回归（25/25）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」＋既有知识面四文件回归（25/25）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」＋既有知识面四文件回归（25/25）

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-gate-denoise.test.mjs「①真实库资格面／②digest 过滤／③已回应静默」＋既有知识面四文件回归（25/25）
