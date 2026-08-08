---
author: qinyi
created_at: 2026-08-08 08:32:57
---

# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| Agent（CLI 调用方） | 通过 `sillyspec run <stage> --done` 推进阶段 |
| SillySpec 状态机 | 阶段完成收尾时执行 gate + handler + 校验 |
| 独立审查子代理 | 产出 stage review.json（independent-tier 时） |

## 功能需求

### FR-01: noAI 末步收尾走阶段完成 gate（覆盖 S1）
noAI 步骤作为阶段最后一步时，标 stage completed + 落盘后必须调用 `completeStageGates`，执行 handleScanStageCompleted / validateMetadata / validateFileLocations / auxiliary 重置 / runStageCompletionGates / handleExecuteWorktreeCleanup。gate 失败时 rollback 回滚 stage status（completed→in-progress），不保持伪 completed。

### FR-02: continueStep 完成分支走 gate（覆盖 S2）
continueStep 在"无 pending/waiting 步"完成分支，标 completed + 落盘后调用 `completeStageGates`；同时移除 864-892 内联 execute worktree cleanup（由 completeStageGates 内 handleExecuteWorktreeCleanup 覆盖，避免双重清理）。

### FR-03: skip optional 步骤不跳过 validator（覆盖 S3）
阶段完成守卫计数从 `filter(status==='completed').length === total` 改为 `filter(status==='completed' || status==='skipped').length === total`。validateFileLocations 与 runStageCompletionGates 的守卫统一用此计数（且用入参 steps，pre-reset 原数组）。

### FR-04: 符号迁移与零回归（覆盖 B2）
`validateMetadata`/`validateFileLocations`（complete.js 私有）迁移至 gates.js 并 export；complete.js 改 import。completeStep 路径行为基本保持（唯一语义变化是 FR-03 守卫计数），现有测试全绿。

### FR-05: 实现陷阱规避（覆盖 feasibility）
`completeStageGates` 内 auxiliary 重置后 stageData.steps 换成 freshSteps；runStageCompletionGates 守卫与 rollbackStageCompletion 必须用入参 steps（pre-reset 原数组），不得重读 stageData.steps（否则计数恒 0 → gate 永跳过）。

## 验收
npm test 全绿 + npm run lint 通过 + T1-T8 复现测试覆盖 S1/S2/S3 + completeStep 路径无回归。
