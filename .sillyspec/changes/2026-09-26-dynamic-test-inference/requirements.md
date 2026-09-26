---
author: flow-machine-draft
created_at: 2026-09-26T15:33:23.784Z
---
# 需求规格（Requirements）— 2026-09-26-dynamic-test-inference

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 测试门（thin+full 共用 runVerifyTestCheck）缺省走动态推断：本变更测试 
Given 测试 相关模块就绪
When 测试门（thin+full 共用 runVerifyTestCheck）缺省走动态推断：本变更测试 ∪ FR 关联回归（active FR 覆盖面∩触碰文件
Then 其绑定 tests）∪ import 依赖测试

### FR-02: runner 自项目结构推断（uv run pytest/vitest/jest/node --te
Given 测试 相关模块就绪
When runner 自项目结构推断（uv run pytest/vitest/jest/node --test），不依赖 local.yaml 测试配置
Then 行为符合本条标准描述

### FR-03: local.yaml modules.*.test 不再消费（在场打印退役指引）
Given 系统就绪
When local.yaml modules.*.test 不再消费（在场打印退役指引）
Then 行为符合本条标准描述

### FR-04: commands.test 仅显式 test_strategy: full 时生效作全量逃生阀
Given 系统就绪
When commands.test 仅显式 test_strategy: full 时生效作全量逃生阀
Then 行为符合本条标准描述

### FR-05: FR 绑定写入侧路径归一为仓根相对（upsertFrBindings 接受 projectRoot 
Given 系统就绪
When FR 绑定写入侧路径归一为仓根相对（upsertFrBindings 接受 projectRoot 归一 tests）
Then 行为符合本条标准描述

### FR-06: 新增 tests repair-paths 子命令修复存量错形路径
Given 系统就绪
When 新增 tests repair-paths 子命令修复存量错形路径
Then 行为符合本条标准描述

### FR-07: 平台仓 multi-agent-platform 修复后 fr/*.md 内 tests: 全部可自
Given 系统就绪
When 平台仓 multi-agent-platform 修复后 fr/*.md 内 tests: 全部可自仓根解析
Then 行为符合本条标准描述

### FR-08: 全仓测试绿
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
