---
author: flow-machine-draft
created_at: 2026-09-28T13:11:00.997Z
---
# 需求规格（Requirements）— 2026-09-28-knowledge-inject-ranking

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 查询含枚举/词表/开放世界时，D-001@v1「枚举开放世界是错误方向」出现在 decisionHi
Given 系统就绪
When 查询含枚举/词表/开放世界时，D-001@v1「枚举开放世界是错误方向」出现在 decisionHits 前 5，且 flow start 知识注入段与 kno
Then 行为符合本条标准描述

### FR-02: 理由含「死路：」注记的条目不受 implemented 状态压制，进防复潮优先组并带标记渲染
Given 系统就绪
When 理由含「死路：」注记的条目不受 implemented 状态压制，进防复潮优先组并带标记渲染
Then 行为符合本条标准描述

### FR-03: 无关查询（如 pnpm 语料）不出现否决/死路误注入——精度不回归，主题相关命中仍在
Given 系统就绪
When 无关查询（如 pnpm 语料）不出现否决/死路误注入——精度不回归，主题相关命中仍在
Then 行为符合本条标准描述

### FR-04: 新增真实库钉子测试（枚举词表查询→目标条目必进前 5）
Given 测试 相关模块就绪
When 新增真实库钉子测试（枚举词表查询
Then 目标条目必进前 5）

### FR-05: 既有测试与 npm run test:core 全绿
Given 测试 相关模块就绪
When 既有测试与 npm run test:core 全绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-inject-ranking.test.mjs「排序与死路面」＋test/design-knowledge-check.test.mjs「①-b 死路注记回显」＋test/thin-fr-inject-parity.test.mjs「①否决决策命中回归」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-inject-ranking.test.mjs「排序与死路面」＋test/design-knowledge-check.test.mjs「①-b 死路注记回显」＋test/thin-fr-inject-parity.test.mjs「①否决决策命中回归」

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-inject-ranking.test.mjs「排序与死路面」＋test/design-knowledge-check.test.mjs「①-b 死路注记回显」＋test/thin-fr-inject-parity.test.mjs「①否决决策命中回归」

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-inject-ranking.test.mjs「排序与死路面」＋test/design-knowledge-check.test.mjs「①-b 死路注记回显」＋test/thin-fr-inject-parity.test.mjs「①否决决策命中回归」

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-inject-ranking.test.mjs「排序与死路面」＋test/design-knowledge-check.test.mjs「①-b 死路注记回显」＋test/thin-fr-inject-parity.test.mjs「①否决决策命中回归」
