---
author: flow-machine-draft
created_at: 2026-09-30T02:10:52.595Z
---
# 需求规格（Requirements）— 2026-09-30-docs-gate-zero

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-01: docs check 全量 0 失效（total 扫描面不变：docs/ + .sillyspec/
Given 系统就绪
When docs check 全量 0 失效（total 扫描面不变：docs/ + .sillyspec/docs/ + .sillyspec/changes/ + 
Then 行为符合本条标准描述

### FR-02: docs gate --init-baseline 落 0 且 gate 通过（279→0，基线文件
Given 系统就绪
When docs gate --init-baseline 落 0 且 gate 通过（279
Then 0，基线文件 .sillyspec/docs-check-baseline 372

### FR-03: 跨仓引用全部显式 repo://sillyhub 前缀（不靠 skip/豁免藏数），本机映射下层1+
Given 系统就绪
When 跨仓引用全部显式 repo://sillyhub 前缀（不靠 skip/豁免藏数），本机映射下层1+层2 实测通过
Then 行为符合本条标准描述

### FR-04: pre-push 三道关（lint + 全量测试 + docs gate --against HEA
Given 测试 相关模块就绪
When pre-push 三道关（lint + 全量测试 + docs gate --against HEAD）全绿
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：纯文档态成果、无测试文件。验证面 = CLI 实测 `sillyspec docs check --json` → invalid:0（total 856 引用全过），扫描面缺省四路径未收窄；后续由 docs gate ratchet（基线 0）常态把守——任何新增失效即拦推送。

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：基线文件态成果。验证面 = CLI 实测 `docs gate --init-baseline`（.sillyspec/docs-check-baseline 372→0 落盘）+ `docs gate` 放行（0 失效 = 基线 0）。gate 机制自身的回归面在既有 test/docs-gate.test.mjs（本变更未触及 src，零改动零回归）。

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：文档引用形态成果。验证面 = 本机 cross_repo_roots 映射（sillyhub → multi-agent-platform）在场时 docs check 对全部 repo://sillyhub/ 引用走层1（行界）+层2（关键词窗口）实测通过（invalid=0 即含此面）；未配映射设备自动跳过不计失效（docs-check.js 既有契约，防跨设备误报）。

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
不适用：推送钩子实测验收。验证面 = 本变更 push 时 `.husky/pre-push` 亲自执行 npm run lint（862 文件）+ npm test 全量 + `docs gate --against HEAD`（按被推送提交树校验）三道关——收口后推送即实测，全绿为验收。
