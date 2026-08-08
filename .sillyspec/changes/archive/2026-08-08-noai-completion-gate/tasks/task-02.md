---
id: task-02
title: complete.js completeStep 阶段完成分支接入 completeStageGates（替换六段收尾 + 移除守卫/warning）
title_zh: completeStep 接入 completeStageGates
author: qinyi
created_at: 2026-08-08 08:41:43
allowed_paths:
  - src/run/complete.js
---

## 目标
completeStep 阶段完成分支（complete.js:333-475）把 handleScanStageCompleted + validateMetadata + validateFileLocations + auxiliary 重置 + runStageCompletionGates + handleExecuteWorktreeCleanup 六段收尾序列替换为单个 `completeStageGates(...)` 调用；移除两处 `actualCompleted===actualTotal` 守卫(389/463) + 466-469 warning 分支（均移入共享函数、计数改 `completed‖skipped`），消除 S3（design §5.2.1 / §9 / FR-03 / FR-05）。

## allowed_paths
- src/run/complete.js

## 验收标准
- 六段（378-407 + 462-472）替换为 `const _r = await completeStageGates({ stageName, cwd, changeName, platformOpts, specBase, progress, pm, stageData, steps, currentIdx, outputText }); if (_r) return _r`。
- 删除 `actualCompleted`/`actualTotal` 局部变量(382-384)（守卫移入共享函数后本文件不再引用）。
- import 清理：gates.js 行改为 `import { enforceDepsGate, enforceReviewJsonGate, completeStageGates } from './gates.js'`（validateMetadata/validateFileLocations/runStageCompletionGates 接入后不再直接调用，移除）；complete-handlers.js 行移除 `handleScanStageCompleted`、`handleExecuteWorktreeCleanup`（改由 completeStageGates 内部调）。
- completeStep 自管部分零改动：handleQuickStageCompletion(346) / reopen 回填(354-363) / 标 stage completed+落盘(365-368) / triggerSync(369) / user-inputs(371-376) / `✅ 阶段已完成` log + 下一步提示(409-460)。

## 依赖
- **expects_from: task-01** — `completeStageGates`（gates.js export）已就绪 + validateMetadata/validateFileLocations 已迁 gates.js。本 task 仅 import + 调用。
- **blocks**: task-05（T4 gate 阻断路径）/ task-06（T5 scan skip optional 经 completeStep 仍跑 validateScanOutputs）。
- **reads**: `completeStageGates` 签名（design §7）；enforceDepsGate/enforceReviewJsonGate 保持原位(257/260)。

## 实现要点
- **调用定位**：completeStageGates 在「标 completed + 落盘 + triggerSync + user-inputs」之后、`✅ 阶段已完成` log + 下一步提示(409-460) 之前调用。completeStageGates 内 handleScanStageCompleted 或 runStageCompletionGates 任意 early-return → 透传返回、跳过提示（scan 早返与现状 380 一致；gate fail 回滚为 in-progress 时不打"下一步"提示——本就回滚、提示会误导，属 §9「行为基本保持」内合理收紧）。
- **守卫/warning 不重现**：389/463 守卫与 466-469 warning 已由 task-01 移入 completeStageGates 内部（`completed‖skipped === steps.length`），completeStep 不再自做计数。
- **outputText 透传**：原 handleScanStageCompleted(379) 用的 outputText 须列入 completeStageGates 入参，不能丢。
- **范围**：只改 completeStep 阶段完成分支；单步推进分支(477+) / continueStep / skipStep / waitStep 不动（continueStep 接入 = task-03）。

## TDD
本 task 不写新测试——completeStep 路径由现有 9 个 `run-complete-step-*` characterization 测试（import `_completeStepForTest`）守护不回归；共享函数行为由 task-05（T1-T4）/ task-06（T5-T8）复现测试覆盖。验收 = `npm test` 全绿（现有 completeStep 测试不破）+ `npm run lint` 通过（无 unused import）。
