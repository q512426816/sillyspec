---
author: qinyi
created_at: 2026-08-19T11:31:20+08:00
plan_level: full
---

# 实现计划（Plan）— reopen-and-execute-batch-guard

## 复杂度分类

```
plan_level: full
reason: 10 task 跨 runtime/progress/worktree/cli-entry 4 模块，含状态机语义变更与 worktree apply 基础设施
estimated_files: 10
cross_module: true
has_schema_change: false
has_state_machine_change: true
needs_parallel_execution: false
needs_human_review: false
```

## Spike 前置验证

无 Spike：三处改动均为既有代码路径上的确定性收口（无新技术栈、无未验证集成），git merge-base/--3way 行为已有 debt 文档实测佐证。

## Wave 1（W1：reopen 门控两源码，文件不相交可并行）

- [x] task-01: W1 reopen stale 回填 --confirm 门控（complete.js 改动点 1 + audit log）（覆盖：FR-01, D-001@v1, D-005@v1）
- [x] task-02: W1 progress complete-stage stale 拒绝（stage-machine.js 改动点 2）（覆盖：FR-02, D-001@v1）

## Wave 2（W1 测试 + W2 勾选层，文件不相交）

- [x] task-03: W1 回归测试 test/reopen-stale-confirm.test.mjs（覆盖：FR-07）
- [x] task-04: W2 勾选层零 diff 守卫（shouldAutoCheckTask ctx + autoCheckPlanFromReviews 构造，改动点 3）（覆盖：FR-03, D-002@v1）

## Wave 3（W2 批量层，独占 complete.js）

- [x] task-05: W2 批量层逐 task 复核 + blockedTasks（detectExecuteBatchFinish，改动点 4）（覆盖：FR-04, D-002@v1）

## Wave 4（W2 测试 + W3 锚点，文件不相交）

- [x] task-06: W2 回归测试 test/execute-batch-zero-diff.test.mjs（含生成层锁定）（覆盖：FR-07）
- [x] task-07: W3 apply merge-base 锚点 + --base flag（worktree-apply.js 改动点 5/6/7 + index.js 解析）（覆盖：FR-05, D-003@v1）

## Wave 5（W3 冲突列表，独占 worktree-apply.js）

- [x] task-08: W3 冲突列表 stderr 解析不静默（改动点 8）（覆盖：FR-06）

## Wave 6（W3 测试 + 文档收尾，文件不相交）

- [x] task-09: W3 回归测试 test/worktree-apply-merge-base.test.mjs（覆盖：FR-07）
- [x] task-10: 文档同步（file-lifecycle.md + modules/progress.md + modules/worktree.md）（覆盖：FR-07）

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | reopen stale 回填 confirm 门控 | W1 | P0 | — | FR-01, D-001@v1 | complete.js:288-297 拦截 + 审计 |
| task-02 | complete-stage stale 拒绝 | W1 | P0 | — | FR-02 | stage-machine.js completeStage 前置检查 |
| task-03 | W1 回归测试 | W2 | P0 | task-01,02 | FR-07 | 三场景：拦截/confirm 回填/常规零介入 |
| task-04 | 勾选层零 diff 守卫 | W2 | P0 | — | FR-03, D-002@v1 | shouldAutoCheckTask ctx 可选参数 |
| task-05 | 批量层逐 task 复核 | W3 | P0 | — | FR-04, D-002@v1 | detectExecuteBatchFinish + blockedTasks |
| task-06 | W2 回归测试 | W4 | P0 | task-04,05 | FR-07 | 草稿/真实 review/ctx 缺省三分支 |
| task-07 | apply merge-base 锚点 + flag | W4 | P0 | — | FR-05, D-003@v1 | 双层锚点 + --base 解析 |
| task-08 | 冲突列表 stderr 解析 | W5 | P0 | — | FR-06 | rollbackApply 调用点错误信息 |
| task-09 | W3 回归测试 | W6 | P0 | task-07,08 | FR-07 | 占位场景干净落盘/回退 flag/冲突报错 |
| task-10 | 文档同步 | W6 | P1 | task-01..09 | FR-07 | file-lifecycle + 两模块文档 |

## 关键路径

task-01 → task-03（W2）→ task-06（W4 测试依赖 task-04/05 改动）→ task-09（W6 测试依赖 task-07/08）→ task-10。同文件 task（01/04/05 共 complete.js、07/08 共 worktree-apply.js）拆不同 Wave 串行，Wave 内仅放文件不相交的 task。

## 全局验收标准

- [ ] `npm test` 全绿（含三个新测试文件），既有测试零回归
- [ ] `npm run lint` 通过
- [ ] reopen 后无 --confirm 的 --done 不回填 stale（FR-01 实测）
- [ ] 草稿零 diff task 不自动勾选、不参与批量放行，blockedTasks 列出 task id（FR-03/04 实测）
- [ ] merge-base 锚点下占位文件场景 apply 干净落盘；--base baseline 恢复旧行为（FR-05 实测）
- [ ] apply 冲突错误信息含文件列表或原始 stderr 尾部（FR-06 实测）
- [ ] brownfield 兼容：ctx 缺省/base 缺省/无 stale 场景行为与现状一致

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01~task-06 | FR-01/02/03/04 场景测试 + 全局验收第 3/4 条 |
| D-002@v1 | task-04, task-05, task-06 | reviewerNotes 前缀识别（无 schema 字段新增，schema 不变即证） |
| D-003@v1 | task-07, task-09 | 交付集合锚不变的断言 + merge-base patch 断言 |
| D-004@v1 | —（非目标） | reopenStage/waitAnswers 既有行为不在任何 task allowed_paths |
| D-005@v1 | task-01/04/07 | 改动点 file:line 锚点与 tasks/task-NN.md 一致 |
