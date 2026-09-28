---
author: flow-machine-draft
created_at: 2026-09-28T13:39:36.124Z
---
# 需求规格（Requirements）— 2026-09-28-knowledge-score-denoise

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 评分只计内容字符（剥除数字与标点后取 bigram），变更名纯数字/ASCII 场景下各条目内容得分
Given 系统就绪
When 评分只计内容字符（剥除数字与标点后取 bigram），变更名纯数字/ASCII 场景下各条目内容得分为零
Then 零分平局

### FR-02: 主场景（枚举/开放世界标题词）与近义场景（穷举/关键词表）排序不回归
Given 系统就绪
When 主场景（枚举/开放世界标题词）与近义场景（穷举/关键词表）排序不回归
Then 行为符合本条标准描述

### FR-03: 新增用例：ASCII 变更名（unmapped-drill 形态）下 D-001 死路条目置顶
Given 系统就绪
When 新增用例：ASCII 变更名（unmapped-drill 形态）下 D-001 死路条目置顶
Then 行为符合本条标准描述

### FR-04: npm test 全量与 test:core 全绿
Given 系统就绪
When npm test 全量与 test:core 全绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-reason-overlap.test.mjs「⑤ ASCII 变更名死路置顶／②主场景／①近义回归」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-reason-overlap.test.mjs「⑤ ASCII 变更名死路置顶／②主场景／①近义回归」

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-reason-overlap.test.mjs「⑤ ASCII 变更名死路置顶／②主场景／①近义回归」

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-reason-overlap.test.mjs「⑤ ASCII 变更名死路置顶／②主场景／①近义回归」
