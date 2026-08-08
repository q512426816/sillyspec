---
id: task-03
title: continueStep wire completeStageGates + drop inline worktree cleanup
title_zh: continueStep 接入 completeStageGates + 删内联 cleanup
author: qinyi
created_at: 2026-08-08 08:41:43
depends_on: [task-01]
allowed_paths:
  - src/run/complete.js
---

# task-03: continueStep 完成分支接入 completeStageGates + 删内联 cleanup

## 目标
修 S2（design §1 / §5.2.3）：`continueStep` 完成分支（`complete.js:859-919`）只标 stage completed + 落盘，绕过全部阶段完成 gate/handler/校验。接入 task-01 的 `completeStageGates`，使其与 completeStep / noAI 末步走同一套收尾管线；同时删除 864-892 的内联 execute worktree cleanup（B1 / D-004@v1）。

## allowed_paths
- `src/run/complete.js`（仅 continueStep 完成分支 859-919；不动 completeStep / skipStep / waitStep）

## 依赖
expects_from task-01：`completeStageGates({stageName,cwd,changeName,platformOpts,specBase,progress,pm,stageData,steps,currentIdx,outputText})` 已在 gates.js export（契约 design §7：null=通过，非 null=gate 失败已回滚，调用方 return）。

## 实现要点
1. 行 860-862 标 `stageData.status='completed'` + `completedAt` + `await pm._write(...)` 落盘**之后**插入：
   `const _r = await completeStageGates({stageName,cwd,changeName,platformOpts,specBase,progress,pm,stageData,steps:stageData.steps,currentIdx,outputText:null});`
   `if (_r) return _r`（continueStep 无 outputText 入参，scan manifest 路径传 null）。
2. **删除 864-892 整个内联 execute worktree cleanup 块**（`if (stageName==='execute' && changeName){...}`）——与 `handleExecuteWorktreeCleanup`（complete-handlers.js:721+）逐行等价，completeStageGates 内部已调；保留会双重清理：第二次 `wm.getMeta` 返回 null → 打印误导性 `Worktree: n/a (no meta)`。
3. 下一步提示段（893-918：nextStageHint / brainstorm scale 分叉 / execute autoCheckPlanFromReviews）**原样保留**——completeStageGates 不含提示逻辑，由 continueStep 自管。

## 验收标准
- [ ] 标 completed + 落盘后调 completeStageGates；gate 非 null 时 return（阻断 + rollback 已在内）
- [ ] 删除 864-892 内联 cleanup；execute 收尾无双清理
- [ ] 893-918 提示段保留
- [ ] gate 通过时仍 `return {stageCompleted:true,currentIdx,nextPendingIdx:-1}`（919 不变）

## TDD
- task-05 / T4：continueStep 完成分支 runValidators gate 失败 → 阻断 + rollback（S2 红转绿）
- task-06 / T7：execute 经 continueStep 收尾 → worktree cleanup 只跑一次，无 "Worktree: n/a" 误导（B1 回归）
