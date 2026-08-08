---
author: qinyi
created_at: 2026-08-08 08:32:57
---

# 提案书（Proposal）

## 动机
多代理审查（`docs/sillyspec/multi-agent-review-2026-08-08.md` §2.1）发现 SillySpec 的"阶段完成收尾"逻辑分散在 completeStep / runStage-noAI / continueStep 三处，只有 completeStep 真正跑 gate。这使 noAI 步骤作为阶段末步时（plan postcheck、平台 scan postcheck）直接标阶段 completed，绕过 Stage Review Gate 与一系列 handler，独立审查门控与平台 manifest 落盘形同虚设。

## 关键问题（现有方案为何不够）
1. **S1**：`stage.js:352-354` noAI 末步直接标 stage completed 不调 `runStageCompletionGates` → plan 的 independent-tier Stage Review Gate fail verdict 不阻断、Plan→Execute Contract 不校验；平台 quick scan 的 manifest.json/SCAN_COMPLETED 不落盘。
2. **S2**：`complete.js:859-919` continueStep 完成分支同样绕过 gate/handler（窗口窄但确实存在）。
3. **S3**：`complete.js:389/463` 守卫 `actualCompleted===actualTotal` 使 skip 任一 optional 步骤 → validator 整体跳过，run 路径与 `machine-interface gate` 路径结论分裂。

## 变更范围
在 `gates.js` 抽 `completeStageGates` 共享收尾管线（handleScanStageCompleted + validateMetadata + validateFileLocations[计数修 S3] + auxiliary 重置 + runStageCompletionGates + handleExecuteWorktreeCleanup），三处"标 completed+落盘"后统一调用，消除不对称。

## 不在范围内（Non-Goals）
- 不改 executePlanPostcheck（与 validatePlanForExecute 目的不同）
- 不修 ARCHITECTURE.md（W6 前 run.js 描述）/ _module-map.yaml schema 旧
- 不修 S4+（plan.md/tasks.md 共享写竞态、requiresWait 硬门等需独立 design 项）
- 不改 completeStep 的"标 completed+落盘+triggerSync+user-inputs+下一步提示+handleQuickStageCompletion+reopen 回填"周边逻辑

## 成功标准（可验证）
- plan postcheck 完成后 independent-tier review verdict=fail → 阻断 plan completed（T1）
- plan postcheck 后 Plan→Execute Contract 失败 → 阻断（T2）
- 平台 quick scan step3 完成后 manifest.json/SCAN_COMPLETED 落盘（T3）
- continueStep 完成分支 gate 失败 → 阻断（T4）
- scan skip 任一 optional 步骤 → validateScanOutputs 仍跑（T5）
- completeStep 现有测试不回归（npm test 全绿）
