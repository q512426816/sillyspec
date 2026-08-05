---
id: task-02
title: H2 validateScriptCommands + 单测
title_zh: 抽共享 validateScriptCommands 命令存在性校验（monorepo 感知）
author: qinyi
created_at: 2026-08-05 22:13:45
priority: P0
depends_on: []
blocks: [task-06]
requirement_ids: [FR-07]
decision_ids: [D-01@v1]
allowed_paths:
  - src/stages/cmd-existence.js
  - test/cmd-existence.test.mjs
provides:
  - contract: validateScriptCommands
    fields: [invalid, checked]
---

## goal
抽 `validateScriptCommands(text, { projectRoot, modules })` 共享校验器，照搬 scan-postcheck.js:118-158 的 `npm run <script>` 存在性判定模板，扩展到 pnpm/yarn，并感知 monorepo 子目录（`cd <subdir> &&` 前缀或 local.yaml `modules` 块定位）。

## implementation
新建 `src/stages/cmd-existence.js` export `validateScriptCommands(text, { projectRoot, modules })`：
- 正则 `/(npm|pnpm|yarn)\s+run\s+(\S+)/g` 提取全部命令（对齐 scan-postcheck:136 的 `/npm run (\S+)/g`，扩展包管理器）。
- 识别 `cd <subdir> && <cmd>` 前缀 → 读 `<projectRoot>/<subdir>/package.json` 的 scripts；无前缀且有 `modules` 块 → 按 module.path 定位子包；都无 → 读 `<projectRoot>/package.json`。
- modules 块结构沿用 verify-postcheck-module.test.mjs:83-86（`{ path: "backend/", test: "cd backend && ..." }`），传入即解析，未传回退根包。
- 返回 `{ invalid: [{ cmd, reason }], checked }`；找不到 script 入 `invalid`，reason 形如 `package.json 无 <script> script`（沿用 scan-postcheck:144 文案）。
- 包 JSON 解析失败 / 文件缺失 → 跳过该校验（不抛），与 scan-postcheck:147 `try {} catch {}` 行为一致。

## acceptance
- test/cmd-existence.test.mjs 覆盖：npm/pnpm/yarn run 各一例、`cd <subdir> &&` 前缀、modules 块定位、根 package.json、找不到 script 入 invalid。
- 命令存在 → 不入 invalid；命令缺失 → 入 invalid 且 reason 含 script 名。
- 仅校验 `npm|pnpm|yarn run`，其他命令（pnpm install / npx tsc / uv run）不校验（沿用 scan-postcheck:126-129 注释立场）。

## verify
`node test/cmd-existence.test.mjs`（绿）。本 task 不接 scan/plan-postcheck，scan 套件无需跑。

## constraints
- 仅校验 npm/pnpm/yarn run；install/typecheck 等直接包管理器调用不在范围。
- 不改 scan-postcheck.js / plan-postcheck.js 调用方（task-06 接入）。
- 路径用 `join`，Windows/Linux 兼容。

## related_tests
- test/cmd-existence.test.mjs（本 task 新增）
- test/scan-postcheck.test.mjs（task-06 会改，本 task 不动）
