---
author: flow-machine-draft
created_at: 2026-09-27T09:01:58.457Z
---
# 需求规格（Requirements）— 2026-09-27-confirm-on-use

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: readActiveFrDigest 条目携带 unconfirmed 绑定计数（读条目内 - ro
Given 系统就绪
When readActiveFrDigest 条目携带 unconfirmed 绑定计数（读条目内 - row: 块的 confirmed_by≠agent 行）
Then 行为符合本条标准描述

### FR-02: 知识注入面：未确认条目带 ⚪N未确认 标记
Given 系统就绪
When 知识注入面：未确认条目带 ⚪N未确认 标记
Then 行为符合本条标准描述

### FR-03: 追加一条抽查确认提示（至多点名 2 个未确认 anchor——相符则收口前 sillyspec te
Given 测试 相关模块就绪
When 追加一条抽查确认提示（至多点名 2 个未确认 anchor——相符
Then 收口前 sillyspec tests confirm --anchor <id> --evidence <真实测试路径>，不符留给 knowledge dig

### FR-04: 新增 tests confirm 子命令：--anchor + --evidence（必须可自仓根解
Given 系统就绪
When 新增 tests confirm 子命令：--anchor + --evidence（必须可自仓根解析为真实文件，机械防橡皮图章）
Then 该条目全部 candidate 机器行翻 active（confirmed_by=agent, confirmed_at=HEAD）

### FR-05: 已是 active 幂等提示
Given 幂等 相关模块就绪
When 已是 active 幂等提示
Then 行为符合本条标准描述

### FR-06: 无绑定行
Given 系统就绪
When 无绑定行
Then 行为符合本条标准描述

### FR-07: 证据不可解析拒绝 exit 1
Given 系统就绪
When 证据不可解析拒绝 exit 1
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
