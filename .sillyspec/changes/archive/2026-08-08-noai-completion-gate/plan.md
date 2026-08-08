---
plan_level: light
author: qinyi
created_at: 2026-08-08 08:36:57
---

# 轻量计划（Light Plan）：noAI 步骤收尾补全阶段完成 gate（completeStageGates 收敛）

## 来源
brainstorm change `2026-08-08-noai-completion-gate`（design.md §5 总体方案 + 决策记录 D-001~D-004@v1）。修复多代理审查报告 `docs/sillyspec/multi-agent-review-2026-08-08.md` §2.1 的 S1/S2/S3 三处"阶段完成收尾"不对称——只有 completeStep 真正跑 gate，noAI 末步与 continueStep 完成分支绕过。

## 范围
- `src/run/gates.js`：新增 `completeStageGates` + 迁移 validateMetadata/validateFileLocations + import handleScanStageCompleted/handleExecuteWorktreeCleanup/stageRegistry
- `src/run/complete.js`：completeStep 接入（替换校验/gate/handler 段）+ continueStep 接入（删 864-892 内联 cleanup）
- `src/run/stage.js`：noAI 末步接入
- `test/noai-completion-gate.test.mjs`：T1-T8 复现测试
- `docs/sillyspec/file-lifecycle.md` + `docs/prompt/` 镜像（重跑 `_extract.mjs`）+ `.claude/skills/`

## Tasks

### Wave 1：共享函数定义（阻塞下游）

- [x] task-01: gates.js 新增 `export async function completeStageGates({stageName,cwd,changeName,platformOpts,specBase,progress,pm,stageData,steps,currentIdx,outputText})`，内部按序调 handleScanStageCompleted→validateMetadata→validateFileLocations[计数 completed‖skipped]→auxiliary 重置→runStageCompletionGates[守卫用入参 steps]→handleExecuteWorktreeCleanup；迁移 validateMetadata/validateFileLocations 至 gates.js export；import handleScanStageCompleted/handleExecuteWorktreeCleanup（from complete-handlers.js）+ stageRegistry（from stages/index.js）。返回 null（通过）或 early-return（gate 失败回滚）。（覆盖：D-002@v1, D-003@v1, FR-04, FR-05）

### Wave 2：三处接入（依赖 task-01）

- [x] task-02: complete.js completeStep 阶段完成分支（333-475）——把 handleScanStageCompleted+validateMetadata+validateFileLocations+auxiliary 重置+runStageCompletionGates+handleExecuteWorktreeCleanup 段替换为单个 `completeStageGates(...)` 调用；移除 389/463 的 `actualCompleted===actualTotal` 守卫 + 466-469 warning 分支（移入共享函数，计数改 completed‖skipped）；validateMetadata/FileLocations 改 from gates.js import。completeStep 仍自管 handleQuickStageCompletion/reopen 回填/标 completed/triggerSync/user-inputs/下一步提示。（覆盖：FR-03, FR-05）
- [x] task-03: complete.js continueStep 完成分支（859-919）——标 completed+落盘后插入 `completeStageGates(...)`；**删除 864-892 内联 execute worktree cleanup**（B1，由共享函数内 handleExecuteWorktreeCleanup 统一，避免双重清理）；下一步提示段（893-918）保留。（覆盖：FR-02, D-004@v1）
- [x] task-04: stage.js noAI 末步分支——标 stage completed(352-354)+落盘后、return(357) 前插入 `const _r = await completeStageGates(...); if (_r) return _r`；import completeStageGates from gates.js。（覆盖：FR-01, D-001@v1）

### Wave 3：复现测试（依赖 Wave 2，红→绿）

- [x] task-05: test/noai-completion-gate.test.mjs 写 T1-T4：T1 plan postcheck（noAI 末步）independent-tier review verdict=fail 阻断 plan completed；T2 plan postcheck 后 validatePlanForExecute 失败阻断；T3 平台 quick scan step3（noAI scanPostcheck）manifest.json/SCAN_COMPLETED 落盘；T4 continueStep 完成分支 gate（runValidators）失败阻断+rollback。（覆盖：FR-01, FR-02）
- [x] task-06: test 补 T5-T8：T5 scan skip 任一 optional 步骤后 validateScanOutputs 仍跑；T6 scan（auxiliary）noAI 末步完成后 auxiliary 重置生效（stageData 回 pending）+ manifest 落盘；T7 execute 经 continueStep 收尾 worktree cleanup 只跑一次（无 "Worktree: n/a" 误导）；T8 noAI 末步路径 skip optional validateFileLocations 仍跑。（覆盖：FR-03, D-004@v1）

### Wave 4：文档同步

- [x] task-07: 同步 docs/sillyspec/file-lifecycle.md（noAI 末步现在走 completeStageGates 不再直接标阶段完成）；重跑 `node docs/prompt/_extract.mjs` 同步镜像（若 prompt 文案提及 noAI 末步收尾行为）；检查 .claude/skills/ 是否需同步。

## 覆盖矩阵（decisions 在 design.md 决策记录章节）

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01~task-04 | 三处接入 + 共享函数 |
| D-002@v1 | task-01 | completeStageGates gate 管线粒度 |
| D-003@v1 | task-01 | 符号迁移至 gates.js |
| D-004@v1 | task-03 | 删除 continueStep 内联 cleanup |

## 验收
- `npm test` 全绿（含 T1-T8 复现 S1/S2/S3）+ `npm run lint` 通过
- completeStep 路径无回归（现有测试不破）
- 关键场景：plan postcheck independent review fail 阻断 / 平台 scan manifest 落盘 / continueStep gate fail 阻断 / scan skip optional validator 仍跑 / continueStep 无双清理误导
