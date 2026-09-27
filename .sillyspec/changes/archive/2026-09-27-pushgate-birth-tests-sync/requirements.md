---
author: flow-machine-draft
created_at: 2026-09-27T15:23:27.784Z
---
# 需求规格（Requirements）— 2026-09-27-pushgate-birth-tests-sync

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: test/state-machine-guards.test.mjs 全绿（1a 守卫恢复拦截）
Given 系统就绪
When test/state-machine-guards.test.mjs 全绿（1a 守卫恢复拦截）
Then 行为符合本条标准描述

### FR-02: 仅改测试期望与 fixture，不动 src/stage-contract.js 任何运行逻辑
Given 测试 相关模块就绪
When 仅改测试期望与 fixture，不动 src/stage-contract.js 任何运行逻辑
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/state-machine-guards.test.mjs｜1a. brainstorm 态直跑 verify --done → exit(1) 拦截（真在 brainstorm 中 fixture 守卫断言组）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/stage-contract.test.mjs｜状态转换测试表 brainstorm→execute 双行（真入门 in-progress 拦截 + 出生未入门放行）
不适用（src 零改动约束）：本变更不动 src/stage-contract.js 运行逻辑——无行为面需独立断言，语义正确性由 eb3b4bce 的⑤组 9 断言与本表真入门行共同背书
