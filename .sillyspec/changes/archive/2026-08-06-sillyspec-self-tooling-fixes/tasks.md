---
author: qinyi
created_at: 2026-08-06T09:19:19
---

# 任务清单（Tasks）— sillyspec 自工具坑确定性修复

> 详细 Wave 排序、依赖、allowed_paths、acceptance 留给 plan 阶段细化。本表为 brainstorm 阶段任务粗览。

## Phase 1 — 4 坑确定性修复（各独立，可并行）

- [ ] 1.1 坑1：`src/run/gates.js:276` 附近 stage review gate，marker 缺失时 `generateStageReviewRunId` + 写 marker（`stageReviewMarkerPath`）+ mkdir（+import generateStageReviewRunId/stageReviewMarkerPath from '../stage-review.js'）
- [ ] 1.2 坑2：`src/stage-contract.js:448` 附近（evidence gate 前），detectChangeRisk 高危 && !explicit 时 warnings.push 早期 frontmatter 覆盖指引
- [ ] 1.3 坑3：`src/worktree-apply.js:48-50` filterDeliverableFiles 精细化（保留 .sillyspec/docs/，排 changes/+.runtime/+quicklog/）；`src/verify-postcheck.js:798-799` 改 import filterDeliverableFiles 去双写；`src/index.js:787` 注释同步
- [ ] 1.4 坑4：`src/run/complete-handlers.js:137` unregisterChange 后 CLI 下沉 safeGit add changes/archive/ + docs/

## Phase 2 — 测试

- [ ] 2.1 `test/stage-review-marker-auto.test.mjs`（坑1：marker 缺失时 gate 自生 + 写盘 + review- 前缀 + 幂等）
- [ ] 2.2 `test/stage-contract.test.mjs` 增坑2（高危 && !explicit → warning；explicit → 不发；FAIL 也透出）
- [ ] 2.3 `test/worktree-apply-meta-exclude.test.mjs` 改坑3（docs/保留 + changes/+.runtime/+quicklog/排除四态）
- [ ] 2.4 `test/archive-cli-git-add.test.mjs`（坑4：归档后 git index 含 archive/+docs/ + safeGit 失败不阻断）
- [ ] 2.5 `npm test` + `npm run lint` 全绿

## Phase 3 — 文档同步 + ROADMAP

- [ ] 3.1 `docs/sillyspec/file-lifecycle.md` updated_at + filterDeliverableFiles 行为变更说明（.sillyspec/docs/ 纳入交付物）
- [ ] 3.2 `docs/prompt/`（仅当触及 verify prompt 才重跑 _extract.mjs；坑2 warning 在 stage-contract.js 非 prompt，预计不动——execute 阶段核实）
- [ ] 3.3 `.claude/skills/`（若触及 apply/archive/verify skill 行为则同步）
- [ ] 3.4 `.sillyspec/ROADMAP.md` 登记坑5（多代理中间态 import 链污染，架构级延后）
- [ ] 3.5 模块文档（.sillyspec/docs/sillyspec/modules/ 下 runtime/worktree/stages/cli-entry 若触及则同步）
