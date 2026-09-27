---
author: flow-machine-draft
created_at: 2026-09-27T16:20:57.122Z
---
# 需求规格（Requirements）— 2026-09-28-archive-timeline-bake

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 归档链（runArchiveChain，flow done 与 run archive 双入口共用）
Given 系统就绪
When 归档链（runArchiveChain，flow done 与 run archive 双入口共用）在目录搬移成功后、窄化 git add 前，写 archiv
Then 行为符合本条标准描述

### FR-02: 烤制失败 fail-open（一行警告，不阻断归档）
Given 系统就绪
When 烤制失败 fail-open（一行警告，不阻断归档）
Then 行为符合本条标准描述

### FR-03: 本机 .runtime 无事件流时，sillyspec watcher timeline --cha
Given 系统就绪
When 本机 .runtime 无事件流时，sillyspec watcher timeline --change <已归档变更> 自动回退读归档包内 watcher-
Then 行为符合本条标准描述

### FR-04: 事件副本带尺寸帽（超帽跳过副本只烤 timeline.md 并在文件头留注记），防巨型事件流污染 g
Given 系统就绪
When 事件副本带尺寸帽（超帽跳过副本只烤 timeline.md 并在文件头留注记），防巨型事件流污染 git
Then 行为符合本条标准描述

### FR-05: 新增测试覆盖烤制渲染、烤制编排（fixture 目录）、回退读取（坏行容忍）、无事件跳过态
Given 测试 相关模块就绪
When 新增测试覆盖烤制渲染、烤制编排（fixture 目录）、回退读取（坏行容忍）、无事件跳过态
Then 行为符合本条标准描述

### FR-06: 全量 npm test 与 npm run lint 绿
Given 系统就绪
When 全量 npm test 与 npm run lint 绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
