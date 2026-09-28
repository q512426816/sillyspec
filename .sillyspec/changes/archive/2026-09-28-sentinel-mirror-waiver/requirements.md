---
author: flow-machine-draft
created_at: 2026-09-28T14:14:25.941Z
---
# 需求规格（Requirements）— 2026-09-28-sentinel-mirror-waiver

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: detectFakeCheckCompletion 增任务来源维度：与机器稿基线（route-hin
Given 系统就绪
When detectFakeCheckCompletion 增任务来源维度：与机器稿基线（route-hindsight-baseline 快照）逐字相同的勾选行＝镜像
Then 行为符合本条标准描述

### FR-02: 无基线快照时 fail-safe 维持现行判据（全部要求证据）
Given 系统就绪
When 无基线快照时 fail-safe 维持现行判据（全部要求证据）
Then 行为符合本条标准描述

### FR-03: flow done 拒收文案与 watcher 人判警告不再对镜像勾选触发
Given 系统就绪
When flow done 拒收文案与 watcher 人判警告不再对镜像勾选触发
Then 行为符合本条标准描述

### FR-04: 覆写任务无证据仍拒收（假勾选守卫不弱化）
Given 系统就绪
When 覆写任务无证据仍拒收（假勾选守卫不弱化）
Then 行为符合本条标准描述

### FR-05: 勾选节奏 advisory 仅在存在覆写任务面时提示（镜像面批量勾选不提示）
Given 系统就绪
When 勾选节奏 advisory 仅在存在覆写任务面时提示（镜像面批量勾选不提示）
Then 行为符合本条标准描述

### FR-06: 单测覆盖镜像豁免/覆写守卫/无基线 fail-safe 三态
Given 系统就绪
When 单测覆盖镜像豁免/覆写守卫/无基线 fail-safe 三态
Then 行为符合本条标准描述

### FR-07: 真实演练：镜像全勾单提交无 token 收口通过、覆写任务无证据仍拒收
Given 系统就绪
When 真实演练：镜像全勾单提交无 token 收口通过、覆写任务无证据仍拒收
Then 行为符合本条标准描述

### FR-08: npm test 与 test:core 全绿
Given 系统就绪
When npm test 与 test:core 全绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」＋test/watcher*.test.mjs 回归（45/45）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」＋test/watcher*.test.mjs 回归（45/45）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」＋test/watcher*.test.mjs 回归（45/45）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」＋test/watcher*.test.mjs 回归（45/45）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」＋test/watcher*.test.mjs 回归（45/45）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」＋test/watcher*.test.mjs 回归（45/45）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」＋test/watcher*.test.mjs 回归（45/45）

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/sentinel-mirror-waiver.test.mjs「①镜像豁免／②覆写守卫／③无基线 fail-safe／④边界」＋test/watcher*.test.mjs 回归（45/45）
