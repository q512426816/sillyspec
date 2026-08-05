---
author: qinyi
created_at: 2026-08-05T22:01:04
---

# 任务（Tasks）— 工具驾驭反馈修复

> 详细 Wave 排序、依赖、allowed_paths、acceptance 留给 plan 阶段细化。本表为 brainstorm 阶段的任务粗览。

## Phase 1 — 共享 helper 抽取（先行，后续修复依赖）

- [ ] 1.1 `src/worktree-deps.js` 新增 `checkDepsFreshness(meta, wtPath, mainCwd)`（H1）+ 单测
- [ ] 1.2 新建 `src/stages/cmd-existence.js` `validateScriptCommands(text, {projectRoot, modules})`（H2）+ 单测

## Phase 2 — 5 问题修复（+ 问题 6 软缓解）

- [ ] 2.1 问题 1：`worktree.js` doctor 改调 H1 + 新增 `deps-main-drift`；`worktree-deps.js` `provisionDeps` 加 `force`；`_doctorReprovision` 先解 junction 再 force 重供；`index.js` 解析 `--change`；放宽 in-place 守卫
- [ ] 2.2 问题 1 续：`run/stage.js` `ensureDepsFreshness` 改调 H1；`run/gates.js` 提示文案对齐
- [ ] 2.3 问题 2：`run/command.js` worktree 副本漂移自动锁定主仓 spec + warn
- [ ] 2.4 问题 3：`stages/plan-postcheck.js` 新增 `validateTaskCommands`（调 H2 硬阻断）；`scan-postcheck.js` 改调 H2
- [ ] 2.5 问题 4：`stages/plan.js` `stepReviewPlan` 审查清单加 acceptance/schema 核验条；`plan-postcheck.js` `validatePlanFeasibility` 加 best-effort 字段 grep
- [ ] 2.6 问题 5：`run/complete.js` `outputStep` 后加底部 `🚀 advanced to step` 行
- [ ] 2.7 问题 6（附）：execute/verify 铁律 prompt 加「长测试前台同步跑」文案

## Phase 3 — 测试 + 文档同步

- [ ] 3.1 `test/cmd-existence.test.mjs`（H2：npm/pnpm/yarn + monorepo 子目录 + local.yaml modules 块）
- [ ] 3.2 `test/worktree-doctor*.test.mjs` 增 `deps-main-drift` + `--change` 过滤 + force 重装断言
- [ ] 3.3 `test/worktree-execute-spec-drift*.test.mjs` 断言由 exit(2) 改为「自动锚定 + 流程继续」
- [ ] 3.4 `test/plan-postcheck*.test.mjs` 增 `validateTaskCommands` 命令存在性硬阻断 + best-effort grep warning
- [ ] 3.5 `test/run-complete*.test.mjs` 增底部 advanced 行断言
- [ ] 3.6 `npm test` + `npm run lint` 全绿
- [ ] 3.7 同步 `docs/sillyspec/file-lifecycle.md`、`docs/prompt/`（重跑 `_extract.mjs`）、`.claude/skills/`、模块文档（worktree/runtime/stages）
