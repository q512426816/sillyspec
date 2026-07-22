---
id: task-03
title: verify-postcheck 支持 test_strategy:module 子集测试
title_zh: verify-postcheck 支持 test_strategy:module 子集测试
author: qinyi
created_at: 2026-07-10 22:51:30
priority: P0
depends_on: []
blocks: []
requirement_ids: []
decision_ids: [D-002@v1]
allowed_paths:
  - src/verify-postcheck.js
  - test/verify-postcheck-module.test.mjs
---

## goal
让 runVerifyTestCheck 在 `test_strategy: module` 时只跑 git diff 命中的模块子集测试，避免 monorepo 全量 commands.test 12min 超 gate timeout。

## implementation
- 解析 local.yaml 顶层 `test_strategy`（full|module，默认 full）与 `modules` 映射（`<name>: { path, test }`），正则解析与 extractTestCommand 同风格，不引 yaml 依赖
- `module` 策略：用 git diff（worktree 有未提交改动走 unstaged，否则 base..head）算出变更文件列表，命中哪些 `module.path` 前缀 → 收集对应 module（去重保序）
- 串行跑命中的 module.test（每个各自 TEST_TIMEOUT_MS），结果聚合：全 passed→passed，任一 failed→failed；多模块时 command 字段写聚合描述、outputTail 合并各模块尾部
- 每个模块各自结果落盘 `.runtime/verify-runs/<ts>/`（复用现有 runDir 目录与写入风格，可按模块名分子文件或聚合到 test-result.json）
- fallback：无 modules 配置 / 无命中 → 回退现有 commands.test（extractTestCommand），brownfield 行为不变
- 返回结构字段不变（status/command/exitCode/durationMs/outputTail/reason/resultPath），调用方无需改动

## acceptance
- `test_strategy: module` 且 diff 命中 N 个模块时，只跑对应子集（不跑未命中模块、不跑全量）
- 聚合 status 正确：全 passed→passed，任一 failed→failed
- brownfield：local.yaml 无 `modules` 或无 `test_strategy` 时 fallback commands.test，行为与现状完全一致
- runVerifyTestCheck 返回字段兼容（status/command/exitCode/outputTail/reason/resultPath 不增不减）
- `npm test` 含新增 verify-postcheck-module.test.mjs 且全绿

## verify
- `npm test`（含 verify-postcheck-module.test.mjs）

## constraints
- 不改 src/machine-interface.js（gate/derive verify-test 仅透传聚合 status，对外不变）
- 不改 runVerifyTestCheck 入参签名（{ cwd, specBase, changeName }）
- brownfield 无 modules / 无 test_strategy 时行为与现状一致（commands.test 整跑）
- 不引 yaml 依赖，用正则解析（与 extractTestCommand / scan-postcheck / worktree-deps 风格一致）

## provides
（无跨 task 契约）

## expects_from
（无）
