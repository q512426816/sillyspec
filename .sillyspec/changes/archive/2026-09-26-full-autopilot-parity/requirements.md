---
author: flow-machine-draft
created_at: 2026-09-26T10:50:12.876Z
---
# 需求规格（Requirements）— 2026-09-26-full-autopilot-parity

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: execute --done 自动勾选
Given execute 阶段 --done 时 tasks.md 有未勾条目且近 20 提交含 task-NN token
When complete.js execute 完成路径解析 token 并代勾
When 有证据但未勾的条目被自动勾选；已勾不重复操作

### FR-02: verify --done 自动绑定
Given verify 阶段测试门已跑（test-result.json 在场）且 requirements.md 有空绑定槽
When gates.js verify 测试门后从测试结果提取文件路径补全空槽
When 空槽被自动补全（agent 可覆盖）；无测试结果 fail-soft

### FR-03: 向后兼容与边界
Given 已有 agent 填写/勾选的内容
When 两条自动机制运行
Then 不覆盖；auto-bind 在复用分支（ledger-reuse/scan-reuse）不触发；GWT 预填不迁移（来源不同）
### FR-02: verify --done 自动绑定：verify 阶段收口测试门之后（test-result.js
Given 测试 相关模块就绪
When verify --done 自动绑定：verify 阶段收口测试门之后（test-result.json 已生成），从测试结果自动补全空绑定槽——与 thin 
Then 行为符合本条标准描述

### FR-03: GWT 预填不迁移（来源不同：full 的 requirements 来自对话演化非 input 文
Given 迁移 相关模块就绪
When GWT 预填不迁移（来源不同：full 的 requirements 来自对话演化非 input 文本——brainstorm 步骤 8 已有 design 可
Then 行为符合本条标准描述

### FR-04: 两条均向后兼容（已有内容不覆盖）
Given 系统就绪
When 两条均向后兼容（已有内容不覆盖）
Then 行为符合本条标准描述

### FR-05: 测试：execute auto-tick 接线钉+verify auto-bind 接线钉+既有套件
Given 测试 相关模块就绪
When 测试：execute auto-tick 接线钉+verify auto-bind 接线钉+既有套件零回归
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（空槽将在 flow done 自动补全） -->
test/run-complete-noai-done-gate.test.mjs 零回归（execute --done 原语义不变）+ 接线钉

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（空槽将在 flow done 自动补全） -->
test/governance-autopilot.test.mjs 用例③（同逻辑钉）+ verify 相关套件零回归

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（空槽将在 flow done 自动补全） -->
test/flow-protocol.test.mjs 26 用例零回归

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段
<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：机器摘录拆行残段
