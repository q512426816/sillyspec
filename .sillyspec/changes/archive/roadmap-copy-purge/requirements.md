---
author: flow-machine-draft
created_at: 2026-09-28T06:08:30.981Z
---
# 需求规格（Requirements）— roadmap-copy-purge

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: .sillyspec/ROADMAP.md 自本仓删除并显式 pathspec 提交
Given 系统就绪
When .sillyspec/ROADMAP.md 自本仓删除并显式 pathspec 提交
Then 行为符合本条标准描述

### FR-02: CLI 读侧零改动：next.js 绿地探测（面向用户自备文档的通用功能）保留、status 阶段 
Given 系统就绪
When CLI 读侧零改动：next.js 绿地探测（面向用户自备文档的通用功能）保留、status 阶段 cat 带 2>/dev/null 自失活、stages/a
Then ）不触发重建

### FR-03: 纯 doc 删除，收口实测自动跳过代码面
Given 系统就绪
When 纯 doc 删除，收口实测自动跳过代码面
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：纯 tracked 文件删除（.sillyspec/ROADMAP.md），无运行时行为；删除事实由 git 提交面锚定（patch 冻结面按交付过滤规则不含 .sillyspec/ 治理路径，评审 P1 指正后如实改口）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：读侧核验为静态结论（src 全 grep 共 8 处条件化：stages/status.js:16 cat 带 2>/dev/null、stages/archive.js:60「存在→」、run/next.js:135 绿地探测本仓分支不可达），无行为分支可断言；收口实测门 17 deps+16 FR 绑定测试全绿佐证零回归

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：提交纪律（显式 pathspec）由 git 历史锚定（提交只含 2 路径，并行会话 guidance-principles 暂存条目原样留存）
