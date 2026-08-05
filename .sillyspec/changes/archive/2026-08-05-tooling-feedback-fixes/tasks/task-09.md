---
id: task-09
title: execute/verify 铁律前台同步跑文案
title_zh: 铁律加「长测试前台同步跑」软缓解后台任务被 kill
author: qinyi
created_at: 2026-08-05 22:13:45
priority: P2
depends_on: []
blocks: []
requirement_ids: [FR-08]
decision_ids: [D-06@v1]
allowed_paths:
  - src/stages/execute.js
  - src/stages/verify.js
---

## goal

execute/verify 铁律各加一条「长测试/构建前台同步跑，避免后台任务被会话生命周期回收」prompt 文案。问题 6（后台 bash 被 kill）是 harness 行为，本仓无法控制，仅 prompt 软缓解。

## implementation

prompt only，无逻辑改动。两处落地：

- **verify.js**：`definition._globalGuardrails`（src/stages/verify.js:8-35）的「只允许的操作」段追加一条——运行长测试/构建/lint 命令时**前台同步执行**，禁止 `run_in_background:true` / `&` / `nohup` / `disown`，后台任务易被会话生命周期回收导致中断无果。
- **execute.js**：无 `_globalGuardrails` 字段（铁律走 prompt.js 通用注入或步骤内 `### 铁律` 段）。在 acceptanceSteps 的「运行测试」步骤（src/stages/execute.js:237-256）prompt 内追加 `### 铁律` 子段，文案同上（前台同步跑测试/lint，禁后台）。

不动 prompt.js（不在 allowed_paths，且其通用铁律跨阶段共用，本任务不掺合）。

## acceptance

- execute.js「运行测试」步骤 prompt 含「前台同步执行」铁律条；
- verify.js `_globalGuardrails` 含「前台同步执行」铁律条；
- docs/prompt 重提取后一致（task-10 跑 `node docs/prompt/_extract.mjs` 同步 md 镜像）。

## verify

- `node test/stage-definitions.test.mjs`（若含铁律文本断言需同步 expectation）；
- `npm run lint`。

## constraints

- prompt only，不改逻辑、不改 stage 流转、不改 prompt.js；
- 触发 docs/prompt 同步——延后到 task-10 跑 `_extract.mjs` 统一刷新，本任务不动 md 镜像。

## related_tests

- test/stage-definitions.test.mjs（若对 execute/verify 铁律字符串有逐字断言，同步增改 expectation）
