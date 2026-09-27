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
test/confirm-on-use.test.mjs「① readEntryUnconfirmed」（candidate 计 1/agent 计 0/无绑定块 0）+「②③ unconfirmed 透传」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/confirm-on-use.test.mjs「②③ 注入面」（⚪1未确认标记、抽查提示点名 anchor 带 confirm 指引、确认后标记与提示双消失）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/confirm-on-use.test.mjs「④ CLI tests --confirm」（证据解析→1/1 翻 active 落盘、幂等提示、坏证据 exit 1、无绑定行拒绝）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/confirm-on-use.test.mjs「④」（nope.test.mjs 证据拒绝路径——resolveTestFileRel 机械校验实证）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/confirm-on-use.test.mjs「④」幂等分支（全 active → 已 active（幂等，无需确认）提示，不写盘）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/confirm-on-use.test.mjs「④」无绑定行分支（FR-core-999 → exit 1 无绑定行）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/confirm-on-use.test.mjs「④」坏证据分支（nope.test.mjs → exit 1 证据路径不可解析）
<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：整体验证面——test:core exit 0 + 触达面 44 绿（含 flow-protocol/thin-fr-inject-parity 注入面回归）