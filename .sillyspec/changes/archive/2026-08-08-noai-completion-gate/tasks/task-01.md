---
id: task-01
title: gates.js 新增 completeStageGates + 迁移 validateMetadata/validateFileLocations + import handlers/stageRegistry
title_zh: gates.js 新增 completeStageGates 共享收尾管线
author: qinyi
created_at: 2026-08-08 08:41:43
allowed_paths:
  - src/run/gates.js
  - src/run/complete.js
---

## 目标
在 `src/run/gates.js` 抽出 completeStep 的「阶段完成收尾」序列为共享 `completeStageGates`，并把 `validateMetadata`/`validateFileLocations` 迁入 gates.js export，消除 S1/S2/S3 三处收尾不对称（D-002@v1 / D-003@v1）。

## allowed_paths
- src/run/gates.js
- src/run/complete.js

## 验收标准
- `export async function completeStageGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx, outputText })` 已定义（design §7 接口签名 + outputText 透传给 handleScanStageCompleted）。
- `validateMetadata` / `validateFileLocations` 从 complete.js 迁至 gates.js 并 `export`；complete.js 改 `import { validateMetadata, validateFileLocations } from './gates.js'`。
- gates.js 顶部新增 `import { handleScanStageCompleted, handleExecuteWorktreeCleanup } from './complete-handlers.js'` + `import { stageRegistry } from '../stages/index.js'`（auxiliary 重置判定用），无新循环依赖（complete-handlers.js 不反向 import gates.js）。
- 返回契约：全部通过 `return null`；handleScanStageCompleted 透传 early-return 或 runStageCompletionGates gate 失败（已 rollback）时 `return` 该非 null 对象。
- 守卫计数 `completed||skipped === steps.length`，用入参 `steps`（pre-reset 原数组），非重读 `stageData.steps`。

## 依赖
- **provides**: `completeStageGates`（gates.js export，供 task-02/03/04 三处接入 import）。
- **reads（同模块/已 export）**: `runStageCompletionGates`（gates.js:176）、`rollbackStageCompletion`（gates.js:140，经 runStageCompletionGates→rollbackCompletionAndReturn 间接复用）、`handleScanStageCompleted` / `handleExecuteWorktreeCleanup`（complete-handlers.js）、`stageRegistry`（stages/index.js）。
- **blocks**: task-02 / task-03 / task-04（Wave 2 三处接入）。

## 实现要点
- **调用顺序（design §5.1，严格 = completeStep 现序列）**：handleScanStageCompleted（truthy 透传 early-return）→ validateMetadata → validateFileLocations[仅 `completed||skipped === steps.length` 时跑，修 S3] → auxiliary 重置（`stageDef.auxiliary` 时换 freshSteps + `stageData.status='pending'`）→ `const r = runStageCompletionGates(...); if (r) return r` → handleExecuteWorktreeCleanup → `return null`。
- **§5.4 陷阱（关键）**：auxiliary 重置后 `stageData.steps` 已是 freshSteps（全 pending）。runStageCompletionGates 内的守卫与 `rollbackStageCompletion` **必须用入参 `steps`**（pre-reset 原数组）；若重读 `stageData.steps` 计数恒为 0 → 守卫永久跳过 → 引入新 bug。runStageCompletionGates 签名已接收 `steps`（gates.js:176），传入即可，不要在 completeStageGates 内重读 stageData.steps 替换它。
- **outputText 入参**：handleScanStageCompleted 在原 completeStep 调用（complete.js:379）接收 `outputText`（manifest 落盘/平台 scan 用），completeStageGates 必须把它列入签名并透传，不能丢。
- **顺序安全性（design §5.3）**：auxiliary 重置（status→pending）放 gate 之前安全——`rollbackStageCompletion`（gates.js:140-150）只在 `status==='completed'` 时回滚为 in-progress，已 pending 的 auxiliary 不被覆盖。
- **complete.js 改动仅迁移符号**：删本地 `validateMetadata`/`validateFileLocations` 定义，补 from gates.js import；completeStep 接入（task-02）/ continueStep 接入（task-03）不在本 task 范围。

## TDD
本 task 不直接写测试——`completeStageGates` 行为由 task-05（T1-T4）/ task-06（T5-T8）的复现测试覆盖（plan Wave 3）：T1 plan postcheck review fail 阻断、T3 平台 scan manifest 落盘、T5/T8 skip optional 计数、T6 auxiliary 重置 + manifest。本 task 验收以「`npm test` 全绿 + `npm run lint` 通过 + completeStep 现有 characterization 测试不回归」为准（runStageCompletionGates 序列未变，仅包了一层）。
