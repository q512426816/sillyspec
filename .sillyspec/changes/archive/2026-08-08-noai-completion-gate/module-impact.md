---
author: qinyi
created_at: 2026-08-08 11:50:00
---

# 模块影响 — noAI 步骤收尾补全阶段完成 gate（completeStageGates 收敛）

## 受影响模块

### src/run/gates.js（阶段完成校验叶子模块）
- **新增** `completeStageGates`（共享收尾管线，S1/S2/S3 修复核心）：handleScanStageCompleted → validateMetadata → validateFileLocations[completed‖skipped 守卫] → auxiliary 重置 → runStageCompletionGates → handleExecuteWorktreeCleanup，全程用入参 steps 规避 §5.4 陷阱
- **迁入** `validateMetadata` / `validateFileLocations` / `readDesignScale`（export，从 complete.js 移入，供 completeStageGates + completeStep brainstorm 提示消费）

### src/run/complete.js（step 完成处理核心）
- completeStep(:285) 阶段完成分支 + continueStep(:732) 完成分支 两处接入 `completeStageGates`
- import 清理：gates.js 删 runStageCompletionGates/validateMetadata/validateFileLocations 加 completeStageGates；complete-handlers.js 删 handleScanStageCompleted/handleExecuteWorktreeCleanup；删 stageRegistry import；删 unused readdirSync/statSync
- continueStep 删内联 execute worktree cleanup（D-004@v1，避免双清理）

### src/run/stage.js（run <stage> 执行主干）
- noAI 末步 else 分支(:357) 接入 `completeStageGates`（S1 核心受害者修复：plan postcheck independent review / 平台 scan manifest 此前被绕过）

## 不受影响
- src/run/complete-handlers.js（8 handler 不变，仅被 gates.js 静态 import，无循环依赖）
- src/run/prompt.js / shared.js / command.js（不变）
- src/stages/*.js（prompt 文案零变更，docs/prompt/ 镜像不动）

## 测试
- **新增** test/noai-completion-gate.test.mjs（4 case 24 assertions，直接驱动 completeStageGates）
- 现有 run-complete-step-* characterization 测试（9 个 completeStep + continueStep + noAI 末步）零回归

## 文档
- docs/sillyspec/file-lifecycle.md：line 214「validator 失败回滚」段补 completeStageGates 三处接入 + S3 计数；updated_at 2026-08-08
