---
author: flow-machine-draft
created_at: 2026-09-28T16:48:52.215Z
---
# 需求规格（Requirements）— 2026-09-29-knowledge-vector-recall

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: 检索分层：路由 tag 命中 →（零命中）平台向量召回 → 本地词片复现窗口 → 空
Given 系统就绪
When 检索分层：路由 tag 命中
Then （零命中）平台向量召回

### FR-02: 平台只做语义召回（spec_path+anchor+score 候选），条目 status/deat
Given 系统就绪
When 平台只做语义召回（spec_path+anchor+score 候选），条目 status/deathPath/回显资格全部本地解析（文件是真相源）
Then 行为符合本条标准描述

### FR-03: 端点契约 POST /api/spec/knowledge/vector-search（Bearer
Given 端点 / api 相关模块就绪
When 端点契约 POST /api/spec/knowledge/vector-search（Bearer token，query+limit
Then results[{spec_path,anchor,score}]）

### FR-04: 平台未实现期间任何失败（未连接/404/超时/网络）静默降级本地层，检索面永不因平台故障阻断
Given 系统就绪
When 平台未实现期间任何失败（未连接/404/超时/网络）静默降级本地层，检索面永不因平台故障阻断
Then 行为符合本条标准描述

### FR-05: local.yaml knowledge.vector_search: off 可关
Given 系统就绪
When local.yaml knowledge.vector_search: off 可关
Then 行为符合本条标准描述

### FR-06: 四消费方（flow 注入段/complete 门/prompt {DECISION_HITS}/kn
Given 系统就绪
When 四消费方（flow 注入段/complete 门/prompt {DECISION_HITS}/knowledge search CLI）走 hybrid
Then 行为符合本条标准描述

### FR-07: 既有同步 matchKnowledge 行为零变化（其他调用方不动）
Given 系统就绪
When 既有同步 matchKnowledge 行为零变化（其他调用方不动）
Then 行为符合本条标准描述

### FR-08: mock 平台服务器实测：命中/404 降级/宕机降级/超时降级/开关关闭/路由命中不触发平台 六面
Given 系统就绪
When mock 平台服务器实测：命中/404 降级/宕机降级/超时降级/开关关闭/路由命中不触发平台 六面 + 真实库锚点映射正确
Then 行为符合本条标准描述

### FR-09: 既有测试与 test:core 全绿
Given 测试 相关模块就绪
When 既有测试与 test:core 全绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」＋既有检索面全回归（32/32）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」＋既有检索面全回归（32/32）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」＋既有检索面全回归（32/32）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」＋既有检索面全回归（32/32）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」＋既有检索面全回归（32/32）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」＋既有检索面全回归（32/32）

<!--AGENT:测试绑定FR-07 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」＋既有检索面全回归（32/32）

<!--AGENT:测试绑定FR-08 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」＋既有检索面全回归（32/32）

<!--AGENT:测试绑定FR-09 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/knowledge-vector-recall.test.mjs「①命中面／②③④降级三面／⑤⑥触发纪律／⑦真实库锚点映射」＋既有检索面全回归（32/32）
