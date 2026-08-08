---
author: qinyi
created_at: 2026-08-08 08:32:57
---

# 任务清单（Tasks）

> 初步任务清单，plan 阶段按依赖细拆 Wave + 排序。task-id 为占位，plan 阶段定稿。

## 实现任务
- [ ] task-01: gates.js 新增 `completeStageGates` + 迁移 validateMetadata/validateFileLocations（export）+ import handleScanStageCompleted/handleExecuteWorktreeCleanup/stageRegistry（B2）
- [ ] task-02: complete.js completeStep 阶段完成分支接入 completeStageGates（替换 handleScanStageCompleted+validateMetadata+validateFileLocations+auxiliary重置+runStageCompletionGates+handleExecuteWorktreeCleanup 段；移除 389/463 守卫 + 466-469 warning 分支入共享函数；validateMetadata/FileLocations 改 from gates.js import）
- [ ] task-03: complete.js continueStep 完成分支接入 completeStageGates + 删除 864-892 内联 worktree cleanup（B1）
- [ ] task-04: stage.js noAI 末步接入 completeStageGates（标 stage completed 352-354 落盘后、return 357 前；import completeStageGates）

## 测试任务（红→绿，先写失败再实现）
- [ ] task-05: T1 — plan postcheck（noAI 末步）完成后 independent-tier review verdict=fail 阻断 plan completed
- [ ] task-06: T2 — plan postcheck 后 validatePlanForExecute（Plan→Execute Contract）失败阻断
- [ ] task-07: T3 — 平台 quick scan step3（noAI scanPostcheck）完成后 manifest.json/SCAN_COMPLETED 落盘
- [ ] task-08: T4 — continueStep 完成分支 gate（runValidators）失败阻断 + rollback
- [ ] task-09: T5 — scan skip 任一 optional 步骤后 validateScanOutputs 仍跑
- [ ] task-10: T6 — scan（auxiliary）noAI 末步完成后 auxiliary 重置生效（stageData 回 pending）+ manifest 落盘
- [ ] task-11: T7 — execute 经 continueStep 收尾 worktree cleanup 只跑一次（无 "Worktree: n/a" 误导输出）
- [ ] task-12: T8 — noAI 末步路径上 skip optional 步骤 validateFileLocations 仍跑

## 文档同步任务
- [ ] task-13: 同步 docs/sillyspec/file-lifecycle.md（noAI 末步现在走 completeStageGates）+ 重跑 node docs/prompt/_extract.mjs 同步镜像 + .claude/skills/（若 SKILL 描述 noAI 末步收尾）

## 依赖关系
- task-01（completeStageGates 定义）阻塞 task-02/03/04（接入）
- task-02/03/04 阻塞 task-05~task-12（测试依赖接入后的行为）
- task-13 可与实现并行，最后核对
