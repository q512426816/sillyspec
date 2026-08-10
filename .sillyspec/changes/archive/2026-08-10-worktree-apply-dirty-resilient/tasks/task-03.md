---
id: task-03
title: step4.5/5a interception + assess integrate rescue (unified dirtyFiles)
title_zh: step4.5/5a 拦截分支加 assess 集成 rescue 指令
author: qinyi
created_at: 2026-08-10 11:50:00
priority: P0
depends_on: [task-01, task-02]
blocks: [task-04]
requirement_ids: [FR-01, FR-04]
decision_ids: [D-002@v1, D-004@v1]
allowed_paths:
  - src/worktree-apply.js
expects_from:
  - task-01:
      contract: generateRescueCommands
      needs: [commands, warnings, cpFileCount, excludedCount]
  - task-02:
      contract: step3.5-precompute
      needs: [hashMismatchFiles, deletedFiles]
provides:
  - contract: rescueCommandsField
    fields: [commands, warnings, cpFileCount, excludedCount]
goal: 把 task-01 的 generateRescueCommands 接入 step4.5/5a dirty 拦截分支加 assessApplyRisk，拦截时按统一口径算 dirtyFiles 加调 helper（传 task-02 前移的 hashMismatchFiles 加 deletedFiles）加写 result.rescueCommands 加拼 result.errors，fail-loud 拦截决策零改动（rescueCommands 只是附加信息）
implementation: |
  - result 初始化（:151-159）加 rescueCommands: null
  - 抽 computeRescueDirtyFiles(projectRoot) 统一口径——展开 git diff name-only HEAD 加 git ls-files others exclude-standard，过滤非 .sillyspec/ 前缀加非 meta.json（对齐 filterDeliverableFiles 排除范围——排除 changes/.runtime/quicklog 加 meta.json，保留 .sillyspec/docs/ 闭合 Grill 残留 gap）
  - step4.5 拦截分支（:260-272 hasUncommittedDirty）调 computeRescueDirtyFiles 加调 generateRescueCommands（传 changedFiles 加 dirtyFiles 加 hashMismatchFiles 等于 result.hashMismatchFiles 加 deletedFiles 加 worktreePath 加 projectRoot）赋 result.rescueCommands 加把 rescue commands 与 warnings 拼进拦截 error message（旁路 git apply 提示加 cp 后需手动 cleanup）
  - step5a 拦截分支（:282-287 dirty 与 changedFiles 交集）同上（dirtyFiles 已含交集，rescue 自动 EXCLUDE-DIRTY 这些文件）
  - assessApplyRisk 透出（:553-672）applyWorktree checkOnly 返回后把 checkResult.rescueCommands 并入 assessment 返回值（assessment.rescueCommands 等于 checkResult.rescueCommands 或 null）
  - checkOnly 模式 step4.5/5a 不短路（现有行为），rescueCommands 在 assess 路径也被填充
  - 拦截决策不变——step4.5/5a 仍 if 非 checkOnly 则 return result（ok 等于 false）
acceptance:
  - step4.5 拦截时 result.rescueCommands 非空（含 commands/warnings/cpFileCount/excludedCount）加 error message 含 cp 块
  - step5a 拦截时同 step4.5
  - dirtyFiles 统一口径含 untracked（覆盖 cp 新建撞他人 untracked）加保留 .sillyspec/docs/（覆盖模块文档 dirty，Grill gap 闭环）
  - EXCLUDE-MISMATCH 生效——rescue 排除 task-02 前移算出的 hashMismatchFiles（AC-1 时序回归）
  - assess（checkOnly）透出 rescueCommands
  - 未触发拦截时 result.rescueCommands 严格等于 null（零回归）
  - 拦截决策加 ok 等于 false 加 return 时机零改动
verify:
  - task-05 断言 step4.5/5a 拦截时 rescueCommands 非空加 assess 透出加未拦截 null
  - 现有 worktree-apply-baseline-clean.test.mjs（step4.5 clean 放行）零回归
constraints:
  - 不改拦截决策——step4.5/5a 仍 if 非 checkOnly 则 return result，rescueCommands 只是 ok 等于 false 时的附加信息
  - dirtyFiles 统一口径等于 main 工作区 tracked-modified 并 untracked，排除范围对齐 filterDeliverableFiles（保留 .sillyspec/docs/），不混用 step4.5 触发判定口径（:252-255 排 .claude/docs/CLAUDE.md 是触发用不是 rescue 用）
  - rescue 拼进 error message 用纯文本（多行缩进），不破坏 index.js 现有 for err of result.errors console.error 打印
  - rescueCommands 字段 additive，现有消费方不读即不受影响
related_tests:
  - test/worktree-apply-baseline-clean.test.mjs
---

# task-03：step4.5/5a 拦截加 assess 集成 rescue

## 背景
rescue 接入点。fail-loud 拦截触发时调纯函数算安全 cp 子集，写 result.rescueCommands 加拼 errors（人类可见主通道）。拦截决策零改动。

## 改动点
1. result 初始化加 rescueCommands 字段
2. 抽 computeRescueDirtyFiles 统一口径（含 untracked 加保留 docs）
3. step4.5/5a 拦截分支调 helper 写字段拼 errors
4. assessApplyRisk 透出 checkResult.rescueCommands
