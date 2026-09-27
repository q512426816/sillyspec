---
author: flow-machine-draft
created_at: 2026-09-27T09:44:22.951Z
---
# 需求规格（Requirements）— 2026-09-27-tool-debt-cleanup

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: patch 冻结面提交面过滤保留 .sillyspec 目录下的 docs 交付文档（dogfood
Given 系统就绪
When patch 冻结面提交面过滤保留 .sillyspec 目录下的 docs 交付文档（dogfood 模块卡不再漏），过滤逻辑抽为 flow-parity 导出
Then 行为符合本条标准描述

### FR-02: 变更目录遍历排除 flow-state.yaml 运行态（未跟踪机器件不入审计 patch）
Given 系统就绪
When 变更目录遍历排除 flow-state.yaml 运行态（未跟踪机器件不入审计 patch）
Then 行为符合本条标准描述

### FR-03: _module-map.yaml 的 cli-entry paths 登记 ui-visual.js
Given 系统就绪
When _module-map.yaml 的 cli-entry paths 登记 ui-visual.js 与 hunk-attribution.js
Then 行为符合本条标准描述

### FR-04: test-bindings.js 去除 normalizeTestsRootRel 冗余导出（内部消
Given 系统就绪
When test-bindings.js 去除 normalizeTestsRootRel 冗余导出（内部消费保留），check-syntax 本仓侧清零
Then 行为符合本条标准描述

### FR-05: 单测锁定过滤纯函数行为（模块卡保留、他侧变更目录滤除、本变更目录保留、非 sillyspec 保留）
Given 系统就绪
When 单测锁定过滤纯函数行为（模块卡保留、他侧变更目录滤除、本变更目录保留、非 sillyspec 保留）
Then 行为符合本条标准描述

### FR-06: 既有冻结语义其余行为零变化（dirty 切分、exclusive 并入、sha256 锚定不动）
Given 系统就绪
When 既有冻结语义其余行为零变化（dirty 切分、exclusive 并入、sha256 锚定不动）
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/filter-committed-face.test.mjs「.sillyspec/docs/ 交付文档保留（模块卡不再漏出审计 patch）」

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：walk 排除为控制流一行（node --check + flow done 实测覆盖），无独立断言面

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：YAML 登记核对（check-syntax 未录 module-map 清零实测）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：去导出核对（check-syntax 未引用导出清零实测 pass 1 fail 0）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/filter-committed-face.test.mjs 全部 5 用例（node --test 实测 5 pass 0 fail）

<!--AGENT:测试绑定FR-06 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/filter-committed-face.test.mjs「非 .sillyspec 交付全留」「本变更目录治理工件保留，他侧变更目录滤除」「knowledge 与他侧 docs 外的 .sillyspec 面仍滤除」+ 共享文件 hunk 核对（git diff 5 hunk 全属本变更）
