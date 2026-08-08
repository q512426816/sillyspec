---
author: qinyi
created_at: 2026-08-08 13:10:07
---

# 任务清单（Tasks）

> 本 tasks.md 为 brainstorm 产物，供 plan 阶段细化为带 allowed_paths / 验收标准的 task 卡（plan.md）。每个 task 已内联 Design Grill 强约束（B-01..B-08，详见 decisions.md）。

- [ ] task-01: 新增 `src/run/concurrent-detect.js`
  - 导出 `detectConcurrentChanges(cwd, { changeName, linkedChanges, ownFiles, specDir })` 与 `formatConcurrentWarning(d)`
  - 单次 `safeGit(['status','--porcelain'], { trim: false })`（**B-04 强制 trim:false**，shared.js:448 坑）
  - 分类口径：rule1 拆 `.sillyspec/changes/<dir>/` → otherActiveChanges（用 task-02 的 extractChangeDir helper，**B-08**）；rule2 isQuickMetadata 跳过；rule3 非 ownFiles → foreignFiles
  - fail-open：git error → hasForeign=false + gitError（FR-04）
  - 验收：FR-01/02/03/04

- [ ] task-02: `src/run/shared.js` 抽 `extractChangeDir(path)` 共享 helper（**B-08**）
  - 抽出 `^\.sillyspec\/changes\/([^/]+)(\/|$)` 解析，isQuickMetadata 与 detectConcurrentChanges 共用，防两处 regex 漂移
  - 不改 isQuickMetadata 返回值（FR-07 回归守护）

- [ ] task-03: quick 钩子接入 `src/run/complete-handlers.js`
  - 在 auditQuickCompletion 调用点（:588 附近，`if(guard)` 块内）加 `detectConcurrentChanges({ changeName, linkedChanges, ownFiles: [...(review?.changedFiles??[]), ...(mergedGuard.baselineFiles??[])] })`（**B-01 并入 baseline**，**B-03 null 兜底**）
  - `if (w) console.warn(w)`，不阻断
  - 验收：FR-05/07

- [ ] task-04: execute 钩子接入 `src/run/gates.js`
  - `completeStageGates` 入口 guard `stageName==='execute'`，ownFiles 源优先级链 worktree applied > plan allowed_paths > design §6 清单 > 空（仅 worktree 允许空）（**B-02**）
  - `if (w) console.warn(w)`，不阻断
  - 验收：FR-06/07

- [ ] task-05: 纯函数测试 `test/concurrent-detect.test.mjs`
  - 造 git fixture：本变更文件 + 他者脏文件 + 他者 change 目录 + metadata + ownFiles 含 baseline
  - 覆盖：foreignFiles 分类 / otherActiveChanges 去重 / ownFiles 排除 baseline（B-01）/ gitError fail-open / trim:false 首行 ?? 文件（B-04）/ formatConcurrentWarning null 边界
  - 验收：FR-01/02/03/04

- [ ] task-06: 集成测试 `test/concurrent-preflight-hooks.test.mjs`
  - quick --done 他者脏文件在场 → console.warn 触发且 audit 不阻断
  - execute --done 他者脏文件在场 → console.warn 触发且 gate 不阻断
  - 干净仓 → 零 warn
  - 验收：FR-05/06/07

- [ ] task-07: 文档同步评估
  - 评估是否触发 file-lifecycle / prompt / SKILL 同步（预期：无新运行时文件类型、无 prompt 改动、无 SKILL 改动 → 无同步；如实记录跳过理由）
  - 更新 design/decisions 若实现中发现新约束
