---
author: flow-machine-draft
created_at: 2026-10-03T06:48:48.936Z
---
# 需求规格（Requirements）— 2026-10-03-voluntary-task-tick

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 轻量勾选动词 task tick：sillyspec task tick --change <名> --task task-NN 翻格幂等（已勾再勾不报错），输出已勾进度 N/M 与下一待办任务指针，未知 task-NN 报错并列可选 id
Given 幂等 相关模块就绪
When 轻量勾选动词 task tick：sillyspec task tick --change <名> --task task-NN 翻格幂等（已勾再勾不报错），输
Then 行为符合本条标准描述

### FR-02: flow start 执行循环文案改第一人称时序「做一件→测试绿→当场勾一格→下一件」，点名 harness TodoWrite 类工具不替代 tasks.md（进度源唯一），并给出 tick 动词用法
Given 测试 相关模块就绪
When flow start 执行循环文案改第一人称时序「做一件→测试绿→当场勾一格→下一件」，点名 harness TodoWrite 类工具不替代 tasks.md
Then 行为符合本条标准描述

### FR-03: tasks.md 机器稿头注（flow-draft 源）同步该时序与 tick 用法
Given 系统就绪
When tasks.md 机器稿头注（flow-draft 源）同步该时序与 tick 用法
Then 行为符合本条标准描述

### FR-04: AGENTS.md 核心规则新增边干边勾常驻条目（init 模板源如在场则同步）
Given 系统就绪
When AGENTS.md 核心规
Then 新增边干边勾常驻条目（init 模板源如在场则同步）

### FR-05: flow done 勾选缺失 advisory 去掉「区间有提交」前提：全未勾零提交也显形（不阻断）
Given 系统就绪
When flow done 勾选缺失 advisory 去掉「区间有提交」前提：全未勾零提交也显形（不阻断）
Then 行为符合本条标准描述

### FR-06: 任务面仍为机器镜像稿且全未勾时 done 机器代勾全部镜像行（autopilot_ticked 留痕、可辨代勾来源），不拒收
Given 系统就绪
When 任务面仍为机器镜像稿且全未勾时 done 机器代勾全部镜像行（autopilot_ticked 留痕、可辨代勾来源），不拒收
Then 行为符合本条标准描述

### FR-07: 新增聚焦测试：task tick 直测（幂等/指针/未知 id）+ done advisory 与代勾行为测
Given 测试 / 幂等 相关模块就绪
When 新增聚焦测试：task tick 直测（幂等/指针/未知 id）+ done advisory 与代勾行为测
Then 行为符合本条标准描述

### FR-08: 既有测试回归绿
Given 测试 相关模块就绪
When 既有测试回归绿
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
