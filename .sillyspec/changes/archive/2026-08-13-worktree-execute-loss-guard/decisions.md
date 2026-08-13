---
author: qinyi
created_at: 2026-08-13T14:36:00
---

# 决策台账 — 2026-08-13-worktree-execute-loss-guard

> 本文件记录本次变更的决策台账（有实现/验收影响的决策）。长期术语归档见 `.sillyspec/docs/sillyspec/glossary.md`。

## D-001@v1

- **type**: enforcement（cleanup 保护）
- **status**: accepted
- **source**: multi-agent-platform/docs/sillyspec/worktree-execute-total-loss.md + 用户拍板（AskUserQuestion "cleanup 检测未 commit 交付改动时默认行为" = 拒绝清理 fail-closed）
- **question**: cleanup 检测到 worktree 有未 commit / 未落主仓的交付改动（清理即蒸发）时，默认行为？
- **answer**: fail-closed 拒绝清理。`cleanup()` 在 junction 解链与 `git worktree remove --force` 之前调 `hasUnappliedChanges`，`hasChanges:true` → 返回 `result:'blocked'` + 列文件 + 提示先 apply/commit 或 `--force` 绕过。
- **normalized_requirement**: FR-01（cleanup 检测未落主仓交付变更 fail-closed 拒绝）+ FR-02（--force 显式绕过）+ FR-03（已落主仓变更不误拦）
- **impacts**: `src/worktree.js` `cleanup()` 行为增强；`--force` 语义保留；所有 cleanup 调用点（显式命令 / execute 完成 / archive / apply 后）生效
- **evidence**: 坑1 issue 期望"worktree 清理前校验分支已含工作区全部改动，未 commit 拒绝清理或自动 commit 暂存"；用户选 fail-closed（非自动 commit）；`hasUnappliedChanges` 已有"相对主仓 HEAD byte-identical"判定可复用
- **priority**: P1

## D-002@v1

- **type**: enforcement（阶段级核验，宽松非阻断）
- **status**: accepted
- **source**: 用户拍板（AskUserQuestion "execute 完成时如何核验分支确有实现代码" = 阶段级核验）
- **question**: execute 完成时如何核验「分支确有实现代码」（防空跑谎报 progress 全绿但 git 无代码）？
- **answer**: 阶段级核验。execute 完成路径聚合最新 run 的 `review.changedFiles`，`findMissingDeliverables` 逐个核验存在分支 tree 或 worktree 工作区，两处皆无 → warn + 列文件（宽松非阻断）。不强制 task 级 commit（保留工作区实现→apply 落盘模式）。
- **normalized_requirement**: FR-04（execute 完成聚合 review.changedFiles 核验落盘）+ FR-05（缺失文件 warn 列清单，非阻断）+ FR-06（无法核验时保守提示）
- **impacts**: `src/run/complete-handlers.js` execute 完成路径；新增纯函数 `findMissingDeliverables`（`src/worktree.js` 导出）
- **evidence**: 坑1 issue 期望"execute 每个 task/子代理完成后 CLI 核验分支确有新 commit 且 tree 含目标文件，否则标失败"——用户放宽为阶段级（不强制每 task commit）；Task Review Gate 已有零改动伪造/不相交伪造兜底，本核验补"文件从未落盘"
- **priority**: P1

## D-003@v1

- **type**: scope
- **status**: accepted
- **source**: 用户拍板（AskUserQuestion "本次范围是否包含 progress 摘要绑定 commit sha" = 不含）
- **question**: 本次变更范围是否包含「progress 摘要绑定真实 commit sha + 文件清单」（issue 建议 3，防空跑谎报最后一环）？
- **answer**: 不含。本次只做 cleanup 保护 + 阶段级核验（堵代码蒸发两条路径）。摘要绑定 commit sha 是增强，后续单独排。
- **normalized_requirement**: （无 FR，范围裁剪记录）
- **impacts**: 本次 change 边界；为未来"摘要绑定 commit sha"变更预留方向
- **evidence**: 用户选择"不含，只做防丢失"
- **priority**: P2

## D-004@v1

- **type**: decision（否决 task 级强制 commit）
- **status**: accepted
- **source**: 方案对比（step4 方案 B）
- **question**: 是否采用 task 级强制 commit（每 task review --done 核验分支有新 commit，否则标失败）？
- **answer**: 否决。强制子代理每 task commit 改变 execute 工作流（子代理默认不 commit 的工作区实现→apply 落盘模式被打破）；与 `verifyReviewGitEvidence` 的 working-tree 并入逻辑（允许未 commit 过 review）冲突；工程量大。采用阶段级核验（D-002）替代。
- **normalized_requirement**: （无 FR，否决记录）
- **impacts**: execute 工作流保持不变
- **evidence**: 用户选阶段级核验（方案 A）；Task Review Gate working-tree 并入逻辑（task-review.js:590）
- **priority**: P2

## D-005@v1

- **type**: decision（否决 auto-WIP commit）
- **status**: accepted
- **source**: 方案对比（step4 方案 C）
- **question**: 是否采用 cleanup 前自动把工作区改动 commit 成 WIP 暂存（不拒绝清理）？
- **answer**: 否决。用户明确选 fail-closed（非自动 commit）；WIP commit 污染分支历史、留半成品 commit。
- **normalized_requirement**: （无 FR，否决记录）
- **impacts**: cleanup 采用 fail-closed（D-001），不引入自动 commit
- **evidence**: 用户选"拒绝清理 fail-closed"
- **priority**: P3

## D-006@v1

- **type**: consistency（Grill 修正）
- **status**: accepted
- **source**: design-grill（独立子代理 B-1/B-3 发现）
- **question**: cleanup 保护用 `hasUnappliedChanges`（判定 main HEAD），而 `git apply --3way` 不 commit → apply 后仍判 true，会误阻 apply 后自动 cleanup。如何处理？
- **answer**: apply 后自动 cleanup（worktree-apply.js:417/649/759）与 execute reset 的 cleanup（command.js:960）显式传 `force:true` 绕过保护——apply 已将交付文件复制到主仓工作区（蒸发前提不成立）、reset 语义即显式销毁脏态（用户已确认丢弃），force 语义正当。其余 cleanup 调用点（显式命令 / execute 完成 / archive）保留 fail-closed 保护。
- **normalized_requirement**: FR-03（已落主仓变更不误拦——通过 apply 后 force 而非 hasUnappliesChanges 判 false 实现）
- **impacts**: [worktree-apply.js, command.js, FR-03, task 变更清单]
- **evidence**: worktree.js:1151/1142（_changesAlreadyOnMain HEAD-only）、worktree-apply.js:629（--3way 不 commit）、test/worktree-has-unapplied-changes.test.mjs:332-350（test ⑰ 钉死 HEAD-only 语义）
- **priority**: P1
