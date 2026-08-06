---
author: qinyi
created_at: 2026-08-06T09:31:50
plan_level: light
---

# 轻量计划（Light Plan）— sillyspec 自工具坑确定性修复

## 来源
- design.md（4 坑确定性修复方案 + D-01~D-06 决策；Grill B-001 index.js:787 / B-002 hint→warning 已修正）
- decisions.md（D-01~D-06：D-01~04 accepted / D-05 deferred 入 ROADMAP / D-06 防复读）
- requirements.md（FR-01~05）
- tasks.md（3 Phase 粗览）

## 范围
修复工具驾驭复盘流程本身暴露的 4 个 SillySpec 确定性缺陷（execute 批量完成 marker 缺失 / detectChangeRisk 误判引导不足 / worktree apply 漏模块文档 / archive git add 漏 archive/），坑5 入 ROADMAP。触及 runtime（gates + complete-handlers）/ stage-contract / worktree-apply / verify-postcheck / cli-entry(index) 5 src + 4 test + 文档。4 坑独立、各 ≤15 行确定性局部修复，顺序 execute 即可，不需并行 sub-agent。

## Tasks

- [x] task-01: 坑1 — `src/run/gates.js:276` 附近 stage review gate，marker 缺失时 `generateStageReviewRunId` + `stageReviewMarkerPath` 写盘 + mkdir（+import from '../stage-review.js'）+ `test/stage-review-marker-auto.test.mjs`（覆盖：FR-01, D-01@v1）
- [x] task-02: 坑2 — `src/stage-contract.js:448` 附近（evidence gate 前）detectChangeRisk 高危 && !explicit 时 `warnings.push` 早期 frontmatter 覆盖指引 + `test/stage-contract.test.mjs` 增断言（覆盖：FR-02, D-02@v1，遵 6417a27，Grill B-002）
- [x] task-03: 坑3 — `src/worktree-apply.js:48-50` `filterDeliverableFiles` 精细化（保留 `.sillyspec/docs/`，排 changes/+.runtime/+quicklog/）+ `src/verify-postcheck.js:798-799` 改 import `filterDeliverableFiles` 去双写 + `src/index.js:787` 注释同步 + `test/worktree-apply-meta-exclude.test.mjs` 改四态断言（覆盖：FR-03, D-03@v1，Grill X-010 无环依赖）
- [x] task-04: 坑4 — `src/run/complete-handlers.js:137` `unregisterChange` 后 CLI 下沉 `safeGit add changes/archive/ + docs/` + `test/archive-cli-git-add.test.mjs`（覆盖：FR-04, D-04@v1）
- [x] task-05: 坑5 — `.sillyspec/ROADMAP.md` 登记多代理中间态 import 链污染（架构级延后，候选解 worktree-per-task / import 沙箱）（覆盖：FR-05, D-05@v1，独立）
- [x] task-06: 文档同步 — `docs/sillyspec/file-lifecycle.md` updated_at + filterDeliverableFiles 行为变更（docs/ 纳入交付物）；`docs/prompt/`（坑2 warning 在 stage-contract.js 校验逻辑非 prompt 源，预计不动，execute 核实）；`.claude/skills/`（若触及 apply/archive/verify skill）；模块文档 runtime/stages/cli-entry/worktree（depends: task-01..04）
- [x] task-07: `npm test` + `npm run lint` 全绿回归（depends: task-01..06）

## 任务总表

| Task | 标题 | 优先级 | 模块 | depends_on | allowed_paths |
|---|---|---|---|---|---|
| task-01 | execute marker 自生 + 测试 | P0 | runtime | — | src/run/gates.js, test/stage-review-marker-auto.test.mjs |
| task-02 | detectChangeRisk 早期 warning + 测试 | P0 | stages | — | src/stage-contract.js, test/stage-contract.test.mjs |
| task-03 | filter 精细化 + 去双写 + 测试 | P0 | worktree, stages | — | src/worktree-apply.js, src/verify-postcheck.js, src/index.js, test/worktree-apply-meta-exclude.test.mjs |
| task-04 | archive CLI git add + 测试 | P0 | runtime | — | src/run/complete-handlers.js, test/archive-cli-git-add.test.mjs |
| task-05 | ROADMAP 坑5 登记 | P2 | docs | — | .sillyspec/ROADMAP.md |
| task-06 | 文档同步 | P1 | docs | task-01..04 | docs/sillyspec/file-lifecycle.md, docs/prompt/, .claude/skills/, .sillyspec/docs/sillyspec/modules/ |
| task-07 | 全量回归 | P0 | — | task-01..06 | — |

## 关键路径

4 坑 task-01~04 互不依赖、可并行/顺序。task-06 文档同步依赖 task-01~04（行为已定）。task-07 回归依赖全部。task-05 ROADMAP 独立。最长链：`task-0X → task-06 → task-07`。

## 全局验收标准

1. execute 批量完成撞 stage review gate 缺 review.json 时，错误路径含 `execute-review-<review-前缀 id>`（非 `execute-null`）；marker 文件落盘且 `review-` 前缀（FR-01）。
2. design.md 含 session/lease/daemon 关键词但无 frontmatter risk_level 时，`validateVerifyResult` warnings 含"可在 design.md frontmatter 加 risk_level...显式覆盖"；加 frontmatter 后（explicit）不发；FAIL 结论也透出（FR-02）。
3. worktree apply 后 `.sillyspec/docs/sillyspec/modules/*.md` 改动 apply 回主仓；`.sillyspec/changes/<wt-change>/`、`.sillyspec/.runtime/`、`.sillyspec/quicklog/` 仍排除（FR-03）。
4. archive 归档后 `git status` 显示 `.sillyspec/changes/archive/<destName>/` + `.sillyspec/docs/` 已暂存（不需手动补 add）；safeGit 失败不阻断归档（FR-04）。
5. `.sillyspec/ROADMAP.md` 含坑5 条目（FR-05）。
6. `npm test` + `npm run lint` 全绿，既有测试无回归（filter 行为变更的 `test/worktree-apply-meta-exclude.test.mjs` 同步更新）。

## 覆盖矩阵（FR × Task × D）

| FR / D | 覆盖 Task |
|---|---|
| FR-01（execute marker 自生） | task-01 |
| FR-02（detectChangeRisk 早期 warning） | task-02 |
| FR-03（worktree apply 精细 filter） | task-03 |
| FR-04（archive CLI 下沉 git add） | task-04 |
| FR-05（坑5 入 ROADMAP） | task-05 |
| D-01@v1（gate marker 自生） | task-01 |
| D-02@v1（早期 warning，遵 6417a27） | task-02 |
| D-03@v1（filter 精细化） | task-03 |
| D-04@v1（CLI 下沉 git add） | task-04 |
| D-05@v1（坑5 入 ROADMAP） | task-05 |
| D-06@v1（遵 6417a27 不做 body 扫描） | task-02 落地 warning 而非扫描（§非目标） |
| 全量绿（回归守护） | task-07（汇总）+ 各 task 配套测试 |

无 P0/P1 unresolved blocker（design §10 R-01~R-06 均有缓解）。
