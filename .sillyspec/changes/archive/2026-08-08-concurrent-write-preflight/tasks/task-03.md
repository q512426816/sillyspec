---
id: task-03
title: execute --done concurrent preflight hook
title_zh: execute 完成门接入并发预检 warn
author: qinyi
created_at: 2026-08-08 13:16:00
priority: P0
depends_on: [task-01]
blocks: [task-04]
requirement_ids: [FR-06, FR-07]
decision_ids: [D-002@v1]
allowed_paths:
  - src/run/gates.js
---

## goal
> 在 gates.js completeStageGates 入口 guard stageName 为 execute 处接入 detectConcurrentChanges，有他者并发则 console.warn，不阻断 gate。

## implementation
- Edit 前重读 gates.js 最新态，在 completeStageGates 函数入口（约 508 行）加 guard，仅 stageName 为 execute 时执行预检
- ownFiles 源钉死（D-002 + B-002）：动态 import WorktreeManager 取 meta.mode（先例 gates.js:348 / complete-handlers.js:736）；meta.mode 非 in-place-fallback（worktree 模式）→ ownFiles 为空（主仓 git status 看不见本变更交付文件，无害）；in-place-fallback → ownFiles 读本变更 design.md §6 文件清单（解析 changeDir/design.md 提取文件路径）
- 不用模糊的「worktree applied 文件」（WorktreeManager 无 appliedFiles 字段，B-002 已证）
- 有警告则 console.warn，不阻断 gate 级联

## acceptance
- execute --done 有他者并发时打印 warn，gate 通过性不变
- in-place 模式下本变更交付文件（design §6 清单）不进 foreignFiles（D-002）
- worktree 模式下 ownFiles 为空（主仓看不见交付文件，无害）
- 无他者并发时零额外输出

## verify
- node -e 验证 guard 不影响其他 stage（集成行为由 task-04 覆盖）

## constraints
- guard 仅 stageName 为 execute 触发，不影响其他 stage 的 completeStageGates
- 钩子纯副作用，不改 gate-status.json 不改 stageData（FR-07）
- ownFiles 源 in-place 用 design §6 清单，不轻易留空（in-place 噪音）
- 若 warn 输出致 execute 完成路径既有测试 console 断言失效，定位该测试并调整（execute 完成测试名 execute 时再确认，可能为 run-complete 相关或 execute-completion-gate 类）
