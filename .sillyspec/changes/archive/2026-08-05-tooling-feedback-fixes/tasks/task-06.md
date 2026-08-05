---
id: task-06
title: plan-postcheck validateTaskCommands + scan 改调 H2
title_zh: plan 阶段校验 TaskCard 命令存在性硬阻断，scan 改调共享 helper
author: qinyi
created_at: 2026-08-05 22:13:45
priority: P0
depends_on: [task-02]
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-04@v1]
allowed_paths:
  - src/stages/plan-postcheck.js
  - src/scan-postcheck.js
  - test/plan-postcheck.test.mjs
  - test/scan-postcheck.test.mjs
expects_from:
  task-02:
    - contract: validateScriptCommands
      needs: [invalid, checked]
---

## goal
plan-postcheck 新增 `validateTaskCommands` 硬阻断（调 task-02 的 `validateScriptCommands`）；scan-postcheck 改调同一 helper 去重两处命令校验。

## implementation
- **plan-postcheck.js 新增 `validateTaskCards`**：遍历 `tasks/task-NN.md`，从 `verify:`/`implementation:` 字段抓 `npm run`/`pnpm <script>` 命令，调 `validateScriptCommands`（task-02 返回 `{ invalid, checked }`）；invalid 非空 push error。沿用 `validateBlueprintConsistency`（238-337）的 `{ ok, errors, warnings }` 范式，TaskCard 读取复用 `parseTaskContracts`（113-145）的 LF 归一套路。
- **executePlanPostcheck (648)**：紧挨 `validateCrossTaskContracts`（1c 段、705-712）之后注册，errors 非空 throw，打印对齐既有 1c/1d 块。
- **scan-postcheck.js (118-158)**：内联 `/npm run (\S+)/g` + `pkg.scripts` 对账（130-149）换为 `validateScriptCommands(localYamlPath, cwd)`，维持 `CHECK_SEVERITY.WARNING`（152-157 不升 error）。

## acceptance
- TaskCard `verify:` 写 `pnpm gen:types` 但根 package.json 无（仅子包 `packages/*` 有）→ error 阻断；命令存在 → 通过。
- scan-postcheck 行为不变：local.yaml 缺命令仍 WARNING，不升 FAILED。helper 双严重度由调用方定（plan error / scan warning）。

## verify
`node test/plan-postcheck.test.mjs`（增 validateTaskCommands 硬阻断用例：缺命令→error / 存在→pass）+ `node test/scan-postcheck.test.mjs`（不回归）。

## constraints
- plan 升 error / scan 维持 warning——同一 helper，严重度由调用方定；helper 只返回 invalid 不自带严重度。
- monorepo 子目录感知（`packages/*/package.json`）；不改 task-02 契约；不误抓 install/typecheck（scan-postcheck 126-129 既有边界）。

## related_tests
- test/plan-postcheck.test.mjs（新建——仓库现仅 `plan-postcheck-crlf.test.mjs`，本 task 建主测试文件）
- test/scan-postcheck.test.mjs（改调用方，断言不回归）
