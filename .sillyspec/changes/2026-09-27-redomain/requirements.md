---
author: flow-machine-draft
created_at: 2026-09-27T11:37:00.043Z
---
# 需求规格（Requirements）— 2026-09-27-redomain

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 新增 tests redomain 子命令：--from <域> --to <域> [--ancho
Given 迁移 相关模块就绪
When 新增 tests redomain 子命令：--from <域> --to <域> [--anchor <FR-id>]，干跑缺省列出将迁移条目，--write
Then 行为符合本条标准描述

### FR-02: 条目 ID 保持不变（单一身份——绑定/supersede 链/最近确认锚全靠 ID，迁域不换号
Given 系统就绪
When 条目 ID 保持不变（单一身份——绑定/supersede 链/最近确认锚全靠 ID，迁域不换号
Then 行为符合本条标准描述

### FR-03: 前缀与域不符属历史痕迹，文档说明）
Given 系统就绪
When 前缀与域不符属历史痕迹，文档说明）
Then 行为符合本条标准描述

### FR-04: 段切割用 splitKnowledgeSections
Given 系统就绪
When 段切割用 splitKnowledgeSections
Then 行为符合本条标准描述

### FR-05: joinKnowledgeFile 单源
Given 系统就绪
When joinKnowledgeFile 单源
Then 行为符合本条标准描述

### FR-06: 目标域文件缺席则按 loadDomainSections 同款头新建
Given 系统就绪
When 目标域文件缺席
Then 按 loadDomainSections 同款头新建

### FR-07: 目标域无 INDEX 路由行则经 syncIndexRoutingLines 补
Given 系统就绪
When 目标域无 INDEX 路由行
Then 经 syncIndexRoutingLines 补

### FR-08: 全域迁移后源域文件剩 0 条目时删除源文件（防空壳域）
Given 迁移 相关模块就绪
When 全域迁移后源域文件剩 0 条目时删除源文件（防空壳域）
Then 行为符合本条标准描述

### FR-09: anchor 模式精确单条
Given 系统就绪
When anchor 模式精确单条
Then 行为符合本条标准描述

### FR-10: 测试：单条迁移/全域迁移/目标文件新建/INDEX 补行/幂等（迁过的不再迁）/干跑不落盘
Given 测试 / 迁移 / 幂等 相关模块就绪
When 测试：单条迁移/全域迁移/目标文件新建/INDEX 补行/幂等（迁过的不再迁）/干跑不落盘
Then 行为符合本条标准描述

### FR-11: 全仓测试绿
Given 测试 相关模块就绪
When 全仓测试绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-09 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-10 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-11 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
