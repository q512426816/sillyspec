---
author: flow-machine-draft
created_at: 2026-09-28T23:27:08.940Z
---
# 需求规格（Requirements）— 2026-09-29-brainstorm-exit-thin-default

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: design-init 骨架不再预填 scale: large（scale 留空由 Step 8 规
Given 系统就绪
When design-init 骨架不再预填 scale: large（scale 留空由 Step 8 规模评估落值）
Then 行为符合本条标准描述

### FR-02: Step 8 精判与 Step 2 粗判的判据换轴：small=单上下文可吞吐（无 Wave 并行编
Given 系统就绪
When Step 8 精判与 Step 2 粗判的判据换轴：small=单上下文可吞吐（无 Wave 并行编排/上下文分片/多阶段治理需求）
Then flow start 收编 2 调用收口

### FR-03: large=需要编排/分片/治理或用户显式要求
Given 系统就绪
When large=需要编排/分片/治理或用户显式要求
Then 行为符合本条标准描述

### FR-04: 拿不准默认 small（升厚留运行时证据：实测失败自动升厚＋--upgrade-thick）
Given 系统就绪
When 拿不准默认 small（升厚留运行时证据：实测失败自动升厚＋--upgrade-thick）
Then 行为符合本条标准描述

### FR-05: 收口提示翻转：未标/small → flow start 收编
Given 系统就绪
When 收口提示翻转：未标/small
Then flow start 收编

### FR-06: large → run plan
Given 系统就绪
When large
Then run plan

### FR-07: 单测三面（骨架不预填/指引文案含新判据与默认/收口提示翻转）＋既有回归全绿
Given 系统就绪
When 单测三面（骨架不预填/指引文案含新判据与默认/收口提示翻转）＋既有回归全绿
Then 行为符合本条标准描述

### FR-08: 行为级闭环实测：小白鼠带模糊需求走头脑风暴至 Step 8，出口收编轻量道而非 run plan
Given 系统就绪
When 行为级闭环实测：小白鼠带模糊需求走头脑风暴至 Step 8，出口收编轻量道而非 run plan
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
