---
id: task-06
title: test/noai-completion-gate.test.mjs 追加 T5-T8（S3 计数 / auxiliary 重置+manifest / 双清理回归 / noAI 路径 skip optional）
title_zh: T5-T8 测试（S3/auxiliary/双清理回归）
author: qinyi
created_at: 2026-08-08 08:41:43
allowed_paths:
  - test/noai-completion-gate.test.mjs
---

## 目标
在 task-05 已建 `test/noai-completion-gate.test.mjs`（T1-T4）同文件追加 T5-T8，复现 design §11 剩余四用例：S3 守卫计数（completeStep 与 noAI 末步两路径）、auxiliary 重置 + 平台 manifest（R4）、continueStep 双 worktree 清理回归（D-004@v1/B1）。

## allowed_paths
- test/noai-completion-gate.test.mjs（task-05 创建本文件，本 task 在其末尾追加 T5-T8 四 case，不新建文件）

## 验收标准
- **T5（S3 completeStep 路径）**：scan steps 中任一 optional 步骤 status='skipped'、其余 completed → `--done` 收尾时 `validateScanOutputs`（属 `validateFileLocations` 序列）**仍被调用**（计数 `completed||skipped === steps.length` 满足），不被整体跳过；断言未抛「validator 跳过」类静默放行。
- **T6（S1+R4 auxiliary 重置）**：scan（auxiliary）noAI scanPostcheck 末步完成后 → `stageData.status` 重置回 `pending`（可重跑）+ 平台 `manifest.json` / `SCAN_COMPLETED` 指针落盘（复用 run-complete-step-scan-platform.test.mjs 的 platformOpts/specRoot 桩模式）。
- **T7（D-004@v1 双清理回归）**：execute 经 `continueStep` 完成分支收尾 → `handleExecuteWorktreeCleanup` 只跑一次；mock `WorktreeManager.getMeta` 计数调用次数，断言 stdout 不出现第二次清理产生的误导性 `Worktree: n/a`。
- **T8（S3 noAI 路径）**：noAI 末步路径上 skip optional 步骤 → `validateFileLocations` 仍跑（`completed‖skipped` 计数在 runStage noAI 末步接入 completeStageGates 后也生效）；与 T5 互补，覆盖 stage.js 路径非 completeStep 路径。

## 依赖
- **expects_from**: task-01（`completeStageGates` 定义 + 守卫计数 `completed||skipped` 用入参 `steps`）、task-02（completeStep 接入 + 移除 389/463 旧守卫）、task-03（continueStep 接入 + 删 864-892 内联 cleanup）、task-04（runStage noAI 末步接入）。
- **reads**: `_completeStepForTest`（src/run.js re-export）、`continueStep`（src/run/complete.js:729 export）、`_complete-step-harness.mjs`（runCapturing/makeRepo/initChange/seedStage/cleanup/report）、`WorktreeManager`（src/worktree.js，mock getMeta 用）。

## 实现要点
- **S3 计数（T5/T8）**：种 scan steps 含一个 `status:'skipped'` + 其余 `completed`，末步 pending 触发完成；T5 走 `_completeStepForTest`（completeStep 路径），T8 需驱动 runStage noAI 末步（stage.js:331-358）——后者可经 `continueStep` 或直接调 `completeStageGates` 入口断言 `validateFileLocations` 被命中（计数满足不再早返回）。两 case 互补证明计数修在两接入路径都生效。
- **auxiliary 重置断言（T6）**：复用 run-complete-step-scan-platform.test.mjs 的桩——`writePlatformPointer` + specRoot/.runtime + 7 份 scan 文档齐全（happy 非 failed）→ 断言 `after.stages.scan.status === 'pending'` + `existsSync(manifest.json)` + 指针 `status==='scan_completed'`；与 task-05 T3（platform manifest）区别在 T6 额外锁 auxiliary 重置（pending 可重跑）。
- **双清理 mock（T7）**：`import { WorktreeManager } from '../src/worktree.js'` 后用 monkey-patch（或 import mixin）替换原型 `getMeta` 计数器，驱动 `continueStep` 完成分支（answer='done' 收尾 execute 末步），断言 `getMeta` 调用 ≤1 次（旧代码 864-892 内联 + 共享函数内 handleExecuteWorktreeCleanup = 2 次，修复后 =1 次）+ `runCapturing` 捕获的 stdout 不含第二处 `Worktree: n/a`。
- **noAI 路径 skip（T8）**：若直接驱动 runStage noAI 末步在测试内代价高，可降级为对 `completeStageGates` 的直注入参（steps 含 skipped + completed，currentIdx=末步）+ spy `validateFileLocations` 被调，等价覆盖 S3 守卫在 noAI 路径的生效（注明覆盖层级）。

## TDD
本 task 本身即测试（design §11 红→绿 Wave 3）。T5-T8 在 task-01~04 落地前应失败（红：S3 validator 被跳过 / auxiliary 未重置或 manifest 不落盘 / 双清理 stdout 含 Worktree: n/a），接入 completeStageGates + 删 continueStep 内联 cleanup 后转通过（绿）。验收以 `npm test` 全绿 + `npm run lint` 通过为准；不得为通过改 production 逻辑外的东西（修逻辑不修测试）。
