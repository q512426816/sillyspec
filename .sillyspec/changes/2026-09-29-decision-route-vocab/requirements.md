---
author: flow-machine-draft
created_at: 2026-09-28T16:24:44.398Z
---
# 需求规格（Requirements）— 2026-09-29-decision-route-vocab

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: syncIndexRoutingLines（decisions 侧）按域从条目标题∪理由行派生稀有词
Given 增量 / 幂等 相关模块就绪
When syncIndexRoutingLines（decisions 侧）按域从条目标题∪理由行派生稀有词片（出现≤3 次的 CJK bigram／≥4 字符 ASC
Then 行为符合本条标准描述

### FR-02: 真实库 reconcile 后：查询「谓词守卫」「顿号拆分」路由命中（matched 且指向 dec
Given 系统就绪
When 真实库 reconcile 后：查询「谓词守卫」「顿号拆分」路由命中（matched 且指向 decisions/unmapped.md）
Then 行为符合本条标准描述

### FR-03: 「枚举词表」既有命中不回归
Given 系统就绪
When 「枚举词表」既有命中不回归
Then 行为符合本条标准描述

### FR-04: 蒸馏入选条目标题必填：裸号条目（## D-xxx@vN 无标题）needsWait 拦截（对齐 re
Given 系统就绪
When 蒸馏入选条目标题必填：裸号条目（## D-xxx@vN 无标题）needsWait 拦截（对齐 rejected 缺否决理由先例），存量夹具适配或降级为告警以实
Then 行为符合本条标准描述

### FR-05: 既有蒸馏/知识测试回归全绿
Given 测试 相关模块就绪
When 既有蒸馏/知识测试回归全绿
Then 行为符合本条标准描述

### FR-06: test:core 全绿
Given 系统就绪
When test:core 全绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」＋decisions-lifecycle·supersede 夹具适配回归

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」＋decisions-lifecycle·supersede 夹具适配回归

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」＋decisions-lifecycle·supersede 夹具适配回归

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」＋decisions-lifecycle·supersede 夹具适配回归

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」＋decisions-lifecycle·supersede 夹具适配回归

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/decision-route-vocab.test.mjs「①标题必填／②回退三面／③真实库钉子」＋decisions-lifecycle·supersede 夹具适配回归
