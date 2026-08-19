---
author: qinyi
created_at: 2026-08-19T11:07:44+08:00
---

# 需求规格（Requirements）

## 角色

| 角色 | 说明 |
|---|---|
| Agent（主代理） | 通过 CLI 驱动流程的操作者：reopen / --done / --confirm / worktree apply 的调用方 |
| CLI 状态机 | SillySpec 本体：completeStep / completeStage / autoCheck / detectBatchFinish / applyWorktree |
| 独立审查子代理 | execute 期间产出真实 task review.json 的评审方（豁免守卫） |
| 用户 | 关键决策点介入（--confirm 的最终人类意图来源） |

## 功能需求

### FR-01: reopen stale 回填 confirm 门控
覆盖决策：D-001@v1, D-005@v1
Given `--reopen --from-step N` 后步骤 N+1..end 为 stale，当前步骤（≤N）已完成产物
When `--done`（不带 `--confirm`）
Then 阶段不完成，stale 保持 stale，输出指引（stale 数量 + `sillyspec run <stage>` 逐个执行或 `--done --confirm` 回填两条出路），返回含 `staleBlocked: true`

Given 同上场景
When `--done --confirm`
Then stale 步骤全部回填 completed，`pm._appendAuditLog` 落一条 `reopen-stale-backfill`（含 change/stage/步骤名列表/时间），阶段正常走完成分支

Given 无 stale 步骤的常规 `--done`
When 完成最后一步
Then 行为与现状完全一致（门控零介入）

### FR-02: progress complete-stage stale 拒绝
覆盖决策：D-001@v1
Given 某阶段 steps 存在 stale 状态
When `sillyspec progress complete-stage <stage>`
When 不带 `--force`
Then 拒绝执行并报错列出 stale 步骤；带 `--force` 时按现行 --force 路径执行（审计日志既有）

### FR-03: 草稿勾选层零 diff 守卫
覆盖决策：D-001@v1, D-002@v1
Given task review.json 为自动草稿（reviewerNotes 含 `auto-generated draft`）且 ctx（gitDir/base/head）可用
When `autoCheckPlanFromReviews` 评估该 task checkbox
And review.changedFiles 为空，或 `git diff --name-only base..head -- <changedFiles>` 实测为空
Then 不自动勾选该 checkbox（plan 未全勾 → 批量条件不满足）

Given review 为真实子代理/手写 review（无草稿标记）
When 同上评估
Then 维持现行 `shouldAutoCheckTask` 判定（endToEnd 双 pass / 普通非 fail），行为不变

Given ctx 缺省（既有调用点未传）
When 同上评估
Then 保持现行判定（向后兼容，守卫不激活）

### FR-04: 批量完成逐 task 复核
覆盖决策：D-001@v1
Given plan.md checkbox 全勾 + 整变更代码核验非零
When `detectExecuteBatchFinish` 逐 task 复核
And 任一 task review.json 缺失，或为自动草稿且有效 diff 为空
Then 不批量完成，返回 `blockedTasks: string[]`（task id 列表）与引用该列表的 reason，仍按单步推进

Given 全部 task 复核通过（真实 pass 或草稿 + 非零有效 diff）
Then 批量完成照常（剩余 pending/in-progress step 一次性 completed）

### FR-05: apply patch 锚点 merge-base
覆盖决策：D-003@v1
Given worktree 分支存在且 `git merge-base <baseBranch> <branchTip>` 可计算
When `worktree apply`（默认 `--base merge-base`）
Then 交付文件集合仍按 `diff baselineCommit..tip` 判定（不变），patch 生成锚 merge-base——baseline checkpoint 内 0 字节占位文件（main 从未有）在 patch 中呈"新建真实内容"，apply 到 main 无 add/delete 假冲突

Given 分支已删 / merge-base 计算失败
When 同上
Then warn + 回退现行 `baselineCommit || baseHash` 锚点（fail-open，不阻断）

Given 用户显式 `--base baseline`
When 同上
Then 完整恢复旧锚点行为（逃生门）

### FR-06: apply 冲突列表不静默
Given `git apply --3way` 冲突退出（exit 1）
When CLI 构造错误信息
Then 冲突文件列表 = stderr 解析（`error: patch failed:` / `does not exist in index` / `CONFLICT` 行）∪ status 探测；双源皆空时附原始 stderr 尾部（截 800 字符），不再只报"(未能获取冲突文件列表)"

### FR-07: 回归测试锁定
Given 三处修复落盘
When `npm test`
Then 新增 test/reopen-stale-confirm.test.mjs（FR-01/02 三场景）、test/execute-batch-zero-diff.test.mjs（FR-03/04 全 Given 分支 + 生成层空 diff 跳过锁定）、test/worktree-apply-merge-base.test.mjs（FR-05/06）全绿，且既有测试零回归

## 非功能需求

- 兼容性：`shouldAutoCheckTask` ctx 可选（旧调用点零变化）；`applyWorktree` base 缺省 merge-base 且计算失败回退旧行为；`detectExecuteBatchFinish` 返回值只增字段；无 DB schema 变更。
- 可回退：W3 有 `--base baseline` 显式逃生门；W1 阻断态 `--done --confirm` 一键恢复旧行为。
- 可测试：三文件全部走 CLI 级测试（seed fixture + 断言 DB/文件副作用），Windows 本机跑。
- Windows/Linux/macOS：git 数组参数调用 + 路径 `/` 归一化沿用 `git-helper.js` 约定。

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01~FR-07 | 方案 B 总纲：门控与守卫，不删机制 |
| D-002@v1 | FR-03 | 草稿识别用 reviewerNotes 前缀，不加 schema 字段 |
| D-003@v1 | FR-05 | 双层锚点：集合锚 baselineCommit / patch 锚 merge-base |
| D-004@v1 | —（非目标） | 两条不修子项的核证记录 |
| D-005@v1 | FR-01~FR-06 | Grill 文档清晰度裁决：现状→改动点结构为唯一改动语义源 |
